// frontend/src/utils/voucherPostingEngine.js

// Universal helper to normalize bilingual and legacy account names for ledger aggregation
export const normalizeLedgerAccountMatch = (targetAccount = '', candidateAccount = '') => {
  if (!targetAccount || !candidateAccount) return false;
  const t = String(targetAccount).trim().toLowerCase();
  const c = String(candidateAccount).trim().toLowerCase();
  if (t === c) return true;

  // Strip brackets and Hindi characters to compare core Roman base name
  const stripHi = (s) => s.replace(/\s*\([\u0900-\u097F\s]+\)/g, '').trim();
  const cleanT = stripHi(t);
  const cleanC = stripHi(c);

  return cleanT === cleanC;
};

/**
 * 1. RETRIEVE VOUCHERS BY FIRM (Strictly Scoped & Firm Isolated)
 */
export const getUniversalVouchersByFirm = (firmId = 'FIRM-001') => {
  const activeFirmId = String(firmId || 'FIRM-001').trim();
  const vouchersKey = `app_vouchers_${activeFirmId}`;
  const scopedBookKey = `account_book_vouchers_${activeFirmId}`;

  try {
    const rawPrimary = localStorage.getItem(vouchersKey);
    const rawScoped = localStorage.getItem(scopedBookKey);
    
    const combined = [...JSON.parse(rawPrimary || '[]'), ...JSON.parse(rawScoped || '[]')];
    if (combined.length > 0) {
      const map = new Map();
      combined.forEach(v => {
        if (v && v.id) map.set(v.id, v);
      });

      // STRICT EQUALITY: Multi-firm isolation preserved
      const firmFiltered = Array.from(map.values()).filter(v => {
        if (!v) return false;
        const vFirm = String(v.firm_id || v.firmId || '').trim();
        return !vFirm || vFirm === activeFirmId;
      });
      
      firmFiltered.sort((a, b) => {
        const dateA = new Date(a.voucher_date || a.date || 0);
        const dateB = new Date(b.voucher_date || b.date || 0);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateB - dateA;
        }
        return String(b.id || '').localeCompare(String(a.id || ''));
      });

      return firmFiltered;
    }
  } catch (e) {
    console.error('Error fetching vouchers for firm:', activeFirmId, e);
  }
  return [];
};

/**
 * Helper: Auto-calculate next sequential number (1, 2, 3...) for each voucher type
 */
const getNextSequentialNumber = (existingVouchers, vType) => {
  let maxNum = 0;
  const prefix = vType === 'PAYMENT' ? 'PAY' :
                 vType === 'RECEIPT' ? 'REC' :
                 vType === 'JOURNAL' ? 'JV' :
                 vType === 'CONTRA' ? 'CONTRA' :
                 vType === 'PURCHASE' ? 'PUR' : 'VCH';

  (existingVouchers || []).forEach(v => {
    if (!v) return;
    const type = String(v.voucher_type || v.type || '').toUpperCase();
    if (type === vType || type.includes(prefix)) {
      const ref = String(v.reference_no || v.voucher_number || '').trim();
      const match = ref.match(/\d+/g);
      if (match) {
        const val = parseInt(match[match.length - 1], 10);
        if (!isNaN(val) && val > maxNum && val < 1000000) {
          maxNum = val;
        }
      }
    }
  });

  return `${prefix}-${maxNum + 1}`;
};

/**
 * 2. POST OR UPDATE UNIVERSAL DOUBLE-ENTRY VOUCHER
 */
export const saveUniversalVoucher = (firmId = 'FIRM-001', voucherPayload = {}) => {
  const activeFirmId = String(firmId || 'FIRM-001').trim();
  const vouchersKey = `app_vouchers_${activeFirmId}`;
  const scopedBookKey = `account_book_vouchers_${activeFirmId}`;
  
  let existingVouchers = [];
  try {
    const primaryStored = localStorage.getItem(vouchersKey);
    const scopedStored = localStorage.getItem(scopedBookKey);
    const combined = [...JSON.parse(primaryStored || '[]'), ...JSON.parse(scopedStored || '[]')];
    
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

  const normalizedType = voucher_type.toUpperCase();
  const cleanRef = (reference_no || '').trim();
  
  // Clean sequential number assignment (e.g., PAY-1, REC-1, JV-1)
  const vchNumber = cleanRef && !cleanRef.includes('MAT-ADJ') && !cleanRef.includes('BILL-') 
    ? cleanRef 
    : getNextSequentialNumber(existingVouchers, normalizedType);

  let finalVoucher = null;

  if (is_compound && Array.isArray(entries) && entries.length > 0) {
    let totalDr = 0;
    let totalCr = 0;

    entries.forEach((entry) => {
      const val = parseFloat(entry.amount || entry.debit || entry.credit || 0);
      if (entry.type === 'Dr' || entry.type === 'DR') totalDr += val;
      if (entry.type === 'Cr' || entry.type === 'CR') totalCr += val;
    });

    if (Math.abs(totalDr - totalCr) > 0.01) {
      throw new Error(`⛔ Unbalanced Voucher! Total Debit (₹${totalDr.toFixed(2)}) does not equal Total Credit (₹${totalCr.toFixed(2)}).`);
    }

    finalVoucher = {
      id: id || `VCH-${Date.now()}`,
      firm_id: activeFirmId,
      firmId: activeFirmId,
      voucher_number: vchNumber,
      voucher_date,
      date: voucher_date,
      voucher_type: normalizedType,
      type: normalizedType,
      reference_no: vchNumber,
      narration: (narration || '').trim(),
      amount: parseFloat(totalDr.toFixed(2)),
      is_compound: true,
      entries,
      dr_account: entries.filter(e => e.type === 'Dr' || e.type === 'DR').map(e => e.account_name || e.party).join(', '),
      cr_account: entries.filter(e => e.type === 'Cr' || e.type === 'CR').map(e => e.account_name || e.party).join(', '),
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
    if (normalizeLedgerAccountMatch(dr_account, cr_account)) {
      throw new Error('Debit and Credit cannot be the same ledger account.');
    }

    finalVoucher = {
      id: id || `VCH-${Date.now()}`,
      firm_id: activeFirmId,
      firmId: activeFirmId,
      voucher_number: vchNumber,
      voucher_date,
      date: voucher_date,
      voucher_type: normalizedType,
      type: normalizedType,
      reference_no: vchNumber,
      narration: (narration || '').trim(),
      amount: cleanAmt,
      is_compound: false,
      dr_account: dr_account.trim(),
      cr_account: cr_account.trim(),
      entries: [
        { type: 'Dr', account_name: dr_account.trim(), amount: cleanAmt, debit: cleanAmt, credit: 0 },
        { type: 'Cr', account_name: cr_account.trim(), amount: cleanAmt, debit: 0, credit: cleanAmt }
      ],
      updated_at: new Date().toISOString()
    };
  }

  const existingIdx = existingVouchers.findIndex(v => v && String(v.id) === String(finalVoucher.id));
  if (existingIdx !== -1) {
    existingVouchers[existingIdx] = finalVoucher;
  } else {
    existingVouchers.push(finalVoucher);
  }

  // Save STRICTLY to firm-scoped keys only
  localStorage.setItem(vouchersKey, JSON.stringify(existingVouchers));
  localStorage.setItem(scopedBookKey, JSON.stringify(existingVouchers));

  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));
  return finalVoucher;
};

/**
 * 3. ATOMIC VOUCHER DELETION
 */
export const deleteUniversalVoucher = (firmId = 'FIRM-001', voucherId = '') => {
  if (!voucherId) return false;

  const activeFirmId = String(firmId || 'FIRM-001').trim();
  const vouchersKey = `app_vouchers_${activeFirmId}`;
  const scopedBookKey = `account_book_vouchers_${activeFirmId}`;
  
  let existingVouchers = [];
  try {
    const primaryStored = localStorage.getItem(vouchersKey);
    const scopedStored = localStorage.getItem(scopedBookKey);
    const combined = [...JSON.parse(primaryStored || '[]'), ...JSON.parse(scopedStored || '[]')];
    
    const map = new Map();
    combined.forEach(v => {
      if (v && v.id) map.set(v.id, v);
    });
    existingVouchers = Array.from(map.values());
  } catch (e) {
    existingVouchers = [];
  }

  const initialCount = existingVouchers.length;
  const filtered = existingVouchers.filter(v => v && String(v.id) !== String(voucherId) && String(v.reference_no) !== String(voucherId));

  if (filtered.length === initialCount) {
    throw new Error('Voucher ID not found for deletion.');
  }

  localStorage.setItem(vouchersKey, JSON.stringify(filtered));
  localStorage.setItem(scopedBookKey, JSON.stringify(filtered));

  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));
  return true;
};
