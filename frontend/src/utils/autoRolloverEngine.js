// frontend/src/utils/autoRolloverEngine.js
import { StorageService } from './storageSync';

/**
 * Automatically calculates closing balances from past transactions 
 * and rolls them over as opening balances for the new Financial Year.
 */
export const performFinancialYearRollover = (firmId = 'FIRM-001', selectedFY = '2026-27') => {
  try {
    // Extract starting year from FY string (e.g. 'FY 2026-27' -> 2026)
    const match = selectedFY.match(/\d{4}/);
    if (!match) return;
    const currentStartYear = parseInt(match[0], 10);
    const fyStartDate = `${currentStartYear}-04-01`;

    // Check if rollover has already been executed for this FY
    const rolloverKey = `rollover_done_${firmId}_${selectedFY}`;
    if (StorageService.getItem(rolloverKey)) return;

    // 1. Scan all past vouchers before current FY start date
    let rawTx = [];
    const keysToScan = [
      'account_book_vouchers',
      'app_vouchers',
      `account_book_vouchers_${firmId}`,
      `app_vouchers_${firmId}`
    ];

    keysToScan.forEach(k => {
      try {
        const val = StorageService.getItem ? StorageService.getItem(k) : JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(val)) rawTx.push(...val);
      } catch (e) {}
    });

    const accountNetBalances = {};

    rawTx.forEach(vch => {
      const vDate = vch.voucher_date || vch.date || '';
      // Consider transactions strictly prior to the new FY start date
      if (vDate && vDate < fyStartDate) {
        if (Array.isArray(vch.entries) && vch.entries.length > 0) {
          vch.entries.forEach(e => {
            const accName = (e.account_name || '').trim();
            if (!accName) return;
            if (!accountNetBalances[accName]) accountNetBalances[accName] = 0;

            const dr = Number(e.debit || e.amount || 0);
            const cr = Number(e.credit || 0);
            if ((e.type || '').toUpperCase() === 'DR' || dr > 0) {
              accountNetBalances[accName] += dr;
            }
            if ((e.type || '').toUpperCase() === 'CR' || cr > 0) {
              accountNetBalances[accName] -= cr;
            }
          });
        }
      }
    });

    // 2. Update Master Accounts with carried-forward opening balances
    const accountsKey = `app_accounts_${firmId}`;
    let masterAccounts = StorageService.getItem(accountsKey) || [];

    if (Array.isArray(masterAccounts) && masterAccounts.length > 0) {
      masterAccounts = masterAccounts.map(acc => {
        const name = (acc.account_name || acc.name || '').trim();
        if (accountNetBalances[name] !== undefined) {
          const net = accountNetBalances[name];
          return {
            ...acc,
            opening_balance: Math.abs(net),
            balance_type: net >= 0 ? 'Dr' : 'Cr'
          };
        }
        return acc;
      });

      StorageService.setItem(accountsKey, masterAccounts);
    }

    // 3. Mark rollover completed for this FY
    StorageService.setItem(rolloverKey, true);
    window.dispatchEvent(new Event('app_storage_updated'));
  } catch (e) {
    console.error('Error during Financial Year Rollover:', e);
  }
};
