// frontend/src/utils/voucherPostingEngine.js

import { getAccountHeadsByFirm } from './accountMasterEngine.js';

// Calculate live balance for any specific account head
export const getAccountCurrentBalance = (firmId, accountId) => {
  const targetId = firmId || 'FIRM-001';
  const journalKey = `app_journal_entries_${targetId}`;
  const entries = JSON.parse(localStorage.getItem(journalKey) || '[]');
  
  const accounts = getAccountHeadsByFirm(targetId);
  const acc = accounts.find(a => a.id === accountId);
  let balance = parseFloat(acc?.opening_balance || 0);

  entries.forEach(entry => {
    const amt = parseFloat(entry.amount || 0);
    if (entry.debit_account_id === accountId) {
      balance += amt;
    }
    if (entry.credit_account_id === accountId) {
      balance -= amt;
    }
  });

  return balance;
};

// Centralized Voucher Engine with Rules & Negative Cash Warning Guard
export const postDoubleEntryVoucher = (firmId, payload) => {
  let targetId = firmId;
  if (!targetId) {
    const activeFirm = JSON.parse(localStorage.getItem('active_firm_profile') || '{}');
    targetId = activeFirm.id || 'FIRM-001';
  }

  const amount = parseFloat(payload.amount || 0);
  if (amount <= 0) {
    throw new Error("⚠️ Invalid Transaction Amount! Amount must be greater than ₹0.00");
  }

  if (payload.debit_account_id === payload.credit_account_id) {
    throw new Error("⚠️ Accounting Rule Violation! Debit Account and Credit Account cannot be the same.");
  }

  const accounts = getAccountHeadsByFirm(targetId);
  const debitAcc = accounts.find(a => a.id === payload.debit_account_id);
  const creditAcc = accounts.find(a => a.id === payload.credit_account_id);

  // Rule Guard: Check Negative Cash Balance
  if (creditAcc && creditAcc.group_type === 'CASH') {
    const currentCash = getAccountCurrentBalance(targetId, creditAcc.id);
    if (currentCash - amount < 0) {
      throw new Error(`⚠️ Negative Cash Warning! Inadequate Cash Balance. Current Available Cash: ₹${currentCash.toFixed(2)}, Attempted Transfer: ₹${amount.toFixed(2)}. Voucher Entry Rejected!`);
    }
  }

  // Accounting Rule Validation by Voucher Type
  if (payload.voucher_type === 'PAYMENT' && creditAcc && !['CASH', 'BANK'].includes(creditAcc.group_type)) {
    throw new Error("⚠️ Accounting Rule Violation! In a Payment Voucher, the Credit head must be Cash or Bank.");
  }

  if (payload.voucher_type === 'RECEIPT' && debitAcc && !['CASH', 'BANK'].includes(debitAcc.group_type)) {
    throw new Error("⚠️ Accounting Rule Violation! In a Receipt Voucher, the Debit head must be Cash or Bank.");
  }

  const journalKey = `app_journal_entries_${targetId}`;
  const existingEntries = JSON.parse(localStorage.getItem(journalKey) || '[]');

  const newEntry = {
    id: `VOUCH-${Date.now()}`,
    firm_id: targetId,
    voucher_type: payload.voucher_type,
    voucher_no: payload.voucher_no || `VCH-${Math.floor(1000 + Math.random() * 9000)}`,
    date: payload.date || new Date().toISOString().split('T')[0],
    debit_account_id: payload.debit_account_id,
    credit_account_id: payload.credit_account_id,
    debit_account_name: debitAcc?.name || 'Debit Head',
    credit_account_name: creditAcc?.name || 'Credit Head',
    amount: amount,
    narration: payload.narration || '',
    created_at: new Date().toISOString()
  };

  existingEntries.unshift(newEntry);
  localStorage.setItem(journalKey, JSON.stringify(existingEntries));

  // Trigger global system refresh event for Day Book, Ledger Milan & Reports
  window.dispatchEvent(new Event('storage'));
  return newEntry;
};
