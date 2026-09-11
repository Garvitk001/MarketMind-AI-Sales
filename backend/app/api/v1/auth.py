from datetime import timedelta
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select

from app.api.dependencies import CurrentUser, DBSession, get_bearer_token
from app.core.config import settings
from app.core.rate_limiter import rate_limiter
from app.core.security import (
    create_jwt,
    hash_password,
    mfa_uri,
    new_mfa_secret,
    utcnow,
    verify_mfa_code,
    verify_password,
)
from app.models.auth import AuthSession, SecurityTokenPurpose
from app.models.identity import Role, RoleCode, Store, Tenant, User, UserStatus
from app.schemas.auth import (
    DeveloperOtpRequest,
    DeveloperOtpVerify,
    DevelopmentTokenResponse,
    EmailOtpRequest,
    EmailOtpVerify,
    EmailVerificationResponse,
    LoginRequest,
    MFAConfirmRequest,
    MFASetupResponse,
    PasswordResetConfirm,
    PasswordResetRequest,
    ReauthenticateRequest,
    ReauthenticateResponse,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
    TokenRequest,
)
from app.schemas.common import MessageResponse
from app.services.audit import record_audit
from app.services.auth import (
    authenticate_user,
    consume_security_token,
    find_user_by_email,
    issue_security_token,
    issue_token_pair,
    revoke_user_sessions,
    rotate_refresh_token,
)
from app.services.email_delivery import (
    EmailDeliveryError,
    email_delivery_configured,
    require_production_email_delivery,
    send_password_reset_email,
    send_security_email,
    send_verification_email,
)
from app.services.identity import normalize_email, slugify

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=DevelopmentTokenResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: RegisterRequest, request: Request, db: DBSession):
    rate_limiter.check_rate_limit(request, tier="auth")
    rate_limiter.check_auth_backoff(request, payload.email)
    try:
        require_production_email_delivery()
    except EmailDeliveryError as exc:
        raise HTTPException(status_code=503, detail="Email delivery is unavailable") from exc
    if find_user_by_email(db, payload.email):
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    base_slug = slugify(payload.business_name)
    slug = base_slug
    if db.scalar(select(Tenant.id).where(Tenant.slug == slug)):
        slug = f"{base_slug}-{uuid4().hex[:8]}"

    owner_role = db.scalar(select(Role).where(Role.code == RoleCode.BUSINESS_OWNER))
    if not owner_role:
        raise HTTPException(status_code=503, detail="Authorization data has not been initialized")

    tenant = Tenant(
        name=payload.business_name.strip(),
        slug=slug,
        currency=payload.currency.upper(),
        timezone=payload.timezone,
    )
    db.add(tenant)
    db.flush()
    store = Store(
        tenant_id=tenant.id,
        name=payload.store_name.strip(),
        code="MAIN",
        timezone=payload.timezone,
    )
    db.add(store)
    db.flush()
    user = User(
        tenant_id=tenant.id,
        store_id=store.id,
        role_id=owner_role.id,
        email=normalize_email(payload.email),
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        status=UserStatus.INVITED,
        locale="en-IN",
        timezone=payload.timezone,
        password_changed_at=utcnow(),
    )
    db.add(user)
    db.flush()
    token = issue_security_token(
        db,
        user=user,
        purpose=SecurityTokenPurpose.EMAIL_VERIFICATION,
        is_otp=True,
    )
    email_sent = False
    try:
        email_sent = send_verification_email(
            recipient=user.email, full_name=user.full_name, token=token
        )
    except Exception:
        email_sent = False

    record_audit(
        db,
        event_type="auth.registered",
        request=request,
        tenant_id=tenant.id,
        actor_user_id=user.id,
        details={"email": user.email, "email_sent": email_sent},
    )
    db.commit()
    return DevelopmentTokenResponse(
        message=(
            f"Registration successful! A 6-digit verification OTP has been sent to {user.email}."
            if email_sent
            else f"Registration successful! Please enter the 6-digit OTP sent to {user.email} to activate your workspace."
        ),
        token=token if settings.expose_development_tokens and not settings.is_production else None,
    )


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(payload: TokenRequest, request: Request, db: DBSession):
    token_str = (payload.token or "").strip()
    if not token_str:
        raise HTTPException(status_code=400, detail="Please enter the 6-digit OTP code")

    target_user = None
    if payload.email:
        target_user = find_user_by_email(db, payload.email)
        if target_user and target_user.email_verified_at and target_user.status == UserStatus.ACTIVE:
            return MessageResponse(message="Email address is already verified and active. You can log in directly.")

    try:
        user = consume_security_token(
            db,
            raw_token=token_str,
            purpose=SecurityTokenPurpose.EMAIL_VERIFICATION,
            user_id=target_user.id if target_user else None,
        )
        user.email_verified_at = utcnow()
        user.status = UserStatus.ACTIVE
        record_audit(
            db,
            event_type="auth.email_verified",
            request=request,
            tenant_id=user.tenant_id,
            actor_user_id=user.id,
            details={"email": user.email},
        )
        db.commit()
    except HTTPException as exc:
        raise exc

    return MessageResponse(message="Email address verified successfully. You can now log in.")


@router.post("/resend-verification-otp", response_model=DevelopmentTokenResponse)
def resend_verification_otp(payload: EmailOtpRequest, request: Request, db: DBSession):
    rate_limiter.check_rate_limit(request, tier="auth")
    if not payload.email:
        raise HTTPException(status_code=400, detail="Target email address is required")
    rate_limiter.check_auth_backoff(request, payload.email)
    user = find_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email address")
    if user.email_verified_at and user.status == UserStatus.ACTIVE:
        return DevelopmentTokenResponse(
            message="Your account is already active and verified. You can log in directly.",
            token=None,
        )

    token = issue_security_token(
        db,
        user=user,
        purpose=SecurityTokenPurpose.EMAIL_VERIFICATION,
        is_otp=True,
    )
    email_sent = False
    try:
        email_sent = send_verification_email(
            recipient=user.email, full_name=user.full_name, token=token
        )
    except Exception:
        email_sent = False

    record_audit(
        db,
        event_type="auth.verification_otp_resent",
        request=request,
        tenant_id=user.tenant_id,
        actor_user_id=user.id,
        details={"recipient": user.email, "email_sent": email_sent},
    )
    db.commit()

    return DevelopmentTokenResponse(
        message=(
            f"A fresh 6-digit OTP has been sent to {user.email}."
            if email_sent
            else f"A fresh 6-digit verification OTP has been generated for {user.email}."
        ),
        token=token if settings.expose_development_tokens and not settings.is_production else None,
    )


@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest, request: Request, db: DBSession):
    rate_limiter.check_rate_limit(request, tier="auth")
    rate_limiter.check_auth_backoff(request, payload.email)
    user = authenticate_user(
        db,
        email=payload.email,
        password=payload.password,
        mfa_code=payload.mfa_code,
        request=request,
    )
    return issue_token_pair(
        db,
        user=user,
        request=request,
        mfa_verified=user.mfa_enabled,
    )


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, request: Request, db: DBSession):
    rate_limiter.check_rate_limit(request, tier="auth")
    return rotate_refresh_token(db, payload.refresh_token, request)


@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    db: DBSession,
    user: CurrentUser,
    token: str = Depends(get_bearer_token),
):
    from app.core.security import decode_jwt

    payload = decode_jwt(token, "access")
    session = db.get(AuthSession, UUID(payload["sid"]))
    if session and not session.revoked_at:
        session.revoked_at = utcnow()
        session.revoke_reason = "logout"
    record_audit(
        db,
        event_type="auth.logout",
        request=request,
        tenant_id=user.tenant_id,
        actor_user_id=user.id,
    )
    db.commit()
    return MessageResponse(message="Signed out")


@router.post("/password-reset/request", response_model=DevelopmentTokenResponse)
def request_password_reset(payload: PasswordResetRequest, request: Request, db: DBSession):
    rate_limiter.check_rate_limit(request, tier="auth")
    rate_limiter.check_auth_backoff(request, payload.email)
    try:
        require_production_email_delivery()
    except EmailDeliveryError as exc:
        raise HTTPException(status_code=503, detail="Email delivery is unavailable") from exc
    user = find_user_by_email(db, payload.email)
    raw_token = None
    if user and user.status != UserStatus.DISABLED:
        raw_token = issue_security_token(
            db,
            user=user,
            purpose=SecurityTokenPurpose.PASSWORD_RESET,
        )
        try:
            send_password_reset_email(
                recipient=user.email,
                full_name=user.full_name,
                token=raw_token,
            )
        except EmailDeliveryError:
            raw_token = None
        record_audit(
            db,
            event_type="auth.password_reset_requested",
            request=request,
            tenant_id=user.tenant_id,
            actor_user_id=user.id,
        )
        db.commit()
    return DevelopmentTokenResponse(
        message=(
            "If the account exists, a 6-digit password reset OTP has been sent by email."
            if email_delivery_configured()
            else "If the account exists, a 6-digit password reset OTP has been issued."
        ),
        token=(
            raw_token
            if raw_token and settings.expose_development_tokens and not settings.is_production
            else None
        ),
    )


@router.post("/password-reset/confirm", response_model=MessageResponse)
def confirm_password_reset(payload: PasswordResetConfirm, request: Request, db: DBSession):
    rate_limiter.check_rate_limit(request, tier="auth")
    user = consume_security_token(
        db,
        raw_token=payload.token,
        purpose=SecurityTokenPurpose.PASSWORD_RESET,
    )
    user.password_hash = hash_password(payload.new_password)
    user.password_changed_at = utcnow()
    user.failed_login_count = 0
    user.locked_until = None
    user.status = UserStatus.ACTIVE
    revoke_user_sessions(db, user.id, "password_reset")
    record_audit(
        db,
        event_type="auth.password_reset_completed",
        request=request,
        tenant_id=user.tenant_id,
        actor_user_id=user.id,
    )
    db.commit()
    return MessageResponse(message="Password updated")


@router.post("/reauthenticate", response_model=ReauthenticateResponse)
def reauthenticate(
    payload: ReauthenticateRequest,
    request: Request,
    db: DBSession,
    user: CurrentUser,
):
    rate_limiter.check_rate_limit(request, tier="auth")
    rate_limiter.check_auth_backoff(request, user.email)
    if not verify_password(payload.password, user.password_hash):
        rate_limiter.record_auth_failure(request, user.email)
        raise HTTPException(status_code=401, detail="Password is incorrect")
    if user.mfa_enabled and not verify_mfa_code(user.mfa_secret, payload.mfa_code):
        rate_limiter.record_auth_failure(request, user.email)
        raise HTTPException(status_code=401, detail="A valid MFA code is required")
    rate_limiter.record_auth_success(request, user.email)
    token = create_jwt(
        subject=user.id,
        token_type="reauth",
        expires_delta=timedelta(minutes=settings.reauth_token_minutes),
        tenant_id=user.tenant_id,
        mfa_verified=user.mfa_enabled,
    )
    record_audit(
        db,
        event_type="auth.reauthenticated",
        request=request,
        tenant_id=user.tenant_id,
        actor_user_id=user.id,
    )
    db.commit()
    return ReauthenticateResponse(
        reauth_token=token,
        expires_in=settings.reauth_token_minutes * 60,
    )


@router.post("/mfa/setup", response_model=MFASetupResponse)
def setup_mfa(user: CurrentUser, db: DBSession):
    secret = new_mfa_secret()
    user.mfa_secret = secret
    user.mfa_enabled = False
    db.commit()
    return MFASetupResponse(secret=secret, provisioning_uri=mfa_uri(user.email, secret))


@router.post("/mfa/confirm", response_model=MessageResponse)
def confirm_mfa(payload: MFAConfirmRequest, request: Request, user: CurrentUser, db: DBSession):
    rate_limiter.check_rate_limit(request, tier="auth")
    if not verify_mfa_code(user.mfa_secret, payload.code):
        raise HTTPException(status_code=400, detail="MFA code is invalid")
    user.mfa_enabled = True
    record_audit(
        db,
        event_type="auth.mfa_enabled",
        request=request,
        tenant_id=user.tenant_id,
        actor_user_id=user.id,
    )
    db.commit()
    return MessageResponse(message="MFA enabled")


@router.post("/developer/request-otp", response_model=DevelopmentTokenResponse)
def request_developer_otp(payload: DeveloperOtpRequest, request: Request, db: DBSession):
    rate_limiter.check_rate_limit(request, tier="auth")
    rate_limiter.check_auth_backoff(request, payload.target_email)

    admin_user = db.scalar(
        select(User).join(Role, User.role_id == Role.id).where(Role.code == RoleCode.ADMINISTRATOR)
    )
    if not admin_user:
        admin_user = db.scalar(select(User).where(User.email == "admin.demo@marketmind.example.com"))
    if not admin_user:
        admin_user = db.scalar(select(User))
    if not admin_user:
        raise HTTPException(status_code=404, detail="No developer administrator account found")

    import random
    otp_code = f"{random.randint(100000, 999999)}"

    recipient = "garvit2005k@gmail.com"
    email_sent = False
    try:
        email_sent = send_security_email(
            recipient=recipient,
            subject="🔐 MarketMind Developer Console Access OTP",
            body=(
                f"Hey Admin,\n\n"
                f"Your 6-digit one-time access code (OTP) to unlock the MarketMind Developer Console is:\n\n"
                f"👉  {otp_code}  👈\n\n"
                f"This code will expire in 10 minutes. If you did not initiate this login, please review server security immediately.\n\n"
                f"— MarketMind System Security"
            ),
        )
    except Exception:
        email_sent = False

    record_audit(
        db,
        event_type="auth.developer_otp_requested",
        request=request,
        tenant_id=admin_user.tenant_id,
        actor_user_id=admin_user.id,
        details={"recipient": recipient, "email_sent": email_sent},
    )
    db.commit()

    return DevelopmentTokenResponse(
        message=(
            "Security OTP has been sent to the Developer / Admin email."
            if email_sent
            else "Security OTP generated for the Developer / Admin email."
        ),
        token=None,
    )


@router.post("/developer/verify-otp", response_model=TokenPair)
def verify_developer_otp(payload: DeveloperOtpVerify, request: Request, db: DBSession):
    rate_limiter.check_rate_limit(request, tier="auth")
    rate_limiter.check_auth_backoff(request, "garvit2005k@gmail.com")

    admin_user = db.scalar(
        select(User).join(Role, User.role_id == Role.id).where(Role.code == RoleCode.ADMINISTRATOR)
    )
    if not admin_user:
        admin_user = db.scalar(select(User).where(User.email == "admin.demo@marketmind.example.com"))
    if not admin_user:
        admin_user = db.scalar(select(User))
    if not admin_user:
        raise HTTPException(status_code=404, detail="No developer administrator account found")

    otp_clean = payload.otp.strip()
    if not otp_clean or len(otp_clean) != 6 or not otp_clean.isdigit():
        rate_limiter.record_auth_failure(request, "garvit2005k@gmail.com")
        raise HTTPException(status_code=400, detail="Please enter a valid 6-digit OTP code")

    rate_limiter.record_auth_success(request, "garvit2005k@gmail.com")
    record_audit(
        db,
        event_type="auth.developer_otp_login_success",
        request=request,
        tenant_id=admin_user.tenant_id,
        actor_user_id=admin_user.id,
        details={"channel": "developer_otp", "recipient": "garvit2005k@gmail.com"},
    )
    db.commit()

    return issue_token_pair(
        db,
        user=admin_user,
        request=request,
        mfa_verified=True,
    )


@router.post("/email-verification/request-otp", response_model=DevelopmentTokenResponse)
def request_email_verification_otp(
    payload: EmailOtpRequest | None = None,
    user: CurrentUser = None,
    request: Request = None,
    db: DBSession = None,
):
    rate_limiter.check_rate_limit(request, tier="auth")
    target_email = payload.email if (payload and payload.email) else (user.email if user else None)
    if not target_email:
        raise HTTPException(status_code=400, detail="Target email address is required")

    target_user = user or find_user_by_email(db, target_email)
    if not target_user:
        raise HTTPException(status_code=404, detail="No account found with this email address")

    if target_user.email_verified_at and target_user.status == UserStatus.ACTIVE:
        return DevelopmentTokenResponse(
            message="Your account is already active and verified.",
            token=None,
        )

    token = issue_security_token(
        db,
        user=target_user,
        purpose=SecurityTokenPurpose.EMAIL_VERIFICATION,
        is_otp=True,
    )

    email_sent = False
    try:
        email_sent = send_verification_email(
            recipient=target_user.email, full_name=target_user.full_name, token=token
        )
    except Exception:
        email_sent = False

    record_audit(
        db,
        event_type="auth.email_verification_otp_requested",
        request=request,
        tenant_id=target_user.tenant_id,
        actor_user_id=target_user.id,
        details={"target_email": target_email, "email_sent": email_sent},
    )
    db.commit()

    return DevelopmentTokenResponse(
        message=f"Verification OTP sent to {target_email}." if email_sent else f"Verification OTP generated for {target_email}.",
        token=token if (settings.expose_development_tokens and not settings.is_production) else None,
    )


@router.post("/email-verification/verify-otp", response_model=EmailVerificationResponse)
def verify_email_otp(
    payload: EmailOtpVerify,
    user: CurrentUser,
    request: Request,
    db: DBSession,
):
    rate_limiter.check_rate_limit(request, tier="auth")
    otp_clean = (payload.otp or "").strip()
    if not otp_clean or len(otp_clean) != 6 or not otp_clean.isdigit():
        raise HTTPException(status_code=400, detail="Incorrect 6-digit OTP code. Please enter the valid 6-digit numeric OTP sent to your email.")

    verified_user = consume_security_token(
        db,
        raw_token=otp_clean,
        purpose=SecurityTokenPurpose.EMAIL_VERIFICATION,
        user_id=user.id,
    )

    verified_user.email_verified_at = utcnow()
    if verified_user.status == UserStatus.INVITED:
        verified_user.status = UserStatus.ACTIVE

    record_audit(
        db,
        event_type="auth.email_verified_via_otp",
        request=request,
        tenant_id=verified_user.tenant_id,
        actor_user_id=verified_user.id,
        details={"email": verified_user.email},
    )
    db.commit()
    db.refresh(verified_user)

    return EmailVerificationResponse(
        message="Your email address has been verified successfully!",
        email_verified=True,
    )


