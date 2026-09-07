from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class TargetCreate(BaseModel):
    target_value: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    period_start: date
    period_end: date
    metric: Literal["revenue"] = "revenue"

    @model_validator(mode="after")
    def validate_period(self):
        if self.period_end < self.period_start:
            raise ValueError("period_end must be on or after period_start")
        if (self.period_end - self.period_start).days > 366:
            raise ValueError("Target period cannot exceed 366 days")
        return self


class TargetResponse(BaseModel):
    id: UUID
    metric: str
    target_value: Decimal
    achieved_value: Decimal
    completion_percentage: float
    period_start: date
    period_end: date
    remaining_value: Decimal
    remaining_days: int
    is_active: bool


class TrendPoint(BaseModel):
    date: date
    revenue: Decimal
    transactions: int


class PerformanceMetrics(BaseModel):
    revenue: Decimal
    transactions: int
    items_sold: int
    average_order_value: Decimal
    customers_handled: int
    previous_revenue: Decimal
    revenue_change_percentage: float | None


class EmployeePerformanceResponse(BaseModel):
    employee_id: UUID
    full_name: str
    email: str
    role_code: str
    role_name: str
    store_id: UUID | None
    store_name: str | None
    status: str
    joined_at: datetime
    last_login_at: datetime | None
    avatar_url: str | None
    avatar_emoji: str
    period_start: date
    period_end: date
    metrics: PerformanceMetrics
    target: TargetResponse | None
    performance_level: str
    store_rank: int | None
    insights: list[str]
    trend: list[TrendPoint]


class TeamOverviewResponse(BaseModel):
    total_employees: int
    active_employees: int
    invited_employees: int
    disabled_employees: int
    store_managers: int
    sales_executives: int
    below_target: int
    top_performer: EmployeePerformanceResponse | None
    employees: list[EmployeePerformanceResponse]


class EmployeeActivityItem(BaseModel):
    id: str
    event_type: str
    action_title: str
    description: str
    category: str  # "sales" | "inventory" | "billing" | "security" | "team"
    target_type: str | None = None
    target_id: str | None = None
    occurred_at: datetime
    badge_variant: str = "info"  # "success" | "warning" | "info" | "danger"
    amount: Decimal | None = None
    details: dict = Field(default_factory=dict)


class EmployeeActivityLogResponse(BaseModel):
    employee_id: UUID
    full_name: str
    role_code: str
    role_name: str
    days: int
    total_events: int
    activities: list[EmployeeActivityItem]

