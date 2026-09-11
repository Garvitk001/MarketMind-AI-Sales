from sqlalchemy import inspect, select, text

from app.core.config import settings
from app.core.security import hash_password, utcnow
from app.db.base import Base
from app.db.session import SessionLocal, engine
import app.models  # ensure all models are loaded
from app.models.identity import Role, RoleCode, Tenant, User, UserStatus
from app.services.identity import normalize_email, seed_authorization


def auto_migrate_schema() -> None:
    """Safely detect and add any missing columns across all tables on startup."""
    try:
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        dialect_name = engine.dialect.name

        # Explicitly ensure all statutory B2B invoice and client columns exist
        explicit_columns = [
            # sales_transactions table
            ("sales_transactions", "subtotal_amount", "NUMERIC(14, 2)"),
            ("sales_transactions", "discount_amount", "NUMERIC(14, 2)"),
            ("sales_transactions", "tax_amount", "NUMERIC(14, 2)"),
            ("sales_transactions", "cgst_amount", "NUMERIC(14, 2)"),
            ("sales_transactions", "sgst_amount", "NUMERIC(14, 2)"),
            ("sales_transactions", "igst_amount", "NUMERIC(14, 2)"),
            ("sales_transactions", "payment_method", "VARCHAR(60)"),
            ("sales_transactions", "payment_status", "VARCHAR(30) DEFAULT 'paid'"),
            ("sales_transactions", "delivery_status", "VARCHAR(30) DEFAULT 'pending'"),
            ("sales_transactions", "credit_terms", "VARCHAR(50) DEFAULT 'Net 30'"),
            ("sales_transactions", "due_date", "TIMESTAMP WITH TIME ZONE"),
            ("sales_transactions", "hsn_code", "VARCHAR(30) DEFAULT '8471'"),
            ("sales_transactions", "customer_id", "UUID"),
            ("sales_transactions", "customer_snapshot", "JSON" if dialect_name != "postgresql" else "JSONB"),
            # sales_line_items table
            ("sales_line_items", "unit_price", "NUMERIC(14, 2)"),
            ("sales_line_items", "discount_amount", "NUMERIC(14, 2) DEFAULT 0"),
            # customers table
            ("customers", "gstin", "VARCHAR(60)"),
            ("customers", "company_name", "VARCHAR(255)"),
            ("customers", "contact_phone", "VARCHAR(50)"),
            ("customers", "contact_email", "VARCHAR(150)"),
            ("customers", "credit_limit", "NUMERIC(14, 2) DEFAULT 250000.00"),
            ("customers", "outstanding_balance", "NUMERIC(14, 2) DEFAULT 0.00"),
            ("customers", "credit_terms", "VARCHAR(50) DEFAULT 'Net 30'"),
            ("customers", "territory_route", "VARCHAR(150) DEFAULT 'Central Market Route'"),
            ("customers", "location", "VARCHAR(255) DEFAULT 'Central Commercial Market'"),
        ]

        with engine.begin() as conn:
            for tbl, col, col_def in explicit_columns:
                if tbl in existing_tables:
                    try:
                        if dialect_name == "postgresql":
                            conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS {col} {col_def};"))
                        else:
                            conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} {col_def};"))
                    except Exception:
                        pass

        # Ensure column length widenings on PostgreSQL if existing tables were created with shorter lengths
        if dialect_name == "postgresql":
            widen_statements = [
                "ALTER TABLE customers ALTER COLUMN gstin TYPE VARCHAR(60);",
                "ALTER TABLE customers ALTER COLUMN company_name TYPE VARCHAR(255);",
                "ALTER TABLE customers ALTER COLUMN contact_phone TYPE VARCHAR(50);",
                "ALTER TABLE customers ALTER COLUMN contact_email TYPE VARCHAR(150);",
                "ALTER TABLE customers ALTER COLUMN location TYPE VARCHAR(255);",
                "ALTER TABLE sales_transactions ALTER COLUMN payment_method TYPE VARCHAR(60);",
                "ALTER TABLE sales_transactions ALTER COLUMN delivery_status TYPE VARCHAR(30);",
                "ALTER TABLE sales_transactions ALTER COLUMN payment_status TYPE VARCHAR(30);",
            ]
            for stmt in widen_statements:
                try:
                    with engine.begin() as conn:
                        conn.execute(text(stmt))
                except Exception:
                    pass

        for table_name, table in Base.metadata.tables.items():
            if table_name not in existing_tables:
                continue
            try:
                existing_cols = {col["name"] for col in inspector.get_columns(table_name)}
            except Exception:
                existing_cols = set()

            for col in table.columns:
                if col.name not in existing_cols:
                    try:
                        col_type = col.type.compile(engine.dialect)
                        col_type_str = str(col_type)
                        with engine.begin() as conn:
                            if dialect_name == "postgresql":
                                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col.name} {col_type_str}"))
                            else:
                                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type_str}"))
                    except Exception:
                        pass
    except Exception:
        pass


def bootstrap() -> None:
    Base.metadata.create_all(bind=engine)
    auto_migrate_schema()
    with SessionLocal() as db:
        try:
            seed_authorization(db)
        except Exception:
            db.rollback()

        if not settings.initial_admin_email or not settings.initial_admin_password:
            return

        try:
            email = normalize_email(settings.initial_admin_email)
            if db.scalar(select(User.id).where(User.email == email)):
                return

            tenant = db.scalar(select(Tenant).where(Tenant.slug == "marketmind-platform"))
            if not tenant:
                tenant = Tenant(
                    name="MarketMind Platform",
                    slug="marketmind-platform",
                    currency="INR",
                    timezone="Asia/Kolkata",
                )
                db.add(tenant)
                db.flush()

            from app.models.identity import Store
            store = db.scalar(select(Store).where(Store.tenant_id == tenant.id))
            if not store:
                store = Store(
                    tenant_id=tenant.id,
                    name="Main Store",
                    code="MAIN",
                    timezone="Asia/Kolkata",
                )
                db.add(store)
                db.flush()

            roles = {r.code: r for r in db.scalars(select(Role)).all()}
            
            # Standard login accounts
            demo_accounts = [
                (RoleCode.BUSINESS_OWNER, "owner@business.com", "Business Owner", "owner123"),
                (RoleCode.STORE_MANAGER, "manager@store.com", "Store Manager", "manager123"),
                (RoleCode.SALES_EXECUTIVE, "sales@team.com", "Sales Executive", "sales123"),
                (RoleCode.ADMINISTRATOR, "admin@system.com", "Administrator", "admin123"),
                (RoleCode.BUSINESS_OWNER, "owner.demo@marketmind.example.com", "Demo Owner", "MarketMindDemo123!"),
                (RoleCode.STORE_MANAGER, "manager.demo@marketmind.example.com", "Demo Manager", "MarketMindDemo123!"),
            ]

            owner_user = None
            for role_code, user_email, full_name, pwd in demo_accounts:
                existing = db.scalar(select(User).where(User.email == user_email))
                if not existing and role_code.value in roles:
                    r = roles[role_code.value]
                    u = User(
                        tenant_id=tenant.id,
                        store_id=None if role_code == RoleCode.ADMINISTRATOR else store.id,
                        role_id=r.id,
                        email=user_email,
                        full_name=full_name,
                        password_hash=hash_password(pwd, validate=False),
                        status=UserStatus.ACTIVE,
                        email_verified_at=utcnow(),
                        password_changed_at=utcnow(),
                    )
                    db.add(u)
                    if role_code == RoleCode.BUSINESS_OWNER and not owner_user:
                        owner_user = u

            db.commit()
        except Exception:
            db.rollback()

        # Seed sample data for marketmind-platform tenant if empty
        try:
            from app.services.onboarding import seed_business_sample
            owner = db.scalar(select(User).where(User.tenant_id == tenant.id, User.email == "owner@business.com"))
            if owner:
                seed_business_sample(db, tenant_id=tenant.id, store_id=store.id, seller_id=owner.id)
                db.commit()
        except Exception:
            db.rollback()


if __name__ == "__main__":
    bootstrap()
