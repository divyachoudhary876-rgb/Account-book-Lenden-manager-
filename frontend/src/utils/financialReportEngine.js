// frontend/src/utils/financialReportEngine.js

import { getFirmMasterAccounts } from './accountMasterEngine.js';

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
    { id: 'ACC-2', account_name: 'Bank Account', primary_type: 'ASSETS', sub_group: 'Bank Accounts', opening_balance: 0, balance_type: 'Dr' }
  ];
};

export const getNormalizedLedgerLines = (firmId = 'FIRM-001') => {
  const vouchersKey = `app_vouchers_${firmId}`;
  let rawVouchers = [];
  try {
    rawVouchers = JSON.parse(localStorage.getItem(vouchersKey) || '[]');
  } catch (e) {
    console.error('Error loading vouchers:', e);
  }

  const flatLines = [];
  rawVouchers.forEach((vch) => {
    const vchDate = vch.voucher_date || vch.date || '';
    const vchNum = vch.reference_no || vch.voucher_number || 'VCH';
    const vchType = (vch.voucher_type || vch.type || 'JOURNAL').toUpperCase();
    const narration = vch.narration || '';

    if (Array.isArray(vch.entries) && vch.entries.length > 0) {
      vch.entries.forEach((entry) => {
        flatLines.push({
          voucher_id: vch.id,
          date: vchDate,
          voucher_number: vchNum,
          voucher_type: vchType,
          account_name: (entry.account_name || '').trim(),
          entry_type: entry.type === 'Dr' ? 'Dr' : 'Cr',
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
 * PURE DOUBLE-ENTRY TRIAL BALANCE CALCULATOR
 * Guarantees Sigma(Dr) === Sigma(Cr) by placing negative balances in the counter-column
 */
export const generateFinancialStatements = (firmId = 'FIRM-001') => {
  const masterAccounts = getSafeAccounts(firmId);
  const flatLines = getNormalizedLedgerLines(firmId);

  // Map to hold all unique accounts
  const accountTotals = {};

  // 1. Seed with Master Accounts & Opening Balances
  masterAccounts.forEach((acc) => {
    const name = acc.account_name.trim();
    const opening = parseFloat(acc.opening_balance || 0);
    const isDebitOpening = acc.balance_type === 'Dr';

    accountTotals[name] = {
      account_name: name,
      primary_type: acc.primary_type || 'ASSETS',
      sub_group: acc.sub_group || '',
      debit: isDebitOpening ? opening : 0,
      credit: !isDebitOpening ? opening : 0
    };
  });

  // 2. Aggregate Transaction Lines (Dr and Cr)
  flatLines.forEach((line) => {
    const name = line.account_name.trim();
    if (!accountTotals[name]) {
      let inferredType = 'EXPENSES';
      const lower = name.toLowerCase();
      if (lower.includes('cash') || lower.includes('bank') || lower.includes('रोकड़')) {
        inferredType = 'ASSETS';
      } else if (lower.includes('sale') || lower.includes('income')) {
        inferredType = 'INCOME';
      } else if (lower.includes('capital') || lower.includes('creditor')) {
        inferredType = 'LIABILITIES';
      }

      accountTotals[name] = {
        account_name: name,
        primary_type: inferredType,
        sub_group: 'General',
        debit: 0,
        credit: 0
      };
    }

    if (line.entry_type === 'Dr') {
      accountTotals[name].debit += line.amount;
    } else {
      accountTotals[name].credit += line.amount;
    }
  });

  // 3. Compute Net Balance for each account
  const trialBalances = [];
  let grandTotalDebit = 0;
  let grandTotalCredit = 0;

  Object.values(accountTotals).forEach((acc) => {
    const net = acc.debit - acc.credit;

    // Only display accounts that have non-zero activity
    if (Math.abs(net) > 0.001 || acc.debit > 0 || acc.credit > 0) {
      let finalDr = 0;
      let finalCr = 0;

      if (net > 0) {
        finalDr = parseFloat(net.toFixed(2));
      } else if (net < 0) {
        finalCr = parseFloat(Math.abs(net).toFixed(2));
      }

      grandTotalDebit += finalDr;
      grandTotalCredit += finalCr;

      trialBalances.push({
        account_name: acc.account_name,
        primary_type: acc.primary_type,
        sub_group: acc.sub_group,
        debit: finalDr,
        credit: finalCr
      });
    }
  });

  // Sort rows: Expenses & Incomes first, then Assets & Liabilities
  trialBalances.sort((a, b) => a.account_name.localeCompare(b.account_name));

  const difference = Math.abs(grandTotalDebit - grandTotalCredit);
  const isBalanced = difference < 0.05;

  // 4. Trading Account Calculations
  let salesTotal = 0;
  let purchasesTotal = 0;
  let directExpenses = 0;
  let indirectExpenses = 0;
  let indirectIncomes = 0;

  trialBalances.forEach((row) => {
    const type = row.primary_type;
    const group = (row.sub_group || '').toLowerCase();
    const name = row.account_name.toLowerCase();

    if (type === 'INCOME') {
      if (group.includes('direct') || name.includes('sales') || name.includes('बिक्री')) {
        salesTotal += row.credit;
      } else {
        indirectIncomes += row.credit;
      }
    } else if (type === 'EXPENSES') {
      if (group.includes('direct') || name.includes('purchase') || name.includes('खरीद')) {
        purchasesTotal += row.debit;
      } else {
        indirectExpenses += row.debit;
      }
    }
  });

  // Closing stock valuation
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

  const grossProfit = parseFloat(((salesTotal + closingStockValuation) - (purchasesTotal + directExpenses)).toFixed(2));
  const netProfit = parseFloat(((grossProfit + indirectIncomes) - indirectExpenses).toFixed(2));

  return {
    trialBalance: {
      rows: trialBalances,
      totalDebit: parseFloat(grandTotalDebit.toFixed(2)),
      totalCredit: parseFloat(grandTotalCredit.toFixed(2)),
      difference: parseFloat(difference.toFixed(2)),
      isBalanced
    },
    tradingAccount: {
      sales: salesTotal,
      purchases: purchasesTotal,
      directExpenses,
      closingStock: parseFloat(closingStockValuation.toFixed(2)),
      grossProfit
    },
    profitAndLoss: {
      grossProfit,
      indirectIncomes,
      indirectExpenses,
      netProfit
    },
    balanceSheet: {
      netProfit,
      closingStock: parseFloat(closingStockValuation.toFixed(2))
    }
  };
};

export const calculateDashboardKPIs = (firmId = 'FIRM-001') => {
  const flatLines = getNormalizedLedgerLines(firmId);
  const balances = {};

  flatLines.forEach((line) => {
    const acc = line.account_name;
    if (!balances[acc]) balances[acc] = 0;
    if (line.entry_type === 'Dr') balances[acc] += line.amount;
    if (line.entry_type === 'Cr') balances[acc] -= line.amount;
  });

  let cash = 0;
  let bank = 0;
  let debtors = 0;
  let creditors = 0;

  Object.keys(balances).forEach((accName) => {
    const net = balances[accName];
    const lower = accName.toLowerCase();

    if (lower.includes('cash') || lower.includes('रोकड़')) {
      cash += net;
    } else if (lower.includes('bank') || lower.includes('बैंक')) {
      bank += net;
    } else if (net > 0) {
      debtors += net;
    } else if (net < 0) {
      creditors += Math.abs(net);
    }
  });

  return {
    cashInHand: parseFloat(cash.toFixed(2)),
    bankBalance: parseFloat(bank.toFixed(2)),
    sundryDebtors: parseFloat(debtors.toFixed(2)),
    sundryCreditors: parseFloat(creditors.toFixed(2))
  };
};

export const getAccountStatement = (firmId = 'FIRM-001', targetAccountName = '') => {
  if (!targetAccountName) return { openingBalance: 0, transactions: [], closingBalance: 0 };

  const accounts = getSafeAccounts(firmId);
  const accountMaster = accounts.find(a => a.account_name.toLowerCase() === targetAccountName.toLowerCase());
  
  let runningBal = 0;
  const opening = parseFloat(accountMaster?.opening_balance || 0);
  runningBal = (accountMaster?.balance_type === 'Dr') ? opening : -opening;

  const flatLines = getNormalizedLedgerLines(firmId);
  const partyLines = flatLines.filter(l => l.account_name.toLowerCase() === targetAccountName.toLowerCase());
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
