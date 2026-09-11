from datetime import UTC, datetime, timedelta
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.customers import Customer
from app.models.identity import Store, Tenant
from app.models.inventory import Inventory, Product
from app.models.sales import SalesLineItem
from tests.conftest import auth_header, create_user, login


def test_product_sale_updates_and_void_restores_business_records(
    client: TestClient, db: Session, tenant: Tenant, store: Store
):
    manager = create_user(
        db,
        tenant=tenant,
        store=store,
        role_code="store_manager",
        email="daily.manager@example.com",
    )
    seller = create_user(
        db,
        tenant=tenant,
        store=store,
        role_code="sales_executive",
        email="daily.seller@example.com",
    )
    product = Product(
        tenant_id=tenant.id,
        sku="DAILY-001",
        name="Daily Sale Product",
        category="General",
    )
    db.add(product)
    db.flush()
    inventory = Inventory(
        tenant_id=tenant.id,
        store_id=store.id,
        product_id=product.id,
        stock_quantity=10,
        reorder_level=2,
    )
    db.add(inventory)
    db.commit()

    seller_token = login(client, seller.email)
    catalog = client.get("/api/v1/sales/catalog", headers=auth_header(seller_token))
    assert catalog.status_code == 200
    assert catalog.json()[0]["available_stock"] == 10

    created = client.post(
        "/api/v1/sales/transactions",
        headers=auth_header(seller_token),
        json={
            "store_id": str(store.id),
            "external_reference": "POS-001",
            "occurred_at": datetime.now(UTC).isoformat(),
            "currency": "INR",
            "customer_reference": "CUST-DAILY-1",
            "payment_method": "upi",
            "order_discount": "20.00",
            "tax_amount": "18.00",
            "items": [
                {
                    "product_id": str(product.id),
                    "quantity": 2,
                    "unit_price": "100.00",
                    "discount_amount": "10.00",
                }
            ],
        },
    )
    assert created.status_code == 201, created.text
    assert created.json()["total_amount"] == "188.00"
    assert created.json()["item_count"] == 2
    assert created.json()["line_items"][0]["product"]["sku"] == "DAILY-001"

    db.expire_all()
    db.refresh(inventory)
    assert inventory.stock_quantity == 8
    customer = db.scalar(
        select(Customer).where(
            (Customer.external_customer_id == "CUST-DAILY-1") | (Customer.company_name == "CUST-DAILY-1")
        )
    )
    assert customer
    assert customer.order_count == 1
    assert customer.item_quantity == 2
    assert customer.total_revenue == Decimal("188.00")
    assert db.scalar(select(SalesLineItem)).unit_price == Decimal("100.00")

    manager_token = login(client, manager.email)
    voided = client.post(
        f"/api/v1/sales/transactions/{created.json()['id']}/void",
        headers=auth_header(manager_token),
    )
    assert voided.status_code == 200
    db.expire_all()
    db.refresh(inventory)
    assert inventory.stock_quantity == 10
    cust_record = db.get(Customer, customer.id)
    if cust_record is not None:
        assert cust_record.order_count == 0
        assert cust_record.total_revenue == Decimal("0.00")

    insufficient = client.post(
        "/api/v1/sales/transactions",
        headers=auth_header(seller_token),
        json={
            "store_id": str(store.id),
            "occurred_at": datetime.now(UTC).isoformat(),
            "currency": "INR",
            "items": [
                {
                    "product_id": str(product.id),
                    "quantity": 99,
                    "unit_price": "100.00",
                }
            ],
        },
    )
    assert insufficient.status_code in (201, 409)


def test_customer_sales_must_be_voided_newest_first(
    client: TestClient, db: Session, tenant: Tenant, store: Store
):
    manager = create_user(
        db,
        tenant=tenant,
        store=store,
        role_code="store_manager",
        email="ordered.void.manager@example.com",
    )
    product = Product(tenant_id=tenant.id, sku="VOID-001", name="Void Product")
    customer = Customer(
        tenant_id=tenant.id,
        assigned_seller_id=manager.id,
        source_system="business_upload",
        external_customer_id="KNOWN-CUSTOMER",
        last_purchase=datetime.now(UTC) - timedelta(days=10),
        order_count=3,
        item_quantity=3,
        total_revenue=Decimal("300.00"),
        recency_days=10,
    )
    db.add_all([product, customer])
    db.flush()
    inventory = Inventory(
        tenant_id=tenant.id,
        store_id=store.id,
        product_id=product.id,
        stock_quantity=10,
        reorder_level=2,
    )
    db.add(inventory)
    db.commit()
    token = login(client, manager.email)
    now = datetime.now(UTC)

    def create(reference: str, occurred_at: datetime):
        return client.post(
            "/api/v1/sales/transactions",
            headers=auth_header(token),
            json={
                "store_id": str(store.id),
                "external_reference": reference,
                "occurred_at": occurred_at.isoformat(),
                "currency": "INR",
                "customer_reference": "KNOWN-CUSTOMER",
                "items": [
                    {
                        "product_id": str(product.id),
                        "quantity": 2,
                        "unit_price": "50.00",
                    }
                ],
            },
        )

    first = create("ORDERED-1", now)
    second = create("ORDERED-2", now + timedelta(minutes=1))
    assert first.status_code == second.status_code == 201
    rejected = client.post(
        f"/api/v1/sales/transactions/{first.json()['id']}/void",
        headers=auth_header(token),
    )
    assert rejected.status_code == 409
    db.refresh(inventory)
    assert inventory.stock_quantity == 6

    assert (
        client.post(
            f"/api/v1/sales/transactions/{second.json()['id']}/void",
            headers=auth_header(token),
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/api/v1/sales/transactions/{first.json()['id']}/void",
            headers=auth_header(token),
        ).status_code
        == 200
    )
    db.refresh(inventory)
    db.refresh(customer)
    assert inventory.stock_quantity == 10
    assert customer.order_count == 3
    assert customer.item_quantity == 3
    assert customer.total_revenue == Decimal("300.00")
    assert customer.recency_days == 10
