# 🚀 MarketMind AI — Indian Small Business & Enterprise Sales Intelligence Platform

[![Live Frontend App](https://img.shields.io/badge/Live%20Frontend-Vercel%20Application-success?style=for-the-badge&logo=vercel)](https://marketmind-ai-sales.vercel.app)
[![Database](https://img.shields.io/badge/Cloud%20Database-Neon%20PostgreSQL-336791?style=for-the-badge&logo=postgresql)](https://neon.tech)
[![Python Version](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python)](https://python.org)
[![React Version](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Vyapar AI](https://img.shields.io/badge/India%20First-Vyapar%20Sales%20AI-F59E0B?style=for-the-badge)](https://marketmind-ai-sales.vercel.app)

> **MarketMind AI (v2.7)** is a full-stack, enterprise-grade AI sales intelligence, customer retention, multi-store inventory procurement, demand forecasting, employee activity audit, and conversational business copilot platform engineered specifically for Indian retail, wholesale, and small-to-medium enterprises (MSMEs).

---

## 🌐 Live Deployments & Application Links

| Component | Platform | Direct Live Link |
| :--- | :--- | :--- |
| **Frontend Web Application** | **Vercel** | 🔗 **[https://marketmind-ai-sales.vercel.app](https://marketmind-ai-sales.vercel.app)** |

---

## 👤 About the Project & Developer
- **Project**: MarketMind AI — Indian Small Business Sales Intelligence & AI Vyapar Copilot
- **Author**: Garvit ([@Garvitk001](https://github.com/Garvitk001))
- **Personal Repository**: [MarketMind-AI-Sales](https://github.com/Garvitk001/MarketMind-AI-Sales)
- **Team Repository**: [Team_1_Small_Biz_Sales_AI](https://github.com/springboardmentor24052s-tech/Team_1_Small_Biz_Sales_AI)

---

## 🎨 Authentic Indian Small Business (Vyapar) Identity & Modern Design
MarketMind AI features an authentic, custom-designed logo and high-end visual design system rooted in the Indian retail ecosystem:
- **Modern Typography**: High-grade geometric typography powered by `Plus Jakarta Sans` for clean data readability and `Outfit` for bold commercial headings and brand elements.
- **Dukaan Awning & Arch Silhouette**: Symbolizes traditional storefronts, merchant resilience, and commercial trust.
- **Indian Rupee (`₹`) Symbol Integration**: Embeds native Indian currency and commercial vitality into the core emblem.
- **Ascending Sales Momentum Wave**: Represents sustainable business growth, accurate AI forecasting, and operational clarity.
- **Warm Saffron, Gold & Royal Indigo Palette**: Conveys prosperity, stability, and modern technological capability.

---

## 🌟 Key Platform Features

### 🏢 1. Role-Aware Operational Workspaces & Dashboards
- **Business Owner Workspace**: Executive KPI monitoring, dynamic revenue trends, profit margins, active customer counts, average order value (AOV), sales distribution, team telemetry, purchase order authorization hub, and strategic AI growth insights.
- **Store Manager Workspace**: Real-time store inventory tracking, branch filtering, manual product CRUD (Add, Edit, Delete), low-stock safety triggers, 2-step purchase order drafting, and supplier email dispatching.
- **Sales Executive Workspace**: Personal sales pipeline tracking, daily customer transactions, quota pace indicators, target progress, and B2B customer relationship management.
- **Platform Administrator Console**: Full governance center with live multi-tenant business directories, authentication/login audit stream, AI model retrain schedules, and real-time error diagnostics.

### 📋 2. 2-Step Purchase Order (PO) Procurement & Approval Workflow
- **Store Manager PO Drafting**: Store Managers can identify low-stock items and raise formal PO requests specifying suggested quantities, estimated unit costs, and justification notes.
- **Owner Decision Hub**:
  - **Quick Approve**: Authorizes the PO with one click, transitioning status to `Approved & Dispatched`.
  - **Edit & Approve**: Owners can calibrate quantities (e.g. reduce due to budget limits), adjust negotiated unit rates, update suppliers, and attach feedback remarks before authorization.
  - **Reject with Guidance**: Declines unviable requests with mandatory constructive guidance notes for the store manager.
- **PO Dispatch & Supplier Emailing**: Instant CSV export of commercial purchase orders and integrated `mailto:` supplier email dispatching.

### 🌐 3. Comprehensive Multilingual Engine (English & हिन्दी)
- **Complete Dashboard Localization**: 150+ dictionary keys covering metric cards, navigation items, table columns, action buttons, payment methods, order statuses, and time filters.
- **Persistent Language Preference**: Seamless real-time switching between English and Hindi (`हिन्दी`) with automatic state persistence.

### 🛡️ 4. Dynamic Role Onboarding & Email Conflict Protection
- **Role-Specific Onboarding**: Dynamic registration headers tailored to *Business Owner*, *Store Manager*, or *Sales Executive* with visible role selection badges.
- **Cross-Role Collision Detection**: Proactively detects existing credentials across roles and alerts users with clear guidance rather than failing silently or causing unexpected role escalation.
- **Mandatory Email OTP Verification**: 6-digit one-time password verification triggered via Resend API / SMTP before account access is granted.

### 💳 5. Flexible Sales & Payment Method Filtering
- **Multi-Rail Payment Filtering**: Case-insensitive and alias matching for Indian payment methods:
  - **UPI / QR Code**
  - **Cash on Delivery (COD)**
  - **Bank Transfer / NEFT / RTGS**
  - **Credit Ledger / Udhar Khata**
- **Credit Receivables Aging (7-Day & 15-Day Limits)**: Automated tracking of current (0–7 days), due soon (8–15 days), and overdue (15+ days) credit accounts.

### 👥 6. B2B Client Directory & Deep Search Persistence
- **Comprehensive Multi-Field Search**: Searches across Company Name, Contact Name, Email, Phone Number, GSTIN, and Customer ID.
- **Immediate State Consistency**: Newly created B2B clients persist in search results with real-time customer count synchronization.

### 🛒 7. Dynamic AI Product Recommender Engine
- **Dynamic Catalog Synchronization**: Recommendation categories and filters are populated dynamically from live catalog data, eliminating category mismatch bugs.
- **Multi-Level Matching**: Supports customer lookup by UUID or external code with customizable recommendation limits (up to 20 products).
- **Association Rule Mining & Collaborative Filtering**: High-confidence cross-sell and up-sell suggestions based on basket co-occurrence.

### 🛡️ 8. Anomaly Detection & Business Safeguards
- **Multi-Factor Anomaly Engine**: Detects unusual revenue dips, transaction spikes, inventory discrepancies, and irregular discount patterns.
- **Interactive Sensitivity Guide**: Transparent documentation explaining Isolation Forest contamination thresholds (*Strict 2%*, *Balanced 5%*, *High 10%*).
- **Resolution Workflow**: Audit-logged acknowledge, investigate, and resolve workflow to track issue mitigation.

### 🔄 9. Model Training & Refresh Calibration Feedback
- **Transparent Model Calibration**: Clicking **"Train & Refresh AI Models"** displays a detailed completion breakdown showing:
  - **ARIMA & Prophet Demand Models**: Calibrated against SKU sales velocity and seasonality.
  - **Collaborative Filtering Matrices**: Co-occurrence vectors updated with recent transactions.
  - **RFM Customer Segmentation**: Tiers recalculated with updated Recency, Frequency, and Monetary scores.
  - **Isolation Forest Thresholds**: Contamination boundaries refreshed to current sales distributions.

---

## 🔒 Enterprise Security & Architecture

- **Tenant Data Isolation**: Strict multi-tenant boundaries. New registrations start with clean, private workspaces while sample data is isolated to demo accounts.
- **No Hardcoded Secrets**: All credentials, JWT secrets, database connection strings, and API keys are strictly configured via environment variables (`.env`) with typed Pydantic validation.
- **Email OTP Verification & Resend API**: Real-time 6-digit OTP verification powered by Resend API and SMTP dispatchers for registration, first login, and password resets.
- **Tiered Rate Limiting**: In-memory token bucket rate limiter protecting Authentication (`15 req/min`), Public (`60 req/min`), and Authenticated (`300 req/min`) routes with automated `Retry-After` headers.
- **Zero-Leakage Error Handling**: Sanitized global exception handlers for database (`SQLAlchemyError`) and internal runtime errors with server-side correlation IDs preventing internal schema leakage.
- **File Upload Protection**: Avatar and logo uploads verified using magic-byte file signature validation (`image/png`, `image/jpeg`, `image/webp`) with direct base64/blob URL pass-through and a 2MB size cap.
- **Modern Authentication & Authorization**: Argon2id password hashing, rotating JWT access and refresh sessions, and secure employee invitations.

---

## 📁 Repository Structure

```text
Team_1_Small_Biz_Sales_AI/
├── backend/
│   ├── alembic/              # Database migration definitions
│   ├── app/
│   │   ├── api/v1/           # REST API endpoints (auth, users, audit, sales, inventory, team, forecasts)
│   │   ├── core/             # Security, rate limiting, JWT, config & CORS
│   │   ├── db/               # SQLAlchemy session management and base model
│   │   ├── models/           # Identity, inventory, sales, customer & ML database models
│   │   ├── schemas/          # Pydantic validation schemas
│   │   ├── services/         # Business logic, ML models, and Resend/SMTP email dispatchers
│   │   ├── commands/         # CLI commands for data seeding and model imports
│   │   ├── bootstrap.py      # Role/permission seed script
│   │   └── main.py           # FastAPI application entry point
│   ├── tests/                # Comprehensive Pytest automated test suite (48 tests)
│   ├── requirements.txt      # Python dependencies
│   └── pyproject.toml
│
├── frontend/
│   ├── src/
│   │   ├── components/       # Dashboards, auth modals, and operational modules
│   │   │   ├── common/       # MarketMindLogo, Navbar, Sidebar, EmailVerificationModal
│   │   │   ├── dashboards/   # Owner, Manager, Sales, and Admin Dashboards
│   │   │   └── modules/      # Sales, Inventory, Customers, Recommendations, Churn, Reports, Team
│   │   ├── context/          # Auth, Language, Toast, Data, and Theme contexts
│   │   ├── services/         # Axios API clients with auto token refresh
│   │   └── test/             # Frontend Vitest & React Testing Library test suites (31 tests)
│   ├── public/               # Static assets & custom Indian Vyapar favicon.svg
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
git clone https://github.com/Garvitk001/MarketMind-AI-Sales.git
cd MarketMind-AI-Sales
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
| **Frontend UI & Services** | Auth Context, Token Refresh, Error States, Recommender, Anomaly Actions, Forecasting Views, Admin Governance | **31** | 0 | **100%** |
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
- **Typography**: Plus Jakarta Sans & Outfit (Google Fonts)
- **Icons**: Lucide React & Custom Indian Vyapar SVG Vector Logos
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

MarketMind AI combines predictive AI analytics, 2-step purchase order procurement, automated GST invoicing, customer churn prevention, 60-day employee task audit trails, dynamic platform admin governance, mandatory email OTP protection, and an interactive bilingual business copilot into a unified, secure platform built for Indian small-to-medium retail and wholesale enterprises.
