# MarketMind AI — Frontend Application

[![Live Application](https://img.shields.io/badge/Live%20Frontend-Vercel%20Application-success?style=for-the-badge&logo=vercel)](https://marketmind-ai-sales.vercel.app)

> **Live Production App**: [https://marketmind-ai-sales.vercel.app](https://marketmind-ai-sales.vercel.app)

Modern React & Vite single-page application (SPA) providing role-aware executive dashboards, point-of-sale interfaces, customer analytics, AI recommendation views, anomaly alerts, and an interactive bilingual AI Business Copilot.

---

## 🌟 Application Features

- **Role-Aware Dashboards**: Tailored views and feature access for **Business Owners**, **Store Managers**, and **Sales Executives**.
- **Interactive AI Business Copilot**: Conversational business strategy assistant featuring domain-specialized personas with bilingual support in **English** and **Hindi (`हिन्दी`)**.
- **Customer 360 & Churn Insights**: Comprehensive customer profile, RFM segment badges, purchasing trends, and integrated Email/WhatsApp outreach workflows.
- **AI Product Recommendations**: Real-time cross-selling, up-selling, and affinity bundle suggestions with estimated revenue uplift metrics.
- **Anomaly Alerts & Triage**: Visual anomaly monitoring feed with severity filtering (`Critical`, `Warning`, `Info`) and an acknowledge/resolve workflow.
- **Inventory & Supplier Management**: Stock level tracking, visual safety-stock thresholds, and one-click supplier purchase order generation.
- **Predictive Forecasting & Reports**: Revenue and demand forecasts across 7, 14, and 30-day horizons with model health indicators and CSV export.
- **Statutory Billing & GST Invoices**: GST-compliant A5 Wholesale Thermal and Laser printable invoice generation.
- **Secure Authentication Flow**: Token-based authentication with automatic refresh token rotation, session persistence, and secure password recovery.

---

## 📁 Project Structure

```text
frontend/src/
├── components/
│   ├── auth/         # Login, registration, password reset modals
│   ├── common/       # Navigation bars, search filters, modal wrappers, toast alerts
│   ├── dashboards/   # Role-specific executive dashboard layouts
│   ├── landing/      # Public bilingual landing page
│   └── modules/      # Operational modules (Copilot, Recommender, Churn, Anomaly, Reports, POS, etc.)
├── context/          # React Contexts (Auth, Language, Theme, Notifications)
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
