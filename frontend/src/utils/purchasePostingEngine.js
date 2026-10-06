// frontend/src/utils/purchasePostingEngine.js

import { updateStockItemQuantity } from './stockInventoryEngine.js';
import { getFirmMasterAccounts, saveMasterAccount } from './accountMasterEngine.js';
import { saveUniversalVoucher } from './voucherPostingEngine.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

/**
 * Universal Unified Purchase Posting Engine
 * - Updates inventory stock quantities (+IN)
 * - Passes balanced compound double-entry purchase vouchers
 * - Handles both Credit (Supplier/Vendor) and Cash/Bank purchases safely without account distortion
 */
export const recordUnifiedPurchase = (firmId = 'FIRM-001', payload = {}) => {
  const activeFirmId = String(payload?.firmId || payload?.firm_id || firmId || 'FIRM-001').trim();
  const { supplier_account, item_name, quantity, unit_rate, voucher_date, invoice_number, narration, gst_rate } = payload;
  
  const qty = parseFloat(quantity || 0);
  const rate = parseFloat(unit_rate || 0);
  const gstRateVal = parseFloat(gst_rate || 0);

  const taxableAmount = round2(qty * rate);
  const gstAmount = round2((taxableAmount * gstRateVal) / 100);
  const totalAmount = round2(taxableAmount + gstAmount);
  
  const vDate = voucher_date || new Date().toISOString().split('T')[0];
  const cleanItem = (item_name || 'Diesel').trim();
  const cleanSupplier = (supplier_account || '').trim();

  if (!cleanSupplier || qty <= 0 || rate <= 0) {
    throw new Error("Supplier / Cash Party, Quantity (>0) aur Purchase Rate (>0) darj karna anivarya hai.");
  }

  // 1. Update Stock Quantity (+IN) in Inventory
  const updatedItem = updateStockItemQuantity(activeFirmId, cleanItem, qty, rate);

  // 2. Head Classification
  const expenseHead = cleanItem.toLowerCase().includes('diesel') 
    ? 'Tractor Diesel & Running Expense' 
    : 'Purchase Raw Material Account';

  // 3. Balanced Compound Double-Entry Lines
  const voucherEntries = [
    { 
      type: 'Dr', 
      account_name: expenseHead, 
      party: expenseHead,
      amount: taxableAmount, 
      debit: taxableAmount, 
      credit: 0 
    }
  ];

  if (gstAmount > 0) {
    voucherEntries.push({
      type: 'Dr',
      account_name: 'Duties & Taxes (GST Input Credit)',
      party: 'Duties & Taxes (GST Input Credit)',
      amount: gstAmount,
      debit: gstAmount,
      credit: 0
    });
  }

  // Credit Party: Cash in Hand / Bank / Sundry Creditor
  voucherEntries.push({ 
    type: 'Cr', 
    account_name: cleanSupplier, 
    party: cleanSupplier,
    amount: totalAmount, 
    debit: 0, 
    credit: totalAmount 
  });

  const purchaseId = payload.id || `PUR-${Date.now()}`;
  const billNumber = invoice_number || `BILL-${Date.now().toString().slice(-4)}`;

  const voucherPayload = {
    id: purchaseId,
    firm_id: activeFirmId,
    firmId: activeFirmId,
    voucher_number: billNumber,
    reference_no: billNumber,
    voucher_date: vDate,
    date: vDate,
    voucher_type: 'PURCHASE',
    type: 'PURCHASE',
    amount: totalAmount,
    total_amount: totalAmount,
    total_taxable: taxableAmount,
    narration: narration || `Purchase Inward Bill #${billNumber}: ${cleanItem} (${qty} ${updatedItem?.unit || 'Pcs'} @ ₹${rate}) from ${cleanSupplier}`,
    is_compound: true,
    entries: voucherEntries,
    items: [
      {
        itemId: updatedItem?.id || `ITEM-${Date.now()}`,
        itemName: cleanItem,
        item_name: cleanItem,
        unit: updatedItem?.unit || (cleanItem.toLowerCase().includes('diesel') ? 'Liters' : 'Pcs'),
        quantity: qty,
        qty: qty,
        rate: rate,
        unit_rate: rate,
        gstRate: gstRateVal,
        taxableAmount: taxableAmount,
        total: totalAmount
      }
    ]
  };

  // 4. Atomic Save Through Universal Voucher Engine
  const savedVoucher = saveUniversalVoucher(activeFirmId, voucherPayload);

  // 5. Sync to Purchase Bills Storage Bucket
  const purchaseKey = `purchase_bills_${activeFirmId}`;
  const existingPurchases = JSON.parse(localStorage.getItem(purchaseKey) || '[]');
  const filteredPurchases = existingPurchases.filter(p => p && p.id !== purchaseId && p.reference_no !== billNumber);
  filteredPurchases.unshift(savedVoucher);
  localStorage.setItem(purchaseKey, JSON.stringify(filteredPurchases));
  localStorage.setItem(`app_purchase_bills_${activeFirmId}`, JSON.stringify(filteredPurchases));

  // 6. Ensure Ledger Heads are Registered in Account Master with Strict Accounting Head Safety
  const accounts = getFirmMasterAccounts(activeFirmId) || [];
  const sLower = cleanSupplier.toLowerCase();
  const isCash = sLower.includes('cash') || sLower.includes('रोकड़');
  const isBank = sLower.includes('bank') || sLower.includes('बैंक');

  if (!accounts.some(a => (a.account_name || a.name || '').trim().toLowerCase() === cleanSupplier.toLowerCase())) {
    if (isCash) {
      saveMasterAccount(activeFirmId, { 
        account_name: cleanSupplier, 
        primary_type: 'ASSETS', 
        type: 'Assets',
        sub_group: 'Cash & Cash Equivalents (रोकड़)', 
        balance_type: 'Dr' 
      });
    } else if (isBank) {
      saveMasterAccount(activeFirmId, { 
        account_name: cleanSupplier, 
        primary_type: 'ASSETS', 
        type: 'Assets',
        sub_group: 'Bank Accounts (बैंक खाते)', 
        balance_type: 'Dr' 
      });
    } else {
      saveMasterAccount(activeFirmId, { 
        account_name: cleanSupplier, 
        primary_type: 'LIABILITIES', 
        type: 'Liabilities',
        sub_group: 'Sundry Creditors (Suppliers / Vendors)', 
        balance_type: 'Cr' 
      });
    }
  }

  // Ensure Expense Head is Registered as DR EXPENSE
  if (!accounts.some(a => (a.account_name || a.name || '').trim().toLowerCase() === expenseHead.toLowerCase())) {
    saveMasterAccount(activeFirmId, { 
      account_name: expenseHead, 
      primary_type: 'EXPENSES', 
      type: 'Expenses',
      sub_group: 'Raw Material Consumed', 
      balance_type: 'Dr' 
    });
  }

  // 7. Global State Synchronization Broadcast
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));

  return { 
    voucherId: savedVoucher.id, 
    totalAmount, 
    updatedStock: updatedItem?.current_stock || 0, 
    party: cleanSupplier 
  };
};
