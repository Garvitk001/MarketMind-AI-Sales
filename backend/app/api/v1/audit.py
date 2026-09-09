from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select

from app.api.dependencies import DBSession, require_permissions
from app.core.permissions import Permissions
from app.models.audit import AuditEvent
from app.models.identity import User
from app.schemas.common import ORMModel


class AuditEventResponse(ORMModel):
    id: UUID
    created_at: datetime
    actor_user_id: UUID | None
    event_type: str
    target_type: str | None
    target_id: str | None
    correlation_id: str | None
    details: dict
    actor_name: str | None = None
    actor_email: str | None = None
    actor_phone: str | None = None
    actor_role: str | None = None
    business_name: str | None = None


router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("", response_model=list[AuditEventResponse])
def list_audit_events(
    db: DBSession,
    user: User = Depends(require_permissions(Permissions.AUDIT_READ)),
    limit: int = Query(default=200, ge=1, le=500),
):
    from app.models.identity import RoleCode, Tenant, User as UserModel

    query = select(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(limit)
    if user.role.code != RoleCode.ADMINISTRATOR:
        query = query.where(AuditEvent.tenant_id == user.tenant_id)

    events = db.scalars(query).all()
    if not events:
        return []

    # Pre-fetch users and tenants for enrichment
    actor_ids = {e.actor_user_id for e in events if e.actor_user_id}
    tenant_ids = {e.tenant_id for e in events if e.tenant_id}

    users_map = {}
    if actor_ids:
        user_records = db.scalars(
            select(UserModel).where(UserModel.id.in_(actor_ids))
        ).all()
        users_map = {u.id: u for u in user_records}

    tenants_map = {}
    if tenant_ids:
        tenant_records = db.scalars(
            select(Tenant).where(Tenant.id.in_(tenant_ids))
        ).all()
        tenants_map = {t.id: t for t in tenant_records}

    results: list[AuditEventResponse] = []
    for event in events:
        actor = users_map.get(event.actor_user_id) if event.actor_user_id else None
        tenant = tenants_map.get(event.tenant_id) if event.tenant_id else None
        details = event.details or {}

        actor_name = (
            actor.full_name
            if actor
            else details.get("full_name") or details.get("name") or ("System Administrator" if "developer" in event.event_type or "admin" in event.event_type else None)
        )
        actor_email = (
            actor.email
            if actor
            else details.get("email") or details.get("recipient") or ("admin@system.com" if "developer" in event.event_type or "admin" in event.event_type else None)
        )
        actor_phone = (
            actor.phone_number
            if actor
            else details.get("phone") or details.get("phone_number")
        )
        actor_role = (
            actor.role.name
            if actor and actor.role
            else (
                details.get("role_name")
                or (details.get("role") or "").replace("_", " ").title()
                or ("Administrator" if "developer" in event.event_type or "admin" in event.event_type else "User")
            )
        )
        business_name = (
            (tenant.name if tenant else None)
            or (actor.tenant.name if actor and actor.tenant else None)
            or details.get("business_name")
            or ("System Platform Root" if "developer" in event.event_type or (actor and actor.role and actor.role.code == RoleCode.ADMINISTRATOR) else "MarketMind Platform")
        )

        results.append(
            AuditEventResponse(
                id=event.id,
                created_at=event.created_at,
                actor_user_id=event.actor_user_id,
                event_type=event.event_type,
                target_type=event.target_type,
                target_id=event.target_id,
                correlation_id=event.correlation_id,
                details=details,
                actor_name=actor_name,
                actor_email=actor_email,
                actor_phone=actor_phone,
                actor_role=actor_role,
                business_name=business_name,
            )
        )
    return results
