// frontend/src/utils/voucherPostingEngine.js
import { StorageService } from './storageSync';

/**
 * 1. RETRIEVE ALL VOUCHERS BY FIRM (Comprehensive Multi-Source Universal Scanner)
 * Scans Vouchers, Sales Invoices, Purchase Bills, Payroll, Consumption & Production
 */
export const getUniversalVouchersByFirm = (firmId = 'FIRM-001') => {
  const activeFirm = firmId || 'FIRM-001';
  let rawTx = [];

  // All possible storage keys across different modules
  const keysToScan = [
    `app_vouchers_${activeFirm}`,
    `account_book_vouchers_${activeFirm}`,
    `app_invoices_${activeFirm}`,
    `app_payroll_entries_${activeFirm}`,
    `material_consumption_records_${activeFirm}`,
    `production_batches_${activeFirm}`,
    'app_vouchers',
    'account_book_vouchers',
    'app_invoices',
    'app_payroll_entries',
    'material_consumption_records',
    'production_batches'
  ];

  keysToScan.forEach(k => {
    try {
      const val = StorageService.getItem ? StorageService.getItem(k) : JSON.parse(localStorage.getItem(k) || '[]');
      if (Array.isArray(val)) {
        rawTx.push(...val);
      } else if (val && typeof val === 'object') {
        Object.values(val).forEach(sub => {
          if (Array.isArray(sub)) rawTx.push(...sub);
        });
      }
    } catch (e) {}
  });

  // Deep scan localStorage for any backup or firm-scoped keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('voucher') || key.includes('invoice') || key.includes('payroll') || key.includes('consumption') || key.includes('production') || key.includes('book'))) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) rawTx.push(...parsed);
        } catch (e) {}
      }
    }
  }

  const uniqueMap = new Map();

  rawTx.forEach(tx => {
    if (!tx) return;
    const vFirm = tx.firm_id || tx.firmId || activeFirm;
    if (vFirm !== activeFirm && vFirm !== 'FIRM-001' && activeFirm !== 'FIRM-001') return;

    const uId = tx.id || tx.reference_no || tx.invoice_number || `${tx.voucher_date || tx.date || '2026-04-01'}-${tx.amount || tx.total_amount || 0}-${Math.random()}`;
    
    if (!uniqueMap.has(uId)) {
      let vType = String(tx.voucher_type || tx.type || 'JV').toUpperCase();
      if (tx.produced_qty) vType = 'PRODUCTION';
      else if (tx.uses_for) vType = 'CONSUMPTION';
      else if (tx.worker && tx.expense_ledger) vType = 'PAYROLL';

      let drAcc = tx.dr_account || tx.debit_account || tx.customer_id || tx.dr_party || '';
      let crAcc = tx.cr_account || tx.credit_account || tx.supplierId || tx.cr_party || '';
      let amt = Number(tx.amount || tx.total_amount || tx.total_cost || 0);

      if (vType === 'SALES') {
        drAcc = tx.dr_account || tx.customer_id || 'Customer Party';
        crAcc = 'Sales & Revenue';
        amt = Number(amt || tx.taxable_amount || 0);
      } else if (vType === 'PURCHASE') {
        drAcc = tx.dr_account || 'Purchase Account';
        crAcc = tx.cr_account || tx.supplierId || 'Supplier Vendor';
        amt = Number(amt || 0);
      } else if (vType === 'CONSUMPTION') {
        drAcc = `Consumption (${tx.uses_for || 'General'})`;
        crAcc = 'Inventory Stock';
        amt = (tx.items || []).reduce((s, i) => s + (Number(i.qty || i.quantity || 0) * Number(i.rate || 0)), 0);
      } else if (vType === 'PRODUCTION') {
        drAcc = 'Finished Goods Inventory';
        crAcc = `Production (${tx.location || 'Batch'})`;
        amt = Number(tx.total_cost || 0);
      } else if (vType === 'PAYROLL') {
        drAcc = tx.expense_ledger || 'Wages Expense';
        crAcc = tx.worker || 'Worker Account';
        amt = Number(tx.total_amount || 0);
      }

      uniqueMap.set(uId, {
        ...tx,
        id: uId,
        voucher_date: tx.voucher_date || tx.date || new Date().toISOString().split('T')[0],
        voucher_type: vType,
        type: vType,
        reference_no: tx.reference_no || tx.voucher_number || tx.invoice_number || uId.slice(-6),
        dr_account: drAcc || 'General Ledger',
        cr_account: crAcc || 'General Ledger',
        amount: amt
      });
    }
  });

  const formattedList = Array.from(uniqueMap.values());

  // Sort by date (newest first) and fallback to ID descending
  formattedList.sort((a, b) => {
    const dateA = new Date(a.voucher_date || a.date || 0);
    const dateB = new Date(b.voucher_date || b.date || 0);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateB - dateA; // Latest date first
    }
    return String(b.id || '').localeCompare(String(a.id || ''));
  });

  return formattedList;
};

/**
 * 2. POST OR UPDATE UNIVERSAL DOUBLE-ENTRY VOUCHER
 */
export const saveUniversalVoucher = (firmId = 'FIRM-001', voucherPayload = {}) => {
  const activeFirm = firmId || 'FIRM-001';
  const vouchersKey = `app_vouchers_${activeFirm}`;
  const legacyKey = 'account_book_vouchers';
  
  let existingVouchers = [];
  try {
    const primaryStored = localStorage.getItem(vouchersKey);
    const legacyStored = localStorage.getItem(legacyKey);
    const combined = [...JSON.parse(primaryStored || '[]'), ...JSON.parse(legacyStored || '[]')];
    
    const map = new Map();
    combined.forEach(v => {
      if (v && v.id) map.set(v.id, v);
    });
    existingVouchers = Array.from(map.values());
  } catch (e) {
    existingVouchers = [];
  }

  const {
    id = null,
    voucher_type = 'PAYMENT',
    voucher_date = new Date().toISOString().split('T')[0],
    reference_no = '',
    narration = '',
    dr_account = '',
    cr_account = '',
    amount = 0,
    is_compound = false,
    entries = []
  } = voucherPayload;

  const vchNumber = (reference_no || '').trim() || `${voucher_type.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  let finalVoucher = null;

  if (is_compound && Array.isArray(entries) && entries.length > 0) {
    let totalDr = 0;
    let totalCr = 0;

    entries.forEach((entry) => {
      const val = parseFloat(entry.amount || 0);
      if (entry.type === 'Dr') totalDr += val;
      if (entry.type === 'Cr') totalCr += val;
    });

    if (Math.abs(totalDr - totalCr) > 0.01) {
      throw new Error(`⛔ Unbalanced Voucher! Total Debit (₹${totalDr.toFixed(2)}) does not equal Total Credit (₹${totalCr.toFixed(2)}).`);
    }

    finalVoucher = {
      id: id || `VCH-${Date.now()}`,
      firm_id: activeFirm,
      firmId: activeFirm,
      voucher_number: vchNumber,
      voucher_date,
      date: voucher_date,
      voucher_type: voucher_type.toUpperCase(),
      type: voucher_type.toUpperCase(),
      reference_no: vchNumber,
      narration: (narration || '').trim(),
      amount: parseFloat(totalDr.toFixed(2)),
      is_compound: true,
      entries,
      dr_account: entries.filter(e => e.type === 'Dr').map(e => e.account_name).join(', '),
      cr_account: entries.filter(e => e.type === 'Cr').map(e => e.account_name).join(', '),
      updated_at: new Date().toISOString()
    };
  } else {
    const cleanAmt = parseFloat(amount || 0);
    if (!cleanAmt || cleanAmt <= 0) {
      throw new Error('Transaction amount must be greater than zero.');
    }
    if (!dr_account || !dr_account.trim()) {
      throw new Error('Debit Account (नामे) is mandatory.');
    }
    if (!cr_account || !cr_account.trim()) {
      throw new Error('Credit Account (जमा) is mandatory.');
    }
    if (dr_account.trim().toLowerCase() === cr_account.trim().toLowerCase()) {
      throw new Error('Debit and Credit cannot be the same ledger account.');
    }

    finalVoucher = {
      id: id || `VCH-${Date.now()}`,
      firm_id: activeFirm,
      firmId: activeFirm,
      voucher_number: vchNumber,
      voucher_date,
      date: voucher_date,
      voucher_type: voucher_type.toUpperCase(),
      type: voucher_type.toUpperCase(),
      reference_no: vchNumber,
      narration: (narration || '').trim(),
      amount: cleanAmt,
      is_compound: false,
      dr_account: dr_account.trim(),
      cr_account: cr_account.trim(),
      entries: [
        { type: 'Dr', account_name: dr_account.trim(), amount: cleanAmt },
        { type: 'Cr', account_name: cr_account.trim(), amount: cleanAmt }
      ],
      updated_at: new Date().toISOString()
    };
  }

  const existingIdx = existingVouchers.findIndex(v => v.id === finalVoucher.id);
  if (existingIdx !== -1) {
    existingVouchers[existingIdx] = finalVoucher;
  } else {
    existingVouchers.push(finalVoucher);
  }

  localStorage.setItem(vouchersKey, JSON.stringify(existingVouchers));
  localStorage.setItem(legacyKey, JSON.stringify(existingVouchers));
  localStorage.setItem(`account_book_vouchers_${activeFirm}`, JSON.stringify(existingVouchers));

  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  return finalVoucher;
};

/**
 * 3. ATOMIC VOUCHER DELETION
 */
export const deleteUniversalVoucher = (firmId = 'FIRM-001', voucherId = '') => {
  if (!voucherId) return false;

  const activeFirm = firmId || 'FIRM-001';
  const vouchersKey = `app_vouchers_${activeFirm}`;
  const legacyKey = 'account_book_vouchers';
  
  let existingVouchers = [];
  try {
    const primaryStored = localStorage.getItem(vouchersKey);
    const legacyStored = localStorage.getItem(legacyKey);
    const combined = [...JSON.parse(primaryStored || '[]'), ...JSON.parse(legacyStored || '[]')];
    
    const map = new Map();
    combined.forEach(v => {
      if (v && v.id) map.set(v.id, v);
    });
    existingVouchers = Array.from(map.values());
  } catch (e) {
    existingVouchers = [];
  }

  const initialCount = existingVouchers.length;
  const filtered = existingVouchers.filter(v => v.id !== voucherId && v.reference_no !== voucherId);

  if (filtered.length === initialCount) {
    throw new Error('Voucher ID not found for deletion.');
  }

  localStorage.setItem(vouchersKey, JSON.stringify(filtered));
  localStorage.setItem(legacyKey, JSON.stringify(filtered));
  localStorage.setItem(`account_book_vouchers_${activeFirm}`, JSON.stringify(filtered));

  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  return true;
};
