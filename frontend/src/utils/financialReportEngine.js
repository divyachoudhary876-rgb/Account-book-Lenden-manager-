// frontend/src/utils/financialReportEngine.js

import { getFirmMasterAccounts } from './accountMasterEngine.js';
import { StorageService } from './storageSync';

// Helper to get Date range for selected FY (e.g., '2026-27' -> 2026-04-01 to 2027-03-31)
const getFYDateRange = (fyString = '2026-27') => {
  try {
    const parts = fyString.split('-');
    if (parts.length === 2) {
      let startYear = parseInt(parts[0]);
      let endYear = startYear + 1;
      if (startYear < 100) startYear += 2000;
      if (endYear < 100) endYear += 2000;
      
      return {
        startDate: `${startYear}-04-01`,
        endDate: `${endYear}-03-31`,
        prevFY: `${startYear - 1}-${String(startYear).slice(-2)}`
      };
    }
  } catch (e) {}
  return { startDate: '2026-04-01', endDate: '2027-03-31', prevFY: '2025-26' };
};

export const getSafeAccounts = (firmId = 'FIRM-001', selectedFY = '2026-27') => {
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

  return [];
};

export const getNormalizedLedgerLines = (firmId = 'FIRM-001', selectedFY = '2026-27') => {
  const { startDate, endDate } = getFYDateRange(selectedFY);

  let rawTx = [];
  // STRICT FIRM ISOLATION: Sirf active firm ki keys scan hongi
  const keysToScan = [
    `account_book_vouchers_${firmId}`,
    `app_vouchers_${firmId}`,
    `app_payroll_entries_${firmId}`
  ];

  keysToScan.forEach(k => {
    try {
      const val = StorageService.getItem ? StorageService.getItem(k) : JSON.parse(localStorage.getItem(k) || '[]');
      if (Array.isArray(val)) rawTx.push(...val);
    } catch (e) {}
  });

  const uniqueVoucherMap = new Map();
  rawTx.forEach(v => {
    if (!v) return;
    // Strict isolation check: dusri firm ka record reject karein
    const vFirm = String(v.firm_id || v.firmId || '').trim();
    if (vFirm && vFirm !== String(firmId).trim()) return;

    const vDate = v.voucher_date || v.date || '';
    if (vDate && (vDate < startDate || vDate > endDate)) return;

    const uniqueId = v.id || v.reference_no || `${vDate}-${v.total_amount || v.amount || 0}`;
    if (!uniqueVoucherMap.has(uniqueId)) {
      uniqueVoucherMap.set(uniqueId, v);
    }
  });

  const uniqueVouchers = Array.from(uniqueVoucherMap.values());
  const flatLines = [];

  uniqueVouchers.forEach((vch) => {
    const vchDate = vch.voucher_date || vch.date || '';
    const vchNum = vch.reference_no || vch.voucher_number || 'VCH';
    const vchType = (vch.voucher_type || vch.type || 'JOURNAL').toUpperCase();
    const narration = vch.narration || '';

    if (Array.isArray(vch.entries) && vch.entries.length > 0) {
      vch.entries.forEach((entry) => {
        const accName = (entry.account_name || entry.party || '').trim();
        const drVal = parseFloat(entry.debit || (entry.type === 'Dr' || entry.type === 'DR' ? entry.amount : 0) || 0);
        const crVal = parseFloat(entry.credit || (entry.type === 'Cr' || entry.type === 'CR' ? entry.amount : 0) || 0);

        if (accName) {
          if (drVal > 0) {
            flatLines.push({ voucher_id: vch.id, date: vchDate, voucher_number: vchNum, voucher_type: vchType, account_name: accName, entry_type: 'Dr', amount: drVal, narration });
          }
          if (crVal > 0) {
            flatLines.push({ voucher_id: vch.id, date: vchDate, voucher_number: vchNum, voucher_type: vchType, account_name: accName, entry_type: 'Cr', amount: crVal, narration });
          }
        }
      });
    } else if (vch.dr_account && vch.cr_account && (vch.amount || vch.total_amount)) {
      const amt = parseFloat(vch.amount || vch.total_amount || 0);
      if (amt > 0) {
        flatLines.push({ voucher_id: vch.id, date: vchDate, voucher_number: vchNum, voucher_type: vchType, account_name: String(vch.dr_account).trim(), entry_type: 'Dr', amount: amt, narration });
        flatLines.push({ voucher_id: vch.id, date: vchDate, voucher_number: vchNum, voucher_type: vchType, account_name: String(vch.cr_account).trim(), entry_type: 'Cr', amount: amt, narration });
      }
    } else if (vch.worker && vch.expense_ledger && vch.total_amount) {
      const amt = parseFloat(vch.total_amount || 0);
      if (amt > 0) {
        flatLines.push({ voucher_id: vch.id, date: vchDate, voucher_number: vchNum, voucher_type: vchType, account_name: String(vch.expense_ledger).trim(), entry_type: 'Dr', amount: amt, narration });
        flatLines.push({ voucher_id: vch.id, date: vchDate, voucher_number: vchNum, voucher_type: vchType, account_name: String(vch.worker).trim(), entry_type: 'Cr', amount: amt, narration });
      }
    }
  });

  return flatLines;
};

export const generateFinancialStatements = (firmId = 'FIRM-001', selectedFY = '2026-27') => {
  const masterAccounts = getSafeAccounts(firmId, selectedFY);
  const flatLines = getNormalizedLedgerLines(firmId, selectedFY);

  const accountTotals = {};

  // Load opening balances strictly from master accounts of this firm
  masterAccounts.forEach((acc) => {
    const name = (acc.account_name || acc.name || '').trim();
    if (!name) return;
    const opening = parseFloat(acc.opening_balance || acc.openingBalance || 0);
    const isDebitOpening = (acc.balance_type || acc.balanceType || 'Dr') === 'Dr';

    accountTotals[name] = {
      account_name: name,
      primary_type: acc.primary_type || acc.type || 'ASSETS',
      sub_group: acc.sub_group || acc.group || '',
      debit: isDebitOpening ? opening : 0,
      credit: !isDebitOpening ? opening : 0
    };
  });

  flatLines.forEach((line) => {
    const name = line.account_name.trim();
    if (!accountTotals[name]) {
      let inferredType = 'EXPENSES';
      const lower = name.toLowerCase();
      if (lower.includes('cash') || lower.includes('bank') || lower.includes('debtor')) inferredType = 'ASSETS';
      else if (lower.includes('sale') || lower.includes('income') || lower.includes('revenue')) inferredType = 'INCOME';
      else if (lower.includes('capital') || lower.includes('creditor') || lower.includes('loan')) inferredType = 'LIABILITIES';

      accountTotals[name] = { account_name: name, primary_type: inferredType, sub_group: 'General', debit: 0, credit: 0 };
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

    if (Math.abs(net) > 0.01) {
      let finalDr = 0;
      let finalCr = 0;

      if (net > 0) {
        finalDr = parseFloat(net.toFixed(2));
      } else {
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
    const type = (row.primary_type || '').toUpperCase();
    const group = (row.sub_group || '').toLowerCase();
    const name = row.account_name.toLowerCase();

    if (type === 'INCOME') {
      if (group.includes('direct') || name.includes('sale') || name.includes('revenue')) salesTotal += row.credit;
      else indirectIncomes += row.credit;
    } else if (type === 'EXPENSES') {
      if (group.includes('direct') || name.includes('purchase') || name.includes('raw') || name.includes('pathai') || name.includes('diesel')) {
        purchasesTotal += row.debit;
      } else {
        indirectExpenses += row.debit;
      }
    }
  });

  let closingStockValuation = 0;
  try {
    const stockKey = `inventory_items_${firmId}`;
    const stockItems = JSON.parse(localStorage.getItem(stockKey) || '[]');
    stockItems.forEach((stk) => {
      if (!stk.is_service && stk.item_type !== 'SERVICE') {
        const qty = parseFloat(stk.current_stock || stk.stock || 0);
        const rate = parseFloat(stk.unit_purchase_price || stk.purchase_price || stk.rate || 0);
        if (qty > 0 && rate > 0) closingStockValuation += (qty * rate);
      }
    });
  } catch (e) {}

  const grossProfit = parseFloat(((salesTotal + closingStockValuation) - (purchasesTotal + directExpenses)).toFixed(2));
  const netProfit = parseFloat(((grossProfit + indirectIncomes) - indirectExpenses).toFixed(2));

  return {
    trialBalance: { rows: trialBalances, totalDebit: parseFloat(grandTotalDebit.toFixed(2)), totalCredit: parseFloat(grandTotalCredit.toFixed(2)), difference: parseFloat(difference.toFixed(2)), isBalanced },
    tradingAccount: { sales: salesTotal, purchases: purchasesTotal, directExpenses, closingStock: parseFloat(closingStockValuation.toFixed(2)), grossProfit },
    profitAndLoss: { grossProfit, indirectIncomes, indirectExpenses, netProfit },
    balanceSheet: { netProfit, closingStock: parseFloat(closingStockValuation.toFixed(2)) }
  };
};
