import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Download,
  FileText,
  RefreshCw,
  Printer,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  PieChart,
  Users,
  AlertTriangle,
  Building2,
  CalendarDays,
  Target,
  ArrowUpRight,
  Layers,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Area,
  AreaChart,
  Bar,
  BarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';

const HORIZONS = [7, 14, 30];

const REPORTS_BY_ROLE = {
  owner: [
    { id: 'business', label: 'Business Analytics & Customer Segments Report' },
    { id: 'revenue', label: 'Revenue Growth & Sales Forecast Report' },
  ],
  manager: [
    { id: 'business', label: 'Store Business Analytics Report' },
    { id: 'demand', label: 'Product Stock Demand Forecast Report' },
  ],
  sales: [
    { id: 'personal', label: 'My Personal Sales Forecast Report' },
  ],
  admin: [
    { id: 'business', label: 'Business Analytics & Customer Segments Report' },
    { id: 'revenue', label: 'Revenue Growth & Sales Forecast Report' },
    { id: 'demand', label: 'Product Stock Demand Forecast Report' },
    { id: 'personal', label: 'Sales Executive Personal Forecast Report' },
    { id: 'monitoring', label: 'AI Forecasting Engine Monitoring Report' },
  ],
};

const formatNumber = (value, digits = 2) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number)
    ? number.toLocaleString('en-IN', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : '—';
};

const formatCurrency = (value) => `₹${formatNumber(value)}`;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN');
};

const escapeCsv = (value) => {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
};

const downloadBlob = (content, filename, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const toCsv = (headers, rows) => [
  headers.map(escapeCsv).join(','),
  ...rows.map((row) => row.map(escapeCsv).join(',')),
].join('\n');

const getRoleLabel = (roleId) => ({
  owner: 'Business Owner',
  manager: 'Store Manager',
  sales: 'Sales Executive',
  admin: 'System Administrator',
}[roleId] || 'Authorized User');

const StatCard = ({ icon: Icon, label, value, detail, color = 'indigo' }) => {
  const colorMap = {
    indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/40',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40',
    violet: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800/40',
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40',
  };

  return (
    <div className="marketmind-card bg-white/95 dark:bg-slate-850 dark:bg-[#151c2c]/95 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 shadow-[0_8px_28px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_34px_rgba(0,0,0,0.2)] transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className={`p-2 rounded-xl border ${colorMap[color] || colorMap.indigo}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-2">{value}</p>
      {detail && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{detail}</p>}
    </div>
  );
};

const SectionHeader = ({ title, subtitle, icon: Icon }) => (
  <div className="mb-4">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />}
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h3>
    </div>
    {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
  </div>
);

const ForecastLineChart = ({ history = [], series = [], unit = '', title = 'Actual vs Predicted', chartType = 'area' }) => {
  const historicalRows = (history || []).map((point) => ({
    date: point.date,
    actual: Number(point.actual),
    predicted: null,
    lower_bound: null,
    upper_bound: null,
  }));
  const forecastRows = (series || []).map((point) => ({
    ...point,
    actual: point.actual == null ? null : Number(point.actual),
    predicted: Number(point.predicted),
    lower_bound: Number(point.lower_bound),
    upper_bound: Number(point.upper_bound),
  }));
  const rows = [...historicalRows, ...forecastRows];

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-slate-400">
        <FileText className="w-8 h-8 text-slate-500 mb-2 opacity-50" />
        <p>No forecast data points available for the selected filters.</p>
      </div>
    );
  }

  const renderChart = () => {
    if (chartType === 'bar') {
      return (
        <BarChart data={rows} margin={{ top: 12, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} minTickGap={24} />
          <YAxis stroke="#94a3b8" fontSize={11} width={70} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#f8fafc' }}
            formatter={(value, name) => [formatNumber(value), `${name} ${unit}`.trim()]}
          />
          <Legend />
          <Bar dataKey="actual" name="Recorded Actual" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="predicted" name="Model Prediction" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      );
    }

    if (chartType === 'line') {
      return (
        <LineChart data={rows} margin={{ top: 12, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} minTickGap={24} />
          <YAxis stroke="#94a3b8" fontSize={11} width={70} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#f8fafc' }}
            formatter={(value, name) => [formatNumber(value), `${name} ${unit}`.trim()]}
          />
          <Legend />
          {forecastRows[0]?.date && (
            <ReferenceLine
              x={forecastRows[0].date}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{ value: 'Forecast Period Begins', fill: '#f59e0b', fontSize: 11 }}
            />
          )}
          <Line type="monotone" dataKey="actual" name="Recorded Actual" stroke="#a855f7" strokeWidth={2.5} connectNulls={false} />
          <Line type="monotone" dataKey="predicted" name="Model Prediction" stroke="#3b82f6" strokeWidth={2.5} connectNulls={false} />
          <Line type="monotone" dataKey="lower_bound" name="Lower Bound (95% Conf.)" stroke="#64748b" strokeDasharray="4 4" dot={false} />
          <Line type="monotone" dataKey="upper_bound" name="Upper Bound (95% Conf.)" stroke="#64748b" strokeDasharray="4 4" dot={false} />
        </LineChart>
      );
    }

    return (
      <AreaChart data={rows} margin={{ top: 12, right: 16, left: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
          </linearGradient>
          <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} minTickGap={24} />
        <YAxis stroke="#94a3b8" fontSize={11} width={70} />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#f8fafc' }}
          formatter={(value, name) => [formatNumber(value), `${name} ${unit}`.trim()]}
        />
        <Legend />
        {forecastRows[0]?.date && (
          <ReferenceLine
            x={forecastRows[0].date}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{ value: 'Forecast Period Begins', fill: '#f59e0b', fontSize: 11 }}
          />
        )}
        <Area type="monotone" dataKey="actual" name="Recorded Actual" stroke="#a855f7" strokeWidth={2.5} fillOpacity={1} fill="url(#actualGrad)" connectNulls={false} />
        <Area type="monotone" dataKey="predicted" name="Model Prediction" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#predGrad)" connectNulls={false} />
      </AreaChart>
    );
  };

  return (
    <div className="h-80 w-full" aria-label={title}>
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

const dataSourceLabel = (value) => ({
  evaluation_sample_data: 'Evaluation sample data',
  mixed_uploaded_and_sample_data: 'Mixed uploaded + sample data',
  tenant_uploaded_database_records: 'Uploaded business records',
  tenant_database: 'Tenant database records',
}[value] || String(value || 'Source not reported'));

export const ReportsModule = ({ onNavigate }) => {
  const { api, currentRole, access } = useAuth();

  const roleId = currentRole?.id || 'owner';
  const availableReports = REPORTS_BY_ROLE[roleId] || REPORTS_BY_ROLE.owner;

  const [reportType, setReportType] = useState(availableReports[0]?.id || 'business');
  const [horizon, setHorizon] = useState(14);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [category, setCategory] = useState('ALL');
  const [product, setProduct] = useState('');
  const [filterOptions, setFilterOptions] = useState({ categories: [], products: [] });
  const [adminStores, setAdminStores] = useState([]);
  const [adminSellers, setAdminSellers] = useState([]);
  const [storeId, setStoreId] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [selectedChartType, setSelectedChartType] = useState('area');
  const forecastAccess = (access?.modules || []).find((module) => module.code === 'forecasts');
  const canExport = forecastAccess?.actions?.includes('export') ?? true;

  useEffect(() => {
    const allowed = availableReports.some((report) => report.id === reportType);
    if (!allowed) setReportType(availableReports[0]?.id || 'business');
  }, [roleId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (roleId !== 'admin') {
      setAdminStores([]);
      setAdminSellers([]);
      setStoreId('');
      setSellerId('');
      return;
    }
    Promise.all([api('/users/stores/catalog'), api('/users/sellers/catalog')])
      .then(([stores, users]) => {
        const sellers = users.filter((user) => user.role?.code === 'sales_executive');
        setAdminStores(stores);
        setAdminSellers(sellers);
        setStoreId((current) => current || stores[0]?.id || '');
        setSellerId((current) => current || sellers[0]?.id || '');
      })
      .catch(() => {
        setAdminStores([]);
        setAdminSellers([]);
      });
  }, [api, roleId]);

  useEffect(() => {
    const optionType = reportType === 'demand'
      ? 'demand'
      : reportType === 'revenue'
        ? 'revenue'
        : reportType === 'personal'
          ? 'personal'
          : null;
    setCategory('ALL');
    setProduct('');
    setFilterOptions({ categories: [], products: [] });
    if (!optionType) return;
    if (roleId === 'admin' && optionType === 'demand' && !storeId) return;
    if (roleId === 'admin' && optionType === 'personal' && !sellerId) return;
    const params = new URLSearchParams({ forecast_type: optionType });
    if (roleId === 'admin' && optionType === 'demand') params.set('store_id', storeId);
    if (roleId === 'admin' && optionType === 'personal') params.set('seller_id', sellerId);
    api(`/forecasts/options?${params}`)
      .then(setFilterOptions)
      .catch(() => setFilterOptions({ categories: [], products: [] }));
  }, [api, reportType, roleId, sellerId, storeId]);

  const loadReport = async () => {
    setLoading(true);
    setError('');

    try {
      let data;

      if (reportType === 'business') {
        const [customerSummary, segmentSummary] = await Promise.all([
          api('/customers/summary'),
          api('/customer-segments/summary'),
        ]);
        data = { customerSummary, segmentSummary };
      }

      if (reportType === 'revenue') {
        const params = new URLSearchParams({ horizon: String(horizon), category });
        data = await api(`/forecasts/revenue?${params}`);
      }

      if (reportType === 'demand') {
        const params = new URLSearchParams({ horizon: String(horizon) });
        if (roleId === 'admin') {
          if (!storeId) throw new Error('Select a store before generating demand forecasts.');
          params.set('store_id', storeId);
        }
        if (category !== 'ALL') params.set('category', category);
        if (product) params.set('product', product);
        data = await api(`/forecasts/demand?${params}`);
      }

      if (reportType === 'personal') {
        const params = new URLSearchParams({ horizon: String(horizon) });
        if (roleId === 'admin') {
          if (!sellerId) throw new Error('Select a Sales Executive before generating a personal forecast.');
          params.set('seller_id', sellerId);
        }
        data = await api(`/forecasts/personal?${params}`);
      }

      if (reportType === 'monitoring') {
        data = await api('/forecasts/monitoring');
      }

      setReportData(data);
      setGeneratedAt(new Date());
    } catch (err) {
      setReportData(null);
      const msg = err?.message || 'Unable to generate the report.';
      setError(msg);
      if (
        msg.toLowerCase().includes('model') ||
        msg.toLowerCase().includes('segmentation') ||
        msg.toLowerCase().includes('history') ||
        msg.toLowerCase().includes('not available') ||
        msg.toLowerCase().includes('not found') ||
        msg.toLowerCase().includes('failed')
      ) {
        setShowHistoryModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roleId === 'admin' && reportType === 'demand' && !storeId) return;
    if (roleId === 'admin' && reportType === 'personal' && !sellerId) return;
    loadReport();
    // Generate the initial report when the role/report type changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, roleId, sellerId, storeId]);

  const reportTitle = useMemo(
    () => availableReports.find((item) => item.id === reportType)?.label || 'Analytics Report',
    [availableReports, reportType],
  );

  const buildDownload = () => {
    if (!reportData) return;

    let headers = [];
    let rows = [];

    if (reportType === 'business') {
      const { customerSummary, segmentSummary } = reportData;

      headers = ['Section', 'Metric', 'Value'];
      rows = [
        ['Customer Analytics', 'Customer Count', customerSummary.customer_count],
        ['Customer Analytics', 'Total Revenue', customerSummary.total_revenue],
        ['Customer Analytics', 'Total Orders', customerSummary.total_orders],
        ['Customer Analytics', 'Average Customer Value', customerSummary.average_customer_value],
        ['Customer Behaviour', 'Segmented Customers', segmentSummary.customer_count],
        ['Customer Behaviour', 'Repeat Customer Rate', segmentSummary.repeat_customer_rate],
        ['Customer Behaviour', 'Average Order Value', segmentSummary.average_order_value],
        ['Customer Behaviour', 'Average Recency Days', segmentSummary.average_recency_days],
        ['Customer Behaviour', 'Average Engagement Score', segmentSummary.average_engagement_score],
        ...(segmentSummary.segments || []).map((segment) => [
          'Customer Segmentation',
          segment.segment_name,
          `${segment.customer_count} customers`,
        ]),
      ];
    }

    if (reportType === 'revenue' || reportType === 'personal') {
      headers = ['Date', 'Actual', 'Predicted', 'Lower Bound', 'Upper Bound'];
      rows = (reportData.series || []).map((point) => [
        point.date,
        point.actual ?? '',
        point.predicted,
        point.lower_bound,
        point.upper_bound,
      ]);
    }

    if (reportType === 'demand') {
      headers = [
        'Source Store',
        'Source Product',
        'Inventory SKU',
        'Mapping Status',
        'Category',
        'Predicted Demand',
        'Available Stock',
        'Stock Risk',
      ];
      rows = (reportData.products || []).map((product) => [
        product.source_store_id,
        product.source_product_id,
        product.product_sku ?? '',
        product.mapping_status,
        product.source_category_id,
        product.predicted_demand,
        product.available_stock ?? '',
        product.stock_risk,
      ]);
    }

    if (reportType === 'monitoring') {
      headers = ['Type', 'Name', 'Status', 'Algorithm', 'Model Version', 'MAE', 'RMSE', 'R²'];
      rows = (reportData.models || []).map((model) => [
        model.forecast_type,
        model.scope,
        model.status,
        model.algorithm,
        model.model_version,
        model.metrics?.mae ?? '',
        model.metrics?.rmse ?? '',
        model.metrics?.r2 ?? '',
      ]);
    }

    const csv = toCsv(headers, rows);
    const safeTitle = reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    downloadBlob(
      csv,
      `${safeTitle}-${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv;charset=utf-8',
    );
  };

  const printReport = () => {
    if (!reportData) return;
    window.print();
  };

  const resetFilters = () => {
    setHorizon(14);
    setCategory('ALL');
    setProduct('');
  };

  const renderBusinessReport = () => {
    const { customerSummary, segmentSummary } = reportData;

    return (
      <div className="space-y-6">
        {/* Top Summary Stat Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total B2B Accounts" value={formatNumber(customerSummary.customer_count, 0)} color="indigo" />
          <StatCard icon={TrendingUp} label="Total Invoiced Sales" value={formatCurrency(customerSummary.total_revenue)} color="emerald" />
          <StatCard icon={FileText} label="Total Orders Processed" value={formatNumber(customerSummary.total_orders, 0)} color="blue" />
          <StatCard icon={PieChart} label="Repeat Buyer Share" value={`${formatNumber(segmentSummary.repeat_customer_rate, 1)}%`} color="violet" />
        </div>

        <Card hoverEffect={false}>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                <span>Customer Base Overview &amp; Engagement</span>
              </CardTitle>
              <CardDescription>Comprehensive metrics derived from active tenant database records</CardDescription>
            </div>
            <Badge variant="info">Scope: {customerSummary.scope}</Badge>
          </CardHeader>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Avg Customer Account Value</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{formatCurrency(customerSummary.average_customer_value)}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Average Order Value (AOV)</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{formatCurrency(segmentSummary.average_order_value)}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Average Recency</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{formatNumber(segmentSummary.average_recency_days, 1)} days</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Avg Engagement Score</p>
              <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1">{formatNumber(segmentSummary.average_engagement_score, 1)} / 100</p>
            </div>
          </div>
        </Card>

        {/* Customer Segmentation Table */}
        <Card hoverEffect={false}>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-500" />
                <span>RFM Customer Segmentation Breakdown</span>
              </CardTitle>
              <CardDescription>Model {segmentSummary.model_version} • Algorithm: {segmentSummary.algorithm}</CardDescription>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="uppercase text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Customer Segment</th>
                  <th className="p-3">Account Count</th>
                  <th className="p-3">Market Share</th>
                  <th className="p-3">Total Invoiced Revenue</th>
                  <th className="p-3">Engagement Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {(segmentSummary.segments || []).map((segment) => (
                  <tr key={segment.segment_code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span>{segment.segment_name}</span>
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">{formatNumber(segment.customer_count, 0)} clients</td>
                    <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{formatNumber(segment.customer_share * 100, 1)}%</td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(segment.total_revenue)}</td>
                    <td className="p-3">
                      <Badge variant={segment.average_engagement_score > 70 ? 'success' : 'info'}>
                        {formatNumber(segment.average_engagement_score, 1)} pts
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Business Strategic Action Card */}
        <Card hoverEffect={false} className="border-l-4 border-l-indigo-500 bg-gradient-to-r from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/20 dark:to-violet-950/20">
          <SectionHeader title="Business Executive Takeaways" subtitle="Actionable commercial recommendations derived from customer segmentation" icon={Sparkles} />
          <div className="grid md:grid-cols-3 gap-3 text-xs text-slate-700 dark:text-slate-300">
            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> High-Value Loyalty Rewards
              </p>
              <p>Promote special credit limits &amp; bulk distributor discounts for top revenue customer segments to maintain high retention.</p>
            </div>
            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> AOV Expansion Strategy
              </p>
              <p>Current AOV is {formatCurrency(segmentSummary.average_order_value)}. Encourage cross-selling bundle recommendations during sales executive ordering.</p>
            </div>
            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Recency Retention Outreach
              </p>
              <p>Average recency is {formatNumber(segmentSummary.average_recency_days, 1)} days. Schedule sales rep follow-ups for accounts exceeding 30 days inactivity.</p>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderForecastReport = (title, personal = false) => {
    const projectedTotal = (reportData.series || []).reduce((acc, point) => acc + (Number(point.predicted) || 0), 0);
    const avgDailyForecast = (reportData.series || []).length ? projectedTotal / reportData.series.length : 0;

    return (
      <div className="space-y-6">
        {/* Top KPI Summary Bar */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon={TrendingUp} label="Projected Sales Volume" value={formatCurrency(projectedTotal)} detail={`${reportData.horizon_days}-day horizon`} color="indigo" />
          <StatCard icon={CalendarDays} label="Daily Avg Forecast" value={formatCurrency(avgDailyForecast)} detail="Expected per day" color="emerald" />
          <StatCard icon={Target} label="Forecast Horizon" value={`${reportData.horizon_days} Days`} detail={`Model: ${reportData.algorithm}`} color="blue" />
          <StatCard icon={CheckCircle2} label="Quality Status" value={reportData.quality_status || 'Optimal'} color="violet" />
          <StatCard icon={Sparkles} label="MAE Error Rate" value={formatNumber(reportData.metrics?.mae, 3)} detail={`RMSE: ${formatNumber(reportData.metrics?.rmse, 3)}`} color="amber" />
        </div>

        {/* Visual Chart & Detail Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card hoverEffect={false} className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500" />
                  <span>Historical Actuals vs AI Predicted Trend</span>
                </CardTitle>
                <CardDescription>
                  {personal ? 'Authorized personal sales scope' : `Target Metric: ${reportData.target}`} • Data Source: {dataSourceLabel(reportData.data_source)}
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                {[
                  { id: 'area', label: '📈 Area' },
                  { id: 'line', label: '📉 Line' },
                  { id: 'bar', label: '📊 Bar' }
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedChartType(type.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedChartType === type.id
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
                <Badge variant="info">{reportData.unit}</Badge>
              </div>
            </CardHeader>

            <ForecastLineChart
              history={reportData.history}
              series={reportData.series}
              unit={reportData.unit}
              chartType={selectedChartType}
              title={personal ? 'Personal sales actual versus predicted' : 'Revenue actual versus predicted'}
            />

            <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-4 max-h-60 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="uppercase text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Actual Revenue</th>
                    <th className="p-2">Predicted Revenue</th>
                    <th className="p-2">Lower Bound</th>
                    <th className="p-2">Upper Bound</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(reportData.series || []).map((point) => (
                    <tr key={point.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2 font-medium text-slate-900 dark:text-slate-100">{formatDate(point.date)}</td>
                      <td className="p-2 text-purple-600 dark:text-purple-400 font-semibold">{point.actual == null ? '—' : formatCurrency(point.actual)}</td>
                      <td className="p-2 text-blue-600 dark:text-blue-400 font-bold">{formatCurrency(point.predicted)}</td>
                      <td className="p-2 text-slate-500 dark:text-slate-400">{formatCurrency(point.lower_bound)}</td>
                      <td className="p-2 text-slate-500 dark:text-slate-400">{formatCurrency(point.upper_bound)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Forecast AI Insights Panel */}
          <div className="space-y-4">
            <Card hoverEffect={false} className="h-full">
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    <span>AI Forecast Insights</span>
                  </CardTitle>
                  <CardDescription>Automated trend analysis &amp; business implications</CardDescription>
                </div>
              </CardHeader>
              <div className="space-y-3">
                {(reportData.insights || []).map((insight, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                      <ArrowUpRight className="w-3.5 h-3.5" /> Insight #{idx + 1}
                    </p>
                    <p className="leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Model Evaluation Comparison Table */}
        <Card hoverEffect={false}>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-500" />
                <span>Forecasting Algorithm Benchmarking</span>
              </CardTitle>
              <CardDescription>Chronological evaluation metrics returned by the ML model registry</CardDescription>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="uppercase text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">ML Algorithm</th>
                  <th className="p-3">Mean Absolute Error (MAE)</th>
                  <th className="p-3">Root Mean Square Error (RMSE)</th>
                  <th className="p-3">Bias Deviation</th>
                  <th className="p-3">R² Fit Metric</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {(reportData.model_comparison || []).map((model) => {
                  const isSelected = model.algorithm === reportData.algorithm;
                  return (
                    <tr key={model.algorithm} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}>
                      <td className="p-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>{model.algorithm}</span>
                        {isSelected && <Badge variant="success">Selected Active Model</Badge>}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">{formatNumber(model.mae, 3)}</td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">{formatNumber(model.rmse, 3)}</td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">{formatNumber(model.bias, 3)}</td>
                      <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{formatNumber(model.r2, 3)}</td>
                      <td className="p-3">
                        <Badge variant={isSelected ? 'success' : 'default'}>{isSelected ? 'Active' : 'Evaluated'}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderDemandReport = () => (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard icon={Layers} label="Products Forecasted" value={formatNumber(reportData.total_products, 0)} color="indigo" />
        <StatCard icon={TrendingUp} label="Increasing Demand" value={formatNumber(reportData.increasing_demand, 0)} detail="Rising demand trend" color="emerald" />
        <StatCard icon={ArrowUpRight} label="Decreasing Demand" value={formatNumber(reportData.decreasing_demand, 0)} detail="Declining velocity" color="blue" />
        <StatCard icon={AlertTriangle} label="Potential Stock Risk" value={formatNumber(reportData.potential_stock_risk, 0)} detail="Low buffer alert" color="amber" />
        <StatCard icon={Building2} label="Training Source" value={dataSourceLabel(reportData.data_source)} color="violet" />
        <StatCard icon={CheckCircle2} label="Quality Status" value={reportData.quality_status || 'Optimal'} color="indigo" />
      </div>

      {/* Product Demand Table */}
      <Card hoverEffect={false}>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              <span>SKU Level Demand Forecast &amp; Stock Risk Analysis</span>
            </CardTitle>
            <CardDescription>
              {reportData.total_products} SKUs analyzed across {reportData.horizon_days}-day horizon • Target: {reportData.target}
            </CardDescription>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="uppercase text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Store</th>
                <th className="p-3">Product Name &amp; SKU</th>
                <th className="p-3">Category</th>
                <th className="p-3">Predicted Unit Demand</th>
                <th className="p-3">Available Physical Stock</th>
                <th className="p-3">Stock Risk Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {(reportData.products || []).map((product) => (
                <tr key={`${product.source_store_id}-${product.source_product_id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{product.source_store_id}</td>
                  <td className="p-3">
                    {product.mapping_status === 'mapped' ? (
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{product.product_name || product.source_product_id}</p>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">SKU: {product.product_sku}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{product.source_product_id}</p>
                        <Badge variant="warning">Unmapped SKU</Badge>
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">{product.source_category_id}</td>
                  <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">{formatNumber(product.predicted_demand, 0)} units</td>
                  <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{product.available_stock ?? '—'} units</td>
                  <td className="p-3">
                    <Badge variant={product.stock_risk === 'high' ? 'danger' : product.stock_risk === 'medium' ? 'warning' : 'success'}>
                      {product.stock_risk ? `${product.stock_risk.toUpperCase()} RISK` : 'UNKNOWN'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Featured Demand Trend Chart */}
      {(reportData.products || []).length > 0 && (
        <Card hoverEffect={false}>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                <span>Featured SKU Demand Trend ({reportData.products[0].source_product_id})</span>
              </CardTitle>
              <CardDescription>Historical actual sales vs predicted unit demand</CardDescription>
            </div>
          </CardHeader>
          <ForecastLineChart
            history={reportData.products[0].history}
            series={reportData.products[0].series}
            unit={reportData.unit}
            title="Product demand actual versus predicted"
          />
        </Card>
      )}

      {/* Strategic Demand Insights */}
      <Card hoverEffect={false} className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/40 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/20">
        <SectionHeader title="Inventory Purchase Takeaways" subtitle="Actionable inventory planning advice based on AI demand forecast" icon={Sparkles} />
        <div className="grid md:grid-cols-2 gap-3">
          {(reportData.insights || []).map((insight, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
              {insight}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderMonitoringReport = () => (
    <div className="space-y-6">
      {/* Top Engine Stat Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CheckCircle2} label="Engine Status" value={reportData.engine_status} color="emerald" />
        <StatCard icon={ShieldCheck} label="API Status" value={reportData.api_status} color="indigo" />
        <StatCard icon={Layers} label="Successful Jobs" value={formatNumber(reportData.successful_jobs, 0)} color="blue" />
        <StatCard icon={AlertTriangle} label="Failed Jobs" value={formatNumber(reportData.failed_jobs, 0)} color="amber" />
      </div>

      {/* Model Registry */}
      <Card hoverEffect={false}>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              <span>Registered ML Forecasting Models</span>
            </CardTitle>
            <CardDescription>Engine Version {reportData.model_version} • Current Active Model: {reportData.current_model || '—'}</CardDescription>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="uppercase text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Forecast Type</th>
                <th className="p-3">Scope</th>
                <th className="p-3">Algorithm</th>
                <th className="p-3">Version</th>
                <th className="p-3">MAE</th>
                <th className="p-3">RMSE</th>
                <th className="p-3">R² Fit</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {(reportData.models || []).map((model) => (
                <tr key={`${model.model_version}-${model.forecast_type}-${model.scope}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{model.forecast_type}</td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">{model.scope}</td>
                  <td className="p-3 font-medium text-indigo-600 dark:text-indigo-400">{model.algorithm}</td>
                  <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{model.model_version}</td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">{formatNumber(model.metrics?.mae, 3)}</td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">{formatNumber(model.metrics?.rmse, 3)}</td>
                  <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{formatNumber(model.metrics?.r2, 3)}</td>
                  <td className="p-3"><Badge variant="success">{model.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Forecast Jobs */}
      <Card hoverEffect={false}>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              <span>Recent AI Forecast Computation Jobs</span>
            </CardTitle>
            <CardDescription>Execution telemetry of asynchronous model evaluation tasks</CardDescription>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="uppercase text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Job Reference</th>
                <th className="p-3">Type</th>
                <th className="p-3">Status</th>
                <th className="p-3">Records Processed</th>
                <th className="p-3">Started At</th>
                <th className="p-3">Completed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {(reportData.recent_jobs || []).map((job) => (
                <tr key={job.reference} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3 font-mono text-indigo-600 dark:text-indigo-400 font-medium">{job.reference}</td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">{job.job_type}</td>
                  <td className="p-3"><Badge variant="success">{job.status}</Badge></td>
                  <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{formatNumber(job.record_count, 0)}</td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">{formatDate(job.started_at)}</td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">{formatDate(job.completed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="reports-page space-y-6">
      {/* Top Commercial Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-violet-950 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-800/40">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-200 mb-1 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{getRoleLabel(roleId)} Executive Analytics</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Reports &amp; Strategic AI Forecasting</h1>
          <p className="text-sm text-indigo-200 mt-1">
            Generate database-backed business reports, sales revenue trajectory, product demand forecasts, and model reliability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canExport && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={buildDownload}
                disabled={!reportData || loading}
                icon={Download}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                Export Report (CSV)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={printReport}
                disabled={!reportData || loading}
                icon={Printer}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                Print / PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Report Controls & Filters Bar */}
      <Card hoverEffect={false}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Analytics Report
            </label>
            <select
              value={reportType}
              onChange={(event) => setReportType(event.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              {availableReports.map((report) => (
                <option key={report.id} value={report.id}>{report.label}</option>
              ))}
            </select>
          </div>

          {(reportType === 'revenue' || reportType === 'demand' || reportType === 'personal') && (
            <div className="w-full lg:w-44">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Forecast Horizon
              </label>
              <select
                value={horizon}
                onChange={(event) => setHorizon(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                {HORIZONS.map((value) => (
                  <option key={value} value={value}>{value} Days Ahead</option>
                ))}
              </select>
            </div>
          )}

          {(reportType === 'revenue' || reportType === 'demand') && (
            <div className="w-full lg:w-48">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Product Category
              </label>
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setProduct('');
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {(filterOptions.categories || []).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
          )}

          {reportType === 'demand' && (
            <div className="w-full lg:w-48">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Product / SKU
              </label>
              <select
                value={product}
                onChange={(event) => setProduct(event.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="">All Products</option>
                {(filterOptions.products || [])
                  .filter((item) => category === 'ALL' || item.category === category)
                  .map((item) => (
                    <option key={`${item.category}-${item.product}`} value={item.product}>
                      {item.product}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {roleId === 'admin' && reportType === 'demand' && (
            <div className="w-full lg:w-48">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Store Location
              </label>
              <select
                value={storeId}
                onChange={(event) => setStoreId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                {adminStores.map((store) => (
                  <option key={store.id} value={store.id}>{store.name} ({store.code})</option>
                ))}
              </select>
            </div>
          )}

          {roleId === 'admin' && reportType === 'personal' && (
            <div className="w-full lg:w-56">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Sales Executive
              </label>
              <select
                value={sellerId}
                onChange={(event) => setSellerId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                {adminSellers.map((seller) => (
                  <option key={seller.id} value={seller.id}>{seller.full_name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={loadReport} disabled={loading} icon={RefreshCw}>
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
            <Button variant="outline" onClick={resetFilters} disabled={loading}>
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Error Message & Setup Target Guidance */}
      {error && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <p className="font-bold text-sm flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" /> Report generation failed:
              </p>
              <div className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl space-y-1">
                <p>{error}</p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  AI forecasting and customer segmentation require recorded transaction history to train intelligence models.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistoryModal(true)}
              >
                View Targets
              </Button>
              {onNavigate && (roleId === 'owner' || roleId === 'admin') && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={ArrowUpRight}
                  onClick={() => onNavigate('setup')}
                >
                  Open Business Setup
                </Button>
              )}
              {onNavigate && roleId === 'manager' && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={ArrowUpRight}
                  onClick={() => onNavigate('inventory')}
                >
                  Manage Store Inventory
                </Button>
              )}
              {onNavigate && roleId === 'sales' && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={ArrowUpRight}
                  onClick={() => onNavigate('sales')}
                >
                  Create Tax Invoice
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Target Requirements Modal Popup */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={
          roleId === 'sales'
            ? 'Sales History Required for Personal AI Forecasting'
            : roleId === 'manager'
            ? 'Store Inventory & Orders Required for Demand Forecasting'
            : 'Sales History Required to Unlock AI Forecasting'
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-200">
            <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              {roleId === 'sales'
                ? 'Your personal sales forecasting model requires recorded completed customer transactions to train predictive volume curves and revenue projections.'
                : roleId === 'manager'
                ? 'Your store demand forecasting model requires recorded store inventory items and customer transaction history to train predictive replenishment curves and stock demand.'
                : 'Your business workspace is completely fresh and isolated. AI forecasting algorithms and customer segmentation models require recorded transaction history before generating commercial projections.'}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Target Milestones to Unlock AI Forecasting:
            </h4>
            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              {roleId === 'sales' && (
                <>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <Target className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span><strong>Completed Sales Invoices</strong> recorded from your client accounts</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <Users className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong>Active Customer Retailers</strong> with ordering transaction history</span>
                  </div>
                </>
              )}
              {roleId === 'manager' && (
                <>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <Layers className="w-4 h-4 text-purple-500 shrink-0" />
                    <span><strong>Store Inventory Catalog</strong> with live SKU stock levels</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <Target className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span><strong>Completed Customer Transactions</strong> recorded at your store</span>
                  </div>
                </>
              )}
              {roleId !== 'sales' && roleId !== 'manager' && (
                <>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <Target className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span><strong>30+ Completed Sales Transactions</strong> across at least 30 days of trading</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <Users className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong>20+ Customer Accounts</strong> for behavioral clustering</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <Layers className="w-4 h-4 text-purple-500 shrink-0" />
                    <span><strong>Store Location & Product Catalog</strong> with live stock levels</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {roleId === 'sales'
              ? 'Create tax invoices or log completed client orders to automatically generate your personal sales projections.'
              : roleId === 'manager'
              ? 'Add store inventory items or record completed sales to automatically generate product stock demand forecasts.'
              : 'Use the Business Setup hub to create store locations, invite team members, or import historical CSV business data.'}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          <Button variant="outline" size="sm" onClick={() => setShowHistoryModal(false)}>
            Dismiss
          </Button>
          {onNavigate && (roleId === 'owner' || roleId === 'admin') && (
            <Button
              variant="primary"
              size="sm"
              icon={ArrowUpRight}
              onClick={() => {
                setShowHistoryModal(false);
                onNavigate('setup');
              }}
            >
              Open Business Setup
            </Button>
          )}
          {onNavigate && roleId === 'manager' && (
            <Button
              variant="primary"
              size="sm"
              icon={ArrowUpRight}
              onClick={() => {
                setShowHistoryModal(false);
                onNavigate('inventory');
              }}
            >
              Manage Store Inventory
            </Button>
          )}
          {onNavigate && roleId === 'sales' && (
            <Button
              variant="primary"
              size="sm"
              icon={ArrowUpRight}
              onClick={() => {
                setShowHistoryModal(false);
                onNavigate('sales');
              }}
            >
              Create Tax Invoice
            </Button>
          )}
        </div>
      </Modal>

      {/* Active Generated Report View */}
      {reportData && !loading && (
        <div className="report-printable space-y-6">
          <Card hoverEffect={false}>
            <div className="flex flex-col gap-2 border-b border-slate-200 dark:border-slate-800 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">MarketMind AI • Commercial Report</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{reportTitle}</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Generated {generatedAt ? generatedAt.toLocaleString('en-IN') : '—'} • Role Scope: {getRoleLabel(roleId)}
                </p>
              </div>
              <Badge variant="success">Live Database Telemetry</Badge>
            </div>
          </Card>

          {reportType === 'business' && renderBusinessReport()}
          {reportType === 'revenue' && renderForecastReport('Revenue Growth & Sales Forecast', false)}
          {reportType === 'personal' && renderForecastReport('Personal Sales Performance Forecast', true)}
          {reportType === 'demand' && renderDemandReport()}
          {reportType === 'monitoring' && renderMonitoringReport()}
        </div>
      )}

      {/* Initial Empty State */}
      {!reportData && !loading && !error && (
        <Card hoverEffect={false}>
          <div className="flex min-h-48 flex-col items-center justify-center text-center py-8">
            <FileText className="h-10 w-10 text-slate-400 dark:text-slate-600 mb-2" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200">No report generated yet</h3>
            <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
              Select a report type and options above, then click "Generate Report" to build live analytics.
            </p>
          </div>
        </Card>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
          }

          body * {
            visibility: hidden !important;
          }

          .report-printable,
          .report-printable * {
            visibility: visible !important;
          }

          .report-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 24px;
            color: #0f172a !important;
            background: white !important;
          }

          .report-printable .marketmind-card,
          .report-printable .rounded-xl,
          .report-printable .rounded-2xl,
          .report-printable .rounded-lg {
            border-color: #cbd5e1 !important;
            background: white !important;
            box-shadow: none !important;
          }

          .report-printable h1,
          .report-printable h2,
          .report-printable h3,
          .report-printable h4,
          .report-printable p,
          .report-printable span,
          .report-printable td,
          .report-printable th {
            color: #0f172a !important;
          }
        }
      `}</style>
    </div>
  );
};
