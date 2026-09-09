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
        category="Demo",
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
    return item


def test_anomaly_detection_endpoints(
    client: TestClient,
    db: Session,
    tenant: Tenant,
    store: Store,
):
    add_inventory(db, tenant=tenant, store=store, sku="ANOM-01", stock_quantity=0)
    owner = create_user(
        db,
        tenant=tenant,
        store=store,
        role_code="business_owner",
        email="owner.anomaly@example.com",
    )
    headers = auth_header(login(client, owner.email))

    # Test GET /api/v1/anomalies
    resp = client.get(f"/api/v1/anomalies?tenant_id={tenant.id}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["algorithm"] == "IsolationForest"
    assert data["total_anomalies_detected"] >= 1
    assert len(data["items"]) >= 1

    event_id = data["items"][0]["id"]

    # Test POST /api/v1/anomalies/{event_id}/acknowledge
    ack_resp = client.post(f"/api/v1/anomalies/{event_id}/acknowledge", headers=headers)
    assert ack_resp.status_code == 200
    assert ack_resp.json()["status"] == "acknowledged"

    # Test POST /api/v1/anomalies/{event_id}/resolve
    res_resp = client.post(f"/api/v1/anomalies/{event_id}/resolve", headers=headers)
    assert res_resp.status_code == 200
    assert res_resp.json()["status"] == "resolved"


def test_anomaly_severity_filter(
    client: TestClient,
    db: Session,
    tenant: Tenant,
    store: Store,
):
    add_inventory(db, tenant=tenant, store=store, sku="ANOM-CRIT", stock_quantity=0)
    owner = create_user(
        db,
        tenant=tenant,
        store=store,
        role_code="business_owner",
        email="owner.anomaly.filter@example.com",
    )
    headers = auth_header(login(client, owner.email))

    resp = client.get(
        f"/api/v1/anomalies?tenant_id={tenant.id}&severity=critical",
        headers=headers,
    )

    assert resp.status_code == 200

    data = resp.json()

    assert data["total_anomalies_detected"] >= 1
    assert len(data["items"]) >= 1
    assert all(item["severity"] == "Critical" for item in data["items"])
