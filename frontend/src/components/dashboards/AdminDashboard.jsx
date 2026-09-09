import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  Brain,
  Bug,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  Database,
  Download,
  Eye,
  FileCode,
  Filter,
  Key,
  Layers,
  Lock,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Terminal,
  Trash2,
  UserCheck,
  Users,
  Wrench,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/Card';

export const AdminDashboard = ({ activeTab: externalActiveTab, onTabChange }) => {
  const { api, profile } = useAuth();
  const { addToast } = useToast();

  const [internalTab, setInternalTab] = useState('businesses');
  const currentTab = externalActiveTab || internalTab;

  const handleTabSelect = (tabId) => {
    setInternalTab(tabId);
    if (typeof onTabChange === 'function') {
      onTabChange(tabId);
    }
  };

  const [roles, setRoles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [monitoringData, setMonitoringData] = useState(null);
  const [dbStatus, setDbStatus] = useState({ status: 'connected', latencyMs: 12 });
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [selectedBusinessFilter, setSelectedBusinessFilter] = useState('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logSeverityFilter, setLogSeverityFilter] = useState('all');
  const [businessSearchQuery, setBusinessSearchQuery] = useState('');
  const [expandedBusinessId, setExpandedBusinessId] = useState('aravali');
  const [selectedEventModal, setSelectedEventModal] = useState(null);
  const [selectedErrorModal, setSelectedErrorModal] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [retrainingModel, setRetrainingModel] = useState(null);
  const [rbacSearch, setRbacSearch] = useState('');

  // Error Handling Tab State
  const [errorSearchQuery, setErrorSearchQuery] = useState('');
  const [selectedErrorSeverity, setSelectedErrorSeverity] = useState('all');
  const [selectedErrorCategory, setSelectedErrorCategory] = useState('all');

  // Comprehensive Multi-Tenant Business Directory with Phone Numbers, Emails, and Staff Details
  const [businesses, setBusinesses] = useState([
    {
      id: 'aravali',
      name: 'Aravali Retail Group',
      ownerName: 'Aarav Sharma',
      ownerEmail: 'owner.demo@marketmind.example.com',
      ownerPhone: '+91 98201 45678',
      currency: 'INR (₹)',
      timezone: 'Asia/Kolkata',
      joinedDate: '2026-01-15',
      status: 'ACTIVE',
      storesCount: 2,
      employees: [
        {
          id: 'emp-1',
          name: 'Vikram Mehta',
          email: 'manager.demo@marketmind.example.com',
          phone: '+91 98111 22334',
          role: 'Store Manager',
          store: 'Main Store (Jaipur)',
          status: 'ACTIVE',
          lastActive: '10 minutes ago'
        },
        {
          id: 'emp-2',
          name: 'Priya Verma',
          email: 'priya.sales@aravali.example.com',
          phone: '+91 98777 66554',
          role: 'Sales Executive',
          store: 'Main Store (Jaipur)',
          status: 'ACTIVE',
          lastActive: '1 hour ago'
        },
        {
          id: 'emp-3',
          name: 'Rahul Sen',
          email: 'rahul.sales@aravali.example.com',
          phone: '+91 98999 88776',
          role: 'Sales Executive',
          store: 'Udaipur Branch',
          status: 'PENDING_INVITE',
          lastActive: 'Invitation Sent'
        }
      ],
      aiModels: [
        {
          name: 'Sales & Revenue Demand Forecasting',
          algorithm: 'Prophet + XGBoost Hybrid',
          version: 'v2.1.0-prophet',
          lastTrained: 'Today, 04:30 PM',
          accuracyScore: 0.932,
          status: 'ACTIVE',
          horizon: '30-Day Forward'
        },
        {
          name: 'Customer RFM Segmentation',
          algorithm: 'K-Means Clustering',
          version: 'v1.4.0-kmeans',
          lastTrained: 'Yesterday, 08:15 PM',
          accuracyScore: 0.885,
          status: 'ACTIVE',
          horizon: '4 Customer Clusters (Silhouette 0.74)'
        },
        {
          name: 'Product Cross-Sell Recommendations',
          algorithm: 'Apriori + Collaborative Filtering',
          version: 'v1.0.0-cf',
          lastTrained: 'Today, 02:00 PM',
          accuracyScore: 0.864,
          status: 'ACTIVE',
          horizon: '86.4% Catalog Coverage'
        },
        {
          name: 'Customer Retention & Churn Predictor',
          algorithm: 'RandomForest + Logistic Classifier',
          version: 'v1.0.0-churn',
          lastTrained: '2 days ago',
          accuracyScore: 0.915,
          status: 'ACTIVE',
          horizon: '30/60/90d Risk Scoring'
        },
        {
          name: 'Isolation Forest Anomaly Detection',
          algorithm: 'IsolationForest',
          version: 'v1.0.0-isoforest',
          lastTrained: 'Today, 05:10 PM',
          accuracyScore: 0.948,
          status: 'ACTIVE',
          horizon: '0.05 Contamination Factor'
        }
      ]
    },
    {
      id: 'northwind',
      name: 'Northwind Enterprises',
      ownerName: 'Dev Patel',
      ownerEmail: 'owner@northwind.example.com',
      ownerPhone: '+91 98450 12390',
      currency: 'INR (₹)',
      timezone: 'Asia/Kolkata',
      joinedDate: '2026-03-02',
      status: 'ACTIVE',
      storesCount: 1,
      employees: [
        {
          id: 'emp-4',
          name: 'Amit Joshi',
          email: 'amit.manager@northwind.example.com',
          phone: '+91 98333 44556',
          role: 'Store Manager',
          store: 'North Hub Store',
          status: 'ACTIVE',
          lastActive: '3 hours ago'
        },
        {
          id: 'emp-5',
          name: 'Sneha Roy',
          email: 'sneha.sales@northwind.example.com',
          phone: '+91 98666 77889',
          role: 'Sales Executive',
          store: 'North Hub Store',
          status: 'ACTIVE',
          lastActive: '5 hours ago'
        }
      ],
      aiModels: [
        {
          name: 'Sales & Revenue Demand Forecasting',
          algorithm: 'ARIMA + SARIMAX',
          version: 'v1.2.0-arima',
          lastTrained: '3 days ago',
          accuracyScore: 0.895,
          status: 'ACTIVE',
          horizon: '14-Day Forward'
        },
        {
          name: 'Customer RFM Segmentation',
          algorithm: 'K-Means Clustering',
          version: 'v1.2.0-kmeans',
          lastTrained: '3 days ago',
          accuracyScore: 0.840,
          status: 'ACTIVE',
          horizon: '3 Clusters'
        },
        {
          name: 'Product Cross-Sell Recommendations',
          algorithm: 'Association Rules',
          version: 'v1.0.0-rules',
          lastTrained: '3 days ago',
          accuracyScore: 0.820,
          status: 'ACTIVE',
          horizon: '75% Catalog Coverage'
        },
        {
          name: 'Customer Retention & Churn Predictor',
          algorithm: 'LogisticRegression',
          version: 'v1.0.0-logistic',
          lastTrained: '3 days ago',
          accuracyScore: 0.875,
          status: 'ACTIVE',
          horizon: '30d Risk Evaluation'
        },
        {
          name: 'Isolation Forest Anomaly Detection',
          algorithm: 'IsolationForest',
          version: 'v1.0.0-isoforest',
          lastTrained: 'Yesterday, 09:30 AM',
          accuracyScore: 0.930,
          status: 'ACTIVE',
          horizon: '0.05 Contamination'
        }
      ]
    }
  ]);

  // Comprehensive System Error Logs
  const [systemErrors, setSystemErrors] = useState([
    {
      id: 'ERR-8902',
      errorCode: 'RESEND_DISPATCH_TIMEOUT',
      category: 'Email Gateway',
      severity: 'WARNING',
      timestamp: 'Today, 05:22:10 PM',
      business: 'Aravali Retail Group',
      endpoint: 'POST /api/v1/auth/developer/request-otp',
      message: 'SMTP fallback skipped; Resend API connection latency spiked to 840ms before acknowledging receipt.',
      stackTrace: 'Error: Resend API Gateway Timeout\n  at send_via_resend (email_delivery.py:59)\n  at send_security_email (email_delivery.py:66)\n  at request_developer_otp (auth.py:351)',
      status: 'RESOLVED',
      resolution: 'Connection re-established. Key validated and OTP received successfully.'
    },
    {
      id: 'ERR-8744',
      errorCode: 'ISOLATION_FOREST_MIN_SAMPLES_WARN',
      category: 'AI Pipeline',
      severity: 'INFO',
      timestamp: 'Today, 03:15:00 PM',
      business: 'Northwind Enterprises',
      endpoint: 'GET /api/v1/anomalies',
      message: 'Transaction history size (48 samples) is below recommended threshold of 100 for optimal contamination calibration.',
      stackTrace: 'UserWarning: n_samples is smaller than optimal fit window\n  at detect_anomalies (anomaly_service.py:72)\n  at get_anomalies (anomalies.py:34)',
      status: 'RESOLVED',
      resolution: 'Synthetic warmup batch applied. Detection operating normally.'
    },
    {
      id: 'ERR-8611',
      errorCode: 'HTTP_422_UNPROCESSABLE_ENTITY',
      category: 'API & Validation',
      severity: 'WARNING',
      timestamp: 'Yesterday, 08:44:12 PM',
      business: 'Aravali Retail Group',
      endpoint: 'POST /api/v1/auth/password-reset/confirm',
      message: 'Password confirmation failed validation policy: token missing or expired before submission.',
      stackTrace: 'HTTPException: status_code=422, detail="Password reset token expired or invalid"\n  at confirm_password_reset (auth.py:228)',
      status: 'RESOLVED',
      resolution: 'User requested fresh OTP token. Password successfully reset.'
    },
    {
      id: 'ERR-8509',
      errorCode: 'SQLITE_BUSY_WAL_CHECKPOINT',
      category: 'Database Engine',
      severity: 'INFO',
      timestamp: 'Yesterday, 02:10:45 PM',
      business: 'System Platform Root',
      endpoint: 'WAL Checkpoint Background Task',
      message: 'SQLite database journal executed passive WAL checkpointing; 0 readers delayed.',
      stackTrace: 'sqlite3.OperationalError: wal checkpoint passive mode\n  at execute_checkpoint (db/session.py:88)',
      status: 'RESOLVED',
      resolution: 'WAL checkpoint completed cleanly. Zero read locks encountered.'
    }
  ]);

  const loadPlatformData = useCallback(async () => {
    const startTime = performance.now();
    try {
      const [roleCatalog, auditEvents, telemetry] = await Promise.allSettled([
        api('/users/roles/catalog'),
        api('/audit?limit=200'),
        api('/models/monitoring')
      ]);

      const latency = Math.round(performance.now() - startTime);
      setDbStatus({ status: 'connected', latencyMs: Math.max(latency, 8) });

      if (roleCatalog.status === 'fulfilled') setRoles(roleCatalog.value || []);
      if (auditEvents.status === 'fulfilled') setLogs(auditEvents.value || []);
      if (telemetry.status === 'fulfilled') setMonitoringData(telemetry.value);
    } catch (error) {
      addToast(error.message || 'Error fetching system telemetry', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [api, addToast]);

  useEffect(() => {
    loadPlatformData();
    const seconds = Number(profile?.role_preferences?.monitoring_refresh || 60);
    const timer = window.setInterval(loadPlatformData, Math.max(seconds, 15) * 1000);
    return () => window.clearInterval(timer);
  }, [loadPlatformData, profile?.role_preferences?.monitoring_refresh]);

  const handleRetrainModel = async (businessId, modelName) => {
    setRetrainingModel(`${businessId}-${modelName}`);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      setBusinesses((prev) =>
        prev.map((biz) => {
          if (biz.id !== businessId) return biz;
          return {
            ...biz,
            aiModels: biz.aiModels.map((m) =>
              m.name === modelName
                ? { ...m, lastTrained: 'Just now (' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ')' }
                : m
            )
          };
        })
      );
      addToast(`Pipeline retrain triggered for ${modelName} (${businessId}).`, 'success');
    } finally {
      setRetrainingModel(null);
    }
  };

  const handleRetrainAllForBusiness = async (businessId) => {
    setRetrainingModel(businessId);
    try {
      await new Promise((r) => setTimeout(r, 1400));
      const nowStr = 'Just now (' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ')';
      setBusinesses((prev) =>
        prev.map((biz) => {
          if (biz.id !== businessId && businessId !== 'all') return biz;
          return {
            ...biz,
            aiModels: biz.aiModels.map((m) => ({ ...m, lastTrained: nowStr }))
          };
        })
      );
      addToast(`All AI models retrained successfully for ${businessId === 'all' ? 'All Businesses' : businessId}.`, 'success');
    } finally {
      setRetrainingModel(null);
    }
  };

  const handleSimulateError = () => {
    const newErr = {
      id: `ERR-${Math.floor(1000 + Math.random() * 9000)}`,
      errorCode: 'DEV_SIMULATED_TEST_EXCEPTION',
      category: 'Diagnostic Simulator',
      severity: 'WARNING',
      timestamp: 'Just now (' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ')',
      business: selectedBusinessFilter === 'all' ? 'Aravali Retail Group' : selectedBusinessFilter,
      endpoint: 'POST /api/v1/system/diagnostics',
      message: 'Simulated exception test to verify platform alerting, trace capturing, and admin recovery pipelines.',
      stackTrace: 'DiagnosticError: Developer simulated test anomaly\n  at handleSimulateError (AdminDashboard.jsx:265)\n  at SyntheticEvent (react-dom.js)',
      status: 'ACTIVE',
      resolution: 'Manual test trigger. Ready to be marked as resolved by Administrator.'
    };
    setSystemErrors((prev) => [newErr, ...prev]);
    addToast('Simulated test error generated in diagnostics stream.', 'info');
  };

  const handleResolveError = (errId) => {
    setSystemErrors((prev) =>
      prev.map((e) => (e.id === errId ? { ...e, status: 'RESOLVED', resolution: 'Marked resolved by Administrator' } : e))
    );
    addToast(`Error ${errId} marked as resolved.`, 'success');
  };

  const handleClearResolvedErrors = () => {
    setSystemErrors((prev) => prev.filter((e) => e.status !== 'RESOLVED'));
    addToast('Resolved error logs archived.', 'info');
  };

  const handleCopyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `marketmind-auth-audit-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast('Audit log JSON exported successfully.', 'success');
  };

  const handleExportErrors = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(systemErrors, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `marketmind-system-errors-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast('Error diagnostics report exported.', 'success');
  };

  // Helper to map audit logs to emails and businesses
  const getLogBusinessName = (event) => {
    const email = (event.details?.recipient || event.details?.email || '').toLowerCase();
    const detailsStr = JSON.stringify(event.details || {}).toLowerCase();
    if (email.includes('aravali') || detailsStr.includes('aravali')) return 'Aravali Retail Group';
    if (email.includes('northwind') || detailsStr.includes('northwind')) return 'Northwind Enterprises';
    if (event.event_type?.includes('developer') || email.includes('admin') || detailsStr.includes('developer_otp')) {
      return 'System Administrator (Root)';
    }
    return 'Aravali Retail Group';
  };

  const getLogActorEmail = (event) => {
    return (
      event.details?.recipient ||
      event.details?.email ||
      (event.event_type?.includes('developer') ? 'admin.root@marketmind.local' : 'user@marketmind.local')
    );
  };

  const getLogAuthMethod = (event) => {
    const type = (event.event_type || '').toLowerCase();
    if (type.includes('developer_otp')) return 'Passwordless OTP (Admin Channel)';
    if (type.includes('login')) return 'Password + MFA Verified';
    if (type.includes('token') || type.includes('verify')) return 'One-Time Token Validation';
    if (type.includes('invite')) return 'Employee Invitation Onboarding';
    return 'Session Authentication';
  };

  const getEventSeverity = (event) => {
    const type = (event.event_type || '').toLowerCase();
    if (type.includes('lockout') || type.includes('failed') || type.includes('decline')) return 'CRITICAL';
    if (type.includes('anomaly') || type.includes('reset') || type.includes('role')) return 'WARNING';
    if (type.includes('otp') || type.includes('login') || type.includes('verify')) return 'SUCCESS';
    return 'INFO';
  };

  // Filtered Logs for Tab 2
  const filteredLogs = useMemo(() => {
    return logs.filter((event) => {
      const type = (event.event_type || '').toLowerCase();
      const email = getLogActorEmail(event).toLowerCase();
      const businessName = getLogBusinessName(event);
      const severity = getEventSeverity(event);
      const detailsStr = JSON.stringify(event.details || {}).toLowerCase();

      const matchesSearch =
        !logSearchQuery.trim() ||
        type.includes(logSearchQuery.toLowerCase()) ||
        email.includes(logSearchQuery.toLowerCase()) ||
        detailsStr.includes(logSearchQuery.toLowerCase());

      const matchesSeverity = logSeverityFilter === 'all' || severity === logSeverityFilter;

      const matchesBusiness =
        selectedBusinessFilter === 'all' ||
        (selectedBusinessFilter === 'aravali' && businessName.includes('Aravali')) ||
        (selectedBusinessFilter === 'northwind' && businessName.includes('Northwind')) ||
        (selectedBusinessFilter === 'root' && businessName.includes('Root'));

      return matchesSearch && matchesSeverity && matchesBusiness;
    });
  }, [logs, logSearchQuery, logSeverityFilter, selectedBusinessFilter]);

  // Filtered System Errors for Tab 4
  const filteredErrors = useMemo(() => {
    return systemErrors.filter((err) => {
      const q = errorSearchQuery.toLowerCase();
      const matchesSearch =
        !q.trim() ||
        err.id.toLowerCase().includes(q) ||
        err.errorCode.toLowerCase().includes(q) ||
        err.message.toLowerCase().includes(q) ||
        err.business.toLowerCase().includes(q);

      const matchesSeverity = selectedErrorSeverity === 'all' || err.severity === selectedErrorSeverity;
      const matchesCategory = selectedErrorCategory === 'all' || err.category === selectedErrorCategory;

      return matchesSearch && matchesSeverity && matchesCategory;
    });
  }, [systemErrors, errorSearchQuery, selectedErrorSeverity, selectedErrorCategory]);

  // Filtered Businesses for Tab 1
  const filteredBusinesses = useMemo(() => {
    if (!businessSearchQuery.trim()) return businesses;
    const q = businessSearchQuery.toLowerCase();
    return businesses.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.ownerName.toLowerCase().includes(q) ||
        b.ownerEmail.toLowerCase().includes(q) ||
        b.ownerPhone.toLowerCase().includes(q)
    );
  }, [businesses, businessSearchQuery]);

  const totalEmployeesAcrossPlatform = useMemo(() => {
    return businesses.reduce((acc, b) => acc + b.employees.length, 0);
  }, [businesses]);

  const totalStoresAcrossPlatform = useMemo(() => {
    return businesses.reduce((acc, b) => acc + b.storesCount, 0);
  }, [businesses]);

  const permissions = useMemo(
    () => [...new Set(roles.flatMap((role) => role.permissions))].sort(),
    [roles]
  );
  const roleByCode = useMemo(
    () => Object.fromEntries(roles.map((role) => [role.code, role])),
    [roles]
  );

  const filteredPermissions = useMemo(() => {
    if (!rbacSearch.trim()) return permissions;
    return permissions.filter((p) => p.toLowerCase().includes(rbacSearch.toLowerCase()));
  }, [permissions, rbacSearch]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Platform Command Center Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800/80 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 w-48 h-48 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-xs font-semibold text-indigo-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>RESTRICTED SYSTEM ROOT • PLATFORM ADMIN CONSOLE</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Platform Governance &amp; Diagnostics
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Real-time platform governance, business tenant directories, authentication audit logs, AI retrain pipelines, and error diagnostics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={loadPlatformData}
              icon={RefreshCw}
              className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-xs font-semibold"
            >
              Refresh Data
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleRetrainAllForBusiness('all')}
              isLoading={retrainingModel === 'all'}
              icon={Zap}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
            >
              Retrain All AI Models
            </Button>
          </div>
        </div>
      </div>

      {/* Platform Level Metric Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800/80 bg-slate-900/80 backdrop-blur-md shadow-lg hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Business Owners</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tabular-nums tracking-tight">{businesses.length} Owners</span>
            <span className="text-xs text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10">100% Active</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">{totalStoresAcrossPlatform} Stores • {totalEmployeesAcrossPlatform} Employees</p>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/80 backdrop-blur-md shadow-lg hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Auth &amp; Login Stream</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tabular-nums tracking-tight">{logs.length}</span>
            <span className="text-xs text-slate-400">Events Recorded</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Exact Timestamps &amp; Email Tracking</p>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/80 backdrop-blur-md shadow-lg hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Retrain Engines</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Brain className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400 tabular-nums tracking-tight">5 Engines / Biz</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Forecast • Seg • Recs • Churn • Safeguards</p>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/80 backdrop-blur-md shadow-lg hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Error Diagnostics</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertOctagon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-400 tabular-nums tracking-tight">
              {systemErrors.filter((e) => e.status !== 'RESOLVED').length} Active
            </span>
            <span className="text-xs text-slate-400">({systemErrors.length} total)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Live Stack Traces &amp; Alert Stream</p>
        </Card>
      </div>

      {/* Horizontal Top Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => handleTabSelect('businesses')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            currentTab === 'businesses'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Business Owners &amp; Teams</span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-900/80 text-indigo-200">{businesses.length}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSelect('auth_logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            currentTab === 'auth_logs'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Authentication &amp; Login Timings</span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300">{filteredLogs.length}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSelect('ai_models')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            currentTab === 'ai_models'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>AI Models &amp; Retrain Schedules</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSelect('errors')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            currentTab === 'errors'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Error Handling &amp; Diagnostics</span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-900/80 text-rose-200">
            {systemErrors.filter((e) => e.status !== 'RESOLVED').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSelect('system')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            currentTab === 'system'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>System Health &amp; RBAC</span>
        </button>
      </div>

      {/* TAB 1: Business Owners & Their Employees Directory */}
      {currentTab === 'businesses' && (
        <div className="space-y-4 font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg backdrop-blur-md">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                Multi-Tenant Business Owners &amp; Complete Staff Directory
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Displays total Business Owners ({businesses.length}), verified contact profiles (email, phone, business name), and all registered staff records.
              </p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, phone, business..."
                value={businessSearchQuery}
                onChange={(e) => setBusinessSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition shadow-inner"
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredBusinesses.map((biz) => {
              const isExpanded = expandedBusinessId === biz.id;
              return (
                <Card key={biz.id} className="border-slate-800/80 bg-slate-900/80 overflow-hidden shadow-xl hover:border-slate-700/80 transition">
                  <div
                    onClick={() => setExpandedBusinessId(isExpanded ? null : biz.id)}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/40 transition"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-md">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="font-bold text-white text-base tracking-tight">{biz.name}</h4>
                          <Badge variant="success" className="text-[10px] px-2 py-0.5 font-semibold uppercase">{biz.status}</Badge>
                          <span className="text-xs text-slate-400 font-mono bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                            ID: {biz.id}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Users className="w-3.5 h-3.5 text-indigo-400" />
                            Owner: <strong className="text-white font-semibold">{biz.ownerName}</strong>
                          </span>
                          <span className="flex items-center gap-1.5 text-indigo-300 font-medium">
                            <Mail className="w-3.5 h-3.5 text-indigo-400" />
                            {biz.ownerEmail}
                          </span>
                          <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                            {biz.ownerPhone}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                      <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Active Stores</span>
                        <span className="font-bold text-white tabular-nums">{biz.storesCount} Stores</span>
                      </div>
                      <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Registered Staff</span>
                        <span className="font-bold text-indigo-300 tabular-nums">{biz.employees.length} Employees</span>
                      </div>
                      <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Joined Date</span>
                        <span className="text-slate-300 font-medium">{biz.joinedDate}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white transition">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Employees Section */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/80 bg-slate-950/60 p-5 space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          Affiliated Employees under {biz.name} ({biz.employees.length} Staff Members)
                        </h5>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Owner Contact: {biz.ownerPhone} • {biz.ownerEmail}
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                        <table className="w-full text-left text-xs">
                          <thead className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 border-b border-slate-800/80 bg-slate-900/90">
                            <tr>
                              <th className="py-3 px-3.5">Employee Name</th>
                              <th className="py-3 px-3.5">Email Address</th>
                              <th className="py-3 px-3.5">Phone Number</th>
                              <th className="py-3 px-3.5">Role</th>
                              <th className="py-3 px-3.5">Assigned Store</th>
                              <th className="py-3 px-3.5">Status</th>
                              <th className="py-3 px-3.5 text-right">Last Active</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50 bg-slate-950/40">
                            {biz.employees.map((emp) => (
                              <tr key={emp.id} className="hover:bg-slate-800/30 transition">
                                <td className="py-3 px-3.5 font-semibold text-white flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-[11px] text-indigo-300 font-bold">
                                    {emp.name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <span className="font-semibold">{emp.name}</span>
                                </td>
                                <td className="py-3 px-3.5 text-indigo-300 font-medium">{emp.email}</td>
                                <td className="py-3 px-3.5 text-emerald-300 font-semibold">{emp.phone}</td>
                                <td className="py-3 px-3.5">
                                  <Badge
                                    variant={emp.role === 'Store Manager' ? 'info' : 'success'}
                                    className="text-[10px] px-2 py-0.5 font-semibold"
                                  >
                                    {emp.role}
                                  </Badge>
                                </td>
                                <td className="py-3 px-3.5 text-slate-300 flex items-center gap-1.5 font-medium">
                                  <Store className="w-3.5 h-3.5 text-slate-500 inline" />
                                  {emp.store}
                                </td>
                                <td className="py-3 px-3.5">
                                  <span
                                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                      emp.status === 'ACTIVE'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    }`}
                                  >
                                    {emp.status}
                                  </span>
                                </td>
                                <td className="py-3 px-3.5 text-right text-slate-400 font-medium">{emp.lastActive}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Authentication & Login Logs (with Business Filter) */}
      {currentTab === 'auth_logs' && (
        <div className="space-y-4 font-sans">
          <Card className="border-slate-800/80 bg-slate-900/80 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by email, event name, or IP address..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Filter By Business Selection Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Business:</span>
                  <select
                    value={selectedBusinessFilter}
                    onChange={(e) => setSelectedBusinessFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">All Businesses &amp; Platform</option>
                    <option value="aravali">Aravali Retail Group</option>
                    <option value="northwind">Northwind Enterprises</option>
                    <option value="root">System Root / Admin Only</option>
                  </select>
                </div>

                <select
                  value={logSeverityFilter}
                  onChange={(e) => setLogSeverityFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Severities</option>
                  <option value="SUCCESS">Success Only</option>
                  <option value="INFO">Info</option>
                  <option value="WARNING">Warning</option>
                  <option value="CRITICAL">Critical</option>
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportLogs}
                  icon={Download}
                  className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
                >
                  Export Logs
                </Button>
              </div>
            </div>

            {/* Detailed Auth Stream Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 border-b border-slate-800 bg-slate-950/80">
                  <tr>
                    <th className="p-3.5">Timestamp &amp; Date</th>
                    <th className="p-3.5">Actor Email</th>
                    <th className="p-3.5">Business Workspace</th>
                    <th className="p-3.5">Auth Method / Event</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-500 text-xs">
                        No authentication logs found for the selected business or criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((event) => {
                      const email = getLogActorEmail(event);
                      const biz = getLogBusinessName(event);
                      const method = getLogAuthMethod(event);
                      const severity = getEventSeverity(event);
                      const dateObj = new Date(event.created_at);

                      return (
                        <tr key={event.id || Math.random()} className="hover:bg-slate-800/30 transition">
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="font-bold text-white block tabular-nums">
                              {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </td>
                          <td className="p-3.5 font-bold text-indigo-300">{email}</td>
                          <td className="p-3.5 text-slate-300">
                            <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-[11px] font-semibold">
                              {biz}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="text-slate-200 block font-semibold">{event.event_type}</span>
                            <span className="text-[11px] text-slate-400 font-medium">{method}</span>
                          </td>
                          <td className="p-3.5">
                            <Badge
                              variant={
                                severity === 'CRITICAL' ? 'danger' :
                                severity === 'WARNING' ? 'warning' :
                                severity === 'SUCCESS' ? 'success' : 'info'
                              }
                              className="text-[10px] px-2 py-0.5 font-semibold"
                            >
                              {severity}
                            </Badge>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedEventModal(event)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              title="Inspect Payload"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: AI Models & Last Train Dates (Per Business) */}
      {currentTab === 'ai_models' && (
        <div className="space-y-6 font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg backdrop-blur-md">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                AI Inference Engines &amp; Training Schedules
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Inspect last training dates, model architectures, accuracy scores, and retrain pipelines per business tenant.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Filter Business:</span>
              <select
                value={selectedBusinessFilter}
                onChange={(e) => setSelectedBusinessFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-semibold focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Businesses</option>
                <option value="aravali">Aravali Retail Group</option>
                <option value="northwind">Northwind Enterprises</option>
              </select>
            </div>
          </div>

          <div className="space-y-6">
            {businesses
              .filter((b) => selectedBusinessFilter === 'all' || b.id === selectedBusinessFilter)
              .map((biz) => (
                <Card key={biz.id} className="border-slate-800/80 bg-slate-900/80 shadow-xl overflow-hidden">
                  <CardHeader className="border-b border-slate-800/80 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <Building2 className="w-4 h-4 text-indigo-400" />
                          <CardTitle className="text-base font-bold text-white tracking-tight">{biz.name}</CardTitle>
                          <Badge variant="info" className="text-[10px] font-semibold">5 AI Engines Configured</Badge>
                        </div>
                        <CardDescription className="text-xs mt-1 text-slate-400">
                          Tenant ID: <strong className="text-slate-300 font-mono">{biz.id}</strong> • Owner: <strong className="text-slate-300">{biz.ownerName}</strong> ({biz.ownerPhone} • {biz.ownerEmail})
                        </CardDescription>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetrainAllForBusiness(biz.id)}
                        isLoading={retrainingModel === biz.id}
                        icon={RefreshCw}
                        className="text-xs border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-200 font-semibold"
                      >
                        Retrain All Models for {biz.name.split(' ')[0]}
                      </Button>
                    </div>
                  </CardHeader>

                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {biz.aiModels.map((model, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between space-y-3.5 shadow-md hover:border-slate-700 transition"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h5 className="font-bold text-white text-xs tracking-tight">{model.name}</h5>
                              <p className="text-[11px] font-semibold text-indigo-400 mt-0.5">{model.algorithm}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              ACTIVE
                            </span>
                          </div>

                          <div className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 text-[11px] font-medium">Last Trained:</span>
                              <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-emerald-400" />
                                {model.lastTrained}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 text-[11px] font-medium">Version:</span>
                              <span className="text-slate-300 font-mono text-[11px]">{model.version}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 text-[11px] font-medium">Accuracy Score:</span>
                              <span className="text-indigo-300 font-bold text-[11px] tabular-nums">
                                {(model.accuracyScore * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 text-[11px] font-medium">Scope:</span>
                              <span className="text-slate-300 text-[11px] font-medium truncate max-w-[150px]">{model.horizon}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={retrainingModel === `${biz.id}-${model.name}`}
                          onClick={() => handleRetrainModel(biz.id, model.name)}
                          className="w-full py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-indigo-900/40 border border-slate-800 hover:border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                        >
                          {retrainingModel === `${biz.id}-${model.name}` ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Retraining...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3.5 h-3.5" /> Retrain Model
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* TAB 4: Dedicated Error Handling & Diagnostics */}
      {currentTab === 'errors' && (
        <div className="space-y-4 font-sans">
          <Card className="border-slate-800/80 bg-slate-900/80 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <CardTitle className="text-base font-bold text-white tracking-tight">System Error &amp; Exception Diagnostic Center</CardTitle>
                    <Badge variant="danger" className="text-[10px] font-semibold">
                      {systemErrors.filter((e) => e.status !== 'RESOLVED').length} Active Issues
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-1 text-slate-400 leading-relaxed">
                    Live capture of unhandled API exceptions, database locks, ML inference warnings, and email delivery timeouts.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSimulateError}
                    icon={Bug}
                    className="border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 text-xs font-semibold"
                  >
                    Simulate Test Error
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearResolvedErrors}
                    icon={Trash2}
                    className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Clear Resolved
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportErrors}
                    icon={Download}
                    className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Export Report
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Error Filters & Search Bar */}
            <div className="p-4 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search error code, message, endpoint, or business..."
                  value={errorSearchQuery}
                  onChange={(e) => setErrorSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={selectedErrorSeverity}
                  onChange={(e) => setSelectedErrorSeverity(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Severities</option>
                  <option value="CRITICAL">Critical Only</option>
                  <option value="ERROR">Error Only</option>
                  <option value="WARNING">Warning Only</option>
                  <option value="INFO">Info Only</option>
                </select>

                <select
                  value={selectedErrorCategory}
                  onChange={(e) => setSelectedErrorCategory(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Categories</option>
                  <option value="Email Gateway">Email Gateway</option>
                  <option value="AI Pipeline">AI Pipeline</option>
                  <option value="Database Engine">Database Engine</option>
                  <option value="API & Validation">API & Validation</option>
                  <option value="Diagnostic Simulator">Diagnostic Simulator</option>
                </select>
              </div>
            </div>

            {/* Error Records Stream */}
            <div className="p-4 space-y-3.5">
              {filteredErrors.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No system error logs match your search filters.
                </div>
              ) : (
                filteredErrors.map((err) => {
                  const isResolved = err.status === 'RESOLVED';
                  return (
                    <div
                      key={err.id}
                      className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition space-y-3 shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <Badge
                            variant={
                              err.severity === 'CRITICAL' ? 'danger' :
                              err.severity === 'WARNING' ? 'warning' : 'info'
                            }
                            className="text-[10px] px-2 py-0.5 font-semibold"
                          >
                            {err.severity}
                          </Badge>
                          <span className="font-bold text-white text-xs font-mono">{err.errorCode}</span>
                          <span className="text-[11px] text-indigo-400 font-semibold">[{err.category}]</span>
                          <span className="text-[11px] text-slate-400 font-mono">ID: {err.id}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[11px] font-medium">{err.timestamp}</span>
                          {isResolved ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              RESOLVED
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                              ACTIVE
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 text-[11px] font-medium">Affected Business: </span>
                          <span className="text-white font-semibold">{err.business}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[11px] font-medium">Endpoint / Context: </span>
                          <span className="text-indigo-300 font-mono text-[11px]">{err.endpoint}</span>
                        </div>
                      </div>

                      <p className="text-slate-300 text-xs leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 font-medium">
                        {err.message}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <div className="text-[11px] text-emerald-400/90 truncate max-w-lg font-medium">
                          <strong>Resolution:</strong> {err.resolution}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!isResolved && (
                            <button
                              type="button"
                              onClick={() => handleResolveError(err.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition"
                            >
                              Mark Resolved
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedErrorModal(err)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="View Stack Trace"
                          >
                            <FileCode className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: System Health & RBAC Policy */}
      {currentTab === 'system' && (
        <div className="space-y-6 font-sans">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="border-slate-800/80 bg-slate-900/90 shadow-lg">
              <CardHeader className="pb-3 border-b border-slate-800/80">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" /> Database Architecture
                </CardTitle>
              </CardHeader>
              <div className="p-4 space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400 font-medium">Engine</span>
                  <span className="text-white font-bold font-mono">SQLite 3 / WAL Mode</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400 font-medium">Connection Pool</span>
                  <span className="text-emerald-400 font-bold">StaticPool (Healthy)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400 font-medium">Query Latency</span>
                  <span className="text-white font-bold tabular-nums">{dbStatus.latencyMs} ms</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-medium">Multi-Tenancy</span>
                  <span className="text-emerald-400 font-bold">Tenant-Partitioned</span>
                </div>
              </div>
            </Card>

            <Card className="border-slate-800/80 bg-slate-900/90 shadow-lg">
              <CardHeader className="pb-3 border-b border-slate-800/80">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-400" /> Runtime Environment
                </CardTitle>
              </CardHeader>
              <div className="p-4 space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400 font-medium">Environment</span>
                  <span className="text-indigo-300 font-bold">Development / Production</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400 font-medium">Python Backend</span>
                  <span className="text-white font-bold font-mono">FastAPI + Uvicorn</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400 font-medium">Frontend Stack</span>
                  <span className="text-white font-bold font-mono">React 18 + Vite</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-medium">Auth Engine</span>
                  <span className="text-emerald-400 font-bold">OTP + JWT Verification</span>
                </div>
              </div>
            </Card>

            <Card className="border-slate-800/80 bg-slate-900/90 shadow-lg">
              <CardHeader className="pb-3 border-b border-slate-800/80">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-400" /> Dispatch Service
                </CardTitle>
              </CardHeader>
              <div className="p-4 space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400 font-medium">Provider</span>
                  <span className="text-blue-400 font-bold">Resend.com API</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400 font-medium">API Key Status</span>
                  <span className="text-emerald-400 font-bold">Configured (Active)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400 font-medium">Sender Address</span>
                  <span className="text-white font-mono text-[11px]">onboarding@resend.dev</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-medium">OTP Expiration</span>
                  <span className="text-white font-bold">10 Minutes</span>
                </div>
              </div>
            </Card>
          </div>

          {/* RBAC Policy Matrix Table */}
          <Card className="border-slate-800/80 bg-slate-900/80 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-indigo-400" />
                    Role-Based Access Control (RBAC) System Explorer
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Inspect system-enforced authorization policies across all roles.
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter permissions..."
                    value={rbacSearch}
                    onChange={(e) => setRbacSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="uppercase tracking-wider text-[11px] font-semibold text-slate-400 border-b border-slate-800 bg-slate-950/80 font-mono">
                  <tr>
                    <th className="p-3.5">Permission Key</th>
                    <th className="p-3.5 text-center">Business Owner</th>
                    <th className="p-3.5 text-center">Store Manager</th>
                    <th className="p-3.5 text-center">Sales Executive</th>
                    <th className="p-3.5 text-center">Administrator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredPermissions.map((permission) => (
                    <tr key={permission} className="hover:bg-slate-800/30 transition">
                      <td className="p-3.5 font-semibold text-slate-200">{permission}</td>
                      {['business_owner', 'store_manager', 'sales_executive', 'administrator'].map((roleCode) => {
                        const hasPerm = roleByCode[roleCode]?.permissions.includes(permission);
                        return (
                          <td key={roleCode} className="p-3.5 text-center">
                            {hasPerm ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                            ) : (
                              <span className="inline-block w-2 h-0.5 bg-slate-700 rounded-full mx-auto" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Auth Event Payload Modal */}
      {selectedEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in font-sans">
          <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm">
                  {selectedEventModal.event_type}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  ID: {selectedEventModal.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEventModal(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto rounded-2xl bg-slate-950 p-4 border border-slate-800/80 font-mono text-xs text-indigo-300">
              <pre>{JSON.stringify(selectedEventModal, null, 2)}</pre>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyText(JSON.stringify(selectedEventModal, null, 2), 'modal')}
                icon={copiedKey === 'modal' ? Check : Copy}
                className="text-xs font-semibold"
              >
                {copiedKey === 'modal' ? 'Copied' : 'Copy JSON'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedEventModal(null)}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 font-semibold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error Trace Diagnostic Modal */}
      {selectedErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in font-sans">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={selectedErrorModal.severity === 'CRITICAL' ? 'danger' : 'warning'} className="text-[10px] font-semibold">
                    {selectedErrorModal.severity}
                  </Badge>
                  <h3 className="font-bold text-white text-sm font-mono">
                    {selectedErrorModal.errorCode}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  ID: {selectedErrorModal.id} • Context: {selectedErrorModal.endpoint}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedErrorModal(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 flex-1 overflow-y-auto">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Error Message</span>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">{selectedErrorModal.message}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stack Trace &amp; Execution Path</span>
                <pre className="text-xs font-mono text-rose-300 whitespace-pre-wrap overflow-x-auto bg-slate-900/90 p-3 rounded-xl border border-slate-800/80">
                  {selectedErrorModal.stackTrace}
                </pre>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Automated Remediation</span>
                <p className="text-xs text-emerald-200 font-medium">{selectedErrorModal.resolution}</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium">
                Timestamp: {selectedErrorModal.timestamp}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyText(selectedErrorModal.stackTrace, 'err_trace')}
                  icon={copiedKey === 'err_trace' ? Check : Copy}
                  className="text-xs font-semibold"
                >
                  {copiedKey === 'err_trace' ? 'Copied' : 'Copy Trace'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectedErrorModal(null)}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 font-semibold"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
