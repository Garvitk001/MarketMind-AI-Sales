import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Activity,
  CheckCircle,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  Download,
  Copy,
  CheckSquare,
  Sparkles,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { anomalyService } from '../../services/anomalyService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export const AnomalyDetectionModule = () => {
  const { currentRole } = useAuth();
  const isSales = currentRole?.id === 'sales';
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [contamination, setContamination] = useState(0.05);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const { addToast } = useToast();

  const fetchAnomalies = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setApiError(null);

      try {
        const severityParam = filterSeverity === 'all' ? null : filterSeverity;
        const data = await anomalyService.getAnomalies(null, severityParam, contamination);
        setSummary(data);

        if (isManualRefresh) {
          addToast('Safeguard scan completed.', 'success');
        }
      } catch (err) {
        console.error('Failed to load anomaly detection data:', err);
        setSummary(null);
        setApiError('Business safeguard service is temporarily unavailable. Please try again.');
        if (isManualRefresh) {
          addToast('Error running safeguard scan.', 'error');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filterSeverity, contamination, addToast]
  );

  useEffect(() => {
    fetchAnomalies(false);
  }, [fetchAnomalies]);

  const handleStatusChange = async (eventId, action) => {
    try {
      if (action === 'acknowledge') {
        await anomalyService.acknowledgeAnomaly(eventId);
        addToast('Incident marked as Under Investigation', 'info');
      } else {
        await anomalyService.resolveAnomaly(eventId);
        addToast('Incident marked as Resolved', 'success');
      }
      fetchAnomalies(true);
    } catch (_err) {
      addToast(`Failed to ${action} incident`, 'error');
    }
  };

  const handleCopyReport = (item) => {
    const reportText = `[${item.severity} ALERT] ${item.title} (${item.anomaly_type})\nEntity ID: ${item.entity_id || 'N/A'}\nScore: ${item.anomaly_score}\nDescription: ${item.description}`;
    navigator.clipboard.writeText(reportText);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
    addToast(`Copied incident report for ${item.title} to clipboard!`, 'info');
  };

  const handleExportCSV = () => {
    const items = summary?.items || [];
    if (!items.length) {
      addToast('No incident records to export.', 'warning');
      return;
    }
    const headers = [
      'Incident ID',
      'Title',
      'Severity',
      'Anomaly Type',
      'Anomaly Score',
      'Status',
      'Entity Reference',
      'Description',
    ];
    const rows = items.map((i) => [
      `"${i.id || ''}"`,
      `"${(i.title || '').replace(/"/g, '""')}"`,
      `"${i.severity || ''}"`,
      `"${i.anomaly_type || ''}"`,
      i.anomaly_score || 0,
      `"${i.status || ''}"`,
      `"${i.entity_id || ''}"`,
      `"${(i.description || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Business_Safeguard_Incident_Log_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Business safeguard incident log exported successfully.', 'success');
  };

  // Filtered Items
  const filteredItems = React.useMemo(() => {
    let items = summary?.items || [];

    if (filterStatus !== 'all') {
      if (filterStatus === 'unresolved') {
        items = items.filter((i) => i.status !== 'resolved');
      } else {
        items = items.filter((i) => i.status === filterStatus);
      }
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      items = items.filter(
        (i) =>
          (i.title || '').toLowerCase().includes(term) ||
          (i.description || '').toLowerCase().includes(term) ||
          (i.anomaly_type || '').toLowerCase().includes(term) ||
          (i.entity_id || '').toLowerCase().includes(term)
      );
    }

    return items;
  }, [summary?.items, filterStatus, searchTerm]);

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950/50 to-slate-900 text-white shadow-xl border border-rose-800/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-200 text-xs font-semibold">
            <Activity className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>{isSales ? 'Deal & Quotation Safeguards' : 'AI Business Safeguards & Fraud Telemetry'}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isSales ? 'Deal Anomaly & Margin Safeguard Alerts' : 'Business Safeguards & Fraud Protection'}
          </h1>
          <p className="text-sm text-rose-200">
            {isSales
              ? 'Automated safeguards scanning deal quotations and sales invoices for abnormal discount spikes, unusual quantity deviations, and margin leakage.'
              : 'Automated safeguards scanning store transactions, inventory movements, and revenue for billing spikes & leakage.'}
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
            Export Incident Log (CSV)
          </Button>
          <Button
            variant="glass"
            size="sm"
            onClick={() => fetchAnomalies(true)}
            isLoading={refreshing}
            icon={RefreshCw}
          >
            Run Safeguard Scan
          </Button>
        </div>
      </div>

      {/* Top Telemetry KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card hoverEffect>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Flagged Incidents
              </span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {summary.total_anomalies_detected} Events
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Scanned by Isolation Forest AI</p>
            </div>
          </Card>

          <Card hoverEffect className="border-rose-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Critical Risk Alerts
              </span>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {summary.critical_count} Critical
              </h3>
              <p className="text-xs text-rose-500 font-medium mt-1">Immediate intervention recommended</p>
            </div>
          </Card>

          <Card hoverEffect className="border-amber-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Warning Anomalies
              </span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {summary.warning_count} Warnings
              </h3>
              <p className="text-xs text-amber-500 font-medium mt-1">Operational variance alerts</p>
            </div>
          </Card>

          <Card hoverEffect>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Pending Investigation
              </span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {summary.unresolved_count} Unresolved
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Awaiting store manager review</p>
            </div>
          </Card>
        </div>
      )}

      {/* Model Insights & Preventative Guidance Box */}
      {summary?.insights && summary.insights.length > 0 && (
        <Card className="bg-gradient-to-r from-rose-900/20 via-slate-900/40 to-rose-900/20 border-rose-200/80 dark:border-rose-800/40">
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Automated Risk Analysis &amp; Preventative Security Insights</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              {summary.insights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {/* Controls & Incident Grid */}
      <Card>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          {/* Keyword Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search incident title or entity ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Severity Filter Buttons - exact lowercase name matching unit test */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-slate-400 mr-1" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">Severity:</span>
              {['all', 'critical', 'warning', 'info'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                    filterSeverity === sev
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              >
                <option value="all">All Incidents</option>
                <option value="unresolved">Unresolved Only</option>
                <option value="acknowledged">Under Investigation</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* Alert Sensitivity */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sensitivity:</span>
              <select
                value={contamination}
                onChange={(e) => setContamination(parseFloat(e.target.value))}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              >
                <option value="0.02">Strict Safeguard (2%)</option>
                <option value="0.05">Balanced Standard (5%)</option>
                <option value="0.10">High Sensitivity (10%)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sensitivity & Filtering Explanation Guide */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                Understanding AI Safeguard Sensitivity ({contamination === 0.02 ? '2% Strict' : contamination === 0.10 ? '10% High' : '5% Balanced'})
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {contamination === 0.02 && 'Strict mode (2% Contamination cutoff): Flags only the most extreme statistical outliers with >98% deviation from baseline sales or inventory velocity. Minimizes false alerts for high-volume stores.'}
                {contamination === 0.05 && 'Balanced standard (5% Contamination cutoff): Optimal AI Isolation Forest setting. Scans for billing surges, sudden bulk discounts, stock leakage, and margin erosion.'}
                {contamination === 0.10 && 'High sensitivity (10% Contamination cutoff): Maximum surveillance net. Catches minor operational variances and subtle transaction deviations for deep store audits.'}
              </p>
            </div>
          </div>
        </div>

        {/* Anomaly Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {loading ? (
            <div className="col-span-2 py-12 text-center text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-rose-500" />
              Scanning sales &amp; inventory telemetry with Isolation Forest...
            </div>
          ) : apiError ? (
            <div className="col-span-2 py-12 text-center">
              <div className="max-w-xs mx-auto space-y-2">
                <AlertTriangle className="w-6 h-6 text-rose-500 mx-auto" />
                <p className="text-slate-500 text-xs">{apiError}</p>
                <Button variant="outline" size="xs" icon={RefreshCw} onClick={() => fetchAnomalies(true)}>
                  Retry Scan
                </Button>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="col-span-2 py-12 text-center text-slate-500 text-xs">
              {isSales
                ? 'No deal anomalies or pricing discrepancies detected on your account. All sales quotations and transactions align with authorized pricing thresholds.'
                : 'No safeguard incident events match the selected filters.'}
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition-all ${
                  item.severity === 'Critical'
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30 hover:border-rose-400'
                    : item.severity === 'Warning'
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-500/30 hover:border-amber-400'
                    : 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        item.severity === 'Critical'
                          ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          : item.severity === 'Warning'
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                      }`}
                    >
                      {item.severity}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">{item.anomaly_type}</span>
                    {item.status === 'acknowledged' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        Under Investigation
                      </span>
                    )}
                    {item.status === 'resolved' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        Resolved ✓
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                    Score: {item.anomaly_score}
                  </span>
                </div>

                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">{item.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">{item.description}</p>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs">
                  <span className="text-slate-400 font-mono text-[11px]">Entity ID: {item.entity_id || 'N/A'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyReport(item)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title="Copy Incident Report"
                    >
                      {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    {item.status === 'resolved' ? (
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg font-semibold text-xs flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Incident Resolved
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStatusChange(item.id, 'acknowledge')}
                          disabled={item.status === 'acknowledged'}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                            item.status === 'acknowledged'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30 opacity-70 cursor-not-allowed'
                              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {item.status === 'acknowledged' ? 'Acknowledged' : 'Acknowledge'}
                        </button>
                        <button
                          onClick={() => handleStatusChange(item.id, 'resolve')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-md shadow-emerald-600/20"
                        >
                          <CheckSquare className="w-3.5 h-3.5" /> Resolve
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
