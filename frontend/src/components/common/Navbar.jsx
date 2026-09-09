import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { ProfileAvatar } from './ProfileAvatar';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Sparkles,
  ChevronDown,
  LogOut,
  Languages,
  Menu
} from 'lucide-react';

import { useLanguage } from '../../context/LanguageContext';

export const Navbar = ({ isCollapsed, onOpenAiModal, onNavigate, onToggleMobileMenu }) => {
  const { currentRole, userEmail, profile, logout, api } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { addToast } = useToast();
  const { salesTransactions = [], inventoryItems = [], customers = [] } = useData() || {};

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readNotificationIds, setReadNotificationIds] = useState(new Set());

  const unreadCount = (notifications || []).filter((notification) => !readNotificationIds.has(notification.id)).length;
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length < 2) return [];
    const results = [
      ...(salesTransactions || []).map((transaction) => ({
        id: transaction.id,
        type: 'Transaction',
        label: transaction.external_reference || String(transaction.id || '').slice(0, 8),
        detail: `${transaction.source_system || 'POS'} • ₹${Number(transaction.total_amount || 0).toLocaleString('en-IN')}`,
        tab: 'sales'
      })),
      ...(inventoryItems || []).map((item) => ({
        id: item.id,
        type: 'Inventory',
        label: item.product?.name || item.name || 'Product Item',
        detail: `${item.product?.sku || item.sku || 'SKU'} • ${item.stock_quantity ?? item.stock ?? 0} units`,
        tab: 'inventory'
      })),
      ...(customers || []).map((customer) => ({
        id: customer.id,
        type: 'Customer',
        label: customer.external_customer_id || customer.full_name || customer.name || 'Customer',
        detail: `${customer.order_count || 0} orders • ₹${Number(customer.total_revenue || 0).toLocaleString('en-IN')}`,
        tab: 'customers'
      }))
    ];
    return results
      .filter((result) => `${result.label} ${result.detail} ${result.type}`.toLowerCase().includes(query))
      .slice(0, 8);
  }, [searchQuery, salesTransactions, inventoryItems, customers]);

  useEffect(() => {
    const focusSearch = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  useEffect(() => {
    let active = true;
    const loadNotifications = async () => {
      try {
        const response = await api('/notifications');
        if (active) setNotifications(response.items || []);
      } catch {
        if (active) setNotifications([]);
      }
    };
    loadNotifications();
    const seconds = currentRole.id === 'admin'
      ? Number(profile?.role_preferences?.monitoring_refresh || 60)
      : 60;
    const timer = window.setInterval(loadNotifications, seconds * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [api, currentRole.id, profile?.role_preferences]);

  const openSearchResult = (result) => {
    onNavigate(result.tab);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleMarkAllRead = () => {
    setReadNotificationIds(new Set(notifications.map((notification) => notification.id)));
    addToast('All notifications marked as read', 'info');
  };

  const openNotification = (notification) => {
    setReadNotificationIds((current) => new Set([...current, notification.id]));
    setIsNotifOpen(false);
    onNavigate(notification.destination || 'dashboard');
  };

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-all duration-300 flex items-center justify-between px-3 sm:px-6 left-0 ${
        isCollapsed ? 'md:left-20' : 'md:left-64'
      }`}
    >
      {/* Global Search Bar & Mobile Menu Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-md min-w-0 pr-2">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full min-w-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search transactions, inventory and customers..."
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            onBlur={() => window.setTimeout(() => setIsSearchOpen(false), 150)}
            className="w-full pl-10 pr-12 py-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
          />
          <kbd className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-xs">
            Ctrl K
          </kbd>
          {isSearchOpen && searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-11 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              {searchResults.length ? (
                searchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => openSearchResult(result)}
                    className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-0 hover:bg-indigo-50 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{result.label}</p>
                      <p className="truncate text-[11px] text-slate-500">{result.detail}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
                      {result.type}
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-4 text-center text-xs text-slate-500">
                  No permitted records match “{searchQuery.trim()}”.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* AI Assistant Quick Trigger */}
        <button
          onClick={onOpenAiModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all shadow-xs"
        >
          <Sparkles className="w-4 h-4 text-indigo-500 animate-spin-slow" />
          <span className="hidden sm:inline">Ask AI Assistant</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
        </button>

        {/* Language Selector Toggle */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-bold transition-all"
          title="Switch Language / भाषा बदलें"
        >
          <Languages className="w-4 h-4 text-indigo-400" />
          <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
        </button>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-scale-up">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Live Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  Mark all read
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length ? notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openNotification(n)}
                    className={`p-3.5 transition-colors flex items-start gap-3 ${
                      !readNotificationIds.has(n.id) ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    } w-full text-left`}
                  >
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{n.title}</p>
                        <span className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleDateString('en-IN')}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{n.message}</p>
                    </div>
                  </button>
                )) : <p className="px-4 py-8 text-center text-xs text-slate-500">No enabled alerts need your attention.</p>}
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ProfileAvatar profile={profile} fallbackImage={currentRole.avatar} className="w-9 h-9 rounded-full border-2 border-indigo-500 text-lg" />
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">{profile?.full_name || currentRole.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{currentRole.badge}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-scale-up">
              <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 mb-2">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Authenticated Session</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{userEmail}</p>
              </div>

              <div className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300">
                <p className="text-xs font-bold">{currentRole.name}</p>
                <p className="text-[11px] mt-1">{currentRole.id === 'admin' ? 'Internal platform access.' : currentRole.id === 'owner' ? 'Business and team owner.' : 'Role and store are managed by your Business Owner.'}</p>
              </div>

              <button
                onClick={() => { onNavigate('settings'); setIsProfileOpen(false); }}
                className="mt-2 w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Profile & Settings
              </button>

              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
