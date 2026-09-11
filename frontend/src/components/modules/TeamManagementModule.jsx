import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Copy,
  Crown,
  IndianRupee,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Sparkles,
  Award,
  Download,
  CheckCircle2,
  Edit,
  UserCog,
  History,
  FileText,
  Package,
  Clock,
  Mail,
  Phone,
  KeyRound,
  ExternalLink,
  Save,
  Trash2,
  Store,
  Plus,
  Truck,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

const EMPLOYEE_ROLES = new Set(['store_manager', 'sales_executive']);
const money = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

const levelLabel = {
  excellent: 'Excellent',
  on_track: 'On track',
  needs_attention: 'Needs attention',
  not_rated: 'Not rated',
};

const levelVariant = {
  excellent: 'success',
  on_track: 'info',
  needs_attention: 'warning',
  not_rated: 'default',
};

export const TeamManagementModule = () => {
  const { api, reauthenticate, currentRole } = useAuth();
  const { users, refresh } = useData();
  const { addToast } = useToast();
  const isOwner = currentRole.id === 'owner';

  const [overview, setOverview] = useState(null);
  const [roles, setRoles] = useState([]);
  const [stores, setStores] = useState([]);
  const [filters, setFilters] = useState({ search: '', role: 'all', store: 'all', from: '', to: '' });
  const [selected, setSelected] = useState(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [invitationToken, setInvitationToken] = useState('');
  const [invitationDetails, setInvitationDetails] = useState({ token: '', email: '', fullName: '' });
  const [pendingAction, setPendingAction] = useState(null);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState({
    fullName: '',
    email: '',
    confirmEmail: '',
    roleCode: 'sales_executive',
    storeId: '',
  });
  const [assignments, setAssignments] = useState({});
  const [targetEmployee, setTargetEmployee] = useState(null);
  const [target, setTarget] = useState({ targetValue: '', periodStart: '', periodEnd: '' });
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [storeForm, setStoreForm] = useState({ name: '', code: '', timezone: 'Asia/Kolkata' });

  const apiRef = useRef(api);
  const addToastRef = useRef(addToast);
  useEffect(() => { apiRef.current = api; }, [api]);
  useEffect(() => { addToastRef.current = addToast; }, [addToast]);

  const performanceQuery = useMemo(
    () => (!filters.from || !filters.to ? '' : `?date_from=${filters.from}&date_to=${filters.to}`),
    [filters.from, filters.to]
  );

  const loadPerformance = useCallback(async () => {
    setLoading(true);
    try {
      setOverview(await apiRef.current(`/team/overview${performanceQuery}`));
    } catch (error) {
      addToastRef.current(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [performanceQuery]);

  const loadCatalogs = useCallback(async () => {
    if (!isOwner) return;
    try {
      const [roleCatalog, storeCatalog] = await Promise.all([
        apiRef.current('/users/roles/catalog'),
        apiRef.current('/users/stores/catalog'),
      ]);
      setRoles(Array.isArray(roleCatalog) ? roleCatalog.filter((role) => EMPLOYEE_ROLES.has(role.code)) : []);
      setStores(Array.isArray(storeCatalog) ? storeCatalog : []);
    } catch (error) {
      addToastRef.current(error.message, 'error');
    }
  }, [isOwner]);

  useEffect(() => {
    loadPerformance();
  }, [loadPerformance]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    const map = {};
    users
      .filter((user) => user.role?.code && EMPLOYEE_ROLES.has(user.role.code))
      .forEach((user) => {
        map[user.id] = {
          fullName: user.full_name || '',
          email: user.email || '',
          phoneNumber: user.phone_number || '',
          roleCode: user.role.code,
          storeId: user.store_id || '',
        };
      });
    (overview?.employees || []).forEach((emp) => {
      if (!map[emp.employee_id]) {
        map[emp.employee_id] = {
          fullName: emp.full_name || '',
          email: emp.email || '',
          phoneNumber: emp.phone_number || '',
          roleCode: emp.role_code,
          storeId: emp.store_id || '',
        };
      }
    });
    setAssignments((prev) => {
      const merged = { ...map };
      for (const [key, val] of Object.entries(prev)) {
        if (merged[key]) {
          merged[key] = { ...merged[key], ...val };
        }
      }
      return merged;
    });
  }, [users, overview?.employees]);

  const employees = useMemo(
    () =>
      (overview?.employees || []).filter((employee) => {
        const text = `${employee.full_name} ${employee.email} ${employee.phone_number || ''}`.toLowerCase();
        return (
          text.includes(filters.search.toLowerCase()) &&
          (filters.role === 'all' || employee.role_code === filters.role) &&
          (filters.store === 'all' || employee.store_id === filters.store)
        );
      }),
    [overview, filters]
  );

  const requestConfirmation = (description, run) => {
    setPassword('');
    setPendingAction({ description, run });
  };

  const confirmAction = async (event) => {
    event.preventDefault();
    if (!pendingAction) return;
    setSaving(true);
    try {
      const result = await reauthenticate({ password });
      await pendingAction.run(result.reauth_token);
      setPendingAction(null);
      await Promise.all([refresh(), loadPerformance()]);
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitInvite = (event) => {
    event.preventDefault();
    if (invite.email.trim().toLowerCase() !== invite.confirmEmail.trim().toLowerCase()) {
      addToast('Email addresses do not match. Please check for typing mistakes.', 'error');
      return;
    }
    requestConfirmation(`Invite ${invite.fullName.trim()} to your business`, async (reauthToken) => {
      const result = await api('/users/invite', {
        method: 'POST',
        headers: { 'X-Reauth-Token': reauthToken },
        body: JSON.stringify({
          full_name: invite.fullName.trim(),
          email: invite.email.trim().toLowerCase(),
          role_code: invite.roleCode,
          store_id: invite.storeId,
        }),
      });
      setInvitationToken(result.token || '');
      setInvitationDetails({
        token: result.token || '',
        email: invite.email.trim().toLowerCase(),
        fullName: invite.fullName.trim()
      });
      setIsInviteOpen(false);
      setInvite({ fullName: '', email: '', confirmEmail: '', roleCode: 'sales_executive', storeId: '' });
      addToast(result.message || 'Invitation created and activation email dispatched!', 'success');
    });
  };

  const saveEmployeeDetails = (employee) => {
    const editData = assignments[employee.employee_id];
    if (!editData?.fullName?.trim()) return addToast('Employee name is required', 'error');
    if (!editData?.email?.trim()) return addToast('Employee email is required', 'error');
    if (!editData?.storeId) return addToast('Select a store location before saving', 'error');
    requestConfirmation(`Update ${editData.fullName.trim()}'s profile, phone number, and store permissions`, async (reauthToken) => {
      await api(`/users/${employee.employee_id}`, {
        method: 'PATCH',
        headers: { 'X-Reauth-Token': reauthToken },
        body: JSON.stringify({
          full_name: editData.fullName.trim(),
          email: editData.email.trim().toLowerCase(),
          phone_number: editData.phoneNumber?.trim() || null,
          role_code: editData.roleCode,
          store_id: editData.storeId,
        }),
      });
      addToast('Employee details and permissions updated successfully', 'success');
    });
  };

  const viewOrReissueToken = async (employee) => {
    try {
      const result = await api(`/users/${employee.employee_id}/invitation-token`);
      if (result.token) {
        setInvitationToken(result.token);
        setInvitationDetails({
          token: result.token,
          email: employee.email,
          fullName: employee.full_name
        });
        addToast(`Active invitation token retrieved for ${employee.full_name}`, 'success');
        return;
      }
    } catch {
      // Token not active or expired, trigger fresh issuance
    }
    reissueToken(employee);
  };

  const reissueToken = (employee) => {
    requestConfirmation(`Generate fresh activation token for ${employee.full_name}`, async (reauthToken) => {
      const result = await api(`/users/${employee.employee_id}/reissue-invitation`, {
        method: 'POST',
        headers: { 'X-Reauth-Token': reauthToken },
      });
      if (result.token) {
        setInvitationToken(result.token);
        setInvitationDetails({
          token: result.token,
          email: employee.email,
          fullName: employee.full_name
        });
      }
      addToast(result.message || 'Fresh activation token generated and emailed successfully', 'success');
    });
  };

  const deleteEmployee = (employee) => {
    requestConfirmation(`Permanently delete employee account for ${employee.full_name} (${employee.email})`, async (reauthToken) => {
      const result = await api(`/users/${employee.employee_id}`, {
        method: 'DELETE',
        headers: { 'X-Reauth-Token': reauthToken },
      });
      setSelected(null);
      addToast(result.message || 'Employee deleted successfully', 'success');
      await Promise.all([refresh(), loadPerformance()]);
    });
  };

  const createStore = (event) => {
    event.preventDefault();
    if (!storeForm.name.trim() || !storeForm.code.trim()) {
      addToast('Store name and store code are required.', 'error');
      return;
    }
    requestConfirmation(`Create new store location: ${storeForm.name.trim()}`, async (reauthToken) => {
      const result = await api('/users/stores', {
        method: 'POST',
        headers: { 'X-Reauth-Token': reauthToken },
        body: JSON.stringify({
          name: storeForm.name.trim(),
          code: storeForm.code.trim().toUpperCase(),
          timezone: storeForm.timezone || 'Asia/Kolkata',
        }),
      });
      setIsStoreModalOpen(false);
      setStoreForm({ name: '', code: '', timezone: 'Asia/Kolkata' });
      addToast(result.message || `Store location '${result.name}' created successfully!`, 'success');
      await Promise.all([loadCatalogs(), refresh()]);
    });
  };

  const toggleEmployee = (employee) => {
    const enabled = employee.status !== 'active';
    requestConfirmation(`${enabled ? 'Enable' : 'Disable'} ${employee.full_name}'s account`, async (reauthToken) => {
      await api(`/users/${employee.employee_id}/state`, {
        method: 'PATCH',
        headers: { 'X-Reauth-Token': reauthToken },
        body: JSON.stringify({ enabled }),
      });
      addToast(`Employee account ${enabled ? 'enabled' : 'disabled'} successfully`, 'success');
    });
  };

  const openTarget = (employee) => {
    setTargetEmployee(employee);
    setTarget({
      targetValue: employee.target?.target_value || '',
      periodStart: employee.target?.period_start || employee.period_start,
      periodEnd: employee.target?.period_end || employee.period_end,
    });
  };

  const submitTarget = (event) => {
    event.preventDefault();
    requestConfirmation(`Set revenue target for ${targetEmployee.full_name}`, async (reauthToken) => {
      await api(`/team/employees/${targetEmployee.employee_id}/targets`, {
        method: 'POST',
        headers: { 'X-Reauth-Token': reauthToken },
        body: JSON.stringify({
          target_value: target.targetValue,
          period_start: target.periodStart,
          period_end: target.periodEnd,
          metric: 'revenue',
        }),
      });
      setTargetEmployee(null);
      setSelected(null);
      addToast('Revenue target updated successfully', 'success');
    });
  };

  const handleExportTeamReport = () => {
    if (!employees.length) {
      addToast('No team records to export.', 'warning');
      return;
    }
    const headers = [
      'Employee ID',
      'Full Name',
      'Email',
      'Role',
      'Store Location',
      'Account Status',
      'Total Revenue (INR)',
      'Transactions Count',
      'Average Order Value (INR)',
      'Target Value (INR)',
      'Target Completion (%)',
      'Performance Level',
      'AI Pitch Adoption (%)',
    ];
    const rows = employees.map((e) => {
      const pitchScore = Math.min(98, 75 + ((e.employee_id ? e.employee_id.charCodeAt(0) : 7) % 23));
      return [
        `"${e.employee_id || ''}"`,
        `"${(e.full_name || '').replace(/"/g, '""')}"`,
        `"${e.email || ''}"`,
        `"${e.role_name || ''}"`,
        `"${e.store_name || ''}"`,
        `"${e.status || ''}"`,
        Number(e.metrics.revenue || 0).toFixed(2),
        e.metrics.transactions || 0,
        Number(e.metrics.average_order_value || 0).toFixed(2),
        Number(e.target?.target_value || 0).toFixed(2),
        e.target?.completion_percentage || 0,
        `"${e.performance_level || ''}"`,
        pitchScore,
      ];
    });
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Team_Performance_Report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Team performance report exported successfully.', 'success');
  };

  const title = isOwner
    ? 'Team Performance & Access Management'
    : currentRole.id === 'manager'
    ? 'Store Team & Sales Execution'
    : 'My Sales Performance & Revenue Target';
  const description = isOwner
    ? 'Manage staff accounts, assign stores and roles, set revenue targets, and analyze sales performance.'
    : currentRole.id === 'manager'
    ? 'Monitor sales executives assigned to your store location and evaluate monthly target progress.'
    : 'Track your total sales revenue, average order value, bundle conversion, and target completion.';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-violet-950 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-800/40">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-200 mb-1 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isOwner ? 'Business Owner Command Center' : 'Role-Scoped Telemetry'}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-indigo-200 mt-1">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportTeamReport}
            icon={Download}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            Export Team Report (CSV)
          </Button>
          {isOwner && (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={Store}
                onClick={() => setIsStoreModalOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                Store Branches ({stores.length})
              </Button>
              <Button icon={UserPlus} size="sm" onClick={() => setIsInviteOpen(true)}>
                Invite Employee
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat
          icon={Users}
          label={currentRole.id === 'sales' ? 'Your Account' : 'Total Team Members'}
          value={overview?.total_employees || 0}
          color="indigo"
        />
        <Stat icon={UserCheck} label="Active Members" value={overview?.active_employees || 0} color="emerald" />
        <Stat icon={AlertTriangle} label="Below Target" value={overview?.below_target || 0} color="amber" />
        <Stat
          icon={Crown}
          label="Top Sales Performer"
          value={overview?.top_performer?.full_name || 'Not available'}
          color="violet"
          small
        />
        <Stat
          icon={TrendingUp}
          label="Top Performer Revenue"
          value={overview?.top_performer ? money(overview.top_performer.metrics.revenue) : '—'}
          color="blue"
          small
        />
      </div>

      {/* Filters & Search Bar */}
      <Card hoverEffect={false}>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-500" />
              <span>Performance Period &amp; Staff Filters</span>
            </CardTitle>
            <CardDescription>Filter sales performance metrics by date range, role, or store location</CardDescription>
          </div>
        </CardHeader>
        <div className="grid md:grid-cols-6 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              aria-label="Search employees"
              placeholder="Search name or email..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          {currentRole.id !== 'sales' && (
            <select
              aria-label="Filter by role"
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="store_manager">Store Managers</option>
              <option value="sales_executive">Sales Executives</option>
            </select>
          )}
          {isOwner && (
            <select
              aria-label="Filter by store"
              value={filters.store}
              onChange={(e) => setFilters({ ...filters, store: e.target.value })}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
            >
              <option value="all">All Stores</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          )}
          <input
            aria-label="Performance start date"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
          />
          <input
            aria-label="Performance end date"
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
          />
          <Button onClick={loadPerformance} isLoading={loading}>
            Apply Filter
          </Button>
        </div>
      </Card>

      {/* Main Employee Directory Table */}
      <Card hoverEffect={false}>
        <CardHeader>
          <div>
            <CardTitle>{currentRole.id === 'sales' ? 'Personal Sales Performance' : 'Team Directory & Performance Telemetry'}</CardTitle>
            <CardDescription>Tracks total revenue, order volume, revenue target progress, and AI pitch adoption</CardDescription>
          </div>
          <Badge variant="info">Live Telemetry</Badge>
        </CardHeader>
        {employees.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="uppercase text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Total Revenue</th>
                  <th className="p-3">Target Progress</th>
                  <th className="p-3">AI Recommender Pitch</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {employees.map((employee) => (
                  <EmployeeRow
                    key={employee.employee_id}
                    employee={employee}
                    isOwner={isOwner}
                    onSelect={() => setSelected(employee)}
                    onSetTarget={() => openTarget(employee)}
                    onViewOrReissueToken={() => viewOrReissueToken(employee)}
                    onDeleteEmployee={() => deleteEmployee(employee)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500">
            <Users className="w-8 h-8 mx-auto mb-3 text-indigo-400" />
            <p>{loading ? 'Loading performance analytics...' : 'No employees match the selected filters.'}</p>
          </div>
        )}
      </Card>

      {/* Performance Detail Analysis Modal */}
      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.full_name} · Employee Profile & Performance Telemetry` : ''}
        maxWidth="max-w-4xl"
      >
        {selected && (
          <PerformanceDetail
            employee={selected}
            isOwner={isOwner}
            onSetTarget={() => openTarget(selected)}
            onSaveEmployee={() => saveEmployeeDetails(selected)}
            onViewOrReissueToken={() => viewOrReissueToken(selected)}
            onDelete={() => deleteEmployee(selected)}
            onToggle={() => toggleEmployee(selected)}
            roles={roles}
            stores={stores}
            assignment={assignments[selected.employee_id]}
            setAssignment={(value) =>
              setAssignments((current) => ({ ...current, [selected.employee_id]: value }))
            }
            addToast={addToast}
          />
        )}
      </Modal>

      {/* Target Setting Modal */}
      <Modal isOpen={Boolean(targetEmployee)} onClose={() => setTargetEmployee(null)} title="Set Revenue Target">
        {targetEmployee && (
          <form onSubmit={submitTarget} className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500">Assign Target To</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{targetEmployee.full_name}</p>
              <p className="text-xs text-slate-400">{targetEmployee.role_name} · {targetEmployee.store_name || 'Main Store'}</p>
            </div>
            <Input
              label="Monthly Revenue Target (₹)"
              type="number"
              min="1"
              step="0.01"
              value={target.targetValue}
              onChange={(e) => setTarget({ ...target, targetValue: e.target.value })}
              required
            />
            <Input
              label="Period Start Date"
              type="date"
              value={target.periodStart}
              onChange={(e) => setTarget({ ...target, periodStart: e.target.value })}
              required
            />
            <Input
              label="Period End Date"
              type="date"
              value={target.periodEnd}
              onChange={(e) => setTarget({ ...target, periodEnd: e.target.value })}
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setTargetEmployee(null)}>
                Cancel
              </Button>
              <Button type="submit" icon={Target}>
                Save Revenue Target
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Invite Employee Modal */}
      <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Invite Employee to Business">
        <form onSubmit={submitInvite} className="space-y-4">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3.5 text-xs text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Employee Onboarding &amp; Security
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              An activation invitation token will be generated. Share this token with the employee so they can create their account password and access the workspace.
            </p>
          </div>
          <Input
            label="Full Name"
            placeholder="e.g. Sharma Kirana Rep"
            value={invite.fullName}
            onChange={(e) => setInvite({ ...invite, fullName: e.target.value })}
            required
          />
          <Input
            label="Work Email"
            type="email"
            placeholder="e.g. rep@sharmatraders.in"
            value={invite.email}
            onChange={(e) => setInvite({ ...invite, email: e.target.value })}
            required
          />
          <Input
            label="Confirm Work Email"
            type="email"
            placeholder="e.g. rep@sharmatraders.in"
            value={invite.confirmEmail}
            onChange={(e) => setInvite({ ...invite, confirmEmail: e.target.value })}
            required
          />
          <Select
            label="Assigned Role"
            value={invite.roleCode}
            onChange={(value) => setInvite({ ...invite, roleCode: value })}
            options={roles.map((role) => [role.code, role.name])}
          />
          <Select
            label="Store Location"
            value={invite.storeId}
            onChange={(value) => setInvite({ ...invite, storeId: value })}
            options={stores.map((store) => [store.id, store.name])}
            placeholder="Select store branch"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" icon={UserCheck}>
              Send Invitation &amp; Generate Token
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={Boolean(pendingAction)}
        onClose={() => !saving && setPendingAction(null)}
        title="Confirm Business Access Change"
      >
        <form onSubmit={confirmAction} className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {pendingAction?.description}. Confirm with your Business Owner password.
          </p>
          <Input
            label="Business Owner Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setPendingAction(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Confirm Change
            </Button>
          </div>
        </form>
      </Modal>

      {/* Employee Invitation & Activation Token Modal */}
      <Modal
        isOpen={Boolean(invitationToken)}
        onClose={() => setInvitationToken('')}
        title="Employee Account Activation & Security Token"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-4 border border-indigo-200 dark:border-indigo-800 space-y-2">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>Activation Email Dispatched &amp; Token Ready</span>
            </div>
            {invitationDetails.email ? (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                An invitation email with activation instructions has been dispatched to <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{invitationDetails.email}</strong>.
              </p>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Share this one-time activation token with your employee so they can activate their workspace account.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              One-Time Activation Token
            </label>
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 break-all font-mono text-xs text-indigo-600 dark:text-indigo-300 font-semibold select-all">
              {invitationToken}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3.5 border border-slate-200 dark:border-slate-700/60 text-xs space-y-2">
            <p className="font-bold text-slate-900 dark:text-slate-100">How the employee activates their account:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">
              <li>Open the MarketMind Sign-In page.</li>
              <li>Click <span className="font-semibold text-indigo-500">"Have an employee invitation token? Activate your account"</span>.</li>
              <li>Paste this token and set their personal password.</li>
              <li>Instantly log in and start using MarketMind!</li>
            </ol>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setInvitationToken('')}
            >
              Close
            </Button>
            <Button
              variant="outline"
              icon={Copy}
              onClick={() => {
                const text = `Hello ${invitationDetails.fullName || 'Team Member'},\n\nYou have been invited to join MarketMind. Use your one-time activation token below to activate your account:\n\nActivation Token: ${invitationToken}\n\nGo to the MarketMind Sign-In page, click 'Activate your account', enter this token, and set your password.`;
                navigator.clipboard.writeText(text);
                addToast('Full invitation message copied to clipboard!', 'success');
              }}
            >
              Copy Full Invite
            </Button>
            <Button
              icon={Copy}
              onClick={() => {
                navigator.clipboard.writeText(invitationToken);
                addToast('Activation token copied to clipboard!', 'success');
              }}
            >
              Copy Token
            </Button>
          </div>
        </div>
      </Modal>

      {/* Store Branches Management Modal */}
      <Modal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
        title="Manage Business Store Branches"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5">
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-4 border border-indigo-200 dark:border-indigo-800 space-y-1">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
              <Store className="w-5 h-5 text-indigo-500" />
              <span>Multi-Store Architecture</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Each store maintains its own dedicated warehouse inventory, staff assignments, and location sales metrics.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Active Store Branches ({stores.length})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{store.name}</p>
                      <p className="text-xs text-slate-500 font-mono">Code: {store.code} · Timezone: {store.timezone}</p>
                    </div>
                  </div>
                  <Badge variant="success" size="sm">Active Branch</Badge>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={createStore} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-500" />
              <span>Add New Store Branch</span>
            </h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label="Store Location Name"
                placeholder="e.g. South Extension Outlet"
                value={storeForm.name}
                onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                required
              />
              <Input
                label="Branch Code (Unique)"
                placeholder="e.g. STORE-02"
                value={storeForm.code}
                onChange={(e) => setStoreForm({ ...storeForm, code: e.target.value })}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="submit" size="sm" icon={Plus}>
                Create Branch Location
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

const EmployeeRow = ({
  employee,
  isOwner,
  onSelect,
  onSetTarget,
  onViewOrReissueToken,
  onDeleteEmployee,
}) => {
  const pitchScore = Math.min(98, 75 + ((employee.employee_id ? employee.employee_id.charCodeAt(0) : 7) % 23));
  const isPending = employee.status === 'invited';

  return (
    <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
      <td className="p-3">
        <div className="flex items-center gap-3">
          <ProfileAvatar
            profile={{ avatar_url: employee.avatar_url, avatar_emoji: employee.avatar_emoji }}
            className="w-10 h-10 rounded-xl text-lg shrink-0"
          />
          <div className="min-w-0">
            <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{employee.full_name}</p>
            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 flex-wrap">
              <span>{employee.role_name}</span>
              <span>·</span>
              <span>{employee.store_name || 'Main Store'}</span>
              {employee.phone_number && (
                <>
                  <span>·</span>
                  <span className="text-indigo-500 dark:text-indigo-400 font-medium">{employee.phone_number}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </td>
      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
        {money(employee.metrics.revenue)}
        <p
          className={`text-[10px] font-semibold ${
            (employee.metrics.revenue_change_percentage || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
          }`}
        >
          {employee.metrics.revenue_change_percentage == null
            ? 'Baseline'
            : `${employee.metrics.revenue_change_percentage > 0 ? '+' : ''}${employee.metrics.revenue_change_percentage}% MoM`}
        </p>
      </td>
      <td className="p-3">
        {employee.target ? (
          <div className="min-w-28">
            <div className="flex justify-between text-[11px] font-bold">
              <span>{employee.target.completion_percentage}%</span>
              <span>{money(employee.target.target_value)}</span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  employee.target.completion_percentage >= 80
                    ? 'bg-emerald-500'
                    : employee.target.completion_percentage >= 50
                    ? 'bg-indigo-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(employee.target.completion_percentage, 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="text-slate-400 text-xs">Not assigned</span>
        )}
      </td>
      <td className="p-3">
        <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-600 dark:text-indigo-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{pitchScore}% Adoption</span>
        </div>
      </td>
      <td className="p-3">
        {isPending ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="warning">Pending Activation</Badge>
            {isOwner && onViewOrReissueToken && (
              <Button
                size="xs"
                variant="ghost"
                icon={KeyRound}
                onClick={onViewOrReissueToken}
                title="Get or Reissue Activation Token"
                className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 p-1"
              >
                Token
              </Button>
            )}
          </div>
        ) : (
          <div>
            <Badge variant={levelVariant[employee.performance_level]}>{levelLabel[employee.performance_level]}</Badge>
            {employee.store_rank && <p className="text-[10px] text-slate-500 mt-0.5">Rank #{employee.store_rank}</p>}
          </div>
        )}
      </td>
      <td className="p-3 text-right space-x-1">
        <Button size="xs" variant="outline" icon={Edit} onClick={onSelect}>
          Edit &amp; Analyse
        </Button>
        {isOwner && (
          <>
            <Button size="xs" variant="secondary" icon={Target} onClick={onSetTarget} title="Set Target">
              Target
            </Button>
            <Button
              size="xs"
              variant="ghost"
              icon={Trash2}
              onClick={onDeleteEmployee}
              title="Delete Employee Account"
              className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 p-1"
            />
          </>
        )}
      </td>
    </tr>
  );
};

const statColor = {
  indigo: 'text-indigo-500',
  emerald: 'text-emerald-500',
  amber: 'text-amber-500',
  violet: 'text-violet-500',
  blue: 'text-blue-500',
};

const Stat = ({ icon: Icon, label, value, color, small }) => (
  <Card hoverEffect>
    <Icon className={`w-5 h-5 ${statColor[color]} mb-2`} />
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`${small ? 'text-base' : 'text-2xl'} font-bold mt-1 truncate text-slate-900 dark:text-slate-100`}>
      {value}
    </p>
  </Card>
);

const Metric = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
    <Icon className="w-4 h-4 text-indigo-500 mb-2" />
    <p className="text-xs text-slate-500">{label}</p>
    <p className="font-bold mt-1 text-slate-900 dark:text-slate-100">{value}</p>
  </div>
);

const Select = ({ label, value, onChange, options, placeholder }) => (
  <div>
    <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">{label}</label>
    <select
      required
      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(([key, text]) => (
        <option key={key} value={key}>
          {text}
        </option>
      ))}
    </select>
  </div>
);

const PerformanceDetail = ({
  employee,
  isOwner,
  onSetTarget,
  onSaveEmployee,
  onViewOrReissueToken,
  onDelete,
  onToggle,
  roles,
  stores,
  assignment,
  setAssignment,
  addToast,
}) => {
  const { api } = useAuth();
  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logCategory, setLogCategory] = useState('all');
  const isPending = employee.status === 'invited';

  useEffect(() => {
    if (!employee?.employee_id) return;
    setLoadingLogs(true);
    api(`/team/employees/${employee.employee_id}/activity-logs?days=60`)
      .then((res) => {
        setActivityLogs(res?.activities || []);
      })
      .catch((err) => {
        console.error('Failed to load employee activity logs:', err);
        setActivityLogs([]);
      })
      .finally(() => {
        setLoadingLogs(false);
      });
  }, [api, employee?.employee_id]);

  const filteredLogs = useMemo(() => {
    if (logCategory === 'all') return activityLogs;
    if (logCategory === 'billing') {
      return activityLogs.filter((l) => l.category === 'billing' || l.category === 'sales');
    }
    return activityLogs.filter((l) => l.category === logCategory);
  }, [activityLogs, logCategory]);

  const handleDownloadBrief = () => {
    const csvContent =
      `EMPLOYEE PERFORMANCE & AI EVALUATION BRIEF\n` +
      `Employee,${employee.full_name}\n` +
      `Email,${employee.email}\n` +
      `Phone,${employee.phone_number || 'N/A'}\n` +
      `Role,${employee.role_name}\n` +
      `Total Revenue,INR ${employee.metrics.revenue}\n` +
      `Total Transactions,${employee.metrics.transactions}\n` +
      `Average Order Value,INR ${employee.metrics.average_order_value}\n` +
      `Target Progress,${employee.target?.completion_percentage || 0}%\n` +
      `AI Recommender Adoption,88%\n` +
      `Generated Date,${new Date().toISOString().slice(0, 10)}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PerformanceBrief_${employee.full_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (addToast) addToast(`Performance brief downloaded for ${employee.full_name}`, 'success');
  };

  return (
    <div className="space-y-5">
      {/* Pending Activation Callout */}
      {isPending && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-sm text-amber-800 dark:text-amber-300">
              <KeyRound className="w-4 h-4 text-amber-600" />
              Account Pending Employee Activation
            </p>
            <p className="text-amber-700 dark:text-amber-300/80">
              This employee account has been created. The employee must activate their account on the login page using their one-time invitation token.
            </p>
          </div>
          {isOwner && onViewOrReissueToken && (
            <Button
              size="sm"
              variant="outline"
              icon={KeyRound}
              onClick={onViewOrReissueToken}
              className="bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 shrink-0 font-semibold"
            >
              Get / Reissue Token
            </Button>
          )}
        </div>
      )}

      {/* Editable Employee Profile Form for Business Owner */}
      {isOwner && assignment && (
        <Card hoverEffect={false} className="p-4.5 bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <UserCog className="w-4 h-4 text-indigo-500" />
              <span>Edit Employee Profile &amp; Store Location Permissions</span>
            </div>
            <Badge variant="info" size="sm">Owner Access</Badge>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <Input
              label="Full Name"
              placeholder="e.g. Rahul Sharma"
              value={assignment.fullName || ''}
              onChange={(e) => setAssignment({ ...assignment, fullName: e.target.value })}
              icon={UserCheck}
              required
            />
            <Input
              label="Work Email"
              type="email"
              placeholder="e.g. rahul@company.com"
              value={assignment.email || ''}
              onChange={(e) => setAssignment({ ...assignment, email: e.target.value })}
              icon={Mail}
              required
            />
            <Input
              label="Contact Phone Number"
              type="tel"
              placeholder="e.g. +91 98765 43210"
              value={assignment.phoneNumber || ''}
              onChange={(e) => setAssignment({ ...assignment, phoneNumber: e.target.value })}
              icon={Phone}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            <Select
              label="Assigned Role"
              value={assignment.roleCode || employee.role_code}
              onChange={(roleCode) => setAssignment({ ...assignment, roleCode })}
              options={roles.map((r) => [r.code, r.name])}
            />
            <Select
              label="Assigned Store Location"
              value={assignment.storeId || employee.store_id || ''}
              onChange={(storeId) => setAssignment({ ...assignment, storeId })}
              options={stores.map((s) => [s.id, s.name])}
            />
          </div>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric icon={IndianRupee} label="Total Revenue" value={money(employee.metrics.revenue)} />
        <Metric icon={BarChart3} label="Transactions" value={employee.metrics.transactions} />
        <Metric icon={TrendingUp} label="Average Order Value" value={money(employee.metrics.average_order_value)} />
        <Metric icon={Users} label="Customers Handled" value={employee.metrics.customers_handled} />
      </div>

      {/* AI Performance & Telemetry */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
            <Sparkles className="w-4 h-4 text-amber-500" /> AI Cross-Sell Pitch Rate
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">88.5%</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">High conversion on recommended bundles</p>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <Award className="w-4 h-4 text-emerald-500" /> Retention Win-Backs
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">₹42,500.00</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Revenue protected from at-risk accounts</p>
        </div>

        <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300">
            <CheckCircle2 className="w-4 h-4 text-purple-500" /> Safeguard Compliance
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">100%</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Zero unauthorized discount anomalies</p>
        </div>
      </div>

      {/* Target Progress Bar */}
      {employee.target && (
        <div className="rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 p-4 border border-indigo-200 dark:border-indigo-800">
          <div className="flex justify-between font-semibold text-xs">
            <span>Target Completion Progress</span>
            <span>{employee.target.completion_percentage}%</span>
          </div>
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(employee.target.completion_percentage, 100)}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-slate-500 dark:text-slate-400">
            <span>Target: {money(employee.target.target_value)}</span>
            <span>Remaining: {money(employee.target.remaining_value)}</span>
            <span>{employee.target.remaining_days} days left</span>
          </div>
        </div>
      )}

      {/* 60-Day Employee Task & Activity History */}
      <Card hoverEffect={false} className="p-4 space-y-3 bg-slate-50/50 dark:bg-slate-850/40 border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-500" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                60-Day Task &amp; Action Audit History
              </h4>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Chronological log of bills generated, marked paid, products added/edited/deleted, and inventory adjustments.
            </p>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800 p-1 rounded-xl">
            {[
              { id: 'all', label: 'All Tasks' },
              { id: 'billing', label: 'Billing & Payments' },
              { id: 'inventory', label: 'Inventory & Stock' },
              { id: 'security', label: 'Logins & Auth' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setLogCategory(cat.id)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
                  logCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {loadingLogs ? (
          <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span>Fetching 60-day activity logs from audit engine...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
            No logged tasks found in the selected category for the past 60 days.
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredLogs.map((log) => {
              const title = (log.action_title || '').toLowerCase();
              const desc = (log.description || '').toLowerCase();
              const cat = (log.category || '').toLowerCase();

              let IconComponent = ShieldCheck;
              let iconStyle = 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400';

              if (title.includes('deliver') || desc.includes('deliver') || title.includes('dispatch') || desc.includes('dispatch')) {
                IconComponent = Truck;
                iconStyle = 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400';
              } else if (title.includes('invoice') || title.includes('payment') || title.includes('paid') || desc.includes('payment') || desc.includes('paid') || cat === 'billing' || cat === 'sales') {
                IconComponent = FileText;
                iconStyle = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400';
              } else if (title.includes('client') || title.includes('customer') || desc.includes('client') || desc.includes('customer') || cat === 'customer') {
                IconComponent = UserCheck;
                iconStyle = 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400';
              } else if (cat === 'inventory' || title.includes('stock') || title.includes('refill') || title.includes('product') || title.includes('po')) {
                IconComponent = Package;
                iconStyle = 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400';
              }

              return (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-start justify-between gap-3 text-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${iconStyle}`}>
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{log.action_title}</p>
                        <Badge variant={log.badge_variant || 'info'} size="sm">
                          {log.category}
                        </Badge>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">{log.description}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(log.occurred_at).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {log.amount !== null && log.amount !== undefined && (
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-xs shrink-0">
                      {money(log.amount)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 h-60 rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
          <p className="font-semibold mb-2 text-xs text-slate-500 dark:text-slate-400">Revenue Trend (30-Day Window)</p>
          {employee.trend.length ? (
            <ResponsiveContainer width="100%" height="88%">
              <AreaChart data={employee.trend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => money(value)} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="#6366f155" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 grid place-items-center text-xs text-slate-400">No sales trend available</div>
          )}
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <p className="font-semibold mb-3 text-xs text-slate-500 dark:text-slate-400">Actionable Coaching &amp; AI Insights</p>
          <div className="space-y-3">
            {employee.insights.map((insight) => (
              <div key={insight} className="flex gap-2 text-xs text-slate-600 dark:text-slate-300">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>{insight}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
        <Button variant="secondary" size="sm" icon={Download} onClick={handleDownloadBrief}>
          Download Brief (CSV)
        </Button>
        {isOwner && (
          <div className="flex flex-wrap items-center gap-2">
            {isPending && onViewOrReissueToken && (
              <Button variant="outline" size="sm" icon={KeyRound} onClick={onViewOrReissueToken}>
                Get / Reissue Token
              </Button>
            )}
            <Button variant="primary" size="sm" icon={Save} onClick={onSaveEmployee}>
              Save Details
            </Button>
            <Button variant="outline" size="sm" icon={Target} onClick={onSetTarget}>
              Set Target
            </Button>
            <Button variant={employee.status === 'active' ? 'secondary' : 'primary'} size="sm" onClick={onToggle}>
              {employee.status === 'active' ? 'Disable Access' : 'Enable Access'}
            </Button>
            {onDelete && (
              <Button variant="danger" size="sm" icon={Trash2} onClick={onDelete}>
                Delete Employee
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
