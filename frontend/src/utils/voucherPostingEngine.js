// frontend/src/utils/voucherPostingEngine.js

import { getAccountStatement } from './statementEngine.js';

/**
 * Calculates instantaneous live balance of any ledger account head
 */
export const getAccountLiveBalance = (firmId = 'FIRM-001', accountName = 'Cash-in-Hand') => {
  const statement = getAccountStatement(firmId, accountName);
  return {
    closingBalance: statement.closingBalance || 0,
    balanceType: statement.closingBalanceType || 'Dr',
    netValue: statement.closingBalanceType === 'Dr' ? statement.closingBalance : -statement.closingBalance
  };
};

/**
 * Retrieve all vouchers for a firm
 */
export const getAllFirmVouchers = (firmId = 'FIRM-001') => {
  try {
    const raw = localStorage.getItem(`app_vouchers_${firmId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Validates & posts a New Voucher or Updates an Existing Voucher
 */
export const saveUniversalVoucher = (firmId = 'FIRM-001', voucherData = {}) => {
  const {
    id = null, // If present, it represents EDIT MODE
    voucher_type = 'PAYMENT',
    dr_account = '',
    cr_account = '',
    amount = 0,
    voucher_date = new Date().toISOString().split('T')[0],
    reference_no = '',
    narration = ''
  } = voucherData;

  const numAmount = parseFloat(amount || 0);

  // 1. Basic Double-Entry Validations
  if (!dr_account.trim() || !cr_account.trim()) {
    throw new Error('⚠️ Debit (Dr) aur Credit (Cr) dono account select karna zaroori hai.');
  }

  if (dr_account.trim().toLowerCase() === cr_account.trim().toLowerCase()) {
    throw new Error('⚠️ Debit aur Credit account same nahi ho sakte.');
  }

  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('⚠️ Voucher amount ₹0.00 se zyada hona chahiye.');
  }

  const storageKey = `app_vouchers_${firmId}`;
  const existingVouchers = getAllFirmVouchers(firmId);
  const isEditing = Boolean(id);

  // 2. NEGATIVE CASH-IN-HAND GUARD (Zero Balance Protection on Edit & Create)
  const isCreditCash = cr_account.trim().toLowerCase().includes('cash');
  
  if (isCreditCash) {
    const cashStats = getAccountLiveBalance(firmId, cr_account);
    let effectiveAvailableCash = cashStats.netValue;

    // Agar edit ho raha hai, toh purana credited amount wapas add karke check karenge
    if (isEditing) {
      const oldVoucher = existingVouchers.find(v => v.id === id);
      if (oldVoucher && (oldVoucher.cr_account || '').trim().toLowerCase().includes('cash')) {
        effectiveAvailableCash += parseFloat(oldVoucher.amount || 0);
      }
    }

    if (effectiveAvailableCash - numAmount < 0) {
      const shortfall = numAmount - effectiveAvailableCash;
      throw new Error(
        `⛔ Transaction Blocked: Insufficient Cash Balance!\n\n` +
        `• Available Cash-in-Hand: ₹${effectiveAvailableCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
        `• Required Cash Outflow: ₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
        `• Shortfall: ₹${shortfall.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n\n` +
        `Cash balance zero se neeche nahi ja sakta.`
      );
    }
  }

  // 3. Payload Construction
  const voucherPayload = {
    id: id || `VCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    firm_id: firmId,
    voucher_number: reference_no ? `VCH-${reference_no}` : (isEditing ? voucherData.voucher_number : `VCH-${Date.now().toString().slice(-6)}`),
    voucher_date: voucher_date,
    date: voucher_date,
    voucher_type: voucher_type.toUpperCase(),
    type: voucher_type.toUpperCase(),
    dr_account: dr_account.trim(),
    cr_account: cr_account.trim(),
    dr_party: dr_account.trim(),
    cr_party: cr_account.trim(),
    amount: numAmount,
    reference_no: reference_no.trim() || `REF-${Date.now().toString().slice(-4)}`,
    narration: narration.trim() || `${voucher_type} Entry`,
    updated_at: new Date().toISOString(),
    created_at: voucherData.created_at || new Date().toISOString()
  };

  // 4. Persistence Execution
  let updatedList = [];
  if (isEditing) {
    updatedList = existingVouchers.map(v => v.id === id ? voucherPayload : v);
  } else {
    updatedList = [voucherPayload, ...existingVouchers];
  }

  localStorage.setItem(storageKey, JSON.stringify(updatedList));

  // 5. Reactive Events
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('voucher_created'));

  return voucherPayload;
};

/**
 * Delete a Voucher with automatic ledger rollback
 */
export const deleteUniversalVoucher = (firmId = 'FIRM-001', voucherId = '') => {
  const storageKey = `app_vouchers_${firmId}`;
  const existing = getAllFirmVouchers(firmId);
  const filtered = existing.filter(v => v.id !== voucherId);

  localStorage.setItem(storageKey, JSON.stringify(filtered));
  window.dispatchEvent(new Event('app_state_updated'));
  return true;
};

// Aliases for compatibility
export const postUniversalVoucher = saveUniversalVoucher;
