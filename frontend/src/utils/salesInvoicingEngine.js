// frontend/src/utils/salesInvoicingEngine.js

import { getStockItemsByFirm, updateStockItemQuantity } from './stockInventoryEngine.js';
import { getFirmMasterAccounts, saveMasterAccount } from './accountMasterEngine.js';
import { saveUniversalVoucher, normalizeLedgerAccountMatch } from './voucherPostingEngine.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

/**
 * Helper to strip parenthetical Devanagari text for stock comparison
 */
const getBaseName = (str = '') => {
  return String(str || '')
    .replace(/\s*\([\u0900-\u097F\s]+\)/g, '')
    .trim()
    .toLowerCase();
};

/**
 * Processes sales invoice posting with bilingual resilience and double-entry accuracy
 */
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

  // 1. Resilient Stock Item Lookup (Supports Roman, Hindi, and Composite Bilingual Strings)
  const stockList = getStockItemsByFirm(activeFirmId);
  const cleanItemBase = getBaseName(cleanItem);

  const stockItem = stockList.find(s => {
    const sName = (s.item_name || s.name || '').trim();
    const sEn = (s.name_en || '').trim();
    return sName.toLowerCase() === cleanItem.toLowerCase() ||
           getBaseName(sName) === cleanItemBase ||
           (sEn && sEn.toLowerCase() === cleanItem.toLowerCase());
  });

  if (!stockItem) {
    throw new Error(`Item "${cleanItem}" inventory me uplabdh nahi hai.`);
  }

  const currentStockQty = parseFloat(stockItem.current_stock || stockItem.stock || 0);
  if (currentStockQty < qty && !stockItem.is_service && stockItem.item_type !== 'SERVICE') {
    throw new Error(`Insufficient Stock! Uplabdh Stock: ${currentStockQty} ${stockItem.unit || 'Pcs'}`);
  }

  // Update physical stock balance (-OUT)
  const updatedItem = updateStockItemQuantity(activeFirmId, stockItem.item_name, -qty, 0);

  // 2. Resolve Master Customer Account Name
  const accounts = getFirmMasterAccounts(activeFirmId);
  const matchedCustomerAccount = accounts.find(a => 
    normalizeLedgerAccountMatch(cleanCustomer, a.account_name || a.name || '')
  );
  
  // Use official registered bilingual name if already present in ledger master
  const resolvedCustomerName = matchedCustomerAccount?.account_name || cleanCustomer;

  // 3. Prepare Structured Balanced Double-Entry Compound Entries
  const voucherEntries = [
    { 
      type: 'Dr', 
      account_name: resolvedCustomerName, 
      party: resolvedCustomerName,
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
    dr_account: resolvedCustomerName,
    cr_account: 'Sales & Revenue',
    narration: narration || `Sales Invoice #${invNumber}: ${updatedItem?.item_name || cleanItem} (${qty} ${updatedItem?.unit || 'Pcs'} @ ₹${rate})${vehicle_no ? ' - Vehicle: ' + vehicle_no : ''}`,
    is_compound: true,
    entries: voucherEntries,
    items: [
      {
        itemId: stockItem.id || `ITEM-${Date.now()}`,
        itemName: updatedItem?.item_name || stockItem.item_name,
        item_name: updatedItem?.item_name || stockItem.item_name,
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

  // 4. Post Atomically Through Master Posting Engine
  const savedVoucher = saveUniversalVoucher(activeFirmId, voucherPayload);

  // 5. Sync to Sales Invoice Storage Bucket
  const salesKey = `sales_invoices_${activeFirmId}`;
  const existingSales = JSON.parse(localStorage.getItem(salesKey) || '[]');
  const filteredSales = existingSales.filter(s => s && s.id !== invoiceId && s.reference_no !== invNumber);
  filteredSales.unshift(savedVoucher);
  localStorage.setItem(salesKey, JSON.stringify(filteredSales));
  localStorage.setItem(`app_invoices_${activeFirmId}`, JSON.stringify(filteredSales));

  // 6. Ensure Master Account Exists Without Generating Redundant Duplicates
  if (!matchedCustomerAccount) {
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
    party: resolvedCustomerName 
  };
};
