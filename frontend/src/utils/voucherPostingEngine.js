// frontend/src/utils/voucherPostingEngine.js

export const processCompoundVoucherSubmission = (firmId, payload) => {
  const targetId = firmId || 'FIRM-001';
  const { voucher_date, voucher_type, debit_lines, credit_lines, narration } = payload;

  if (!debit_lines || debit_lines.length === 0) throw new Error("⚠️ Kam se kam ek Debit Line honi chahiye.");
  if (!credit_lines || credit_lines.length === 0) throw new Error("⚠️ Kam se kam ek Credit Line honi chahiye.");

  // Calculate Totals
  const totalDebit = debit_lines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0);
  const totalCredit = credit_lines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0);

  // Strict Balanced Double-Entry Rule Check
  const diff = Math.abs(totalDebit - totalCredit);
  if (diff > 0.01) {
    throw new Error(`⚠️ Unbalanced Journal Entry! Total Debit (₹${totalDebit.toFixed(2)}) aur Total Credit (₹${totalCredit.toFixed(2)}) match nahi kar rahe hain. Difference: ₹${diff.toFixed(2)}`);
  }

  const key = `app_vouchers_${targetId}`;
  let vouchers = [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) vouchers = JSON.parse(raw);
  } catch (e) { vouchers = []; }

  const newVoucher = {
    id: `VOUCH-${Date.now()}`,
    voucher_date: voucher_date || new Date().toISOString().split('T')[0],
    date: voucher_date || new Date().toISOString().split('T')[0],
    voucher_type: voucher_type || 'JOURNAL',
    debit_lines,
    credit_lines,
    total_amount: totalDebit,
    // Flattened primary accounts for backwards compatibility with daybook & ledger statements
    dr_account: debit_lines.map(d => `${d.account_name} (₹${d.amount})`).join(', '),
    cr_account: credit_lines.map(c => `${c.account_name} (₹${c.amount})`).join(', '),
    amount: totalDebit,
    narration: narration || '',
    created_at: new Date().toISOString()
  };

  vouchers.unshift(newVoucher);
  localStorage.setItem(key, JSON.stringify(vouchers));
  localStorage.setItem('app_vouchers_global', JSON.stringify(vouchers));

  window.dispatchEvent(new Event('accounts_master_updated'));
  window.dispatchEvent(new Event('storage'));

  return newVoucher;
};
