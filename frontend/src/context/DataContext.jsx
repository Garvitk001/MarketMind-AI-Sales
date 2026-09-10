import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);
const DEFAULT_SALES_DATE_RANGE = {
  from: '',
  to: ''
};

const moduleCodes = (access) => new Set((access?.modules || []).map((module) => module.code));

export const DataProvider = ({ children }) => {
  const { isAuthenticated, access, api, profile, currentRole } = useAuth();
  const [salesDateRange, setSalesDateRange] = useState(DEFAULT_SALES_DATE_RANGE);
  const [data, setData] = useState({
    salesDashboard: null,
    salesTransactions: [],
    inventorySummary: null,
    inventoryItems: [],
    customerSummary: null,
    customers: [],
    customerSegmentSummary: null,
    customerSegments: [],
    users: [],
    apiError: null,
    isLoading: false
  });

  const refresh = async (requestedRange = salesDateRange) => {
    if (!isAuthenticated || !access) {
      setData({
        salesDashboard: null,
        salesTransactions: [],
        inventorySummary: null,
        inventoryItems: [],
        customerSummary: null,
        customers: [],
        customerSegmentSummary: null,
        customerSegments: [],
        users: [],
        apiError: null,
        isLoading: false
      });
      return;
    }

    setData((current) => ({
      salesDashboard: null,
      salesTransactions: [],
      inventorySummary: null,
      inventoryItems: [],
      customerSummary: null,
      customers: [],
      customerSegmentSummary: null,
      customerSegments: [],
      users: [],
      isLoading: true,
      apiError: null
    }));

    const modules = moduleCodes(access);
    const requests = [];
    const assign = {
      salesDashboard: null,
      salesTransactions: [],
      inventorySummary: null,
      inventoryItems: [],
      customerSummary: null,
      customers: [],
      customerSegmentSummary: null,
      customerSegments: [],
      users: []
    };

    if (modules.has('sales')) {
      const hasManualRange = requestedRange?.from && requestedRange?.to;
      const preferenceDays = currentRole?.id === 'owner'
        ? profile?.role_preferences?.default_period || '30'
        : currentRole?.id === 'sales'
          ? profile?.role_preferences?.sales_period || '30'
          : '30';
      const params = hasManualRange
        ? new URLSearchParams({ date_from: `${requestedRange.from}T00:00:00Z`, date_to: `${requestedRange.to}T23:59:59Z` })
        : new URLSearchParams({ days: preferenceDays });
      requests.push(
        api(`/dashboard/sales?${params}`)
          .then((value) => {
            assign.salesDashboard = value;
            if (!hasManualRange && value?.date_from && value?.date_to) {
              setSalesDateRange({ from: value.date_from.slice(0, 10), to: value.date_to.slice(0, 10) });
            }
          })
          .catch(() => {
            assign.salesDashboard = null;
          })
      );
      requests.push(
        api('/sales/transactions?limit=200')
          .then((value) => { assign.salesTransactions = value.items || []; })
          .catch(() => { assign.salesTransactions = []; })
      );
    }
    if (modules.has('inventory')) {
      requests.push(
        api('/inventory/summary')
          .then((value) => { assign.inventorySummary = value; })
          .catch(() => { assign.inventorySummary = null; })
      );
      requests.push(
        api('/inventory?limit=200')
          .then((value) => { assign.inventoryItems = value.items || []; })
          .catch(() => { assign.inventoryItems = []; })
      );
    }
    if (modules.has('customer_segments')) {
      const segmentModule = (access.modules || []).find((module) => module.code === 'customer_segments');
      requests.push(
        api('/customers/summary')
          .then((value) => { assign.customerSummary = value; })
          .catch(() => { assign.customerSummary = null; })
      );
      requests.push(
        api('/customer-segments/summary')
          .then((value) => { assign.customerSegmentSummary = value; })
          .catch(() => { assign.customerSegmentSummary = null; })
      );
      if (segmentModule?.access !== 'summary') {
        requests.push(
          api('/customers?limit=200')
            .then((value) => { assign.customers = value.items || []; })
            .catch(() => { assign.customers = []; })
        );
        requests.push(
          api('/customer-segments?limit=200')
            .then((value) => { assign.customerSegments = value.items || []; })
            .catch(() => { assign.customerSegments = []; })
        );
      }
    }
    if (modules.has('team_management')) {
      requests.push(
        api('/users?limit=200')
          .then((value) => { assign.users = value.items || value || []; })
          .catch(() => { assign.users = []; })
      );
    }

    const results = await Promise.allSettled(requests);
    const rejected = results.find((result) => result.status === 'rejected');
    setData((current) => ({
      ...current,
      ...assign,
      isLoading: false,
      apiError: rejected ? rejected.reason.message : null
    }));
  };

  useEffect(() => {
    setSalesDateRange(DEFAULT_SALES_DATE_RANGE);
    refresh(DEFAULT_SALES_DATE_RANGE);
    // Refresh whenever authentication status, role, tenant, or profile preferences change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, access?.role, profile?.tenant_id, profile?.id, profile?.email, profile?.role_preferences?.default_period, profile?.role_preferences?.sales_period]);

  const applySalesDateRange = async (nextRange) => {
    setSalesDateRange(nextRange);
    await refresh(nextRange);
  };

  const [purchaseOrders, setPurchaseOrders] = useState(() => {
    try {
      const stored = localStorage.getItem('marketmind_purchase_orders');
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return [
      {
        id: 'PO-2026-1082',
        item_id: 'PRD-001',
        item_name: 'Smart POS Terminal Android',
        item_sku: 'POS-AND-99',
        category: 'POS & Hardware',
        quantity: 35,
        original_quantity: 35,
        unit_price: 6499,
        supplier_name: 'Rajdhani Tech & Hardware Logistics',
        total_amount: 227465,
        status: 'pending_owner_approval',
        store_name: 'Downtown Main Flagship Store',
        created_by_name: 'Rohan Sharma (Store Manager)',
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
        notes: 'Urgent restocking needed for weekend rush.',
        owner_remarks: '',
      },
      {
        id: 'PO-2026-1079',
        item_id: 'PRD-004',
        item_name: 'Thermal Receipt Rolls (Box of 50)',
        item_sku: 'ACC-THM-50',
        category: 'Accessories',
        quantity: 100,
        original_quantity: 120,
        unit_price: 850,
        supplier_name: 'Apex Wholesaler & FMCG Distributors',
        total_amount: 85000,
        status: 'approved',
        store_name: 'Downtown Main Flagship Store',
        created_by_name: 'Rohan Sharma (Store Manager)',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        approved_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        notes: 'Monthly billing roll replenishment.',
        owner_remarks: 'Approved with adjusted 100 boxes quota.',
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('marketmind_purchase_orders', JSON.stringify(purchaseOrders));
    } catch (err) {
      console.error('Failed to sync POs to localStorage', err);
    }
  }, [purchaseOrders]);

  const createPurchaseOrder = (newPo) => {
    const poEntry = {
      id: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'pending_owner_approval',
      created_at: new Date().toISOString(),
      original_quantity: Number(newPo.quantity || 1),
      total_amount: Number(newPo.quantity || 1) * Number(newPo.unit_price || 0),
      owner_remarks: '',
      ...newPo,
    };
    setPurchaseOrders((prev) => [poEntry, ...prev]);
    return poEntry;
  };

  const updatePurchaseOrderStatus = (poId, status, remarks = '') => {
    setPurchaseOrders((prev) =>
      prev.map((po) => {
        if (po.id === poId) {
          return {
            ...po,
            status,
            owner_remarks: remarks || po.owner_remarks,
            approved_at: status === 'approved' ? new Date().toISOString() : po.approved_at,
            rejected_at: status === 'rejected' ? new Date().toISOString() : po.rejected_at,
          };
        }
        return po;
      })
    );
  };

  const editAndApprovePurchaseOrder = (poId, updatedFields) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => {
        if (po.id === poId) {
          const qty = Number(updatedFields.quantity ?? po.quantity);
          const price = Number(updatedFields.unit_price ?? po.unit_price);
          return {
            ...po,
            ...updatedFields,
            quantity: qty,
            unit_price: price,
            total_amount: qty * price,
            status: 'approved',
            approved_at: new Date().toISOString(),
            owner_remarks: updatedFields.owner_remarks || 'Edited and approved by Business Owner',
          };
        }
        return po;
      })
    );
  };

  const deletePurchaseOrder = (poId) => {
    setPurchaseOrders((prev) => prev.filter((po) => po.id !== poId));
  };

  return (
    <DataContext.Provider value={{
      ...data,
      refresh,
      salesDateRange,
      applySalesDateRange,
      purchaseOrders,
      createPurchaseOrder,
      updatePurchaseOrderStatus,
      editAndApprovePurchaseOrder,
      deletePurchaseOrder,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};

