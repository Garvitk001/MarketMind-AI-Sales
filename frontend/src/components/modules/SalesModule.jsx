import React, { useMemo, useState } from 'react';
import { Card, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { B2bInvoiceModal } from '../common/B2bInvoiceModal';
import { useToast } from '../../context/ToastContext';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  ShoppingBag,
  Search,
  Plus,
  FileText,
  Download,
  Pencil,
  Ban,
  PackagePlus,
  Trash2,
  Printer,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertTriangle,
  Wallet,
  Building2,
  CreditCard,
  Calendar,
  Truck,
  UserPlus,
  MapPin,
  PackageCheck
} from 'lucide-react';

const emptyForm = () => ({
  externalReference: '',
  occurredAt: new Date().toISOString().slice(0, 16),
  currency: 'INR',
  totalAmount: '',
  itemCount: '1',
  selectedCustomerId: '',
  customerReference: '',
  paymentMethod: 'upi',
  paymentStatus: 'paid',
  deliveryStatus: 'pending',
  creditTerms: 'Net 30',
  orderDiscount: '0',
  taxAmount: '0',
  autoCalculateTax: true,
  items: [{ productId: '', quantity: '1', unitPrice: '', discountAmount: '0' }],
  notes: ''
});

export const SalesModule = () => {
  const { addToast } = useToast();
  const { salesTransactions, customers: contextCustomers = [], refresh } = useData();
  const { api, profile } = useAuth();
  const [directClients, setDirectClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [deliveryFilter, setDeliveryFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceTransaction, setInvoiceTransaction] = useState(null);

  // Quick Client Creation State
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isQuickAddClientOpen, setIsQuickAddClientOpen] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    company_name: '',
    name: '',
    contact_phone: '',
    contact_email: '',
    location: '',
    gstin: '',
    credit_limit: '250000',
    credit_terms: 'Net 30',
    territory_route: 'Central Commercial Market'
  });

  const loadDirectClients = async () => {
    try {
      const data = await api('/customers?limit=200');
      if (Array.isArray(data)) {
        setDirectClients(data);
      }
    } catch {
      // ignore
    }
  };

  React.useEffect(() => {
    loadDirectClients();
  }, []);

  const customers = useMemo(() => {
    const map = new Map();
    (contextCustomers || []).forEach((c) => {
      if (c && c.id) map.set(c.id, c);
    });
    (directClients || []).forEach((c) => {
      if (c && c.id) map.set(c.id, c);
    });
    return Array.from(map.values());
  }, [contextCustomers, directClients]);

  const openInvoiceModal = (deal) => {
    setInvoiceTransaction(deal);
    setIsInvoiceOpen(true);
  };

  const permissions = useMemo(
    () => new Set(profile?.role?.permissions || []),
    [profile?.role?.permissions]
  );
  const canCreate = permissions.has('sales.create') && Boolean(profile?.store_id);
  const canUpdate = permissions.has('sales.update.store') || permissions.has('sales.update.own');
  const canVoid = permissions.has('sales.void');

  const deals = useMemo(() => {
    return (salesTransactions || []).map((transaction) => ({
      ...transaction,
      delivery_status: transaction.delivery_status || 'pending',
      displayReference: transaction.external_reference || (transaction.id ? `INV-${transaction.id.slice(0, 8).toUpperCase()}` : 'INV-0001'),
      formattedAmount: new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: transaction.currency || 'INR'
      }).format(Number(transaction.total_amount || 0))
    }));
  }, [salesTransactions]);

  // Top Summary Business KPIs
  const ledgerKpis = useMemo(() => {
    const totalVolume = deals.reduce((sum, d) => sum + Number(d.total_amount || 0), 0);
    const clearedCash = deals
      .filter((d) => d.payment_status === 'paid')
      .reduce((sum, d) => sum + Number(d.total_amount || 0), 0);
    const outstandingCredit = deals
      .filter((d) => d.payment_status === 'unpaid' || d.payment_status === 'overdue')
      .reduce((sum, d) => sum + Number(d.total_amount || 0), 0);
    const overdueCount = deals.filter((d) => d.payment_status === 'overdue').length;

    return { totalVolume, clearedCash, outstandingCredit, overdueCount };
  }, [deals]);

  // Today's Delivery Fulfillment Statistics
  const todayDeliveryStats = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayDeals = deals.filter((d) => d.occurred_at && new Date(d.occurred_at).toDateString() === todayStr);
    const deliveredToday = todayDeals.filter((d) => d.delivery_status === 'delivered');
    const pendingToday = todayDeals.filter((d) => d.delivery_status !== 'delivered');

    return {
      todayCount: todayDeals.length,
      deliveredCount: deliveredToday.length,
      deliveredAmount: deliveredToday.reduce((sum, d) => sum + Number(d.total_amount || 0), 0),
      pendingCount: pendingToday.length,
      pendingAmount: pendingToday.reduce((sum, d) => sum + Number(d.total_amount || 0), 0),
    };
  }, [deals]);

  // Delivery Tracking KPIs
  const deliveryKpis = useMemo(() => {
    const deliveredDeals = deals.filter((d) => d.delivery_status === 'delivered');
    const outForDeliveryDeals = deals.filter((d) => d.delivery_status === 'out_for_delivery');
    const pendingDeals = deals.filter((d) => !d.delivery_status || d.delivery_status === 'pending');

    const deliveredRevenue = deliveredDeals.reduce((sum, d) => sum + Number(d.total_amount || 0), 0);
    const outForDeliveryRevenue = outForDeliveryDeals.reduce((sum, d) => sum + Number(d.total_amount || 0), 0);
    const pendingRevenue = pendingDeals.reduce((sum, d) => sum + Number(d.total_amount || 0), 0);

    return {
      deliveredCount: deliveredDeals.length,
      deliveredRevenue,
      outForDeliveryCount: outForDeliveryDeals.length,
      outForDeliveryRevenue,
      pendingCount: pendingDeals.length,
      pendingRevenue,
      totalCount: deals.length,
      fulfillmentRate: deals.length > 0 ? Math.round((deliveredDeals.length / deals.length) * 100) : 100
    };
  }, [deals]);

  // Client Search Filter for Invoice Creation Modal
  const filteredCustomers = useMemo(() => {
    if (!clientSearchQuery.trim()) return customers || [];
    const q = clientSearchQuery.toLowerCase().trim();
    return (customers || []).filter((c) => {
      const name = String(c.company_name || c.name || '').toLowerCase();
      const extId = String(c.external_customer_id || '').toLowerCase();
      const phone = String(c.contact_phone || '').toLowerCase();
      const gstin = String(c.gstin || '').toLowerCase();
      const location = String(c.location || '').toLowerCase();
      return name.includes(q) || extId.includes(q) || phone.includes(q) || gstin.includes(q) || location.includes(q);
    });
  }, [customers, clientSearchQuery]);

  const selectedCustDetails = useMemo(() => {
    return (customers || []).find((c) => c.id === form.selectedCustomerId) || null;
  }, [customers, form.selectedCustomerId]);

  const openCreate = async () => {
    if (!canCreate) {
      addToast('Your role or store assignment does not allow transaction creation.', 'danger');
      return;
    }
    try {
      setCatalog(await api('/sales/catalog'));
      loadDirectClients();
      setSelected(null);
      const generatedRef = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      setForm({
        ...emptyForm(),
        externalReference: generatedRef,
        occurredAt: new Date().toISOString().slice(0, 16),
      });
      setClientSearchQuery('');
      setIsQuickAddClientOpen(false);
      setModalMode('create');
    } catch (error) {
      addToast(error.message, 'danger');
    }
  };

  const openEdit = (transaction) => {
    setSelected(transaction);
    setForm({
      externalReference: transaction.external_reference || '',
      occurredAt: new Date(transaction.occurred_at || Date.now()).toISOString().slice(0, 16),
      currency: transaction.currency || 'INR',
      totalAmount: String(transaction.total_amount || ''),
      itemCount: String(transaction.item_count || '1'),
      selectedCustomerId: transaction.customer_id || '',
      customerReference: transaction.customer_reference || '',
      paymentMethod: transaction.payment_method || 'upi',
      paymentStatus: transaction.payment_status || 'paid',
      deliveryStatus: transaction.delivery_status || 'pending',
      creditTerms: transaction.credit_terms || 'Net 30',
      notes: transaction.notes || '',
      items: [{ productId: '', quantity: '1', unitPrice: '', discountAmount: '0' }],
      autoCalculateTax: false,
      orderDiscount: '0',
      taxAmount: String(transaction.tax_amount || '0')
    });
    setModalMode('edit');
  };

  const handleQuickCreateClient = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newClientForm.company_name.trim()) {
      addToast('Company / Business Name is required.', 'danger');
      return;
    }
    if (!newClientForm.contact_phone.trim() || newClientForm.contact_phone.trim().length < 7) {
      addToast('Valid contact phone number is mandatory to register a client.', 'danger');
      return;
    }
    setIsCreatingClient(true);
    try {
      const created = await api('/customers', {
        method: 'POST',
        body: JSON.stringify({
          company_name: newClientForm.company_name.trim(),
          name: newClientForm.name.trim() || newClientForm.company_name.trim(),
          contact_phone: newClientForm.contact_phone.trim(),
          contact_email: newClientForm.contact_email.trim() || null,
          location: newClientForm.location.trim() || 'Central Commercial Market',
          gstin: newClientForm.gstin.trim() || null,
          credit_limit: Number(newClientForm.credit_limit || 250000),
          credit_terms: newClientForm.credit_terms || 'Net 30',
          territory_route: newClientForm.territory_route.trim() || 'Central Commercial Market'
        })
      });
      addToast(`B2B Client "${created.company_name || created.name}" created and selected!`, 'success');
      setDirectClients((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      await refresh();
      setForm((prev) => ({
        ...prev,
        selectedCustomerId: created.id,
        customerReference: created.company_name || created.name,
        creditTerms: created.credit_terms || prev.creditTerms
      }));
      setIsQuickAddClientOpen(false);
      setNewClientForm({
        company_name: '',
        name: '',
        contact_phone: '',
        contact_email: '',
        location: '',
        gstin: '',
        credit_limit: '250000',
        credit_terms: 'Net 30',
        territory_route: 'Central Commercial Market'
      });
    } catch (err) {
      addToast(err.message || 'Failed to create new client', 'danger');
    } finally {
      setIsCreatingClient(false);
    }
  };

  const filteredDeals = deals.filter((deal) => {
    const customerObj = (customers || []).find((c) => c.id === deal.customer_id);
    const custName = customerObj ? (customerObj.company_name || customerObj.name) : (deal.customer_reference || '');
    const matchesSearch = `${deal.displayReference} ${custName} ${deal.source_system || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesPayment = paymentFilter === 'all' || deal.payment_status === paymentFilter;

    let matchesDelivery = true;
    if (deliveryFilter === 'delivered_today') {
      const isToday = deal.occurred_at && new Date(deal.occurred_at).toDateString() === new Date().toDateString();
      matchesDelivery = isToday && deal.delivery_status === 'delivered';
    } else if (deliveryFilter === 'pending_today') {
      const isToday = deal.occurred_at && new Date(deal.occurred_at).toDateString() === new Date().toDateString();
      matchesDelivery = isToday && deal.delivery_status !== 'delivered';
    } else if (deliveryFilter !== 'all') {
      matchesDelivery = deal.delivery_status === deliveryFilter;
    }

    const matchesMethod = methodFilter === 'all' || (() => {
      const method = String(deal.payment_method || '').toLowerCase().trim();
      if (methodFilter === 'upi') return method.includes('upi') || method.includes('qr');
      if (methodFilter === 'cash') return method.includes('cash');
      if (methodFilter === 'bank_transfer') return method.includes('bank') || method.includes('transfer') || method.includes('neft') || method.includes('rtgs') || method.includes('imps');
      if (methodFilter === 'other') return method.includes('other') || method.includes('credit') || method.includes('card') || method.includes('cheque') || method.includes('terms');
      return method === methodFilter.toLowerCase();
    })();

    let matchesDate = true;
    if (deal.occurred_at) {
      const dealDate = new Date(deal.occurred_at);
      const now = new Date();
      if (dateFilter === 'today') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        matchesDate = dealDate >= startOfToday;
      } else if (dateFilter === 'week') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = dealDate >= sevenDaysAgo;
      } else if (dateFilter === 'month') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = dealDate >= thirtyDaysAgo;
      } else if (dateFilter === 'custom') {
        if (startDate) {
          const start = new Date(startDate);
          matchesDate = matchesDate && dealDate >= start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && dealDate <= end;
        }
      }
    }

    return matchesSearch && matchesPayment && matchesDelivery && matchesMethod && matchesDate;
  });

  const orderSummary = useMemo(() => {
    const subtotal = form.items.reduce(
      (sum, item) => sum + Math.max(0, Number(item.unitPrice || 0) * Number(item.quantity || 0) - Number(item.discountAmount || 0)),
      0
    );
    const calculatedTax = form.autoCalculateTax ? (subtotal - Number(form.orderDiscount || 0)) * 0.18 : Number(form.taxAmount || 0);
    const total = subtotal - Number(form.orderDiscount || 0) + calculatedTax;
    return {
      subtotal,
      tax: calculatedTax,
      total,
      quantity: form.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    };
  }, [form.items, form.orderDiscount, form.taxAmount, form.autoCalculateTax]);

  const updateDeliveryStatus = async (deal, newStatus) => {
    setIsSaving(true);
    try {
      await api(`/sales/transactions/${deal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ delivery_status: newStatus })
      });
      const labels = {
        pending: 'Pending Dispatch',
        out_for_delivery: 'Out for Delivery',
        delivered: 'Delivered'
      };
      addToast(`Order ${deal.displayReference} updated to ${labels[newStatus] || newStatus}`, 'success');
      await refresh();
    } catch (error) {
      addToast(error.message || 'Failed to update delivery status', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const markAsPaid = async (deal) => {
    setIsSaving(true);
    try {
      await api(`/sales/transactions/${deal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ payment_status: 'paid' })
      });
      addToast(`Payment recorded for Invoice ${deal.displayReference}. Status updated to Paid.`, 'success');
      await refresh();
    } catch (error) {
      addToast(error.message || 'Failed to update payment status', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const submitTransaction = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      if (modalMode === 'create') {
        if (!form.selectedCustomerId) {
          addToast('Please select or register a B2B client before generating the invoice.', 'danger');
          setIsSaving(false);
          return;
        }
        if (!form.items.length) {
          addToast('Please add at least one line item.', 'danger');
          setIsSaving(false);
          return;
        }
        for (const item of form.items) {
          if (!item.productId) {
            addToast('Please select a product SKU for all line items.', 'danger');
            setIsSaving(false);
            return;
          }
          if (!item.unitPrice || Number(item.unitPrice) <= 0) {
            addToast('Please enter a valid unit price greater than 0 for all products.', 'danger');
            setIsSaving(false);
            return;
          }
          if (!item.quantity || Number(item.quantity) <= 0) {
            addToast('Please enter a valid quantity greater than 0.', 'danger');
            setIsSaving(false);
            return;
          }
        }
      }

      const selectedCust = customers.find((c) => c.id === form.selectedCustomerId);
      const custRef = selectedCust ? (selectedCust.company_name || selectedCust.name) : (form.customerReference ? form.customerReference.trim() : null);

      const payload = {
        external_reference: form.externalReference ? form.externalReference.trim() : null,
        occurred_at: new Date(form.occurredAt).toISOString(),
        total_amount: Number(orderSummary.total || form.totalAmount),
        item_count: Number(orderSummary.quantity || form.itemCount),
        notes: form.notes ? form.notes.trim() : null
      };

      if (modalMode === 'create') {
        await api('/sales/transactions', {
          method: 'POST',
          body: JSON.stringify({
            external_reference: form.externalReference ? form.externalReference.trim() : undefined,
            occurred_at: new Date(form.occurredAt).toISOString(),
            store_id: profile?.store_id || undefined,
            currency: (form.currency || 'INR').toUpperCase(),
            payment_method: form.paymentMethod || 'upi',
            payment_status: form.paymentStatus || 'paid',
            delivery_status: form.deliveryStatus || 'pending',
            customer_id: form.selectedCustomerId || undefined,
            customer_reference: custRef || undefined,
            credit_terms: form.creditTerms || 'Net 30',
            order_discount: Number(form.orderDiscount || 0),
            tax_amount: Number(orderSummary.tax),
            notes: form.notes ? form.notes.trim() : undefined,
            items: form.items.map((item) => ({
              product_id: item.productId,
              quantity: Number(item.quantity),
              unit_price: Number(item.unitPrice),
              discount_amount: Number(item.discountAmount || 0)
            }))
          })
        });
        addToast('Sales transaction recorded. Inventory, delivery, and customer ledgers updated.', 'success');
      } else {
        await api(`/sales/transactions/${selected.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...payload,
            payment_status: form.paymentStatus,
            delivery_status: form.deliveryStatus,
            credit_terms: form.creditTerms
          })
        });
        addToast('Sales transaction updated successfully.', 'success');
      }
      setModalMode(null);
      await refresh();
    } catch (error) {
      addToast(error.message, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const updateLine = (index, field, value) =>
    setForm((current) => {
      const updated = current.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = { ...item, [field]: value };
        if (field === 'productId') {
          const catItem = catalog.find((p) => p.product_id === value);
          if (catItem && (catItem.unit_price || catItem.price || catItem.unit_mrp)) {
            next.unitPrice = String(catItem.unit_price || catItem.price || catItem.unit_mrp);
          }
        }
        return next;
      });
      return { ...current, items: updated };
    });

  const addLine = () =>
    setForm((current) => ({
      ...current,
      items: [...current.items, { productId: '', quantity: '1', unitPrice: '', discountAmount: '0' }]
    }));

  const removeLine = (index) =>
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index)
    }));

  const voidTransaction = async () => {
    setIsSaving(true);
    try {
      const response = await api(`/sales/transactions/${selected.id}/void`, {
        method: 'POST'
      });
      addToast(response.message, 'success');
      setModalMode(null);
      await refresh();
    } catch (error) {
      addToast(error.message, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const exportLedger = () => {
    const header = ['invoice_ref', 'client_company', 'occurred_at', 'amount', 'currency', 'items', 'payment_method', 'payment_status', 'credit_terms'];
    const rows = filteredDeals.map((deal) => {
      const cust = customers.find((c) => c.id === deal.customer_id);
      const custName = cust ? (cust.company_name || cust.name) : (deal.customer_reference || 'Walk-in');
      return [
        deal.displayReference,
        custName,
        deal.occurred_at,
        deal.total_amount,
        deal.currency,
        deal.item_count,
        deal.payment_method || 'N/A',
        deal.payment_status || 'paid',
        deal.credit_terms || 'Net 30'
      ];
    });
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = `marketmind-b2b-sales-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const getChannelBadge = (source) => {
    if (!source) return { label: 'Wholesale Order', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
    if (source.includes('pos')) return { label: 'Field Sales POS', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    if (source.includes('manual')) return { label: 'Counter Order', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    return { label: 'B2B Invoice', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
  };

  const getCustomerObj = (deal) => {
    if (deal.customer_id) {
      const found = customers.find((c) => c.id === deal.customer_id);
      if (found) return found;
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Title & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-indigo-500" />
            <span>Sales & B2B Invoicing Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Commercial wholesale ledger, credit terms, collections, and statutory GST Tax Invoice generation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Download} onClick={exportLedger}>
            Export Sales Register
          </Button>
          {canCreate && (
            <Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>
              New B2B Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Commercial & Delivery Summary Business KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-indigo-900/20 to-slate-900/40 border-indigo-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Sales Volume</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xl font-bold text-indigo-400 mt-2">
            ₹{ledgerKpis.totalVolume.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Sum of all generated sales invoices</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-emerald-900/20 to-slate-900/40 border-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Cleared Collections</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-emerald-400 mt-2">
            ₹{ledgerKpis.clearedCash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-[10px] text-emerald-400/80 mt-1">Fully settled payments (Cash/UPI/Bank)</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-900/20 to-slate-900/40 border-amber-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Outstanding Credit</span>
            <Wallet className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-amber-400 mt-2">
            ₹{ledgerKpis.outstandingCredit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-[10px] text-amber-400/80 mt-1">Pending collection on credit terms</p>
        </Card>

        {/* Delivery Fulfillment KPI Card */}
        <Card className="p-4 bg-gradient-to-br from-blue-900/20 to-slate-900/40 border-blue-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Order Delivery & Logistics</span>
            <Truck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-xl font-bold text-emerald-400">
              {todayDeliveryStats.deliveredCount} <span className="text-xs font-medium text-slate-400">Delivered Today</span>
            </p>
            <span className="text-[11px] font-bold text-blue-400">
              {deliveryKpis.fulfillmentRate}% Total
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
            <span>⏳ Pending Today: {todayDeliveryStats.pendingCount} (₹{todayDeliveryStats.pendingAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })})</span>
            <span>✅ All Time: {deliveryKpis.deliveredCount}</span>
          </p>
        </Card>
      </div>

      {/* Main Ledger Table Card */}
      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search invoice, client, or ref..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Payment Method Selector */}
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="py-2 px-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">All Payment Methods</option>
                <option value="upi">UPI / QR Code</option>
                <option value="cash">Cash Counter</option>
                <option value="bank_transfer">Bank Transfer (NEFT)</option>
                <option value="other">Credit Ledger / Other</option>
              </select>

              {/* Date Range Selector */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="py-2 px-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none font-medium"
              >
                <option value="all">📅 All Time</option>
                <option value="today">⚡ Today</option>
                <option value="week">📆 This Week (Last 7 Days)</option>
                <option value="month">🗓️ This Month (Last 30 Days)</option>
                <option value="custom">🔍 Custom Date Range</option>
              </select>

              {dateFilter === 'custom' && (
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="py-1 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                    title="Start Date"
                  />
                  <span className="text-[10px] text-slate-400 font-bold uppercase">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="py-1 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                    title="End Date"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Filter Tabs Row: Payment & Delivery */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            {/* Payment Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs overflow-x-auto">
              <span className="text-[10px] font-bold text-slate-400 px-2 uppercase">Payment:</span>
              {['all', 'paid', 'unpaid', 'overdue'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPaymentFilter(tab)}
                  className={`px-3 py-1 rounded-lg font-semibold capitalize whitespace-nowrap transition-all ${
                    paymentFilter === tab
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab}
                </button>
              ))}
            </div>

            {/* Delivery Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs overflow-x-auto">
              <span className="text-[10px] font-bold text-slate-400 px-2 uppercase">Delivery:</span>
              {[
                { id: 'all', label: 'All' },
                { id: 'delivered_today', label: `⚡ Delivered Today (${todayDeliveryStats.deliveredCount})` },
                { id: 'pending_today', label: `⏳ Pending Today (${todayDeliveryStats.pendingCount})` },
                { id: 'delivered', label: '✅ Delivered' },
                { id: 'out_for_delivery', label: '🚚 Out for Delivery' },
                { id: 'pending', label: '📦 Backlog' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDeliveryFilter(tab.id)}
                  className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    deliveryFilter === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Invoice &amp; Order Type</th>
                <th className="py-3 px-4 font-semibold">Client Company / Retailer</th>
                <th className="py-3 px-4 font-semibold">Status &amp; Terms</th>
                <th className="py-3 px-4 font-semibold">Delivery &amp; Fulfillment</th>
                <th className="py-3 px-4 font-semibold">Invoice Amount</th>
                <th className="py-3 px-4 font-semibold">Items / Volume</th>
                <th className="py-3 px-4 font-semibold text-right">Commercial Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDeals.map((deal) => {
                const customerObj = getCustomerObj(deal);
                const custName = customerObj ? (customerObj.company_name || customerObj.name) : (deal.customer_reference || 'Walk-in Buyer');
                const badge = getChannelBadge(deal.source_system);
                const isPendingPayment = deal.payment_status === 'unpaid' || deal.payment_status === 'overdue';

                return (
                  <tr key={deal.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    {/* Invoice ID & Source */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                          {deal.displayReference}
                        </span>
                      </div>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Client Company & GSTIN */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[170px]">
                            {custName}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[170px]">
                            {customerObj?.gstin ? `GST: ${customerObj.gstin}` : 'Counter Sale'} · {customerObj?.location || 'Direct Store'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Payment Status & Terms */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <Badge
                          variant={
                            deal.payment_status === 'paid'
                              ? 'success'
                              : deal.payment_status === 'overdue'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {deal.payment_status === 'paid' ? '✓ PAID' : deal.payment_status === 'overdue' ? '⚠ OVERDUE' : '⏳ UNPAID'}
                        </Badge>
                        <p className="text-[10px] text-slate-400">
                          Terms: {deal.credit_terms || 'Net 30'} · {String(deal.payment_method || 'CASH').toUpperCase()}
                        </p>
                      </div>
                    </td>

                    {/* Interactive Delivery Fulfillment Status */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <select
                          value={deal.delivery_status || 'pending'}
                          onChange={(e) => updateDeliveryStatus(deal, e.target.value)}
                          className={`text-xs font-bold py-1 px-2.5 rounded-xl border transition-all cursor-pointer ${
                            deal.delivery_status === 'delivered'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : deal.delivery_status === 'out_for_delivery'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          }`}
                        >
                          <option value="pending">⏳ Pending Dispatch</option>
                          <option value="out_for_delivery">🚚 Out for Delivery</option>
                          <option value="delivered">✅ Delivered</option>
                        </select>
                        <p className="text-[9px] text-slate-400">
                          {deal.delivery_status === 'delivered' ? 'Completed & Handed Over' : deal.delivery_status === 'out_for_delivery' ? 'Driver in Transit' : 'Awaiting Dispatch'}
                        </p>
                      </div>
                    </td>

                    {/* Invoice Amount */}
                    <td className="py-3 px-4">
                      <p className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-sm">
                        {deal.formattedAmount}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {deal.tax_amount ? `Incl. GST ₹${Number(deal.tax_amount).toLocaleString('en-IN')}` : 'Incl. CGST/SGST 18%'}
                      </p>
                    </td>

                    {/* Items & Date */}
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        {deal.item_count || 1} Units
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {deal.occurred_at ? new Date(deal.occurred_at).toLocaleDateString('en-GB') : 'Today'}
                      </p>
                    </td>

                    {/* Commercial Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isPendingPayment && (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={CheckCircle2}
                            onClick={() => markAsPaid(deal)}
                            className="text-emerald-500 hover:text-emerald-600"
                            title="Mark as Cleared Payment"
                          >
                            Mark Paid
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Printer}
                          onClick={() => openInvoiceModal(deal)}
                          title="Generate Printable GST Invoice"
                        >
                          GST Invoice
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={FileText}
                          onClick={() => {
                            setSelected(deal);
                            setModalMode('view');
                          }}
                        >
                          View
                        </Button>
                        {canUpdate && deal.status !== 'voided' && !deal.line_items?.length && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Pencil}
                            onClick={() => openEdit(deal)}
                          >
                            Edit
                          </Button>
                        )}
                        {canVoid && deal.status !== 'voided' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Ban}
                            onClick={() => {
                              setSelected(deal);
                              setModalMode('void');
                            }}
                            className="text-rose-500 hover:text-rose-600"
                          >
                            Void
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filteredDeals.length && (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-xs text-slate-400">
                    No sales transactions match the selected filter or search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Statutory GST Invoice Modal */}
      <B2bInvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        transaction={invoiceTransaction}
        customer={(customers || []).find((c) => c.id === invoiceTransaction?.customer_id)}
      />

      {/* New Invoice / Edit Modal */}
      <Modal
        isOpen={modalMode === 'create' || modalMode === 'edit'}
        onClose={() => setModalMode(null)}
        title={modalMode === 'create' ? 'Generate Statutory B2B Tax Invoice' : 'Edit Sales Transaction'}
        size="xl"
      >
        <form onSubmit={submitTransaction} className="space-y-5">
          {modalMode === 'create' && (
            /* SECTION 1: B2B Client Selection & Profile */
            <div className="space-y-3 rounded-2xl border-2 border-indigo-500/30 dark:border-indigo-500/40 p-4 bg-gradient-to-b from-indigo-50/50 via-white to-white dark:from-indigo-950/30 dark:via-slate-900/60 dark:to-slate-900/60 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    1. B2B Client Account Details *
                  </span>
                </div>
                {!isQuickAddClientOpen && !selectedCustDetails && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewClientForm((prev) => ({
                        ...prev,
                        company_name: clientSearchQuery || '',
                        name: clientSearchQuery || '',
                      }));
                      setIsQuickAddClientOpen(true);
                    }}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex items-center gap-1.5 bg-white dark:bg-indigo-900/60 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-700 shadow-xs hover:shadow-md transition-all hover:scale-105"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Register New Client</span>
                  </button>
                )}
              </div>

              {/* If Client is Selected: Show Detailed Selected Card */}
              {selectedCustDetails ? (
                <div className="p-3.5 rounded-xl bg-indigo-100/70 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-indigo-950 dark:text-indigo-100">
                        {selectedCustDetails.company_name || selectedCustDetails.name}
                      </span>
                      {selectedCustDetails.gstin && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          GSTIN: {selectedCustDetails.gstin}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                      {selectedCustDetails.contact_phone && (
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          📞 {selectedCustDetails.contact_phone}
                        </span>
                      )}
                      <span>📍 {selectedCustDetails.location || 'Central Commercial Market'}</span>
                      <span>🚚 Route: {selectedCustDetails.territory_route || 'Central Route'}</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        Due: ₹{Number(selectedCustDetails.outstanding_balance || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, selectedCustomerId: '', customerReference: '' }));
                      setClientSearchQuery('');
                    }}
                    className="shrink-0 text-xs"
                  >
                    Change Client
                  </Button>
                </div>
              ) : !isQuickAddClientOpen ? (
                /* If No Client Selected: Show Search Bar and Client Selection List */
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type to search client by company name, phone (+91...), GSTIN, or city..."
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                    {clientSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setClientSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Client Instant Selection List */}
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/60 shadow-inner">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setForm({
                              ...form,
                              selectedCustomerId: c.id,
                              customerReference: c.company_name || c.name,
                              creditTerms: c?.credit_terms || form.creditTerms
                            });
                            setClientSearchQuery('');
                          }}
                          className="p-2.5 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/50 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {c.company_name || c.name}
                              </span>
                              {c.gstin && (
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                                  {c.gstin}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 flex items-center gap-3">
                              {c.contact_phone && <span>📞 {c.contact_phone}</span>}
                              <span>📍 {c.location || 'Central Market'}</span>
                              <span>🚚 {c.territory_route || 'Route 1'}</span>
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px]">
                              Select Client →
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-500 space-y-2">
                        <p>No existing client found matching "<strong>{clientSearchQuery}</strong>"</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          icon={UserPlus}
                          onClick={() => {
                            setNewClientForm((prev) => ({
                              ...prev,
                              company_name: clientSearchQuery,
                              name: clientSearchQuery
                            }));
                            setIsQuickAddClientOpen(true);
                          }}
                        >
                          Register "{clientSearchQuery}" as New Client
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Inline Quick Add Client Form */
                <div className="space-y-3 p-3.5 rounded-xl border-2 border-indigo-500/40 bg-white dark:bg-slate-900/80 shadow-md animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-100 dark:border-indigo-900/50">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                        Quick Register New B2B Client
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsQuickAddClientOpen(false)}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Input
                      id="quickClientCompany"
                      label="Company / Shop Name *"
                      placeholder="e.g. Badshah Wholesale Traders"
                      value={newClientForm.company_name}
                      onChange={(e) => setNewClientForm({ ...newClientForm, company_name: e.target.value, name: e.target.value })}
                      required
                    />
                    <Input
                      id="quickClientPhone"
                      label="Contact Phone *"
                      placeholder="+91 98765 43210"
                      value={newClientForm.contact_phone}
                      onChange={(e) => setNewClientForm({ ...newClientForm, contact_phone: e.target.value })}
                      required
                    />
                    <Input
                      id="quickClientGstin"
                      label="GSTIN Number"
                      placeholder="e.g. 27AAAAA0000A1Z5"
                      value={newClientForm.gstin}
                      onChange={(e) => setNewClientForm({ ...newClientForm, gstin: e.target.value })}
                    />
                    <Input
                      id="quickClientLocation"
                      label="Location / City / Address *"
                      placeholder="e.g. Surat Wholesale Market, Gujarat"
                      value={newClientForm.location}
                      onChange={(e) => setNewClientForm({ ...newClientForm, location: e.target.value })}
                      required
                    />
                    <Input
                      id="quickClientLimit"
                      label="Approved Credit Limit (₹)"
                      type="number"
                      placeholder="250000"
                      value={newClientForm.credit_limit}
                      onChange={(e) => setNewClientForm({ ...newClientForm, credit_limit: e.target.value })}
                    />
                    <Input
                      id="quickClientRoute"
                      label="Territory Route"
                      placeholder="e.g. Central Commercial Market"
                      value={newClientForm.territory_route}
                      onChange={(e) => setNewClientForm({ ...newClientForm, territory_route: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsQuickAddClientOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      icon={CheckCircle2}
                      isLoading={isCreatingClient}
                      onClick={handleQuickCreateClient}
                    >
                      Save & Select Client
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: Invoice Metadata & Logistics */}
          <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/40">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              2. Invoice & Delivery Dispatch Settings
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                id="transactionReference"
                label="Invoice / PO Reference"
                placeholder="e.g. INV-20260911-0089 (Auto-generated)"
                value={form.externalReference}
                onChange={(event) => setForm({ ...form, externalReference: event.target.value })}
              />
              <Input
                id="transactionOccurredAt"
                label="Invoice Date & Time *"
                type="datetime-local"
                value={form.occurredAt}
                onChange={(event) => setForm({ ...form, occurredAt: event.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Payment Method
                <select
                  value={form.paymentMethod}
                  onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 font-medium"
                >
                  <option value="upi">UPI / QR Code</option>
                  <option value="cash">Cash Counter</option>
                  <option value="bank_transfer">Bank Transfer (NEFT)</option>
                  <option value="other">Credit Ledger (Unpaid)</option>
                </select>
              </label>
              <Input
                id="transactionCreditTerms"
                label="Payment Terms"
                value={form.creditTerms}
                onChange={(e) => setForm({ ...form, creditTerms: e.target.value })}
                placeholder="Net 30"
              />
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Delivery Dispatch Status
                <select
                  value={form.deliveryStatus}
                  onChange={(e) => setForm({ ...form, deliveryStatus: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 font-semibold"
                >
                  <option value="pending">⏳ Pending Dispatch</option>
                  <option value="out_for_delivery">🚚 Out for Delivery</option>
                  <option value="delivered">✅ Delivered</option>
                </select>
              </label>
            </div>
          </div>

          {modalMode === 'create' ? (
            <>
              {/* SECTION 3: Order Line Items & SKUs */}
              <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      3. Order Line Items & Product SKUs
                    </p>
                    <p className="text-xs text-slate-500">Live inventory stock updated automatically upon confirmation.</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" icon={PackagePlus} onClick={addLine}>
                    Add Line Item
                  </Button>
                </div>
                {form.items.map((item, index) => {
                  const selectedProduct = catalog.find((product) => product.product_id === item.productId);
                  return (
                    <div key={index} className="grid gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50 sm:grid-cols-12 items-end">
                      <label className="text-xs font-semibold sm:col-span-5">
                        Product / SKU *
                        <select
                          required
                          value={item.productId}
                          onChange={(event) => updateLine(index, 'productId', event.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                        >
                          <option value="">Select Product SKU</option>
                          {catalog.map((product) => (
                            <option
                              key={product.product_id}
                              value={product.product_id}
                              disabled={form.items.some((line, lineIndex) => lineIndex !== index && line.productId === product.product_id)}
                            >
                              {product.name} · {product.sku} (Stock: {product.available_stock})
                            </option>
                          ))}
                        </select>
                        {selectedProduct && (
                          <p className="mt-1 text-[11px] text-slate-500">Available: {selectedProduct.available_stock} Units</p>
                        )}
                      </label>
                      <div className="sm:col-span-2">
                        <Input
                          label="Qty *"
                          type="number"
                          min="1"
                          max={selectedProduct?.available_stock || undefined}
                          value={item.quantity}
                          onChange={(event) => updateLine(index, 'quantity', event.target.value)}
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Input
                          label="Unit Price (₹) *"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(event) => updateLine(index, 'unitPrice', event.target.value)}
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Input
                          label="Discount (₹)"
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discountAmount}
                          onChange={(event) => updateLine(index, 'discountAmount', event.target.value)}
                        />
                      </div>
                      <div className="flex justify-center sm:col-span-1 pb-1">
                        <Button
                          type="button"
                          variant="ghost"
                          icon={Trash2}
                          disabled={form.items.length === 1}
                          onClick={() => removeLine(index)}
                          className="text-rose-500 hover:text-rose-600"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SECTION 4: Financial Summary & Tax Calculation */}
              <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/40">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  4. Tax Ledger & Commercial Summary
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    id="transactionDiscount"
                    label="Bill Discount (₹)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.orderDiscount}
                    onChange={(event) => setForm({ ...form, orderDiscount: event.target.value })}
                  />
                  <Input
                    id="transactionTax"
                    label="GST (18% Statutory)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={orderSummary.tax.toFixed(2)}
                    disabled
                  />
                  <Input
                    id="transactionCurrency"
                    label="Billing Currency"
                    value={form.currency}
                    onChange={(event) => setForm({ ...form, currency: event.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-4 text-xs">
                  <div>
                    <p className="text-slate-500 uppercase font-semibold text-[10px]">Total Quantity</p>
                    <p className="font-bold text-base text-slate-900 dark:text-slate-100">{orderSummary.quantity} Units</p>
                  </div>
                  <div>
                    <p className="text-slate-500 uppercase font-semibold text-[10px]">Taxable Subtotal</p>
                    <p className="font-bold text-base text-slate-900 dark:text-slate-100">
                      ₹{orderSummary.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-indigo-600 dark:text-indigo-400 uppercase font-bold text-[10px]">Total Invoice Amount</p>
                    <p className="font-extrabold text-lg text-indigo-600 dark:text-indigo-400">
                      ₹{orderSummary.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Input
                id="transactionAmount"
                label="Amount"
                type="number"
                value={form.totalAmount}
                onChange={(event) => setForm({ ...form, totalAmount: event.target.value })}
                required
              />
              <Input
                id="transactionItems"
                label="Item Count"
                type="number"
                value={form.itemCount}
                onChange={(event) => setForm({ ...form, itemCount: event.target.value })}
                required
              />
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Payment Status
                <select
                  value={form.paymentStatus}
                  onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid / Credit</option>
                  <option value="overdue">Overdue</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Delivery Status
                <select
                  value={form.deliveryStatus}
                  onChange={(e) => setForm({ ...form, deliveryStatus: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="pending">⏳ Pending Dispatch</option>
                  <option value="out_for_delivery">🚚 Out for Delivery</option>
                  <option value="delivered">✅ Delivered</option>
                </select>
              </label>
            </div>
          )}

          <Input
            id="transactionNotes"
            label="Notes / Delivery Instructions"
            placeholder="e.g. Fragile delivery, Gate #2 unloading instructions"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setModalMode(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              {modalMode === 'create' ? 'Generate Tax Invoice' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal (Authentic Commercial Bill & Receipt Format) */}
      <Modal isOpen={modalMode === 'view'} onClose={() => setModalMode(null)} title="B2B Commercial Invoice & Transaction Bill" size="xl">
        {selected && (() => {
          const cust = getCustomerObj(selected);
          const custName = cust ? (cust.company_name || cust.name) : (selected.customer_reference || 'Walk-in Retail Buyer');
          const totalAmt = Number(selected.total_amount || 0);
          const totalQty = Number(selected.item_count || 1);
          const cgstAmt = Number(selected.cgst_amount || (totalAmt * 0.09));
          const sgstAmt = Number(selected.sgst_amount || (totalAmt * 0.09));
          const taxableSub = totalAmt - (cgstAmt + sgstAmt);

          const lines = selected.line_items && selected.line_items.length > 0 ? selected.line_items : [
            { id: 'l1', product: { name: 'Classic T-Shirt', sku: 'DEMO-TSHIRT' }, quantity: 3, line_amount: 2964 },
            { id: 'l2', product: { name: 'Steel Water Bottle', sku: 'DEMO-BOTTLE' }, quantity: 2, line_amount: 1976 }
          ];

          return (
            <div className="space-y-4 font-mono text-xs text-slate-900 bg-slate-100 dark:bg-slate-950 p-2 sm:p-4 rounded-xl">
              {/* White Bill Paper Frame */}
              <div className="bg-white text-black p-5 rounded-xl border-2 border-slate-900 shadow-2xl space-y-3 font-mono text-[11px] leading-tight">
                
                {/* Header */}
                <div className="flex justify-between items-start pb-2 border-b-2 border-black gap-2">
                  <div>
                    <h3 className="font-black text-sm text-black tracking-wider uppercase flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-slate-900" />
                      <span>MARKETMIND DISTRIBUTORS PVT LTD</span>
                    </h3>
                    <p className="text-[10px] text-slate-800">Wholesale Commercial Sales Receipt & Tax Memo</p>
                    <p className="text-[10px] text-slate-800">GSTIN: <span className="font-bold">27MARKETMIND123Z9</span> | State: 27-MH</p>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 bg-black text-white font-black text-[10px] uppercase tracking-widest">
                      SALES INVOICE
                    </span>
                    <p className="font-bold text-xs mt-1">{selected.displayReference}</p>
                    <p className="text-[10px]">{new Date(selected.occurred_at).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* Billed To & Payment Status Row */}
                <div className="grid grid-cols-2 gap-3 p-2 border border-black rounded bg-slate-50/50">
                  <div>
                    <p className="font-black text-[9px] uppercase tracking-wider text-slate-700">BILLED TO CLIENT:</p>
                    <p className="font-bold text-xs uppercase">{custName}</p>
                    <p className="text-[10px]">Location: <span className="font-bold">{cust?.location || 'Registered Facility'}</span></p>
                    <p className="text-[10px]">GSTIN: <span className="font-bold">{cust?.gstin || 'N/A'}</span> · Route: {cust?.territory_route || 'Direct Route'}</p>
                  </div>

                  <div className="text-right">
                    <p className="font-black text-[9px] uppercase tracking-wider text-slate-700">COMMERCIAL & LOGISTICS:</p>
                    <p className="text-[10px]">Payment: <span className="font-bold uppercase text-black">[{selected.payment_status || 'PAID'}]</span> ({selected.payment_method?.toUpperCase() || 'UPI'})</p>
                    <p className="text-[10px]">Delivery: <span className="font-bold uppercase text-indigo-700">[{selected.delivery_status === 'delivered' ? 'DELIVERED' : selected.delivery_status === 'out_for_delivery' ? 'OUT FOR DELIVERY' : 'PENDING DISPATCH'}]</span></p>
                    <p className="text-[10px]">Credit Terms: {selected.credit_terms || 'Net 30'}</p>
                  </div>
                </div>

                {/* Itemized Table with Monospace Billing Math */}
                <table className="w-full text-left border-collapse border border-black text-[10px]">
                  <thead className="bg-slate-200 text-black font-bold uppercase border-b border-black">
                    <tr>
                      <th className="p-1 border-r border-black text-center w-6">#</th>
                      <th className="p-1 border-r border-black">Item Description & SKU</th>
                      <th className="p-1 border-r border-black text-center">Qty</th>
                      <th className="p-1 border-r border-black text-right">Rate (₹)</th>
                      <th className="p-1 text-right">Line Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black">
                    {lines.map((line, idx) => {
                      const qty = Number(line.quantity || 1);
                      let lineTotal = Number(line.line_amount || 0);
                      let unitPrice = Number(line.unit_price || 0);

                      if (unitPrice === 0 && lineTotal > 0) {
                        unitPrice = lineTotal / qty;
                      } else if (lineTotal === 0 && unitPrice > 0) {
                        lineTotal = unitPrice * qty;
                      } else if (unitPrice === 0 && lineTotal === 0) {
                        unitPrice = totalAmt / totalQty;
                        lineTotal = unitPrice * qty;
                      }

                      return (
                        <tr key={line.id || idx}>
                          <td className="p-1 border-r border-black text-center">{idx + 1}</td>
                          <td className="p-1 border-r border-black font-bold">
                            {line.product?.name || 'Wholesale Product SKU'}
                            <span className="block text-[9px] text-slate-700 font-normal">[{line.product?.sku || 'SKU-001'}]</span>
                          </td>
                          <td className="p-1 border-r border-black text-center font-bold">{qty} Pcs</td>
                          <td className="p-1 border-r border-black text-right">
                            {unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-1 text-right font-bold">
                            {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Financial Summary Box */}
                <div className="flex justify-between items-center p-2 border-2 border-black rounded bg-slate-50/50">
                  <div>
                    <p className="text-[9px] font-bold text-slate-700">TOTAL UNITS: {totalQty} Pcs</p>
                    <p className="text-[10px]">Subtotal: ₹{taxableSub.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[9px] text-slate-700">Incl. CGST 9% (₹{cgstAmt.toFixed(2)}) + SGST 9% (₹{sgstAmt.toFixed(2)})</p>
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] font-bold uppercase text-slate-700">INVOICE TOTAL</p>
                    <p className="text-base font-black">
                      ₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-1 no-print">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Printer}
                  onClick={() => {
                    setModalMode(null);
                    openInvoiceModal(selected);
                  }}
                  className="bg-indigo-600 text-white hover:bg-indigo-700 border-none shadow-md font-sans text-xs"
                >
                  Open Official A5 Landscape GST Invoice
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setModalMode(null)} className="font-sans text-xs">
                  Close
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Void Modal */}
      <Modal isOpen={modalMode === 'void'} onClose={() => setModalMode(null)} title="Void Transaction">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Are you sure you want to void transaction <strong>{selected?.displayReference}</strong>? This action will be recorded in
          the audit log and cannot be undone.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button type="button" variant="ghost" onClick={() => setModalMode(null)}>
            Cancel
          </Button>
          <Button type="button" variant="danger" isLoading={isSaving} onClick={voidTransaction}>
            Confirm Void
          </Button>
        </div>
      </Modal>
    </div>
  );
};
