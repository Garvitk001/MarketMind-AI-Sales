from datetime import timedelta
from starlette.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import utcnow
from app.models.identity import RoleCode, Store, Tenant, User
from tests.conftest import TEST_PASSWORD, auth_header, create_user, login


def test_business_deletion_full_lifecycle_and_auto_restoration(
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
        email="owner.del@example.com",
    )
    manager = create_user(
        db,
        tenant=tenant,
        store=store,
        role_code="store_manager",
        email="manager.del@example.com",
    )

    owner_token = login(client, owner.email)
    manager_token = login(client, manager.email)

    # 1. Non-owner cannot request deletion OTP
    non_owner_req = client.post(
        "/api/v1/users/me/business/request-delete-otp",
        headers=auth_header(manager_token),
    )
    assert non_owner_req.status_code == 403

    # 2. Business Owner requests deletion OTP
    owner_req = client.post(
        "/api/v1/users/me/business/request-delete-otp",
        headers=auth_header(owner_token),
    )
    assert owner_req.status_code == 200
    otp_data = owner_req.json()
    assert "token" in otp_data
    otp_token = otp_data["token"]
    assert len(otp_token) == 6

    # 3. Wrong OTP returns 400 error
    bad_confirm = client.post(
        "/api/v1/users/me/business/confirm-delete",
        json={"token": "000000"},
        headers=auth_header(owner_token),
    )
    assert bad_confirm.status_code == 400

    # 4. Valid OTP schedules 15-day deletion
    good_confirm = client.post(
        "/api/v1/users/me/business/confirm-delete",
        json={"token": otp_token},
        headers=auth_header(owner_token),
    )
    assert good_confirm.status_code == 200
    assert "15-day grace period" in good_confirm.json()["message"]

    # Refresh tenant from DB
    db.refresh(tenant)
    assert tenant.deletion_requested_at is not None
    assert tenant.deletion_due_at is not None
    assert tenant.is_active is False

    # 5. Team member (Store Manager) is BLOCKED from logging in
    manager_login = client.post(
        "/api/v1/auth/login",
        json={"email": manager.email, "password": TEST_PASSWORD},
    )
    assert manager_login.status_code == 403
    err_text = manager_login.json().get("message") or manager_login.json().get("detail", "")
    assert "workspace is currently suspended" in err_text

    # 6. Business Owner logs in during the 15-day window -> AUTOMATICALLY RESTORES WORKSPACE!
    owner_restore_login = client.post(
        "/api/v1/auth/login",
        json={"email": owner.email, "password": TEST_PASSWORD},
    )
    assert owner_restore_login.status_code == 200
    assert "access_token" in owner_restore_login.json()

    # Verify tenant is active and restored
    db.refresh(tenant)
    assert tenant.deletion_requested_at is None
    assert tenant.deletion_due_at is None
    assert tenant.is_active is True

    # 7. Now Store Manager CAN log in again!
    manager_login_after = client.post(
        "/api/v1/auth/login",
        json={"email": manager.email, "password": TEST_PASSWORD},
    )
    assert manager_login_after.status_code == 200
    assert "access_token" in manager_login_after.json()
