import argparse
import json

from sqlalchemy import select

import app.models  # noqa: F401 - Register all models with Base.metadata
from app.core.security import hash_password, utcnow
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.identity import Role, RoleCode, Store, Tenant, User, UserStatus
from app.services.identity import seed_authorization

DEMO_PASSWORD = "MarketMindDemo123!"
ADMIN_MFA_SECRET = "JBSWY3DPEHPK3PXP"
DEMO_ACCOUNTS = {
    RoleCode.BUSINESS_OWNER: "owner.demo@marketmind.example.com",
    RoleCode.STORE_MANAGER: "manager.demo@marketmind.example.com",
    RoleCode.SALES_EXECUTIVE: "sales.demo@marketmind.example.com",
    RoleCode.ADMINISTRATOR: "admin.demo@marketmind.example.com",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create local four-role demo accounts.")
    parser.add_argument("--tenant", default="hello", help="Existing tenant slug")
    parser.add_argument("--store", default="MAIN", help="Existing store code")
    parser.add_argument("--password", default=DEMO_PASSWORD)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    # Create all database tables if they do not exist yet (e.g. fresh PostgreSQL instance)
    Base.metadata.create_all(bind=engine)
    # Safely ensure column widths on PostgreSQL if tables existed from earlier run
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            if engine.dialect.name == "postgresql":
                conn.execute(text("ALTER TABLE customers ALTER COLUMN gstin TYPE VARCHAR(60);"))
                conn.execute(text("ALTER TABLE customers ALTER COLUMN company_name TYPE VARCHAR(255);"))
                conn.execute(text("ALTER TABLE customers ALTER COLUMN contact_phone TYPE VARCHAR(50);"))
                conn.execute(text("ALTER TABLE customers ALTER COLUMN contact_email TYPE VARCHAR(150);"))
                conn.execute(text("ALTER TABLE sales_transactions ALTER COLUMN payment_method TYPE VARCHAR(60);"))
    except Exception:
        pass
    with SessionLocal() as db:
        seed_authorization(db)
        tenant = db.scalar(select(Tenant).where(Tenant.slug == args.tenant))
        if not tenant:
            tenant = Tenant(
                name="MarketMind Demo Business",
                slug=args.tenant,
                currency="INR",
                timezone="Asia/Kolkata",
            )
            db.add(tenant)
            db.flush()
        store = db.scalar(
            select(Store).where(
                Store.tenant_id == tenant.id,
                Store.code == args.store,
            )
        )
        if not store:
            store = Store(
                tenant_id=tenant.id,
                name="Main Demo Store",
                code=args.store,
                timezone="Asia/Kolkata",
            )
            db.add(store)
            db.flush()
        roles = {role.code: role for role in db.scalars(select(Role)).all()}
        created = []
        for role_code, email in DEMO_ACCOUNTS.items():
            role = roles[role_code.value]
            if role_code == RoleCode.ADMINISTRATOR:
                existing_admin = db.scalar(select(User).where(User.role_id == role.id))
                if existing_admin:
                    created.append({"role": role.name, "email": existing_admin.email})
                    continue
            legacy_email = email.replace(".example.com", ".local")
            user = db.scalar(select(User).where(User.email.in_([email, legacy_email])))
            if not user:
                user = User(
                    tenant_id=tenant.id,
                    email=email,
                    full_name=role.name,
                    password_hash=hash_password(args.password),
                    role_id=role.id,
                    status=UserStatus.ACTIVE,
                    email_verified_at=utcnow(),
                    password_changed_at=utcnow(),
                )
                db.add(user)
            user.tenant_id = tenant.id
            user.email = email
            user.store_id = None if role_code == RoleCode.ADMINISTRATOR else store.id
            user.role_id = role.id
            user.status = UserStatus.ACTIVE
            user.password_hash = hash_password(args.password)
            user.failed_login_count = 0
            user.locked_until = None
            if role_code == RoleCode.ADMINISTRATOR:
                user.mfa_secret = ADMIN_MFA_SECRET
                user.mfa_enabled = True
            if role_code == RoleCode.BUSINESS_OWNER:
                owner_id = user.id
            created.append({"role": role.name, "email": email})
        
        # Auto-seed sample products, sales, inventory and recommendations for demo tenant
        try:
            from app.services.onboarding import seed_business_sample
            owner_user = db.scalar(select(User).where(User.tenant_id == tenant.id, User.email == DEMO_ACCOUNTS[RoleCode.BUSINESS_OWNER]))
            if owner_user:
                seed_business_sample(db, tenant_id=tenant.id, store_id=store.id, seller_id=owner_user.id)
        except Exception:
            pass

        db.commit()
        print(
            json.dumps(
                {
                    "tenant": tenant.slug,
                    "store": store.code,
                    "password": args.password,
                    "admin_mfa_secret": ADMIN_MFA_SECRET,
                    "accounts": created,
                },
                indent=2,
            )
        )


if __name__ == "__main__":
    main()
