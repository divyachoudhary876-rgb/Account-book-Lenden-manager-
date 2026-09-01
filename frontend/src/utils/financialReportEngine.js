// frontend/src/utils/financialReportEngine.js

import { getAllUniversalVouchers, getAccountHeads } from './statementEngine.js';
import { getStockItemsByFirm } from './stockInventoryEngine.js';

/**
 * Generate Mathematically Accurate Trial Balance, P&L, and Balance Sheet
 */
export const generateFinancialStatements = (firmId = 'FIRM-001') => {
  const accounts = getAccountHeads(firmId);
  const vouchers = getAllUniversalVouchers(firmId);
  const stockItems = getStockItemsByFirm(firmId);

  // 1. Calculate Live Closing Stock Valuation
  const closingStockValuation = stockItems.reduce((acc, item) => {
    const qty = parseFloat(item.current_stock || 0);
    const rate = parseFloat(item.unit_purchase_price || item.purchase_rate || 0);
    return acc + (qty > 0 ? qty * rate : 0);
  }, 0);

  // 2. Initialize Ledger Balance Map
  const ledgerMap = {};
  accounts.forEach(acc => {
    ledgerMap[acc.account_name] = {
      id: acc.id,
      name: acc.account_name,
      primary_type: (acc.primary_type || 'ASSETS').toUpperCase(),
      sub_group: acc.sub_group || 'General',
      opening: parseFloat(acc.opening_balance || 0),
      balance_type: acc.balance_type || 'Dr',
      totalDr: 0,
      totalCr: 0,
      closingDr: 0,
      closingCr: 0,
      netBalance: 0
    };
  });

  // 3. Process all double-entry voucher postings
  vouchers.forEach(v => {
    const amt = parseFloat(v.amount || 0);
    const dr = (v.dr_account || v.dr_party || '').trim();
    const cr = (v.cr_account || v.cr_party || '').trim();

    if (!ledgerMap[dr]) {
      ledgerMap[dr] = {
        name: dr,
        primary_type: 'EXPENSES',
        sub_group: 'Direct Expenses',
        opening: 0,
        balance_type: 'Dr',
        totalDr: 0,
        totalCr: 0
      };
    }
    if (!ledgerMap[cr]) {
      ledgerMap[cr] = {
        name: cr,
        primary_type: 'INCOME',
        sub_group: 'Sales & Revenue',
        opening: 0,
        balance_type: 'Cr',
        totalDr: 0,
        totalCr: 0
      };
    }

    ledgerMap[dr].totalDr += amt;
    ledgerMap[cr].totalCr += amt;
  });

  // 4. Calculate Net Balances and Compile Trial Balance
  const trialBalance = [];
  let tbTotalDr = 0;
  let tbTotalCr = 0;

  Object.values(ledgerMap).forEach(acc => {
    const rawOpening = acc.balance_type === 'Dr' ? acc.opening : -acc.opening;
    const netRaw = rawOpening + (acc.totalDr - acc.totalCr);

    if (netRaw > 0) {
      acc.closingDr = netRaw;
      acc.closingCr = 0;
      acc.netBalance = netRaw;
    } else if (netRaw < 0) {
      acc.closingDr = 0;
      acc.closingCr = Math.abs(netRaw);
      acc.netBalance = -Math.abs(netRaw);
    } else {
      acc.closingDr = 0;
      acc.closingCr = 0;
      acc.netBalance = 0;
    }

    if (acc.closingDr > 0 || acc.closingCr > 0 || acc.opening > 0) {
      trialBalance.push({
        name: acc.name,
        primary_type: acc.primary_type,
        sub_group: acc.sub_group,
        debit: acc.closingDr,
        credit: acc.closingCr
      });
      tbTotalDr += acc.closingDr;
      tbTotalCr += acc.closingCr;
    }
  });

  // 5. Compile Profit & Loss (Trading & P&L Statement)
  const directIncomes = [];
  const directExpenses = [];
  const indirectIncomes = [];
  const indirectExpenses = [];

  let totalSalesAndRevenue = 0;
  let totalCostOfGoodsSold = 0;
  let totalIndirectIncome = 0;
  let totalIndirectExpense = 0;

  Object.values(ledgerMap).forEach(acc => {
    const val = acc.closingDr > 0 ? acc.closingDr : acc.closingCr;
    if (val === 0) return;

    if (acc.primary_type === 'INCOME') {
      if (acc.sub_group.toLowerCase().includes('indirect') || acc.sub_group.toLowerCase().includes('other')) {
        indirectIncomes.push({ name: acc.name, amount: acc.closingCr });
        totalIndirectIncome += acc.closingCr;
      } else {
        directIncomes.push({ name: acc.name, amount: acc.closingCr });
        totalSalesAndRevenue += acc.closingCr;
      }
    } else if (acc.primary_type === 'EXPENSES') {
      if (acc.sub_group.toLowerCase().includes('indirect') || acc.sub_group.toLowerCase().includes('office') || acc.sub_group.toLowerCase().includes('general')) {
        indirectExpenses.push({ name: acc.name, amount: acc.closingDr });
        totalIndirectExpense += acc.closingDr;
      } else {
        directExpenses.push({ name: acc.name, amount: acc.closingDr });
        totalCostOfGoodsSold += acc.closingDr;
      }
    }
  });

  // Add Closing Stock Valuation to Direct Income
  const tradingCreditTotal = totalSalesAndRevenue + closingStockValuation;
  const grossProfit = tradingCreditTotal - totalCostOfGoodsSold;
  const netProfit = grossProfit + totalIndirectIncome - totalIndirectExpense;

  // 6. Compile Balance Sheet
  const assets = [];
  const liabilities = [];
  const capital = [];

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalCapital = 0;

  Object.values(ledgerMap).forEach(acc => {
    if (acc.primary_type === 'ASSETS') {
      const amt = acc.closingDr > 0 ? acc.closingDr : -acc.closingCr;
      assets.push({ name: acc.name, group: acc.sub_group, amount: amt });
      totalAssets += amt;
    } else if (acc.primary_type === 'LIABILITIES') {
      const amt = acc.closingCr > 0 ? acc.closingCr : -acc.closingDr;
      liabilities.push({ name: acc.name, group: acc.sub_group, amount: amt });
      totalLiabilities += amt;
    } else if (acc.primary_type === 'EQUITY') {
      const amt = acc.closingCr > 0 ? acc.closingCr : -acc.closingDr;
      capital.push({ name: acc.name, group: acc.sub_group, amount: amt });
      totalCapital += amt;
    }
  });

  // Include Stock Valuation in Current Assets
  if (closingStockValuation > 0) {
    assets.push({ name: 'Closing Stock (इन्वेंटरी स्टॉक)', group: 'Current Assets', amount: closingStockValuation });
    totalAssets += closingStockValuation;
  }

  // Include Net Profit in Capital/Equity
  const effectiveEquity = totalCapital + netProfit;
  const totalLiabilitiesAndEquity = totalLiabilities + effectiveEquity;
  const balanceSheetDifference = Math.abs(totalAssets - totalLiabilitiesAndEquity);

  return {
    trialBalance: {
      entries: trialBalance,
      totalDebit: tbTotalDr,
      totalCredit: tbTotalCr,
      isMatched: Math.abs(tbTotalDr - tbTotalCr) < 0.01
    },
    profitAndLoss: {
      directIncomes,
      directExpenses,
      closingStockValuation,
      totalSalesAndRevenue,
      totalCostOfGoodsSold,
      grossProfit,
      indirectIncomes,
      indirectExpenses,
      totalIndirectIncome,
      totalIndirectExpense,
      netProfit
    },
    balanceSheet: {
      assets,
      liabilities,
      capital,
      closingStockValuation,
      totalAssets,
      totalLiabilities,
      totalCapital,
      netProfit,
      effectiveEquity,
      totalLiabilitiesAndEquity,
      isTally: balanceSheetDifference < 0.01,
      difference: balanceSheetDifference
    }
  };
};

export const getFinancialStatements = generateFinancialStatements;
