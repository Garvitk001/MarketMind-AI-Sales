from datetime import UTC, datetime
from decimal import Decimal
import secrets
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.api.dependencies import DBSession, require_permissions
from app.core.permissions import Permissions
from app.core.security import as_utc, random_token
from app.models.customers import Customer
from app.models.identity import Store, User
from app.models.inventory import Inventory, Product
from app.models.sales import SalesLineItem, SalesTransaction, TransactionStatus
from app.schemas.common import MessageResponse
from app.schemas.sales import (
    SalesCatalogItem,
    SalesTransactionCreate,
    SalesTransactionResponse,
    SalesTransactionUpdate,
    TransactionList,
)
from app.services.audit import record_audit
from app.services.sales import can_update_transaction, scoped_sales_query

router = APIRouter(prefix="/sales", tags=["Sales"])


@router.get("/catalog", response_model=list[SalesCatalogItem])
def sales_catalog(
    db: DBSession,
    user: User = Depends(require_permissions(Permissions.SALES_CREATE)),
):
    if not user.store_id:
        raise HTTPException(status_code=422, detail="A store assignment is required")
    rows = db.execute(
        select(Inventory, Product)
        .join(Product, Product.id == Inventory.product_id)
        .where(
            Inventory.tenant_id == user.tenant_id,
            Inventory.store_id == user.store_id,
            Product.is_active.is_(True),
        )
        .order_by(Product.name)
    ).all()
    return [
        SalesCatalogItem(
            product_id=product.id,
            sku=product.sku,
            name=product.name,
            category=product.category,
            available_stock=inventory.stock_quantity,
            unit_price=product.unit_mrp,
        )
        for inventory, product in rows
    ]


@router.post(
    "/transactions",
    response_model=SalesTransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_transaction(
    payload: SalesTransactionCreate,
    request: Request,
    db: DBSession,
    user: User = Depends(require_permissions(Permissions.SALES_CREATE)),
):
    target_store_id = payload.store_id or user.store_id
    if not target_store_id:
        target_store_id = db.scalar(select(Store.id).where(Store.tenant_id == user.tenant_id))
    if not target_store_id:
        raise HTTPException(status_code=422, detail="No active store found for this tenant")
    store = db.get(Store, target_store_id)
    if not store or store.tenant_id != user.tenant_id:
        raise HTTPException(status_code=422, detail="Store does not belong to this tenant")
    if user.store_id and user.store_id != store.id:
        raise HTTPException(status_code=403, detail="Transaction is outside your store scope")
    occurred_at = payload.occurred_at or datetime.now(UTC)
    ext_ref = payload.external_reference.strip() if payload.external_reference else None
    
    # Auto-generate external reference if empty or duplicate
    if not ext_ref:
        ext_ref = f"INV-{datetime.now(UTC).strftime('%Y%m%d')}-{secrets.token_hex(2).upper()}"
    else:
        existing_txn = db.scalar(
            select(SalesTransaction.id).where(
                SalesTransaction.tenant_id == user.tenant_id,
                SalesTransaction.store_id == store.id,
                SalesTransaction.external_reference == ext_ref,
            )
        )
        if existing_txn:
            ext_ref = f"{ext_ref[:70]}-{secrets.token_hex(2).upper()}"

    if payload.items:
        product_ids = [line.product_id for line in payload.items]
        products = {
            product.id: product
            for product in db.scalars(
                select(Product).where(
                    Product.tenant_id == user.tenant_id,
                    Product.id.in_(product_ids),
                    Product.is_active.is_(True),
                )
            ).all()
        }
        inventory_rows = {
            item.product_id: item
            for item in db.scalars(
                select(Inventory)
                .where(
                    Inventory.tenant_id == user.tenant_id,
                    Inventory.store_id == store.id,
                    Inventory.product_id.in_(product_ids),
                )
                .with_for_update()
            ).all()
        }
        missing = [
            str(item.product_id) for item in payload.items if item.product_id not in products
        ]
        if missing:
            raise HTTPException(
                status_code=422, detail=f"Unknown or inactive products: {', '.join(missing)}"
            )
        unavailable = [
            products[item.product_id].sku
            for item in payload.items
            if item.product_id not in inventory_rows
        ]
        if unavailable:
            raise HTTPException(
                status_code=422,
                detail=f"Products not stocked in this store: {', '.join(unavailable)}",
            )
        insufficient = [
            (
                f"{products[item.product_id].sku} "
                f"(available {inventory_rows[item.product_id].stock_quantity})"
            )
            for item in payload.items
            if inventory_rows[item.product_id].stock_quantity < item.quantity
        ]
        if insufficient:
            raise HTTPException(
                status_code=409,
                detail=f"Insufficient inventory: {', '.join(insufficient)}",
            )
        subtotal = sum(
            (item.unit_price * item.quantity - item.discount_amount for item in payload.items),
            Decimal("0"),
        )
        total = subtotal - payload.order_discount + payload.tax_amount
        if total <= 0:
            raise HTTPException(status_code=422, detail="Calculated order total must be positive")
        
        customer = None
        customer_snapshot = None
        if payload.customer_id:
            customer = db.scalar(
                select(Customer).where(
                    Customer.tenant_id == user.tenant_id,
                    Customer.id == payload.customer_id,
                )
            )
        elif payload.customer_reference and payload.customer_reference.strip():
            ref_clean = payload.customer_reference.strip()
            if ref_clean.lower() not in {"walk-in", "walk-in / direct retail counter sale", "counter sale", "direct retail"}:
                customer = db.scalar(
                    select(Customer)
                    .where(
                        Customer.tenant_id == user.tenant_id,
                        or_(
                            Customer.company_name == ref_clean,
                            Customer.external_customer_id == ref_clean,
                        ),
                    )
                    .order_by(Customer.created_at)
                    .limit(1)
                )
                if customer is None:
                    cust_ext_id = f"CUST-{secrets.token_hex(4).upper()}"
                    recency = max(0, (datetime.now(UTC).date() - occurred_at.date()).days)
                    customer = Customer(
                        tenant_id=user.tenant_id,
                        assigned_seller_id=user.id,
                        source_system="manual_pos",
                        external_customer_id=cust_ext_id,
                        company_name=ref_clean,
                        last_purchase=occurred_at,
                        order_count=0,
                        item_quantity=0,
                        total_revenue=Decimal("0.00"),
                        recency_days=recency,
                        location="Central Commercial Market",
                    )
                    db.add(customer)
                    db.flush()

        if customer:
            customer_snapshot = {
                "created": False,
                "company_name": customer.company_name or customer.external_customer_id,
                "gstin": customer.gstin,
                "location": customer.location,
                "contact_phone": customer.contact_phone,
                "territory_route": customer.territory_route,
                "assigned_seller_id": (
                    str(customer.assigned_seller_id) if customer.assigned_seller_id else None
                ),
                "last_purchase": customer.last_purchase.isoformat() if customer.last_purchase else None,
                "order_count": customer.order_count or 0,
                "item_quantity": customer.item_quantity or 0,
                "total_revenue": str(customer.total_revenue or 0),
                "recency_days": customer.recency_days or 0,
            }

        transaction = SalesTransaction(
            tenant_id=user.tenant_id,
            store_id=store.id,
            seller_id=user.id,
            source_system="manual_pos",
            external_reference=ext_ref,
            occurred_at=occurred_at,
            currency=payload.currency.upper(),
            total_amount=total,
            item_count=sum(item.quantity for item in payload.items),
            status=TransactionStatus.COMPLETED,
            notes=payload.notes,
            subtotal_amount=subtotal,
            discount_amount=payload.order_discount,
            tax_amount=payload.tax_amount,
            payment_method=payload.payment_method or "upi",
            payment_status=payload.payment_status or "paid",
            delivery_status=payload.delivery_status or "pending",
            credit_terms=payload.credit_terms or "Net 30",
            customer_id=customer.id if customer else None,
            customer_snapshot=customer_snapshot,
        )
        db.add(transaction)
        db.flush()

        for item in payload.items:
            inventory_rows[item.product_id].stock_quantity -= item.quantity
            db.add(
                SalesLineItem(
                    tenant_id=user.tenant_id,
                    transaction_id=transaction.id,
                    product_id=item.product_id,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    discount_amount=item.discount_amount,
                    line_amount=item.unit_price * item.quantity - item.discount_amount,
                )
            )

        if customer:
            customer.assigned_seller_id = user.id
            if customer.last_purchase:
                customer.last_purchase = max(
                    as_utc(customer.last_purchase), as_utc(occurred_at)
                )
            else:
                customer.last_purchase = as_utc(occurred_at)
            customer.order_count = (customer.order_count or 0) + 1
            customer.item_quantity = (customer.item_quantity or 0) + transaction.item_count
            customer.total_revenue = Decimal(str(customer.total_revenue or 0)) + Decimal(str(transaction.total_amount))
            customer.recency_days = max(
                0, (datetime.now(UTC).date() - customer.last_purchase.date()).days
            )
    else:
        transaction = SalesTransaction(
            tenant_id=user.tenant_id,
            store_id=store.id,
            seller_id=user.id,
            source_system="manual",
            external_reference=ext_ref,
            occurred_at=payload.occurred_at or occurred_at,
            currency=payload.currency.upper(),
            total_amount=payload.total_amount or Decimal("0.00"),
            item_count=payload.item_count or 1,
            status=TransactionStatus.COMPLETED,
            payment_status=payload.payment_status or "paid",
            delivery_status=payload.delivery_status or "pending",
            credit_terms=payload.credit_terms or "Net 30",
            notes=payload.notes,
        )
        db.add(transaction)
        db.flush()

    record_audit(
        db,
        event_type="sales.transaction_created",
        request=request,
        tenant_id=user.tenant_id,
        actor_user_id=user.id,
        target_type="sales_transaction",
        target_id=str(transaction.id),
        details={
            "amount": str(transaction.total_amount),
            "currency": transaction.currency,
            "products": len(payload.items),
            "inventory_updated": bool(payload.items),
            "customer_updated": bool(transaction.customer_id),
        },
    )
    db.commit()

    result = db.scalar(
        select(SalesTransaction)
        .options(
            selectinload(SalesTransaction.line_items).selectinload(SalesLineItem.product)
        )
        .where(SalesTransaction.id == transaction.id)
    )
    return result or transaction


@router.get("/transactions", response_model=TransactionList)
def list_transactions(
    db: DBSession,
    user: User = Depends(
        require_permissions(
            Permissions.SALES_READ_ALL,
            Permissions.SALES_READ_STORE,
            Permissions.SALES_READ_OWN,
            require_all=False,
        )
    ),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    base = scoped_sales_query(select(SalesTransaction), user)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    items = db.scalars(
        base.order_by(SalesTransaction.occurred_at.desc()).limit(limit).offset(offset)
    ).all()
    return TransactionList(items=items, total=total, limit=limit, offset=offset)


@router.get("/transactions/{transaction_id}", response_model=SalesTransactionResponse)
def get_transaction(
    transaction_id: UUID,
    db: DBSession,
    user: User = Depends(
        require_permissions(
            Permissions.SALES_READ_ALL,
            Permissions.SALES_READ_STORE,
            Permissions.SALES_READ_OWN,
            require_all=False,
        )
    ),
):
    item = db.scalar(
        scoped_sales_query(
            select(SalesTransaction).where(SalesTransaction.id == transaction_id),
            user,
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return item


@router.patch("/transactions/{transaction_id}", response_model=SalesTransactionResponse)
def update_transaction(
    transaction_id: UUID,
    payload: SalesTransactionUpdate,
    request: Request,
    db: DBSession,
    user: User = Depends(
        require_permissions(
            Permissions.SALES_UPDATE_STORE,
            Permissions.SALES_UPDATE_OWN,
            require_all=False,
        )
    ),
):
    item = db.get(SalesTransaction, transaction_id)
    if not item or not can_update_transaction(user, item):
        raise HTTPException(status_code=404, detail="Transaction not found")
    if item.status == TransactionStatus.VOIDED:
        raise HTTPException(status_code=409, detail="A voided transaction cannot be changed")
    if item.line_items and any(
        field in payload.model_fields_set for field in {"total_amount", "item_count"}
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Product-linked totals are calculated from line items and cannot be edited directly"
            ),
        )
    if payload.external_reference and db.scalar(
        select(SalesTransaction.id).where(
            SalesTransaction.id != item.id,
            SalesTransaction.tenant_id == item.tenant_id,
            SalesTransaction.store_id == item.store_id,
            SalesTransaction.source_system == item.source_system,
            SalesTransaction.external_reference == payload.external_reference,
        )
    ):
        raise HTTPException(status_code=409, detail="Transaction reference already exists")
    before = {key: str(getattr(item, key)) for key in payload.model_dump(exclude_unset=True)}
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    record_audit(
        db,
        event_type="sales.transaction_updated",
        request=request,
        tenant_id=user.tenant_id,
        actor_user_id=user.id,
        target_type="sales_transaction",
        target_id=str(item.id),
        details={"before": before},
    )
    db.commit()
    db.refresh(item)
    return item


@router.post("/transactions/{transaction_id}/void", response_model=MessageResponse)
def void_transaction(
    transaction_id: UUID,
    request: Request,
    db: DBSession,
    user: User = Depends(require_permissions(Permissions.SALES_VOID)),
):
    item = db.get(SalesTransaction, transaction_id)
    if (
        not item
        or item.tenant_id != user.tenant_id
        or (user.store_id and item.store_id != user.store_id)
    ):
        raise HTTPException(status_code=404, detail="Transaction not found")
    if item.status == TransactionStatus.VOIDED:
        return MessageResponse(message="Transaction was already voided")
    if item.source_system == "manual_pos":
        customer = db.get(Customer, item.customer_id) if item.customer_id else None
        if customer:
            later_sale = db.scalar(
                select(SalesTransaction.id).where(
                    SalesTransaction.customer_id == customer.id,
                    SalesTransaction.id != item.id,
                    SalesTransaction.status == TransactionStatus.COMPLETED,
                    SalesTransaction.occurred_at > item.occurred_at,
                )
            )
            if later_sale:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Void the customer's newer completed transaction before this one so "
                        "the customer history remains correct"
                    ),
                )
        for line in item.line_items:
            inventory = db.scalar(
                select(Inventory).where(
                    Inventory.store_id == item.store_id,
                    Inventory.product_id == line.product_id,
                )
            )
            if inventory:
                inventory.stock_quantity += line.quantity
        if customer:
            snapshot = item.customer_snapshot or {}
            if snapshot.get("created"):
                item.customer_id = None
                db.delete(customer)
            elif snapshot:
                customer.assigned_seller_id = (
                    UUID(snapshot["assigned_seller_id"])
                    if snapshot.get("assigned_seller_id")
                    else None
                )
                customer.last_purchase = datetime.fromisoformat(snapshot["last_purchase"])
                customer.order_count = snapshot["order_count"]
                customer.item_quantity = snapshot["item_quantity"]
                customer.total_revenue = Decimal(snapshot["total_revenue"])
                customer.recency_days = snapshot["recency_days"]
    item.status = TransactionStatus.VOIDED
    record_audit(
        db,
        event_type="sales.transaction_voided",
        request=request,
        tenant_id=user.tenant_id,
        actor_user_id=user.id,
        target_type="sales_transaction",
        target_id=str(item.id),
    )
    db.commit()
    return MessageResponse(message="Transaction voided")
