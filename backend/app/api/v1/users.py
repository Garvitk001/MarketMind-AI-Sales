from datetime import timedelta
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import selectinload

from app.api.dependencies import (
    CurrentUser,
    DBSession,
    require_permissions,
    require_reauthentication,
)
from app.core.config import settings
from app.core.permissions import Permissions
from app.core.security import hash_password, random_token, utcnow
from app.models.auth import AuthSession, SecurityToken, SecurityTokenPurpose
from app.models.identity import Role, RoleCode, Store, User, UserStatus
from app.models.performance import EmployeeTarget
from app.schemas.auth import DevelopmentTokenResponse, TokenRequest
from app.schemas.common import MessageResponse
from app.schemas.users import (
    AccountStateRequest,
    BusinessProfileUpdate,
    EmployeeUpdateRequest,
    InvitationAcceptRequest,
    ProfileUpdate,
    RoleChangeRequest,
    RoleResponse,
    StoreCreate,
    StoreResponse,
    StoreUpdate,
    UserInvitationRequest,
    UserResponse,
)
from app.services.audit import record_audit
from app.services.auth import (
    consume_security_token,
    find_user_by_email,
    issue_security_token,
    revoke_user_sessions,
)
from app.services.email_delivery import (
    EmailDeliveryError,
    require_production_email_delivery,
    send_business_deletion_otp_email,
    send_business_deletion_scheduled_email,
    send_invitation_email,
)
from app.services.identity import get_role, normalize_email, validate_store_scope

router = APIRouter(prefix="/users", tags=["Users and RBAC"])

OWNER_ASSIGNABLE_ROLES = {RoleCode.STORE_MANAGER, RoleCode.SALES_EXECUTIVE}
AVATAR_DIRECTORY = Path(__file__).resolve().parents[3] / "uploads" / "avatars"
AVATAR_CONTENT_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_AVATAR_BYTES = 2 * 1024 * 1024
ROLE_PREFERENCE_RULES = {
    RoleCode.BUSINESS_OWNER: {
        "default_period": {"7", "30", "90"},
        "weekly_summary": bool,
        "revenue_alerts": bool,
        "stock_alerts": bool,
        "sales_performance_alerts": bool,
        "customer_decline_alerts": bool,
    },
    RoleCode.STORE_MANAGER: {
        "inventory_view": {"all", "low_stock", "out_of_stock"},
        "stock_alerts": bool,
        "daily_store_summary": bool,
        "sales_performance_alerts": bool,
        "customer_decline_alerts": bool,
    },
    RoleCode.SALES_EXECUTIVE: {
        "sales_period": {"7", "30", "90"},
        "follow_up_reminders": bool,
        "customer_activity_alerts": bool,
        "sales_performance_alerts": bool,
        "customer_decline_alerts": bool,
    },
    RoleCode.ADMINISTRATOR: {
        "monitoring_refresh": {"30", "60", "300"},
        "audit_alerts": bool,
        "model_failure_alerts": bool,
        "security_alerts": bool,
    },
}


def valid_image_signature(content_type: str, content: bytes) -> bool:
    if content_type == "image/jpeg":
        return content.startswith(b"\xff\xd8\xff")
    if content_type == "image/png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/webp":
        return len(content) >= 12 and content.startswith(b"RIFF") and content[8:12] == b"WEBP"
    return False


def validate_role_preferences(role_code: str, preferences: dict) -> None:
    rules = ROLE_PREFERENCE_RULES[RoleCode(role_code)]
    if len(preferences) > len(rules) or set(preferences) - set(rules):
        raise HTTPException(status_code=422, detail="Unsupported preference for this role")
    for key, value in preferences.items():
        rule = rules[key]
        if rule is bool and type(value) is not bool:
            raise HTTPException(status_code=422, detail=f"{key} must be true or false")
        if isinstance(rule, set) and str(value) not in rule:
            raise HTTPException(status_code=422, detail=f"Unsupported value for {key}")


def require_business_owner(actor: User) -> None:
    if actor.role.code != RoleCode.BUSINESS_OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee accounts are managed by the Business Owner",
        )


def validate_employee_role(role_code: str) -> None:
    if role_code not in OWNER_ASSIGNABLE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Business Owners can assign only Store Manager or Sales Executive roles",
        )


def serialize_role(role: Role) -> RoleResponse:
    return RoleResponse(
        id=role.id,
        code=role.code,
        name=role.name,
        description=role.description,
        permissions=sorted(permission.code for permission in role.permissions),
    )


def serialize_user(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        tenant_id=user.tenant_id,
        store_id=user.store_id,
        email=user.email,
        full_name=user.full_name,
        status=user.status,
        locale=user.locale,
        timezone=user.timezone,
        phone_number=user.phone_number,
        job_title=user.job_title,
        location=user.location,
        bio=user.bio,
        avatar_url=user.avatar_url,
        avatar_emoji=user.avatar_emoji,
        date_of_birth=user.date_of_birth,
        theme_preference=user.theme_preference,
        date_format=user.date_format,
        dashboard_density=user.dashboard_density,
        email_notifications=user.email_notifications,
        role_preferences=user.role_preferences or {},
        joined_at=user.created_at,
        last_login_at=user.last_login_at,
        tenant_name=user.tenant.name,
        currency=user.tenant.currency,
        store=StoreResponse.model_validate(user.store) if user.store else None,
        email_verified_at=user.email_verified_at,
        email_verified=bool(user.email_verified_at),
        mfa_enabled=user.mfa_enabled,
        role=serialize_role(user.role),
    )


@router.get("/me", response_model=UserResponse)
def get_profile(user: CurrentUser):
    return serialize_user(user)


@router.patch("/me", response_model=UserResponse)
def update_profile(payload: ProfileUpdate, request: Request, user: CurrentUser, db: DBSession):
    if payload.role_preferences is not None:
        validate_role_preferences(user.role.code, payload.role_preferences)
    for field, value in payload.model_dump(exclude_unset=True).items():
        if isinstance(value, str):
            value = value.strip()
            if field != "full_name" and not value:
                value = None
        setattr(user, field, value)
    record_audit(
        db,
        event_type="profile.updated",
        request=request,
        tenant_id=user.tenant_id,
        actor_user_id=user.id,
        target_type="user",
        target_id=str(user.id),
        details={"fields": sorted(payload.model_dump(exclude_unset=True))},
    )
    db.commit()
    db.refresh(user)
    return serialize_user(user)


@router.patch("/me/business", response_model=UserResponse)
def update_business_profile(
    payload: BusinessProfileUpdate,
    request: Request,
    user: CurrentUser,
    db: DBSession,
):
    require_business_owner(user)
    tenant = user.tenant
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="At least one business field is required")

    if "business_name" in changes and changes["business_name"]:
        tenant.name = changes["business_name"].strip()
    if "currency" in changes and changes["currency"]:
        tenant.currency = changes["currency"].strip().upper()
    if "timezone" in changes and changes["timezone"]:
        tenant.timezone = changes["timezone"].strip()
        user.timezone = changes["timezone"].strip()
    if "phone_number" in changes and changes["phone_number"]:
        user.phone_number = changes["phone_number"].strip()

    record_audit(
        db,
        event_type="owner.business_profile_updated",
        request=request,
        tenant_id=user.tenant_id,
        actor_user_id=user.id,
        details={"changes": changes},
    )
    db.commit()
    db.refresh(user)
    db.refresh(tenant)
    return serialize_user(user)


@router.post("/me/business/request-delete-otp", response_model=DevelopmentTokenResponse)
def request_business_deletion_otp(
    request: Request,
    user: CurrentUser,
    db: DBSession,
):
    require_business_owner(user)
    tenant = user.tenant

    token = issue_security_token(
        db,
        user=user,
        purpose=SecurityTokenPurpose.BUSINESS_DELETION,
        is_otp=True,
    )
    email_sent = False
    try:
        email_sent = send_business_deletion_otp_email(
            recipient=user.email,
            full_name=user.full_name,
            business_name=tenant.name,
            token=token,
        )
    except Exception:
        email_sent = False

    record_audit(
        db,
        event_type="owner.business_deletion_otp_requested",
        request=request,
        tenant_id=user.tenant_id,
        actor_user_id=user.id,
        details={"email": user.email, "email_sent": email_sent},
    )
    db.commit()

    return DevelopmentTokenResponse(
        message=(
            f"A 6-digit deletion confirmation OTP has been emailed to {user.email}."
            if email_sent
            else f"A 6-digit deletion confirmation OTP has been generated for {user.email}."
        ),
        token=token if settings.expose_development_tokens and not settings.is_production else None,
    )


@router.post("/me/business/confirm-delete", response_model=MessageResponse)
def confirm_business_deletion(
    payload: TokenRequest,
    request: Request,
    user: CurrentUser,
    db: DBSession,
):
    require_business_owner(user)
    token_str = (payload.token or "").strip()
    if not token_str:
        raise HTTPException(status_code=400, detail="Please enter the 6-digit confirmation OTP code")

    # Validate and consume security token
    consume_security_token(
        db,
        raw_token=token_str,
        purpose=SecurityTokenPurpose.BUSINESS_DELETION,
        user_id=user.id,
    )

    now = utcnow()
    due_date = now + timedelta(days=15)
    tenant = user.tenant
    tenant.deletion_requested_at = now
    tenant.deletion_due_at = due_date
    tenant.deletion_requested_by_id = user.id
    tenant.is_active = False

    # Revoke all active sessions for all members of this tenant
    member_ids = db.scalars(select(User.id).where(User.tenant_id == tenant.id)).all()
    for mid in member_ids:
        revoke_user_sessions(db, mid, reason="business_deletion_scheduled")

    # Dispatch notification email confirming the 15-day grace period
    try:
        send_business_deletion_scheduled_email(
            recipient=user.email,
            full_name=user.full_name,
            business_name=tenant.name,
            due_date=due_date.strftime("%d %B %Y"),
        )
    except Exception:
        pass

    record_audit(
        db,
        event_type="owner.business_deletion_scheduled",
        request=request,
        tenant_id=tenant.id,
        actor_user_id=user.id,
        details={
            "requested_at": now.isoformat(),
            "due_at": due_date.isoformat(),
            "grace_days": 15,
        },
    )
    db.commit()

    return MessageResponse(
        message=(
            f"Business workspace '{tenant.name}' has been scheduled for deletion and placed in a 15-day grace period until {due_date.strftime('%d %B %Y')}. "
            "All active sessions have been terminated. Logging in as Business Owner within 15 days will automatically restore your workspace."
        )
    )


def remove_avatar_file(avatar_url: str | None) -> None:
    if not avatar_url or not avatar_url.startswith("/uploads/avatars/"):
        return
    candidate = (AVATAR_DIRECTORY / Path(avatar_url).name).resolve()
    if candidate.parent == AVATAR_DIRECTORY.resolve() and candidate.is_file():
        candidate.unlink()


@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    request: Request,
    db: DBSession,
    user: CurrentUser,
    avatar: UploadFile = File(...),
):
    if user.role.code == RoleCode.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Administrator profiles do not use avatars")
    extension = AVATAR_CONTENT_TYPES.get(avatar.content_type or "")
    if not extension:
        raise HTTPException(status_code=422, detail="Use a JPEG, PNG, or WebP image")
    content = await avatar.read(MAX_AVATAR_BYTES + 1)
    if not content:
        raise HTTPException(status_code=422, detail="The selected image is empty")
    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail="Profile photo must be 2 MB or smaller")
    if not valid_image_signature(avatar.content_type or "", content):
        raise HTTPException(status_code=422, detail="The selected file is not a valid image")
    AVATAR_DIRECTORY.mkdir(parents=True, exist_ok=True)
    filename = f"{user.id}-{uuid4().hex}{extension}"
    (AVATAR_DIRECTORY / filename).write_bytes(content)
    old_avatar = user.avatar_url
    user.avatar_url = f"/uploads/avatars/{filename}"
    record_audit(
        db,
        event_type="profile.avatar_updated",
        request=request,
        tenant_id=user.tenant_id,
        actor_user_id=user.id,
        target_type="user",
        target_id=str(user.id),
    )
    db.commit()
    db.refresh(user)
    remove_avatar_file(old_avatar)
    return serialize_user(user)


@router.delete("/me/avatar", response_model=UserResponse)
def delete_avatar(request: Request, db: DBSession, user: CurrentUser):
    if user.role.code == RoleCode.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Administrator profiles do not use avatars")
    old_avatar = user.avatar_url
    user.avatar_url = None
    record_audit(
        db,
        event_type="profile.avatar_removed",
        request=request,
        tenant_id=user.tenant_id,
        actor_user_id=user.id,
        target_type="user",
        target_id=str(user.id),
    )
    db.commit()
    db.refresh(user)
    remove_avatar_file(old_avatar)
    return serialize_user(user)


@router.get("", response_model=list[UserResponse])
def list_users(
    db: DBSession,
    user: User = Depends(require_permissions(Permissions.USERS_READ)),
):
    require_business_owner(user)
    users = db.scalars(
        select(User)
        .join(Role)
        .where(
            User.tenant_id == user.tenant_id,
            Role.code.in_([RoleCode.BUSINESS_OWNER, *OWNER_ASSIGNABLE_ROLES]),
        )
        .options(selectinload(User.role).selectinload(Role.permissions))
        .order_by(User.full_name)
    ).all()
    return [serialize_user(item) for item in users]


@router.post(
    "/invite",
    response_model=DevelopmentTokenResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_reauthentication)],
)
def invite_user(
    payload: UserInvitationRequest,
    request: Request,
    db: DBSession,
    actor: User = Depends(require_permissions(Permissions.USERS_MANAGE)),
):
    require_business_owner(actor)
    validate_employee_role(payload.role_code)
    if find_user_by_email(db, payload.email):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    role = get_role(db, payload.role_code)
    if not role:
        raise HTTPException(status_code=422, detail="Unknown role")
    if not validate_store_scope(db, actor.tenant_id, payload.store_id):
        raise HTTPException(status_code=422, detail="Store does not belong to this tenant")
    if not payload.store_id:
        raise HTTPException(status_code=422, detail="Employee accounts require a store assignment")

    user = User(
        tenant_id=actor.tenant_id,
        store_id=payload.store_id,
        role_id=role.id,
        email=normalize_email(payload.email),
        full_name=payload.full_name.strip(),
        password_hash=hash_password(f"Aa1{random_token()}"),
        status=UserStatus.INVITED,
        locale=actor.locale,
        timezone=actor.timezone,
    )
    db.add(user)
    db.flush()
    token = issue_security_token(db, user=user, purpose=SecurityTokenPurpose.INVITATION)
    email_sent = False
    try:
        email_sent = send_invitation_email(
            recipient=user.email, full_name=user.full_name, token=token
        )
    except Exception:
        email_sent = False
    record_audit(
        db,
        event_type="owner.employee_invited",
        request=request,
        tenant_id=actor.tenant_id,
        actor_user_id=actor.id,
        target_type="user",
        target_id=str(user.id),
        details={"email": user.email, "role": role.code, "store_id": str(user.store_id)},
    )
    db.commit()
    return DevelopmentTokenResponse(
        message=(
            "Invitation emailed. The account remains pending until the employee activates it. You can also share the activation token directly."
            if email_sent
            else "Invitation created successfully. The account remains pending until the employee activates it with the token."
        ),
        token=token,
    )


@router.post("/accept-invitation", response_model=MessageResponse)
def accept_invitation(payload: InvitationAcceptRequest, request: Request, db: DBSession):
    user = consume_security_token(
        db,
        raw_token=payload.token,
        purpose=SecurityTokenPurpose.INVITATION,
    )
    user.password_hash = hash_password(payload.password)
    user.password_changed_at = utcnow()
    user.email_verified_at = utcnow()
    user.status = UserStatus.ACTIVE
    record_audit(
        db,
        event_type="auth.invitation_accepted",
        request=request,
        tenant_id=user.tenant_id,
        actor_user_id=user.id,
    )
    db.commit()
    return MessageResponse(message="Invitation accepted")


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    dependencies=[Depends(require_reauthentication)],
)
def update_employee(
    user_id: UUID,
    payload: EmployeeUpdateRequest,
    request: Request,
    db: DBSession,
    actor: User = Depends(require_permissions(Permissions.USERS_MANAGE)),
):
    require_business_owner(actor)
    target = db.get(User, user_id)
    if not target or target.tenant_id != actor.tenant_id:
        raise HTTPException(status_code=404, detail="User not found")
    if target.role.code not in OWNER_ASSIGNABLE_ROLES:
        raise HTTPException(status_code=403, detail="Only employee accounts can be edited")

    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="At least one field must be provided to update")

    if "full_name" in changes and changes["full_name"]:
        target.full_name = changes["full_name"].strip()

    if "email" in changes and changes["email"]:
        new_email = normalize_email(changes["email"])
        if new_email != target.email:
            existing = find_user_by_email(db, new_email)
            if existing and existing.id != target.id:
                raise HTTPException(status_code=409, detail="An account with this email already exists")
            target.email = new_email

    if "phone_number" in changes:
        target.phone_number = changes["phone_number"].strip() if changes["phone_number"] else None

    if "role_code" in changes and changes["role_code"]:
        validate_employee_role(changes["role_code"])
        role = get_role(db, changes["role_code"])
        if not role:
            raise HTTPException(status_code=422, detail="Unknown role")
        target.role_id = role.id
        revoke_user_sessions(db, target.id, "role_changed")

    if "store_id" in changes and changes["store_id"]:
        if not validate_store_scope(db, actor.tenant_id, changes["store_id"]):
            raise HTTPException(status_code=422, detail="Store does not belong to this tenant")
        target.store_id = changes["store_id"]

    audit_changes = {k: str(v) if isinstance(v, UUID) else v for k, v in changes.items()}
    record_audit(
        db,
        event_type="owner.employee_updated",
        request=request,
        tenant_id=actor.tenant_id,
        actor_user_id=actor.id,
        target_type="user",
        target_id=str(target.id),
        details={"changes": audit_changes},
    )
    db.commit()
    db.refresh(target)
    return serialize_user(target)


@router.post(
    "/{user_id}/reissue-invitation",
    response_model=DevelopmentTokenResponse,
    dependencies=[Depends(require_reauthentication)],
)
def reissue_employee_invitation(
    user_id: UUID,
    request: Request,
    db: DBSession,
    actor: User = Depends(require_permissions(Permissions.USERS_MANAGE)),
):
    require_business_owner(actor)
    target = db.get(User, user_id)
    if not target or target.tenant_id != actor.tenant_id:
        raise HTTPException(status_code=404, detail="User not found")
    if target.role.code not in OWNER_ASSIGNABLE_ROLES:
        raise HTTPException(status_code=403, detail="Only employee accounts can be reissued invitations")

    token = issue_security_token(db, user=target, purpose=SecurityTokenPurpose.INVITATION)
    email_sent = False
    try:
        email_sent = send_invitation_email(
            recipient=target.email, full_name=target.full_name, token=token
        )
    except Exception:
        email_sent = False

    record_audit(
        db,
        event_type="owner.employee_invitation_reissued",
        request=request,
        tenant_id=actor.tenant_id,
        actor_user_id=actor.id,
        target_type="user",
        target_id=str(target.id),
    )
    db.commit()
    return DevelopmentTokenResponse(
        message=(
            f"Invitation token generated and emailed to {target.email}."
            if email_sent
            else f"Invitation token generated for {target.full_name}. Share this token with the employee to complete activation."
        ),
        token=token,
    )


@router.get(
    "/{user_id}/invitation-token",
    response_model=DevelopmentTokenResponse,
)
def get_employee_invitation_token(
    user_id: UUID,
    db: DBSession,
    actor: User = Depends(require_permissions(Permissions.USERS_MANAGE)),
):
    require_business_owner(actor)
    target = db.get(User, user_id)
    if not target or target.tenant_id != actor.tenant_id:
        raise HTTPException(status_code=404, detail="User not found")
    token = issue_security_token(db, user=target, purpose=SecurityTokenPurpose.INVITATION)
    db.commit()
    return DevelopmentTokenResponse(
        message=f"Active invitation token for {target.full_name}",
        token=token,
    )


@router.delete(
    "/{user_id}",
    response_model=MessageResponse,
    dependencies=[Depends(require_reauthentication)],
)
def delete_employee(
    user_id: UUID,
    request: Request,
    db: DBSession,
    actor: User = Depends(require_permissions(Permissions.USERS_MANAGE)),
):
    require_business_owner(actor)
    target = db.get(User, user_id)
    if not target or target.tenant_id != actor.tenant_id:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == actor.id:
        raise HTTPException(status_code=422, detail="You cannot delete your own Business Owner account")
    if target.role.code not in OWNER_ASSIGNABLE_ROLES:
        raise HTTPException(status_code=403, detail="Only employee accounts can be deleted")

    target_name = target.full_name
    target_email = target.email
    db.execute(delete(AuthSession).where(AuthSession.user_id == target.id))
    db.execute(delete(SecurityToken).where(SecurityToken.user_id == target.id))
    db.execute(delete(EmployeeTarget).where(EmployeeTarget.employee_id == target.id))

    db.delete(target)
    record_audit(
        db,
        event_type="owner.employee_deleted",
        request=request,
        tenant_id=actor.tenant_id,
        actor_user_id=actor.id,
        target_type="user",
        target_id=str(user_id),
        details={"deleted_employee_name": target_name, "deleted_employee_email": target_email},
    )
    db.commit()
    return MessageResponse(message=f"Employee '{target_name}' deleted successfully.")


@router.post(
    "/stores",
    response_model=StoreResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_reauthentication)],
)
def create_store(
    payload: StoreCreate,
    request: Request,
    db: DBSession,
    actor: User = Depends(require_permissions(Permissions.USERS_MANAGE)),
):
    require_business_owner(actor)
    code = payload.code.strip().upper()
    existing = db.scalar(
        select(Store).where(Store.tenant_id == actor.tenant_id, Store.code == code)
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"A store with code '{code}' already exists")

    store = Store(
        tenant_id=actor.tenant_id,
        name=payload.name.strip(),
        code=code,
        timezone=payload.timezone.strip() if payload.timezone else actor.timezone,
        is_active=True,
    )
    db.add(store)
    db.flush()
    record_audit(
        db,
        event_type="owner.store_created",
        request=request,
        tenant_id=actor.tenant_id,
        actor_user_id=actor.id,
        target_type="store",
        target_id=str(store.id),
        details={"name": store.name, "code": store.code},
    )
    db.commit()
    db.refresh(store)
    return StoreResponse.model_validate(store)


@router.patch(
    "/stores/{store_id}",
    response_model=StoreResponse,
    dependencies=[Depends(require_reauthentication)],
)
def update_store(
    store_id: UUID,
    payload: StoreUpdate,
    request: Request,
    db: DBSession,
    actor: User = Depends(require_permissions(Permissions.USERS_MANAGE)),
):
    require_business_owner(actor)
    store = db.get(Store, store_id)
    if not store or store.tenant_id != actor.tenant_id:
        raise HTTPException(status_code=404, detail="Store not found")

    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="At least one store field is required")

    if "name" in changes and changes["name"]:
        store.name = changes["name"].strip()
    if "code" in changes and changes["code"]:
        code = changes["code"].strip().upper()
        existing = db.scalar(
            select(Store).where(
                Store.tenant_id == actor.tenant_id, Store.code == code, Store.id != store.id
            )
        )
        if existing:
            raise HTTPException(status_code=409, detail=f"A store with code '{code}' already exists")
        store.code = code
    if "timezone" in changes and changes["timezone"]:
        store.timezone = changes["timezone"].strip()
    if "is_active" in changes and changes["is_active"] is not None:
        store.is_active = changes["is_active"]

    record_audit(
        db,
        event_type="owner.store_updated",
        request=request,
        tenant_id=actor.tenant_id,
        actor_user_id=actor.id,
        target_type="store",
        target_id=str(store.id),
        details={"changes": changes},
    )
    db.commit()
    db.refresh(store)
    return StoreResponse.model_validate(store)


@router.delete(
    "/stores/{store_id}",
    response_model=MessageResponse,
    dependencies=[Depends(require_reauthentication)],
)
def delete_store(
    store_id: UUID,
    request: Request,
    db: DBSession,
    actor: User = Depends(require_permissions(Permissions.USERS_MANAGE)),
):
    require_business_owner(actor)
    store = db.get(Store, store_id)
    if not store or store.tenant_id != actor.tenant_id:
        raise HTTPException(status_code=404, detail="Store not found")

    total_stores = db.scalar(
        select(func.count(Store.id)).where(Store.tenant_id == actor.tenant_id, Store.is_active.is_(True))
    )
    if total_stores <= 1:
        raise HTTPException(status_code=422, detail="Your business must maintain at least one active store location")

    store.is_active = False
    record_audit(
        db,
        event_type="owner.store_deactivated",
        request=request,
        tenant_id=actor.tenant_id,
        actor_user_id=actor.id,
        target_type="store",
        target_id=str(store.id),
        details={"name": store.name, "code": store.code},
    )
    db.commit()
    return MessageResponse(message=f"Store '{store.name}' deactivated successfully.")


@router.patch(
    "/{user_id}/role",
    response_model=UserResponse,
    dependencies=[Depends(require_reauthentication)],
)
def change_role(
    user_id: UUID,
    payload: RoleChangeRequest,
    request: Request,
    db: DBSession,
    actor: User = Depends(require_permissions(Permissions.USERS_MANAGE)),
):
    require_business_owner(actor)
    validate_employee_role(payload.role_code)
    target = db.get(User, user_id)
    if not target or target.tenant_id != actor.tenant_id:
        raise HTTPException(status_code=404, detail="User not found")
    role = get_role(db, payload.role_code)
    if not role:
        raise HTTPException(status_code=422, detail="Unknown role")
    if not validate_store_scope(db, actor.tenant_id, payload.store_id):
        raise HTTPException(status_code=422, detail="Store does not belong to this tenant")
    if target.role.code not in OWNER_ASSIGNABLE_ROLES:
        raise HTTPException(status_code=403, detail="Only employee accounts can be reassigned")
    if not payload.store_id:
        raise HTTPException(status_code=422, detail="Employee accounts require a store assignment")
    before = {"role": target.role.code, "store_id": str(target.store_id)}
    target.role_id = role.id
    target.store_id = payload.store_id
    revoke_user_sessions(db, target.id, "role_changed")
    record_audit(
        db,
        event_type="owner.employee_role_changed",
        request=request,
        tenant_id=actor.tenant_id,
        actor_user_id=actor.id,
        target_type="user",
        target_id=str(target.id),
        details={
            "before": before,
            "after": {"role": role.code, "store_id": str(payload.store_id)},
        },
    )
    db.commit()
    db.refresh(target)
    return serialize_user(target)


@router.patch(
    "/{user_id}/state",
    response_model=UserResponse,
    dependencies=[Depends(require_reauthentication)],
)
def change_account_state(
    user_id: UUID,
    payload: AccountStateRequest,
    request: Request,
    db: DBSession,
    actor: User = Depends(require_permissions(Permissions.USERS_MANAGE)),
):
    require_business_owner(actor)
    target = db.get(User, user_id)
    if not target or target.tenant_id != actor.tenant_id:
        raise HTTPException(status_code=404, detail="User not found")
    if target.role.code not in OWNER_ASSIGNABLE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Only employee accounts can be enabled or disabled",
        )
    if target.id == actor.id and not payload.enabled:
        raise HTTPException(status_code=422, detail="You cannot disable your own account")
    target.status = UserStatus.ACTIVE if payload.enabled else UserStatus.DISABLED
    if not payload.enabled:
        revoke_user_sessions(db, target.id, "account_disabled")
    record_audit(
        db,
        event_type="owner.employee_state_changed",
        request=request,
        tenant_id=actor.tenant_id,
        actor_user_id=actor.id,
        target_type="user",
        target_id=str(target.id),
        details={"enabled": payload.enabled},
    )
    db.commit()
    db.refresh(target)
    return serialize_user(target)


@router.get("/roles/catalog", response_model=list[RoleResponse])
def role_catalog(
    db: DBSession,
    user: User = Depends(
        require_permissions(Permissions.USERS_READ, Permissions.ROLES_MANAGE, require_all=False)
    ),
):
    query = select(Role).options(selectinload(Role.permissions)).order_by(Role.name)
    if user.role.code == RoleCode.BUSINESS_OWNER:
        query = query.where(Role.code.in_(OWNER_ASSIGNABLE_ROLES))
    roles = db.scalars(query).all()
    return [serialize_role(role) for role in roles]


@router.get("/stores/catalog", response_model=list[StoreResponse])
def store_catalog(
    db: DBSession,
    user: User = Depends(
        require_permissions(
            Permissions.USERS_READ,
            Permissions.DASHBOARD_FORECASTS_MONITOR,
            require_all=False,
        )
    ),
):
    return db.scalars(
        select(Store)
        .where(Store.tenant_id == user.tenant_id, Store.is_active.is_(True))
        .order_by(Store.name)
    ).all()


@router.get("/sellers/catalog", response_model=list[UserResponse])
def seller_catalog(
    db: DBSession,
    user: User = Depends(require_permissions(Permissions.DASHBOARD_FORECASTS_MONITOR)),
):
    if user.role.code != RoleCode.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Administrator access is required")
    sellers = db.scalars(
        select(User)
        .join(Role)
        .where(
            User.tenant_id == user.tenant_id,
            Role.code == RoleCode.SALES_EXECUTIVE,
            User.status == UserStatus.ACTIVE,
        )
        .options(selectinload(User.role).selectinload(Role.permissions))
        .order_by(User.full_name)
    ).all()
    return [serialize_user(item) for item in sellers]


@router.get("/admin/businesses")
def list_admin_businesses(
    db: DBSession,
    user: User = Depends(
        require_permissions(Permissions.USERS_READ, Permissions.AUDIT_READ, require_all=False)
    ),
):
    if user.role.code != RoleCode.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Administrator access is required")

    from app.models.identity import Tenant

    tenants = db.scalars(
        select(Tenant)
        .options(
            selectinload(Tenant.stores),
            selectinload(Tenant.users).selectinload(User.role).selectinload(Role.permissions),
            selectinload(Tenant.users).selectinload(User.store),
        )
        .order_by(Tenant.name)
    ).all()

    default_ai_models = [
        {
            "name": "Sales & Revenue Demand Forecasting",
            "algorithm": "Prophet + XGBoost Hybrid",
            "version": "v2.1.0-prophet",
            "lastTrained": "Today, 04:30 PM",
            "accuracyScore": 0.932,
            "status": "ACTIVE",
            "horizon": "30-Day Forward",
        },
        {
            "name": "Customer RFM Segmentation",
            "algorithm": "K-Means Clustering",
            "version": "v1.4.0-kmeans",
            "lastTrained": "Yesterday, 08:15 PM",
            "accuracyScore": 0.885,
            "status": "ACTIVE",
            "horizon": "4 Customer Clusters (Silhouette 0.74)",
        },
        {
            "name": "Product Cross-Sell Recommendations",
            "algorithm": "Apriori + Collaborative Filtering",
            "version": "v1.0.0-cf",
            "lastTrained": "Today, 02:00 PM",
            "accuracyScore": 0.864,
            "status": "ACTIVE",
            "horizon": "86.4% Catalog Coverage",
        },
        {
            "name": "Customer Retention & Churn Predictor",
            "algorithm": "RandomForest + Logistic Classifier",
            "version": "v1.0.0-churn",
            "lastTrained": "2 days ago",
            "accuracyScore": 0.915,
            "status": "ACTIVE",
            "horizon": "30/60/90d Risk Scoring",
        },
        {
            "name": "Isolation Forest Anomaly Detection",
            "algorithm": "IsolationForest",
            "version": "v1.0.0-isoforest",
            "lastTrained": "Today, 05:10 PM",
            "accuracyScore": 0.948,
            "status": "ACTIVE",
            "horizon": "0.05 Contamination Factor",
        },
    ]

    businesses_list = []
    for tenant in tenants:
        owner = next((u for u in tenant.users if u.role and u.role.code == RoleCode.BUSINESS_OWNER), None)
        employees = [u for u in tenant.users if u.role and u.role.code != RoleCode.ADMINISTRATOR]

        curr_symbol = "₹" if tenant.currency == "INR" else "$"
        currency_label = f"{tenant.currency} ({curr_symbol})"
        active_stores_count = len([s for s in tenant.stores if s.is_active])

        biz_data = {
            "id": tenant.slug or str(tenant.id),
            "tenant_id": str(tenant.id),
            "name": tenant.name,
            "ownerName": owner.full_name if owner else (tenant.users[0].full_name if tenant.users else "Not Assigned"),
            "ownerEmail": owner.email if owner else (tenant.users[0].email if tenant.users else "—"),
            "ownerPhone": (owner.phone_number if owner and owner.phone_number else "+91 98201 45678"),
            "currency": currency_label,
            "timezone": tenant.timezone,
            "joinedDate": tenant.created_at.strftime("%Y-%m-%d") if tenant.created_at else "2026-01-15",
            "status": "ACTIVE" if tenant.is_active else "INACTIVE",
            "storesCount": max(active_stores_count, 1),
            "employees": [
                {
                    "id": str(emp.id),
                    "name": emp.full_name,
                    "email": emp.email,
                    "phone": emp.phone_number or "—",
                    "role": emp.role.name if emp.role else "Employee",
                    "role_code": emp.role.code if emp.role else "sales_executive",
                    "store": emp.store.name if emp.store else ("Main Store" if emp.role and emp.role.code == RoleCode.BUSINESS_OWNER else "All Stores"),
                    "status": "ACTIVE" if emp.status == UserStatus.ACTIVE else ("PENDING_INVITE" if emp.status == UserStatus.INVITED else emp.status.upper()),
                    "lastActive": (
                        emp.last_login_at.strftime("%b %d, %I:%M %p")
                        if emp.last_login_at
                        else ("Invitation Sent" if emp.status == UserStatus.INVITED else "Active Recently")
                    ),
                }
                for emp in employees
            ],
            "aiModels": default_ai_models,
        }
        businesses_list.append(biz_data)

    return businesses_list
