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
        with engine.begin() as conn:
            for table_name, table in Base.metadata.tables.items():
                if table_name not in existing_tables:
                    continue
                existing_cols = {col["name"] for col in inspector.get_columns(table_name)}
                for col in table.columns:
                    if col.name not in existing_cols:
                        col_type = col.type.compile(engine.dialect)
                        alter_query = f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type}"
                        conn.execute(text(alter_query))
    except Exception:
        pass


def bootstrap() -> None:
    Base.metadata.create_all(bind=engine)
    auto_migrate_schema()
    with SessionLocal() as db:
        seed_authorization(db)
        if not settings.initial_admin_email or not settings.initial_admin_password:
            return

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

        # Seed sample data for marketmind-platform tenant if empty
        try:
            from app.services.onboarding import seed_business_sample
            owner = db.scalar(select(User).where(User.tenant_id == tenant.id, User.email == "owner@business.com"))
            if owner:
                seed_business_sample(db, tenant_id=tenant.id, store_id=store.id, seller_id=owner.id)
                db.commit()
        except Exception:
            pass


if __name__ == "__main__":
    bootstrap()
