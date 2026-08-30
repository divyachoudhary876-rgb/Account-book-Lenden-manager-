// frontend/src/utils/voucherPostingEngine.js

export const postDoubleEntryVoucher = (firmId, voucherPayload) => {
  let targetId = firmId;
  if (!targetId) {
    const activeFirm = JSON.parse(localStorage.getItem('active_firm_profile') || '{}');
    targetId = activeFirm.id || 'FIRM-001';
  }

  const key = `app_journal_entries_${targetId}`;
  const existingEntries = JSON.parse(localStorage.getItem(key) || '[]');

  const entry = {
    id: `VOUCH-${Date.now()}`,
    firm_id: targetId,
    voucher_type: voucherPayload.voucher_type, // 'JOURNAL', 'PAYMENT', 'RECEIPT', 'CONTRA'
    voucher_no: voucherPayload.voucher_no || `VCH-${Math.floor(1000 + Math.random() * 9000)}`,
    date: voucherPayload.date || new Date().toISOString().split('T')[0],
    debit_account_id: voucherPayload.debit_account_id,
    credit_account_id: voucherPayload.credit_account_id,
    amount: parseFloat(voucherPayload.amount),
    narration: voucherPayload.narration || '',
    created_at: new Date().toISOString()
  };

  existingEntries.unshift(entry);
  localStorage.setItem(key, JSON.stringify(existingEntries));
  
  // Trigger system-wide live state updates
  window.dispatchEvent(new Event('storage'));
  return entry;
};

// Fetch account specific statement ledger entries (Account Statement / Khata)
export const getAccountStatementLedger = (firmId, accountId) => {
  let targetId = firmId;
  if (!targetId) {
    const activeFirm = JSON.parse(localStorage.getItem('active_firm_profile') || '{}');
    targetId = activeFirm.id || 'FIRM-001';
  }

  const journalKey = `app_journal_entries_${targetId}`;
  const entries = JSON.parse(localStorage.getItem(journalKey) || '[]');

  return entries.filter(e => e.debit_account_id === accountId || e.credit_account_id === accountId);
};
