# MarketMind AI — Backend Service

[![Backend API Docs](https://img.shields.io/badge/Backend%20API-Render%20Swagger-blue?style=for-the-badge&logo=fastapi)](https://marketmind-backend.onrender.com/api/v1/docs)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2F%20SQLite-336791?style=for-the-badge&logo=postgresql)](https://neon.tech)
[![Python Version](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python)](https://python.org)

FastAPI asynchronous backend service powering MarketMind AI. Provides multi-tenant data isolation, role-based access control (RBAC), database-backed business dashboards, customer analytics, product recommendations, anomaly detection, inventory management, 60-day employee task audit logs, and multi-horizon demand/revenue forecasting.

---

## 🌐 Live Production API & Documentation

- **Live Backend Base URL**: [https://marketmind-backend.onrender.com/api/v1](https://marketmind-backend.onrender.com/api/v1)
- **Interactive Swagger Documentation**: [https://marketmind-backend.onrender.com/api/v1/docs](https://marketmind-backend.onrender.com/api/v1/docs)
- **ReDoc Interactive Reference**: [https://marketmind-backend.onrender.com/api/v1/redoc](https://marketmind-backend.onrender.com/api/v1/redoc)

---

## 🌟 Capabilities & Architecture

- **Multi-Tenant Data Isolation**: Robust tenant, store, and employee-level isolation enforced across all database queries and endpoints. New businesses start with private empty workspaces, while sample data is isolated to demo accounts.
- **Enterprise Authentication & Security**:
  - Argon2id password hashing and account lockout mechanisms.
  - Short-lived JWT access tokens and rotating, revocable refresh sessions.
  - 6-digit cryptographic verification codes for registration and password resets (powered by **Resend API** and SMTP).
  - Multi-tier in-memory rate limiting with exponential backoff headers.
  - Global sanitized error handling with server-side correlation IDs (preventing internal schema exposure).
  - Safe file upload handling with magic-byte image validation and strict CSV inspection.
- **Role-Based Access Control (RBAC)**:
  - **Business Owner**: Comprehensive tenant-wide revenue analytics, inventory control, team management, 60-day employee audit logs, AI Copilot, and business forecasting.
  - **Store Manager**: Store-scoped inventory management, stock alerts, manual product addition/editing/deletion, supplier purchase order generation, and store demand forecasts.
  - **Sales Executive**: Scoped personal transaction logging, customer assignments, quota tracking, point-of-sale billing, and personal sales forecasting.
- **Machine Learning & Analytics Pipelines**:
  - **RFM Customer Segmentation & Churn Analytics**: Recency, Frequency, and Monetary value clustering with actionable retention insights.
  - **AI Recommender**: Product affinity, cross-selling, and up-selling recommendations based on transaction co-occurrence.
  - **Forecasting Engine**: Multi-horizon revenue and demand predictions (7, 14, 30 days) using XGBoost, Prophet, and Linear Trend models with chronological validation.
  - **Anomaly Detection**: Real-time sales and inventory anomaly identification with severity triage and resolution workflows.
- **60-Day Employee Task Audit Engine**:
  - Aggregates system audit events (`AuditEvent`) and sales transaction logs (`SalesTransaction`) over a configurable 60-day sliding window.
  - Tracks invoices generated, marked paid, products added, catalog edits, deleted items, inventory stock changes, and authentication sessions.
- **B2B Wholesale & Retail Operations**:
  - Atomic POS transaction processing with line-item discounts, inventory deduction, and customer updates.
  - Credit receivables aging tracking (**0–7 Days**, **8–15 Days**, and **15+ Days Overdue**).
  - GST-compliant invoice generation and automated supplier purchase order drafting.

---

## 📁 Layout

```text
backend/
├── alembic/                 # Database migrations
├── app/
│   ├── api/
│   │   ├── dependencies.py  # Auth, rate limiting, and permission guards
│   │   └── v1/              # API route controllers (auth, sales, inventory, team, forecasts, etc.)
│   ├── core/                # Settings, rate limiter, security, and hashing
│   ├── db/                  # SQLAlchemy base and session manager
│   ├── models/              # Relational models (users, stores, sales, inventory, ML)
│   ├── schemas/             # Pydantic request/response validation schemas
│   ├── services/            # Business logic, ML inference, and Resend/SMTP email dispatchers
│   ├── commands/            # CLI commands for data seeding and model imports
│   ├── bootstrap.py         # Initial role and permission setup
│   └── main.py              # Application entry point & exception handlers
├── tests/                   # Automated Pytest test suite
├── requirements.txt
└── pyproject.toml
```

---

## 🔌 API Endpoint Highlights

| Module | Endpoint | Methods | Description |
| :--- | :--- | :---: | :--- |
| **Auth & Identity** | `/api/v1/auth/register`, `/login`, `/refresh`, `/otp/verify` | `POST` | Tenant registration, OTP email verification, rotating JWT sessions |
| **Team Management** | `/api/v1/team/overview` | `GET` | Performance overview, sales metrics, quota tracking across timeframes |
| **Employee Audit** | `/api/v1/team/employees/{id}/activity-logs` | `GET` | 60-day chronological action audit log (billing, inventory, security) |
| **Sales & Billing** | `/api/v1/sales/transactions`, `/dashboard` | `GET`, `POST`, `PATCH` | POS transaction processing, payment status ("Mark as Paid"), credit aging |
| **Inventory & POs** | `/api/v1/inventory/items`, `/purchase-orders` | `GET`, `POST`, `PUT`, `DELETE` | Product catalog CRUD, stock level updates, supplier purchase orders |
| **AI Copilot** | `/api/v1/copilot/message`, `/history` | `POST`, `GET` | Bilingual conversational business copilot with domain personas |
| **Forecasting** | `/api/v1/forecasts/revenue`, `/demand` | `GET`, `POST` | 7, 14, 30-day predictive revenue and SKU demand forecasts |
| **Recommendations** | `/api/v1/recommendations/products`, `/bundles` | `GET` | Real-time cross-sell, up-sell, and affinity basket recommendations |
| **Anomaly Engine** | `/api/v1/anomalies/events`, `/{id}/resolve` | `GET`, `PATCH` | Multi-factor anomaly detection with triage resolution workflows |
| **Customer Churn** | `/api/v1/churn/customers`, `/summary` | `GET` | RFM customer segmentation and predictive churn risk scoring |

---

## 🚀 Running Locally

### 1. Environment Setup

```powershell
# Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Copy example configuration
Copy-Item .env.example .env
```

### 2. Database Initialization & Seeding

```powershell
# Run database migrations
alembic upgrade head

# Seed initial roles and demo dataset
python -m app.commands.seed_demo
```

### 3. Start the Server

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **API Base URL**: `http://127.0.0.1:8000`
- **Swagger Documentation**: `http://127.0.0.1:8000/api/v1/docs`
- **Health Check**: `http://127.0.0.1:8000/api/v1/health/ready`

---

## 🧪 Testing & Code Quality

Run the backend automated test suite:

```powershell
pytest -v
```

Run code formatting and lint checks:

```powershell
ruff check app tests
ruff format --check app tests
```

---

## 🔒 Security & Environment Variables

- Set `MARKETMIND_JWT_SECRET` in `.env` to a secure 32+ character random string.
- Configure `MARKETMIND_RESEND_API_KEY` and `MARKETMIND_RESEND_FROM_EMAIL` (or SMTP credentials) for live email delivery and OTP verification.
- In production, configure `MARKETMIND_DATABASE_URL` with your cloud PostgreSQL connection string (e.g., Neon).
