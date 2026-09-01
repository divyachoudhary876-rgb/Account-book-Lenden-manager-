// frontend/src/utils/journalEngine.js

import { getAllUniversalVouchers } from './statementEngine.js';
import { getFirmMasterAccounts, saveMasterAccount } from './accountMasterEngine.js';

export const getFirmVouchers = (firmId = 'FIRM-001') => getAllUniversalVouchers(firmId);

export const saveUniversalVoucher = (firmId = 'FIRM-001', payload) => {
  const { voucher_date, voucher_type, dr_account, cr_account, amount, narration, reference_no } = payload;
  const numAmt = parseFloat(amount || 0);

  if (!dr_account || !cr_account || numAmt <= 0) {
    throw new Error("⚠️ Valid Debit Account, Credit Account, and Amount (>0) are required.");
  }

  const vouchers = getAllUniversalVouchers(firmId);
  const newVoucher = {
    id: payload.id || `VCH-${Date.now()}`,
    firm_id: firmId,
    voucher_date: voucher_date || new Date().toISOString().split('T')[0],
    date: voucher_date || new Date().toISOString().split('T')[0],
    voucher_type: (voucher_type || 'JOURNAL').toUpperCase(),
    dr_account: dr_account.trim(),
    cr_account: cr_account.trim(),
    amount: numAmt,
    reference_no: reference_no || `VCH-${Date.now()}`,
    narration: narration || '',
    created_at: new Date().toISOString()
  };

  vouchers.unshift(newVoucher);
  localStorage.setItem(`app_vouchers_${firmId}`, JSON.stringify(vouchers));

  const accounts = getFirmMasterAccounts(firmId);
  if (!accounts.some(a => a.account_name.toLowerCase() === dr_account.trim().toLowerCase())) {
    saveMasterAccount(firmId, { account_name: dr_account.trim(), primary_type: 'EXPENSES', sub_group: 'General Ledger' });
  }
  if (!accounts.some(a => a.account_name.toLowerCase() === cr_account.trim().toLowerCase())) {
    saveMasterAccount(firmId, { account_name: cr_account.trim(), primary_type: 'INCOME', sub_group: 'General Ledger' });
  }

  window.dispatchEvent(new Event('app_state_updated'));
  return newVoucher;
};
