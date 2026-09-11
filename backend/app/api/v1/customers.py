import random
from collections import Counter, defaultdict
from datetime import timedelta
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select

from app.api.dependencies import DBSession, require_permissions
from app.core.permissions import Permissions
from app.core.security import as_utc, utcnow
from app.models.customers import Customer
from app.models.identity import RoleCode, Store, User
from app.models.inventory import Product
from app.models.sales import SalesLineItem, SalesTransaction, TransactionStatus
from app.schemas.common import MessageResponse
from app.schemas.customers import (
    CustomerCreate,
    CustomerInsightResponse,
    CustomerList,
    CustomerPeriodComparison,
    CustomerPreference,
    CustomerResponse,
    CustomerSummary,
    CustomerUpdate,
    CustomerVisit,
)
from app.services.customers import scoped_customer_query

router = APIRouter(prefix="/customers", tags=["Customers"])

customer_reader = require_permissions(
    Permissions.CUSTOMERS_READ_ALL,
    Permissions.CUSTOMERS_READ_SUMMARY,
    Permissions.CUSTOMERS_READ_ASSIGNED,
    require_all=False,
)


def _customer_for_insights(db: DBSession, user: User, customer_id: UUID) -> Customer | None:
    return db.scalar(
        select(Customer).where(Customer.id == customer_id, Customer.tenant_id == user.tenant_id)
    )


@router.get("/summary", response_model=CustomerSummary)
def customer_summary(
    db: DBSession,
    user: User = Depends(customer_reader),
):
    scoped, scope = scoped_customer_query(select(Customer), user)
    subquery = scoped.subquery()
    count, revenue, orders = db.execute(
        select(
            func.count(subquery.c.id),
            func.coalesce(func.sum(subquery.c.total_revenue), 0),
            func.coalesce(func.sum(subquery.c.order_count), 0),
        )
    ).one()
    revenue = Decimal(revenue or 0)
    return CustomerSummary(
        scope=scope,
        tenant_id=user.tenant_id,
        customer_count=count,
        total_revenue=revenue,
        total_orders=orders,
        average_customer_value=revenue / count if count else Decimal("0"),
    )


@router.get("", response_model=CustomerList)
def list_customers(
    db: DBSession,
    user: User = Depends(customer_reader),
    search: str | None = Query(default=None, max_length=80),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    query, _ = scoped_customer_query(select(Customer), user)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.where(
            (Customer.external_customer_id.ilike(search_pattern))
            | (Customer.company_name.ilike(search_pattern))
            | (Customer.contact_email.ilike(search_pattern))
            | (Customer.contact_phone.ilike(search_pattern))
            | (Customer.gstin.ilike(search_pattern))
            | (Customer.location.ilike(search_pattern))
            | (Customer.territory_route.ilike(search_pattern))
        )
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(
        query.order_by(Customer.total_revenue.desc(), Customer.created_at.desc()).limit(limit).offset(offset)
    ).all()
    return CustomerList(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=CustomerResponse, status_code=201)
def create_customer(
    payload: CustomerCreate,
    db: DBSession,
    user: User = Depends(customer_reader),
):
    if not payload.company_name or not payload.company_name.strip():
        raise HTTPException(status_code=422, detail="Client company / shop name is required")
    if not payload.contact_phone or not payload.contact_phone.strip():
        raise HTTPException(status_code=422, detail="Contact phone number is mandatory to add a client")

    ext_id = f"CUST-{random.randint(1000, 9999)}"
    while db.scalar(
        select(Customer.id).where(
            Customer.tenant_id == user.tenant_id,
            Customer.external_customer_id == ext_id,
        )
    ):
        ext_id = f"CUST-{random.randint(1000, 9999)}"

    seller_id = payload.assigned_seller_id or (
        user.id if user.role.code == RoleCode.SALES_EXECUTIVE else None
    )

    customer = Customer(
        tenant_id=user.tenant_id,
        assigned_seller_id=seller_id,
        source_system="marketmind_b2b",
        external_customer_id=ext_id,
        last_purchase=utcnow(),
        order_count=0,
        item_quantity=0,
        total_revenue=Decimal("0.00"),
        recency_days=0,
        company_name=payload.company_name.strip(),
        gstin=payload.gstin.strip() if payload.gstin else None,
        contact_phone=payload.contact_phone.strip(),
        contact_email=payload.contact_email.strip() if payload.contact_email else None,
        location=payload.location.strip() if payload.location else "Central Commercial Market",
        credit_limit=payload.credit_limit or Decimal("250000.00"),
        outstanding_balance=Decimal("0.00"),
        credit_terms=payload.credit_terms or "Net 30",
        territory_route=payload.territory_route or "Central Commercial Route",
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.patch("/{customer_id}", response_model=CustomerResponse)
@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: UUID,
    payload: CustomerUpdate,
    db: DBSession,
    user: User = Depends(customer_reader),
):
    customer = db.scalar(
        select(Customer).where(Customer.id == customer_id, Customer.tenant_id == user.tenant_id)
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if payload.company_name is not None:
        customer.company_name = payload.company_name.strip()
    if payload.gstin is not None:
        customer.gstin = payload.gstin.strip() or None
    if payload.contact_phone is not None:
        customer.contact_phone = payload.contact_phone.strip() or None
    if payload.contact_email is not None:
        customer.contact_email = payload.contact_email.strip() or None
    if payload.location is not None:
        customer.location = payload.location.strip() or None
    if payload.credit_limit is not None:
        customer.credit_limit = payload.credit_limit
    if payload.outstanding_balance is not None:
        customer.outstanding_balance = payload.outstanding_balance
    if payload.credit_terms is not None:
        customer.credit_terms = payload.credit_terms.strip() or None
    if payload.territory_route is not None:
        customer.territory_route = payload.territory_route.strip() or None
    if payload.assigned_seller_id is not None:
        customer.assigned_seller_id = payload.assigned_seller_id

    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}", response_model=MessageResponse)
def delete_customer(
    customer_id: UUID,
    db: DBSession,
    user: User = Depends(customer_reader),
):
    # Only Store Manager, Owner, or Admin can delete client accounts
    if user.role.code not in {RoleCode.STORE_MANAGER, RoleCode.OWNER, RoleCode.ADMIN}:
        raise HTTPException(
            status_code=403,
            detail="Only Store Managers and Business Owners are permitted to delete client accounts.",
        )

    customer = db.scalar(
        select(Customer).where(Customer.id == customer_id, Customer.tenant_id == user.tenant_id)
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Check if client has outstanding credit balance
    if customer.outstanding_balance and customer.outstanding_balance > Decimal("0"):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cannot delete client '{customer.company_name or customer.external_customer_id}' with "
                f"an outstanding balance of ₹{customer.outstanding_balance:.2f}. "
                "All credit dues must be cleared first."
            ),
        )

    client_name = customer.company_name or customer.external_customer_id
    db.delete(customer)
    db.commit()
    return MessageResponse(message=f"Client '{client_name}' was successfully deleted.")


@router.get("/{customer_id}/insights", response_model=CustomerInsightResponse)
def customer_insights(
    customer_id: UUID,
    db: DBSession,
    user: User = Depends(customer_reader),
):
    customer = _customer_for_insights(db, user, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    query = (
        select(SalesTransaction, Store.name, User.full_name)
        .join(Store, Store.id == SalesTransaction.store_id)
        .join(User, User.id == SalesTransaction.seller_id)
        .where(
            SalesTransaction.customer_id == customer.id,
            SalesTransaction.status == TransactionStatus.COMPLETED,
        )
    )
    if user.role.code == RoleCode.STORE_MANAGER:
        query = query.where(SalesTransaction.store_id == user.store_id)
    elif user.role.code == RoleCode.SALES_EXECUTIVE:
        query = query.where(SalesTransaction.seller_id == user.id)
    rows = list(db.execute(query.order_by(SalesTransaction.occurred_at.desc())).all())
    transactions = [row[0] for row in rows]
    transaction_ids = [transaction.id for transaction in transactions]
    product_rows = []
    if transaction_ids:
        product_rows = list(
            db.execute(
                select(SalesLineItem, Product)
                .join(Product, Product.id == SalesLineItem.product_id)
                .where(SalesLineItem.transaction_id.in_(transaction_ids))
            ).all()
        )
    products_by_transaction: dict[UUID, list[str]] = defaultdict(list)
    product_totals: dict[UUID, dict] = {}
    category_totals: dict[str, dict] = {}
    for line, product in product_rows:
        products_by_transaction[line.transaction_id].append(f"{product.name} ({product.sku})")
        product_value = product_totals.setdefault(
            product.id,
            {
                "product_id": product.id,
                "sku": product.sku,
                "name": product.name,
                "quantity": 0,
                "revenue": Decimal("0"),
            },
        )
        product_value["quantity"] += line.quantity
        product_value["revenue"] += Decimal(line.line_amount)
        category = product.category or "Uncategorised"
        category_value = category_totals.setdefault(
            category,
            {"name": category, "quantity": 0, "revenue": Decimal("0")},
        )
        category_value["quantity"] += line.quantity
        category_value["revenue"] += Decimal(line.line_amount)

    store_counts = Counter(row[1] for row in rows)
    seller_counts = Counter(row[2] for row in rows)
    payment_counts = Counter(
        transaction.payment_method for transaction in transactions if transaction.payment_method
    )
    weekday_counts = Counter(as_utc(item.occurred_at).strftime("%A") for item in transactions)
    hour_counts = Counter(as_utc(item.occurred_at).hour for item in transactions)
    now = utcnow()
    current_start = now - timedelta(days=30)
    previous_start = now - timedelta(days=60)
    current = [item for item in transactions if as_utc(item.occurred_at) >= current_start]
    previous = [
        item for item in transactions if previous_start <= as_utc(item.occurred_at) < current_start
    ]
    current_revenue = sum((Decimal(item.total_amount) for item in current), Decimal("0"))
    previous_revenue = sum((Decimal(item.total_amount) for item in previous), Decimal("0"))
    change = (
        float((current_revenue - previous_revenue) / previous_revenue * 100)
        if previous_revenue
        else None
    )
    first_visit = min((as_utc(item.occurred_at) for item in transactions), default=None)
    last_visit = max((as_utc(item.occurred_at) for item in transactions), default=None)
    history_days = (last_visit - first_visit).days if first_visit and last_visit else 0
    if len(transactions) < 4 or history_days < 30:
        decline_status = "not_enough_history"
        decline_explanation = (
            "At least four linked visits across 30 days are required before evaluating a trend."
        )
    elif last_visit and (now - last_visit).days >= 60:
        decline_status = "inactive"
        decline_explanation = (
            f"No linked purchase has been recorded for {(now - last_visit).days} days."
        )
    elif previous and (
        len(current) <= len(previous) * 0.6 or (change is not None and change <= -30)
    ):
        decline_status = "decreasing"
        decline_explanation = (
            f"The latest 30 days contain {len(current)} orders worth ₹{current_revenue:,.0f}, "
            f"compared with {len(previous)} orders worth ₹{previous_revenue:,.0f} previously."
        )
    elif previous and change is not None and change >= 20:
        decline_status = "increasing"
        decline_explanation = (
            f"Customer revenue increased by {change:.1f}% over the previous 30 days."
        )
    else:
        decline_status = "stable"
        decline_explanation = (
            "No material decline is supported by the linked 60-day purchase history."
        )

    favourite_products = sorted(
        product_totals.values(),
        key=lambda value: (value["quantity"], value["revenue"]),
        reverse=True,
    )[:5]
    favourite_categories = sorted(
        category_totals.values(),
        key=lambda value: (value["quantity"], value["revenue"]),
        reverse=True,
    )[:5]
    suggestions = []
    if decline_status in {"decreasing", "inactive"}:
        suggestions.append(
            "Schedule a personal follow-up; the reason is the observed purchase "
            "decline shown above."
        )
    if favourite_categories:
        suggestions.append(
            "If a promotion is appropriate, prioritise "
            f"{favourite_categories[0]['name']}, the customer's most purchased category."
        )
    if not transactions:
        suggestions.append(
            "Import or record customer-linked sales before using visit and "
            "product-preference insights."
        )
    total_linked_revenue = sum((Decimal(item.total_amount) for item in transactions), Decimal("0"))
    return CustomerInsightResponse(
        customer_id=customer.id,
        external_customer_id=customer.external_customer_id,
        company_name=customer.company_name,
        gstin=customer.gstin,
        contact_phone=customer.contact_phone,
        contact_email=customer.contact_email,
        location=customer.location,
        credit_limit=customer.credit_limit,
        outstanding_balance=customer.outstanding_balance,
        credit_terms=customer.credit_terms,
        territory_route=customer.territory_route,
        assigned_seller_id=customer.assigned_seller_id,
        first_visit=first_visit,
        last_visit=last_visit,
        linked_visit_count=len(transactions),
        summary_order_count=customer.order_count,
        total_revenue=total_linked_revenue if transactions else customer.total_revenue,
        average_order_value=(
            total_linked_revenue / len(transactions) if transactions else Decimal("0")
        ),
        favourite_products=[CustomerPreference(**value) for value in favourite_products],
        favourite_categories=[CustomerPreference(**value) for value in favourite_categories],
        preferred_store=store_counts.most_common(1)[0][0] if store_counts else None,
        preferred_seller=seller_counts.most_common(1)[0][0] if seller_counts else None,
        preferred_payment_method=(payment_counts.most_common(1)[0][0] if payment_counts else None),
        typical_weekday=weekday_counts.most_common(1)[0][0] if weekday_counts else None,
        typical_hour=hour_counts.most_common(1)[0][0] if hour_counts else None,
        decline_status=decline_status,
        decline_explanation=decline_explanation,
        period_comparison=CustomerPeriodComparison(
            current_orders=len(current),
            previous_orders=len(previous),
            current_revenue=current_revenue,
            previous_revenue=previous_revenue,
            revenue_change_percentage=change,
        ),
        suggestions=suggestions,
        recent_visits=[
            CustomerVisit(
                transaction_id=transaction.id,
                reference=transaction.external_reference or str(transaction.id)[:8],
                occurred_at=transaction.occurred_at,
                store_name=store_name,
                seller_name=seller_name,
                payment_method=transaction.payment_method,
                amount=transaction.total_amount,
                item_count=transaction.item_count,
                products=products_by_transaction.get(transaction.id, []),
            )
            for transaction, store_name, seller_name in rows[:20]
        ],
        generated_on=now.date(),
    )


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: UUID,
    db: DBSession,
    user: User = Depends(customer_reader),
):
    customer = _customer_for_insights(db, user, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer
