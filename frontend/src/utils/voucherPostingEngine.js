// frontend/src/utils/voucherPostingEngine.js

/**
 * 1. RETRIEVE VOUCHERS BY FIRM (Chronological & Sorted Newest First)
 */
export const getUniversalVouchersByFirm = (firmId = 'FIRM-001') => {
  const vouchersKey = `app_vouchers_${firmId}`;
  const legacyKey = 'account_book_vouchers';
  try {
    const raw = localStorage.getItem(vouchersKey) || localStorage.getItem(legacyKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const firmFiltered = parsed.filter(v => v && (v.firm_id === firmId || v.firm_id === 'FIRM-001' || !v.firm_id));
        
        // Sort by date (newest first) and fallback to ID/timestamp descending
        firmFiltered.sort((a, b) => {
          const dateA = new Date(a.voucher_date || a.date || 0);
          const dateB = new Date(b.voucher_date || b.date || 0);
          if (dateA.getTime() !== dateB.getTime()) {
            return dateB - dateA; // Latest date first
          }
          // If dates are same, sort by creation/ID descending
          return String(b.id || '').localeCompare(String(a.id || ''));
        });

        return firmFiltered;
      }
    }
  } catch (e) {
    console.error('Error fetching vouchers for firm:', firmId, e);
  }
  return [];
};

/**
 * 2. POST OR UPDATE UNIVERSAL DOUBLE-ENTRY VOUCHER
 */
export const saveUniversalVoucher = (firmId = 'FIRM-001', voucherPayload = {}) => {
  const vouchersKey = `app_vouchers_${firmId}`;
  const legacyKey = 'account_book_vouchers';
  
  let existingVouchers = [];
  try {
    const primaryStored = localStorage.getItem(vouchersKey);
    const legacyStored = localStorage.getItem(legacyKey);
    const combined = [...JSON.parse(primaryStored || '[]'), ...JSON.parse(legacyStored || '[]')];
    
    // Deduplicate by ID
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
      firm_id: firmId,
      firmId: firmId,
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
      firm_id: firmId,
      firmId: firmId,
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
  localStorage.setItem(`account_book_vouchers_${firmId}`, JSON.stringify(existingVouchers));

  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  return finalVoucher;
};

/**
 * 3. ATOMIC VOUCHER DELETION
 */
export const deleteUniversalVoucher = (firmId = 'FIRM-001', voucherId = '') => {
  if (!voucherId) return false;

  const vouchersKey = `app_vouchers_${firmId}`;
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
  localStorage.setItem(`account_book_vouchers_${firmId}`, JSON.stringify(filtered));

  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  return true;
};
