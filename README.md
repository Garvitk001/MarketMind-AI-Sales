# 🚀 MarketMind AI — Enterprise Sales Intelligence & Business Copilot Platform

[![Live Frontend App](https://img.shields.io/badge/Live%20Frontend-Vercel%20Application-success?style=for-the-badge&logo=vercel)](https://marketmind-ai-sales.vercel.app)
[![Database](https://img.shields.io/badge/Cloud%20Database-Neon%20PostgreSQL-336791?style=for-the-badge&logo=postgresql)](https://neon.tech)
[![Python Version](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python)](https://python.org)
[![React Version](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev)

> **MarketMind AI (v2.5)** is a full-stack, enterprise-grade AI sales intelligence, customer retention, inventory management, demand forecasting, employee activity audit, and conversational business copilot platform engineered specifically for small and medium retail and wholesale enterprises.

---

## 🌐 Live Deployments & Application Links

| Component | Platform | Direct Live Link |
| :--- | :--- | :--- |
| **Frontend Web Application** | **Vercel** | 🔗 **[https://marketmind-ai-sales.vercel.app](https://marketmind-ai-sales.vercel.app)** |


---

## 👤 About the Project & Developer
- **Project**: MarketMind AI — Small Business Sales Intelligence & AI Copilot
- **Author**: Garvit ([@Garvitk001](https://github.com/Garvitk001))
- **Live Frontend App**: [https://marketmind-ai-sales.vercel.app](https://marketmind-ai-sales.vercel.app)
- **Repository**: [Team_1_Small_Biz_Sales_AI](https://github.com/springboardmentor24052s-tech/Team_1_Small_Biz_Sales_AI)

---

## 🌟 Key Platform Features

### 🏢 1. Role-Aware Operational Workspaces & Dashboards
- **Business Owner Workspace**: Executive KPI monitoring, dynamic revenue trends, profit margins, active customers, average order value (AOV), sales distribution, team telemetry, and strategic AI growth insights.
- **Store Manager Workspace**: Real-time store inventory levels, manual product CRUD (Add, Edit, Delete), low-stock threshold triggers, automated supplier purchase order generation, and point-of-sale (POS) terminal entry.
- **Sales Executive Workspace**: Personal sales pipeline tracking, daily customer transactions, quota pace indicators, target comparisons, and customer relationship management.

### ⏱️ 2. Individual Sales Executive Telemetry & Timeframe Analysis
- **Configurable Time Horizons**: Business Owners can analyze individual sales executive performance across **Today**, **Yesterday**, **7 Days**, **30 Days**, and **6 Months**.
- **Real-Time Staff Telemetry**: Period revenue, closed invoices, units sold, average ticket size (AOV), target progress bars, and growth comparisons.
- **Dual View Modes**: Interactive Grid Cards view and comparison Table view.

### 🔍 3. 60-Day Employee Task & Activity Audit Trail
- **Comprehensive History**: When the Business Owner clicks **"Inspect History"** or **"Analyse"** on any Store Manager or Sales Executive, the system surfaces a 60-day chronological action audit log.
- **Tracked Staff Actions**:
  - **Sales Executives**: Invoices generated, paid bills, unpaid/credit orders, payment status changes ("Mark as Paid").
  - **Store Managers**: Products added, catalog edits, product deletions, inventory stock adjustments.
  - **Security & Authentication**: Staff login sessions, role/store assignments, and revenue target updates.
- **Instant Category Filtering**: Filter audit trails by *All Tasks*, *Billing & Payments*, *Inventory & Stock*, and *Logins & Auth*.

### 💳 4. Credit Receivables Aging (7-Day & 15-Day Limits)
- **Structured Aging Buckets**:
  - **`0–7 Days`**: Current credit terms.
  - **`8–15 Days`**: Due soon / payment reminder window.
  - **`15+ Days (Overdue)`**: Overdue receivables requiring automated collection follow-up.
- **Real-Time Payment Visibility**: When a Store Manager or Sales Executive updates or marks a bill as paid, the changes reflect immediately in the Owner's credit ledger and dashboard.

### 🤖 5. Interactive AI Business Copilot
- **Conversational Assistant**: Domain personas (Executive Strategist, Inventory & Operations Optimizer, Customer Retention Specialist, and Data Analyst).
- **Context-Aware Insights**: Responds with actionable business suggestions, cross-sell ideas, replenishment strategies, and financial analysis.
- **Bilingual Support**: Real-time language switching between **English** and **Hindi (`हिन्दी`)**.

### 🛒 6. AI Product Recommender Engine
- **Collaborative & Association Rule Mining**: Generates high-confidence product affinity, cross-selling, and up-selling recommendations based on transaction co-occurrence.
- **Customer-Specific Recommendations**: Dynamic recommendations tailored to individual customer purchasing history and affinity scores.
- **Affinity Analytics & Revenue Uplift**: Actionable bundle suggestions with estimated revenue uplift and conversion potential.

### 👥 7. Customer Retention & Churn Analytics (Customer 360)
- **RFM Segmentation**: Multi-dimensional Recency, Frequency, and Monetary value clustering to classify customers into Champions, Loyal, At Risk, and Hibernating tiers.
- **Predictive Churn Risk Scoring**: Identifies revenue-at-risk customers before churn occurs.
- **Integrated Outreach Workflows**: One-click communication triggers via pre-formatted Email and WhatsApp templates.
- **Customer 360 Profile**: Historical order timeline, favorite categories, lifetime value (LTV), and personalized re-engagement recommendations.

### 🛡️ 8. Anomaly Detection & Business Safeguards
- **Multi-Factor Anomaly Engine**: Detects unusual revenue drops, sudden transaction spikes, inventory discrepancies, and irregular discount patterns.
- **Severity Filtering & Triage**: Categorizes anomalies by severity (`Critical`, `Warning`, `Info`) with sensitivity tuning.
- **Resolution Workflow**: Audit-logged acknowledge, investigate, and resolve workflow to track issue mitigation.

### 📦 9. Inventory & Supplier Purchase Orders
- **Automated Stock Level Monitoring**: Visual safety-stock thresholds and reorder triggers.
- **Supplier PO Generator**: Generates formal purchase orders with supplier contact data, line-item quantities, and unit costs.
- **Manual Product CRUD**: Direct addition, editing, and deletion of products and stock units.
- **Export & Delivery**: Instant export to CSV and formatted printable documentation for supplier communication.

### 📈 10. Predictive Forecasting & Analytics Reports
- **Multi-Model Forecast Engine**: Powered by XGBoost, Prophet, and Linear Trend algorithms.
- **Multi-Horizon Predictions**: Configurable forecast horizons (**7, 14, and 30 days**) for business revenue and SKU-level product demand.
- **Model Health & Lineage**: Chronological train/validation splits, MAE/RMSE/R² metrics, and baseline improvement gates.
- **Statutory Billing & GST Invoices**: Automated generation of GST-compliant A5 Wholesale Thermal and Laser invoices with CGST/SGST/IGST breakdowns.
- **Executive CSV Export**: One-click download of revenue summaries, sales ledgers, and inventory reports.

---

## 🔒 Enterprise Security & Resilience

- **Tenant Data Isolation**: Strict boundary between business accounts. New registrations start with clean, private workspaces while sample data is isolated to demo accounts.
- **Email OTP Verification & Resend API**: Real-time 6-digit OTP verification powered by Resend API and SMTP dispatchers for registration and password resets.
- **Tiered Rate Limiting**: In-memory token bucket rate limiter protecting Authentication (`10 req/min`), Public (`30 req/min`), and Authenticated (`120 req/min`) routes with automated `Retry-After` headers.
- **Zero-Leakage Error Handling**: Sanitized global exception handlers for database (`SQLAlchemyError`) and internal runtime errors with server-side correlation IDs preventing internal schema leakage.
- **File Upload Protection**: Avatar image uploads verified using magic-byte file signature validation (`image/png`, `image/jpeg`, `image/webp`) with a 2MB size cap.
- **Modern Authentication & Authorization**: Argon2id password hashing, rotating JWT access and refresh sessions, and secure employee invitations.

---

## 📁 Repository Structure

```text
Team_1_Small_Biz_Sales_AI/
├── backend/
│   ├── alembic/              # Database migration definitions
│   ├── app/
│   │   ├── api/v1/           # REST API endpoints (auth, sales, inventory, team, forecasts, etc.)
│   │   ├── core/             # Security, rate limiting, JWT, config & CORS
│   │   ├── db/               # SQLAlchemy session management and base model
│   │   ├── models/           # Identity, inventory, sales, customer & ML database models
│   │   ├── schemas/          # Pydantic validation schemas
│   │   ├── services/         # Business logic, ML models, and Resend/SMTP email dispatchers
│   │   ├── commands/         # CLI commands for data seeding and model imports
│   │   ├── bootstrap.py      # Role/permission seed script
│   │   └── main.py           # FastAPI application entry point
│   ├── tests/                # Comprehensive Pytest automated test suite
│   ├── requirements.txt      # Python dependencies
│   └── pyproject.toml
│
├── frontend/
│   ├── src/
│   │   ├── components/       # Dashboards, auth modals, and operational modules
│   │   ├── context/          # Auth, Language, Toast, and Notification contexts
│   │   ├── services/         # Axios API clients with auto token refresh
│   │   └── test/             # Frontend Vitest & React Testing Library test suites
│   ├── package.json
│   └── vite.config.js
│
├── preprocessing/            # ML training pipelines, data cleaning & feature engineering
├── data/                     # Sample datasets and generated model artifacts
├── docs/                     # Architectural documentation and project blueprints
└── README.md
```

---

## 🚀 Quickstart — Run Locally

### Prerequisites
- **Python 3.10+** (Python 3.12 recommended)
- **Node.js 18.x or 20.x** & **npm**
- **Git**

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/springboardmentor24052s-tech/Team_1_Small_Biz_Sales_AI.git
cd Team_1_Small_Biz_Sales_AI
```

---

### Step 2: Start the Backend Service

Open a terminal in the `backend/` directory:

```bash
cd backend
```

#### Windows (PowerShell)
```powershell
# Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment configuration
Copy-Item .env.example .env

# Seed initial evaluation database & demo accounts
python -m app.commands.seed_demo

# Start the FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### macOS / Linux (Bash)
```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment configuration
cp .env.example .env

# Seed initial evaluation database & demo accounts
python -m app.commands.seed_demo

# Start the FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Backend API Base**: `http://127.0.0.1:8000`
- **Interactive Swagger Documentation**: `http://127.0.0.1:8000/api/v1/docs`

---

### Step 3: Start the Frontend Application

Open a second terminal in the `frontend/` directory:

```bash
cd frontend
```

#### Windows (PowerShell)
```powershell
# Create environment configuration
Copy-Item .env.example .env

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

#### macOS / Linux (Bash)
```bash
# Create environment configuration
cp .env.example .env

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

- **Frontend Application URL**: `http://localhost:5173/`

---

## 🧪 Testing & Quality Verification

MarketMind maintains an extensive, fully automated test suite across backend and frontend stacks.

### Automated Test Suite Execution

#### Backend Tests (Pytest)
```powershell
cd backend
pytest -v
```

#### Frontend Tests (Vitest)
```powershell
cd frontend
npm run test:run
```

### Test Suite Results

| Test Category | Suite Coverage | Passed | Failed | Pass Rate |
|:---|:---|:---:|:---:|:---:|
| **Backend API & Core** | Auth, RBAC, Rate Limiting, File Safety, Forecasting, Recommendations, Anomaly, Churn, Team | **48** | 0 | **100%** |
| **Frontend UI & Services** | Auth Context, Token Refresh, Error States, Recommender, Anomaly Actions, Forecasting Views | **31** | 0 | **100%** |
| **Total Automated Tests** | End-to-end integration and unit verification | **79** | **0** | **100%** |

### Additional Quality Checks
- **Frontend Code Quality**: `0 ESLint errors`, `0 npm audit vulnerabilities`
- **Production Build**: Production bundle compilation succeeds cleanly with `npm run build`.
- **Database Integrity**: Clean Alembic migration schemas with SQLite (local) and Neon PostgreSQL (cloud) compatibility.

---

## 🧰 Technology Stack

### Frontend
- **Framework**: React 18 (Vite SPA)
- **Styling**: Vanilla CSS & Tailwind CSS (Custom Indian-inspired theme tokens & dark mode)
- **Icons**: Lucide React
- **Data Visualization**: Recharts & Custom SVG metric cards
- **Testing**: Vitest, React Testing Library, jsdom

### Backend
- **Framework**: FastAPI (Asynchronous Python REST API)
- **ORM & Database**: SQLAlchemy 2.0, Alembic, SQLite (dev) / Neon PostgreSQL (prod)
- **Validation**: Pydantic v2
- **Security**: Argon2id (`passlib`), PyJWT, In-memory Token-Bucket Rate Limiter
- **Email Delivery**: Resend API & SMTP Dispatcher
- **Testing**: Pytest, HTTPX, Pytest-Cov

### Machine Learning & Analytics
- **Algorithms**: Scikit-Learn, XGBoost, Prophet, Pandas, NumPy
- **Capabilities**: RFM Segmentation, Association Rule Mining, Multi-Horizon Time Series Demand/Revenue Forecasting, Statistical & Isolation Forest Anomaly Detection

---

## 👥 Project Summary

MarketMind AI combines predictive AI analytics, inventory control, automated GST invoicing, customer churn prevention, 60-day employee task audit trails, and an interactive business copilot into a unified, secure platform built for small-to-medium retail and wholesale enterprises.
