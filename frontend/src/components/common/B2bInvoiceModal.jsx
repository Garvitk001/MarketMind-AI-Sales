import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Printer, Building2, Phone, Mail, CheckCircle2, AlertTriangle, Clock, QrCode } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const numberToWordsIN = (num) => {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 ? inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 ? inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 ? inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 ? inWords(n % 10000000) : '');
  };

  const integerPart = Math.floor(num);
  return `${inWords(integerPart).trim()} Rupees Only`;
};

export const B2bInvoiceModal = ({ isOpen, onClose, transaction, customer }) => {
  const { t } = useLanguage();

  if (!isOpen || !transaction) return null;

  const invoiceNo = transaction.external_reference || `INV-2026-${transaction.id ? transaction.id.slice(0, 6).toUpperCase() : '0045'}`;
  const invDate = transaction.occurred_at ? new Date(transaction.occurred_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  const dueDate = transaction.due_date ? new Date(transaction.due_date).toLocaleDateString('en-IN') : 'Net 30 Days';

  const companyName = customer?.company_name || transaction.customer_snapshot?.company_name || transaction.customer_reference || 'Apex Wholesale & Retail Partner';
  const gstin = customer?.gstin || transaction.customer_snapshot?.gstin || '27AAAAA0000A1Z5';
  const contactPhone = customer?.contact_phone || transaction.customer_snapshot?.contact_phone || '+91 98765 43210';
  const route = customer?.territory_route || transaction.customer_snapshot?.territory_route || 'Central Wholesale Route';
  const location = customer?.location || transaction.customer_snapshot?.location || 'Central Commercial Market';

  const totalAmount = Number(transaction.total_amount || 0);
  const cgst = Number(transaction.cgst_amount || (totalAmount * 0.09));
  const sgst = Number(transaction.sgst_amount || (totalAmount * 0.09));
  const taxableSubtotal = totalAmount - (cgst + sgst);
  const totalItemCount = transaction.item_count || 1;

  const handlePrint = () => {
    window.print();
  };

  const rawLineItems = transaction.line_items && transaction.line_items.length > 0 ? transaction.line_items : [
    { id: '1', product: { name: 'Classic T-Shirt', sku: 'DEMO-TSHIRT' }, quantity: 3, unit_price: 988, line_amount: 2964 },
    { id: '2', product: { name: 'Steel Water Bottle', sku: 'DEMO-BOTTLE' }, quantity: 2, unit_price: 988, line_amount: 1976 }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('B2B Statutory GST Tax Invoice (A5 Landscape)')} size="2xl">
      {/* Embedded CSS for A5 Landscape Printing & Billing Monospace Fonts */}
      <style>{`
        @media print {
          @page {
            size: A5 landscape !important;
            margin: 4mm !important;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: 'Consolas', 'Courier New', Courier, monospace !important;
          }
          .no-print {
            display: none !important;
          }
          .a5-bill-container {
            border: 2px solid #000000 !important;
            padding: 8px !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div className="space-y-4 font-mono text-xs text-slate-900 bg-slate-100 dark:bg-slate-950 p-2 sm:p-4 rounded-xl">
        
        {/* Top Control Bar (Hidden in Print) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-300 dark:border-slate-800 no-print">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 border ${
              transaction.payment_status === 'overdue' ? 'bg-rose-500/15 text-rose-600 border-rose-500/30' :
              transaction.payment_status === 'unpaid' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' :
              'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
            }`}>
              {transaction.payment_status === 'overdue' && <AlertTriangle className="w-3.5 h-3.5" />}
              {transaction.payment_status === 'unpaid' && <Clock className="w-3.5 h-3.5" />}
              {transaction.payment_status === 'paid' && <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{transaction.payment_status === 'overdue' ? 'OVERDUE PAYMENT' : transaction.payment_status === 'unpaid' ? 'UNPAID CREDIT' : 'PAID TAX INVOICE'}</span>
            </span>

            <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 border ${
              transaction.delivery_status === 'delivered' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' :
              transaction.delivery_status === 'out_for_delivery' ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' :
              'bg-amber-500/15 text-amber-600 border-amber-500/30'
            }`}>
              <Truck className="w-3.5 h-3.5" />
              <span>{transaction.delivery_status === 'delivered' ? 'DELIVERED' : transaction.delivery_status === 'out_for_delivery' ? 'OUT FOR DELIVERY' : 'PENDING DISPATCH'}</span>
            </span>

            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
              Format: <strong>A5 Paper (Landscape 210x148mm)</strong>
            </span>
          </div>

          <Button variant="primary" size="sm" icon={Printer} onClick={handlePrint} className="shadow-md">
            Print A5 Landscape Bill
          </Button>
        </div>

        {/* A5 Landscape Bill Paper Sheet (White Background & Dot-Matrix Billing Monospace Font) */}
        <div className="a5-bill-container bg-white text-black p-5 rounded-xl border-2 border-slate-900 shadow-2xl space-y-3 font-mono text-[11px] leading-tight">
          
          {/* Top Header - Supplier & Bill Type */}
          <div className="flex justify-between items-start pb-2 border-b-2 border-black gap-2">
            <div>
              <h2 className="font-black text-sm text-black tracking-wider uppercase">
                MARKETMIND DISTRIBUTORS PVT LTD
              </h2>
              <p className="text-[10px] text-slate-800">Authorised B2B Wholesale FMCG & Retail Distribution</p>
              <p className="text-[10px] text-slate-800">GSTIN: <span className="font-bold">27MARKETMIND123Z9</span> | State Code: 27 (MH)</p>
            </div>

            <div className="text-right">
              <span className="inline-block px-2 py-0.5 bg-black text-white font-black text-[10px] tracking-widest uppercase">
                GST TAX INVOICE
              </span>
              <p className="font-bold text-xs mt-1">Inv No: <span className="underline">{invoiceNo}</span></p>
              <p className="text-[10px]">Inv Date: {invDate} | Due: {dueDate}</p>
            </div>
          </div>

          {/* 2-Column Details Row (Billed To & Dispatch Info) */}
          <div className="grid grid-cols-2 gap-3 p-2 border border-black rounded bg-slate-50/50">
            <div>
              <p className="font-black text-[9px] uppercase tracking-wider text-slate-700">BILLED TO (RETAILER/BUYER):</p>
              <p className="font-bold text-xs uppercase">{companyName}</p>
              <p className="text-[10px]">GSTIN: <span className="font-bold">{gstin}</span></p>
              <p className="text-[10px]">Location: <span className="font-bold">{location}</span></p>
              <p className="text-[10px]">Route: {route} | Ph: {contactPhone}</p>
            </div>

            <div className="text-right">
              <p className="font-black text-[9px] uppercase tracking-wider text-slate-700">DISPATCH & LEDGER DETAILS:</p>
              <p className="text-[10px]">Payment Method: <span className="font-bold">{transaction.payment_method?.toUpperCase() || 'UPI / BANK'}</span></p>
              <p className="text-[10px]">Delivery: <span className="font-bold uppercase text-black">[{transaction.delivery_status === 'delivered' ? 'DELIVERED' : transaction.delivery_status === 'out_for_delivery' ? 'OUT FOR DELIVERY' : 'PENDING DISPATCH'}]</span></p>
              <p className="text-[10px]">Credit Terms: <span className="font-bold">{transaction.credit_terms || 'Net 30 Days'}</span></p>
              <p className="text-[10px]">Payment Status: <span className="font-bold text-black uppercase">[{transaction.payment_status || 'PAID'}]</span></p>
            </div>
          </div>

          {/* Itemized Billing Table (Fits A5 Landscape) */}
          <table className="w-full text-left border-collapse border border-black text-[10px]">
            <thead className="bg-slate-200 text-black font-bold uppercase border-b border-black">
              <tr>
                <th className="p-1 border-r border-black text-center w-6">#</th>
                <th className="p-1 border-r border-black">Item Description & SKU</th>
                <th className="p-1 border-r border-black text-center">HSN</th>
                <th className="p-1 border-r border-black text-center">Qty</th>
                <th className="p-1 border-r border-black text-right">Rate (₹)</th>
                <th className="p-1 text-right">Taxable Amt (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {rawLineItems.map((item, idx) => {
                const qty = Number(item.quantity || 1);
                let calculatedRate = Number(item.unit_price || 0);
                let lineTotal = Number(item.line_amount || 0);

                if (calculatedRate === 0 && lineTotal > 0) {
                  calculatedRate = lineTotal / qty;
                } else if (lineTotal === 0 && calculatedRate > 0) {
                  lineTotal = calculatedRate * qty;
                } else if (calculatedRate === 0 && lineTotal === 0) {
                  calculatedRate = taxableSubtotal / totalItemCount;
                  lineTotal = calculatedRate * qty;
                }

                return (
                  <tr key={item.id || idx}>
                    <td className="p-1 border-r border-black text-center">{idx + 1}</td>
                    <td className="p-1 border-r border-black font-bold">
                      {item.product?.name || 'Wholesale Product SKU'}
                      <span className="block text-[9px] text-slate-700 font-normal">[{item.product?.sku || 'SKU-001'}]</span>
                    </td>
                    <td className="p-1 border-r border-black text-center">8471</td>
                    <td className="p-1 border-r border-black text-center font-bold">{qty} Pcs</td>
                    <td className="p-1 border-r border-black text-right">
                      {calculatedRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-1 text-right font-bold">
                      {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Bottom Row - Bank Details & Financial Summary */}
          <div className="grid grid-cols-12 gap-2 pt-1">
            {/* Bank Remittance & Words (7 Cols) */}
            <div className="col-span-7 space-y-1 p-2 border border-black rounded text-[9.5px]">
              <p className="font-bold uppercase text-[9px]">BANK REMITTANCE DETAILS:</p>
              <p>Bank: HDFC Bank (Fort Branch) | A/C: 50200012345678</p>
              <p>IFSC: HDFC0000060 | UPI ID: marketmind.pay@hdfcbank</p>
              <div className="pt-1 border-t border-slate-400">
                <span className="font-bold">IN WORDS: </span>
                <span className="italic font-bold text-slate-900">{numberToWordsIN(totalAmount)}</span>
              </div>
            </div>

            {/* Tax & Total Summary (5 Cols) */}
            <div className="col-span-5 p-2 border-2 border-black rounded space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Taxable Value:</span>
                <span className="font-bold">₹{taxableSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>CGST (9%):</span>
                <span>₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST (9%):</span>
                <span>₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-black text-xs pt-1 border-t-2 border-black">
                <span>BILL TOTAL:</span>
                <span>₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Footer Terms & Authorization */}
          <div className="flex justify-between items-end pt-2 text-[9px] border-t border-black">
            <div>
              <p className="font-bold">TERMS: 1. Subject to Mumbai Jurisdiction. 2. Interest @ 18% p.a. on late payment. E.&O.E.</p>
            </div>
            <div className="text-right">
              <p className="font-bold">For MARKETMIND DISTRIBUTORS PVT LTD</p>
              <p className="pt-4 font-bold">[Authorized Signatory / Stamp]</p>
            </div>
          </div>

        </div>

      </div>
    </Modal>
  );
};
