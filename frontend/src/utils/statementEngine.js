// frontend/src/utils/statementEngine.js

export const calculateAccountStatement = (accountId, fromDate, toDate) => {
  const accounts = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
  const journalLines = JSON.parse(localStorage.getItem('app_journal_entries') || '[]');

  const account = accounts.find(a => a.id === accountId);
  if (!account) {
    return { 
      account: null, 
      statementLines: [], 
      summary: { openingBalance: 0, totalDebit: 0, totalCredit: 0, closingBalance: 0, closingBalanceType: 'Dr' } 
    };
  }

  let runningBalance = parseFloat(account.opening_balance || 0);
  const isDebitNormal = ['ASSET', 'EXPENSE'].includes(account.primary_type);

  // Filter journal lines for selected party within date range
  const filteredLines = journalLines
    .filter(entry => entry.account_id === accountId && entry.date >= fromDate && entry.date <= toDate)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let totalDebit = 0;
  let totalCredit = 0;

  const statementLines = filteredLines.map(line => {
    const dr = parseFloat(line.debit || 0);
    const cr = parseFloat(line.credit || 0);
    totalDebit += dr;
    totalCredit += cr;

    if (isDebitNormal) {
      runningBalance += (dr - cr);
    } else {
      runningBalance += (cr - dr);
    }

    return {
      ...line,
      debit: dr,
      credit: cr,
      runningBalance: Math.abs(runningBalance),
      balanceType: runningBalance >= 0 ? (isDebitNormal ? 'Dr' : 'Cr') : (isDebitNormal ? 'Cr' : 'Dr')
    };
  });

  return {
    account,
    statementLines,
    summary: {
      openingBalance: parseFloat(account.opening_balance || 0),
      totalDebit,
      totalCredit,
      closingBalance: Math.abs(runningBalance),
      closingBalanceType: runningBalance >= 0 ? (isDebitNormal ? 'Dr' : 'Cr') : (isDebitNormal ? 'Cr' : 'Dr')
    }
  };
};
