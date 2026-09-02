// frontend/src/utils/voucherPostingEngine.js

/**
 * Validates and stores universal accounting vouchers (Simple & Compound Multi-Row)
 * Guarantees strict Double-Entry equilibrium: Total Debit === Total Credit
 */
export const saveUniversalVoucher = (firmId = 'FIRM-001', voucherPayload = {}) => {
  const vouchersKey = `app_vouchers_${firmId}`;
  const existingVouchers = JSON.parse(localStorage.getItem(vouchersKey) || '[]');

  const {
    voucher_type = 'JOURNAL',
    voucher_date = new Date().toISOString().split('T')[0],
    reference_no = '',
    narration = '',
    // Simple 1:1 inputs
    dr_account = '',
    cr_account = '',
    amount = 0,
    // Multi-row compound inputs
    is_compound = false,
    entries = [] // Array of { type: 'Dr' | 'Cr', account_name: '', amount: 0 }
  } = voucherPayload;

  const voucherId = `VCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const cleanVoucherType = voucher_type.toUpperCase();
  const vchNumber = reference_no.trim() || `${cleanVoucherType.slice(0, 2)}-${Date.now().toString().slice(-4)}`;

  if (is_compound && Array.isArray(entries) && entries.length > 0) {
    // 1. Compound Multi-Row Processing
    let totalDebit = 0;
    let totalCredit = 0;

    const validatedEntries = entries.map((line, idx) => {
      const lineAmt = parseFloat(line.amount || 0);
      if (lineAmt <= 0) {
        throw new Error(`Row #${idx + 1}: Amount zero se adhik hona chahiye.`);
      }
      if (!line.account_name || !line.account_name.trim()) {
        throw new Error(`Row #${idx + 1}: Account Head chuna zaroori hai.`);
      }

      if (line.type === 'Dr') totalDebit += lineAmt;
      else if (line.type === 'Cr') totalCredit += lineAmt;

      return {
        line_id: `LINE-${Date.now()}-${idx}`,
        type: line.type,
        account_name: line.account_name.trim(),
        amount: lineAmt
      };
    });

    // Accounting Golden Rule Check (Rounded to 2 decimals)
    const diff = Math.abs(Math.round((totalDebit - totalCredit) * 100) / 100);
    if (diff > 0.01) {
      throw new Error(
        `⛔ Unbalanced Voucher!\n\n` +
        `• Total Debit: ₹${totalDebit.toFixed(2)}\n` +
        `• Total Credit: ₹${totalCredit.toFixed(2)}\n` +
        `• Difference: ₹${diff.toFixed(2)}\n\n` +
        `Total Debit aur Total Credit barabar hone chahiye.`
      );
    }

    const compoundVoucher = {
      id: voucherId,
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
      // String summary representation for backward-compatible Daybook views
      dr_account: validatedEntries.filter(e => e.type === 'Dr').map(e => `${e.account_name} (₹${e.amount})`).join(', '),
      cr_account: validatedEntries.filter(e => e.type === 'Cr').map(e => `${e.account_name} (₹${e.amount})`).join(', '),
      dr_party: validatedEntries.filter(e => e.type === 'Dr').map(e => e.account_name).join(', '),
      cr_party: validatedEntries.filter(e => e.type === 'Cr').map(e => e.account_name).join(', '),
      created_at: new Date().toISOString()
    };

    existingVouchers.push(compoundVoucher);
    localStorage.setItem(vouchersKey, JSON.stringify(existingVouchers));

    window.dispatchEvent(new Event('app_state_updated'));
    return compoundVoucher;
  } else {
    // 2. Simple 1 Dr : 1 Cr Processing
    const cleanAmount = parseFloat(amount || 0);
    if (cleanAmount <= 0) {
      throw new Error('⚠️ Transaction amount zero se adhik hona chahiye.');
    }
    if (!dr_account || !dr_account.trim()) {
      throw new Error('⚠️ Debit account chuna zaroori hai.');
    }
    if (!cr_account || !cr_account.trim()) {
      throw new Error('⚠️ Credit account chuna zaroori hai.');
    }
    if (dr_account.trim() === cr_account.trim()) {
      throw new Error('⚠️ Debit aur Credit dono me same account nahi ho sakta.');
    }

    const simpleVoucher = {
      id: voucherId,
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
      created_at: new Date().toISOString()
    };

    existingVouchers.push(simpleVoucher);
    localStorage.setItem(vouchersKey, JSON.stringify(existingVouchers));

    window.dispatchEvent(new Event('app_state_updated'));
    return simpleVoucher;
  }
};
