from __future__ import annotations

import csv
from datetime import UTC, datetime, timedelta
from decimal import Decimal, InvalidOperation
from io import StringIO
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import as_utc
from app.models.customers import Customer
from app.models.inventory import Inventory, Product
from app.models.sales import SalesLineItem, SalesTransaction, TransactionStatus

DATASET_COLUMNS = {
    "products": {"sku", "name"},
    "inventory": {"sku", "stock_quantity", "reorder_level"},
    "sales": {"order_id", "order_date", "customer_id", "sku", "quantity", "amount"},
    "customers": {
        "customer_id",
        "last_purchase",
        "order_count",
        "item_quantity",
        "total_revenue",
        "recency_days",
    },
}


def parse_csv(raw_csv: str) -> tuple[list[str], list[dict[str, str]]]:
    reader = csv.DictReader(StringIO(raw_csv))
    headers = [str(value).strip().lower() for value in (reader.fieldnames or [])]
    rows = [
        {str(key).strip().lower(): str(value or "").strip() for key, value in row.items()}
        for row in reader
    ]
    return headers, rows


def as_int(value: str, label: str, *, minimum: int = 0) -> int:
    try:
        parsed = int(Decimal(value))
    except (InvalidOperation, ValueError) as exc:
        raise ValueError(f"{label} must be a whole number") from exc
    if parsed < minimum:
        raise ValueError(f"{label} must be at least {minimum}")
    return parsed


def as_money(value: str, label: str, *, positive: bool = False) -> Decimal:
    try:
        parsed = Decimal(value).quantize(Decimal("0.01"))
    except InvalidOperation as exc:
        raise ValueError(f"{label} must be a valid amount") from exc
    if (positive and parsed <= 0) or (not positive and parsed < 0):
        raise ValueError(f"{label} must be {'greater than zero' if positive else 'zero or more'}")
    return parsed


def as_date(value: str, label: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"{label} must use YYYY-MM-DD or ISO date format") from exc
    return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed


def validate_upload(
    db: Session,
    *,
    tenant_id: UUID,
    kind: str,
    raw_csv: str,
) -> tuple[list[dict], list[dict], list[dict]]:
    headers, rows = parse_csv(raw_csv)
    missing = sorted(DATASET_COLUMNS[kind] - set(headers))
    if missing:
        return [], [], [{"row": 1, "message": f"Missing columns: {', '.join(missing)}"}]
    known_skus = set()
    if kind in {"inventory", "sales"}:
        known_skus = set(
            db.scalars(select(Product.sku).where(Product.tenant_id == tenant_id)).all()
        )
    known_customers = set()
    if kind == "sales":
        known_customers = set(
            db.scalars(
                select(Customer.external_customer_id).where(Customer.tenant_id == tenant_id)
            ).all()
        )
    valid, errors = [], []
    for line, row in enumerate(rows, 2):
        try:
            if kind == "products":
                sku = row.get("sku", "").upper()
                name = row.get("name", "")
                if not sku or not name:
                    raise ValueError("sku and name are required")
                normalized = {
                    "sku": sku,
                    "name": name,
                    "category": row.get("category") or None,
                    "style": row.get("style") or None,
                    "size": row.get("size") or None,
                    "color": row.get("color") or None,
                }
            elif kind == "inventory":
                sku = row.get("sku", "").upper()
                if sku not in known_skus:
                    raise ValueError(
                        f"SKU {sku or '(empty)'} is not in this business product catalog"
                    )
                normalized = {
                    "sku": sku,
                    "stock_quantity": as_int(row.get("stock_quantity", ""), "stock_quantity"),
                    "reorder_level": as_int(row.get("reorder_level", ""), "reorder_level"),
                }
            elif kind == "sales":
                order_id = row.get("order_id", "")
                if not order_id:
                    raise ValueError("order_id is required")
                sku = row.get("sku", "").upper()
                if sku not in known_skus:
                    raise ValueError(
                        f"SKU {sku or '(empty)'} is not in this business product catalog"
                    )
                customer_id = row.get("customer_id", "")
                if customer_id not in known_customers:
                    raise ValueError(
                        f"Customer {customer_id or '(empty)'} is not in this business customer list"
                    )
                normalized = {
                    "order_id": order_id,
                    "order_date": as_date(row.get("order_date", ""), "order_date"),
                    "sku": sku,
                    "customer_id": customer_id,
                    "amount": as_money(row.get("amount", ""), "amount", positive=True),
                    "quantity": as_int(row.get("quantity", ""), "quantity", minimum=1),
                    "currency": (row.get("currency") or "INR").upper(),
                }
            else:
                customer_id = row.get("customer_id", "")
                if not customer_id:
                    raise ValueError("customer_id is required")
                normalized = {
                    "customer_id": customer_id,
                    "last_purchase": as_date(row.get("last_purchase", ""), "last_purchase"),
                    "order_count": as_int(row.get("order_count", ""), "order_count"),
                    "item_quantity": as_int(row.get("item_quantity", ""), "item_quantity"),
                    "total_revenue": as_money(row.get("total_revenue", ""), "total_revenue"),
                    "recency_days": as_int(row.get("recency_days", ""), "recency_days"),
                }
            valid.append(normalized)
        except ValueError as exc:
            errors.append({"row": line, "message": str(exc)})
    serializable = [
        {
            key: value.isoformat() if isinstance(value, datetime) else str(value)
            for key, value in row.items()
        }
        for row in valid[:5]
    ]
    return valid, serializable, errors[:100]


def upsert_upload(
    db: Session,
    *,
    tenant_id: UUID,
    store_id: UUID | None,
    seller_id: UUID | None,
    kind: str,
    raw_csv: str,
) -> dict[str, int]:
    valid, _, errors = validate_upload(db, tenant_id=tenant_id, kind=kind, raw_csv=raw_csv)
    created = updated = unchanged = 0
    if kind == "products":
        existing = {
            item.sku: item
            for item in db.scalars(select(Product).where(Product.tenant_id == tenant_id)).all()
        }
        for row in valid:
            item = existing.get(row["sku"])
            if not item:
                item = Product(tenant_id=tenant_id, **row)
                db.add(item)
                existing[row["sku"]] = item
                created += 1
            else:
                changed = any(
                    getattr(item, key) != value for key, value in row.items() if key != "sku"
                )
                if changed:
                    for key, value in row.items():
                        if key != "sku":
                            setattr(item, key, value)
                    updated += 1
                else:
                    unchanged += 1
    elif kind == "inventory":
        products = {
            item.sku: item
            for item in db.scalars(select(Product).where(Product.tenant_id == tenant_id)).all()
        }
        existing = {
            item.product_id: item
            for item in db.scalars(
                select(Inventory).where(
                    Inventory.tenant_id == tenant_id, Inventory.store_id == store_id
                )
            ).all()
        }
        for row in valid:
            product = products[row["sku"]]
            item = existing.get(product.id)
            values = {key: row[key] for key in ("stock_quantity", "reorder_level")}
            if not item:
                db.add(
                    Inventory(
                        tenant_id=tenant_id, store_id=store_id, product_id=product.id, **values
                    )
                )
                created += 1
            elif any(getattr(item, key) != value for key, value in values.items()):
                for key, value in values.items():
                    setattr(item, key, value)
                updated += 1
            else:
                unchanged += 1
    elif kind == "sales":
        products = {
            item.sku: item
            for item in db.scalars(select(Product).where(Product.tenant_id == tenant_id)).all()
        }
        customers = {
            item.external_customer_id: item
            for item in db.scalars(select(Customer).where(Customer.tenant_id == tenant_id)).all()
        }
        existing = {
            item.external_reference: item
            for item in db.scalars(
                select(SalesTransaction).where(
                    SalesTransaction.tenant_id == tenant_id,
                    SalesTransaction.store_id == store_id,
                    SalesTransaction.source_system == "business_upload",
                )
            ).all()
        }
        grouped: dict[str, list[dict]] = {}
        for row in valid:
            grouped.setdefault(row["order_id"], []).append(row)
        for order_id, order_rows in grouped.items():
            first = order_rows[0]
            if any(
                row["order_date"] != first["order_date"]
                or row["customer_id"] != first["customer_id"]
                or row["currency"] != first["currency"]
                for row in order_rows[1:]
            ):
                unchanged += 1
                continue
            item = existing.get(order_id)
            values = {
                "seller_id": seller_id,
                "occurred_at": first["order_date"],
                "currency": first["currency"],
                "total_amount": sum((row["amount"] for row in order_rows), Decimal("0")),
                "item_count": sum(row["quantity"] for row in order_rows),
                "status": TransactionStatus.COMPLETED,
                "notes": "Imported during business onboarding",
                "customer_id": customers[first["customer_id"]].id,
            }
            if not item:
                item = SalesTransaction(
                    tenant_id=tenant_id,
                    store_id=store_id,
                    source_system="business_upload",
                    external_reference=order_id,
                    **values,
                )
                db.add(item)
                db.flush()
                existing[order_id] = item
                created += 1
            else:
                transaction_changed = any(
                    (
                        as_utc(getattr(item, key)) != as_utc(value)
                        if key == "occurred_at"
                        else getattr(item, key) != value
                    )
                    for key, value in values.items()
                )
                for key, value in values.items():
                    setattr(item, key, value)
                updated += int(transaction_changed)
                unchanged += int(not transaction_changed)
            product_rows: dict[str, dict] = {}
            for row in order_rows:
                aggregate = product_rows.setdefault(
                    row["sku"], {"quantity": 0, "amount": Decimal("0")}
                )
                aggregate["quantity"] += row["quantity"]
                aggregate["amount"] += row["amount"]
            existing_lines = {
                line.product_id: line
                for line in db.scalars(
                    select(SalesLineItem).where(SalesLineItem.transaction_id == item.id)
                ).all()
            }
            imported_product_ids = {products[sku].id for sku in product_rows}
            for product_id, stale_line in existing_lines.items():
                if product_id not in imported_product_ids:
                    db.delete(stale_line)
            for sku, aggregate in product_rows.items():
                product = products[sku]
                line = existing_lines.get(product.id)
                if line is None:
                    db.add(
                        SalesLineItem(
                            tenant_id=tenant_id,
                            transaction_id=item.id,
                            product_id=product.id,
                            quantity=aggregate["quantity"],
                            line_amount=aggregate["amount"],
                        )
                    )
                else:
                    line.quantity = aggregate["quantity"]
                    line.line_amount = aggregate["amount"]
    else:
        existing = {
            item.external_customer_id: item
            for item in db.scalars(
                select(Customer).where(
                    Customer.tenant_id == tenant_id,
                    Customer.source_system == "business_upload",
                )
            ).all()
        }
        for row in valid:
            identifier = row.pop("customer_id")
            values = {"assigned_seller_id": seller_id, **row}
            item = existing.get(identifier)
            if not item:
                db.add(
                    Customer(
                        tenant_id=tenant_id,
                        source_system="business_upload",
                        external_customer_id=identifier,
                        **values,
                    )
                )
                created += 1
            else:
                for key, value in values.items():
                    setattr(item, key, value)
                updated += 1
    db.flush()
    return {
        "created": created,
        "updated": updated,
        "unchanged": unchanged,
        "skipped": len(errors),
    }


def seed_business_sample(db: Session, *, tenant_id: UUID, store_id: UUID, seller_id: UUID):
    product_rows = [
        ("DEMO-TSHIRT", "Classic T-Shirt", "Apparel", 42, 10, "6109", Decimal("599.00"), "BATCH-2026-A1", "2027-12-31"),
        ("DEMO-BOTTLE", "Steel Water Bottle", "Home", 8, 10, "7323", Decimal("799.00"), "BATCH-2026-B2", "2028-06-30"),
        ("DEMO-BAG", "Everyday Backpack", "Accessories", 18, 6, "4202", Decimal("1499.00"), "BATCH-2026-C3", "2029-01-15"),
        ("DEMO-LAMP", "Desk Lamp", "Home", 0, 5, "9405", Decimal("1299.00"), "BATCH-2025-X9", "2026-11-20"),
        ("DEMO-EARBUDS", "Wireless Earbuds", "Electronics", 25, 8, "8518", Decimal("2499.00"), "BATCH-2026-E5", "2027-08-31"),
    ]
    created_products = created_inventory = created_sales = created_customers = 0
    products = {}
    for sku, name, category, stock, reorder, hsn, mrp, batch_no, exp_date in product_rows:
        product = db.scalar(
            select(Product).where(Product.tenant_id == tenant_id, Product.sku == sku)
        )
        if not product:
            product = Product(
                tenant_id=tenant_id,
                sku=sku,
                name=name,
                category=category,
                hsn_code=hsn,
                unit_mrp=mrp,
                pack_size="12 Units/Box"
            )
            db.add(product)
            db.flush()
            created_products += 1
        products[sku] = product
        inventory = db.scalar(
            select(Inventory).where(
                Inventory.store_id == store_id, Inventory.product_id == product.id
            )
        )
        if not inventory:
            db.add(
                Inventory(
                    tenant_id=tenant_id,
                    store_id=store_id,
                    product_id=product.id,
                    stock_quantity=stock,
                    reorder_level=reorder,
                    batch_number=batch_no,
                    expiry_date=exp_date
                )
            )
            created_inventory += 1
    end = datetime.now(UTC).replace(hour=12, minute=0, second=0, microsecond=0)
    product_list = list(products.values())

    # Sample B2B Distributor Companies
    company_names = [
        ("Apex Traders & Wholesalers", "27AAAAA0000A1Z5", "Net 30", Decimal("250000.00"), Decimal("45000.00"), "North Zone Route"),
        ("Bliss Retail Outlets", "27BBBCC1111B1Z2", "Net 15", Decimal("150000.00"), Decimal("12500.00"), "Central Market Route"),
        ("Crest Commercial Supplies", "07CCCCD2222C1Z9", "Net 30", Decimal("300000.00"), Decimal("89000.00"), "West Express Route"),
        ("Delta General Stores", "09DDDEE3333D1Z4", "COD", Decimal("50000.00"), Decimal("0.00"), "South Hub Route"),
        ("Empire Supermarkets Ltd", "19EEEFF4444E1Z1", "Net 45", Decimal("500000.00"), Decimal("120000.00"), "East Coastal Route"),
    ]

    for index in range(45):
        reference = f"SAMPLE-{index + 1:03d}"
        transaction = db.scalar(
            select(SalesTransaction).where(
                SalesTransaction.tenant_id == tenant_id,
                SalesTransaction.store_id == store_id,
                SalesTransaction.source_system == "sample_data",
                SalesTransaction.external_reference == reference,
            )
        )
        tot_amt = Decimal(1200 + index * 85)
        cgst = (tot_amt * Decimal("0.09")).quantize(Decimal("0.01"))
        sgst = (tot_amt * Decimal("0.09")).quantize(Decimal("0.01"))
        status_choice = "overdue" if index % 5 == 0 else ("unpaid" if index % 3 == 0 else "paid")

        if not transaction:
            transaction = SalesTransaction(
                tenant_id=tenant_id,
                store_id=store_id,
                seller_id=seller_id,
                source_system="sample_data",
                external_reference=reference,
                occurred_at=end - timedelta(days=44 - index),
                currency="INR",
                total_amount=tot_amt,
                tax_amount=cgst + sgst,
                cgst_amount=cgst,
                sgst_amount=sgst,
                igst_amount=Decimal("0.00"),
                payment_status=status_choice,
                delivery_status="delivered" if status_choice == "paid" else ("out_for_delivery" if index % 2 == 0 else "pending"),
                credit_terms="Net 30",
                due_date=(end - timedelta(days=44 - index)) + timedelta(days=30),
                hsn_code="8471",
                payment_method="Bank Transfer / NEFT" if status_choice == "paid" else "Credit Ledger",
                item_count=len(product_list),
                status=TransactionStatus.COMPLETED,
                notes="B2B Wholesale Distributor Sale",
            )
            db.add(transaction)
            db.flush()
            created_sales += 1

        transaction.item_count = len(product_list)
        line_amount = Decimal(transaction.total_amount) / len(product_list)
        for product_index, product in enumerate(product_list):
            line = db.scalar(
                select(SalesLineItem).where(
                    SalesLineItem.transaction_id == transaction.id,
                    SalesLineItem.product_id == product.id,
                )
            )
            if not line:
                db.add(
                    SalesLineItem(
                        tenant_id=tenant_id,
                        transaction_id=transaction.id,
                        product_id=product.id,
                        quantity=1 + (index + product_index) // 15,
                        line_amount=line_amount,
                        created_at=transaction.occurred_at,
                        updated_at=transaction.occurred_at,
                    )
                )

    for index in range(24):
        identifier = f"SAMPLE-CUSTOMER-{index + 1:02d}"
        exists = db.scalar(
            select(Customer.id).where(
                Customer.tenant_id == tenant_id,
                Customer.source_system == "sample_data",
                Customer.external_customer_id == identifier,
            )
        )
        company_info = company_names[index % len(company_names)]
        if not exists:
            db.add(
                Customer(
                    tenant_id=tenant_id,
                    assigned_seller_id=seller_id,
                    source_system="sample_data",
                    external_customer_id=identifier,
                    company_name=f"{company_info[0]} #{index+1}",
                    gstin=company_info[1],
                    contact_phone=f"+91 98765 {10000 + index * 411}",
                    contact_email=f"accounts.client{index+1}@wholesaler.com",
                    credit_terms=company_info[2],
                    credit_limit=company_info[3],
                    outstanding_balance=company_info[4] if index % 3 != 0 else Decimal("0.00"),
                    territory_route=company_info[5],
                    location="Central Commercial Market",
                    last_purchase=end - timedelta(days=index * 7),
                    order_count=1 + index,
                    item_quantity=2 + index,
                    total_revenue=Decimal(1500 + index * 700),
                    recency_days=index * 7,
                )
            )
            created_customers += 1
    db.flush()

    sample_customers = list(
        db.scalars(
            select(Customer).where(
                Customer.tenant_id == tenant_id,
                Customer.source_system == "sample_data",
            )
        ).all()
    )
    if sample_customers:
        sample_sales = db.scalars(
            select(SalesTransaction)
            .where(
                SalesTransaction.tenant_id == tenant_id,
                SalesTransaction.store_id == store_id,
                SalesTransaction.source_system == "sample_data",
            )
            .order_by(SalesTransaction.occurred_at)
        ).all()
        for index, transaction in enumerate(sample_sales):
            transaction.customer_id = sample_customers[index % len(sample_customers)].id
    db.flush()
    return {
        "products": created_products,
        "inventory": created_inventory,
        "sales": created_sales,
        "customers": created_customers,
    }

