from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import case, func, select

from app.api.dependencies import DBSession, require_permissions
from app.core.permissions import Permissions
from app.models.identity import Store, User
from app.models.inventory import Inventory, Product
from app.schemas.inventory import (
    InventoryList,
    InventoryResponse,
    InventorySummary,
    InventoryUpdate,
    ProductCreate,
    ProductUpdate,
)
from app.services.audit import record_audit
from app.services.inventory import can_update_inventory, scoped_inventory_query

router = APIRouter(prefix="/inventory", tags=["Inventory"])

inventory_reader = require_permissions(
    Permissions.INVENTORY_READ_ALL,
    Permissions.INVENTORY_READ_STORE,
    require_all=False,
)
inventory_updater = require_permissions(
    Permissions.INVENTORY_UPDATE_STORE,
    Permissions.INVENTORY_READ_ALL,
    require_all=False,
)


@router.get("/summary", response_model=InventorySummary)
def inventory_summary(
    db: DBSession,
    user: User = Depends(inventory_reader),
    store_id: UUID | None = Query(default=None),
):
    base = scoped_inventory_query(select(Inventory), user, store_id)
    scoped = base.subquery()
    product_count, total_units, low_stock_count, out_of_stock_count = db.execute(
        select(
            func.count(scoped.c.id),
            func.coalesce(func.sum(scoped.c.stock_quantity), 0),
            func.coalesce(
                func.sum(
                    case(
                        (
                            (scoped.c.stock_quantity > 0)
                            & (scoped.c.stock_quantity <= scoped.c.reorder_level),
                            1,
                        ),
                        else_=0,
                    )
                ),
                0,
            ),
            func.coalesce(
                func.sum(case((scoped.c.stock_quantity == 0, 1), else_=0)),
                0,
            ),
        )
    ).one()
    effective_store = store_id
    scope = "business"
    if Permissions.INVENTORY_READ_ALL not in user.permission_codes:
        effective_store = user.store_id
        scope = "store"
    elif store_id:
        scope = "store"
    return InventorySummary(
        scope=scope,
        tenant_id=user.tenant_id,
        store_id=effective_store,
        product_count=product_count,
        total_units=total_units,
        low_stock_count=low_stock_count,
        out_of_stock_count=out_of_stock_count,
    )


@router.get("", response_model=InventoryList)
def list_inventory(
    db: DBSession,
    user: User = Depends(inventory_reader),
    store_id: UUID | None = Query(default=None),
    sku: str | None = Query(default=None, max_length=100),
    category: str | None = Query(default=None, max_length=120),
    stock_status: str | None = Query(
        default=None,
        pattern="^(in_stock|low_stock|out_of_stock)$",
    ),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    query = scoped_inventory_query(
        select(Inventory).join(Product),
        user,
        store_id,
    )
    if sku:
        query = query.where(Product.sku.ilike(f"%{sku.strip()}%"))
    if category:
        query = query.where(Product.category.ilike(f"%{category.strip()}%"))
    if stock_status == "out_of_stock":
        query = query.where(Inventory.stock_quantity == 0)
    elif stock_status == "low_stock":
        query = query.where(
            Inventory.stock_quantity > 0,
            Inventory.stock_quantity <= Inventory.reorder_level,
        )
    elif stock_status == "in_stock":
        query = query.where(Inventory.stock_quantity > Inventory.reorder_level)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(query.order_by(Product.sku).limit(limit).offset(offset)).unique().all()
    return InventoryList(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=InventoryResponse, status_code=201)
def create_product_inventory(
    payload: ProductCreate,
    request: Request,
    db: DBSession,
    user: User = Depends(inventory_updater),
):
    # Determine effective store
    store_id = payload.store_id or user.store_id
    if not store_id:
        # Fallback to the first store in the tenant
        default_store = db.scalars(
            select(Store).where(Store.tenant_id == user.tenant_id).order_by(Store.created_at)
        ).first()
        if not default_store:
            raise HTTPException(status_code=400, detail="No store found for this business. Please create a store first.")
        store_id = default_store.id
    else:
        store = db.scalar(
            select(Store).where(Store.id == store_id, Store.tenant_id == user.tenant_id)
        )
        if not store:
            raise HTTPException(status_code=400, detail="Specified store is invalid or not in your business")

    # Find or create Product
    product = db.scalar(
        select(Product).where(
            Product.tenant_id == user.tenant_id,
            Product.sku == payload.sku.strip(),
        )
    )
    if not product:
        product = Product(
            tenant_id=user.tenant_id,
            sku=payload.sku.strip(),
            name=payload.name.strip(),
            category=payload.category.strip() if payload.category else "General",
            unit_mrp=payload.unit_price,
            hsn_code="8471",
            pack_size="1 Unit",
            is_active=True,
        )
        db.add(product)
        db.flush()
    else:
        # Update product metadata if existing
        product.name = payload.name.strip()
        if payload.category:
            product.category = payload.category.strip()
        if payload.unit_price is not None:
            product.unit_mrp = payload.unit_price

    # Find or create Inventory entry for this store
    inventory = db.scalar(
        select(Inventory).where(
            Inventory.tenant_id == user.tenant_id,
            Inventory.store_id == store_id,
            Inventory.product_id == product.id,
        )
    )
    if not inventory:
        inventory = Inventory(
            tenant_id=user.tenant_id,
            store_id=store_id,
            product_id=product.id,
            stock_quantity=payload.stock_quantity,
            reorder_level=payload.reorder_level,
            batch_number=payload.batch_number or f"BATCH-{payload.sku.strip()}",
            expiry_date=payload.expiry_date,
        )
        db.add(inventory)
    else:
        inventory.stock_quantity = payload.stock_quantity
        inventory.reorder_level = payload.reorder_level
        if payload.batch_number:
            inventory.batch_number = payload.batch_number
        if payload.expiry_date:
            inventory.expiry_date = payload.expiry_date

    record_audit(
        db,
        event_type="inventory.created",
        request=request,
        tenant_id=user.tenant_id,
        actor_user_id=user.id,
        target_type="inventory",
        target_id=str(inventory.id) if inventory.id else str(product.id),
        details={"sku": payload.sku, "name": payload.name, "store_id": str(store_id)},
    )
    db.commit()
    db.refresh(inventory)
    return inventory


@router.get("/{inventory_id}", response_model=InventoryResponse)
def get_inventory(
    inventory_id: UUID,
    db: DBSession,
    user: User = Depends(inventory_reader),
):
    item = db.scalar(
        scoped_inventory_query(
            select(Inventory).where(Inventory.id == inventory_id),
            user,
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Inventory record not found")
    return item


@router.put("/{inventory_id}", response_model=InventoryResponse)
@router.patch("/{inventory_id}", response_model=InventoryResponse)
def update_inventory_or_product(
    inventory_id: UUID,
    payload: ProductUpdate,
    request: Request,
    db: DBSession,
    user: User = Depends(inventory_updater),
):
    item = db.get(Inventory, inventory_id)
    if not item or not can_update_inventory(user, item):
        raise HTTPException(status_code=404, detail="Inventory record not found")

    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="At least one field is required to update")

    # Update inventory fields
    if "stock_quantity" in changes and changes["stock_quantity"] is not None:
        item.stock_quantity = changes["stock_quantity"]
    if "reorder_level" in changes and changes["reorder_level"] is not None:
        item.reorder_level = changes["reorder_level"]
    if "batch_number" in changes:
        item.batch_number = changes["batch_number"]
    if "expiry_date" in changes:
        item.expiry_date = changes["expiry_date"]

    # Update associated product fields
    if item.product:
        if "name" in changes and changes["name"]:
            item.product.name = changes["name"].strip()
        if "sku" in changes and changes["sku"]:
            item.product.sku = changes["sku"].strip()
        if "category" in changes and changes["category"]:
            item.product.category = changes["category"].strip()
        if "unit_price" in changes and changes["unit_price"] is not None:
            item.product.unit_mrp = changes["unit_price"]

    record_audit(
        db,
        event_type="inventory.updated",
        request=request,
        tenant_id=user.tenant_id,
        actor_user_id=user.id,
        target_type="inventory",
        target_id=str(item.id),
        details={"changes": {k: str(v) for k, v in changes.items()}},
    )
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{inventory_id}")
def delete_inventory_product(
    inventory_id: UUID,
    request: Request,
    db: DBSession,
    user: User = Depends(inventory_updater),
):
    item = db.get(Inventory, inventory_id)
    if not item or not can_update_inventory(user, item):
        raise HTTPException(status_code=404, detail="Inventory record not found")

    product_id = item.product_id
    sku = item.product.sku if item.product else "UNKNOWN"
    name = item.product.name if item.product else "UNKNOWN"

    db.delete(item)
    db.flush()

    # Check if this product has other inventory entries
    other_inv = db.scalar(select(Inventory).where(Inventory.product_id == product_id))
    if not other_inv:
        prod = db.get(Product, product_id)
        if prod:
            db.delete(prod)

    record_audit(
        db,
        event_type="inventory.deleted",
        request=request,
        tenant_id=user.tenant_id,
        actor_user_id=user.id,
        target_type="inventory",
        target_id=str(inventory_id),
        details={"sku": sku, "name": name},
    )
    db.commit()
    return {"message": "Product removed successfully", "id": str(inventory_id)}
