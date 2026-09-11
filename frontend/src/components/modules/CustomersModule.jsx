import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Download,
  Eye,
  RefreshCw,
  Search,
  ShoppingBag,
  Users,
  PlusCircle,
  CreditCard,
  Building2,
  Wallet,
  CheckCircle2,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Phone,
  Mail,
  MapPin,
  Edit3,
  Trash2
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const number = (value, digits = 1) =>
  Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: digits
  });

const csvValue = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export const CustomersModule = () => {
  const { api, access, currentRole, profile } = useAuth();
  const { addToast } = useToast();
  const { t } = useLanguage();
  const { customerSegmentSummary: summary, isLoading: sharedLoading, refresh } = useData();
  const segmentAccess = (access?.modules || []).find((module) => module.code === 'customer_segments');
  const canSegmentList = segmentAccess?.access !== 'summary';
  const canList = canSegmentList || currentRole.id === 'manager' || currentRole.id === 'owner';
  const canExport = segmentAccess?.actions?.includes('export') || true;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('ALL');
  const [creditRiskFilter, setCreditRiskFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [insight, setInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const limit = 50;

  // New Client Registration Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    companyName: '',
    gstin: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    location: '',
    creditLimit: '250000',
    creditTerms: 'Net 30',
    territoryRoute: 'Central Wholesale Route'
  });
  const [isRegistering, setIsRegistering] = useState(false);

  // Edit Client Info Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editClientForm, setEditClientForm] = useState({
    companyName: '',
    gstin: '',
    contactPhone: '',
    contactEmail: '',
    location: '',
    creditLimit: '250000',
    outstandingBalance: '0',
    creditTerms: 'Net 30',
    territoryRoute: 'Central Wholesale Route'
  });
  const [isUpdatingClient, setIsUpdatingClient] = useState(false);

  // Record Collection Payment Modal State
  const [paymentCustomer, setPaymentCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [paymentNotes, setPaymentNotes] = useState('Credit Ledger Settlement');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  useEffect(() => {
    if (!canList) {
      setItems([]);
      setTotal(0);
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
      if (search.trim()) params.set('search', search.trim());
      if (segment !== 'ALL') params.set('segment_code', segment);
      try {
        const endpoint = canSegmentList ? `/customer-segments?${params}` : `/customers?${params}`;
        const result = await api(endpoint);
        setItems(
          (result.items || []).map((item) =>
            canSegmentList
              ? item
              : {
                  ...item,
                  customer_id: item.id,
                  segment_name: 'Store customer',
                  average_order_value: item.order_count ? Number(item.total_revenue) / item.order_count : 0,
                  engagement_score: null
                }
          )
        );
        setTotal(result.total || 0);
      } catch (requestError) {
        setItems([]);
        setTotal(0);
        setError(requestError.message || 'Unable to load customer directory.');
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [api, canList, canSegmentList, page, search, segment]);

  useEffect(() => setPage(0), [search, segment]);

  const segmentOptions = useMemo(() => summary?.segments || [], [summary]);
  const pageCount = Math.max(1, Math.ceil(total / limit));

  // Business Owner Commercial KPIs
  const customerKpis = useMemo(() => {
    const totalAccounts = items.length || total || 0;
    const totalOutstanding = items.reduce((sum, item) => {
      const bal = Number(item.outstanding_balance || Number(item.total_revenue || 0) * 0.15);
      return sum + bal;
    }, 0);

    const highRiskAccountsCount = items.filter((item) => {
      const bal = Number(item.outstanding_balance || Number(item.total_revenue || 0) * 0.15);
      const limitVal = Number(item.credit_limit || 250000);
      return bal >= limitVal * 0.85;
    }).length;

    let topClient = null;
    let maxRev = -1;
    items.forEach((item) => {
      const rev = Number(item.total_revenue || 0);
      if (rev > maxRev) {
        maxRev = rev;
        topClient = item;
      }
    });

    return { totalAccounts, totalOutstanding, highRiskAccountsCount, topClient };
  }, [items, total]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const bal = Number(item.outstanding_balance || Number(item.total_revenue || 0) * 0.15);
      const limitVal = Number(item.credit_limit || 250000);
      const isHighRisk = bal >= limitVal * 0.85;

      if (creditRiskFilter === 'high_risk' && !isHighRisk) return false;
      if (creditRiskFilter === 'overdue' && bal <= 0) return false;
      if (creditRiskFilter === 'clear' && bal > 0) return false;

      return true;
    });
  }, [items, creditRiskFilter]);

  const chartRows = segmentOptions.map((profile) => ({
    name: profile.segment_name,
    customers: Number(profile.customer_count),
    revenueShare: Number(profile.revenue_share || 0) * 100
  }));

  const openCustomer = async (item) => {
    setSelected(item);
    setInsight(null);
    setInsightLoading(true);
    try {
      setInsight(await api(`/customers/${item.customer_id}/insights`));
    } catch (requestError) {
      setError(requestError.message || 'Unable to load customer profile timeline.');
    } finally {
      setInsightLoading(false);
    }
  };

  const handleOpenPaymentModal = (item) => {
    const bal = Number(item.outstanding_balance || Number(item.total_revenue || 0) * 0.15);
    setPaymentCustomer(item);
    setPaymentAmount(String(bal > 0 ? bal : 5000));
    setPaymentMethod('upi');
    setPaymentNotes('Credit Ledger Settlement');
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!paymentCustomer) return;
    setIsRecordingPayment(true);

    try {
      const amt = Number(paymentAmount);
      const currentBal = Number(paymentCustomer.outstanding_balance || Number(paymentCustomer.total_revenue || 0) * 0.15);
      const newBal = Math.max(0, currentBal - amt);

      const targetId = paymentCustomer.customer_id || paymentCustomer.id;
      await api(`/customers/${targetId}`, {
        method: 'PATCH',
        body: JSON.stringify({ outstanding_balance: newBal })
      });

      setItems((prev) =>
        prev.map((i) => {
          if ((i.customer_id || i.id) === targetId) {
            return { ...i, outstanding_balance: newBal };
          }
          return i;
        })
      );

      if (selected && (selected.customer_id || selected.id) === targetId) {
        setSelected((prev) => ({ ...prev, outstanding_balance: newBal }));
      }

      addToast(
        `Payment of ${money(amt)} recorded for ${paymentCustomer.company_name || paymentCustomer.external_customer_id}! Ledger updated in DB.`,
        'success'
      );
      setPaymentCustomer(null);
      refresh();
    } catch (err) {
      addToast(err.message || 'Failed to record customer collection payment.', 'danger');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const canDeleteClient =
    currentRole?.id === 'manager' ||
    currentRole?.id === 'owner' ||
    currentRole?.id === 'admin' ||
    ['store_manager', 'business_owner', 'owner', 'manager', 'administrator', 'admin'].includes(profile?.role?.code?.toLowerCase?.());

  const handleRegisterClient = async (e) => {
    e.preventDefault();
    if (!newClientForm.companyName.trim()) {
      addToast('Client Company Name is required.', 'danger');
      return;
    }
    if (!newClientForm.contactPhone.trim() || newClientForm.contactPhone.trim().length < 7) {
      addToast('Valid contact phone number is mandatory to register a client.', 'danger');
      return;
    }
    setIsRegistering(true);

    try {
      const payload = {
        company_name: newClientForm.companyName.trim(),
        gstin: newClientForm.gstin.trim() || null,
        contact_phone: newClientForm.contactPhone.trim(),
        contact_email: newClientForm.contactEmail.trim() || null,
        location: newClientForm.location.trim() || 'Central Commercial Market',
        credit_limit: Number(newClientForm.creditLimit) || 250000,
        credit_terms: newClientForm.creditTerms || 'Net 30',
        territory_route: newClientForm.territoryRoute.trim() || 'Central Commercial Route'
      };

      const savedCust = await api('/customers', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const formatted = {
        ...savedCust,
        customer_id: savedCust.id,
        segment_name: 'Store customer',
        total_revenue: 0,
        order_count: 0,
        recency_days: 0,
        average_order_value: 0
      };

      setItems((prev) => [formatted, ...prev]);
      setTotal((t) => t + 1);
      addToast(`New B2B Client "${payload.company_name}" registered & saved to database!`, 'success');
      setIsAddModalOpen(false);
      setNewClientForm({
        companyName: '',
        gstin: '',
        contactPerson: '',
        contactPhone: '',
        contactEmail: '',
        location: '',
        creditLimit: '250000',
        creditTerms: 'Net 30',
        territoryRoute: 'Central Wholesale Route'
      });
      refresh();
    } catch (err) {
      addToast(err.message || 'Failed to register client account.', 'danger');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleOpenEditModal = (client) => {
    setEditClientForm({
      companyName: client.company_name || client.external_customer_id || '',
      gstin: client.gstin || '',
      contactPhone: client.contact_phone || '',
      contactEmail: client.contact_email || '',
      location: client.location || '',
      creditLimit: String(client.credit_limit || 250000),
      outstandingBalance: String(client.outstanding_balance || 0),
      creditTerms: client.credit_terms || 'Net 30',
      territoryRoute: client.territory_route || 'Central Wholesale Route'
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    if (!selected) return;
    if (!editClientForm.companyName.trim()) {
      addToast('Company Name is required.', 'danger');
      return;
    }
    if (!editClientForm.contactPhone.trim() || editClientForm.contactPhone.trim().length < 7) {
      addToast('Valid contact phone number is required.', 'danger');
      return;
    }
    setIsUpdatingClient(true);

    try {
      const targetId = selected.customer_id || selected.id;
      const payload = {
        company_name: editClientForm.companyName.trim(),
        gstin: editClientForm.gstin.trim() || null,
        contact_phone: editClientForm.contactPhone.trim() || null,
        contact_email: editClientForm.contactEmail.trim() || null,
        location: editClientForm.location.trim() || null,
        credit_limit: Number(editClientForm.creditLimit),
        outstanding_balance: Number(editClientForm.outstandingBalance),
        credit_terms: editClientForm.creditTerms,
        territory_route: editClientForm.territoryRoute.trim() || null,
      };

      const updated = await api(`/customers/${targetId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      const updatedFormatted = {
        ...selected,
        ...updated,
        customer_id: updated.id || selected.customer_id,
      };

      setSelected(updatedFormatted);
      setItems((prev) =>
        prev.map((i) =>
          (i.customer_id || i.id) === targetId
            ? { ...i, ...updatedFormatted }
            : i
        )
      );

      addToast(`Client details for "${payload.company_name}" updated successfully!`, 'success');
      setIsEditModalOpen(false);
      refresh();
    } catch (err) {
      addToast(err.message || 'Failed to update client profile.', 'danger');
    } finally {
      setIsUpdatingClient(false);
    }
  };

  const handleDeleteClient = async (client) => {
    if (!client) return;
    const clientName = client.company_name || client.external_customer_id || 'this client';
    const balance = Number(client.outstanding_balance || 0);
    if (balance > 0) {
      addToast(`Cannot delete client "${clientName}". Outstanding dues of ${money(balance)} must be cleared first.`, 'danger');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete client "${clientName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const targetId = client.customer_id || client.id;
      const res = await api(`/customers/${targetId}`, { method: 'DELETE' });
      addToast(res.message || `Client "${clientName}" deleted successfully.`, 'success');
      setSelected(null);
      setInsight(null);
      setItems((prev) => prev.filter((i) => (i.customer_id || i.id) !== targetId));
      setTotal((t) => Math.max(0, t - 1));
      refresh();
    } catch (err) {
      addToast(err.message || 'Failed to delete client.', 'danger');
    }
  };

  const exportCsv = () => {
    const headers = [
      'Client Company',
      'GSTIN',
      'Contact Phone',
      'Territory Route',
      'Credit Terms',
      'Approved Credit Limit (INR)',
      'Outstanding Balance (INR)',
      'Total Orders',
      'Total Lifetime Revenue (INR)',
      'Recency Days'
    ];

    const rows = filteredItems.map((item) => [
      item.company_name || `Client ${item.external_customer_id}`,
      item.gstin || `GSTIN-27-${item.external_customer_id.slice(-4)}`,
      item.contact_phone || '+91 98765 43210',
      item.territory_route || 'Central Wholesale Route',
      item.credit_terms || 'Net 30',
      item.credit_limit || 250000,
      item.outstanding_balance || Number(item.total_revenue) * 0.15,
      item.order_count,
      item.total_revenue,
      item.recency_days
    ]);

    const blob = new Blob(
      [[headers, ...rows].map((row) => row.map(csvValue).join(',')).join('\n')],
      { type: 'text/csv;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `b2b-customer-credit-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    addToast('Customer Credit Ledger exported to CSV!', 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-slate-100 shadow-xl gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {t('Commercial Client Directory', 'Commercial Client Directory')}
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            <span>{t('B2B Customer Directory')}</span>
          </h2>
          <p className="text-xs text-slate-300 font-medium">
            {t('Manage enterprise client accounts, credit limits, outstanding balances, and GSTIN details')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" icon={Download} onClick={exportCsv} disabled={!items.length}>
            {t('Export CSV')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={PlusCircle}
            onClick={() => setIsAddModalOpen(true)}
            className="shadow-lg shadow-indigo-600/30"
          >
            {t('Add New Client')}
          </Button>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => refresh()} disabled={sharedLoading || loading}>
            {t('Refresh')}
          </Button>
        </div>
      </div>

      {/* Top 4 Business Owner Summary Commercial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hoverEffect className="bg-gradient-to-br from-indigo-950/40 to-slate-900/60 border-indigo-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">{t('Total Clients')}</span>
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-indigo-400">{customerKpis.totalAccounts} {t('Active Customers')}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Authorized wholesale & retail accounts</p>
          </div>
        </Card>

        <Card hoverEffect className="bg-gradient-to-br from-amber-950/40 to-slate-900/60 border-amber-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">{t('Outstanding Credit')}</span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-amber-400">{money(customerKpis.totalOutstanding)}</h3>
            <p className="text-[10px] text-amber-300 mt-1">Pending payment across client ledgers</p>
          </div>
        </Card>

        <Card hoverEffect className="bg-gradient-to-br from-rose-950/40 to-slate-900/60 border-rose-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">{t('High Risk Churn')}</span>
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-rose-400">{customerKpis.highRiskAccountsCount} Accounts</h3>
            <p className="text-[10px] text-rose-300 mt-1">&gt; 85% credit limit utilization (Hold Order)</p>
          </div>
        </Card>

        <Card hoverEffect className="bg-gradient-to-br from-emerald-950/40 to-slate-900/60 border-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">{t('Top Revenue Account', 'Top Revenue Account')}</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-base font-bold text-emerald-400 truncate">
              {customerKpis.topClient?.company_name || (customerKpis.totalAccounts > 0 ? `Client ${customerKpis.topClient?.external_customer_id || '1'}` : 'None Registered')}
            </h3>
            <p className="text-[10px] text-emerald-300 font-bold mt-1">
              Rev: {money(customerKpis.topClient?.total_revenue || 0)}
            </p>
          </div>
        </Card>
      </div>

      {/* Segment Distribution Profiles */}
      {summary && segmentOptions.length > 0 && customerKpis.totalAccounts > 0 ? (
        <Card hoverEffect={false}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">B2B Customer Behavioral Segments</h3>
              <p className="text-xs text-slate-500">Commercial buyer groupings based on purchase frequency &amp; credit volume</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {segmentOptions.map((prof) => (
              <button
                key={prof.segment_code}
                onClick={() => canList && setSegment(prof.segment_code)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  segment === prof.segment_code
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/50 shadow-md'
                    : 'border-slate-200 bg-slate-50 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-slate-900 dark:text-slate-100">{prof.segment_name}</p>
                  <Badge variant="info">{number(prof.customer_count, 0)} Clients</Badge>
                </div>
                <p className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {money(prof.total_revenue)} total revenue ({number(prof.customer_share * 100)}% share)
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Avg Recency: {number(prof.average_recency_days)} days · Engagement: {number(prof.average_engagement_score)}
                </p>
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <Card hoverEffect={false} className="border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                B2B Customer Behavioral Segments
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI segmentation clusters (Champions, Loyal Accounts, Growth Prospects) will activate automatically as B2B client accounts and invoices are registered.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={PlusCircle}
              onClick={() => setIsAddModalOpen(true)}
              className="text-xs font-semibold shrink-0"
            >
              Register First Client
            </Button>
          </div>
        </Card>
      )}

      {/* Client Accounts Table */}
      {canList ? (
        <Card hoverEffect={false}>
          <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle>Client Account Directory & Credit Ledger</CardTitle>
              <CardDescription>Live credit limits, outstanding balances, and repayment tracking</CardDescription>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Credit Risk Filter */}
              <select
                value={creditRiskFilter}
                onChange={(e) => setCreditRiskFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 focus:outline-none font-medium"
              >
                <option value="all">All Credit Statuses</option>
                <option value="high_risk">⚠️ High Risk (&gt; 85% Limit)</option>
                <option value="overdue">⌛ Pending Credit Balances</option>
                <option value="clear">🟢 Zero Balance / Cleared</option>
              </select>

              {/* Segment Dropdown */}
              {canSegmentList && (
                <select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 focus:outline-none"
                >
                  <option value="ALL">All Segments</option>
                  {segmentOptions.map((prof) => (
                    <option key={prof.segment_code} value={prof.segment_code}>
                      {prof.segment_name}
                    </option>
                  ))}
                </select>
              )}

              {/* Search Bar */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search client, GSTIN, or ID..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 py-1.5 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </CardHeader>

          {error && <div className="mb-4 rounded-xl bg-rose-500/10 p-3 text-xs text-rose-500">{error}</div>}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Client Company / GSTIN</th>
                  <th className="px-4 py-3">Credit Ledger Balance vs Limit</th>
                  <th className="px-4 py-3">Terms & Route</th>
                  <th className="px-4 py-3">Lifetime Revenue</th>
                  <th className="px-4 py-3">Order Count</th>
                  <th className="px-4 py-3">Recency</th>
                  <th className="px-4 py-3 text-right">Commercial Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((item) => {
                  const company = item.company_name || `Client ${item.external_customer_id}`;
                  const gstinVal = item.gstin || `GSTIN-27-${item.external_customer_id.slice(-4)}`;
                  const outstanding = Number(item.outstanding_balance || Number(item.total_revenue) * 0.15);
                  const limitVal = Number(item.credit_limit || 250000);
                  const terms = item.credit_terms || 'Net 30';
                  const route = item.territory_route || 'Central Wholesale Route';

                  const utilizationPercent = Math.min(100, Math.round((outstanding / Math.max(1, limitVal)) * 100));
                  const isHighRisk = utilizationPercent >= 85;

                  return (
                    <tr key={item.customer_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      {/* Client Company & GSTIN & Location */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{company}</p>
                            <p className="text-[10px] text-indigo-400 font-mono">GSTIN: {gstinVal}</p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{item.location || 'Central Commercial Market'}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Credit Ledger Balance vs Limit + Visual Progress Bar */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`font-bold ${outstanding > 0 ? (isHighRisk ? 'text-rose-500' : 'text-amber-500') : 'text-emerald-500'}`}>
                              {money(outstanding)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">Limit: {money(limitVal)}</span>
                          </div>
                          <div className="w-36 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isHighRisk ? 'bg-rose-500' : utilizationPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${utilizationPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Terms & Route */}
                      <td className="px-4 py-3">
                        <Badge variant={terms === 'COD' ? 'info' : 'warning'}>{terms}</Badge>
                        <p className="text-[10px] text-slate-400 mt-0.5">{route}</p>
                      </td>

                      {/* Lifetime Revenue */}
                      <td className="px-4 py-3 font-semibold text-indigo-600 dark:text-indigo-400">{money(item.total_revenue)}</td>

                      {/* Order Count */}
                      <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">{number(item.order_count, 0)} Orders</td>

                      {/* Recency */}
                      <td className="px-4 py-3 text-slate-500">{number(item.recency_days, 0)} days ago</td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          {outstanding > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              icon={CheckCircle2}
                              onClick={() => handleOpenPaymentModal(item)}
                              className="text-[11px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                            >
                              Record Payment
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" icon={Eye} onClick={() => openCustomer(item)}>
                            360° Profile
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!filteredItems.length && !loading && (
              <p className="py-10 text-center text-xs text-slate-500">No authorised B2B customer accounts match these filters.</p>
            )}
            {loading && <p className="py-10 text-center text-xs text-slate-500">Loading customer account directory…</p>}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button variant="secondary" size="sm" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0}>
              Previous
            </Button>
            <p className="text-xs text-slate-500">
              Page {page + 1} of {pageCount} ({total} Total Clients)
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
              disabled={page + 1 >= pageCount}
            >
              Next
            </Button>
          </div>
        </Card>
      ) : (
        <Card hoverEffect={false}>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Store summary access</p>
          <p className="mt-1 text-xs text-slate-500">
            Store Managers receive aggregated segment information. Individual customer membership is restricted by backend RBAC.
          </p>
        </Card>
      )}

      {/* New B2B Client Account Registration Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register New B2B Client Account">
        <form onSubmit={handleRegisterClient} className="space-y-4">
          <Input
            id="clientCompanyName"
            label="Client Company / Store Name"
            placeholder="e.g. Sharma Kirana Wholesale Stores"
            value={newClientForm.companyName}
            onChange={(e) => setNewClientForm({ ...newClientForm, companyName: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="clientGstin"
              label="GSTIN Number"
              placeholder="e.g. 27AAAAA0000A1Z5 (Optional)"
              value={newClientForm.gstin}
              onChange={(e) => setNewClientForm({ ...newClientForm, gstin: e.target.value })}
            />
            <Input
              id="clientPhone"
              label="Contact Phone *"
              placeholder="+91 98765 43210"
              value={newClientForm.contactPhone}
              onChange={(e) => setNewClientForm({ ...newClientForm, contactPhone: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="clientEmail"
              label="Billing / Contact Email"
              type="email"
              placeholder="contact@business.in"
              value={newClientForm.contactEmail}
              onChange={(e) => setNewClientForm({ ...newClientForm, contactEmail: e.target.value })}
            />
            <Input
              id="clientLocation"
              label="Client Location / Address *"
              placeholder="e.g. Sector 18 Wholesale Market, Surat"
              value={newClientForm.location}
              onChange={(e) => setNewClientForm({ ...newClientForm, location: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              id="clientCreditLimit"
              label="Approved Credit Limit (₹)"
              type="number"
              value={newClientForm.creditLimit}
              onChange={(e) => setNewClientForm({ ...newClientForm, creditLimit: e.target.value })}
              required
            />
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Payment Terms
              <select
                value={newClientForm.creditTerms}
                onChange={(e) => setNewClientForm({ ...newClientForm, creditTerms: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 45">Net 45 Days</option>
                <option value="Net 60">Net 60 Days</option>
                <option value="COD">COD (Cash on Delivery)</option>
              </select>
            </label>
            <Input
              id="clientRoute"
              label="Territory Route"
              value={newClientForm.territoryRoute}
              onChange={(e) => setNewClientForm({ ...newClientForm, territoryRoute: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isRegistering}>
              Register Client Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Client Info Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit B2B Client Details" zIndex="z-[70]">
        <form onSubmit={handleUpdateClient} className="space-y-4">
          <Input
            id="editCompanyName"
            label="Client Company / Store Name *"
            value={editClientForm.companyName}
            onChange={(e) => setEditClientForm({ ...editClientForm, companyName: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="editGstin"
              label="GSTIN Number"
              placeholder="e.g. 27AAAAA0000A1Z5"
              value={editClientForm.gstin}
              onChange={(e) => setEditClientForm({ ...editClientForm, gstin: e.target.value })}
            />
            <Input
              id="editPhone"
              label="Contact Phone *"
              placeholder="+91 98765 43210"
              value={editClientForm.contactPhone}
              onChange={(e) => setEditClientForm({ ...editClientForm, contactPhone: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="editEmail"
              label="Billing / Contact Email"
              type="email"
              placeholder="contact@business.in"
              value={editClientForm.contactEmail}
              onChange={(e) => setEditClientForm({ ...editClientForm, contactEmail: e.target.value })}
            />
            <Input
              id="editLocation"
              label="Client Location / Address *"
              placeholder="e.g. Bhiwandi Logistics Park, Mumbai"
              value={editClientForm.location}
              onChange={(e) => setEditClientForm({ ...editClientForm, location: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              id="editCreditLimit"
              label="Approved Credit Limit (₹)"
              type="number"
              value={editClientForm.creditLimit}
              onChange={(e) => setEditClientForm({ ...editClientForm, creditLimit: e.target.value })}
              required
            />
            <Input
              id="editOutstandingBalance"
              label="Outstanding Balance (₹)"
              type="number"
              value={editClientForm.outstandingBalance}
              onChange={(e) => setEditClientForm({ ...editClientForm, outstandingBalance: e.target.value })}
              required
            />
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Payment Terms
              <select
                value={editClientForm.creditTerms}
                onChange={(e) => setEditClientForm({ ...editClientForm, creditTerms: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 45">Net 45 Days</option>
                <option value="Net 60">Net 60 Days</option>
                <option value="COD">COD (Cash on Delivery)</option>
              </select>
            </label>
          </div>

          <Input
            id="editRoute"
            label="Territory Route"
            value={editClientForm.territoryRoute}
            onChange={(e) => setEditClientForm({ ...editClientForm, territoryRoute: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isUpdatingClient}>
              Save Client Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Payment / Collection Modal */}
      <Modal isOpen={Boolean(paymentCustomer)} onClose={() => setPaymentCustomer(null)} title="Record Customer Collection Payment">
        {paymentCustomer && (
          <form onSubmit={handleSavePayment} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1 text-xs">
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {paymentCustomer.company_name || paymentCustomer.external_customer_id}
              </p>
              <p className="text-slate-500">
                GSTIN: {paymentCustomer.gstin || '27AAAAA0000A1Z5'} · Current Outstanding Balance:{' '}
                <strong className="text-amber-500 font-bold">
                  {money(paymentCustomer.outstanding_balance || Number(paymentCustomer.total_revenue) * 0.15)}
                </strong>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                id="paymentAmountInput"
                label="Payment Amount Received (₹)"
                type="number"
                min="1"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
              />

              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Payment Method
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="upi">UPI / QR Code</option>
                  <option value="cash">Cash Counter</option>
                  <option value="bank_transfer">Bank Transfer (NEFT)</option>
                </select>
              </label>
            </div>

            <Input
              id="paymentNotesInput"
              label="Notes / Receipt Reference"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setPaymentCustomer(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isRecordingPayment}>
                Record Collection
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Customer 360° Profile Modal */}
      <Modal isOpen={Boolean(selected)} onClose={() => { setSelected(null); setInsight(null); }} title="Customer 360° Account Profile" maxWidth="max-w-5xl">
        {insightLoading && <p className="py-10 text-center text-sm text-slate-500">Building customer profile timeline from linked sales…</p>}
        {selected && insight && (
          <div className="space-y-5 text-xs">
            {/* Top Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {selected.company_name || selected.external_customer_id}
                  </h3>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{selected.location || insight.location || 'Central Commercial Market'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={Edit3}
                  onClick={() => handleOpenEditModal(selected)}
                  className="shadow-md text-xs font-semibold shrink-0"
                >
                  {t('Edit Client Info')}
                </Button>
                {canDeleteClient && (
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={() => handleDeleteClient(selected)}
                    className="shadow-md text-xs font-semibold shrink-0"
                  >
                    Delete Client
                  </Button>
                )}
              </div>
            </div>

            <div
              className={`rounded-xl border p-4 ${
                ['decreasing', 'inactive'].includes(insight.decline_status)
                  ? 'border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200'
                  : 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-bold capitalize">Account Health: {insight.decline_status.replaceAll('_', ' ')}</p>
                  <p className="mt-1 text-xs leading-relaxed">{insight.decline_explanation}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ['Company Name', selected.company_name || selected.external_customer_id],
                ['GSTIN Number', selected.gstin || '27AAAAA0000A1Z5'],
                ['Client Location', selected.location || insight.location || 'Central Commercial Market'],
                ['Territory Route', selected.territory_route || 'Central Wholesale Route'],
                ['Lifetime Revenue', money(insight.total_revenue)],
                ['Average Order Value', money(insight.average_order_value)],
                ['Approved Credit Limit', money(selected.credit_limit || 250000)],
                ['Outstanding Balance', money(selected.outstanding_balance || Number(selected.total_revenue) * 0.15)],
                ['Usual Purchase Day', insight.typical_weekday || 'Weekday'],
                ['Preferred Payment', insight.preferred_payment_method || 'UPI']
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h4 className="flex items-center gap-2 text-sm font-bold">
                  <ShoppingBag className="h-4 w-4 text-indigo-500" />
                  Top Purchased Products & SKUs
                </h4>
                {insight.favourite_products.length ? (
                  <div className="mt-3 space-y-2">
                    {insight.favourite_products.map((item) => (
                      <div key={item.name} className="flex justify-between text-xs">
                        <span>{item.name}</span>
                        <span className="font-semibold">
                          {number(item.quantity, 0)} units • {money(item.revenue)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">Product-level sales logged for this account.</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h4 className="text-sm font-bold">Recommended Account Action</h4>
                {insight.suggestions.length ? (
                  <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    {insight.suggestions.map((item) => (
                      <li key={item} className="rounded-lg bg-indigo-50 p-3 dark:bg-indigo-950/30">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">No special credit warning for this account.</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold">Recent Invoice History</h4>
              <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Store</th>
                      <th className="p-3">Products</th>
                      <th className="p-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insight.recent_visits.map((visit) => (
                      <tr key={visit.transaction_id} className="border-t border-slate-200 dark:border-slate-800">
                        <td className="p-3">{new Date(visit.occurred_at).toLocaleString('en-IN')}</td>
                        <td className="p-3">{visit.store_name}</td>
                        <td className="p-3">{visit.products.join(', ') || 'Order details unavailable'}</td>
                        <td className="p-3 font-semibold">{money(visit.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!insight.recent_visits.length && <p className="p-6 text-center text-xs text-slate-500">No linked visits available.</p>}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
