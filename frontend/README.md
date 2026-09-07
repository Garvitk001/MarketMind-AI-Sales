# MarketMind AI — Frontend Application

[![Live Application](https://img.shields.io/badge/Live%20Frontend-Vercel%20Application-success?style=for-the-badge&logo=vercel)](https://marketmind-ai-sales.vercel.app)
[![React Version](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Build%20Tool-Vite-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20%26%20Vanilla%20CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)

Modern React & Vite single-page application (SPA) providing role-aware executive dashboards, point-of-sale interfaces, customer analytics, AI recommendation views, anomaly alerts, 60-day employee task audit logs, and an interactive bilingual AI Business Copilot.

---

## 🌐 Live Application & Links

- **Live Production App**: [https://marketmind-ai-sales.vercel.app](https://marketmind-ai-sales.vercel.app)
- **Backend API Base**: [https://marketmind-backend.onrender.com/api/v1](https://marketmind-backend.onrender.com/api/v1)
- **Interactive Swagger Docs**: [https://marketmind-backend.onrender.com/api/v1/docs](https://marketmind-backend.onrender.com/api/v1/docs)

---

## 🌟 Application Dashboards & Modules

### 🏢 1. Owner Dashboard
- **Executive KPIs**: Real-time revenue, gross margins, customer count, order volume, and AOV.
- **Revenue Trend Area Chart**: Daily revenue tracking with responsive date ranges.
- **Credit Receivables Aging**: Structured aging ledger (**0–7 Days**, **8–15 Days**, and **15+ Days Overdue**) with live payment status synchronization.
- **Individual Sales Executive Telemetry**: Staff sales tracking across **Today**, **Yesterday**, **7 Days**, **30 Days**, and **6 Months** with Card & Table views.
- **60-Day Employee Task Audit Modal**: Full chronological inspection of bills created, marked paid, products modified, and login events.

### 🏬 2. Store Manager Dashboard
- **Inventory Telemetry**: Stock valuation, low-stock threshold badges, category breakdowns, and reorder triggers.
- **Manual Catalog CRUD**: Direct addition, editing, and deletion of products and stock units.
- **Supplier PO Generator**: Automated supplier purchase order drafting and printable documentation.

### 💼 3. Sales Executive Workspace
- **Personal Performance**: Order volume, target quota progress, average ticket size, and commission pace.
- **POS Billing & Invoicing**: Rapid order entry, customer selection, line-item discounts, and GST invoice generation.
- **Bill Status Management**: Real-time status updates ("Mark as Paid") reflected instantly across the owner dashboard.

### 👥 4. Team Management Module
- **Staff Directory**: Active employees, role badges, store location assignments, and AI adoption ratings.
- **60-Day Action & Task Audit History**: Dedicated tabbed log viewer with quick filters (*All Tasks*, *Billing & Payments*, *Inventory & Stock*, *Logins & Auth*).
- **Target Allocation**: Interactive modal to set revenue targets and period deadlines.

### 🤖 5. Specialized AI Modules
- **Interactive AI Copilot**: Bilingual conversational assistant with domain personas (Strategist, Operations, Retention, Analyst).
- **Product Recommendations**: Market basket affinity rules, cross-selling bundles, and estimated revenue uplifts.
- **Customer Churn Prevention (Customer 360)**: RFM customer segmentation, predictive churn scoring, and 1-click WhatsApp/Email outreach.
- **Anomaly Detection Feed**: Severity-based anomaly alerts (`Critical`, `Warning`, `Info`) with triage resolution workflows.
- **Predictive Reports & Forecasts**: 7, 14, and 30-day multi-model demand and revenue forecast curves.

---

## 📁 Project Structure

```text
frontend/src/
├── components/
│   ├── auth/         # Login, registration, OTP email verification modals
│   ├── common/       # Navigation bars, search filters, modal wrappers, toast alerts, DateRangeFilter
│   ├── dashboards/   # Role-specific executive dashboard layouts (Owner, Manager, Sales, Admin, Developer)
│   ├── landing/      # Public bilingual landing page with live app links
│   ├── modules/      # Operational modules (Copilot, Recommender, Churn, Anomaly, Reports, POS, Team)
│   └── ui/           # Design system components (Badge, Button, Card, Input, Modal)
├── context/          # React Contexts (Auth, Data, Language, Theme, Notifications, Toast)
├── services/         # Axios API clients with automatic token interception & refresh
└── test/             # Automated unit & integration tests (Vitest & React Testing Library)
```

---

## 🚀 Running Locally

### 1. Installation

```powershell
cd frontend
npm install
```

### 2. Environment Configuration

Create a `.env` file based on `.env.example`:

```powershell
Copy-Item .env.example .env
```

Ensure `VITE_API_BASE_URL` points to your running FastAPI backend:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

*(Note: The frontend client automatically normalizes trailing slashes and ensures `/api/v1` is cleanly routed).*

### 3. Start Development Server

```powershell
npm run dev
```

The application will be accessible at: `http://localhost:5173/`

---

## 🧪 Testing & Verification

Run automated frontend tests:

```powershell
npm run test:run
```

Execute lint checks and production build validation:

```powershell
npm run lint
npm run build
```
