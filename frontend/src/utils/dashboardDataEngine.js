// frontend/src/utils/dashboardDataEngine.js

export const getCalculatedDashboardMetrics = () => {
  const accounts = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
  const inventory = JSON.parse(localStorage.getItem('app_inventory') || '[]');
  const journalEntries = JSON.parse(localStorage.getItem('app_journal_entries') || '[]');

  let totalReceivables = 0;
  let totalPayables = 0;
  let cashBankBalance = 0;

  // Calculate live balances strictly from user entries (No Dummy Data)
  accounts.forEach(acc => {
    const opening = parseFloat(acc.opening_balance || 0);
    
    // Sum movements from journal entries
    const accEntries = journalEntries.filter(j => j.account_name === acc.name || j.account_name === acc.id);
    let netDebit = 0;
    let netCredit = 0;
    accEntries.forEach(e => {
      netDebit += parseFloat(e.debit || 0);
      netCredit += parseFloat(e.credit || 0);
    });

    if (acc.group_type === 'SUNDRY_DEBTORS') {
      totalReceivables += (opening + netDebit - netCredit);
    } else if (acc.group_type === 'SUNDRY_CREDITORS') {
      totalPayables += (opening + netCredit - netDebit);
    } else if (acc.group_type === 'CASH' || acc.group_type === 'BANK') {
      cashBankBalance += (opening + netDebit - netCredit);
    }
  });

  // Calculate Live Raw & Finished Stock
  let rawStockQty = 0;
  let finishedStockQty = 0;

  inventory.forEach(item => {
    const qty = parseFloat(item.current_qty || 0);
    if (item.stage === 'RAW_KACHI') {
      rawStockQty += qty;
    } else if (item.stage === 'FINISHED_PAKKI') {
      finishedStockQty += qty;
    }
  });

  return {
    totalReceivables: Math.max(0, totalReceivables),
    totalPayables: Math.max(0, totalPayables),
    cashBankBalance: Math.max(0, cashBankBalance),
    rawStockQty,
    finishedStockQty
  };
};
