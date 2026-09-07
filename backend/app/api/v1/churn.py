from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
import logging

from app.api.dependencies import CurrentUser
from app.db.session import get_db
from app.schemas.churn import ChurnCustomerListResponse, ChurnSummaryResponse
from app.services.churn_service import get_churn_customer_list, get_churn_summary

logger = logging.getLogger("marketmind.api.churn")

router = APIRouter(prefix="/churn", tags=["AI Churn Prediction"])


@router.get("/summary", response_model=ChurnSummaryResponse, summary="Get Customer Churn Summary & Scikit-Learn Model Metrics")
def read_churn_summary(
    user: CurrentUser,
    store_id: UUID | None = Query(default=None, description="Optional target store ID"),
    db: Session = Depends(get_db)
):
    """
    Retrieve customer churn prediction summary scoped to the authenticated tenant.
    """
    try:
        summary = get_churn_summary(db=db, tenant_id=user.tenant_id, store_id=store_id)
        return summary
    except Exception as e:
        logger.error("Churn summary generation failed: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate churn summary. Please try again later."
        )


@router.get("/customers", response_model=ChurnCustomerListResponse, summary="Get At-Risk Customers with Churn Scores")
def read_churn_customers(
    user: CurrentUser,
    risk_level: str | None = Query(default=None, description="Filter by risk level: 'high_risk', 'medium_risk', 'low_risk'"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Retrieve paginated customer records scoped to the authenticated tenant.
    """
    try:
        result = get_churn_customer_list(
            db=db,
            tenant_id=user.tenant_id,
            risk_level=risk_level,
            limit=limit,
            offset=offset
        )
        return result
    except Exception as e:
        logger.error("Churn customer records query failed: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch churn customer records. Please try again later."
        )
