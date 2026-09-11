from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Customer(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "customers"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "source_system",
            "external_customer_id",
            name="uq_customers_import_key",
        ),
    )

    tenant_id: Mapped[UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    assigned_seller_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    source_system: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    external_customer_id: Mapped[str] = mapped_column(String(80), nullable=False)
    last_purchase: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    order_count: Mapped[int] = mapped_column(nullable=False)
    item_quantity: Mapped[int] = mapped_column(nullable=False)
    total_revenue: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    recency_days: Mapped[int] = mapped_column(nullable=False)
    gstin: Mapped[str | None] = mapped_column(String(60), index=True)
    company_name: Mapped[str | None] = mapped_column(String(255))
    contact_phone: Mapped[str | None] = mapped_column(String(50))
    contact_email: Mapped[str | None] = mapped_column(String(150))
    credit_limit: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), default=100000.00)
    outstanding_balance: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), default=0.00)
    credit_terms: Mapped[str | None] = mapped_column(String(50), default="Net 30")
    territory_route: Mapped[str | None] = mapped_column(String(150), default="Central Market Route")
    location: Mapped[str | None] = mapped_column(String(255), default="Central Commercial Market")

