from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.identity import Store, Tenant
from app.models.inventory import Inventory, Product
from tests.conftest import auth_header, create_user, login


def add_inventory(
    db: Session,
    *,
    tenant: Tenant,
    store: Store,
    sku: str,
    stock_quantity: int,
) -> Inventory:
    product = Product(
        tenant_id=tenant.id,
        sku=sku,
        name=sku,
        category="Kurta",
    )
    db.add(product)
    db.flush()
    item = Inventory(
        tenant_id=tenant.id,
        store_id=store.id,
        product_id=product.id,
        stock_quantity=stock_quantity,
        reorder_level=5,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def test_inventory_access_and_updates_are_role_and_store_scoped(
    client: TestClient,
    db: Session,
    tenant: Tenant,
    store: Store,
):
    second_store = Store(
        tenant_id=tenant.id,
        name="Delhi Store",
        code="DEL-01",
        timezone="Asia/Kolkata",
    )
    db.add(second_store)
    db.commit()
    first_item = add_inventory(
        db,
        tenant=tenant,
        store=store,
        sku="SKU-JAI",
        stock_quantity=3,
    )
    add_inventory(
        db,
        tenant=tenant,
        store=second_store,
        sku="SKU-DEL",
        stock_quantity=0,
    )

    owner = create_user(
        db,
        tenant=tenant,
        store=store,
        role_code="business_owner",
        email="owner.inventory@example.com",
    )
    manager = create_user(
        db,
        tenant=tenant,
        store=store,
        role_code="store_manager",
        email="manager.inventory@example.com",
    )
    executive = create_user(
        db,
        tenant=tenant,
        store=store,
        role_code="sales_executive",
        email="sales.inventory@example.com",
    )
    owner_token = login(client, owner.email)
    manager_token = login(client, manager.email)
    executive_token = login(client, executive.email)

    owner_list = client.get("/api/v1/inventory", headers=auth_header(owner_token))
    assert owner_list.status_code == 200
    assert owner_list.json()["total"] == 2

    manager_list = client.get("/api/v1/inventory", headers=auth_header(manager_token))
    assert manager_list.status_code == 200
    assert manager_list.json()["total"] == 1
    assert manager_list.json()["items"][0]["product"]["sku"] == "SKU-JAI"

    manager_summary = client.get(
        "/api/v1/inventory/summary",
        headers=auth_header(manager_token),
    )
    assert manager_summary.status_code == 200
    assert manager_summary.json()["scope"] == "store"
    assert manager_summary.json()["low_stock_count"] == 1

    outside_scope = client.get(
        "/api/v1/inventory",
        params={"store_id": str(second_store.id)},
        headers=auth_header(manager_token),
    )
    assert outside_scope.status_code == 403

    forbidden_read = client.get(
        "/api/v1/inventory",
        headers=auth_header(executive_token),
    )
    assert forbidden_read.status_code == 403

    owner_update = client.patch(
        f"/api/v1/inventory/{first_item.id}",
        json={"stock_quantity": 10},
        headers=auth_header(owner_token),
    )
    assert owner_update.status_code == 200

    manager_update = client.patch(
        f"/api/v1/inventory/{first_item.id}",
        json={"stock_quantity": 10},
        headers=auth_header(manager_token),
    )
    assert manager_update.status_code == 200
    assert manager_update.json()["stock_quantity"] == 10
    assert manager_update.json()["stock_status"] == "in_stock"
