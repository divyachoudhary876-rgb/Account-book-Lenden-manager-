// frontend/src/utils/salesInvoicingEngine.js

import { getStockItemsByFirm, updateStockItemQuantity } from './stockInventoryEngine.js';
import { getFirmMasterAccounts, saveMasterAccount } from './accountMasterEngine.js';
import { saveUniversalVoucher, normalizeLedgerAccountMatch } from './voucherPostingEngine.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export const processSalesInvoiceSubmission = (firmId = 'FIRM-001', payload = {}) => {
  const activeFirmId = String(payload?.firmId || payload?.firm_id || firmId || 'FIRM-001').trim();
  const { customer_account, item_name, quantity, unit_rate, voucher_date, invoice_number, narration, vehicle_no, gst_rate } = payload;
  
  const qty = parseFloat(quantity || 0);
  const rate = parseFloat(unit_rate || 0);
  const gstRateVal = parseFloat(gst_rate || 0);
  
  const taxableAmount = round2(qty * rate);
  const gstAmount = round2((taxableAmount * gstRateVal) / 100);
  const totalAmount = round2(taxableAmount + gstAmount);
  
  const vDate = voucher_date || new Date().toISOString().split('T')[0];
  const cleanItem = (item_name || 'Item').trim();
  const cleanCustomer = (customer_account || '').trim();

  if (!cleanCustomer || qty <= 0 || rate <= 0) {
    throw new Error("Customer Account, Quantity (>0) aur Selling Rate (>0) darj karna anivarya hai.");
  }

  // 1. Stock Validation & Reduction
  const stockList = getStockItemsByFirm(activeFirmId);
  const stockItem = stockList.find(s => (s.item_name || s.name || '').trim().toLowerCase() === cleanItem.toLowerCase());
  if (!stockItem) {
    throw new Error(`Item "${cleanItem}" inventory me uplabdh nahi hai.`);
  }

  const currentStockQty = parseFloat(stockItem.current_stock || stockItem.stock || 0);
  if (currentStockQty < qty && !stockItem.is_service && stockItem.item_type !== 'SERVICE') {
    throw new Error(`Insufficient Stock! Uplabdh Stock: ${currentStockQty} ${stockItem.unit || 'Pcs'}`);
  }

  const updatedItem = updateStockItemQuantity(activeFirmId, cleanItem, -qty, 0);

  // 2. Prepare Structured Balanced Double-Entry Compound Entries
  const voucherEntries = [
    { 
      type: 'Dr', 
      account_name: cleanCustomer, 
      party: cleanCustomer,
      amount: totalAmount, 
      debit: totalAmount, 
      credit: 0 
    },
    { 
      type: 'Cr', 
      account_name: 'Sales & Revenue', 
      party: 'Sales & Revenue',
      amount: taxableAmount, 
      debit: 0, 
      credit: taxableAmount 
    }
  ];

  if (gstAmount > 0) {
    voucherEntries.push({
      type: 'Cr',
      account_name: 'Duties & Taxes (GST Output)',
      party: 'Duties & Taxes (GST Output)',
      amount: gstAmount,
      debit: 0,
      credit: gstAmount
    });
  }

  const invoiceId = payload.id || `INV-${Date.now()}`;
  const invNumber = invoice_number || `INV-${Date.now().toString().slice(-4)}`;

  const voucherPayload = {
    id: invoiceId,
    firm_id: activeFirmId,
    firmId: activeFirmId,
    voucher_number: invNumber,
    reference_no: invNumber,
    voucher_date: vDate,
    date: vDate,
    voucher_type: 'SALES',
    type: 'SALES',
    amount: totalAmount,
    total_amount: totalAmount,
    total_taxable: taxableAmount,
    narration: narration || `Sales Invoice #${invNumber}: ${cleanItem} (${qty} ${updatedItem?.unit || 'Pcs'} @ ₹${rate})${vehicle_no ? ' - Vehicle: ' + vehicle_no : ''}`,
    is_compound: true,
    entries: voucherEntries,
    items: [
      {
        itemId: stockItem.id || `ITEM-${Date.now()}`,
        itemName: cleanItem,
        item_name: cleanItem,
        unit: stockItem.unit || 'Pcs',
        quantity: qty,
        qty: qty,
        rate: rate,
        unit_rate: rate,
        gstRate: gstRateVal,
        taxableAmount: taxableAmount,
        cgst: round2(gstAmount / 2),
        sgst: round2(gstAmount / 2),
        total: totalAmount
      }
    ],
    vehicle_no: vehicle_no || ''
  };

  // 3. Post Atomically Through Master Posting Engine
  const savedVoucher = saveUniversalVoucher(activeFirmId, voucherPayload);

  // 4. Ensure Sales Invoice Bucket is Synced
  const salesKey = `sales_invoices_${activeFirmId}`;
  const existingSales = JSON.parse(localStorage.getItem(salesKey) || '[]');
  const filteredSales = existingSales.filter(s => s && s.id !== invoiceId && s.reference_no !== invNumber);
  filteredSales.unshift(savedVoucher);
  localStorage.setItem(salesKey, JSON.stringify(filteredSales));
  localStorage.setItem(`app_invoices_${activeFirmId}`, JSON.stringify(filteredSales));

  // 5. Ensure Master Accounts are Registered (With Resilient Bilingual Matcher)
  const accounts = getFirmMasterAccounts(activeFirmId);
  const exists = accounts.some(a => normalizeLedgerAccountMatch(cleanCustomer, a.account_name || a.name || ''));

  if (!exists) {
    saveMasterAccount(activeFirmId, { 
      account_name: cleanCustomer, 
      primary_type: 'ASSETS', 
      type: 'Assets',
      sub_group: 'Sundry Debtors (Customer / देनदार)', 
      balance_type: 'Dr' 
    });
  }

  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));

  return { 
    voucherId: savedVoucher.id, 
    totalAmount, 
    updatedStock: updatedItem?.current_stock || 0, 
    party: cleanCustomer 
  };
};
