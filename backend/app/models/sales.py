from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from sqlalchemy import JSON, DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class TransactionStatus(StrEnum):
    COMPLETED = "completed"
    VOIDED = "voided"


class SalesTransaction(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "sales_transactions"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "store_id",
            "source_system",
            "external_reference",
            name="uq_sales_transactions_import_key",
        ),
    )

    tenant_id: Mapped[UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    store_id: Mapped[UUID] = mapped_column(
        ForeignKey("stores.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    seller_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    source_system: Mapped[str] = mapped_column(
        String(40), default="manual", index=True, nullable=False
    )
    external_reference: Mapped[str | None] = mapped_column(String(80), index=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    item_count: Mapped[int] = mapped_column(nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default=TransactionStatus.COMPLETED, index=True, nullable=False
    )
    notes: Mapped[str | None] = mapped_column(String(500))
    subtotal_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    discount_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    tax_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    cgst_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    sgst_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    igst_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    payment_method: Mapped[str | None] = mapped_column(String(60), index=True)
    payment_status: Mapped[str | None] = mapped_column(String(30), default="paid", index=True)
    delivery_status: Mapped[str | None] = mapped_column(String(30), default="pending", index=True)
    credit_terms: Mapped[str | None] = mapped_column(String(50), default="Net 30")
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    hsn_code: Mapped[str | None] = mapped_column(String(30), default="8471")
    customer_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"), index=True
    )
    customer_snapshot: Mapped[dict | None] = mapped_column(JSON)


    line_items: Mapped[list["SalesLineItem"]] = relationship(
        back_populates="transaction", cascade="all, delete-orphan"
    )


class SalesLineItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Product-level quantity attached to an imported sale.

    Demand models are never trained from the order-level ``item_count`` because it
    does not identify which product was sold.
    """

    __tablename__ = "sales_line_items"
    __table_args__ = (
        UniqueConstraint(
            "transaction_id", "product_id", name="uq_sales_line_items_transaction_product"
        ),
    )

    tenant_id: Mapped[UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    transaction_id: Mapped[UUID] = mapped_column(
        ForeignKey("sales_transactions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    quantity: Mapped[int] = mapped_column(nullable=False)
    line_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    unit_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    discount_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))

    transaction: Mapped[SalesTransaction] = relationship(back_populates="line_items")
    product = relationship("Product", lazy="joined")
