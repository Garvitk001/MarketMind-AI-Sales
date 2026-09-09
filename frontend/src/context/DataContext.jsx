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

  return (
    <DataContext.Provider value={{ ...data, refresh, salesDateRange, applySalesDateRange }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
