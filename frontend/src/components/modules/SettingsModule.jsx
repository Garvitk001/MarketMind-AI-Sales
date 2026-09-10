import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  Database,
  Languages,
  LayoutGrid,
  MonitorCog,
  Save,
  ShieldCheck,
  Store,
  Trash2,
  UserRound,
  Sparkles,
  UserCog,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { ProfileAvatar } from '../common/ProfileAvatar';

const selectClass =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30';

const fieldLabel =
  'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400';

const preferenceDefaults = {
  locale: 'en-IN',
  timezone: 'Asia/Kolkata',
  theme_preference: 'system',
  date_format: 'DD/MM/YYYY',
  dashboard_density: 'comfortable',
  email_notifications: true,
};

const avatarChoices = ['🙂', '👨‍💼', '👩‍💼', '🧑‍💼', '🚀'];

const rolePreferenceDefaults = {
  owner: {
    default_period: '30',
    weekly_summary: true,
    revenue_alerts: true,
    stock_alerts: true,
    sales_performance_alerts: true,
    customer_decline_alerts: true,
  },
  manager: {
    inventory_view: 'all',
    stock_alerts: true,
    daily_store_summary: true,
    sales_performance_alerts: true,
    customer_decline_alerts: true,
  },
  sales: {
    sales_period: '30',
    follow_up_reminders: true,
    customer_activity_alerts: true,
    sales_performance_alerts: true,
    customer_decline_alerts: true,
  },
  admin: {
    monitoring_refresh: '60',
    audit_alerts: true,
    model_failure_alerts: true,
    security_alerts: true,
  },
};

const formatDate = (value, format) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  if (format === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
  if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
  return `${day}/${month}/${year}`;
};

export const SettingsModule = ({ onNavigate }) => {
  const { currentRole, profile, updateProfile, uploadAvatar, deleteAvatar, api, refreshProfile } = useAuth();
  const { setThemePreference } = useTheme();
  const { addToast } = useToast();
  const fileInput = useRef(null);
  const isAdmin = currentRole.id === 'admin';
  const isOwner = currentRole.id === 'owner';
  const [saving, setSaving] = useState(false);
  const [savingBiz, setSavingBiz] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [savedBizAt, setSavedBizAt] = useState(null);
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [bizForm, setBizForm] = useState({
    business_name: '',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    phone_number: '',
  });

  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    job_title: '',
    location: '',
    bio: '',
    date_of_birth: '',
    avatar_emoji: '🙂',
    role_preferences: rolePreferenceDefaults[currentRole.id] || {},
    ...preferenceDefaults,
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name || '',
      phone_number: profile.phone_number || '',
      job_title: profile.job_title || '',
      location: profile.location || '',
      bio: profile.bio || '',
      date_of_birth: profile.date_of_birth || '',
      avatar_emoji: profile.avatar_emoji || '🙂',
      role_preferences: {
        ...rolePreferenceDefaults[currentRole.id],
        ...(profile.role_preferences || {}),
      },
      locale: profile.locale || preferenceDefaults.locale,
      timezone: profile.timezone || preferenceDefaults.timezone,
      theme_preference: profile.theme_preference || preferenceDefaults.theme_preference,
      date_format: profile.date_format || preferenceDefaults.date_format,
      dashboard_density: profile.dashboard_density || preferenceDefaults.dashboard_density,
      email_notifications: profile.email_notifications ?? true,
    });

    setBizForm({
      business_name: profile.tenant_name || '',
      currency: profile.currency || 'INR',
      timezone: profile.timezone || 'Asia/Kolkata',
      phone_number: profile.phone_number || '',
    });
  }, [currentRole.id, profile]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateBizField = (field, value) => setBizForm((current) => ({ ...current, [field]: value }));

  const updateRolePreference = (field, value) =>
    setForm((current) => ({
      ...current,
      role_preferences: { ...current.role_preferences, [field]: value },
    }));

  const saveBusinessProfile = async (event) => {
    event?.preventDefault?.();
    setSavingBiz(true);
    try {
      await api('/users/me/business', {
        method: 'PATCH',
        body: JSON.stringify({
          business_name: bizForm.business_name.trim(),
          currency: bizForm.currency.trim().toUpperCase(),
          timezone: bizForm.timezone.trim(),
          phone_number: bizForm.phone_number.trim() || null,
        }),
      });
      await refreshProfile?.();
      setSavedBizAt(new Date());
      addToast('Business name and details updated successfully across MarketMind.', 'success');
    } catch (error) {
      addToast(error.message || 'Error updating business settings.', 'error');
    } finally {
      setSavingBiz(false);
    }
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const preferences = {
        locale: form.locale,
        timezone: form.timezone,
        theme_preference: form.theme_preference,
        date_format: form.date_format,
        dashboard_density: form.dashboard_density,
        email_notifications: form.email_notifications,
        role_preferences: form.role_preferences,
      };
      await updateProfile(
        isAdmin
          ? preferences
          : {
              ...preferences,
              full_name: form.full_name.trim(),
              phone_number: form.phone_number.trim() || null,
              job_title: form.job_title.trim() || null,
              location: form.location.trim() || null,
              bio: form.bio.trim() || null,
              date_of_birth: form.date_of_birth || null,
              avatar_emoji: form.avatar_emoji,
            }
      );
      setThemePreference(form.theme_preference);
      setSavedAt(new Date());
      addToast('Preferences saved and applied successfully', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      addToast('Profile photo must be 2 MB or smaller', 'error');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setPreviewAvatar(previewUrl);
    setUploading(true);
    try {
      await uploadAvatar(file);
      addToast('Profile photo updated successfully', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    setUploading(true);
    setPreviewAvatar(null);
    try {
      await deleteAvatar();
      addToast('Profile photo removed successfully', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const joinedDate = formatDate(profile?.joined_at, form.date_format);

  return (
    <form onSubmit={saveSettings} className="mx-auto max-w-6xl space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-violet-950 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-800/40">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-200 mb-1 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30">
            {isAdmin ? <MonitorCog className="w-3.5 h-3.5" /> : <UserRound className="w-3.5 h-3.5" />}
            <span>{isAdmin ? 'Internal Platform Console' : `${currentRole.name} Account Controls`}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isAdmin ? 'Platform Settings & Security' : 'Profile & Platform Preferences'}
          </h1>
          <p className="text-sm text-indigo-200 mt-1">
            {isAdmin
              ? 'Security policies and console preferences for the internal MarketMind Administrator.'
              : 'Manage your commercial work profile, display settings, and automated alert preferences.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedAt && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-400/30">
              <CheckCircle2 className="w-4 h-4" />
              Saved {savedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button type="submit" icon={Save} isLoading={saving}>
            Save &amp; Apply
          </Button>
        </div>
      </div>

      {/* User Profile Card */}
      {!isAdmin && (
        <Card hoverEffect={false} className="overflow-hidden">
          <div className="flex flex-col gap-6 bg-gradient-to-r from-indigo-950 via-slate-900 to-violet-950 p-6 text-white sm:flex-row sm:items-center border-b border-indigo-800/40">
            <div className="relative">
              <ProfileAvatar
                profile={{ ...profile, avatar_url: previewAvatar || profile?.avatar_url, avatar_emoji: form.avatar_emoji }}
                fallbackImage={currentRole.avatar}
                className="h-24 w-24 rounded-2xl border-2 border-white/30 text-5xl shadow-xl"
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="absolute -bottom-2 -right-2 rounded-xl bg-indigo-600 p-2 text-white shadow-lg hover:bg-indigo-500 transition-colors"
                title="Change profile photo"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={selectAvatar}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-2xl font-bold">{profile?.full_name || 'User Account'}</h2>
              <p className="text-sm text-indigo-200">{profile?.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="info">{profile?.role?.name || currentRole.name}</Badge>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs">Joined {joinedDate}</span>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs text-emerald-200">
                  Email Verified
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInput.current?.click()}
                isLoading={uploading}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                Upload Photo
              </Button>
              {profile?.avatar_url && (
                <Button
                  type="button"
                  variant="danger"
                  icon={Trash2}
                  onClick={removeAvatar}
                  disabled={uploading}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>

          {!profile?.avatar_url && (
            <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Default Avatar Emoji Selection
              </p>
              <div className="flex flex-wrap gap-3">
                {avatarChoices.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => updateField('avatar_emoji', emoji)}
                    className={`flex h-12 w-12 items-center justify-center rounded-xl border text-2xl transition ${
                      form.avatar_emoji === emoji
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-500/30'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300'
                    }`}
                    aria-label={`Use ${emoji} as default avatar`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                This avatar emoji appears in your top navigation header until a custom profile photo is uploaded.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Main Form Content */}
      {isAdmin ? (
        <AdminSecurity profile={profile} onNavigate={onNavigate} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card hoverEffect={false} className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserRound className="w-5 h-5 text-indigo-500" />
                  <span>Personal Commercial Profile</span>
                </CardTitle>
                <CardDescription>Official contact details displayed across team &amp; sales records</CardDescription>
              </div>
            </CardHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                id="profileName"
                label="Full Name"
                value={form.full_name}
                onChange={(event) => updateField('full_name', event.target.value)}
                required
              />
              <Input
                id="profilePhone"
                label="Phone Number"
                placeholder="+91 98765 43210"
                value={form.phone_number}
                onChange={(event) => updateField('phone_number', event.target.value)}
              />
              <Input
                id="profileTitle"
                label="Job Title"
                placeholder={currentRole.id === 'owner' ? 'Founder / Proprietor' : currentRole.name}
                value={form.job_title}
                onChange={(event) => updateField('job_title', event.target.value)}
              />
              <Input
                id="profileLocation"
                label="Location"
                placeholder="Jaipur, Rajasthan"
                value={form.location}
                onChange={(event) => updateField('location', event.target.value)}
              />
              <Input
                id="profileDateOfBirth"
                label="Date of Birth"
                type="date"
                value={form.date_of_birth}
                onChange={(event) => updateField('date_of_birth', event.target.value)}
              />
              <div>
                <label className={fieldLabel}>Joined MarketMind</label>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {joinedDate}
                </div>
                <p className="mt-1 text-xs text-slate-400">Recorded account registration timestamp</p>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="profileBio" className={fieldLabel}>
                  Short Business Bio
                </label>
                <textarea
                  id="profileBio"
                  rows="3"
                  maxLength="500"
                  value={form.bio}
                  onChange={(event) => updateField('bio', event.target.value)}
                  placeholder="Summary of business operations or store responsibilities..."
                  className={selectClass}
                />
                <p className="mt-1 text-right text-xs text-slate-400">{form.bio.length}/500</p>
              </div>
            </div>
          </Card>

          <RoleDetails profile={profile} currentRole={currentRole} onNavigate={onNavigate} />
        </div>
      )}

      {/* Business Owner Enterprise Profile Section */}
      {isOwner && (
        <BusinessProfileCard
          bizForm={bizForm}
          updateBizField={updateBizField}
          saveBusinessProfile={saveBusinessProfile}
          savingBiz={savingBiz}
          savedBizAt={savedBizAt}
        />
      )}

      {/* Preferences Section */}
      <Preferences form={form} updateField={updateField} isAdmin={isAdmin} />

      {/* Role Preferences Section */}
      <RolePreferences
        roleId={currentRole.id}
        values={form.role_preferences}
        update={updateRolePreference}
      />

      {/* Account Security Card */}
      <Card hoverEffect={false}>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span>Account Telemetry &amp; Security</span>
            </CardTitle>
            <CardDescription>Authentication security status for your MarketMind account</CardDescription>
          </div>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatusItem icon={CheckCircle2} label="Account Status" value={profile?.status || 'Active'} />
          <StatusItem
            icon={ShieldCheck}
            label="Multi-Factor Authentication"
            value={profile?.mfa_enabled ? 'Enabled & Verified' : isAdmin ? 'Required' : 'Standard Protection'}
          />
          <StatusItem
            icon={Clock3}
            label="Last Session Login"
            value={
              profile?.last_login_at
                ? `${formatDate(profile.last_login_at, form.date_format)} ${new Date(
                    profile.last_login_at
                  ).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                : 'Current Session'
            }
          />
        </div>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-slate-400" /> Passwords are encrypted with bcrypt hashes. Use "Forgot password" on the sign-in page to reset credentials.
        </p>
      </Card>
    </form>
  );
};

const RoleDetails = ({ profile, currentRole, onNavigate }) => {
  const copy =
    currentRole.id === 'owner'
      ? {
          icon: Building2,
          title: 'Business Workspace',
          lines: [profile?.tenant_name || 'Small Business Workspace', `Currency Ledger: ${profile?.currency || 'INR (₹)'}`],
          action: 'Manage Team & Access',
          tab: 'team',
        }
      : currentRole.id === 'manager'
      ? {
          icon: Store,
          title: 'Store Assignment',
          lines: [
            profile?.store?.name || 'Main Store',
            profile?.store ? `Store Code: ${profile.store.code}` : 'Assigned Store Location',
          ],
        }
      : {
          icon: BriefcaseBusiness,
          title: 'Sales Scope',
          lines: [
            profile?.store?.name || 'Main Store',
            'Personal sales volume and assigned B2B customer accounts',
          ],
        };
  const Icon = copy.icon;
  return (
    <Card hoverEffect={false}>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-indigo-500" />
            <span>{copy.title}</span>
          </CardTitle>
          <CardDescription>Protected commercial role scope</CardDescription>
        </div>
      </CardHeader>
      <div className="space-y-3">
        {copy.lines.filter(Boolean).map((line) => (
          <div
            key={line}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            {line}
          </div>
        ))}
      </div>
      {copy.action && (
        <Button
          type="button"
          className="mt-4 w-full"
          variant="outline"
          onClick={() => onNavigate(copy.tab)}
        >
          {copy.action}
        </Button>
      )}
    </Card>
  );
};

const BusinessProfileCard = ({ bizForm, updateBizField, saveBusinessProfile, savingBiz, savedBizAt }) => (
  <Card hoverEffect={false}>
    <CardHeader>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BriefcaseBusiness className="w-5 h-5 text-amber-500" />
            <span>Business Enterprise Profile & Info</span>
          </CardTitle>
          <CardDescription>Manage business name, operational currency, and official info</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {savedBizAt && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-400/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Updated
            </span>
          )}
          <Button
            type="button"
            icon={Save}
            isLoading={savingBiz}
            onClick={saveBusinessProfile}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3.5 py-1.5"
          >
            Save Business Info
          </Button>
        </div>
      </div>
    </CardHeader>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Input
        id="bizName"
        label="Registered Business Name"
        value={bizForm.business_name}
        onChange={(e) => updateBizField('business_name', e.target.value)}
        placeholder="e.g. Apex Retail Enterprises"
        required
      />
      <div>
        <label className={fieldLabel}>Operational Currency</label>
        <select
          value={bizForm.currency}
          onChange={(e) => updateBizField('currency', e.target.value)}
          className={selectClass}
        >
          <option value="INR">INR (₹) - Indian Rupee</option>
          <option value="USD">USD ($) - US Dollar</option>
          <option value="EUR">EUR (€) - Euro</option>
          <option value="GBP">GBP (£) - British Pound</option>
          <option value="AED">AED (د.إ) - UAE Dirham</option>
        </select>
      </div>
      <div>
        <label className={fieldLabel}>Business Timezone</label>
        <select
          value={bizForm.timezone}
          onChange={(e) => updateBizField('timezone', e.target.value)}
          className={selectClass}
        >
          <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
          <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
          <option value="UTC">UTC (Universal Coordinated Time)</option>
          <option value="America/New_York">America/New_York (EST)</option>
          <option value="Europe/London">Europe/London (GMT)</option>
        </select>
      </div>
      <Input
        id="bizPhone"
        label="Commercial Helpline / Phone"
        value={bizForm.phone_number}
        onChange={(e) => updateBizField('phone_number', e.target.value)}
        placeholder="+91 98765 43210"
      />
    </div>
  </Card>
);

const Preferences = ({ form, updateField, isAdmin }) => (
  <Card hoverEffect={false}>
    <CardHeader>
      <div>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-indigo-500" />
          <span>{isAdmin ? 'Console Preferences' : 'Dashboard & Regional Preferences'}</span>
        </CardTitle>
        <CardDescription>Customized settings applied across your MarketMind sessions</CardDescription>
      </div>
    </CardHeader>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <SelectField
        icon={Languages}
        label="Language Locale"
        value={form.locale}
        onChange={(value) => updateField('locale', value)}
        options={[
          ['en-IN', 'English (India)'],
          ['hi-IN', 'हिन्दी (भारत)'],
        ]}
      />
      <SelectField
        icon={Clock3}
        label="Time Zone"
        value={form.timezone}
        onChange={(value) => updateField('timezone', value)}
        options={[
          ['Asia/Kolkata', 'India Standard Time (IST)'],
          ['Asia/Dubai', 'Gulf Standard Time (GST)'],
          ['UTC', 'Coordinated Universal Time (UTC)'],
        ]}
      />
      <SelectField
        icon={MonitorCog}
        label="Appearance Theme"
        value={form.theme_preference}
        onChange={(value) => updateField('theme_preference', value)}
        options={[
          ['system', 'Device System Preference'],
          ['light', 'Light Commercial Theme'],
          ['dark', 'Dark Glassmorphism Mode'],
        ]}
      />
      <SelectField
        icon={CalendarDays}
        label="Display Date Format"
        value={form.date_format}
        onChange={(value) => updateField('date_format', value)}
        options={[
          ['DD/MM/YYYY', 'DD/MM/YYYY (20/08/2026)'],
          ['MM/DD/YYYY', 'MM/DD/YYYY (08/20/2026)'],
          ['YYYY-MM-DD', 'YYYY-MM-DD (2026-08-20)'],
        ]}
      />
      <SelectField
        icon={LayoutGrid}
        label="Dashboard Density"
        value={form.dashboard_density}
        onChange={(value) => updateField('dashboard_density', value)}
        options={[
          ['comfortable', 'Comfortable Grid Spacing'],
          ['compact', 'Compact Data Density'],
        ]}
      />
      <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3">
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
          <Bell className="h-4 w-4 text-indigo-500" />
          Email Notifications
        </span>
        <input
          type="checkbox"
          checked={form.email_notifications}
          onChange={(event) => updateField('email_notifications', event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
        />
      </label>
    </div>
  </Card>
);

const RolePreferences = ({ roleId, values = {}, update }) => {
  const content = {
    owner: {
      title: 'Business Owner Executive Alert Preferences',
      description: 'Configure automated commercial alerts and default dashboard horizons.',
      select: {
        label: 'Default Executive KPI Period',
        key: 'default_period',
        options: [
          ['7', 'Last 7 Days'],
          ['30', 'Last 30 Days'],
          ['90', 'Last 90 Days'],
        ],
      },
      toggles: [
        ['weekly_summary', 'Weekly Business Summary', 'Receive automated 7-day revenue overview.'],
        ['revenue_alerts', 'Revenue Fluctuation Alerts', 'Alert when period revenue changes by >10%.'],
        ['stock_alerts', 'Low Stock & Depletion Warnings', 'Alert when inventory reaches reorder point.'],
        ['sales_performance_alerts', 'Daily Sales Target Tracking', 'Compare daily sales against active rep targets.'],
        ['customer_decline_alerts', 'Customer At-Risk Drop Alerts', 'Flag accounts with significant order volume decline.'],
      ],
    },
    manager: {
      title: 'Store Manager Operational Preferences',
      description: 'Prioritize daily inventory queues and store sales telemetry.',
      select: {
        label: 'Default Stock Queue Filter',
        key: 'inventory_view',
        options: [
          ['all', 'All Warehouse Inventory'],
          ['low_stock', 'Low Stock Alerts First'],
          ['out_of_stock', 'Out of Stock Urgent'],
        ],
      },
      toggles: [
        ['stock_alerts', 'Stockout Risk Warnings', 'Show priority stock alert banners and notifications.'],
        ['daily_store_summary', 'Daily Store Operations Summary', 'Display daily store sales overview.'],
        ['sales_performance_alerts', 'Store Rep Target Telemetry', 'Monitor store staff target completion.'],
        ['customer_decline_alerts', 'Customer Order Decline Flags', 'Flag store clients with reduced purchasing.'],
      ],
    },
    sales: {
      title: 'Sales Executive Workspace Preferences',
      description: 'Focus personal target progress and client account follow-ups.',
      select: {
        label: 'Default Sales Horizon',
        key: 'sales_period',
        options: [
          ['7', 'Last 7 Days'],
          ['30', 'Last 30 Days'],
          ['90', 'Last 90 Days'],
        ],
      },
      toggles: [
        ['follow_up_reminders', 'Inactive Account Reminders', 'Notify when assigned clients are inactive >60 days.'],
        ['customer_activity_alerts', 'Client Re-order Notifications', 'Alert when assigned clients place new orders.'],
        ['sales_performance_alerts', 'Personal Sales Target Progress', 'Track personal target completion daily.'],
        ['customer_decline_alerts', 'Client Churn Risk Warnings', 'Alert on assigned clients with dropping purchases.'],
      ],
    },
    admin: {
      title: 'Administrator System Telemetry Preferences',
      description: 'Configure platform monitoring refresh rates and security alerts.',
      select: {
        label: 'System Monitoring Refresh Rate',
        key: 'monitoring_refresh',
        options: [
          ['30', 'Every 30 Seconds'],
          ['60', 'Every 60 Seconds'],
          ['300', 'Every 5 Minutes'],
        ],
      },
      toggles: [
        ['audit_alerts', 'Security Audit Events', 'Notify on permission changes and authentication events.'],
        ['model_failure_alerts', 'AI Forecasting Model Failures', 'Notify if ML evaluation jobs encounter errors.'],
        ['security_alerts', 'Suspicious Login Alerts', 'Flag unusual access locations or failed login attempts.'],
      ],
    },
  }[roleId];

  if (!content) return null;
  return (
    <Card hoverEffect={false}>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <MonitorCog className="w-5 h-5 text-indigo-500" />
            <span>{content.title}</span>
          </CardTitle>
          <CardDescription>{content.description}</CardDescription>
        </div>
      </CardHeader>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SelectField
          icon={LayoutGrid}
          label={content.select.label}
          value={values[content.select.key] || content.select.options[0][0]}
          onChange={(value) => update(content.select.key, value)}
          options={content.select.options}
        />
        {content.toggles.map(([key, label, description]) => (
          <ToggleSetting
            key={key}
            label={label}
            description={description}
            checked={values[key] ?? true}
            onChange={(checked) => update(key, checked)}
          />
        ))}
      </div>
    </Card>
  );
};

const ToggleSetting = ({ label, description, checked, onChange }) => (
  <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 transition hover:bg-slate-100 dark:hover:bg-slate-800/40">
    <span>
      <span className="block text-xs font-bold text-slate-900 dark:text-slate-100">{label}</span>
      <span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {description}
      </span>
    </span>
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
    />
  </label>
);

const SelectField = ({ icon: Icon, label, value, onChange, options }) => (
  <div>
    <label className={fieldLabel}>
      <span className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-indigo-500" />
        {label}
      </span>
    </label>
    <select value={value} onChange={(event) => onChange(event.target.value)} className={selectClass}>
      {options.map(([optionValue, text]) => (
        <option key={optionValue} value={optionValue}>
          {text}
        </option>
      ))}
    </select>
  </div>
);

const StatusItem = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
    <Icon className="mb-2 h-5 w-5 text-indigo-500" />
    <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100 capitalize">{value}</p>
  </div>
);

const AdminSecurity = ({ profile, onNavigate }) => (
  <div className="grid gap-6 lg:grid-cols-2">
    <Card hoverEffect={false}>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-500" />
            <span>Platform Security Telemetry</span>
          </CardTitle>
          <CardDescription>Internal platform administrator controls</CardDescription>
        </div>
      </CardHeader>
      <div className="space-y-3">
        <StatusItem
          icon={ShieldCheck}
          label="MFA Enforcement"
          value={profile?.mfa_enabled ? 'Enabled & Verified' : 'Security Policy Required'}
        />
        <StatusItem icon={UserRound} label="Account Role Scope" value="Internal Platform Administrator" />
      </div>
    </Card>
    <Card hoverEffect={false}>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            <span>Platform Operations &amp; Audit</span>
          </CardTitle>
          <CardDescription>Isolated system monitoring and AI engine telemetry</CardDescription>
        </div>
      </CardHeader>
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
          RBAC Policy &amp; Platform Security Audit Log
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
          ML Dataset &amp; Forecasting Engine Monitoring
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
          Isolated System Console Scope (No direct tenant store operations)
        </div>
      </div>
      <Button type="button" className="mt-4 w-full" onClick={() => onNavigate('reports')}>
        Open Model Engine Monitoring
      </Button>
    </Card>
  </div>
);
