from datetime import UTC, datetime
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.customers import Customer
from app.models.identity import Store, Tenant
from tests.conftest import auth_header, create_user, login


def test_customer_creation_editing_and_shared_business_visibility(
    client: TestClient,
    db: Session,
    tenant: Tenant,
    store: Store,
):
    owner = create_user(
        db,
        tenant=tenant,
        store=store,
        role_code="business_owner",
        email="owner.customers@example.com",
    )
    manager = create_user(
        db,
        tenant=tenant,
        store=store,
        role_code="store_manager",
        email="manager.customers@example.com",
    )
    sales = create_user(
        db,
        tenant=tenant,
        store=store,
        role_code="sales_executive",
        email="sales.customers@example.com",
    )

    # 1. Sales Executive registers a new client
    sales_token = login(client, sales.email)
    create_payload = {
        "company_name": "Apex Wholesale Traders",
        "gstin": "27APEX0000A1Z5",
        "contact_phone": "+91 98765 11223",
        "contact_email": "apex@traders.in",
        "location": "Sector 18 Wholesale Market, Pune",
        "credit_limit": 500000.00,
        "credit_terms": "Net 45",
        "territory_route": "Western Maharashtra Corridor",
    }
    create_res = client.post(
        "/api/v1/customers",
        json=create_payload,
        headers=auth_header(sales_token),
    )
    assert create_res.status_code == 201
    created_cust = create_res.json()
    assert created_cust["company_name"] == "Apex Wholesale Traders"
    assert created_cust["location"] == "Sector 18 Wholesale Market, Pune"
    assert created_cust["credit_terms"] == "Net 45"
    cust_id = created_cust["id"]

    # 2. Store Manager can immediately see this client in the business directory
    manager_token = login(client, manager.email)
    manager_res = client.get(
        f"/api/v1/customers?search=Apex",
        headers=auth_header(manager_token),
    )
    assert manager_res.status_code == 200
    assert manager_res.json()["total"] == 1
    assert manager_res.json()["items"][0]["id"] == cust_id
    assert manager_res.json()["items"][0]["location"] == "Sector 18 Wholesale Market, Pune"

    # 3. Business Owner can view and edit client details (360 profile edit)
    owner_token = login(client, owner.email)
    owner_res = client.get(
        f"/api/v1/customers/{cust_id}",
        headers=auth_header(owner_token),
    )
    assert owner_res.status_code == 200
    assert owner_res.json()["company_name"] == "Apex Wholesale Traders"

    update_payload = {
        "company_name": "Apex Wholesale & Logistics Pvt Ltd",
        "location": "Bhiwandi Logistics Park, Mumbai",
        "credit_limit": 750000.00,
        "outstanding_balance": 125000.00,
    }
    patch_res = client.patch(
        f"/api/v1/customers/{cust_id}",
        json=update_payload,
        headers=auth_header(owner_token),
    )
    assert patch_res.status_code == 200
    updated_cust = patch_res.json()
    assert updated_cust["company_name"] == "Apex Wholesale & Logistics Pvt Ltd"
    assert updated_cust["location"] == "Bhiwandi Logistics Park, Mumbai"
    assert float(updated_cust["outstanding_balance"]) == 125000.00

    # 4. Sales Executive gets the updated info on search
    sales_search_res = client.get(
        "/api/v1/customers?search=Bhiwandi",
        headers=auth_header(sales_token),
    )
    assert sales_search_res.status_code == 200
    assert sales_search_res.json()["total"] == 1
    assert sales_search_res.json()["items"][0]["company_name"] == "Apex Wholesale & Logistics Pvt Ltd"


def test_customer_multi_tenant_isolation(
    client: TestClient,
    db: Session,
    tenant: Tenant,
    store: Store,
):
    other_tenant = Tenant(
        name="Competitor Retailers Ltd",
        slug="competitor-retail",
    )
    db.add(other_tenant)
    db.commit()
    db.refresh(other_tenant)

    other_store = Store(
        tenant_id=other_tenant.id,
        code="COMP-01",
        name="Competitor Branch 1",
    )
    db.add(other_store)
    db.commit()
    db.refresh(other_store)

    user1 = create_user(
        db,
        tenant=tenant,
        store=store,
        role_code="business_owner",
        email="owner1@business.com",
    )
    user2 = create_user(
        db,
        tenant=other_tenant,
        store=other_store,
        role_code="business_owner",
        email="owner2@competitor.com",
    )

    db.add(
        Customer(
            tenant_id=tenant.id,
            source_system="manual",
            external_customer_id="CUST-TENANT1",
            company_name="Tenant 1 Exclusive Customer",
            last_purchase=datetime.now(UTC),
            order_count=1,
            item_quantity=5,
            total_revenue=Decimal("10000.00"),
            recency_days=5,
            location="Tenant 1 Area",
        )
    )
    db.commit()

    # User 1 sees 1 customer
    res1 = client.get("/api/v1/customers", headers=auth_header(login(client, user1.email)))
    assert res1.status_code == 200
    assert res1.json()["total"] == 1
    assert res1.json()["items"][0]["company_name"] == "Tenant 1 Exclusive Customer"

    # User 2 (different business) sees 0 customers (strict isolation)
    res2 = client.get("/api/v1/customers", headers=auth_header(login(client, user2.email)))
    assert res2.status_code == 200
    assert res2.json()["total"] == 0
