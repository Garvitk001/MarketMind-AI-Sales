from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
import logging

from app.api.dependencies import CurrentUser
from app.db.session import get_db
from app.schemas.monitoring import SystemMonitoringResponse
from app.services.monitoring_service import get_system_monitoring_status

logger = logging.getLogger("marketmind.api.models_monitoring")

router = APIRouter(prefix="/models", tags=["AI Models & System Monitoring"])


@router.get("/monitoring", response_model=SystemMonitoringResponse, summary="Get Platform AI Models & System Health")
def read_models_monitoring(
    user: CurrentUser,
    db: Session = Depends(get_db)
):
    """
    Returns platform-wide monitoring telemetry across all 5 AI engines scoped to the authenticated tenant.
    """
    try:
        telemetry = get_system_monitoring_status(db=db, tenant_id=user.tenant_id)
        return telemetry
    except Exception as e:
        logger.error("Model monitoring telemetry fetch failed: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch model monitoring telemetry. Please try again later."
        )
