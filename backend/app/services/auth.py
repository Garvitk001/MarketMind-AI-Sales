from datetime import timedelta
from uuid import UUID

from fastapi import HTTPException, Request
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    as_utc,
    create_jwt,
    random_token,
    token_hash,
    utcnow,
    verify_mfa_code,
    verify_password,
)
from app.models.auth import AuthSession, SecurityToken, SecurityTokenPurpose
from app.models.identity import RoleCode, User, UserStatus
from app.schemas.auth import TokenPair
from app.services.audit import record_audit
from app.services.identity import normalize_email


def find_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == normalize_email(email)))


def issue_security_token(
    db: Session,
    *,
    user: User,
    purpose: SecurityTokenPurpose,
    is_otp: bool = False,
) -> str:
    import random
    if is_otp or purpose in (SecurityTokenPurpose.PASSWORD_RESET, SecurityTokenPurpose.EMAIL_VERIFICATION):
        raw_token = f"{random.randint(100000, 999999)}"
    else:
        raw_token = random_token()

    # Invalidate previous unconsumed tokens for this user & purpose
    db.execute(
        update(SecurityToken)
        .where(
            SecurityToken.user_id == user.id,
            SecurityToken.purpose == purpose.value,
            SecurityToken.consumed_at.is_(None),
        )
        .values(consumed_at=utcnow())
    )

    security_token = SecurityToken(
        user_id=user.id,
        purpose=purpose.value,
        token_hash=token_hash(raw_token),
        expires_at=utcnow() + timedelta(minutes=settings.security_token_minutes),
    )
    db.add(security_token)
    return raw_token


def consume_security_token(
    db: Session,
    *,
    raw_token: str,
    purpose: SecurityTokenPurpose,
    user_id: UUID | None = None,
) -> User:
    query = (
        select(SecurityToken)
        .where(
            SecurityToken.token_hash == token_hash(raw_token),
            SecurityToken.purpose == purpose.value,
            SecurityToken.consumed_at.is_(None),
        )
    )
    if user_id is not None:
        query = query.where(SecurityToken.user_id == user_id)
    query = query.order_by(SecurityToken.created_at.desc())

    item = db.scalars(query).first()
    if not item:
        raise HTTPException(
            status_code=400,
            detail=(
                "Incorrect 6-digit OTP code. Please enter the valid code sent to your email or request a new OTP."
                if purpose == SecurityTokenPurpose.EMAIL_VERIFICATION
                else "Invalid or incorrect security token."
            ),
        )
    if as_utc(item.expires_at) <= utcnow():
        raise HTTPException(
            status_code=400,
            detail=(
                "6-digit OTP code has expired. Please click Resend OTP to get a fresh code."
                if purpose == SecurityTokenPurpose.EMAIL_VERIFICATION
                else "Security token has expired. Please request a new one."
            ),
        )
    item.consumed_at = utcnow()
    return item.user


def revoke_user_sessions(db: Session, user_id: UUID, reason: str) -> None:
    db.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=utcnow(), revoke_reason=reason)
    )


def issue_token_pair(
    db: Session,
    *,
    user: User,
    request: Request,
    mfa_verified: bool,
) -> TokenPair:
    raw_refresh = random_token()
    now = utcnow()
    session = AuthSession(
        user_id=user.id,
        refresh_token_hash=token_hash(raw_refresh),
        expires_at=now + timedelta(days=settings.refresh_token_days),
        last_seen_at=now,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(session)
    db.flush()
    access_token = create_jwt(
        subject=user.id,
        token_type="access",
        expires_delta=timedelta(minutes=settings.access_token_minutes),
        session_id=session.id,
        tenant_id=user.tenant_id,
        mfa_verified=mfa_verified,
    )
    db.commit()
    return TokenPair(
        access_token=access_token,
        refresh_token=f"{session.id}.{raw_refresh}",
        expires_in=settings.access_token_minutes * 60,
        mfa_setup_required=user.role.code == RoleCode.ADMINISTRATOR and not user.mfa_enabled,
    )


def authenticate_user(
    db: Session,
    *,
    email: str,
    password: str,
    mfa_code: str | None,
    request: Request,
) -> User:
    from app.core.rate_limiter import rate_limiter

    rate_limiter.check_auth_backoff(request, email)
    user = find_user_by_email(db, email)
    now = utcnow()
    generic_error = HTTPException(status_code=401, detail="Incorrect email or password")

    if not user:
        rate_limiter.record_auth_failure(request, email)
        record_audit(
            db,
            event_type="auth.login_failed",
            request=request,
            details={"reason": "unknown_account"},
        )
        db.commit()
        raise generic_error
    if user.status == UserStatus.DISABLED:
        raise HTTPException(status_code=403, detail="Account is disabled")
    if user.locked_until and as_utc(user.locked_until) > now:
        raise HTTPException(status_code=423, detail="Account is temporarily locked")
    if not user.email_verified_at:
        raise HTTPException(status_code=403, detail="Email address is not verified")

    if not verify_password(password, user.password_hash):
        rate_limiter.record_auth_failure(request, email)
        user.failed_login_count += 1
        if user.failed_login_count >= settings.max_login_failures:
            user.status = UserStatus.LOCKED
            user.locked_until = now + timedelta(minutes=settings.account_lock_minutes)
            record_audit(
                db,
                event_type="auth.account_locked",
                request=request,
                tenant_id=user.tenant_id,
                actor_user_id=user.id,
            )
        else:
            record_audit(
                db,
                event_type="auth.login_failed",
                request=request,
                tenant_id=user.tenant_id,
                actor_user_id=user.id,
                details={"attempt": user.failed_login_count},
            )
        db.commit()
        raise generic_error

    if user.mfa_enabled and not verify_mfa_code(user.mfa_secret, mfa_code):
        rate_limiter.record_auth_failure(request, email)
        record_audit(
            db,
            event_type="auth.mfa_failed",
            request=request,
            tenant_id=user.tenant_id,
            actor_user_id=user.id,
        )
        db.commit()
        raise HTTPException(status_code=401, detail="A valid MFA code is required")

    rate_limiter.record_auth_success(request, email)
    user.failed_login_count = 0
    user.locked_until = None
    user.status = UserStatus.ACTIVE
    user.last_login_at = now
    record_audit(
        db,
        event_type="auth.login_succeeded",
        request=request,
        tenant_id=user.tenant_id,
        actor_user_id=user.id,
        details={"mfa": user.mfa_enabled},
    )
    db.commit()
    return user


def rotate_refresh_token(db: Session, raw_value: str, request: Request) -> TokenPair:
    try:
        session_id_text, raw_token = raw_value.split(".", 1)
        session_id = UUID(session_id_text)
    except (ValueError, AttributeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid refresh token") from exc

    session = db.get(AuthSession, session_id)
    now = utcnow()
    if (
        not session
        or session.revoked_at
        or as_utc(session.expires_at) <= now
        or session.refresh_token_hash != token_hash(raw_token)
    ):
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    if as_utc(session.last_seen_at) + timedelta(minutes=settings.session_idle_minutes) <= now:
        session.revoked_at = now
        session.revoke_reason = "idle_timeout"
        db.commit()
        raise HTTPException(status_code=401, detail="Session expired due to inactivity")

    user = session.user
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="Account is not active")

    session.revoked_at = now
    session.revoke_reason = "rotated"
    return issue_token_pair(
        db,
        user=user,
        request=request,
        mfa_verified=user.mfa_enabled,
    )
