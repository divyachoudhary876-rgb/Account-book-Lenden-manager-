// frontend/src/utils/financialReportEngine.js

import { getAllUniversalVouchers, getAccountHeads } from './statementEngine.js';
import { getStockItemsByFirm } from './stockInventoryEngine.js';

export const generateFinancialStatements = (firmId = 'FIRM-001') => {
  const vouchers = getAllUniversalVouchers(firmId);
  const stockItems = getStockItemsByFirm(firmId);
  const accounts = getAccountHeads(firmId);

  let salesRevenue = 0;
  let purchasesCost = 0;
  let directExpenses = 0;
  let indirectExpenses = 0;
  let otherIncome = 0;

  const ledgerTotals = {};
  accounts.forEach(a => {
    ledgerTotals[a.account_name] = { primary_type: a.primary_type, sub_group: a.sub_group, dr: 0, cr: 0 };
  });

  vouchers.forEach(v => {
    const amt = parseFloat(v.amount || 0);
    const type = (v.voucher_type || '').toUpperCase();
    const dr = v.dr_account;
    const cr = v.cr_account;

    if (!ledgerTotals[dr]) ledgerTotals[dr] = { primary_type: 'EXPENSES', sub_group: 'General', dr: 0, cr: 0 };
    if (!ledgerTotals[cr]) ledgerTotals[cr] = { primary_type: 'INCOME', sub_group: 'General', dr: 0, cr: 0 };

    ledgerTotals[dr].dr += amt;
    ledgerTotals[cr].cr += amt;

    if (type === 'SALES' || cr.toLowerCase().includes('sales')) {
      salesRevenue += amt;
    } else if (type === 'PURCHASE' || dr.toLowerCase().includes('purchase') || dr.toLowerCase().includes('diesel')) {
      purchasesCost += amt;
    } else if (dr.toLowerCase().includes('expense') || dr.toLowerCase().includes('labor') || dr.toLowerCase().includes('maint')) {
      directExpenses += amt;
    } else if (cr.toLowerCase().includes('income')) {
      otherIncome += amt;
    }
  });

  const closingStockValuation = stockItems.reduce((sum, item) => {
    return sum + (parseFloat(item.current_stock || 0) * parseFloat(item.unit_purchase_price || 0));
  }, 0);

  const grossProfit = salesRevenue + closingStockValuation - (purchasesCost + directExpenses);
  const netProfit = grossProfit + otherIncome - indirectExpenses;

  let totalDebtors = 0;
  let totalCreditors = 0;
  let totalCashBank = 0;

  Object.entries(ledgerTotals).forEach(([name, val]) => {
    const net = val.dr - val.cr;
    const nameLower = name.toLowerCase();

    if (val.primary_type === 'ASSETS' || nameLower.includes('customer') || nameLower.includes('sharma')) {
      if (net > 0 && !nameLower.includes('cash') && !nameLower.includes('bank')) totalDebtors += net;
    }
    if (val.primary_type === 'LIABILITIES' || nameLower.includes('supplier') || nameLower.includes('pump') || nameLower.includes('kisan')) {
      if (net < 0) totalCreditors += Math.abs(net);
    }
    if (nameLower.includes('cash') || nameLower.includes('bank') || nameLower.includes('sbi')) {
      totalCashBank += net;
    }
  });

  const totalCurrentAssets = totalDebtors + totalCashBank + closingStockValuation;

  return {
    tradingAndPL: {
      salesRevenue,
      purchasesCost,
      directExpenses,
      closingStock: closingStockValuation,
      grossProfit,
      otherIncome,
      indirectExpenses,
      netProfit
    },
    balanceSheet: {
      assets: {
        sundryDebtors: totalDebtors,
        cashAndBank: totalCashBank,
        closingStock: closingStockValuation,
        totalAssets: totalCurrentAssets
      },
      liabilities: {
        sundryCreditors: totalCreditors,
        capitalAccount: totalCurrentAssets - totalCreditors,
        totalLiabilitiesAndEquity: totalCurrentAssets
      }
    }
  };
};
