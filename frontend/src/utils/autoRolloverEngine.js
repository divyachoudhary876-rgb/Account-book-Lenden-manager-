// frontend/src/utils/autoRolloverEngine.js

import { StorageService } from './storageSync';
import { getFirmMasterAccounts } from './accountMasterEngine.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export const performFinancialYearRollover = (firmId = 'FIRM-001', selectedFY = '2026-27') => {
  const activeFirmId = String(firmId || 'FIRM-001').trim();

  try {
    const cleanFY = String(selectedFY || '2026-27').replace(/FY\s*/i, '').trim();
    const match = cleanFY.match(/\d{4}/);
    if (!match) return { success: false, message: 'Invalid FY string format' };

    const currentStartYear = parseInt(match[0], 10);
    const fyStartDate = `${currentStartYear}-04-01`;

    // Force clear rollover lock cache to allow real-time backdated entry sync
    const rolloverKey = `rollover_done_${activeFirmId}_${cleanFY}`;
    localStorage.removeItem(rolloverKey);

    const rawTx = [];
    const keysToScan = [
      `app_vouchers_${activeFirmId}`,
      `account_book_vouchers_${activeFirmId}`,
      `app_payroll_entries_${activeFirmId}`
    ];

    keysToScan.forEach(k => {
      try {
        const val = StorageService.getItem ? StorageService.getItem(k) : JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(val)) rawTx.push(...val);
      } catch (e) {}
    });

    const accountNetBalances = {};

    rawTx.forEach(vch => {
      if (!vch) return;
      const vFirm = String(vch.firm_id || vch.firmId || '').trim();
      if (vFirm && vFirm !== activeFirmId) return;

      const vDate = vch.voucher_date || vch.date || '';
      if (vDate && vDate < fyStartDate) {
        if (vch.worker && vch.expense_ledger && vch.total_amount) {
          const wName = String(vch.worker).trim();
          const expName = String(vch.expense_ledger).trim();
          const amt = Number(vch.total_amount || 0);

          if (!accountNetBalances[wName]) accountNetBalances[wName] = 0;
          if (!accountNetBalances[expName]) accountNetBalances[expName] = 0;

          accountNetBalances[expName] += amt;
          accountNetBalances[wName] -= amt;
          return;
        }

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
        } else if (vch.dr_account && vch.cr_account && (vch.amount || vch.total_amount)) {
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

    let masterAccounts = getFirmMasterAccounts(activeFirmId) || [];
    if (Array.isArray(masterAccounts) && masterAccounts.length > 0) {
      const updatedAccounts = masterAccounts.map(acc => {
        const name = (acc.account_name || acc.name || '').trim();
        const type = (acc.primary_type || acc.type || '').toUpperCase();
        const grp = (acc.sub_group || acc.group || '').toLowerCase();
        const nLower = name.toLowerCase();

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
          return { ...acc, opening_balance: 0, openingBalance: 0 };
        }

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
      localStorage.setItem(`account_heads_${activeFirmId}`, JSON.stringify(updatedAccounts));
    }

    localStorage.setItem(rolloverKey, 'true');

    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('storage'));

    return { success: true, message: `✓ FY ${cleanFY} balances successfully synced & rolled over!` };
  } catch (err) {
    console.error('Error during Financial Year Rollover:', err);
    return { success: false, message: `Rollover Failed: ${err.message}` };
  }
};
