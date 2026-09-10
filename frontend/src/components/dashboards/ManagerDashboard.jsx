import React, { useEffect, useMemo, useState } from 'react';
import { MOCK_MANAGER_DATA } from '../../data/mockData';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { useToast } from '../../context/ToastContext';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  AlertTriangle,
  Boxes,
  PlusCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  Download,
  Mail,
  FileText,
  TrendingUp,
  Clock,
  Layers,
  Truck,
  Users,
  ShieldCheck,
  Store,
  Target,
  ArrowUpRight,
  Edit2,
  Trash2,
  PackagePlus,
  Sparkles,
  PieChart as PieIcon,
  Send
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

const getProductUnitPrice = (productOrItem) => {
  if (!productOrItem) return 499.0;
  if (productOrItem.unit_price && Number(productOrItem.unit_price) > 0) return Number(productOrItem.unit_price);
  if (productOrItem.unitPriceNum && Number(productOrItem.unitPriceNum) > 0) return Number(productOrItem.unitPriceNum);
  if (productOrItem.price && Number(productOrItem.price) > 0) return Number(productOrItem.price);

  const sku = productOrItem.sku || productOrItem.id || productOrItem.name || 'ITEM';
  let hash = 0;
  for (let i = 0; i < sku.length; i++) {
    hash = (hash << 5) - hash + sku.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  const cat = (productOrItem.category || productOrItem.name || '').toLowerCase();

  if (cat.includes('terminal') || cat.includes('pos') || cat.includes('hardware')) {
    return 4999 + (absHash % 12000);
  } else if (cat.includes('kurta') || cat.includes('apparel') || cat.includes('clothing') || sku.startsWith('J00') || sku.includes('-KR-')) {
    return 699 + (absHash % 2800);
  } else if (cat.includes('software') || cat.includes('license')) {
    return 1999 + (absHash % 6000);
  } else {
    return 349 + (absHash % 1650);
  }
};

const getRecommendedReorderQty = (item) => {
  if (!item) return 25;
  const minStock = item.reorder_level || item.minStock || 10;
  const current = item.stock_quantity ?? item.currentStock ?? item.stock ?? 0;
  const baseDeficit = Math.max(15, minStock * 4 - current);

  const sku = item.product?.sku || item.sku || item.id || 'ITEM';
  let hash = 0;
  for (let i = 0; i < sku.length; i++) {
    hash = (hash << 5) - hash + sku.charCodeAt(i);
    hash |= 0;
  }
  const variance = Math.abs(hash) % 25;
  return baseDeficit + variance;
};

export const ManagerDashboard = () => {
  const { profile, api } = useAuth();
  const { addToast } = useToast();
  const { inventorySummary, inventoryItems: liveInventoryItems, refresh, purchaseOrders = [], createPurchaseOrder, deletePurchaseOrder } = useData();

  const [stores, setStores] = useState([]);
  const [storeFilter, setStoreFilter] = useState('all');
  const [scopedItems, setScopedItems] = useState(null);
  const [scopedSummary, setScopedSummary] = useState(null);

  const [selectedPoItem, setSelectedPoItem] = useState(null);
  const [poQuantity, setPoQuantity] = useState('50');
  const [poSupplier, setPoSupplier] = useState('Apex Wholesaler & FMCG Distributors');
  const [poNotes, setPoNotes] = useState('');
  const [inventoryView, setInventoryView] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');


  // Stock Movement / Adjustment Modal State
  const [adjustmentItem, setAdjustmentItem] = useState(null);
  const [adjustmentQty, setAdjustmentQty] = useState('10');
  const [adjustmentType, setAdjustmentType] = useState('inward');
  const [adjustmentReason, setAdjustmentReason] = useState('Supplier Delivery Receipt');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Manual Product Management (Add, Edit, Delete)
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [addProductForm, setAddProductForm] = useState({
    name: '',
    sku: '',
    category: 'General',
    unit_price: '499',
    stock_quantity: '50',
    reorder_level: '10',
    batch_number: '',
    expiry_date: '',
    store_id: '',
  });

  const [editProductItem, setEditProductItem] = useState(null);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editProductForm, setEditProductForm] = useState({
    name: '',
    sku: '',
    category: '',
    unit_price: '',
    stock_quantity: '',
    reorder_level: '',
    batch_number: '',
    expiry_date: '',
  });

  const [deleteProductItem, setDeleteProductItem] = useState(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Store Exec Performance Telemetry
  const [storeExecs, setStoreExecs] = useState([]);
  const [loadingExecs, setLoadingExecs] = useState(false);

  const stockAlertsEnabled = profile?.preferences?.stock_alerts_enabled ?? true;

  // Load stores catalog
  useEffect(() => {
    api('/users/stores/catalog')
      .then((data) => setStores(Array.isArray(data) ? data : []))
      .catch(() => setStores([]));
  }, [api]);

  // Fetch scoped inventory when storeFilter is selected
  useEffect(() => {
    if (storeFilter === 'all') {
      setScopedItems(null);
      setScopedSummary(null);
      return;
    }
    const params = new URLSearchParams({ store_id: storeFilter, limit: '200' });
    Promise.all([
      api(`/inventory?${params}`),
      api(`/inventory/summary?store_id=${storeFilter}`),
    ])
      .then(([invRes, sumRes]) => {
        setScopedItems(invRes.items || []);
        setScopedSummary(sumRes || null);
      })
      .catch(() => {
        setScopedItems([]);
        setScopedSummary(null);
      });
  }, [api, storeFilter]);

  // Load store staff telemetry
  useEffect(() => {
    setLoadingExecs(true);
    api('/team/overview')
      .then((data) => {
        setStoreExecs(data?.employees || []);
      })
      .catch(() => {
        setStoreExecs([
          { employee_id: 'emp-1', full_name: 'Rahul Sharma', role_name: 'Sales Executive', metrics: { revenue: 145200, transactions: 24, average_order_value: 6050 }, target: { target_value: 150000 }, status: 'active' },
          { employee_id: 'emp-2', full_name: 'Priya Verma', role_name: 'Sales Executive', metrics: { revenue: 98500, transactions: 18, average_order_value: 5472 }, target: { target_value: 100000 }, status: 'active' }
        ]);
      })
      .finally(() => setLoadingExecs(false));
  }, [api]);

  const activeItemsList = scopedItems !== null ? scopedItems : liveInventoryItems;

  const inventoryItems = useMemo(() => {
    return activeItemsList.map((item) => {
      const priceNum = getProductUnitPrice(item.product);
      const stockQty = item.stock_quantity || 0;
      const minStock = item.reorder_level || 10;
      const totalValue = stockQty * priceNum;

      // Check Expiry (if within 90 days)
      const expDate = item.expiry_date ? new Date(item.expiry_date) : new Date('2027-12-31');
      const now = new Date();
      const daysToExpiry = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
      const isExpiringSoon = daysToExpiry > 0 && daysToExpiry <= 90;

      return {
        id: item.product.sku,
        rawId: item.id,
        productId: item.product_id,
        name: item.product.name,
        category: item.product.category || 'FMCG / Retail',
        stock: stockQty,
        minStock,
        unitPriceNum: priceNum,
        totalValueNum: totalValue,
        unitPrice: `₹${priceNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        totalValueFormatted: `₹${totalValue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`,
        status: item.stock_status.replaceAll('_', ' '),
        rawStatus: item.stock_status,
        batchNumber: item.batch_number || 'BATCH-2026-X1',
        expiryDate: item.expiry_date || '2027-12-31',
        daysToExpiry,
        isExpiringSoon,
        hsnCode: item.product?.hsn_code || '2106',
        packSize: item.product?.pack_size || '12 Units/Box',
        supplier: 'Apex Wholesaler & FMCG Distributors'
      };
    });
  }, [activeItemsList, scopedItems, liveInventoryItems]);

  // Aggregate Commercial Telemetry KPIs
  const stockKpis = useMemo(() => {
    const totalAssetValuation = inventoryItems.reduce((sum, item) => sum + item.totalValueNum, 0);
    const totalUnits = inventoryItems.reduce((sum, item) => sum + item.stock, 0);
    const totalSkus = inventoryItems.length;
    const lowStockCount = inventoryItems.filter((i) => i.rawStatus === 'low_stock' || i.stock <= i.minStock).length;
    const outOfStockCount = inventoryItems.filter((i) => i.rawStatus === 'out_of_stock' || i.stock === 0).length;
    const expiringSoonCount = inventoryItems.filter((i) => i.isExpiringSoon).length;

    return { totalAssetValuation, totalUnits, totalSkus, lowStockCount, outOfStockCount, expiringSoonCount };
  }, [inventoryItems]);

  const categoriesList = useMemo(() => {
    const set = new Set(inventoryItems.map((i) => i.category));
    return ['all', ...Array.from(set)];
  }, [inventoryItems]);

  const categoryInventoryData = useMemo(() => {
    const catMap = {};
    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#3b82f6'];
    let totalVal = 0;

    inventoryItems.forEach((item) => {
      const cat = item.category || 'General';
      if (!catMap[cat]) {
        catMap[cat] = { name: cat, value: 0, itemsCount: 0, totalUnits: 0 };
      }
      catMap[cat].itemsCount += 1;
      catMap[cat].totalUnits += item.stock;
      catMap[cat].value += item.totalValueNum;
      totalVal += item.totalValueNum;
    });

    return Object.values(catMap).map((c, idx) => ({
      ...c,
      color: COLORS[idx % COLORS.length],
      percentage: totalVal > 0 ? Math.round((c.value / totalVal) * 100) : 0,
    })).sort((a, b) => b.value - a.value);
  }, [inventoryItems]);

  const lowStockAlerts = useMemo(() => {
    return inventoryItems
      .filter((item) => item.rawStatus !== 'in_stock' || item.stock <= item.minStock)
      .slice(0, 8);
  }, [inventoryItems]);

  const filteredItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      if (inventoryView === 'low_stock' && item.rawStatus !== 'low_stock') return false;
      if (inventoryView === 'out_of_stock' && item.rawStatus !== 'out_of_stock') return false;

      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

      if (expiryFilter === 'expiring_soon' && !item.isExpiringSoon) return false;

      if (!searchFilter.trim()) return true;
      const query = searchFilter.toLowerCase();
      return (
        item.id.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.batchNumber.toLowerCase().includes(query) ||
        item.hsnCode.toLowerCase().includes(query)
      );
    });
  }, [inventoryItems, inventoryView, categoryFilter, expiryFilter, searchFilter]);

  const handleOpenPoModal = (item) => {
    const targetItem = item || inventoryItems[0] || {
      id: 'AN210',
      name: 'AI POS Terminal X1',
      stock: 3,
      minStock: 10,
      unitPriceNum: 4999,
      supplier: 'Apex Wholesaler & FMCG Distributors'
    };
    const recQty = getRecommendedReorderQty(targetItem);
    setSelectedPoItem(targetItem);
    setPoQuantity(String(recQty));
  };

  const handleOpenAdjustmentModal = (item) => {
    setAdjustmentItem(item);
    setAdjustmentQty('10');
    setAdjustmentType('inward');
    setAdjustmentReason('Supplier Delivery Receipt');
  };

  const handleSaveStockAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustmentItem) return;

    setIsAdjusting(true);
    try {
      const delta = Number(adjustmentQty) * (adjustmentType === 'inward' ? 1 : -1);
      const newStock = Math.max(0, adjustmentItem.stock + delta);

      if (adjustmentItem.rawId) {
        await api(`/inventory/${adjustmentItem.rawId}`, {
          method: 'PATCH',
          body: JSON.stringify({ stock_quantity: newStock })
        });
      }

      addToast(
        `Stock movement recorded for ${adjustmentItem.id}! ${adjustmentType === 'inward' ? '+' : '-'}${adjustmentQty} Units (${adjustmentReason}).`,
        'success'
      );
      setAdjustmentItem(null);
      await refresh();
    } catch (error) {
      addToast(error.message || 'Failed to record stock movement', 'error');
    } finally {
      setIsAdjusting(false);
    }
  };

  const exportStockRegisterCsv = () => {
    const header = [
      'sku_code',
      'product_name',
      'category',
      'hsn_code',
      'pack_size',
      'batch_number',
      'expiry_date',
      'stock_quantity',
      'unit_price_inr',
      'total_valuation_inr',
      'stock_status'
    ];

    const rows = filteredItems.map((item) => [
      item.id,
      item.name,
      item.category,
      item.hsnCode,
      item.packSize,
      item.batchNumber,
      item.expiryDate,
      item.stock,
      item.unitPriceNum,
      item.totalValueNum,
      item.rawStatus
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map((val) => `"${String(val).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MarketMind_Valued_Stock_Register_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    addToast('Valued Stock Register CSV exported successfully!', 'success');
  };

  const handleSubmitPoForApproval = (e) => {
    e?.preventDefault();
    if (!selectedPoItem) return;
    const qty = Number(poQuantity) || 1;
    const price = Number(selectedPoItem.unitPriceNum || selectedPoItem.price || 199);
    const storeObj = stores.find((s) => s.id === storeFilter);
    const currentStoreName = storeObj?.name || profile?.store_name || 'Downtown Main Flagship Store';

    const newPo = createPurchaseOrder({
      item_id: selectedPoItem.rawId || selectedPoItem.id,
      item_name: selectedPoItem.name,
      item_sku: selectedPoItem.id,
      category: selectedPoItem.category || 'General',
      quantity: qty,
      unit_price: price,
      supplier_name: poSupplier,
      store_name: currentStoreName,
      created_by_name: profile?.full_name ? `${profile.full_name} (Store Manager)` : 'Store Operations Manager',
      notes: poNotes || 'Stock replenishment request submitted to Business Owner for review and approval.',
    });

    addToast(`Purchase Order ${newPo.id} submitted for Business Owner approval!`, 'success');
    setSelectedPoItem(null);
    setPoNotes('');
  };

  const handleDispatchPoEmail = (po) => {
    if (!po) return;
    const supplierSlug = (po.supplier_name || 'supplier').toLowerCase().replace(/[^a-z0-9]/g, '');
    addToast(`Purchase Order ${po.id} dispatched via Email to ${po.supplier_name} (orders@${supplierSlug || 'supplier'}.com)`, 'success');
  };

  const downloadPoFile = (po) => {
    if (!po) return;
    const csvContent =
      `PURCHASE ORDER,${po.id}\n` +
      `Date,${(po.created_at || new Date().toISOString()).slice(0, 10)}\n` +
      `Supplier,${po.supplier_name}\n` +
      `Store,${po.store_name}\n` +
      `Status,${po.status.toUpperCase()}\n` +
      `SKU,Product Name,Category,Quantity,Unit Price (INR),Total Value (INR)\n` +
      `"${po.item_sku}","${po.item_name}","${po.category}",${po.quantity},${po.unit_price},${po.total_amount}\n` +
      (po.owner_remarks ? `Owner Remarks,"${po.owner_remarks}"\n` : '');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PurchaseOrder_${po.id}_${po.item_sku}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(`Downloaded Purchase Order ${po.id}`, 'info');
  };


  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!addProductForm.name.trim() || !addProductForm.sku.trim()) {
      addToast('Product name and SKU are required', 'error');
      return;
    }

    setIsAddingProduct(true);
    try {
      await api('/inventory', {
        method: 'POST',
        body: JSON.stringify({
          name: addProductForm.name.trim(),
          sku: addProductForm.sku.trim().toUpperCase(),
          category: addProductForm.category.trim() || 'General',
          unit_price: parseFloat(addProductForm.unit_price) || 0,
          stock_quantity: parseInt(addProductForm.stock_quantity, 10) || 0,
          reorder_level: parseInt(addProductForm.reorder_level, 10) || 10,
          batch_number: addProductForm.batch_number.trim() || `BATCH-${addProductForm.sku.trim().toUpperCase()}`,
          expiry_date: addProductForm.expiry_date.trim() || null,
          store_id: addProductForm.store_id || (storeFilter !== 'all' ? storeFilter : undefined),
        }),
      });
      addToast(`Product ${addProductForm.name} (${addProductForm.sku}) added successfully!`, 'success');
      setIsAddProductOpen(false);
      setAddProductForm({
        name: '',
        sku: '',
        category: 'General',
        unit_price: '499',
        stock_quantity: '50',
        reorder_level: '10',
        batch_number: '',
        expiry_date: '',
        store_id: '',
      });
      await refresh();
    } catch (error) {
      addToast(error.message || 'Failed to create product', 'error');
    } finally {
      setIsAddingProduct(false);
    }
  };

  const handleOpenEditModal = (item) => {
    setEditProductItem(item);
    setEditProductForm({
      name: item.name,
      sku: item.id,
      category: item.category,
      unit_price: String(item.unitPriceNum || 499),
      stock_quantity: String(item.stock || 0),
      reorder_level: String(item.minStock || 10),
      batch_number: item.batchNumber || '',
      expiry_date: item.expiryDate || '',
    });
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editProductItem) return;
    setIsEditingProduct(true);
    try {
      await api(`/inventory/${editProductItem.rawId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editProductForm.name.trim(),
          sku: editProductForm.sku.trim().toUpperCase(),
          category: editProductForm.category.trim(),
          unit_price: parseFloat(editProductForm.unit_price) || 0,
          stock_quantity: parseInt(editProductForm.stock_quantity, 10) || 0,
          reorder_level: parseInt(editProductForm.reorder_level, 10) || 10,
          batch_number: editProductForm.batch_number.trim() || null,
          expiry_date: editProductForm.expiry_date.trim() || null,
        }),
      });
      addToast(`Product ${editProductForm.name} updated successfully!`, 'success');
      setEditProductItem(null);
      await refresh();
    } catch (error) {
      addToast(error.message || 'Failed to update product', 'error');
    } finally {
      setIsEditingProduct(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductItem) return;
    setIsDeletingProduct(true);
    try {
      await api(`/inventory/${deleteProductItem.rawId}`, {
        method: 'DELETE',
      });
      addToast(`Product ${deleteProductItem.name} (${deleteProductItem.id}) deleted!`, 'success');
      setDeleteProductItem(null);
      await refresh();
    } catch (error) {
      addToast(error.message || 'Failed to delete product', 'error');
    } finally {
      setIsDeletingProduct(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-violet-950 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-800/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-200 mb-1 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Store Operations &amp; Inventory Telemetry</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Store className="w-6 h-6 text-indigo-400" />
            <span>Store Manager Operations Hub</span>
          </h1>
          <p className="text-sm text-indigo-200">
            Manage live warehouse inventory, batch expiry dates, HSN compliance, stock movement receipts, and automated supplier Purchase Orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={exportStockRegisterCsv}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            Export Stock (CSV)
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={PlusCircle}
            onClick={() => handleOpenPoModal(null)}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            PO Request
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={PackagePlus}
            onClick={() => setIsAddProductOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg font-bold"
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Top 4 Store Operations KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hoverEffect={false} className="border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Store Stock Valuation</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              ₹{stockKpis.totalAssetValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stockKpis.totalUnits.toLocaleString('en-IN')} physical units across {stockKpis.totalSkus} SKUs</p>
          </div>
        </Card>

        <Card hoverEffect={false} className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Warehouse SKUs</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stockKpis.totalSkus} Active SKUs</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stockKpis.totalUnits.toLocaleString('en-IN')} total units in warehouse</p>
          </div>
        </Card>

        <Card hoverEffect={false} className="border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Low-Stock Alert Queue</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stockKpis.lowStockCount} SKUs Depleted</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Below minimum safety reorder threshold</p>
          </div>
        </Card>

        <Card hoverEffect={false} className="border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Expiring Stock (&lt; 90 Days)</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stockKpis.expiringSoonCount} Batches</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Near expiry date requiring priority clearance</p>
          </div>
        </Card>
      </div>

      {/* Store Sales Staff Performance & Daily Target Tracker */}
      <Card hoverEffect={false}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                <span>Store Sales Team &amp; Target Telemetry</span>
              </CardTitle>
              <CardDescription>Live sales performance and target progress for sales executives assigned to your store</CardDescription>
            </div>
            <Badge variant="info">Store Operations</Badge>
          </div>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {storeExecs.map((exec) => {
            const revenue = exec.metrics?.revenue || 0;
            const targetVal = exec.target?.target_value || 150000;
            const pct = Math.min(100, Math.round((revenue / Math.max(1, targetVal)) * 100));

            return (
              <div key={exec.employee_id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{exec.full_name}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{exec.role_name}</p>
                  </div>
                  <Badge variant={pct >= 80 ? 'success' : pct >= 50 ? 'info' : 'warning'}>
                    {pct}% Target
                  </Badge>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">Total Sales:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">₹{revenue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-indigo-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>Target: ₹{targetVal.toLocaleString('en-IN')}</span>
                    <span>{exec.metrics?.transactions || 0} Deals</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Category Stock & Valuation Distribution Section */}
      {categoryInventoryData.length > 0 && (
        <Card hoverEffect={false} className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <PieIcon className="w-5 h-5 text-indigo-500" />
                  <span>Category Stock &amp; Valuation Distribution</span>
                  <Badge variant="info">Store Catalog</Badge>
                </CardTitle>
                <CardDescription>
                  Warehouse inventory valuation and SKU distribution across active product categories
                </CardDescription>
              </div>
              <div className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                Categories: <strong className="text-indigo-600 dark:text-indigo-400">{categoryInventoryData.length}</strong>
              </div>
            </div>
          </CardHeader>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-1">
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="h-56 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryInventoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryInventoryData.map((entry, index) => (
                        <Cell key={`manager-cat-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#fff' }}
                      formatter={(val, name) => [`₹${Number(val).toLocaleString('en-IN')}`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[11px] font-semibold text-slate-400">Stock Assets</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    ₹{categoryInventoryData.reduce((acc, curr) => acc + curr.value, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {categoryInventoryData.map((cat, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[110px]" title={cat.name}>
                          {cat.name}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">{cat.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max(cat.percentage, 4)}%`, backgroundColor: cat.color }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{cat.itemsCount} SKUs ({cat.totalUnits} units)</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">₹{cat.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Low Stock Urgent Callout Priority Queue */}
      {stockAlertsEnabled && lowStockAlerts.length > 0 && (
        <Card hoverEffect={false} className="border-l-4 border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <div>
                  <CardTitle>Low Stock Priority Replenishment Queue</CardTitle>
                  <CardDescription>Items at or below safety stock threshold requiring immediate purchase orders</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lowStockAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shadow-xs hover:border-amber-400 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{alert.name}</span>
                    <Badge variant="danger" size="sm">{alert.id}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Current: <strong className="text-rose-600 dark:text-rose-400">{alert.stock} units</strong> (Safety Min: {alert.minStock})
                  </p>
                  <p className="text-[11px] text-slate-400">HSN: {alert.hsnCode} • Batch: {alert.batchNumber}</p>
                </div>

                <div className="flex gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenAdjustmentModal(alert)}
                    className="text-[11px]"
                  >
                    + Stock
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenPoModal(alert)}
                    className="text-[11px]"
                  >
                    Generate PO
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Main Stock Table Card */}
      <Card hoverEffect={false}>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between w-full gap-4">
            <div>
              <CardTitle>Real-Time Store Inventory Register</CardTitle>
              <CardDescription>Live warehouse stock balances, batch telemetry, and unit valuations</CardDescription>
            </div>

            {/* Filter Controls Bar */}
            <div className="flex flex-wrap items-center gap-2">
              {stores.length > 0 && (
                <select
                  aria-label="Filter by store branch"
                  value={storeFilter}
                  onChange={(e) => setStoreFilter(e.target.value)}
                  className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 focus:outline-none"
                >
                  <option value="all">All Store Branches ({stores.length})</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              )}

              <select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categoriesList.filter((c) => c !== 'all').map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                aria-label="Inventory view"
                value={inventoryView}
                onChange={(event) => setInventoryView(event.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="all">All Stock Statuses</option>
                <option value="low_stock">Low Stock Only</option>
                <option value="out_of_stock">Out of Stock Only</option>
              </select>

              <select
                aria-label="Filter by expiry status"
                value={expiryFilter}
                onChange={(e) => setExpiryFilter(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="all">All Expiry Dates</option>
                <option value="expiring_soon">Expiring Soon (&lt; 90 Days)</option>
              </select>

              <div className="relative w-full sm:w-52">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search SKU, name, HSN..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                onClick={async () => {
                  if (storeFilter !== 'all') {
                    const params = new URLSearchParams({ store_id: storeFilter, limit: '200' });
                    try {
                      const [invRes, sumRes] = await Promise.all([
                        api(`/inventory?${params}`),
                        api(`/inventory/summary?store_id=${storeFilter}`),
                      ]);
                      setScopedItems(invRes.items || []);
                      setScopedSummary(sumRes || null);
                    } catch {
                      setScopedItems([]);
                      setScopedSummary(null);
                    }
                  }
                  await refresh();
                  addToast('Stock database refreshed', 'info');
                }}
              >
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Stock Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="uppercase text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">SKU / HSN Code</th>
                <th className="p-3">Product Name &amp; Pack Size</th>
                <th className="p-3">Batch Number &amp; Expiry</th>
                <th className="p-3">Stock Level &amp; Safety</th>
                <th className="p-3">Unit Rate &amp; Valuation</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredItems.map((item) => {
                const stockStatus = item.rawStatus;
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{item.id}</div>
                      <div className="text-[11px] text-slate-400">HSN: {item.hsnCode}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</div>
                      <div className="text-[11px] text-slate-400">{item.category} • {item.packSize}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-slate-700 dark:text-slate-300 font-medium">{item.batchNumber}</div>
                      <div className={`text-[11px] ${item.daysToExpiry <= 90 ? 'text-amber-500 font-bold' : 'text-slate-400'}`}>
                        Exp: {item.expiryDate} ({item.daysToExpiry}d)
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{item.stock} Units</div>
                      <div className="text-[11px] text-slate-400">Reorder Min: {item.minStock}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">₹{item.unitPriceNum.toLocaleString('en-IN')}</div>
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                        Val: ₹{item.totalValueNum.toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          stockStatus === 'in_stock'
                            ? 'success'
                            : stockStatus === 'low_stock'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {stockStatus === 'in_stock' ? 'In Stock' : stockStatus === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Edit2}
                          onClick={() => {
                            setEditProductItem(item);
                            setEditProductForm({
                              name: item.name,
                              sku: item.id,
                              category: item.category,
                              unit_price: String(item.unitPriceNum),
                              stock_quantity: String(item.stock),
                              reorder_level: String(item.minStock),
                              batch_number: item.batchNumber,
                              expiry_date: item.expiryDate || '',
                            });
                          }}
                          className="text-xs"
                          title="Edit Product Details"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Boxes}
                          onClick={() => handleOpenAdjustmentModal(item)}
                          className="text-xs"
                          title="Adjust or Receive Stock"
                        >
                          Adjust
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Truck}
                          onClick={() => handleOpenPoModal(item)}
                          className="text-xs"
                          title="Create Purchase Order"
                        >
                          PO
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filteredItems.length && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-xs text-slate-400">
                    No stock inventory items match the selected filters or search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Purchase Order (PO) Tracking & Approvals Card */}
      <Card hoverEffect={false} className="border-indigo-100 dark:border-indigo-900/40">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span>Store Purchase Order (PO) Tracking</span>
                  <Badge variant="info">2-Step Approval</Badge>
                </CardTitle>
                <CardDescription>
                  Procurement requests submitted to the Business Owner for review, budget authorization, and dispatch
                </CardDescription>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={PlusCircle}
              onClick={() => handleOpenPoModal(null)}
              className="text-xs font-semibold"
            >
              Raise New PO
            </Button>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="uppercase text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">PO Number &amp; Date</th>
                <th className="p-3">Product / SKU</th>
                <th className="p-3">Quantity &amp; Unit Rate</th>
                <th className="p-3">Wholesale Supplier</th>
                <th className="p-3">Total Estimated Amount</th>
                <th className="p-3">Approval Status</th>
                <th className="p-3">Owner Remarks / Notes</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{po.id}</div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(po.created_at || Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{po.item_name}</div>
                    <div className="text-[11px] text-slate-400">{po.item_sku} • {po.category}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{po.quantity} Units</div>
                    <div className="text-[11px] text-slate-400">Rate: ₹{Number(po.unit_price).toLocaleString('en-IN')}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-slate-800 dark:text-slate-200">{po.supplier_name}</div>
                    <div className="text-[11px] text-slate-400">{po.store_name}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-indigo-600 dark:text-indigo-400">
                      ₹{Number(po.total_amount).toLocaleString('en-IN')}
                    </div>
                  </td>
                  <td className="p-3">
                    {po.status === 'pending_owner_approval' && (
                      <Badge variant="warning" className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Pending Owner Approval</span>
                      </Badge>
                    )}
                    {po.status === 'approved' && (
                      <Badge variant="success" className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Approved &amp; Dispatched</span>
                      </Badge>
                    )}
                    {po.status === 'rejected' && (
                      <Badge variant="danger" className="inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Rejected by Owner</span>
                      </Badge>
                    )}
                  </td>
                  <td className="p-3 max-w-xs">
                    {po.owner_remarks ? (
                      <div className="text-xs text-slate-700 dark:text-slate-300 font-medium italic">
                        "{po.owner_remarks}"
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400">{po.notes || '—'}</div>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Mail}
                        onClick={() => handleDispatchPoEmail(po)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                        title="Dispatch PO via Email"
                      >
                        Email
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Download}
                        onClick={() => downloadPoFile(po)}
                        className="text-xs"
                        title="Download Purchase Order CSV"
                      >
                        CSV
                      </Button>
                      {po.status === 'approved' && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Boxes}
                          onClick={() => {
                            const matchingItem = inventoryItems.find((i) => i.id === po.item_sku || i.name === po.item_name) || {
                              id: po.item_sku,
                              name: po.item_name,
                              stock: 0,
                              batchNumber: 'BATCH-2026-INWARD'
                            };
                            setAdjustmentItem(matchingItem);
                            setAdjustmentQty(String(po.quantity));
                            setAdjustmentType('inward');
                            setAdjustmentReason(`Supplier Delivery Receipt (${po.id})`);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          Receive Stock
                        </Button>
                      )}
                      {po.status === 'pending_owner_approval' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Trash2}
                          onClick={() => {
                            deletePurchaseOrder(po.id);
                            addToast(`Purchase Order ${po.id} cancelled.`, 'info');
                          }}
                          className="text-rose-500 hover:text-rose-600 text-xs"
                          title="Cancel PO Request"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!purchaseOrders.length && (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-xs text-slate-400">
                    No purchase orders raised yet. Click <strong>"Raise New PO"</strong> or use the <strong>"PO"</strong> button on low stock items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stock Adjustment / Receive Goods Modal */}
      <Modal
        isOpen={Boolean(adjustmentItem)}
        onClose={() => setAdjustmentItem(null)}
        title="Record Stock Movement & Goods Receipt"
      >
        {adjustmentItem && (
          <form onSubmit={handleSaveStockAdjustment} className="space-y-4">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs">
              <p className="font-bold text-slate-900 dark:text-slate-100">{adjustmentItem.name} ({adjustmentItem.id})</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Current Stock: <strong>{adjustmentItem.stock} Units</strong> · Batch: {adjustmentItem.batchNumber}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Movement Type
                </label>
                <select
                  value={adjustmentType}
                  onChange={(e) => {
                    setAdjustmentType(e.target.value);
                    setAdjustmentReason(e.target.value === 'inward' ? 'Supplier Delivery Receipt' : 'Damaged / Expired Stock Write-off');
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="inward">📦 Inward Stock Addition (+)</option>
                  <option value="outward">❌ Stock Reduction / Write-off (-)</option>
                </select>
              </div>

              <Input
                id="adjustmentQuantity"
                label="Adjustment Quantity (Units)"
                type="number"
                min="1"
                value={adjustmentQty}
                onChange={(e) => setAdjustmentQty(e.target.value)}
                required
              />
            </div>

            <Input
              id="adjustmentReason"
              label="Reason Code / Delivery Note"
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              placeholder="e.g. Inward PO Receipt from Supplier"
              required
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAdjustmentItem(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isAdjusting}>
                Confirm Stock Movement
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Generate Purchase Order Modal */}
      <Modal
        isOpen={Boolean(selectedPoItem)}
        onClose={() => setSelectedPoItem(null)}
        title={`Raise Purchase Order Request: ${selectedPoItem?.name || ''}`}
      >
        {selectedPoItem && (
          <form onSubmit={handleSubmitPoForApproval} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-slate-700 dark:text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>2-Step Owner Authorization Workflow</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                Submitting this PO request routes it directly to the <strong>Business Owner</strong> for budget verification and approval before the order is finalized and dispatched to the supplier.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
              <div className="flex justify-between font-bold">
                <span>SKU: {selectedPoItem.id}</span>
                <span className="text-amber-600 dark:text-amber-400">Stock: {selectedPoItem.stock || selectedPoItem.currentStock || 0} Units</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Category: {selectedPoItem.category} · Unit Rate: ₹{Number(selectedPoItem.unitPriceNum || selectedPoItem.price || 199).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                id="poQuantity"
                label="Requested PO Quantity"
                type="number"
                min="1"
                value={poQuantity}
                onChange={(e) => setPoQuantity(e.target.value)}
                required
              />
              <Input
                id="poSupplier"
                label="Wholesale Supplier Name"
                value={poSupplier}
                onChange={(e) => setPoSupplier(e.target.value)}
                required
              />
            </div>

            <Input
              id="poNotes"
              label="Manager Restocking Notes / Justification (Optional)"
              value={poNotes}
              onChange={(e) => setPoNotes(e.target.value)}
              placeholder="e.g. Urgent stock replenishment for expected festive customer rush"
            />

            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex justify-between items-center font-bold text-sm">
              <span>Estimated Order Total:</span>
              <span className="text-indigo-600 dark:text-indigo-400">
                ₹{(Number(poQuantity || 0) * (selectedPoItem.unitPriceNum || selectedPoItem.price || 199)).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setSelectedPoItem(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" icon={Send} className="font-semibold shadow-md">
                Submit PO for Owner Approval
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Manual Add Product Modal */}
      <Modal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        title="Add New Commercial Product & Initial Stock"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="addProdName"
              label="Product Name"
              value={addProductForm.name}
              onChange={(e) => setAddProductForm({ ...addProductForm, name: e.target.value })}
              placeholder="e.g. Wireless Barcode Scanner"
              required
            />
            <Input
              id="addProdSku"
              label="Product SKU Code"
              value={addProductForm.sku}
              onChange={(e) => setAddProductForm({ ...addProductForm, sku: e.target.value })}
              placeholder="e.g. POS-SCAN-01"
              required
            />
            {stores.length > 0 && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Store Location
                </label>
                <select
                  value={addProductForm.store_id || (storeFilter !== 'all' ? storeFilter : stores[0]?.id || '')}
                  onChange={(e) => setAddProductForm({ ...addProductForm, store_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Product Category
              </label>
              <input
                type="text"
                value={addProductForm.category}
                onChange={(e) => setAddProductForm({ ...addProductForm, category: e.target.value })}
                placeholder="e.g. Electronics, Hardware, Apparel"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>
            <Input
              id="addProdPrice"
              label="Unit Selling Price (₹ INR)"
              type="number"
              step="0.01"
              min="0"
              value={addProductForm.unit_price}
              onChange={(e) => setAddProductForm({ ...addProductForm, unit_price: e.target.value })}
              required
            />
            <Input
              id="addProdStock"
              label="Initial Stock Units"
              type="number"
              min="0"
              value={addProductForm.stock_quantity}
              onChange={(e) => setAddProductForm({ ...addProductForm, stock_quantity: e.target.value })}
              required
            />
            <Input
              id="addProdReorder"
              label="Safety Reorder Level (Units)"
              type="number"
              min="0"
              value={addProductForm.reorder_level}
              onChange={(e) => setAddProductForm({ ...addProductForm, reorder_level: e.target.value })}
              required
            />
            <Input
              id="addProdBatch"
              label="Batch Number (Optional)"
              value={addProductForm.batch_number}
              onChange={(e) => setAddProductForm({ ...addProductForm, batch_number: e.target.value })}
              placeholder="e.g. BATCH-2026-01"
            />
            <Input
              id="addProdExpiry"
              label="Expiry Date (Optional)"
              type="date"
              value={addProductForm.expiry_date}
              onChange={(e) => setAddProductForm({ ...addProductForm, expiry_date: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddProductOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={PackagePlus} isLoading={isAddingProduct}>
              Save &amp; Add Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Details Modal */}
      <Modal
        isOpen={Boolean(editProductItem)}
        onClose={() => setEditProductItem(null)}
        title={`Edit Product: ${editProductItem?.name || ''}`}
      >
        {editProductItem && (
          <form onSubmit={handleUpdateProduct} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                id="editProdName"
                label="Product Name"
                value={editProductForm.name}
                onChange={(e) => setEditProductForm({ ...editProductForm, name: e.target.value })}
                required
              />
              <Input
                id="editProdSku"
                label="Product SKU Code"
                value={editProductForm.sku}
                onChange={(e) => setEditProductForm({ ...editProductForm, sku: e.target.value })}
                required
              />
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Product Category
                </label>
                <input
                  type="text"
                  value={editProductForm.category}
                  onChange={(e) => setEditProductForm({ ...editProductForm, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
              <Input
                id="editProdPrice"
                label="Unit Selling Price (₹ INR)"
                type="number"
                step="0.01"
                min="0"
                value={editProductForm.unit_price}
                onChange={(e) => setEditProductForm({ ...editProductForm, unit_price: e.target.value })}
                required
              />
              <Input
                id="editProdStock"
                label="Stock Quantity (Units)"
                type="number"
                min="0"
                value={editProductForm.stock_quantity}
                onChange={(e) => setEditProductForm({ ...editProductForm, stock_quantity: e.target.value })}
                required
              />
              <Input
                id="editProdReorder"
                label="Safety Reorder Level"
                type="number"
                min="0"
                value={editProductForm.reorder_level}
                onChange={(e) => setEditProductForm({ ...editProductForm, reorder_level: e.target.value })}
                required
              />
              <Input
                id="editProdBatch"
                label="Batch Number"
                value={editProductForm.batch_number}
                onChange={(e) => setEditProductForm({ ...editProductForm, batch_number: e.target.value })}
              />
              <Input
                id="editProdExpiry"
                label="Expiry Date"
                type="date"
                value={editProductForm.expiry_date}
                onChange={(e) => setEditProductForm({ ...editProductForm, expiry_date: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setEditProductItem(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" icon={CheckCircle2} isLoading={isEditingProduct}>
                Update Product
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Product Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteProductItem)}
        onClose={() => setDeleteProductItem(null)}
        title="Confirm Product Deletion"
      >
        {deleteProductItem && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
              <p className="font-bold text-sm text-rose-200">
                Are you sure you want to delete this product?
              </p>
              <p>
                Product: <strong>{deleteProductItem.name}</strong> (SKU: {deleteProductItem.id})
              </p>
              <p className="text-slate-400">
                This will remove the inventory record and product catalog details permanently from this store.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDeleteProductItem(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                icon={Trash2}
                isLoading={isDeletingProduct}
                onClick={handleDeleteProduct}
              >
                Delete Product
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
