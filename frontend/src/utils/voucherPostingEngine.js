// frontend/src/utils/voucherPostingEngine.js

export const saveUniversalVoucher = (firmId = 'FIRM-001', voucherPayload = {}) => {
  const vouchersKey = `app_vouchers_${firmId}`;
  const existing = JSON.parse(localStorage.getItem(vouchersKey) || '[]');

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

  const vchNumber = reference_no.trim() || `${voucher_type.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  let finalVoucher = null;

  if (is_compound && Array.isArray(entries) && entries.length > 0) {
    let totalDr = 0;
    let totalCr = 0;

    entries.forEach((e) => {
      const val = parseFloat(e.amount || 0);
      if (e.type === 'Dr') totalDr += val;
      if (e.type === 'Cr') totalCr += val;
    });

    if (Math.abs(totalDr - totalCr) > 0.01) {
      throw new Error(`⛔ Unbalanced Voucher! Dr (₹${totalDr.toFixed(2)}) != Cr (₹${totalCr.toFixed(2)}).`);
    }

    finalVoucher = {
      id: id || `VCH-${Date.now()}`,
      firm_id: firmId,
      voucher_number: vchNumber,
      voucher_date,
      date: voucher_date,
      voucher_type,
      type: voucher_type,
      reference_no: vchNumber,
      narration: narration.trim(),
      amount: totalDr,
      is_compound: true,
      entries,
      dr_account: entries.filter(e => e.type === 'Dr').map(e => e.account_name).join(', '),
      cr_account: entries.filter(e => e.type === 'Cr').map(e => e.account_name).join(', ')
    };
  } else {
    const cleanAmt = parseFloat(amount || 0);
    if (cleanAmt <= 0) throw new Error('Transaction amount must be greater than zero.');
    if (!dr_account || !cr_account) throw new Error('Debit and Credit accounts are both required.');
    if (dr_account.trim() === cr_account.trim()) throw new Error('Debit and Credit cannot be the same account.');

    finalVoucher = {
      id: id || `VCH-${Date.now()}`,
      firm_id: firmId,
      voucher_number: vchNumber,
      voucher_date,
      date: voucher_date,
      voucher_type,
      type: voucher_type,
      reference_no: vchNumber,
      narration: narration.trim(),
      amount: cleanAmt,
      is_compound: false,
      dr_account: dr_account.trim(),
      cr_account: cr_account.trim(),
      entries: [
        { type: 'Dr', account_name: dr_account.trim(), amount: cleanAmt },
        { type: 'Cr', account_name: cr_account.trim(), amount: cleanAmt }
      ]
    };
  }

  const existingIdx = existing.findIndex(v => v.id === finalVoucher.id);
  if (existingIdx !== -1) {
    existing[existingIdx] = finalVoucher;
  } else {
    existing.push(finalVoucher);
  }

  localStorage.setItem(vouchersKey, JSON.stringify(existing));
  window.dispatchEvent(new Event('app_state_updated'));
  return finalVoucher;
};
