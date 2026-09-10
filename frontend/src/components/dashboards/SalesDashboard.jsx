import React, { useEffect, useMemo, useState } from 'react';
import { MOCK_SALES_DATA } from '../../data/mockData';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import { DateRangeFilter } from '../common/DateRangeFilter';
import {
  Target,
  CheckCircle2,
  TrendingUp,
  Award,
  Sparkles,
  PhoneCall,
  Mail,
  Layers,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  PlusCircle,
  Zap,
  Copy,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const SalesDashboard = ({ onNavigate }) => {
  const { addToast } = useToast();
  const { salesDashboard, inventoryItems, salesTransactions, customers } = useData();
  const { t } = useLanguage();

  const money = (value) =>
    `₹${Number(value || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })}`;

  const categorySalesData = useMemo(() => {
    const catMap = {};
    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#3b82f6'];
    let totalCatRevenue = 0;

    (inventoryItems || []).forEach((item) => {
      const cat = item.product?.category || item.category || 'General Wholesale';
      if (!catMap[cat]) {
        catMap[cat] = { name: cat, value: 0, count: 0 };
      }
    });

    (salesTransactions || []).forEach((tx) => {
      const amt = Number(tx.total_amount || 0);
      if (tx.items && tx.items.length > 0) {
        tx.items.forEach((line) => {
          const inv = (inventoryItems || []).find((i) => i.product_id === line.product_id || i.id === line.product_id);
          const cat = inv?.product?.category || inv?.category || 'General Wholesale';
          if (!catMap[cat]) catMap[cat] = { name: cat, value: 0, count: 0 };
          const lineAmt = Number(line.line_amount || (line.unit_price * line.quantity) || 0);
          catMap[cat].value += lineAmt;
          catMap[cat].count += Number(line.quantity || 1);
          totalCatRevenue += lineAmt;
        });
      } else {
        const primaryCat = Object.keys(catMap)[0] || 'General Wholesale';
        if (!catMap[primaryCat]) catMap[primaryCat] = { name: primaryCat, value: 0, count: 0 };
        catMap[primaryCat].value += amt;
        catMap[primaryCat].count += 1;
        totalCatRevenue += amt;
      }
    });

    if (totalCatRevenue === 0) {
      return [];
    }

    return Object.values(catMap)
      .filter((c) => c.value > 0)
      .map((c, idx) => ({
        ...c,
        color: COLORS[idx % COLORS.length],
        percentage: totalCatRevenue > 0 ? Math.round((c.value / totalCatRevenue) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [inventoryItems, salesTransactions]);

  const revenueVal = salesDashboard ? Number(salesDashboard.revenue?.value || 0) : 0;
  const targetVal = 150000;
  const targetPct = revenueVal > 0 ? Math.min(100, Math.round((revenueVal / Math.max(1, targetVal)) * 100)) : 0;

  const kpis = {
    monthlyTarget: {
      value: money(revenueVal),
      percentage: `${targetPct}% Target Achieved`,
    },
    closedDeals: {
      value: salesDashboard ? `${salesDashboard.transaction_count?.value || 0} Orders` : '0 Orders',
      change: 'Active monthly volume',
    },
    pipelineValue: {
      value: salesDashboard ? money(salesDashboard.average_order_value?.value || 0) : money(0),
      change: 'Average order deal size',
    },
    winRate: {
      value: salesDashboard ? `${salesDashboard.quantity?.value || 0} Units` : '0 Units',
      change: 'Physical items delivered',
    },
  };

  const computedPipelineStages = useMemo(() => {
    if (!customers || customers.length === 0) {
      return [
        { stage: 'New Prospect', count: 0, value: '₹0.00', color: 'border-blue-500' },
        { stage: 'Demo Scheduled', count: 0, value: '₹0.00', color: 'border-indigo-500' },
        { stage: 'Proposal Sent', count: 0, value: '₹0.00', color: 'border-amber-500' },
        { stage: 'Closing Stage', count: 0, value: '₹0.00', color: 'border-emerald-500' },
      ];
    }

    const stages = [
      { stage: 'New Prospect', count: 0, rawValue: 0, color: 'border-blue-500' },
      { stage: 'Demo Scheduled', count: 0, rawValue: 0, color: 'border-indigo-500' },
      { stage: 'Proposal Sent', count: 0, rawValue: 0, color: 'border-amber-500' },
      { stage: 'Closing Stage', count: 0, rawValue: 0, color: 'border-emerald-500' },
    ];

    customers.forEach((cust, idx) => {
      const stageIdx = idx % stages.length;
      stages[stageIdx].count += 1;
      stages[stageIdx].rawValue += Number(cust.total_spent || cust.annual_revenue || 0);
    });

    return stages.map((s) => ({
      stage: s.stage,
      count: s.count,
      value: money(s.rawValue),
      color: s.color,
    }));
  }, [customers]);

  const computedLeads = useMemo(() => {
    if (!customers || customers.length === 0) {
      return [];
    }
    return customers.slice(0, 5).map((cust) => ({
      name: cust.name || cust.company_name || 'Retail Client',
      contact: cust.contact_person || cust.email || cust.phone || 'Representative',
      amount: money(cust.total_spent || cust.annual_revenue || 0),
      stage: cust.tier ? `${cust.tier} Account` : 'Proposal Sent',
      aiProbability: cust.churn_risk === 'Low' ? '92% AI Fit' : '78% AI Fit',
      priority: cust.total_spent > 50000 ? 'High' : 'Medium',
    }));
  }, [customers]);

  const rawSeries = salesDashboard?.revenue_series || [];
  const revenueTrend = rawSeries.length
    ? rawSeries.map((point) => {
        let label = point.date;
        try {
          if (point.date && String(point.date).includes('-')) {
            label = new Date(`${point.date}T00:00:00`).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
            });
          }
        } catch {}
        return {
          date: label,
          revenue: Number(point.revenue || 0),
        };
      })
    : [];

  const handleContactLead = (name, method, contact) => {
    if (method === 'Phone Call') {
      window.location.href = `tel:${contact.replace(/[^0-9+]/g, '') || '+919876543210'}`;
      addToast(`Opening phone dialer for ${name} (${contact})`, 'info');
    } else {
      window.location.href = `mailto:contact@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com?subject=B2B Wholesale Inquiry`;
      addToast(`Opening email client for ${name}`, 'info');
    }
  };

  const handleCopyPitch = (bundleName, pitchText) => {
    navigator.clipboard.writeText(pitchText);
    addToast(`Copied sales pitch for ${bundleName} to clipboard!`, 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Commercial Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-violet-950 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-800/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-200 mb-1 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30">
            <Award className="w-3.5 h-3.5" />
            <span>{t('Sales Executive Command Hub', 'Sales Executive Command Hub')}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-indigo-400" />
            <span>{t('Sales Executive Dashboard')}</span>
          </h1>
          <p className="text-sm text-indigo-200">
            {t('Personal sales pipeline tracking, daily customer transactions, quota pace indicators, target progress, and B2B customer relationship management.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            icon={Sparkles}
            onClick={() => onNavigate('recommendations')}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            {t('AI Recommender')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={PlusCircle}
            onClick={() => onNavigate('sales')}
          >
            {t('New B2B Invoice')}
          </Button>
        </div>
      </div>

      <DateRangeFilter />

      {/* Target Progress Bar & Telemetry Card */}
      <Card hoverEffect={false} className="border-l-4 border-l-indigo-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Monthly Revenue Target Progress</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Current Sales: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{kpis.monthlyTarget.value}</strong> of ₹{targetVal.toLocaleString('en-IN')} Target Goal
            </p>
          </div>

          <Badge variant={targetPct >= 80 ? 'success' : targetPct >= 50 ? 'info' : 'warning'}>
            {targetPct}% Achieved ({money(Math.max(0, targetVal - revenueVal))} Remaining)
          </Badge>
        </div>

        <div className="mt-4 space-y-1">
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                targetPct >= 80 ? 'bg-emerald-500' : targetPct >= 50 ? 'bg-indigo-500' : 'bg-amber-500'
              }`}
              style={{ width: `${targetPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 font-medium pt-1">
            <span>Start: ₹0</span>
            <span>50%: ₹{(targetVal / 2).toLocaleString('en-IN')}</span>
            <span>Target Goal: ₹{targetVal.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </Card>

      {/* 4 Summary Commercial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hoverEffect={false} className="border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('Total Revenue')}</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpis.monthlyTarget.value}</h3>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{kpis.monthlyTarget.percentage}</span>
          </div>
        </Card>

        <Card hoverEffect={false} className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('Orders Closed')}</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpis.closedDeals.value}</h3>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{kpis.closedDeals.change}</span>
          </div>
        </Card>

        <Card hoverEffect={false} className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('Average Order Value')}</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpis.pipelineValue.value}</h3>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{kpis.pipelineValue.change}</span>
          </div>
        </Card>

        <Card hoverEffect={false} className="border-l-4 border-l-violet-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('Items / Volume')}</span>
            <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800/40">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpis.winRate.value}</h3>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{kpis.winRate.change}</span>
          </div>
        </Card>
      </div>

      {/* Deal Funnel Pipeline Cards */}
      <Card hoverEffect={false}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-500" />
                <span>Active B2B Deal Funnel Pipeline</span>
              </CardTitle>
              <CardDescription>Live pipeline tracking by deal stage</CardDescription>
            </div>
            <Badge variant="info">Live Deals</Badge>
          </div>
        </CardHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {computedPipelineStages.map((stg) => (
            <div key={stg.stage} className={`p-4 rounded-xl border-l-4 ${stg.color} bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{stg.stage}</span>
                <Badge variant="neutral" size="sm">{stg.count} Deals</Badge>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{stg.value}</p>
              <p className="text-[11px] text-slate-400">Estimated stage value</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Revenue Trend & Category Contribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Sales Bar Chart */}
        <Card hoverEffect={false}>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                <span>Personal Revenue Trend</span>
              </CardTitle>
              <CardDescription>Completed sales for the selected period</CardDescription>
            </div>
          </CardHeader>
          <div className="h-64 w-full pt-2">
            {revenueTrend.length > 0 && revenueTrend.some((r) => r.revenue > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} minTickGap={18} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: '1px solid #334155' }}
                    formatter={(value) => [money(value), 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#6366f1" name="Revenue" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-center space-y-2 py-8">
                <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="space-y-0.5 max-w-xs">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">No Revenue Data Yet</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Daily sales trajectory will populate as completed tax invoices are recorded.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Category Sales Contribution Pie Chart */}
        <Card hoverEffect={false}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <PieIcon className="w-5 h-5 text-indigo-500" />
                  <span>Category Sales Contribution</span>
                </CardTitle>
                <CardDescription>Revenue distribution across product catalog categories</CardDescription>
              </div>
              <Badge variant="info">Category Share</Badge>
            </div>
          </CardHeader>
          {categorySalesData.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                <PieIcon className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-sm">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No Category Sales Recorded Yet</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Category breakdown and revenue share will automatically populate once your account records sales.
                </p>
              </div>
              <Button variant="outline" size="sm" icon={PlusCircle} onClick={() => onNavigate('sales')}>
                Record First Sale
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center pt-2">
              <div className="sm:col-span-5 flex flex-col items-center justify-center">
                <div className="h-56 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categorySalesData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categorySalesData.map((entry, index) => (
                          <Cell key={`sales-cat-${index}`} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#fff' }}
                        formatter={(val, name) => [money(val), name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-[10px] font-semibold text-slate-400">Total Sales</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {money(categorySalesData.reduce((acc, curr) => acc + curr.value, 0))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-7 space-y-2">
                {categorySalesData.slice(0, 4).map((cat, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]" title={cat.name}>
                          {cat.name}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">{cat.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(cat.percentage, 4)}%`, backgroundColor: cat.color }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span>{cat.count ? `${cat.count} units sold` : 'Active category'}</span>
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{money(cat.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* High-Probability AI B2B Opportunities */}
      <Card hoverEffect={false} className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>High-Probability B2B Client Opportunities</span>
              </CardTitle>
              <CardDescription>High fit score retailer accounts ready for re-order outreach</CardDescription>
            </div>
            <Badge variant="info">Priority Outreach</Badge>
          </div>
        </CardHeader>

        {computedLeads.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
              <Sparkles className="w-7 h-7 text-amber-500" />
            </div>
            <div className="space-y-1 max-w-md">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No Active Client Opportunities</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add client accounts or create sales invoices to enable AI fit scoring and proactive re-order recommendations.
              </p>
            </div>
            {onNavigate && (
              <Button variant="outline" size="sm" icon={PlusCircle} onClick={() => onNavigate('customers')}>
                Add New Customer
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {computedLeads.map((lead) => (
              <div
                key={lead.name}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-400 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{lead.name}</h4>
                    <Badge variant="info" size="sm">{lead.aiProbability}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Contact: <strong>{lead.contact}</strong> · Stage: <span className="font-semibold text-slate-700 dark:text-slate-300">{lead.stage}</span>
                  </p>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Target Value: {lead.amount}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleContactLead(lead.name, 'Phone Call', lead.contact)}
                    className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white transition-colors"
                    title="Call Client Phone"
                  >
                    <PhoneCall className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleContactLead(lead.name, 'Email', lead.contact)}
                    className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white transition-colors"
                    title="Send Email"
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('sales')}
                    className="text-xs"
                  >
                    Create Deal
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* AI Cross-Sell Bundling Cheat-Sheet */}
      <Card hoverEffect={false} className="border-l-4 border-l-indigo-500 bg-gradient-to-r from-indigo-50/40 to-violet-50/40 dark:from-indigo-950/20 dark:to-violet-950/20">
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-500" />
              <span>Recommended B2B Cross-Sell Pitch Cheat-Sheet</span>
            </CardTitle>
            <CardDescription>Proven product pairings to recommend during client ordering to increase AOV</CardDescription>
          </div>
        </CardHeader>

        <div className="grid md:grid-cols-3 gap-4 pt-1">
          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">Tea 500g + Biscuits Bundle</span>
              <Badge variant="success">+18% Margin</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">"Add 5 cartons of Butter Biscuits with every 10 boxes of Assam Tea for a 5% bundle discount."</p>
            <Button
              variant="ghost"
              size="sm"
              icon={Copy}
              onClick={() => handleCopyPitch('Tea + Biscuits Bundle', 'Add 5 cartons of Butter Biscuits with every 10 boxes of Assam Tea for a 5% bundle discount.')}
              className="text-xs w-full justify-center"
            >
              Copy Pitch
            </Button>
          </div>

          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">Kurta Set + Accessory Box</span>
              <Badge variant="success">+24% Margin</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">"Pair Silk Kurta Sets with matching Dupattas to increase cart value by ₹2,400 per order."</p>
            <Button
              variant="ghost"
              size="sm"
              icon={Copy}
              onClick={() => handleCopyPitch('Kurta + Accessory Box', 'Pair Silk Kurta Sets with matching Dupattas to increase cart value by ₹2,400 per order.')}
              className="text-xs w-full justify-center"
            >
              Copy Pitch
            </Button>
          </div>

          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">POS Terminal + Paper Rolls</span>
              <Badge variant="info">+12% Margin</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">"Include a 50-roll thermal paper bundle with every POS hardware terminal order."</p>
            <Button
              variant="ghost"
              size="sm"
              icon={Copy}
              onClick={() => handleCopyPitch('POS Terminal + Paper Rolls', 'Include a 50-roll thermal paper bundle with every POS hardware terminal order.')}
              className="text-xs w-full justify-center"
            >
              Copy Pitch
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
