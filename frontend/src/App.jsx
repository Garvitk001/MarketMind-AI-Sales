import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { DataProvider } from './context/DataContext';
import { useTheme } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { Sparkles } from 'lucide-react';

import { Login } from './components/auth/Login';
import { BusinessLandingPage } from './components/landing/BusinessLandingPage';
import { Sidebar } from './components/common/Sidebar';
import { Navbar } from './components/common/Navbar';
import { ToastContainer } from './components/common/ToastContainer';
import { AiAssistantModal } from './components/common/AiAssistantModal';
import { UIComponentLibrary } from './components/common/UIComponentLibrary';

import { OwnerDashboard } from './components/dashboards/OwnerDashboard';
import { ManagerDashboard } from './components/dashboards/ManagerDashboard';
import { SalesDashboard } from './components/dashboards/SalesDashboard';
import { AdminDashboard } from './components/dashboards/AdminDashboard';

import { SalesModule } from './components/modules/SalesModule';
import { InventoryModule } from './components/modules/InventoryModule';
import { CustomersModule } from './components/modules/CustomersModule';
import { ReportsModule } from './components/modules/ReportsModule';
import { SettingsModule } from './components/modules/SettingsModule';
import { TeamManagementModule } from './components/modules/TeamManagementModule';
import { BusinessSetupModule } from './components/modules/BusinessSetupModule';
import { ProductRecommendationsModule } from './components/modules/ProductRecommendationsModule';
import { ChurnPredictionModule } from './components/modules/ChurnPredictionModule';
import { AnomalyDetectionModule } from './components/modules/AnomalyDetectionModule';
import { AiChatModule } from './components/modules/AiChatModule';

const MainAppContent = () => {
  const { isAuthenticated, isInitializing, currentRole, profile } = useAuth();
  const { setThemePreference } = useTheme();

  const isDevUrl = () => {
    if (typeof window === 'undefined') return false;
    const hash = (window.location.hash || '').toLowerCase();
    const search = (window.location.search || '').toLowerCase();
    const pathname = (window.location.pathname || '').toLowerCase();
    return (
      hash === '#admin' ||
      hash === '#dev' ||
      hash === '#developer' ||
      hash === '#console' ||
      hash === '#secret' ||
      search.includes('admin') ||
      search.includes('dev') ||
      search.includes('developer') ||
      pathname === '/admin' ||
      pathname === '/dev' ||
      pathname === '/developer'
    );
  };

  const [publicView, setPublicView] = useState(() => (isDevUrl() ? 'developer' : 'landing'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  useEffect(() => {
    const handleUrlChange = () => {
      if (isDevUrl()) {
        setPublicView('developer');
      }
    };

    const handleKeyDown = (e) => {
      // Secret developer shortcut: Ctrl + Shift + D or Ctrl + Alt + A
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') || (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'a')) {
        e.preventDefault();
        setPublicView((prev) => (prev === 'developer' ? 'landing' : 'developer'));
      }
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setActiveTab('dashboard');
    setIsMobileMenuOpen(false);
  }, [currentRole.id]);

  useEffect(() => {
    if (profile?.theme_preference) setThemePreference(profile.theme_preference);
  }, [profile?.theme_preference, setThemePreference]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 text-indigo-300 flex items-center justify-center font-semibold">
        Connecting to MarketMind...
      </div>
    );
  }

  if (!isAuthenticated) {
    if (publicView === 'developer' || publicView === 'admin') {
      return (
        <Login
          initialMode="login"
          initialRole="admin"
          isDeveloperPortal={true}
          onBack={() => {
            if (window.location.hash.startsWith('#admin') || window.location.hash.startsWith('#dev')) {
              window.location.hash = '';
            }
            setPublicView('landing');
          }}
        />
      );
    }

    if (publicView === 'login' || publicView === 'register') {
      return (
        <Login
          initialMode={publicView}
          onBack={() => setPublicView('landing')}
        />
      );
    }

    return (
      <BusinessLandingPage
        onSignIn={() => setPublicView('login')}
        onRegister={() => setPublicView('register')}
      />
    );
  }

  // Render role-specific dashboard when activeTab is 'dashboard'
  const renderDashboardView = () => {
    switch (currentRole.id) {
      case 'owner':
        return <OwnerDashboard onNavigate={setActiveTab} />;
      case 'manager':
        return <ManagerDashboard />;
      case 'sales':
        return <SalesDashboard onNavigate={setActiveTab} />;
      case 'admin':
        return <AdminDashboard activeTab={activeTab === 'dashboard' ? 'businesses' : activeTab} onTabChange={setActiveTab} />;
      default:
        return <OwnerDashboard onNavigate={setActiveTab} />;
    }
  };

  // Render dynamic main view
  const renderMainContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardView();
      case 'businesses':
      case 'auth_logs':
      case 'ai_models':
      case 'errors':
      case 'system':
        return currentRole.id === 'admin'
          ? <AdminDashboard activeTab={activeTab} onTabChange={setActiveTab} />
          : renderDashboardView();
      case 'sales':
        return <SalesModule />;
      case 'inventory':
        return <InventoryModule />;
      case 'customers':
        return <CustomersModule />;
      case 'recommendations':
        return <ProductRecommendationsModule />;
      case 'churn':
        return <ChurnPredictionModule />;
      case 'anomalies':
        return <AnomalyDetectionModule />;
      case 'ai_chat':
        return <AiChatModule />;
      case 'reports':
        return <ReportsModule onNavigate={setActiveTab} />;
      case 'components':
        return <UIComponentLibrary />;
      case 'settings':
        return <SettingsModule onNavigate={setActiveTab} />;
      case 'team':
        return <TeamManagementModule />;
      case 'setup':
        return <BusinessSetupModule onNavigate={setActiveTab} />;
      default:
        return renderDashboardView();
    }
  };

  return (
    <div className={`marketmind-workspace role-${currentRole.id} ${profile?.dashboard_density === 'compact' ? 'density-compact' : ''} min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-300 flex`}>
      {/* Collapsible Responsive Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Top Header Navbar */}
      <Navbar
        isCollapsed={isCollapsed}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onNavigate={setActiveTab}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Dynamic Main Workspace Container */}
      <main
        className={`dashboard-canvas flex-1 pt-20 pb-12 px-3 sm:px-6 md:px-8 transition-all duration-300 ml-0 min-w-0 ${
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in min-w-0">
          {renderMainContent()}
        </div>
      </main>

      {/* Global Toast Alerts */}
      <ToastContainer />

      {/* Floating Persistent AI Copilot Trigger Button (Bottom-Right Corner) */}
      <button
        onClick={() => setIsAiModalOpen(true)}
        className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 text-white font-bold text-xs shadow-2xl shadow-indigo-600/50 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-indigo-400/30 group"
        title="Open AI Business Copilot"
      >
        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
        </div>
        <span>AI Copilot Help</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
      </button>

      {/* AI Assistant Modal */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        activeTab={activeTab}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider>
            <DataProvider>
              <MainAppContent />
            </DataProvider>
          </AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
