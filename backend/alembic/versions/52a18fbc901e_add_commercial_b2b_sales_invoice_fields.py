"""add commercial b2b sales invoice and customer fields

Revision ID: 52a18fbc901e
Revises: f07c1a928de4
"""

from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op

revision: str = "52a18fbc901e"
down_revision: str | None = "f07c1a928de4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Update sales_transactions
    with op.batch_alter_table("sales_transactions") as batch_op:
        batch_op.add_column(sa.Column("payment_status", sa.String(30), nullable=True))
        batch_op.add_column(sa.Column("delivery_status", sa.String(30), nullable=True))
        batch_op.add_column(sa.Column("credit_terms", sa.String(50), nullable=True))
        batch_op.add_column(sa.Column("cgst_amount", sa.Numeric(14, 2), nullable=True))
        batch_op.add_column(sa.Column("sgst_amount", sa.Numeric(14, 2), nullable=True))
        batch_op.add_column(sa.Column("igst_amount", sa.Numeric(14, 2), nullable=True))
        batch_op.add_column(sa.Column("due_date", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("hsn_code", sa.String(30), nullable=True))
        batch_op.create_index("ix_sales_transactions_payment_status", ["payment_status"])
        batch_op.create_index("ix_sales_transactions_delivery_status", ["delivery_status"])

    # 2. Update customers
    with op.batch_alter_table("customers") as batch_op:
        batch_op.add_column(sa.Column("gstin", sa.String(60), nullable=True))
        batch_op.add_column(sa.Column("company_name", sa.String(255), nullable=True))
        batch_op.add_column(sa.Column("contact_phone", sa.String(50), nullable=True))
        batch_op.add_column(sa.Column("contact_email", sa.String(150), nullable=True))
        batch_op.add_column(sa.Column("credit_limit", sa.Numeric(14, 2), nullable=True))
        batch_op.add_column(sa.Column("outstanding_balance", sa.Numeric(14, 2), nullable=True))
        batch_op.add_column(sa.Column("credit_terms", sa.String(50), nullable=True))
        batch_op.add_column(sa.Column("territory_route", sa.String(150), nullable=True))
        batch_op.add_column(sa.Column("location", sa.String(255), nullable=True))
        batch_op.create_index("ix_customers_gstin", ["gstin"])


def downgrade() -> None:
    with op.batch_alter_table("customers") as batch_op:
        batch_op.drop_index("ix_customers_gstin")
        batch_op.drop_column("location")
        batch_op.drop_column("territory_route")
        batch_op.drop_column("credit_terms")
        batch_op.drop_column("outstanding_balance")
        batch_op.drop_column("credit_limit")
        batch_op.drop_column("contact_email")
        batch_op.drop_column("contact_phone")
        batch_op.drop_column("company_name")
        batch_op.drop_column("gstin")

    with op.batch_alter_table("sales_transactions") as batch_op:
        batch_op.drop_index("ix_sales_transactions_delivery_status")
        batch_op.drop_index("ix_sales_transactions_payment_status")
        batch_op.drop_column("hsn_code")
        batch_op.drop_column("due_date")
        batch_op.drop_column("igst_amount")
        batch_op.drop_column("sgst_amount")
        batch_op.drop_column("cgst_amount")
        batch_op.drop_column("credit_terms")
        batch_op.drop_column("delivery_status")
        batch_op.drop_column("payment_status")
