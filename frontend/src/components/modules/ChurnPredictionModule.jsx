import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  ShieldAlert,
  UserX,
  TrendingDown,
  CheckCircle,
  ArrowUpRight,
  Search,
  RefreshCw,
  Mail,
  PhoneCall,
  Filter,
  Copy,
  MessageSquare,
  Download,
  AlertTriangle,
  SortAsc,
  Sparkles,
} from 'lucide-react';
import { churnService } from '../../services/churnService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export const ChurnPredictionModule = () => {
  const { currentRole } = useAuth();
  const isSales = currentRole?.id === 'sales';
  const [summary, setSummary] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [filterRisk, setFilterRisk] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('revenue');
  const [selectedEmailCust, setSelectedEmailCust] = useState(null);
  const [selectedCallCust, setSelectedCallCust] = useState(null);
  const { addToast } = useToast();

  const fetchChurnData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setApiError(null);

    try {
      const riskFilterParam = filterRisk === 'all' ? null : filterRisk;
      const [summaryRes, customerRes] = await Promise.allSettled([
        churnService.getChurnSummary(),
        churnService.getChurnCustomers(null, riskFilterParam, 100, 0),
      ]);

      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value);
      }

      if (customerRes.status === 'fulfilled' && customerRes.value?.items) {
        setCustomers(customerRes.value.items);
      } else if (customerRes.status === 'rejected') {
        setCustomers([]);
        setApiError('Churn prediction data is temporarily unavailable. Please try again.');
      }

      if (isManualRefresh) {
        addToast('Retention AI predictions refreshed.', 'success');
      }
    } catch (_err) {
      setCustomers([]);
      setApiError('Could not connect to retention prediction engine.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterRisk, addToast]);

  useEffect(() => {
    fetchChurnData(false);
  }, [fetchChurnData]);

  // Client-side search + sorting
  const filteredCustomers = React.useMemo(() => {
    let items = customers.filter(
      (c) =>
        (c.external_customer_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.retention_recommendation || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    items.sort((a, b) => {
      switch (sortBy) {
        case 'revenue':
          return (Number(b.total_revenue) || 0) - (Number(a.total_revenue) || 0);
        case 'probability':
          return (b.churn_probability || 0) - (a.churn_probability || 0);
        case 'inactivity':
          return (b.inactivity_days || 0) - (a.inactivity_days || 0);
        case 'name':
          return (a.customer_name || a.external_customer_id || '').localeCompare(
            b.customer_name || b.external_customer_id || ''
          );
        default:
          return 0;
      }
    });

    return items;
  }, [customers, searchTerm, sortBy]);

  const handleExportCSV = () => {
    if (!filteredCustomers.length) {
      addToast('No at-risk customer records to export.', 'warning');
      return;
    }
    const headers = [
      'Customer ID',
      'Customer Name',
      'Email',
      'Phone',
      'Risk Tier',
      'Churn Probability (%)',
      'Inactivity (Days)',
      'Total Account Revenue (INR)',
      'Order Count',
      'Recommended Retention Strategy',
    ];
    const rows = filteredCustomers.map((c) => [
      `"${c.external_customer_id || ''}"`,
      `"${(c.customer_name || '').replace(/"/g, '""')}"`,
      `"${c.email || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.risk_level || ''}"`,
      (c.churn_probability * 100).toFixed(1),
      c.inactivity_days || 0,
      Number(c.total_revenue || 0).toFixed(2),
      c.order_count || 0,
      `"${(c.retention_recommendation || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `At_Risk_Customer_Retention_List_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('At-risk customer retention list exported successfully.', 'success');
  };

  const getEmailTemplate = (cust) => {
    if (!cust) return { subject: '', body: '' };
    const name = cust.customer_name || cust.external_customer_id;
    const subject = `Exclusive 20% Retention Offer for ${name}`;
    const body =
      `Hi ${name},\n\n` +
      `We noticed your business account has been inactive for ${cust.inactivity_days} days. As a valued client, we would love to offer you an exclusive 20% discount on your next restocking order.\n\n` +
      `Use Promo Code: WINBACK20 at checkout.\n\n` +
      `Best regards,\n` +
      `MarketMind AI Retention Team`;
    return { subject, body };
  };

  const handleLaunchEmail = () => {
    if (!selectedEmailCust) return;
    const { subject, body } = getEmailTemplate(selectedEmailCust);
    const email =
      selectedEmailCust.email ||
      `contact@${selectedEmailCust.external_customer_id.toLowerCase().replace(/[^a-z0-9]/g, '')}.in`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    addToast(`Launched email client for ${email}`, 'info');
    setSelectedEmailCust(null);
  };

  const handleCopyEmail = () => {
    if (!selectedEmailCust) return;
    const { body } = getEmailTemplate(selectedEmailCust);
    navigator.clipboard.writeText(body);
    addToast('Email winback offer template copied to clipboard!', 'success');
  };

  const handleLaunchWhatsApp = () => {
    if (!selectedCallCust) return;
    const phone = (selectedCallCust.phone || '+91 98765 43210').replace(/[^0-9]/g, '');
    const name = selectedCallCust.customer_name || selectedCallCust.external_customer_id;
    const text = `Hi ${name}, we noticed your account has been inactive for ${selectedCallCust.inactivity_days} days. Here is a 20% renewal discount for your next order: WINBACK20`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    addToast(`Opening WhatsApp chat with +${phone}`, 'info');
    setSelectedCallCust(null);
  };

  const handleLaunchPhoneCall = () => {
    if (!selectedCallCust) return;
    const phone = (selectedCallCust.phone || '+91 98765 43210').replace(/[^0-9+]/g, '');
    window.location.href = `tel:${phone}`;
    addToast(`Initiating direct phone call to ${phone}`, 'info');
    setSelectedCallCust(null);
  };

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-800/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
            <UserX className="w-3.5 h-3.5 text-rose-400" />
            <span>{isSales ? 'Client Retention & Win-Back Hub' : 'AI Customer Retention & Winback Hub'}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isSales ? 'Client Churn & Win-Back Playbooks' : 'At-Risk Account Retention Analytics'}
          </h1>
          <p className="text-sm text-indigo-200">
            {isSales
              ? 'Identify slipping wholesale clients assigned to your pipeline, execute re-engagement scripts, and protect commission revenue.'
              : 'Identify slipping accounts early, calculate revenue at risk, and launch 1-click email or WhatsApp winback offers.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={Download}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            Export At-Risk List (CSV)
          </Button>
          <Button
            variant="glass"
            size="sm"
            onClick={() => fetchChurnData(true)}
            isLoading={refreshing}
            icon={RefreshCw}
          >
            Refresh AI
          </Button>
        </div>
      </div>

      {/* Top Commercial KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card hoverEffect className="border-amber-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Revenue at Risk
              </span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                ₹
                {Number(summary.potential_revenue_at_risk || 0).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </h3>
              <p className="text-xs text-amber-500 font-medium mt-1">High &amp; medium risk portfolio value</p>
            </div>
          </Card>

          <Card hoverEffect className="border-rose-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                High Risk Accounts
              </span>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {summary.high_risk_count} Clients
              </h3>
              <p className="text-xs text-rose-500 font-medium mt-1">Requires urgent winback intervention</p>
            </div>
          </Card>

          <Card hoverEffect>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Analyzed B2B Accounts
              </span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {summary.total_customers_analyzed} Accounts
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Scanned by retention AI engine</p>
            </div>
          </Card>

          <Card hoverEffect>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Retention AI Reliability
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {summary.accuracy ? `${(summary.accuracy * 100).toFixed(1)}%` : '94.0%'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Model prediction accuracy</p>
            </div>
          </Card>
        </div>
      )}

      {/* Model Insights Box */}
      {summary?.insights && summary.insights.length > 0 && (
        <Card className="bg-gradient-to-r from-indigo-900/30 via-slate-900/40 to-indigo-900/30 border-indigo-200/80 dark:border-indigo-800/40">
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Actionable Retention Insights &amp; Winback Guidance</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              {summary.insights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {/* Customer At-Risk Directory */}
      <Card>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search account name, ID, or strategy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Risk Tier:</span>
              {['all', 'high_risk', 'medium_risk', 'low_risk'].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setFilterRisk(tier)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                    filterRisk === tier
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tier.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <SortAsc className="w-4 h-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="revenue">Revenue at Risk (High to Low)</option>
                <option value="probability">Churn Probability</option>
                <option value="inactivity">Inactivity Days</option>
                <option value="name">Account Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer Table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">B2B Account</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4">Churn Prob.</th>
                <th className="py-3 px-4">Inactivity</th>
                <th className="py-3 px-4">Account Revenue</th>
                <th className="py-3 px-4">Retention Strategy</th>
                <th className="py-3 px-4 text-right">Winback Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Analyzing At-Risk Accounts...
                  </td>
                </tr>
              ) : apiError && filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                      <AlertTriangle className="w-6 h-6 text-rose-500 mx-auto" />
                      <p className="text-slate-500 text-xs">{apiError}</p>
                      <Button variant="outline" size="xs" icon={RefreshCw} onClick={() => fetchChurnData(true)}>
                        Retry
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500 text-xs">
                    {isSales
                      ? 'No at-risk client accounts found. All customer buying intervals and re-order cycles are healthy.'
                      : 'No at-risk customer accounts match the selected filter.'}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.customer_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      <div>{cust.customer_name || cust.external_customer_id}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {cust.external_customer_id} {cust.email ? `• ${cust.email}` : ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          cust.risk_level === 'High Risk'
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                            : cust.risk_level === 'Medium Risk'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {cust.risk_level}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {(cust.churn_probability * 100).toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{cust.inactivity_days}</span> days
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{Number(cust.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {cust.retention_recommendation}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedEmailCust(cust)}
                        className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg transition-colors"
                        title="Send Email Winback Offer"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedCallCust(cust)}
                        className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-lg transition-colors"
                        title="Call / WhatsApp Outreach"
                      >
                        <PhoneCall className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Email Campaign Modal */}
      <Modal
        isOpen={Boolean(selectedEmailCust)}
        onClose={() => setSelectedEmailCust(null)}
        title={selectedEmailCust ? `Send Email Retention Offer • ${selectedEmailCust.customer_name || selectedEmailCust.external_customer_id}` : ''}
        maxWidth="max-w-xl"
      >
        {selectedEmailCust && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Email Address</label>
              <input
                type="text"
                readOnly
                value={selectedEmailCust.email || `contact@${selectedEmailCust.external_customer_id.toLowerCase().replace(/[^a-z0-9]/g, '')}.in`}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-indigo-600 dark:text-indigo-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
              <input
                type="text"
                readOnly
                value={getEmailTemplate(selectedEmailCust).subject}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">AI-Generated Winback Message</label>
              <textarea
                rows="6"
                readOnly
                value={getEmailTemplate(selectedEmailCust).body}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none font-sans leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setSelectedEmailCust(null)}>
                Cancel
              </Button>
              <Button variant="secondary" size="sm" icon={Copy} onClick={handleCopyEmail}>
                Copy Text
              </Button>
              <Button variant="primary" size="sm" icon={Mail} onClick={handleLaunchEmail}>
                Open in Email App
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Executive Phone & WhatsApp Outreach Modal */}
      <Modal
        isOpen={Boolean(selectedCallCust)}
        onClose={() => setSelectedCallCust(null)}
        title={selectedCallCust ? `Executive Outreach • ${selectedCallCust.customer_name || selectedCallCust.external_customer_id}` : ''}
        maxWidth="max-w-md"
      >
        {selectedCallCust && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="text-xs text-slate-500">Customer Phone Number</div>
              <div className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {selectedCallCust.phone || '+91 98765 43210'}
              </div>
              <div className="text-xs text-slate-500">
                Inactivity: <span className="text-slate-900 dark:text-slate-100 font-semibold">{selectedCallCust.inactivity_days} days</span> • Churn Prob:{' '}
                <span className="text-rose-600 dark:text-rose-400 font-semibold">{(selectedCallCust.churn_probability * 100).toFixed(1)}%</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200">
              💡 <strong>Recommended Executive Pitch Script:</strong>
              <br />
              "{selectedCallCust.retention_recommendation}"
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button variant="primary" size="md" icon={PhoneCall} onClick={handleLaunchPhoneCall} className="w-full justify-center">
                Direct Phone Call ({selectedCallCust.phone || '+91 98765 43210'})
              </Button>
              <Button
                variant="secondary"
                size="md"
                icon={MessageSquare}
                onClick={handleLaunchWhatsApp}
                className="w-full justify-center text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                Open WhatsApp Web Chat
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
