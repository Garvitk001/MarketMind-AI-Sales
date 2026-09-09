import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { CardSkeleton, Skeleton } from '../ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { MOCK_CUSTOMERS, MOCK_MANAGER_DATA } from '../../data/mockData';
import recommendationService from '../../services/recommendationService';
import {
  Sparkles,
  ShoppingBag,
  Zap,
  DollarSign,
  Layers,
  Search,
  RefreshCw,
  Plus,
  PackageCheck,
  Building2,
  Filter,
  ArrowUpRight,
  Target,
  Shield,
  Activity,
  Award,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  BarChart2,
  SortAsc,
  Download,
  Copy,
  CheckCircle2,
  Check,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBadgeVariantForType(type) {
  if (!type) return 'neutral';
  const t = type.toLowerCase();
  if (t.includes('cross')) return 'info';
  if (t.includes('upsell')) return 'warning';
  if (t.includes('personaliz') || t.includes('smart') || t.includes('high_margin')) return 'success';
  return 'neutral';
}

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, score || 0));
  const color =
    pct >= 85
      ? 'from-emerald-500 to-teal-400'
      : pct >= 70
      ? 'from-indigo-500 to-emerald-400'
      : 'from-amber-500 to-orange-400';
  return (
    <div className="w-full h-1.5 rounded-full bg-indigo-200 dark:bg-indigo-900/60 overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Sub-sections ─────────────────────────────────────────────────────────────

function CrossSellSection({ items, onAddToQuote }) {
  const crossSellItems = items.filter(
    (r) => r.recommendation_type?.toLowerCase().includes('cross') || r.association_confidence >= 0.7
  );
  if (!crossSellItems.length) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-indigo-500" />
          High-Confidence Cross-Sell Bundles
        </h2>
        <span className="text-xs text-slate-400">{crossSellItems.length} opportunities</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {crossSellItems.slice(0, 6).map((rec) => (
          <Card key={`cs-${rec.id}`} hoverEffect className="p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-400">{rec.sku}</span>
                    <Badge variant="info" size="sm">Cross-Sell</Badge>
                    <Badge variant={rec.stock_status === 'In Stock' ? 'success' : 'warning'} size="sm">
                      {rec.stock_status}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {rec.product_name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Category: <strong className="text-slate-700 dark:text-slate-300">{rec.category}</strong>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    ₹{typeof rec.unit_price === 'number' ? rec.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : rec.unit_price}
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                    +{rec.potential_revenue || '₹1,500'}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                  <span>Match Confidence</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">{rec.match_score}%</span>
                </div>
                <ScoreBar score={rec.match_score} />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed line-clamp-2">
                  {rec.reasoning}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Stock: <strong>{rec.stock} units</strong></span>
              <Button variant="primary" size="xs" icon={Plus} onClick={() => onAddToQuote(rec)}>
                Add to Invoice
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function UpsellSection({ items, onAddToQuote }) {
  const upsellItems = items.filter(
    (r) => r.recommendation_type?.toLowerCase().includes('upsell') || r.unit_price >= 200
  );
  if (!upsellItems.length) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-500" />
          High Margin & Upsell Opportunities
        </h2>
        <span className="text-xs text-slate-400">{upsellItems.length} opportunities</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {upsellItems.slice(0, 6).map((rec) => (
          <Card key={`up-${rec.id}`} hoverEffect className="p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-400">{rec.sku}</span>
                    <Badge variant="warning" size="sm">Upsell</Badge>
                    <Badge variant={rec.stock_status === 'In Stock' ? 'success' : 'warning'} size="sm">
                      {rec.stock_status}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {rec.product_name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Category: <strong className="text-slate-700 dark:text-slate-300">{rec.category}</strong>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    ₹{typeof rec.unit_price === 'number' ? rec.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : rec.unit_price}
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                    Est: {rec.potential_revenue || '₹3,000'}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                  <span>Match Confidence</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{rec.match_score}%</span>
                </div>
                <ScoreBar score={rec.match_score} />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed line-clamp-2">
                  {rec.reasoning}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Stock: <strong>{rec.stock} units</strong></span>
              <Button variant="primary" size="xs" icon={Plus} onClick={() => onAddToQuote(rec)}>
                Add to Invoice
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function InsightsSection({ insights }) {
  if (!insights || !insights.length) return null;
  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-500" />
        Data-Driven Commercial Growth Insights
      </h2>
      <Card>
        <ul className="space-y-3">
          {insights.map((insight, idx) => (
            <li
              key={idx}
              className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40"
            >
              <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <span className="text-[10px] font-bold">{idx + 1}</span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{insight}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function EvalMetricsSection({ evaluation }) {
  if (!evaluation) return null;
  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-purple-500" />
        AI Recommender Prediction Reliability
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card hoverEffect>
          <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-2">
            Recommendation Accuracy
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {evaluation.precision_at_k != null
              ? `${(evaluation.precision_at_k * 100).toFixed(1)}%`
              : '--'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            High-conversion bundle precision
          </p>
        </Card>
        <Card hoverEffect>
          <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-2">
            Demand Signal Coverage
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {evaluation.recall_at_k != null
              ? `${(evaluation.recall_at_k * 100).toFixed(1)}%`
              : '--'}
          </div>
          <p className="text-xs text-emerald-500 font-medium mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Customer demand signals captured
          </p>
        </Card>
        <Card hoverEffect>
          <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-2">
            Overall Model Fit
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {evaluation.f1_score_at_k != null ? `${(evaluation.f1_score_at_k * 100).toFixed(1)}%` : '--'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Balanced recommendation score</p>
        </Card>
      </div>
      <div className="text-xs text-slate-400 dark:text-slate-500 text-right">
        Evaluated over {evaluation.total_evaluated_queries ?? '--'} historical queries
      </div>
    </div>
  );
}

// ─── Role-Specific KPI Cards ──────────────────────────────────────────────────

function OwnerKPIs({ recommendations, analytics }) {
  return (
    <>
      <Card hoverEffect>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Active Recommendations</span>
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {recommendations.length > 0 ? `${recommendations.length} Products` : '--'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cross-sell & upsell catalog matches</p>
        </div>
      </Card>

      <Card hoverEffect>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Revenue Potential</span>
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {analytics
              ? `₹${analytics.potential_revenue_boost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '--'}
          </h3>
          <div className="flex items-center gap-1 mt-1 text-xs text-emerald-500 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Estimated revenue uplift</span>
          </div>
        </div>
      </Card>

      <Card hoverEffect>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Top Growth Category</span>
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
            {analytics ? analytics.top_recommended_category : '--'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Highest cross-sell conversion volume</p>
        </div>
      </Card>

      <Card hoverEffect>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Avg Customer Fit Score</span>
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {analytics ? `${analytics.avg_match_score}%` : '--'}
          </h3>
          <div className="mt-1">
            <Badge variant={analytics ? 'success' : 'neutral'} size="sm">
              {analytics ? 'High Customer Fit' : 'Awaiting Data'}
            </Badge>
          </div>
        </div>
      </Card>
    </>
  );
}

function ManagerKPIs({ recommendations, analytics }) {
  const lowStockCount = recommendations.filter((r) => r.stock_status === 'Low Stock' || r.stock_status === 'Critical Stock').length;
  return (
    <>
      <Card hoverEffect>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Inventory SKUs</span>
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <PackageCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {recommendations.length > 0 ? `${recommendations.length} SKUs` : '--'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Evaluated store catalog</p>
        </div>
      </Card>

      <Card hoverEffect>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Low Stock Risk</span>
          <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
            <Zap className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {recommendations.length > 0 ? (lowStockCount > 0 ? `${lowStockCount} Items` : '0 Items') : '--'}
          </h3>
          <p className="text-xs text-rose-500 font-medium mt-1">
            {lowStockCount > 0 ? 'Restock Recommended' : 'All levels nominal'}
          </p>
        </div>
      </Card>

      <Card hoverEffect>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Top Category</span>
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
            {analytics ? analytics.top_recommended_category : '--'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Highest stock turnover</p>
        </div>
      </Card>

      <Card hoverEffect>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Avg Fit Score</span>
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {analytics ? `${analytics.avg_match_score}%` : '--'}
          </h3>
          <div className="mt-1">
            <Badge variant={analytics ? 'success' : 'neutral'} size="sm">
              {analytics ? 'Engine Active' : 'Awaiting Data'}
            </Badge>
          </div>
        </div>
      </Card>
    </>
  );
}

function SalesKPIs({ recommendations, analytics }) {
  const topRec = recommendations.length > 0 ? recommendations[0] : null;
  return (
    <>
      <Card hoverEffect>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Recommended Products</span>
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Target className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {recommendations.length > 0 ? `${recommendations.length} Products` : '--'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">High conversion opportunities</p>
        </div>
      </Card>

      <Card hoverEffect>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Revenue Potential</span>
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {analytics
              ? `₹${analytics.potential_revenue_boost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '--'}
          </h3>
          <p className="text-xs text-emerald-500 font-medium mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Estimated pipeline uplift
          </p>
        </div>
      </Card>

      <Card hoverEffect>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Best Pitch Product</span>
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
            {topRec ? topRec.product_name : '--'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {topRec ? `Fit Score: ${topRec.match_score}%` : 'Awaiting data'}
          </p>
        </div>
      </Card>

      <Card hoverEffect>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Avg Confidence</span>
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {analytics ? `${analytics.avg_match_score}%` : '--'}
          </h3>
          <div className="mt-1">
            <Badge variant={analytics ? 'success' : 'neutral'} size="sm">
              {analytics ? 'High Confidence' : 'Awaiting Data'}
            </Badge>
          </div>
        </div>
      </Card>
    </>
  );
}

function AdminKPIs({ analytics, evaluation }) {
  return (
    <>
      <Card hoverEffect>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Recommendation Accuracy</span>
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Award className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {evaluation ? `${(evaluation.precision_at_k * 100).toFixed(1)}%` : '--'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Relevant recommendations ratio</p>
        </div>
      </Card>

      <Card hoverEffect>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Signal Coverage</span>
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {evaluation ? `${(evaluation.recall_at_k * 100).toFixed(1)}%` : '--'}
          </h3>
          <p className="text-xs text-emerald-500 font-medium mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Signal retrieval
          </p>
        </div>
      </Card>

      <Card hoverEffect>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">System Accuracy Fit</span>
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {evaluation ? `${(evaluation.f1_score_at_k * 100).toFixed(1)}%` : '--'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Combined model confidence</p>
        </div>
      </Card>

      <Card hoverEffect>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Active Signals</span>
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <Shield className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {analytics ? `${analytics.active_signals_count}` : '--'}
          </h3>
          <div className="mt-1">
            <Badge variant={analytics ? 'success' : 'neutral'} size="sm">
              {analytics ? 'System Operational' : 'Awaiting Data'}
            </Badge>
          </div>
        </div>
      </Card>
    </>
  );
}

// ─── Recommendation Card ──────────────────────────────────────────────────────

function RecCard({ rec, userRole, onAddToQuote, onCopyPitch }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const pitchText = `Recommendation for ${rec.product_name} (${rec.sku}): Unit Price ₹${rec.unit_price}. Reason: ${rec.reasoning}`;
    navigator.clipboard.writeText(pitchText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopyPitch(rec.product_name);
  };

  return (
    <Card hoverEffect className="flex flex-col justify-between border-slate-200/80 dark:border-slate-800">
      <div className="space-y-3">
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px] font-mono font-bold text-slate-400 tracking-wider">{rec.sku}</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant={getBadgeVariantForType(rec.recommendation_type)} size="sm">
              {rec.recommendation_type}
            </Badge>
            <Badge variant={rec.stock_status === 'In Stock' ? 'success' : 'warning'} size="sm">
              {rec.stock_status}
            </Badge>
          </div>
        </div>

        {/* Product Title & Category */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{rec.product_name}</h3>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>
              Category: <strong className="text-slate-700 dark:text-slate-300">{rec.category}</strong>
            </span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
              ₹{typeof rec.unit_price === 'number' ? rec.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : rec.unit_price}
            </span>
          </div>
        </div>

        {/* Match Score */}
        <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60">
          <div className="flex items-center justify-between text-xs font-bold mb-1">
            <span className="text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Customer Fit Score</span>
            </span>
            <span className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">{rec.match_score}%</span>
          </div>
          <ScoreBar score={rec.match_score} />
        </div>

        {/* Manager/Owner: show stock */}
        {(userRole === 'manager' || userRole === 'owner') && (
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>Available Stock:</span>
            <strong
              className={
                rec.stock < 5
                  ? 'text-rose-600 dark:text-rose-400'
                  : rec.stock < 15
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }
            >
              {rec.stock} units
            </strong>
          </div>
        )}

        {/* Commercial Reasoning */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Commercial Rationale</span>
          <p className="leading-relaxed line-clamp-3">{rec.reasoning}</p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400">
          Uplift: <strong className="text-emerald-500 font-bold">{rec.potential_revenue}</strong>
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={handleCopy}
            title="Copy Pitch Summary"
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => onAddToQuote(rec)}>
            Add to Invoice
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const ProductRecommendationsModule = () => {
  const { addToast } = useToast();
  const { currentRole } = useAuth();
  const userRole = currentRole?.id || 'owner';

  // ── Core data state
  const [recommendations, setRecommendations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [insights, setInsights] = useState([]);

  // ── UI state
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null); // null | string
  const [refreshing, setRefreshing] = useState(false);

  // ── Filter state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedSku, setSelectedSku] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('score');

  // ── Dropdown options from live API (with mock fallback)
  const [customerOptions, setCustomerOptions] = useState(MOCK_CUSTOMERS);
  const [productOptions, setProductOptions] = useState(MOCK_MANAGER_DATA.inventoryItems);

  // ── Modal state
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [selectedRecItem, setSelectedRecItem] = useState(null);
  const [quoteQty, setQuoteQty] = useState('1');
  const [quoteStage, setQuoteStage] = useState('Proposal Sent');
  const [submittingQuote, setSubmittingQuote] = useState(false);

  // Prevent infinite loop: hold stable Toast reference
  const addToastRef = useRef(addToast);
  useEffect(() => { addToastRef.current = addToast; }, [addToast]);

  // Load dropdown options once on mount
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [custRes, prodRes] = await Promise.allSettled([
          recommendationService.getCustomers(),
          recommendationService.getProducts(),
        ]);
        if (custRes.status === 'fulfilled' && custRes.value?.items?.length) {
          setCustomerOptions(custRes.value.items);
        }
        if (prodRes.status === 'fulfilled' && prodRes.value?.items?.length) {
          setProductOptions(prodRes.value.items);
        }
      } catch {
        // Silently fall back to mock data
      }
    };
    loadOptions();
  }, []);

  // Core fetch: called on mount and when filters change
  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setApiError(null);

    const params = { role: userRole };
    if (selectedCustomerId) params.customer_id = selectedCustomerId;
    if (selectedSku) params.sku = selectedSku;
    if (selectedCategory) params.category = selectedCategory;
    if (selectedStrategy && selectedStrategy !== 'all') params.strategy = selectedStrategy;

    try {
      const [recData, analyticsData, evalData, insightsData] = await Promise.allSettled([
        recommendationService.getRecommendations(params),
        recommendationService.getAnalytics(),
        recommendationService.getEvaluation(5),
        recommendationService.getInsights(),
      ]);

      if (recData.status === 'fulfilled' && recData.value?.recommendations) {
        setRecommendations(recData.value.recommendations);
      } else {
        setRecommendations([]);
        if (recData.status === 'rejected') {
          setApiError('Recommendation data is temporarily unavailable. Please try again.');
        }
      }

      if (analyticsData.status === 'fulfilled') setAnalytics(analyticsData.value);
      if (evalData.status === 'fulfilled') setEvaluation(evalData.value);
      if (insightsData.status === 'fulfilled') setInsights(insightsData.value?.insights || []);

      if (isManualRefresh) {
        addToastRef.current('Recommendations refreshed.', 'success');
      }
    } catch (_err) {
      setRecommendations([]);
      setApiError('Recommendation data is temporarily unavailable. Please try again.');
      if (isManualRefresh) {
        addToastRef.current('Could not connect to recommendation engine.', 'warning');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userRole, selectedCustomerId, selectedSku, selectedCategory, selectedStrategy]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Client-side search + sort
  const filteredItems = React.useMemo(() => {
    let items = [...recommendations];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      items = items.filter(
        (item) =>
          item.product_name?.toLowerCase().includes(term) ||
          item.sku?.toLowerCase().includes(term) ||
          item.category?.toLowerCase().includes(term)
      );
    }

    items.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return (b.match_score || 0) - (a.match_score || 0);
        case 'price':
          return (b.unit_price || 0) - (a.unit_price || 0);
        case 'name':
          return (a.product_name || '').localeCompare(b.product_name || '');
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'type':
          return (a.recommendation_type || '').localeCompare(b.recommendation_type || '');
        default:
          return 0;
      }
    });

    return items;
  }, [recommendations, searchTerm, sortBy]);

  // Handlers
  const handleOpenQuoteModal = (item) => {
    setSelectedRecItem(item);
    setQuoteQty('1');
    setIsQuoteModalOpen(true);
  };

  const handleQuoteSubmit = (e) => {
    e.preventDefault();
    if (!selectedRecItem) return;
    setSubmittingQuote(true);
    setTimeout(() => {
      setSubmittingQuote(false);
      setIsQuoteModalOpen(false);
      addToastRef.current(`Added ${quoteQty}× "${selectedRecItem.product_name}" to sales invoice pipeline.`, 'success');
    }, 600);
  };

  const handleCopyPitch = (productName) => {
    addToastRef.current(`Copied commercial pitch for ${productName} to clipboard!`, 'info');
  };

  // CSV Export for Business Owners
  const handleExportCSV = () => {
    if (!filteredItems.length) {
      addToastRef.current('No recommendation items to export.', 'warning');
      return;
    }
    const headers = ['SKU', 'Product Name', 'Category', 'Unit Price (INR)', 'Stock Status', 'Stock Qty', 'Match Score (%)', 'Recommendation Type', 'Potential Revenue', 'Reasoning'];
    const rows = filteredItems.map((r) => [
      `"${r.sku || ''}"`,
      `"${(r.product_name || '').replace(/"/g, '""')}"`,
      `"${r.category || ''}"`,
      r.unit_price || 0,
      `"${r.stock_status || ''}"`,
      r.stock || 0,
      r.match_score || 0,
      `"${r.recommendation_type || ''}"`,
      `"${r.potential_revenue || ''}"`,
      `"${(r.reasoning || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Recommended_Product_Catalog_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToastRef.current('Recommended product catalog exported successfully.', 'success');
  };

  const resetFilters = () => {
    setSelectedCustomerId('');
    setSelectedSku('');
    setSelectedCategory('');
    setSelectedStrategy('all');
    setSearchTerm('');
    setSortBy('score');
  };

  const roleHeader = {
    owner: {
      badge: 'B2B Commercial Product Recommender',
      description: 'Maximize Average Order Value (AOV) and client revenue per account with intelligent product cross-sell & high-margin bundles.',
    },
    manager: {
      badge: 'Store Inventory & Stock Pairing',
      description: 'Boost store sales with optimal product pairings, low-stock clearance bundles, and inventory cross-sells.',
    },
    sales: {
      badge: 'Client Product Pitching Hub',
      description: 'Instantly view what products your customer is most likely to buy next during calls or checkout.',
    },
    admin: {
      badge: 'System Recommender Monitoring',
      description: 'System-wide recommendation accuracy and recommendation signal telemetry.',
    },
  }[userRole] || {
    badge: 'Smart Product Recommender',
    description: 'Boost revenue with intelligent product recommendations based on customer buying habits.',
  };

  const strategyOptions = [
    { id: 'all', label: 'All Types' },
    { id: 'cross_sell', label: 'Cross-Sell' },
    { id: 'upsell', label: 'Upsell' },
    { id: 'high_margin', label: 'High Margin' },
    { id: 'inventory_clearance', label: 'Inventory Clearance' },
  ];

  const categories = [...new Set([
    'Terminals', 'Supplies', 'Hardware', 'Networking', 'Software Licenses',
    ...productOptions.map((p) => p.category).filter(Boolean),
  ])];

  const renderSkeleton = () => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-2">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </>
  );

  const renderError = () => (
    <Card className="text-center py-14">
      <div className="max-w-md mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Recommendations Unavailable
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{apiError}</p>
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => fetchData(true)} isLoading={refreshing}>
          Retry
        </Button>
      </div>
    </Card>
  );

  const renderEmpty = () => (
    <Card className="text-center py-14">
      <div className="max-w-md mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center mx-auto">
          <Sparkles className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          No Recommendations Available
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {searchTerm || selectedCategory || selectedStrategy !== 'all' || selectedCustomerId || selectedSku
            ? 'No recommendations match your selected filters.'
            : 'Recommendations are temporarily unavailable. Please try again.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={resetFilters}>
            Reset Filters
          </Button>
          <Button variant="primary" size="sm" icon={RefreshCw} onClick={() => fetchData(true)} isLoading={refreshing}>
            Retry
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-xl border border-indigo-800/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>{roleHeader.badge}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Product Recommendations & Cross-Sell Hub</h1>
          <p className="text-sm text-indigo-200">{roleHeader.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={Download}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            Export Catalog CSV
          </Button>
          <Button
            variant="glass"
            size="sm"
            onClick={() => fetchData(true)}
            isLoading={refreshing}
            icon={RefreshCw}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Main content */}
      {loading ? (
        renderSkeleton()
      ) : apiError && recommendations.length === 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} hoverEffect>
                <div className="flex items-center justify-between">
                  <Skeleton width="w-24" height="h-3" />
                  <Skeleton width="w-9" height="h-9" rounded="rounded-xl" />
                </div>
                <div className="mt-3 space-y-2">
                  <Skeleton width="w-16" height="h-7" />
                  <Skeleton width="w-28" height="h-3" />
                </div>
              </Card>
            ))}
          </div>
          {renderError()}
        </>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {userRole === 'owner' && (
              <OwnerKPIs recommendations={recommendations} analytics={analytics} evaluation={evaluation} />
            )}
            {userRole === 'manager' && (
              <ManagerKPIs recommendations={recommendations} analytics={analytics} />
            )}
            {userRole === 'sales' && (
              <SalesKPIs recommendations={recommendations} analytics={analytics} />
            )}
            {userRole === 'admin' && (
              <AdminKPIs analytics={analytics} evaluation={evaluation} />
            )}
          </div>

          {/* Filters & Controls */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-indigo-500" />
                  <span>Product Recommender Controls &amp; Personalization</span>
                </CardTitle>
                <CardDescription>Filter recommended products by B2B Client Account, Base SKU, Category, or Strategy</CardDescription>
              </div>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Customer Selector */}
              <div>
                <label htmlFor="customerSelect" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target B2B Account
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    id="customerSelect"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="">All Accounts</option>
                    {customerOptions.map((c) => {
                      const accountName = c.company_name || c.name || c.contact_name || c.external_customer_id || `Client #${String(c.id).slice(0, 6)}`;
                      return (
                        <option key={c.id} value={c.id}>
                          {accountName} {c.tier ? `(${c.tier})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Base SKU Selector */}
              <div>
                <label htmlFor="skuSelect" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Base Product SKU
                </label>
                <div className="relative">
                  <PackageCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    id="skuSelect"
                    value={selectedSku}
                    onChange={(e) => setSelectedSku(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="">All Base SKUs</option>
                    {productOptions.map((item) => {
                      const sku = item.sku || item.product?.sku || item.id;
                      const name = item.name || item.product?.name || 'Product';
                      return (
                        <option key={sku} value={sku}>
                          {sku} – {name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label htmlFor="categorySelect" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Category
                </label>
                <div className="relative">
                  <Layers className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    id="categorySelect"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Keyword Search */}
              <div>
                <label htmlFor="recSearch" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Search Catalog
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="recSearch"
                    type="text"
                    placeholder="Product name or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>
            </div>

            {/* Type filter + sort row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Strategy:</span>
                {strategyOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedStrategy(opt.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      selectedStrategy === opt.id
                        ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <SortAsc className="w-4 h-4 text-slate-400" />
                <label htmlFor="sortSelect" className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  Sort by:
                </label>
                <select
                  id="sortSelect"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="score">Fit Score (High to Low)</option>
                  <option value="price">Unit Price (High to Low)</option>
                  <option value="name">Product Name</option>
                  <option value="category">Category</option>
                  <option value="type">Recommendation Type</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Account Banner if customer selected */}
          {selectedCustomerId && (
            <Card className="bg-gradient-to-r from-indigo-50 to-slate-50 dark:from-indigo-950/30 dark:to-slate-900/40 border-indigo-200/80 dark:border-indigo-800/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Tailored Recommendations for {customerOptions.find((c) => c.id === selectedCustomerId)?.name || selectedCustomerId}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Showing tailored cross-sell & upsell products based on account tier & purchase history.
                    </p>
                  </div>
                </div>
                <Badge variant="info">
                  {customerOptions.find((c) => c.id === selectedCustomerId)?.tier || 'B2B Client'}
                </Badge>
              </div>
            </Card>
          )}

          {/* Main Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Recommended Products ({filteredItems.length})
              </h2>
              <Badge variant="neutral">{filteredItems.length} available</Badge>
            </div>

            {filteredItems.length === 0 ? (
              renderEmpty()
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredItems.map((rec) => (
                  <RecCard
                    key={rec.id}
                    rec={rec}
                    userRole={userRole}
                    onAddToQuote={handleOpenQuoteModal}
                    onCopyPitch={handleCopyPitch}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Business Owner Special Sections */}
          {userRole === 'owner' && filteredItems.length > 0 && (
            <>
              <CrossSellSection items={filteredItems} onAddToQuote={handleOpenQuoteModal} />
              <UpsellSection items={filteredItems} onAddToQuote={handleOpenQuoteModal} />
              <InsightsSection insights={insights} />
            </>
          )}

          {/* Store Manager Sections */}
          {userRole === 'manager' && filteredItems.length > 0 && (
            <>
              <CrossSellSection items={filteredItems} onAddToQuote={handleOpenQuoteModal} />
              <InsightsSection insights={insights} />
            </>
          )}

          {/* Sales Executive Sections */}
          {userRole === 'sales' && filteredItems.length > 0 && (
            <>
              <CrossSellSection items={filteredItems} onAddToQuote={handleOpenQuoteModal} />
              <UpsellSection items={filteredItems} onAddToQuote={handleOpenQuoteModal} />
            </>
          )}

          {/* Admin Sections */}
          {userRole === 'admin' && (
            <>
              <EvalMetricsSection evaluation={evaluation} />
              <InsightsSection insights={insights} />
            </>
          )}
        </>
      )}

      {/* Quote / Add-to-Invoice Modal */}
      <Modal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        title="Add Recommended Item to Invoice / Deal"
        maxWidth="max-w-md"
      >
        {selectedRecItem && (
          <form onSubmit={handleQuoteSubmit} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Target Product</span>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {selectedRecItem.product_name} ({selectedRecItem.sku})
              </p>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                <span>Unit Price: ₹{selectedRecItem.unit_price}</span>
                <Badge variant="success">{selectedRecItem.match_score}% Fit</Badge>
              </div>
            </div>

            <Input
              id="quoteQtyInput"
              label="Order Quantity"
              type="number"
              min="1"
              max={selectedRecItem.stock || 100}
              value={quoteQty}
              onChange={(e) => setQuoteQty(e.target.value)}
            />

            <div>
              <label htmlFor="stageSelect" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Sales Pipeline Stage
              </label>
              <select
                id="stageSelect"
                value={quoteStage}
                onChange={(e) => setQuoteStage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="New Prospect">New Prospect</option>
                <option value="Demo Scheduled">Demo Scheduled</option>
                <option value="Proposal Sent">Proposal Sent / Draft Invoice</option>
                <option value="Closing Stage">Closing Stage</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsQuoteModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={submittingQuote} icon={Check}>
                Confirm Add to Invoice
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
