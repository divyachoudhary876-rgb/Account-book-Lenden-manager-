// frontend/src/utils/autoRolloverEngine.js

import { StorageService } from './storageSync';
import { getFirmMasterAccounts, saveMasterAccount } from './accountMasterEngine.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

/**
 * Enterprise Automatic Financial Year Rollover Engine
 * - Strictly rolls over Balance Sheet Accounts (Assets, Liabilities, Capital, Cash, Debtors, Creditors)
 * - Strictly resets Profit & Loss Accounts (Income, Sales, Expenses, Wages) to Zero as per Ind AS / GAAP
 * - Carries forward Closing Stock to Opening Stock
 * - Strictly enforces Firm Isolation (zero cross-firm leakage)
 */
export const performFinancialYearRollover = (firmId = 'FIRM-001', selectedFY = '2026-27') => {
  const activeFirmId = String(firmId || 'FIRM-001').trim();

  try {
    // 1. Sanitize & extract FY start date
    const cleanFY = String(selectedFY || '2026-27').replace(/FY\s*/i, '').trim();
    const match = cleanFY.match(/\d{4}/);
    if (!match) return { success: false, message: 'Invalid FY string format' };

    const currentStartYear = parseInt(match[0], 10);
    const fyStartDate = `${currentStartYear}-04-01`;

    // Rollover execution lock key (per firm, per FY)
    const rolloverKey = `rollover_done_${activeFirmId}_${cleanFY}`;
    if (localStorage.getItem(rolloverKey) === 'true') {
      return { success: true, alreadyDone: true, message: `FY ${cleanFY} balances already rolled over.` };
    }

    // 2. Scan vouchers strictly belonging to this active firm prior to new FY start date
    const rawTx = [];
    const keysToScan = [
      `account_book_vouchers_${activeFirmId}`,
      `app_vouchers_${activeFirmId}`,
      `app_payroll_entries_${activeFirmId}`
    ];

    keysToScan.forEach(k => {
      try {
        const val = StorageService.getItem ? StorageService.getItem(k) : JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(val)) rawTx.push(...val);
      } catch (e) {}
    });

    const accountNetBalances = {};
    let totalSales = 0;
    let totalPurchasesExpenses = 0;

    rawTx.forEach(vch => {
      if (!vch) return;
      const vFirm = String(vch.firm_id || vch.firmId || '').trim();
      if (vFirm && vFirm !== activeFirmId) return;

      const vDate = vch.voucher_date || vch.date || '';
      // Consider transactions strictly prior to the new FY start date
      if (vDate && vDate < fyStartDate) {
        
        // Handle Payroll Entries
        if (vch.worker && vch.expense_ledger && vch.total_amount) {
          const wName = String(vch.worker).trim();
          const expName = String(vch.expense_ledger).trim();
          const amt = Number(vch.total_amount || 0);

          if (!accountNetBalances[wName]) accountNetBalances[wName] = 0;
          if (!accountNetBalances[expName]) accountNetBalances[expName] = 0;

          accountNetBalances[expName] += amt; // Dr Expense
          accountNetBalances[wName] -= amt;   // Cr Worker Liability
          totalPurchasesExpenses += amt;
          return;
        }

        // Handle Compound Vouchers
        if (Array.isArray(vch.entries) && vch.entries.length > 0) {
          vch.entries.forEach(e => {
            const accName = (e.account_name || e.party || '').trim();
            if (!accName) return;
            if (!accountNetBalances[accName]) accountNetBalances[accName] = 0;

            const dr = Number(e.debit || (e.type === 'DR' || e.type === 'Dr' ? e.amount : 0) || 0);
            const cr = Number(e.credit || (e.type === 'CR' || e.type === 'Cr' ? e.amount : 0) || 0);

            if (dr > 0) accountNetBalances[accName] += dr;
            if (cr > 0) accountNetBalances[accName] -= cr;
          });
        } 
        // Handle Simple Dr/Cr Vouchers
        else if (vch.dr_account && vch.cr_account && (vch.amount || vch.total_amount)) {
          const drName = String(vch.dr_account).trim();
          const crName = String(vch.cr_account).trim();
          const amt = Number(vch.amount || vch.total_amount || 0);

          if (!accountNetBalances[drName]) accountNetBalances[drName] = 0;
          if (!accountNetBalances[crName]) accountNetBalances[crName] = 0;

          accountNetBalances[drName] += amt;
          accountNetBalances[crName] -= amt;
        }
      }
    });

    // 3. Update Master Accounts with strict Category Filtering
    let masterAccounts = getFirmMasterAccounts(activeFirmId) || [];
    if (!Array.isArray(masterAccounts) || masterAccounts.length === 0) {
      try {
        const raw = localStorage.getItem(`app_accounts_${activeFirmId}`);
        if (raw) masterAccounts = JSON.parse(raw);
      } catch (e) {}
    }

    if (Array.isArray(masterAccounts) && masterAccounts.length > 0) {
      const updatedAccounts = masterAccounts.map(acc => {
        const name = (acc.account_name || acc.name || '').trim();
        const type = (acc.primary_type || acc.type || '').toUpperCase();
        const grp = (acc.sub_group || acc.group || '').toLowerCase();
        const nLower = name.toLowerCase();

        // Check if account is a Balance Sheet item
        const isBalanceSheetAccount = 
          type === 'ASSETS' || 
          type === 'LIABILITIES' || 
          grp.includes('asset') || 
          grp.includes('liability') || 
          grp.includes('capital') || 
          grp.includes('creditor') || 
          grp.includes('debtor') || 
          grp.includes('thekedar') ||
          grp.includes('cash') || 
          grp.includes('bank') ||
          grp.includes('loan') ||
          nLower.includes('cash') ||
          nLower.includes('bank') ||
          nLower.includes('रोकड़');

        if (!isBalanceSheetAccount) {
          // P&L Accounts (Income, Expense, Wages, Sales, Fuel) reset to 0 in new FY
          return {
            ...acc,
            opening_balance: 0,
            openingBalance: 0
          };
        }

        // Compute net closing balance of the previous year
        const currentOpening = Number(acc.opening_balance || acc.openingBalance || 0);
        const isDebitInitial = (acc.balance_type || acc.balanceType || 'Dr') === 'Dr';
        const initialNet = isDebitInitial ? currentOpening : -currentOpening;

        const txNet = accountNetBalances[name] !== undefined ? accountNetBalances[name] : 0;
        const finalNet = round2(initialNet + txNet);

        return {
          ...acc,
          opening_balance: Math.abs(finalNet),
          openingBalance: Math.abs(finalNet),
          balance_type: finalNet >= 0 ? 'Dr' : 'Cr',
          balanceType: finalNet >= 0 ? 'Dr' : 'Cr',
          updated_at: new Date().toISOString()
        };
      });

      localStorage.setItem(`app_accounts_${activeFirmId}`, JSON.stringify(updatedAccounts));
    }

    // 4. Carry forward Closing Stock as Opening Stock for New Financial Year
    const stockKey = `inventory_items_${activeFirmId}`;
    try {
      const stockList = JSON.parse(localStorage.getItem(stockKey) || '[]');
      if (Array.isArray(stockList) && stockList.length > 0) {
        const updatedStock = stockList.map(item => {
          const curQty = Number(item.current_stock || item.stock || item.qty || 0);
          const rate = Number(item.cost_price || item.unit_purchase_price || item.purchase_price || item.rate || 0);
          return {
            ...item,
            opening_stock: curQty,
            opening_valuation: round2(curQty * rate),
            updated_at: new Date().toISOString()
          };
        });
        localStorage.setItem(stockKey, JSON.stringify(updatedStock));
      }
    } catch (e) {}

    // 5. Mark rollover completed for this FY
    localStorage.setItem(rolloverKey, 'true');

    // Trigger Reactive UI Broadcast
    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('storage'));

    return { 
      success: true, 
      message: `✓ FY ${cleanFY} me Balance Sheet accounts aur Inventory stock successfully roll forward ho gaye!` 
    };

  } catch (err) {
    console.error('Error during Financial Year Rollover:', err);
    return { success: false, message: `Rollover Failed: ${err.message}` };
  }
};
