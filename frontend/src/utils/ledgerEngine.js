// frontend/src/utils/ledgerEngine.js
import { StorageService } from './storageSync';

/**
 * सभी संभावित स्टोरेज कीज़ से वाउचर्स को सुरक्षित रूप से निकालता है
 */
export const getAllFirmVouchers = (firmId = 'FIRM-001') => {
  let rawTx = [];
  const keys = ['account_book_vouchers', 'vouchers', 'transactions', 'journal_entries', 'voucher_list', 'daybook'];
  
  keys.forEach(k => {
    const val = StorageService.getItem(k);
    if (Array.isArray(val)) {
      rawTx.push(...val);
    }
  });

  // डुप्लीकेट वाउचर्स हटाएं (यदि आईडी या रेफरेंस नंबर समान हो)
  const uniqueMap = new Map();
  rawTx.forEach(v => {
    if (!v) return;
    const vId = v.id || v.voucher_number || v.reference_no || JSON.stringify(v);
    // फर्म आईडी फिल्टर (यदिfirm_id मैच हो या न हो)
    const matchesFirm = !v.firm_id || v.firm_id === firmId;
    if (matchesFirm && !uniqueMap.has(vId)) {
      uniqueMap.set(vId, v);
    }
  });

  return Array.from(uniqueMap.values());
};

/**
 * किसी विशिष्ट खाते (Account/Party) के लिए सभी ट्रांजैक्शन और रनिंग बैलेंस निकालता है
 */
export const getAccountLedgerStatement = (accountName, firmId = 'FIRM-001') => {
  if (!accountName) return { transactions: [], openingBalance: 0, closingBalance: 0, totalDebit: 0, totalCredit: 0 };

  const target = String(accountName).trim().toLowerCase();
  const vouchers = getAllFirmVouchers(firmId);

  let transactions = [];
  let totalDebit = 0;
  let totalCredit = 0;

  vouchers.forEach(v => {
    // सभी संभावित डेबिट और क्रेडिट फील्ड्स की जाँच
    const dr = String(v.dr_account || v.dr_party || v.debit_account || v.debit_ledger || v.account_dr || '').trim().toLowerCase();
    const cr = String(v.cr_account || v.cr_party || v.credit_account || v.credit_ledger || v.account_cr || '').trim().toLowerCase();
    
    const amt = Number(v.amount || v.total_amount || v.net_amount || 0);
    if (amt <= 0) return;

    let isDr = dr === target || dr.includes(target);
    let isCr = cr === target || cr.includes(target);

    if (isDr || isCr) {
      const debitVal = isDr ? amt : 0;
      const creditVal = isCr ? amt : 0;

      totalDebit += debitVal;
      totalCredit += creditVal;

      transactions.push({
        date: v.voucher_date || v.date || '2026-09-06',
        voucher_type: v.voucher_type || v.type || 'TX',
        voucher_number: v.voucher_number || v.reference_no || 'N/A',
        narration: v.narration || v.description || `Transaction for ${accountName}`,
        debit: debitVal,
        credit: creditVal,
        raw: v
      });
    }
  });

  // तारीख के अनुसार सॉर्ट करें
  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  // रनिंग बैलेंस कैलकुलेट करें
  let runningBal = 0;
  transactions = transactions.map(t => {
    // सामान्यतः एसेट/कैश के लिए Debit (+) और Credit (-) होता है
    runningBal += (t.debit - t.credit);
    return {
      ...t,
      runningBalance: Math.abs(runningBal),
      balanceType: runningBal >= 0 ? 'Dr' : 'Cr'
    };
  });

  return {
    transactions,
    openingBalance: 0,
    closingBalance: Math.abs(runningBal),
    balanceType: runningBal >= 0 ? 'Dr' : 'Cr',
    totalDebit,
    totalCredit
  };
};
