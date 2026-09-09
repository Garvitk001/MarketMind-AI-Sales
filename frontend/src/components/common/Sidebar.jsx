import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ProfileAvatar } from './ProfileAvatar';
import {
  LayoutDashboard,
  ShoppingBag,
  PackageCheck,
  Users,
  Activity,
  ClipboardCheck,
  BarChart3,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  Clock,
  Cpu,
  Database
} from 'lucide-react';

import { useLanguage } from '../../context/LanguageContext';

export const Sidebar = ({ activeTab, setActiveTab, isCollapsed, setIsCollapsed, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { currentRole = {}, access, profile, logout } = useAuth() || {};
  const { t } = useLanguage();

  const allowedModules = new Set((access?.modules || []).map((module) => module.code));
  const navItems = currentRole?.id === 'admin'
    ? [
        { id: 'businesses', label: 'Businesses & Teams', icon: Building2, badge: 'Owners', badgeColor: 'bg-purple-500/20 text-purple-300' },
        { id: 'auth_logs', label: 'Auth & Login Logs', icon: Clock, badge: 'Timing', badgeColor: 'bg-blue-500/20 text-blue-300' },
        { id: 'ai_models', label: 'AI Models & Retrain', icon: Cpu, badge: 'Last Train', badgeColor: 'bg-emerald-500/20 text-emerald-300' },
        { id: 'errors', label: 'Error Handling & Logs', icon: Activity, badge: 'Diagnostics', badgeColor: 'bg-rose-500/20 text-rose-300' },
        { id: 'system', label: 'System Health & RBAC', icon: Database, badge: 'Infra', badgeColor: 'bg-slate-700 text-slate-300' },
        { id: 'settings', label: t('Settings'), icon: Settings, badge: null }
      ]
    : [
        { id: 'dashboard', label: t('Dashboard'), icon: LayoutDashboard, badge: null },
        ...(allowedModules.has('sales') ? [{ id: 'sales', label: t('Sales Deals'), icon: ShoppingBag, badge: null }] : []),
        ...(allowedModules.has('inventory') ? [{ id: 'inventory', label: t('Inventory'), icon: PackageCheck, badge: currentRole?.id === 'manager' ? t('Stock Alerts') : null, badgeColor: 'bg-rose-500 text-white' }] : []),
        ...(allowedModules.has('customer_segments') ? [{ id: 'customers', label: t('Customers'), icon: Users, badge: null }] : []),
        { id: 'recommendations', label: t('AI Recommender'), icon: Sparkles, badge: t('Boost'), badgeColor: 'bg-indigo-500/20 text-indigo-300' },
        { id: 'churn', label: t('Churn Analytics'), icon: Users, badge: t('Retention'), badgeColor: 'bg-rose-500/20 text-rose-300' },
        { id: 'anomalies', label: t('Anomaly Alerts'), icon: Activity, badge: t('Safeguard'), badgeColor: 'bg-amber-500/20 text-amber-300' },
        ...(allowedModules.has('business_setup') ? [{ id: 'setup', label: t('Business Setup'), icon: ClipboardCheck, badge: 'Start', badgeColor: 'bg-amber-500/15 text-amber-300' }] : []),
        ...(allowedModules.has('team_management') ? [{ id: 'team', label: t('Team & Performance'), icon: Users, badge: 'Owner', badgeColor: 'bg-indigo-500/20 text-indigo-300' }] : []),
        ...(allowedModules.has('team_performance') ? [{ id: 'team', label: currentRole?.id === 'sales' ? 'My Performance' : t('Team & Performance'), icon: Activity, badge: currentRole?.id === 'manager' ? 'Store' : 'Personal', badgeColor: 'bg-emerald-500/15 text-emerald-300' }] : []),
        ...(allowedModules.has('forecasts') ? [{ id: 'reports', label: t('Reports & Forecasts'), icon: BarChart3, badge: 'Live', badgeColor: 'bg-emerald-500/15 text-emerald-300' }] : []),
        { id: 'settings', label: t('Settings'), icon: Settings, badge: null }
      ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs md:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 md:z-40 h-screen bg-slate-900 border-r border-slate-800 text-slate-300 transition-all duration-300 flex flex-col justify-between ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileMenuOpen
            ? 'translate-x-0 shadow-2xl'
            : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header & Brand Logo */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/30">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <h1 className="text-base font-bold text-white tracking-tight truncate">MarketMind AI</h1>
                  <p className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">Enterprise v2.4</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:block p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Menu"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Current Active Role Switcher Card */}
          {!isCollapsed && (
            <div className="m-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Workspace View</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentRole.badgeColor}`}>
                  {currentRole.badge}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ProfileAvatar profile={profile} fallbackImage={currentRole.avatar} className="w-8 h-8 rounded-full border border-indigo-400/30 text-base" />
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate">{profile?.full_name || currentRole.name}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5 overflow-y-auto flex-1 min-h-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.badgeColor || 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Info & Logout */}
      <div className="p-3 border-t border-slate-800 space-y-2 shrink-0">
        {!isCollapsed ? (
          <div className="space-y-2">
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out Session</span>
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="w-full p-2.5 flex items-center justify-center text-rose-400 hover:bg-rose-500/10 rounded-xl"
            title="Sign Out Session"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  </>
  );
};
