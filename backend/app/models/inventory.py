from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship


from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Product(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "products"
    __table_args__ = (UniqueConstraint("tenant_id", "sku", name="uq_products_tenant_sku"),)

    tenant_id: Mapped[UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    sku: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str | None] = mapped_column(String(120), index=True)
    style: Mapped[str | None] = mapped_column(String(100))
    size: Mapped[str | None] = mapped_column(String(40))
    color: Mapped[str | None] = mapped_column(String(80))
    hsn_code: Mapped[str | None] = mapped_column(String(20), default="8471")
    unit_mrp: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    pack_size: Mapped[str | None] = mapped_column(String(50), default="12 Units/Box")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    inventory_records: Mapped[list[Inventory]] = relationship(back_populates="product")


class Inventory(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "inventory"
    __table_args__ = (
        UniqueConstraint("store_id", "product_id", name="uq_inventory_store_product"),
    )

    tenant_id: Mapped[UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    store_id: Mapped[UUID] = mapped_column(
        ForeignKey("stores.id", ondelete="CASCADE"), index=True, nullable=False
    )
    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True, nullable=False
    )
    stock_quantity: Mapped[int] = mapped_column(default=0, nullable=False)
    reorder_level: Mapped[int] = mapped_column(default=5, nullable=False)
    batch_number: Mapped[str | None] = mapped_column(String(60), default="BATCH-2026-01")
    expiry_date: Mapped[str | None] = mapped_column(String(30))


    product: Mapped[Product] = relationship(back_populates="inventory_records", lazy="selectin")

    @property
    def stock_status(self) -> str:
        if self.stock_quantity == 0:
            return "out_of_stock"
        if self.stock_quantity <= self.reorder_level:
            return "low_stock"
        return "in_stock"
