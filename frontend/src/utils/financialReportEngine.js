// frontend/src/utils/financialReportEngine.js

import { getFirmMasterAccounts } from './accountMasterEngine.js';

/**
 * Safely fetches accounts list with fallback
 */
export const getSafeAccounts = (firmId = 'FIRM-001') => {
  try {
    if (typeof getFirmMasterAccounts === 'function') {
      const accs = getFirmMasterAccounts(firmId);
      if (Array.isArray(accs) && accs.length > 0) return accs;
    }
  } catch (e) {}

  const accKey = `app_accounts_${firmId}`;
  try {
    const raw = localStorage.getItem(accKey);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  return [
    { id: 'ACC-1', account_name: 'Cash-in-Hand', primary_type: 'ASSETS', sub_group: 'Cash-in-Hand', opening_balance: 0, balance_type: 'Dr' },
    { id: 'ACC-2', account_name: 'Bank Account', primary_type: 'ASSETS', sub_group: 'Bank Accounts', opening_balance: 0, balance_type: 'Dr' },
    { id: 'ACC-3', account_name: 'Sales Account (बिक्री खाता)', primary_type: 'INCOME', sub_group: 'Direct Incomes', opening_balance: 0, balance_type: 'Cr' },
    { id: 'ACC-4', account_name: 'Purchase Account (खरीद खाता)', primary_type: 'EXPENSES', sub_group: 'Direct Expenses', opening_balance: 0, balance_type: 'Dr' }
  ];
};

/**
 * Normalizes all legacy and modern vouchers into clean flat ledger rows
 */
export const getNormalizedLedgerLines = (firmId = 'FIRM-001') => {
  const vouchersKey = `app_vouchers_${firmId}`;
  let rawVouchers = [];
  try {
    rawVouchers = JSON.parse(localStorage.getItem(vouchersKey) || '[]');
  } catch (e) {
    console.error('Error reading vouchers:', e);
  }

  const flatLines = [];
  rawVouchers.forEach((vch) => {
    const vchDate = vch.voucher_date || vch.date || '';
    const vchNum = vch.reference_no || vch.voucher_number || 'VCH';
    const vchType = vch.voucher_type || vch.type || 'JOURNAL';
    const narration = vch.narration || '';

    if (Array.isArray(vch.entries) && vch.entries.length > 0) {
      vch.entries.forEach((entry) => {
        flatLines.push({
          voucher_id: vch.id,
          date: vchDate,
          voucher_number: vchNum,
          voucher_type: vchType,
          account_name: (entry.account_name || '').trim(),
          entry_type: entry.type,
          amount: parseFloat(entry.amount || 0),
          narration
        });
      });
    } else {
      const amt = parseFloat(vch.amount || 0);
      if (vch.dr_account) {
        flatLines.push({
          voucher_id: vch.id,
          date: vchDate,
          voucher_number: vchNum,
          voucher_type: vchType,
          account_name: vch.dr_account.trim(),
          entry_type: 'Dr',
          amount: amt,
          narration
        });
      }
      if (vch.cr_account) {
        flatLines.push({
          voucher_id: vch.id,
          date: vchDate,
          voucher_number: vchNum,
          voucher_type: vchType,
          account_name: vch.cr_account.trim(),
          entry_type: 'Cr',
          amount: amt,
          narration
        });
      }
    }
  });

  return flatLines;
};

/**
 * 1. CORE FUNCTION REQUIRED BY FinancialReportsView.jsx
 * Computes Trial Balance, Trading Account, Profit & Loss, and Balance Sheet
 */
export const generateFinancialStatements = (firmId = 'FIRM-001') => {
  const accounts = getSafeAccounts(firmId);
  const flatLines = getNormalizedLedgerLines(firmId);

  // Initialize net balance container
  const trialBalances = accounts.map((acc) => {
    const opening = parseFloat(acc.opening_balance || 0);
    let netDebit = acc.balance_type === 'Dr' ? opening : 0;
    let netCredit = acc.balance_type === 'Cr' ? opening : 0;

    flatLines.forEach((line) => {
      if (line.account_name === acc.account_name) {
        if (line.entry_type === 'Dr') netDebit += line.amount;
        if (line.entry_type === 'Cr') netCredit += line.amount;
      }
    });

    const diff = netDebit - netCredit;
    return {
      account_name: acc.account_name,
      primary_type: acc.primary_type,
      sub_group: acc.sub_group || '',
      debit: diff > 0 ? parseFloat(diff.toFixed(2)) : 0,
      credit: diff < 0 ? parseFloat(Math.abs(diff).toFixed(2)) : 0
    };
  });

  let totalDebit = 0;
  let totalCredit = 0;
  trialBalances.forEach((t) => {
    totalDebit += t.debit;
    totalCredit += t.credit;
  });

  // Calculate Trading & P&L components
  let salesTotal = 0;
  let purchasesTotal = 0;
  let directExpenses = 0;
  let indirectExpenses = 0;
  let indirectIncomes = 0;

  trialBalances.forEach((t) => {
    const type = t.primary_type;
    const group = t.sub_group.toLowerCase();

    if (type === 'INCOME') {
      if (group.includes('direct') || group.includes('sales')) {
        salesTotal += t.credit;
      } else {
        indirectIncomes += t.credit;
      }
    } else if (type === 'EXPENSES') {
      if (group.includes('direct') || group.includes('purchase')) {
        purchasesTotal += t.debit;
      } else {
        indirectExpenses += t.debit;
      }
    }
  });

  // Calculate closing stock valuation
  let closingStockValuation = 0;
  try {
    const stockKey = `app_stock_${firmId}`;
    const stockItems = JSON.parse(localStorage.getItem(stockKey) || '[]');
    stockItems.forEach((stk) => {
      if (!stk.is_service) {
        const qty = parseFloat(stk.current_stock || 0);
        const rate = parseFloat(stk.unit_purchase_price || stk.selling_price || 0);
        if (qty > 0) closingStockValuation += (qty * rate);
      }
    });
  } catch (e) {}

  const grossProfit = (salesTotal + closingStockValuation) - (purchasesTotal + directExpenses);
  const netProfit = (grossProfit + indirectIncomes) - indirectExpenses;

  return {
    trialBalance: {
      rows: trialBalances,
      totalDebit: parseFloat(totalDebit.toFixed(2)),
      totalCredit: parseFloat(totalCredit.toFixed(2)),
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
    },
    tradingAccount: {
      sales: salesTotal,
      purchases: purchasesTotal,
      directExpenses,
      closingStock: parseFloat(closingStockValuation.toFixed(2)),
      grossProfit: parseFloat(grossProfit.toFixed(2))
    },
    profitAndLoss: {
      grossProfit: parseFloat(grossProfit.toFixed(2)),
      indirectIncomes,
      indirectExpenses,
      netProfit: parseFloat(netProfit.toFixed(2))
    },
    balanceSheet: {
      netProfit: parseFloat(netProfit.toFixed(2)),
      closingStock: parseFloat(closingStockValuation.toFixed(2))
    }
  };
};

/**
 * 2. LIVE DASHBOARD KPIS (Cash, Bank, Debtors, Creditors)
 */
export const calculateDashboardKPIs = (firmId = 'FIRM-001') => {
  const accounts = getSafeAccounts(firmId);
  const flatLines = getNormalizedLedgerLines(firmId);

  const accountBalances = {};
  accounts.forEach((acc) => {
    const opening = parseFloat(acc.opening_balance || 0);
    const isDr = acc.balance_type === 'Dr';
    accountBalances[acc.account_name] = isDr ? opening : -opening;
  });

  flatLines.forEach((line) => {
    if (!accountBalances.hasOwnProperty(line.account_name)) {
      accountBalances[line.account_name] = 0;
    }
    if (line.entry_type === 'Dr') {
      accountBalances[line.account_name] += line.amount;
    } else {
      accountBalances[line.account_name] -= line.amount;
    }
  });

  let cashInHand = 0;
  let bankBalance = 0;
  let sundryDebtors = 0;
  let sundryCreditors = 0;

  Object.keys(accountBalances).forEach((name) => {
    const net = accountBalances[name];
    const nameLower = name.toLowerCase();

    if (nameLower.includes('cash') || nameLower.includes('रोकड़')) {
      cashInHand += net;
    } else if (nameLower.includes('bank') || nameLower.includes('बैंक')) {
      bankBalance += net;
    } else if (net > 0) {
      sundryDebtors += net;
    } else if (net < 0) {
      sundryCreditors += Math.abs(net);
    }
  });

  return {
    cashInHand: parseFloat(cashInHand.toFixed(2)),
    bankBalance: parseFloat(bankBalance.toFixed(2)),
    sundryDebtors: parseFloat(sundryDebtors.toFixed(2)),
    sundryCreditors: parseFloat(sundryCreditors.toFixed(2))
  };
};

/**
 * 3. ACCOUNT STATEMENT & KHATA MILAN VIEW
 */
export const getAccountStatement = (firmId = 'FIRM-001', targetAccountName = '') => {
  if (!targetAccountName) return { openingBalance: 0, transactions: [], closingBalance: 0 };

  const accounts = getSafeAccounts(firmId);
  const accountMaster = accounts.find(a => a.account_name === targetAccountName);
  
  let runningBal = 0;
  const opening = parseFloat(accountMaster?.opening_balance || 0);
  runningBal = (accountMaster?.balance_type === 'Dr') ? opening : -opening;

  const flatLines = getNormalizedLedgerLines(firmId);
  const partyLines = flatLines.filter(l => l.account_name === targetAccountName);

  partyLines.sort((a, b) => new Date(a.date) - new Date(b.date));

  const transactions = partyLines.map((line) => {
    const dr = line.entry_type === 'Dr' ? line.amount : 0;
    const cr = line.entry_type === 'Cr' ? line.amount : 0;
    runningBal = runningBal + dr - cr;

    return {
      date: line.date,
      voucher_number: line.voucher_number,
      voucher_type: line.voucher_type,
      narration: line.narration,
      debit: dr,
      credit: cr,
      runningBalance: Math.abs(runningBal),
      balanceType: runningBal >= 0 ? 'Dr' : 'Cr'
    };
  });

  return {
    accountName: targetAccountName,
    openingBalance: Math.abs(opening),
    openingType: accountMaster?.balance_type || 'Dr',
    transactions,
    closingBalance: Math.abs(runningBal),
    closingType: runningBal >= 0 ? 'Dr' : 'Cr'
  };
};
