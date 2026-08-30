// frontend/src/utils/financialReportEngine.js

import { getAccountHeadsByFirm } from './accountMasterEngine.js';

export const calculateFinancialReports = (firmId) => {
  let targetId = firmId;
  if (!targetId) {
    try {
      const activeFirm = JSON.parse(localStorage.getItem('active_firm_profile') || '{}');
      targetId = activeFirm.id || 'FIRM-001';
    } catch (e) {
      targetId = 'FIRM-001';
    }
  }

  const journalKey = `app_journal_entries_${targetId}`;
  const journalEntries = JSON.parse(localStorage.getItem(journalKey) || '[]');
  const accounts = getAccountHeadsByFirm(targetId);

  const accountBalances = {};
  accounts.forEach(acc => {
    accountBalances[acc.id] = {
      id: acc.id,
      name: acc.name,
      primary_type: acc.primary_type || 'ASSETS',
      group_type: acc.group_type,
      balance: parseFloat(acc.opening_balance || 0)
    };
  });

  // Aggregate Journal Entries
  journalEntries.forEach(entry => {
    const amt = parseFloat(entry.amount || 0);
    
    if (accountBalances[entry.debit_account_id]) {
      accountBalances[entry.debit_account_id].balance += amt;
    } else {
      accountBalances[entry.debit_account_id] = {
        id: entry.debit_account_id,
        name: entry.debit_account_name || 'Debit Head',
        primary_type: (entry.debit_account_name || '').toLowerCase().includes('expense') ? 'EXPENSES' : 'ASSETS',
        balance: amt
      };
    }

    if (accountBalances[entry.credit_account_id]) {
      accountBalances[entry.credit_account_id].balance -= amt;
    } else {
      accountBalances[entry.credit_account_id] = {
        id: entry.credit_account_id,
        name: entry.credit_account_name || 'Credit Head',
        primary_type: (entry.credit_account_name || '').toLowerCase().includes('capital') ? 'LIABILITIES' : 'INCOME',
        balance: -amt
      };
    }
  });

  // Calculate Profit & Loss (Income vs Expenses)
  let totalIncome = 0;
  let totalExpenses = 0;
  const incomeItems = [];
  const expenseItems = [];

  Object.values(accountBalances).forEach(acc => {
    const isExpense = acc.primary_type === 'EXPENSES' || acc.name.toLowerCase().includes('expense') || acc.name.toLowerCase().includes('diesel');
    const isIncome = acc.primary_type === 'INCOME' || acc.name.toLowerCase().includes('sales');

    if (isExpense) {
      const expenseVal = Math.abs(acc.balance);
      if (expenseVal > 0) {
        totalExpenses += expenseVal;
        expenseItems.push({ name: acc.name, amount: expenseVal });
      }
    } else if (isIncome) {
      const incomeVal = Math.abs(acc.balance);
      if (incomeVal > 0) {
        totalIncome += incomeVal;
        incomeItems.push({ name: acc.name, amount: incomeVal });
      }
    }
  });

  const netProfit = totalIncome - totalExpenses;

  // Calculate Balance Sheet (Assets vs Liabilities)
  let totalAssets = 0;
  let totalLiabilities = 0;
  const assetItems = [];
  const liabilityItems = [];

  Object.values(accountBalances).forEach(acc => {
    const isExpense = acc.primary_type === 'EXPENSES' || acc.name.toLowerCase().includes('expense') || acc.name.toLowerCase().includes('diesel');
    const isIncome = acc.primary_type === 'INCOME' || acc.name.toLowerCase().includes('sales');

    if (!isExpense && !isIncome) {
      if (acc.balance >= 0) {
        totalAssets += acc.balance;
        if (acc.balance > 0) assetItems.push({ name: acc.name, amount: acc.balance });
      } else {
        const liabVal = Math.abs(acc.balance);
        totalLiabilities += liabVal;
        if (liabVal > 0) liabilityItems.push({ name: acc.name, amount: liabVal });
      }
    }
  });

  return {
    totalIncome,
    totalExpenses,
    netProfit,
    incomeItems,
    expenseItems,
    totalAssets,
    totalLiabilities: totalLiabilities + (netProfit > 0 ? netProfit : 0),
    assetItems,
    liabilityItems
  };
};
