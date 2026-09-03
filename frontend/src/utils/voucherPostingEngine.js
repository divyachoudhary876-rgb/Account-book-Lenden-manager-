// frontend/src/utils/voucherPostingEngine.js

/**
 * 1. RETRIEVE VOUCHERS BY FIRM (Chronological & Backward-Compatible)
 */
export const getUniversalVouchersByFirm = (firmId = 'FIRM-001') => {
  const vouchersKey = `app_vouchers_${firmId}`;
  try {
    const raw = localStorage.getItem(vouchersKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Return cloned array in reverse chronological order (newest first)
        return [...parsed].reverse();
      }
    }
  } catch (e) {
    console.error('Error fetching vouchers for firm:', firmId, e);
  }
  return [];
};

/**
 * 2. POST OR UPDATE UNIVERSAL DOUBLE-ENTRY VOUCHER
 * Supports simple (1 Dr : 1 Cr) and compound entries with mathematical balance enforcement
 */
export const saveUniversalVoucher = (firmId = 'FIRM-001', voucherPayload = {}) => {
  const vouchersKey = `app_vouchers_${firmId}`;
  let existingVouchers = [];
  try {
    existingVouchers = JSON.parse(localStorage.getItem(vouchersKey) || '[]');
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

  // Compound Entry Processing
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
      firm_id: firmId,
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
    // Simple 1 Dr : 1 Cr Processing
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
      firm_id: firmId,
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

  // Check if updating an existing voucher or inserting a new one
  const existingIdx = existingVouchers.findIndex(v => v.id === finalVoucher.id);
  if (existingIdx !== -1) {
    existingVouchers[existingIdx] = finalVoucher;
  } else {
    existingVouchers.push(finalVoucher);
  }

  localStorage.setItem(vouchersKey, JSON.stringify(existingVouchers));

  // Dispatch global state change event for real-time reactivity
  window.dispatchEvent(new Event('app_state_updated'));
  return finalVoucher;
};

/**
 * 3. ATOMIC VOUCHER DELETION
 * Safely removes transaction and triggers global ledger re-indexing
 */
export const deleteUniversalVoucher = (firmId = 'FIRM-001', voucherId = '') => {
  if (!voucherId) return false;

  const vouchersKey = `app_vouchers_${firmId}`;
  let existingVouchers = [];
  try {
    existingVouchers = JSON.parse(localStorage.getItem(vouchersKey) || '[]');
  } catch (e) {
    existingVouchers = [];
  }

  const initialCount = existingVouchers.length;
  const filtered = existingVouchers.filter(v => v.id !== voucherId);

  if (filtered.length === initialCount) {
    throw new Error('Voucher ID not found for deletion.');
  }

  localStorage.setItem(vouchersKey, JSON.stringify(filtered));
  window.dispatchEvent(new Event('app_state_updated'));
  return true;
};
