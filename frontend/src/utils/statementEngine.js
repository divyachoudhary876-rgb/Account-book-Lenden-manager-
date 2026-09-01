// frontend/src/utils/statementEngine.js

/**
 * Retrieve all vouchers for a firm
 */
export const getAllUniversalVouchers = (firmId = 'FIRM-001') => {
  try {
    const raw = localStorage.getItem(`app_vouchers_${firmId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Retrieve account heads for a firm
 */
export const getAccountHeads = (firmId = 'FIRM-001') => {
  try {
    const raw = localStorage.getItem(`app_accounts_${firmId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Generate Double-Entry Account Milan Ledger Statement
 */
export const getAccountLedgerStatement = (firmId = 'FIRM-001', targetAccountName = '') => {
  if (!targetAccountName) {
    return {
      accountName: '',
      openingBalance: 0,
      openingBalanceType: 'Dr',
      entries: [],
      totalDebit: 0,
      totalCredit: 0,
      closingBalance: 0,
      closingBalanceType: 'Dr'
    };
  }

  const accounts = getAccountHeads(firmId);
  const vouchers = getAllUniversalVouchers(firmId);

  const matchedAccount = accounts.find(
    a => (a.account_name || '').trim().toLowerCase() === targetAccountName.trim().toLowerCase()
  );

  const openingBal = parseFloat(matchedAccount?.opening_balance || 0);
  const balanceType = matchedAccount?.balance_type || 'Dr';

  let runningBalance = balanceType === 'Dr' ? openingBal : -openingBal;
  let totalDebit = 0;
  let totalCredit = 0;

  const targetLower = targetAccountName.trim().toLowerCase();

  const relevantVouchers = vouchers
    .filter(v => {
      const dr = (v.dr_account || v.dr_party || '').trim().toLowerCase();
      const cr = (v.cr_account || v.cr_party || '').trim().toLowerCase();
      return dr === targetLower || cr === targetLower;
    })
    .sort((a, b) => new Date(a.voucher_date || a.date) - new Date(b.voucher_date || b.date));

  const ledgerEntries = relevantVouchers.map((v, index) => {
    const drName = (v.dr_account || v.dr_party || '').trim();
    const crName = (v.cr_account || v.cr_party || '').trim();
    const amt = parseFloat(v.amount || 0);

    const isDebit = drName.toLowerCase() === targetLower;
    const isCredit = crName.toLowerCase() === targetLower;

    let debitAmount = 0;
    let creditAmount = 0;
    let counterParty = '';

    if (isDebit) {
      debitAmount = amt;
      totalDebit += amt;
      runningBalance += amt;
      counterParty = crName;
    } else if (isCredit) {
      creditAmount = amt;
      totalCredit += amt;
      runningBalance -= amt;
      counterParty = drName;
    }

    return {
      index: index + 1,
      id: v.id,
      date: v.voucher_date || v.date,
      voucher_type: v.voucher_type || v.type || 'JOURNAL',
      voucher_no: v.voucher_number || v.reference_no || `REF-${index + 1}`,
      particulars: isDebit ? `To ${counterParty}` : `By ${counterParty}`,
      opposite_account: counterParty,
      debit: debitAmount,
      credit: creditAmount,
      running_balance: Math.abs(runningBalance),
      balance_type: runningBalance >= 0 ? 'Dr' : 'Cr',
      narration: v.narration || ''
    };
  });

  return {
    accountName: targetAccountName,
    primaryType: matchedAccount?.primary_type || 'ASSETS',
    subGroup: matchedAccount?.sub_group || 'General Ledger',
    openingBalance: openingBal,
    openingBalanceType: balanceType,
    entries: ledgerEntries,
    totalDebit: totalDebit,
    totalCredit: totalCredit,
    closingBalance: Math.abs(runningBalance),
    closingBalanceType: runningBalance >= 0 ? 'Dr' : 'Cr'
  };
};

/**
 * Export account statement to CSV format
 */
export const downloadCSVStatement = (statement, firmName = 'Firm') => {
  if (!statement || !statement.entries) return;

  const headers = ['#', 'Date', 'Voucher Type', 'Ref No', 'Particulars', 'Debit (Rs)', 'Credit (Rs)', 'Balance', 'Type', 'Narration'];
  const rows = statement.entries.map(e => [
    e.index,
    e.date,
    e.voucher_type,
    e.voucher_no,
    `"${e.particulars.replace(/"/g, '""')}"`,
    e.debit.toFixed(2),
    e.credit.toFixed(2),
    e.running_balance.toFixed(2),
    e.balance_type,
    `"${(e.narration || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [
    `"Account Statement: ${statement.accountName}"`,
    `"Firm: ${firmName}"`,
    `"Opening Balance: Rs. ${statement.openingBalance.toFixed(2)} ${statement.openingBalanceType}"`,
    '',
    headers.join(','),
    ...rows.map(r => r.join(',')),
    '',
    `"Total Debit",${statement.totalDebit.toFixed(2)},"Total Credit",${statement.totalCredit.toFixed(2)}`,
    `"Closing Balance",Rs. ${statement.closingBalance.toFixed(2)} ${statement.closingBalanceType}`
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${statement.accountName.replace(/\s+/g, '_')}_Statement.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Aliases for backwards compatibility
export const getAccountStatement = getAccountLedgerStatement;
