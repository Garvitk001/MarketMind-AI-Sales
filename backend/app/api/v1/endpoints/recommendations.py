from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
import logging

from app.api.dependencies import CurrentUser
from app.db.session import get_db
from app.schemas.recommendation import (
    RecommendationResponse,
    RecommendationAnalytics,
    EvaluationMetrics,
    RecommendationInsights,
)
from app.services.recommendation_service import (
    get_product_recommendations,
    get_recommendation_analytics,
    calculate_evaluation_metrics,
    get_recommendation_insights,
)

logger = logging.getLogger("marketmind.api.recommendations")

router = APIRouter(prefix="/recommendations", tags=["Product Recommendations"])

@router.get("", response_model=RecommendationResponse, summary="Get Intelligent Product Recommendations")
def read_recommendations(
    user: CurrentUser,
    role: str = Query("owner", description="User role scope: 'owner', 'manager', 'sales', 'admin'"),
    customer_id: Optional[str] = Query(None, description="Target customer account ID (e.g., CUST-001)"),
    sku: Optional[str] = Query(None, description="Base product SKU for cross-selling (e.g., SKU-501)"),
    category: Optional[str] = Query(None, description="Category filter (e.g., Terminals, Supplies)"),
    strategy: str = Query("all", description="Recommendation strategy: 'all', 'cross_sell', 'upsell', 'high_margin', 'inventory_clearance'"),
    limit: int = Query(10, ge=1, le=50, description="Maximum recommendations to return"),
    db: Session = Depends(get_db)
):
    """
    Generate data-driven intelligent product recommendations scoped to the authenticated tenant.
    """
    try:
        recommendations = get_product_recommendations(
            db=db,
            tenant_id=user.tenant_id,
            customer_id=customer_id,
            sku=sku,
            category=category,
            strategy=strategy,
            role=role,
            limit=limit
        )
        return recommendations
    except Exception as e:
        logger.error(f"Error generating product recommendations: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate product recommendations. Please try again later."
        )

@router.get("/analytics", response_model=RecommendationAnalytics, summary="Get Recommendation Analytics & Model Signals")
def read_recommendation_analytics(user: CurrentUser, db: Session = Depends(get_db)):
    """
    Retrieve aggregated recommendation impact metrics and model signals scoped to the authenticated tenant.
    """
    try:
        analytics = get_recommendation_analytics(db, tenant_id=user.tenant_id)
        return analytics
    except Exception as e:
        logger.error(f"Error fetching recommendation analytics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch recommendation analytics. Please try again later."
        )

@router.get("/evaluation", response_model=EvaluationMetrics, summary="Get Recommendation Model Precision@K and Recall@K Evaluation")
def read_recommendation_evaluation(
    user: CurrentUser,
    k: int = Query(5, ge=1, le=20, description="K value for Precision@K and Recall@K"),
    db: Session = Depends(get_db)
):
    """
    Retrieve model evaluation metrics scoped to the authenticated tenant.
    """
    try:
        metrics = calculate_evaluation_metrics(db, tenant_id=user.tenant_id, k=k)
        return metrics
    except Exception as e:
        logger.error(f"Error calculating recommendation evaluation metrics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate recommendation evaluation metrics. Please try again later."
        )

@router.get("/insights", response_model=RecommendationInsights, summary="Get Recommendation Insights")
def read_recommendation_insights(user: CurrentUser, db: Session = Depends(get_db)):
    """
    Retrieve data-driven natural-language insights scoped to the authenticated tenant.
    """
    try:
        insights = get_recommendation_insights(db, tenant_id=user.tenant_id)
        return insights
    except Exception as e:
        logger.error(f"Error generating recommendation insights: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate recommendation insights. Please try again later."
        )
