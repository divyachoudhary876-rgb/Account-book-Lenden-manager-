// frontend/src/utils/financialReportEngine.js

import { getFirmMasterAccounts } from './accountMasterEngine.js';
import { StorageService } from './storageSync';
import { getAllFirmVouchers } from './ledgerEngine';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

const normalizeKey = (name = '') => {
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

const getFYDateRange = (fyString = '2026-27') => {
  try {
    const clean = String(fyString || '2026-27').replace(/FY\s*/i, '').trim();
    const parts = clean.split('-');
    if (parts.length === 2) {
      let startYear = parseInt(parts[0], 10);
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

/**
 * Comprehensive Ledger Lines Normalizer with Strict Canonical Account Matching
 */
export const getNormalizedLedgerLines = (firmId = 'FIRM-001', selectedFY = '2026-27') => {
  const { startDate, endDate } = getFYDateRange(selectedFY);
  const activeFirmId = String(firmId || 'FIRM-001').trim();

  let rawTx = [];
  try {
    rawTx = getAllFirmVouchers(activeFirmId);
  } catch (e) {
    rawTx = [];
  }

  // 1. Ingest Payroll / Wages records
  const payrollKeys = [`payroll_records_${activeFirmId}`, `worker_wages_${activeFirmId}`, `worker_ledgers_${activeFirmId}`, `wage_entries_${activeFirmId}`];
  payrollKeys.forEach(pk => {
    try {
      const pVal = JSON.parse(localStorage.getItem(pk) || '[]');
      if (Array.isArray(pVal)) {
        pVal.forEach(p => {
          if (!p) return;
          const pDate = p.date || p.work_date || p.voucher_date || new Date().toISOString().slice(0, 10);
          const pAmt = parseFloat(p.amount || p.total_amount || p.kul_amount || p.earned || 0);
          const workerName = String(p.worker_name || p.worker || p.party || 'Labour Wages').trim();
          const expenseAcc = String(p.expense_account || p.category || 'Pathai & Labour Expenses').trim();
          
          if (pAmt > 0) {
            rawTx.push({
              id: p.id || `PAYROLL-${Math.random()}`,
              voucher_date: pDate,
              voucher_type: 'PAYROLL',
              reference_no: p.reference_no || 'WAGE',
              dr_account: expenseAcc,
              cr_account: workerName,
              amount: pAmt,
              narration: p.remarks || p.description || 'Labour Wages Entry'
            });
          }
        });
      }
    } catch (e) {}
  });

  // 2. Ingest Material Consumption Records
  const consumptionKeys = [`material_consumption_records_${activeFirmId}`, `universal_material_adjustments_${activeFirmId}`];
  consumptionKeys.forEach(ck => {
    try {
      const cVal = JSON.parse(localStorage.getItem(ck) || '[]');
      if (Array.isArray(cVal)) {
        cVal.forEach(c => {
          if (!c) return;
          const cDate = c.date || new Date().toISOString().slice(0, 10);
          const cAmt = parseFloat(c.total_value || c.amount || 0);
          const expAcc = String(c.expense_account || 'Factory Manufacturing Expenses').trim();
          const stockAcc = String(c.item_name || c.name || 'Raw Material Stock').trim() + ' Stock Account';

          if (cAmt > 0) {
            rawTx.push({
              id: c.id || `CONS-${Math.random()}`,
              voucher_date: cDate,
              voucher_type: 'CONSUMPTION',
              reference_no: 'CONS',
              dr_account: expAcc,
              cr_account: stockAcc,
              amount: cAmt,
              narration: c.uses_for || c.remarks || 'Material Issue'
            });
          }
        });
      }
    } catch (e) {}
  });

  const uniqueVoucherMap = new Map();
  rawTx.forEach(v => {
    if (!v) return;
    const vFirm = String(v.firm_id || v.firmId || '').trim();
    if (vFirm && vFirm !== activeFirmId && vFirm !== 'FIRM-001' && activeFirmId !== 'FIRM-001') return;

    const vDate = v.voucher_date || v.date || '';
    if (vDate && (vDate < startDate || vDate > endDate)) return;

    const uniqueId = v.id || v.reference_no || v.voucher_number || `${vDate}-${v.amount || v.total_amount || 0}-${v.dr_account || ''}-${v.cr_account || ''}`;
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
    const narration = vch.narration || vch.notes || vch.description || '';

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
    } 
    else if ((vch.dr_account || vch.debit_account) && (vch.cr_account || vch.credit_account) && (vch.amount || vch.total_amount || vch.grand_total)) {
      const amt = parseFloat(vch.amount || vch.total_amount || vch.grand_total || 0);
      const drAcc = String(vch.dr_account || vch.debit_account || '').trim();
      const crAcc = String(vch.cr_account || vch.credit_account || '').trim();

      if (amt > 0 && drAcc && crAcc) {
        flatLines.push({ voucher_id: vch.id, date: vchDate, voucher_number: vchNum, voucher_type: vchType, account_name: drAcc, entry_type: 'Dr', amount: amt, narration });
        flatLines.push({ voucher_id: vch.id, date: vchDate, voucher_number: vchNum, voucher_type: vchType, account_name: crAcc, entry_type: 'Cr', amount: amt, narration });
      }
    }
  });

  return flatLines;
};

export const generateFinancialStatements = (firmId = 'FIRM-001', selectedFY = '2026-27') => {
  const masterAccounts = getSafeAccounts(firmId, selectedFY);
  const flatLines = getNormalizedLedgerLines(firmId, selectedFY);

  const accountTotals = {};
  const canonicalMap = {}; // Maps normalized key -> display account name

  masterAccounts.forEach((acc) => {
    const name = (acc.account_name || acc.name || '').trim();
    if (!name) return;
    const normKey = normalizeKey(name);
    const opening = parseFloat(acc.opening_balance || acc.openingBalance || 0);
    const isDebitOpening = String(acc.balance_type || acc.balanceType || 'Dr').trim().toUpperCase() === 'DR';

    canonicalMap[normKey] = name;

    accountTotals[name] = {
      account_name: name,
      primary_type: (acc.primary_type || acc.type || 'ASSETS').toUpperCase(),
      sub_group: acc.sub_group || acc.group || '',
      debit: isDebitOpening ? opening : 0,
      credit: !isDebitOpening ? opening : 0
    };
  });

  flatLines.forEach((line) => {
    const rawName = line.account_name.trim();
    const normKey = normalizeKey(rawName);
    
    let targetName = canonicalMap[normKey];
    if (!targetName) {
      targetName = rawName;
      canonicalMap[normKey] = rawName;
    }

    if (!accountTotals[targetName]) {
      let inferredType = 'EXPENSES';
      const lower = targetName.toLowerCase();
      if (lower.includes('cash') || lower.includes('bank') || lower.includes('debtor') || lower.includes('stock') || lower.includes('asset')) inferredType = 'ASSETS';
      else if (lower.includes('sale') || lower.includes('income') || lower.includes('revenue')) inferredType = 'INCOME';
      else if (lower.includes('capital') || lower.includes('creditor') || lower.includes('loan') || lower.includes('liability') || lower.includes('worker') || lower.includes('thekedar') || lower.includes('munsari')) inferredType = 'LIABILITIES';

      accountTotals[targetName] = { account_name: targetName, primary_type: inferredType, sub_group: 'General', debit: 0, credit: 0 };
    }

    if (line.entry_type === 'Dr') {
      accountTotals[targetName].debit += line.amount;
    } else {
      accountTotals[targetName].credit += line.amount;
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
        finalDr = round2(net);
      } else {
        finalCr = round2(Math.abs(net));
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

  const totalDebit = round2(grandTotalDebit);
  const totalCredit = round2(grandTotalCredit);
  const difference = round2(Math.abs(totalDebit - totalCredit));
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
      if (group.includes('direct') || name.includes('purchase') || name.includes('raw') || name.includes('pathai') || name.includes('diesel') || name.includes('labour') || name.includes('wages')) {
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
        const qty = parseFloat(stk.current_stock || stk.stock || stk.qty || 0);
        const rate = parseFloat(
          stk.unit_purchase_price || 
          stk.purchase_price || 
          stk.cost_price || 
          stk.unit_valuation || 
          stk.rate || 
          0
        );
        if (qty > 0 && rate > 0) closingStockValuation += (qty * rate);
      }
    });
  } catch (e) {}

  closingStockValuation = round2(closingStockValuation);
  const grossProfit = round2((salesTotal + closingStockValuation) - (purchasesTotal + directExpenses));
  const netProfit = round2((grossProfit + indirectIncomes) - indirectExpenses);

  return {
    trialBalance: { rows: trialBalances, totalDebit, totalCredit, difference, isBalanced },
    tradingAccount: { sales: round2(salesTotal), purchases: round2(purchasesTotal), directExpenses: round2(directExpenses), closingStock: closingStockValuation, grossProfit },
    profitAndLoss: { grossProfit, indirectIncomes: round2(indirectIncomes), indirectExpenses: round2(indirectExpenses), netProfit },
    balanceSheet: { netProfit, closingStock: closingStockValuation }
  };
};
