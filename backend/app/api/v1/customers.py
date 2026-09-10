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
from app.schemas.customers import (
    CustomerInsightResponse,
    CustomerList,
    CustomerPeriodComparison,
    CustomerPreference,
    CustomerResponse,
    CustomerSummary,
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
    customer = db.scalar(
        select(Customer).where(Customer.id == customer_id, Customer.tenant_id == user.tenant_id)
    )
    if customer is None:
        return None
    if user.role.code in {RoleCode.BUSINESS_OWNER, RoleCode.ADMINISTRATOR}:
        return customer
    if user.role.code == RoleCode.SALES_EXECUTIVE:
        return customer if customer.assigned_seller_id == user.id else None
    if user.role.code == RoleCode.STORE_MANAGER and user.store_id:
        visible = db.scalar(
            select(SalesTransaction.id).where(
                SalesTransaction.customer_id == customer.id,
                SalesTransaction.store_id == user.store_id,
            )
        )
        return customer if visible else None
    return None


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
    if user.role.code == RoleCode.STORE_MANAGER:
        customer_ids = select(SalesTransaction.customer_id).where(
            SalesTransaction.tenant_id == user.tenant_id,
            SalesTransaction.store_id == user.store_id,
            SalesTransaction.customer_id.is_not(None),
        )
        query = select(Customer).where(
            Customer.tenant_id == user.tenant_id, Customer.id.in_(customer_ids)
        )
    else:
        query, _ = scoped_customer_query(select(Customer), user)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.where(
            (Customer.external_customer_id.ilike(search_pattern))
            | (Customer.company_name.ilike(search_pattern))
            | (Customer.contact_email.ilike(search_pattern))
            | (Customer.contact_phone.ilike(search_pattern))
            | (Customer.gstin.ilike(search_pattern))
        )
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(
        query.order_by(Customer.total_revenue.desc()).limit(limit).offset(offset)
    ).all()
    return CustomerList(items=items, total=total, limit=limit, offset=offset)


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
