// frontend/src/utils/financialReportEngine.js

import { getFirmMasterAccounts } from './accountMasterEngine.js';
import { getFirmScopedStorageKey } from './firmIsolationEngine.js';

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
  // Use exact firm-scoped storage key
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
        const accName = (entry.account_name || '').trim();
        const drVal = parseFloat(entry.debit || 0);
        const crVal = parseFloat(entry.credit || 0);

        if (drVal > 0) {
          flatLines.push({
            voucher_id: vch.id,
            date: vchDate,
            voucher_number: vchNum,
            voucher_type: vchType,
            account_name: accName,
            entry_type: 'Dr',
            amount: drVal,
            narration
          });
        }
        if (crVal > 0) {
          flatLines.push({
            voucher_id: vch.id,
            date: vchDate,
            voucher_number: vchNum,
            voucher_type: vchType,
            account_name: accName,
            entry_type: 'Cr',
            amount: crVal,
            narration
          });
        }
      });
    }
  });

  return flatLines;
};

export const generateFinancialStatements = (firmId = 'FIRM-001') => {
  const masterAccounts = getSafeAccounts(firmId);
  const flatLines = getNormalizedLedgerLines(firmId);

  const accountTotals = {};

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

  const trialBalances = [];
  let grandTotalDebit = 0;
  let grandTotalCredit = 0;

  Object.values(accountTotals).forEach((acc) => {
    const net = acc.debit - acc.credit;

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

  trialBalances.sort((a, b) => a.account_name.localeCompare(b.account_name));

  const difference = Math.abs(grandTotalDebit - grandTotalCredit);
  const isBalanced = difference < 0.05;

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

  let closingStockValuation = 0;
  try {
    const stockKey = `app_stock_${firmId}`;
    const stockItems = JSON.parse(localStorage.getItem(stockKey) || '[]');
    stockItems.forEach((stk) => {
      if (!stk.is_service) {
        const qty = parseFloat(stk.current_stock || 0);
        const rate = parseFloat(stk.unit_purchase_price || stk.purchase_price || stk.selling_price || 1);
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
