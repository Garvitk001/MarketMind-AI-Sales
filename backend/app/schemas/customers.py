from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

from app.schemas.common import ORMModel


class CustomerCreate(BaseModel):
    company_name: str
    gstin: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    location: str | None = None
    credit_limit: Decimal | None = Decimal("250000.00")
    credit_terms: str | None = "Net 30"
    territory_route: str | None = "Central Commercial Route"
    assigned_seller_id: UUID | None = None


class CustomerUpdate(BaseModel):
    company_name: str | None = None
    gstin: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    location: str | None = None
    credit_limit: Decimal | None = None
    outstanding_balance: Decimal | None = None
    credit_terms: str | None = None
    territory_route: str | None = None
    assigned_seller_id: UUID | None = None


class CustomerResponse(ORMModel):
    id: UUID
    tenant_id: UUID
    assigned_seller_id: UUID | None
    source_system: str
    external_customer_id: str
    last_purchase: datetime
    order_count: int
    item_quantity: int
    total_revenue: Decimal
    recency_days: int
    company_name: str | None = None
    gstin: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    location: str | None = None
    credit_limit: Decimal | None = None
    outstanding_balance: Decimal | None = None
    credit_terms: str | None = None
    territory_route: str | None = None



class CustomerList(BaseModel):
    items: list[CustomerResponse]
    total: int
    limit: int
    offset: int


class CustomerSummary(BaseModel):
    scope: str
    tenant_id: UUID
    customer_count: int
    total_revenue: Decimal
    total_orders: int
    average_customer_value: Decimal


class CustomerPreference(BaseModel):
    product_id: UUID | None = None
    sku: str | None = None
    name: str
    quantity: int
    revenue: Decimal


class CustomerVisit(BaseModel):
    transaction_id: UUID
    reference: str
    occurred_at: datetime
    store_name: str
    seller_name: str
    payment_method: str | None
    amount: Decimal
    item_count: int
    products: list[str]


class CustomerPeriodComparison(BaseModel):
    current_orders: int
    previous_orders: int
    current_revenue: Decimal
    previous_revenue: Decimal
    revenue_change_percentage: float | None


class CustomerInsightResponse(BaseModel):
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
    first_visit: datetime | None
    last_visit: datetime | None
    linked_visit_count: int
    summary_order_count: int
    total_revenue: Decimal
    average_order_value: Decimal
    favourite_products: list[CustomerPreference]
    favourite_categories: list[CustomerPreference]
    preferred_store: str | None
    preferred_seller: str | None
    preferred_payment_method: str | None
    typical_weekday: str | None
    typical_hour: int | None
    decline_status: str
    decline_explanation: str
    period_comparison: CustomerPeriodComparison
    suggestions: list[str]
    recent_visits: list[CustomerVisit]
    generated_on: date
