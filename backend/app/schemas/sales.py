from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.schemas.common import ORMModel


class SalesLineItemCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(gt=0, le=10_000)
    unit_price: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    discount_amount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=14, decimal_places=2)


class SalesTransactionCreate(BaseModel):
    store_id: UUID | None = None
    external_reference: str | None = Field(default=None, max_length=80)
    occurred_at: datetime | None = None
    currency: str = Field(default="INR", min_length=3, max_length=3)
    total_amount: Decimal | None = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    item_count: int | None = Field(default=None, gt=0, le=10000)
    items: list[SalesLineItemCreate] = Field(default_factory=list, max_length=100)
    order_discount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=14, decimal_places=2)
    tax_amount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=14, decimal_places=2)
    payment_method: str | None = Field(default=None, max_length=60)
    payment_status: str | None = Field(default="paid", max_length=30)
    delivery_status: str | None = Field(default="pending", max_length=30)
    customer_id: UUID | None = None
    customer_reference: str | None = Field(default=None, max_length=255)
    credit_terms: str | None = Field(default="Net 30", max_length=50)
    notes: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_sale_shape(self):
        if self.items:
            if len({item.product_id for item in self.items}) != len(self.items):
                raise ValueError("Each product may appear only once; increase its quantity instead")
            subtotal = sum(
                (item.unit_price * item.quantity - item.discount_amount for item in self.items),
                Decimal("0"),
            )
            if subtotal <= 0:
                raise ValueError("Line discounts cannot reduce the subtotal to zero")
            if self.order_discount >= subtotal:
                raise ValueError("Order discount must be lower than the line subtotal")
        elif self.total_amount is None or self.item_count is None:
            raise ValueError("Provide product items or the legacy total_amount and item_count")
        return self


class SalesTransactionUpdate(BaseModel):
    external_reference: str | None = Field(default=None, max_length=80)
    occurred_at: datetime | None = None
    total_amount: Decimal | None = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    item_count: int | None = Field(default=None, gt=0, le=10000)
    payment_status: str | None = Field(default=None, max_length=30)
    delivery_status: str | None = Field(default=None, max_length=30)
    customer_id: UUID | None = None
    notes: str | None = Field(default=None, max_length=500)


class SalesProductResponse(ORMModel):
    id: UUID
    sku: str
    name: str
    category: str | None


class SalesLineItemResponse(ORMModel):
    id: UUID
    product_id: UUID
    quantity: int
    unit_price: Decimal | None
    discount_amount: Decimal | None
    line_amount: Decimal
    product: SalesProductResponse


class SalesTransactionResponse(ORMModel):
    id: UUID
    tenant_id: UUID
    store_id: UUID
    seller_id: UUID
    source_system: str
    external_reference: str | None
    occurred_at: datetime
    currency: str
    total_amount: Decimal
    item_count: int
    status: str
    notes: str | None
    subtotal_amount: Decimal | None
    discount_amount: Decimal | None
    tax_amount: Decimal | None
    cgst_amount: Decimal | None = None
    sgst_amount: Decimal | None = None
    igst_amount: Decimal | None = None
    payment_method: str | None
    payment_status: str | None = None
    delivery_status: str | None = "pending"
    credit_terms: str | None = None
    due_date: datetime | None = None
    hsn_code: str | None = None
    customer_id: UUID | None

    line_items: list[SalesLineItemResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class TransactionList(BaseModel):
    items: list[SalesTransactionResponse]
    total: int
    limit: int
    offset: int


class SalesCatalogItem(BaseModel):
    product_id: UUID
    sku: str
    name: str
    category: str | None
    available_stock: int
    unit_price: Decimal | None = None
