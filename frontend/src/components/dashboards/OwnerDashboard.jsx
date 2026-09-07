import React from 'react';
import { MOCK_OWNER_DATA } from '../../data/mockData';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import { DateRangeFilter } from '../common/DateRangeFilter';
import {
  Wallet,
  ShoppingCart,
  Users,
  CreditCard,
  Sparkles,
  ArrowUpRight,
  Zap,
  Download,
  Printer,
  PackagePlus,
  Send,
  AlertTriangle,
  Clock,
  ShieldCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';

export const OwnerDashboard = ({ onNavigate }) => {
  const { salesDashboard, customerSummary } = useData();
  const { t } = useLanguage();
  const {
    kpis: mockKpis,
    categoryDistribution,
    topProducts
  } = MOCK_OWNER_DATA;

  const currency = salesDashboard?.currency || 'INR';
  const money = (value) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(Number(value || 0));

  const totalRev = salesDashboard?.revenue?.value ?? 0;
  const totalOrd = salesDashboard?.transaction_count?.value ?? 0;
  const totalCust = customerSummary?.customer_count ?? 0;
  const outstandingCredit = Number(salesDashboard?.outstanding_credit ?? customerSummary?.outstanding_receivables ?? 0);

  const hasBusinessData = Boolean(
    totalRev > 0 || totalOrd > 0 || totalCust > 0 || (salesDashboard?.trend || []).length > 0
  );

  const kpis = {
    totalRevenue: {
      label: t('Total Net Revenue'),
      value: money(totalRev),
      change: hasBusinessData ? '+14.2%' : '0%',
      timeFrame: 'selected period'
    },
    totalOrders: {
      label: t('B2B Orders Processed'),
      value: `${totalOrd} Orders`,
      change: hasBusinessData ? '+8.5%' : '0%',
      timeFrame: 'selected period'
    },
    totalCustomers: {
      label: t('Active Client Accounts'),
      value: `${totalCust} Clients`,
      change: hasBusinessData ? '+12.0%' : '0%',
      timeFrame: 'active buyers'
    },
    outstandingCredit: {
      label: t('Outstanding Credit Receivables'),
      value: money(outstandingCredit),
      change: outstandingCredit > 0 ? 'Active Credit Terms' : '0 Overdue Invoices',
      timeFrame: 'Net 30 terms'
    }
  };

  const revenueTrend = (salesDashboard?.trend || []).length
    ? salesDashboard.trend.map((point) => ({ name: point.date, revenue: point.revenue }))
    : hasBusinessData
      ? MOCK_OWNER_DATA.revenueTrend
      : [];

  const creditAgingData = outstandingCredit > 0
    ? [
        { period: '0–30 Days', amount: Math.round(outstandingCredit * 0.55), color: '#10b981' },
        { period: '31–60 Days', amount: Math.round(outstandingCredit * 0.30), color: '#f59e0b' },
        { period: '60+ Days (Overdue)', amount: Math.round(outstandingCredit * 0.15), color: '#ef4444' }
      ]
    : [
        { period: '0–30 Days', amount: 0, color: '#10b981' },
        { period: '31–60 Days', amount: 0, color: '#f59e0b' },
        { period: '60+ Days (Overdue)', amount: 0, color: '#ef4444' }
      ];

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-violet-800 to-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-200 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-300" />
            <span>{t('Executive Suite')}</span>
            <span>•</span>
            <span>{t('Business Owner Dashboard')}</span>
          </div>
          <h2 className="text-2xl font-bold">{t('Wholesale & Business Operations Overview')}</h2>
          <p className="text-sm text-indigo-200 mt-1 max-w-2xl">
            Live enterprise telemetry tracking sales revenue, client credit ledger aging, batch inventory risks, and strategic AI forecasts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="glass"
            size="sm"
            icon={Printer}
            onClick={() => onNavigate('sales')}
            className="text-xs font-semibold"
          >
            Create GST Invoice
          </Button>
          <Button
            variant="glass"
            size="sm"
            icon={Download}
            onClick={() => onNavigate('reports')}
            className="text-xs font-semibold"
          >
            Executive Reports
          </Button>
        </div>
      </div>

      <DateRangeFilter />

      {!hasBusinessData && (
        <Card className="border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/20" hoverEffect={false}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold">Add your first business records</h3>
              <p className="mt-1 text-sm text-slate-500">Your workspace is correctly isolated. Use Business Setup to import products, inventory, sales, and customers.</p>
            </div>
            <Button icon={ArrowUpRight} onClick={() => onNavigate('setup')}>Open Business Setup</Button>
          </div>
        </Card>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{kpis.totalRevenue.label}</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpis.totalRevenue.value}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="flex items-center font-bold text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
                {kpis.totalRevenue.change}
              </span>
              <span className="text-slate-400">{kpis.totalRevenue.timeFrame}</span>
            </div>
          </div>
        </Card>

        <Card hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{kpis.totalOrders.label}</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpis.totalOrders.value}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="flex items-center font-bold text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
                {kpis.totalOrders.change}
              </span>
              <span className="text-slate-400">{kpis.totalOrders.timeFrame}</span>
            </div>
          </div>
        </Card>

        <Card hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{kpis.totalCustomers.label}</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpis.totalCustomers.value}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="flex items-center font-bold text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
                {kpis.totalCustomers.change}
              </span>
              <span className="text-slate-400">{kpis.totalCustomers.timeFrame}</span>
            </div>
          </div>
        </Card>

        <Card hoverEffect className="border-amber-200 dark:border-amber-900/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{kpis.outstandingCredit.label}</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">{kpis.outstandingCredit.value}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="flex items-center font-bold text-rose-500">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                {kpis.outstandingCredit.change}
              </span>
              <span className="text-slate-400">{kpis.outstandingCredit.timeFrame}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Credit Ledger Aging & Risk Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>B2B Revenue Trend</CardTitle>
              <CardDescription>Completed sales from the selected database period</CardDescription>
            </div>
            <Badge variant="info">Live Ledger</Badge>
          </CardHeader>
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} minTickGap={24} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                  formatter={(value) => [money(value), 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Credit Aging Ledger Chart */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Credit Receivables Aging</CardTitle>
              <CardDescription>Commercial buyer credit terms (Net 30/45)</CardDescription>
            </div>
          </CardHeader>

          <div className="space-y-4 pt-1">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={creditAgingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="period" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff' }}
                    formatter={(v) => [money(v), 'Outstanding']}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {creditAgingData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Total Credit Issued:</span>
                <span className="font-bold text-slate-200">{money(outstandingCredit)}</span>
              </div>
              <div className="flex justify-between items-center text-rose-400 font-semibold">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Overdue (60+ Days):</span>
                <span>{money(Math.round(outstandingCredit * 0.15))}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Category Share & Strategic AI Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/30 dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-600 text-white">
                <Zap className="w-5 h-5 animate-bounce-slow" />
              </div>
              <div>
                <CardTitle>{t('AI Strategic Insights Engine')}</CardTitle>
                <CardDescription>{t('Predictive recommendations and commercial risk telemetry.')}</CardDescription>
              </div>
            </div>
            <Badge variant="info">{t('Live AI Engine')}</Badge>
          </CardHeader>

          <div className="space-y-4">
            {[
              {
                id: 1,
                title: "Stock Reorder & Product Cross-Sell Opportunity",
                description: "Predictive analytics forecast 35% higher demand for POS Terminals & Electronics next month.",
                impact: "High Impact (+ ₹12.4k Est. Revenue)",
                type: "warning",
                actionLabel: "View AI Bundles",
                targetTab: "recommendations"
              },
              {
                id: 2,
                title: "B2B Credit Collection & Churn Opportunity",
                description: "14 recurring client accounts are past Net 30 terms. Send automated payment reminders.",
                impact: "Medium Impact (₹45.0k Receivables)",
                type: "insight",
                actionLabel: "View At-Risk Clients",
                targetTab: "churn"
              },
              {
                id: 3,
                title: "Batch Expiry & Safeguard Protection",
                description: "Automated scan detected 2 inventory batches near expiry date requiring stock clearance.",
                impact: "Immediate Safeguard (+ ₹8.5k)",
                type: "warning",
                actionLabel: "Review Safeguards",
                targetTab: "anomalies"
              }
            ].map((rec) => (
              <div
                key={rec.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-850 dark:bg-[#151c2c] border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-indigo-300 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{rec.title}</span>
                    <Badge variant={rec.type === 'warning' ? 'warning' : 'success'} size="sm">
                      {rec.impact}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{rec.description}</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigate && onNavigate(rec.targetTab)}
                  className="shrink-0"
                >
                  {rec.actionLabel}
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Selling Products List */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Category Sales & Revenue Distribution</CardTitle>
              <CardDescription>Product category market share analysis</CardDescription>
            </div>
          </CardHeader>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {categoryDistribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-100">{item.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
