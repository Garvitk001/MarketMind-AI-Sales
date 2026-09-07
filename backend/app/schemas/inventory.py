from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


from app.schemas.common import ORMModel


class ProductResponse(ORMModel):
    id: UUID
    sku: str
    name: str
    category: str | None
    style: str | None
    size: str | None
    color: str | None
    hsn_code: str | None = None
    unit_mrp: Decimal | None = None
    pack_size: str | None = None


class InventoryResponse(ORMModel):
    id: UUID
    tenant_id: UUID
    store_id: UUID
    product_id: UUID
    stock_quantity: int
    reorder_level: int
    stock_status: str
    batch_number: str | None = None
    expiry_date: str | None = None
    product: ProductResponse

    created_at: datetime
    updated_at: datetime


class InventoryList(BaseModel):
    items: list[InventoryResponse]
    total: int
    limit: int
    offset: int


class InventoryUpdate(BaseModel):
    stock_quantity: int | None = Field(default=None, ge=0, le=10_000_000)
    reorder_level: int | None = Field(default=None, ge=0, le=10_000_000)


class ProductCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    sku: str = Field(min_length=2, max_length=100)
    category: str | None = Field(default="General", max_length=120)
    unit_price: Decimal | None = Field(default=Decimal("499.00"), ge=0)
    stock_quantity: int = Field(default=50, ge=0)
    reorder_level: int = Field(default=10, ge=0)
    store_id: UUID | None = None
    batch_number: str | None = Field(default=None, max_length=60)
    expiry_date: str | None = Field(default=None, max_length=30)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    sku: str | None = Field(default=None, min_length=2, max_length=100)
    category: str | None = Field(default=None, max_length=120)
    unit_price: Decimal | None = Field(default=None, ge=0)
    stock_quantity: int | None = Field(default=None, ge=0)
    reorder_level: int | None = Field(default=None, ge=0)
    batch_number: str | None = Field(default=None, max_length=60)
    expiry_date: str | None = Field(default=None, max_length=30)


class InventorySummary(BaseModel):
    scope: str
    tenant_id: UUID
    store_id: UUID | None
    product_count: int
    total_units: int
    low_stock_count: int
    out_of_stock_count: int
