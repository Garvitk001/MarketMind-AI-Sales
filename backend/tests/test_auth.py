from fastapi.testclient import TestClient

from tests.conftest import TEST_PASSWORD, auth_header


def test_openapi_uses_bearer_token_authorization(client: TestClient):
    schema = client.get("/api/v1/openapi.json").json()
    bearer = schema["components"]["securitySchemes"]["BearerAuth"]

    assert bearer == {
        "type": "http",
        "description": "Paste the access token returned by POST /api/v1/auth/login.",
        "scheme": "bearer",
    }
    assert {"BearerAuth": []} in schema["paths"]["/api/v1/users/me"]["get"]["security"]
    assert "security" not in schema["paths"]["/api/v1/auth/login"]["post"]


def test_registration_verification_login_refresh_and_logout(client: TestClient):
    register = client.post(
        "/api/v1/auth/register",
        json={
            "business_name": "Aravali Mart",
            "store_name": "Main Store",
            "full_name": "Aarav Sharma",
            "email": "owner@aravali.example.com",
            "password": TEST_PASSWORD,
            "currency": "INR",
            "timezone": "Asia/Kolkata",
        },
    )
    assert register.status_code == 201
    verification_token = register.json()["token"]
    assert verification_token

    blocked_login = client.post(
        "/api/v1/auth/login",
        json={"email": "owner@aravali.example.com", "password": TEST_PASSWORD},
    )
    assert blocked_login.status_code == 403

    verified = client.post(
        "/api/v1/auth/verify-email",
        json={"token": verification_token},
    )
    assert verified.status_code == 200

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "owner@aravali.example.com", "password": TEST_PASSWORD},
    )
    assert login.status_code == 200
    tokens = login.json()

    profile = client.get("/api/v1/users/me", headers=auth_header(tokens["access_token"]))
    assert profile.status_code == 200
    assert profile.json()["role"]["code"] == "business_owner"

    rotated = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert rotated.status_code == 200
    assert rotated.json()["refresh_token"] != tokens["refresh_token"]

    replay = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert replay.status_code == 401

    logout = client.post(
        "/api/v1/auth/logout",
        headers=auth_header(rotated.json()["access_token"]),
    )
    assert logout.status_code == 200

    rejected = client.get(
        "/api/v1/users/me",
        headers=auth_header(rotated.json()["access_token"]),
    )
    assert rejected.status_code == 401


def test_login_lockout_after_repeated_failures(client: TestClient):
    register = client.post(
        "/api/v1/auth/register",
        json={
            "business_name": "Lockout Retail",
            "store_name": "Main",
            "full_name": "Test Owner",
            "email": "lockout@example.com",
            "password": TEST_PASSWORD,
        },
    )
    client.post("/api/v1/auth/verify-email", json={"token": register.json()["token"]})

    for _ in range(5):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "lockout@example.com", "password": "WrongPassword123!"},
        )
        assert response.status_code == 401

    locked = client.post(
        "/api/v1/auth/login",
        json={"email": "lockout@example.com", "password": TEST_PASSWORD},
    )
    assert locked.status_code == 423


def test_registration_wrong_otp_and_resend_verification(client: TestClient):
    # 1. Register new business owner
    register = client.post(
        "/api/v1/auth/register",
        json={
            "business_name": "Jaipur Textiles",
            "store_name": "Bapu Bazaar",
            "full_name": "Rohan Gupta",
            "email": "rohan.gupta@example.com",
            "password": TEST_PASSWORD,
            "currency": "INR",
            "timezone": "Asia/Kolkata",
        },
    )
    assert register.status_code == 201
    correct_token = register.json()["token"]
    assert correct_token and len(correct_token) == 6

    # 2. Try verifying with wrong OTP
    wrong_verify = client.post(
        "/api/v1/auth/verify-email",
        json={"token": "999999", "email": "rohan.gupta@example.com"},
    )
    assert wrong_verify.status_code == 400
    res_json = wrong_verify.json()
    err_text = (res_json.get("message") or res_json.get("detail") or "").lower()
    assert "incorrect" in err_text or "invalid" in err_text

    # 3. Resend verification OTP
    resend = client.post(
        "/api/v1/auth/resend-verification-otp",
        json={"email": "rohan.gupta@example.com"},
    )
    assert resend.status_code == 200
    new_token = resend.json()["token"]
    assert new_token and len(new_token) == 6

    # Old token should now be consumed/revoked
    old_verify = client.post(
        "/api/v1/auth/verify-email",
        json={"token": correct_token, "email": "rohan.gupta@example.com"},
    )
    assert old_verify.status_code == 400

    # New token verifies successfully
    new_verify = client.post(
        "/api/v1/auth/verify-email",
        json={"token": new_token, "email": "rohan.gupta@example.com"},
    )
    assert new_verify.status_code == 200

    # Account is now active and can login
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "rohan.gupta@example.com", "password": TEST_PASSWORD},
    )
    assert login.status_code == 200
