from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class SegmentProfile(BaseModel):
    segment_code: str
    segment_name: str
    customer_count: int
    customer_share: float
    total_revenue: Decimal
    revenue_share: float
    average_order_value: Decimal
    average_recency_days: float
    average_order_count: float
    average_engagement_score: float
    average_return_rate: float | None


class CustomerBehaviorSummary(BaseModel):
    scope: str
    tenant_id: UUID
    store_id: UUID | None
    model_version: str
    algorithm: str
    trained_at: datetime
    silhouette_score: float
    customer_count: int
    total_revenue: Decimal
    repeat_customer_rate: float
    average_order_value: Decimal
    average_recency_days: float
    average_engagement_score: float
    segments: list[SegmentProfile]


class CustomerSegmentResponse(BaseModel):
    customer_id: UUID
    external_customer_id: str
    company_name: str | None = None
    gstin: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    location: str | None = None
    credit_limit: Decimal | None = None
    outstanding_balance: Decimal | None = None
    credit_terms: str | None = None
    territory_route: str | None = None
    assigned_seller_id: UUID | None
    segment_code: str
    segment_name: str
    engagement_score: Decimal
    recency_days: int
    order_count: int
    total_revenue: Decimal
    average_order_value: Decimal
    average_basket_size: Decimal
    active_months: int | None
    product_variety: int | None
    return_rate: Decimal | None
    purchase_frequency_30d: Decimal


class CustomerSegmentList(BaseModel):
    model_version: str
    items: list[CustomerSegmentResponse]
    total: int
    limit: int
    offset: int
