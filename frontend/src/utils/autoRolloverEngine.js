import { StorageService } from './storageSync';
import { getFirmMasterAccounts, normalizeAccountNameMatch } from './accountMasterEngine.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

const canonicalAccountKey = (name = '') => {
  return String(name).replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
};

export const performFinancialYearRollover = (firmId = 'FIRM-001', selectedFY = '2026-27') => {
  const activeFirmId = String(firmId || 'FIRM-001').trim();

  try {
    const cleanFY = String(selectedFY || '2026-27').replace(/FY\s*/i, '').trim();
    const match = cleanFY.match(/\d{4}/);
    if (!match) return { success: false, message: 'Invalid FY string format' };

    const currentStartYear = parseInt(match[0], 10);
    const fyStartDate = `${currentStartYear}-04-01`;

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

    const addAccountDelta = (accName, delta) => {
      const key = canonicalAccountKey(accName);
      if (!key) return;
      accountNetBalances[key] = round2((accountNetBalances[key] || 0) + delta);
    };

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

          addAccountDelta(expName, amt);
          addAccountDelta(wName, -amt);
          return;
        }

        if (Array.isArray(vch.entries) && vch.entries.length > 0) {
          vch.entries.forEach(e => {
            const accName = (e.account_name || e.party || '').trim();
            if (!accName) return;

            const dr = Number(e.debit || (e.type === 'DR' || e.type === 'Dr' ? e.amount : 0) || 0);
            const cr = Number(e.credit || (e.type === 'CR' || e.type === 'Cr' ? e.amount : 0) || 0);

            if (dr > 0) addAccountDelta(accName, dr);
            if (cr > 0) addAccountDelta(accName, -cr);
          });
        } else if (vch.dr_account && vch.cr_account && (vch.amount || vch.total_amount)) {
          const drName = String(vch.dr_account).trim();
          const crName = String(vch.cr_account).trim();
          const amt = Number(vch.amount || vch.total_amount || 0);

          addAccountDelta(drName, amt);
          addAccountDelta(crName, -amt);
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

        const key = canonicalAccountKey(name);
        const matchedKey = Object.keys(accountNetBalances).find(k => k === key || normalizeAccountNameMatch(k, key));
        const txNet = matchedKey !== undefined ? accountNetBalances[matchedKey] : 0;
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

    return { success: true, message: `✓ FY ${cleanFY} balances successfully synced & rolled over!` };
  } catch (err) {
    console.error('Error during Financial Year Rollover:', err);
    return { success: false, message: `Rollover Failed: ${err.message}` };
  }
};
