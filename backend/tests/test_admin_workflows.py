import pyotp
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.identity import Store, Tenant
from tests.conftest import TEST_PASSWORD, auth_header, create_user, login


def reauthenticated_headers(client: TestClient, email: str) -> dict[str, str]:
    token = login(client, email)
    response = client.post(
        "/api/v1/auth/reauthenticate",
        json={"password": TEST_PASSWORD},
        headers=auth_header(token),
    )
    assert response.status_code == 200
    return {**auth_header(token), "X-Reauth-Token": response.json()["reauth_token"]}


def enable_admin_mfa(client: TestClient, email: str) -> str:
    initial_token = login(client, email)
    setup = client.post("/api/v1/auth/mfa/setup", headers=auth_header(initial_token))
    secret = setup.json()["secret"]
    confirmation = client.post(
        "/api/v1/auth/mfa/confirm",
        json={"code": pyotp.TOTP(secret).now()},
        headers=auth_header(initial_token),
    )
    assert confirmation.status_code == 200
    return login(client, email, pyotp.TOTP(secret).now())


def test_owner_invites_and_manages_employees(
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
        email="owner@example.com",
    )
    manager = create_user(
        db,
        tenant=tenant,
        store=store,
        role_code="store_manager",
        email="existing.manager@example.com",
    )
    headers = reauthenticated_headers(client, owner.email)

    roles = client.get("/api/v1/users/roles/catalog", headers=headers)
    assert roles.status_code == 200
    assert {role["code"] for role in roles.json()} == {"store_manager", "sales_executive"}

    invite = client.post(
        "/api/v1/users/invite",
        json={
            "email": "new.sales@example.com",
            "full_name": "New Sales Executive",
            "role_code": "sales_executive",
            "store_id": str(store.id),
        },
        headers=headers,
    )
    assert invite.status_code == 201, invite.text
    assert "pending" in invite.json()["message"].lower()

    pending_login = client.post(
        "/api/v1/auth/login",
        json={"email": "new.sales@example.com", "password": TEST_PASSWORD},
    )
    assert pending_login.status_code == 403

    accepted = client.post(
        "/api/v1/users/accept-invitation",
        json={"token": invite.json()["token"], "password": TEST_PASSWORD},
    )
    assert accepted.status_code == 200
    sales_token = login(client, "new.sales@example.com")
    profile = client.get("/api/v1/users/me", headers=auth_header(sales_token))
    assert profile.json()["role"]["code"] == "sales_executive"

    changed = client.patch(
        f"/api/v1/users/{manager.id}/role",
        json={"role_code": "sales_executive", "store_id": str(store.id)},
        headers=headers,
    )
    assert changed.status_code == 200, changed.text
    assert changed.json()["role"]["code"] == "sales_executive"

    # Test updating employee details: full_name, email, phone_number
    updated = client.patch(
        f"/api/v1/users/{manager.id}",
        json={
            "full_name": "Updated Manager Name",
            "email": "updated.manager@example.com",
            "phone_number": "+91 9876543210",
            "role_code": "store_manager",
            "store_id": str(store.id),
        },
        headers=headers,
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["full_name"] == "Updated Manager Name"
    assert updated.json()["email"] == "updated.manager@example.com"
    assert updated.json()["phone_number"] == "+91 9876543210"
    assert updated.json()["role"]["code"] == "store_manager"

    # Test reissuing invitation token for an employee
    reissued = client.post(
        f"/api/v1/users/{manager.id}/reissue-invitation",
        headers=headers,
    )
    assert reissued.status_code == 200, reissued.text
    assert reissued.json()["token"] is not None

    forbidden_owner_role = client.post(
        "/api/v1/users/invite",
        json={
            "email": "another.owner@example.com",
            "full_name": "Another Owner",
            "role_code": "business_owner",
            "store_id": str(store.id),
        },
        headers=headers,
    )
    assert forbidden_owner_role.status_code == 422


def test_internal_admin_cannot_manage_business_employees(
    client: TestClient,
    db: Session,
    tenant: Tenant,
    store: Store,
):
    admin = create_user(
        db,
        tenant=tenant,
        store=None,
        role_code="administrator",
        email="security.admin@example.com",
    )
    token = enable_admin_mfa(client, admin.email)

    assert client.get("/api/v1/users", headers=auth_header(token)).status_code == 403
    invite = client.post(
        "/api/v1/users/invite",
        json={
            "email": "blocked.sales@example.com",
            "full_name": "Blocked Sales",
            "role_code": "sales_executive",
            "store_id": str(store.id),
        },
        headers=auth_header(token),
    )
    assert invite.status_code in {401, 403}


def test_password_reset_revokes_existing_sessions(
    client: TestClient,
    db: Session,
    tenant: Tenant,
    store: Store,
):
    user = create_user(
        db,
        tenant=tenant,
        store=store,
        role_code="business_owner",
        email="reset.owner@example.com",
    )
    existing_token = login(client, user.email)
    reset = client.post("/api/v1/auth/password-reset/request", json={"email": user.email})
    assert reset.status_code == 200
    completed = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": reset.json()["token"], "new_password": "AnotherStrongPass456!"},
    )
    assert completed.status_code == 200

    revoked = client.get("/api/v1/users/me", headers=auth_header(existing_token))
    assert revoked.status_code == 401
