// frontend/src/utils/voucherPostingEngine.js

/**
 * Validates, Stores, Updates, and Deletes Universal Double-Entry Vouchers
 * Strictly verifies sum(Debit) === sum(Credit)
 */
export const saveUniversalVoucher = (firmId = 'FIRM-001', voucherPayload = {}) => {
  const vouchersKey = `app_vouchers_${firmId}`;
  const existingVouchers = JSON.parse(localStorage.getItem(vouchersKey) || '[]');

  const {
    id = null,
    voucher_type = 'JOURNAL',
    voucher_date = new Date().toISOString().split('T')[0],
    reference_no = '',
    narration = '',
    dr_account = '',
    cr_account = '',
    amount = 0,
    is_compound = false,
    entries = []
  } = voucherPayload;

  const cleanVoucherType = voucher_type.toUpperCase();
  const vchNumber = reference_no.trim() || `${cleanVoucherType.slice(0, 2)}-${Date.now().toString().slice(-4)}`;

  let finalVoucher = null;

  if (is_compound && Array.isArray(entries) && entries.length > 0) {
    let totalDebit = 0;
    let totalCredit = 0;

    const validatedEntries = entries.map((line, idx) => {
      const lineAmt = parseFloat(line.amount || 0);
      if (lineAmt <= 0) throw new Error(`Line #${idx + 1}: Amount must be greater than zero.`);
      if (!line.account_name || !line.account_name.trim()) throw new Error(`Line #${idx + 1}: Account Head is required.`);

      if (line.type === 'Dr') totalDebit += lineAmt;
      else if (line.type === 'Cr') totalCredit += lineAmt;

      return {
        line_id: line.line_id || `LINE-${Date.now()}-${idx}`,
        type: line.type,
        account_name: line.account_name.trim(),
        amount: lineAmt
      };
    });

    const diff = Math.abs(Math.round((totalDebit - totalCredit) * 100) / 100);
    if (diff > 0.01) {
      throw new Error(`⛔ Unbalanced Voucher! Debit (₹${totalDebit.toFixed(2)}) does not match Credit (₹${totalCredit.toFixed(2)}). Difference: ₹${diff.toFixed(2)}`);
    }

    finalVoucher = {
      id: id || `VCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      firm_id: firmId,
      voucher_number: vchNumber,
      voucher_date,
      date: voucher_date,
      voucher_type: cleanVoucherType,
      type: cleanVoucherType,
      reference_no: vchNumber,
      narration: narration.trim(),
      amount: totalDebit,
      is_compound: true,
      entries: validatedEntries,
      dr_account: validatedEntries.filter(e => e.type === 'Dr').map(e => `${e.account_name} (₹${e.amount})`).join(', '),
      cr_account: validatedEntries.filter(e => e.type === 'Cr').map(e => `${e.account_name} (₹${e.amount})`).join(', '),
      dr_party: validatedEntries.filter(e => e.type === 'Dr').map(e => e.account_name).join(', '),
      cr_party: validatedEntries.filter(e => e.type === 'Cr').map(e => e.account_name).join(', '),
      updated_at: new Date().toISOString()
    };
  } else {
    const cleanAmount = parseFloat(amount || 0);
    if (cleanAmount <= 0) throw new Error('Transaction amount must be greater than zero.');
    if (!dr_account || !dr_account.trim()) throw new Error('Debit Account selection is required.');
    if (!cr_account || !cr_account.trim()) throw new Error('Credit Account selection is required.');
    if (dr_account.trim() === cr_account.trim()) throw new Error('Debit and Credit cannot be the same account.');

    finalVoucher = {
      id: id || `VCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      firm_id: firmId,
      voucher_number: vchNumber,
      voucher_date,
      date: voucher_date,
      voucher_type: cleanVoucherType,
      type: cleanVoucherType,
      dr_account: dr_account.trim(),
      cr_account: cr_account.trim(),
      dr_party: dr_account.trim(),
      cr_party: cr_account.trim(),
      amount: cleanAmount,
      reference_no: vchNumber,
      narration: narration.trim(),
      is_compound: false,
      entries: [
        { type: 'Dr', account_name: dr_account.trim(), amount: cleanAmount },
        { type: 'Cr', account_name: cr_account.trim(), amount: cleanAmount }
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
  window.dispatchEvent(new Event('app_state_updated'));
  return finalVoucher;
};

/**
 * Permanently deletes a voucher by ID
 */
export const deleteUniversalVoucher = (firmId = 'FIRM-001', voucherId = '') => {
  const vouchersKey = `app_vouchers_${firmId}`;
  const existingVouchers = JSON.parse(localStorage.getItem(vouchersKey) || '[]');
  const updated = existingVouchers.filter(v => v.id !== voucherId);

  localStorage.setItem(vouchersKey, JSON.stringify(updated));
  window.dispatchEvent(new Event('app_state_updated'));
  return true;
};
