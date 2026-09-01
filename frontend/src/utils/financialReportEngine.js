// frontend/src/utils/financialReportEngine.js

import { getAllUniversalVouchers, getAccountHeads } from './statementEngine.js';
import { getStockItemsByFirm } from './stockInventoryEngine.js';

/**
 * Universal Financial Reports Generator: Computes P&L and Balance Sheet dynamically
 */
export const generateFinancialStatements = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  const vouchers = getAllUniversalVouchers(targetId);
  const stockItems = getStockItemsByFirm(targetId);
  const accounts = getAccountHeads(targetId);

  let totalSalesRevenue = 0;
  let totalPurchasesCost = 0;
  let directExpenses = 0;
  let indirectExpenses = 0;
  let otherIncome = 0;

  // Account Balances Registry for Balance Sheet
  const accountBalances = {};
  accounts.forEach(acc => {
    accountBalances[acc.account_name] = {
      group: acc.account_group || acc.primary_type || 'GENERAL',
      subGroup: acc.sub_group || '',
      debit: 0,
      credit: 0
    };
  });

  // Calculate voucher impacts
  vouchers.forEach(v => {
    const amt = parseFloat(v.amount || 0);
    const vType = (v.voucher_type || '').toUpperCase();
    const dr = v.dr_account || '';
    const cr = v.cr_account || '';

    // Register Ledger balances
    if (!accountBalances[dr]) accountBalances[dr] = { group: 'EXPENSES', subGroup: 'GENERAL', debit: 0, credit: 0 };
    if (!accountBalances[cr]) accountBalances[cr] = { group: 'INCOME', subGroup: 'GENERAL', debit: 0, credit: 0 };

    accountBalances[dr].debit += amt;
    accountBalances[cr].credit += amt;

    // Classify for Profit & Loss
    if (vType === 'SALES' || cr.toLowerCase().includes('sale') || cr.toLowerCase().includes('revenue')) {
      totalSalesRevenue += amt;
    } else if (vType === 'PURCHASE' || dr.toLowerCase().includes('purchase') || dr.toLowerCase().includes('diesel')) {
      totalPurchasesCost += amt;
    } else if (dr.toLowerCase().includes('expense') || dr.toLowerCase().includes('labor') || dr.toLowerCase().includes('kharcha')) {
      directExpenses += amt;
    } else if (cr.toLowerCase().includes('income') || cr.toLowerCase().includes('interest')) {
      otherIncome += amt;
    }
  });

  // Current Stock Valuation (Closing Stock)
  const totalStockValuation = stockItems.reduce((acc, curr) => {
    const qty = parseFloat(curr.current_stock || 0);
    const rate = parseFloat(curr.unit_purchase_price || curr.purchase_rate || 0);
    return acc + (qty * rate);
  }, 0);

  // Trading & P&L Calculation
  const grossProfit = totalSalesRevenue + totalStockValuation - (totalPurchasesCost + directExpenses);
  const netProfit = grossProfit + otherIncome - indirectExpenses;

  // Balance Sheet Assets & Liabilities
  let totalSundryDebtors = 0;
  let totalSundryCreditors = 0;
  let totalCashBank = 0;

  Object.entries(accountBalances).forEach(([name, data]) => {
    const net = data.debit - data.credit;
    const nameLower = name.toLowerCase();

    if (data.group.includes('DEBTOR') || nameLower.includes('customer') || nameLower.includes('traders')) {
      if (net > 0) totalSundryDebtors += net;
    } else if (data.group.includes('CREDITOR') || nameLower.includes('supplier') || nameLower.includes('pump') || nameLower.includes('padgad')) {
      if (net < 0) totalSundryCreditors += Math.abs(net);
    } else if (data.group.includes('CASH') || data.group.includes('BANK') || nameLower.includes('cash') || nameLower.includes('bank') || nameLower.includes('sbi')) {
      totalCashBank += net;
    }
  });

  const totalCurrentAssets = totalSundryDebtors + totalCashBank + totalStockValuation;
  const totalLiabilities = totalSundryCreditors;

  return {
    tradingAndPL: {
      salesRevenue: totalSalesRevenue,
      purchasesCost: totalPurchasesCost,
      directExpenses,
      closingStock: totalStockValuation,
      grossProfit,
      otherIncome,
      indirectExpenses,
      netProfit
    },
    balanceSheet: {
      assets: {
        sundryDebtors: totalSundryDebtors,
        cashAndBank: totalCashBank,
        closingStock: totalStockValuation,
        totalAssets: totalCurrentAssets
      },
      liabilities: {
        sundryCreditors: totalSundryCreditors,
        capitalAccount: totalCurrentAssets - totalLiabilities, // Balanced Net Worth
        totalLiabilitiesAndEquity: totalCurrentAssets
      }
    }
  };
};
