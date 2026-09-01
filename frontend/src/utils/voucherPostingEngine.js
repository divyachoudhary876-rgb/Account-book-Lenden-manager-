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
 * Validates balance & posts new Double-Entry Voucher
 */
export const postUniversalVoucher = (firmId = 'FIRM-001', voucherData = {}) => {
  const {
    voucher_type = 'PAYMENT',
    dr_account = '',
    cr_account = '',
    amount = 0,
    voucher_date = new Date().toISOString().split('T')[0],
    reference_no = '',
    narration = ''
  } = voucherData;

  const numAmount = parseFloat(amount || 0);

  // 1. Double Entry Integrity Validations
  if (!dr_account.trim() || !cr_account.trim()) {
    throw new Error('⚠️ Dono Debit (Dr) aur Credit (Cr) accounts select karna anivarya hai.');
  }

  if (dr_account.trim().toLowerCase() === cr_account.trim().toLowerCase()) {
    throw new Error('⚠️ Debit aur Credit account same nahi ho sakte.');
  }

  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('⚠️ Voucher amount ₹0.00 se adhik hona chahiye.');
  }

  // 2. ZERO CASH GUARD (Negative Cash-in-Hand Prevention)
  const isCreditCash = cr_account.trim().toLowerCase().includes('cash');
  
  if (isCreditCash) {
    const cashStats = getAccountLiveBalance(firmId, cr_account);
    const availableCash = cashStats.netValue; // True positive liquid cash

    if (availableCash - numAmount < 0) {
      const shortfall = numAmount - availableCash;
      throw new Error(
        `⛔ Transaction Blocked: Insufficient Cash Balance!\n\n` +
        `• Available Cash-in-Hand: ₹${availableCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
        `• Payment Requested: ₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
        `• Shortfall: ₹${shortfall.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n\n` +
        `Cash balance zero se neeche nahi ja sakta. Pehle Cash Receipt enter karein.`
      );
    }
  }

  // 3. Normalized Voucher Object (Dual Party Compatibility)
  const newVoucher = {
    id: `VCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    firm_id: firmId,
    voucher_number: reference_no ? `VCH-${reference_no}` : `VCH-${Date.now().toString().slice(-6)}`,
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
    created_at: new Date().toISOString()
  };

  // 4. Save to Persistent Firm Storage
  const storageKey = `app_vouchers_${firmId}`;
  const existingVouchers = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const updatedVouchers = [newVoucher, ...existingVouchers];
  localStorage.setItem(storageKey, JSON.stringify(updatedVouchers));

  // 5. Reactive Trigger for Account Milan & Dashboard
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('voucher_created'));

  return newVoucher;
};
