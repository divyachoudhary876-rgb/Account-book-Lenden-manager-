// frontend/src/utils/cleanFinancialEngine.js

import { StorageService } from './storageSync.js';

/**
 * Unified Financial Engine for Trial Balance, P&L, Balance Sheet, and Ledger Statements
 */
export const CleanFinancialEngine = {
  getVouchersForActiveFirm: (firmId) => {
    const fId = firmId || StorageService.getActiveFirmId();
    let vouchers = [];
    
    const possibleKeys = [
      `app_vouchers_${fId}`,
      `account_book_vouchers_${fId}`,
      'account_book_vouchers',
      'app_vouchers'
    ];

    possibleKeys.forEach(k => {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach(v => {
              const vFirm = v?.firm_id || v?.firmId;
              if (!vFirm || String(vFirm).trim() === String(fId).trim()) {
                if (v && !vouchers.some(existing => existing.id === v.id && existing.voucher_number === v.voucher_number)) {
                  vouchers.push(v);
                }
              }
            });
          }
        }
      } catch (e) {}
    });

    return vouchers;
  },

  getAccountsForActiveFirm: (firmId) => {
    const fId = firmId || StorageService.getActiveFirmId();
    let accounts = [];

    const possibleKeys = [
      `app_accounts_${fId}`,
      `account_heads_${fId}`,
      'app_account_heads',
      'account_heads'
    ];

    possibleKeys.forEach(k => {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach(acc => {
              const accFirm = acc?.firm_id;
              if (!accFirm || String(accFirm).trim() === String(fId).trim()) {
                const name = String(acc?.account_name || acc?.name || '').trim();
                if (name && !accounts.some(existing => String(existing.account_name || existing.name).trim().toLowerCase() === name.toLowerCase())) {
                  accounts.push({
                    ...acc,
                    account_name: name,
                    name: name,
                    primary_type: String(acc.primary_type || acc.type || 'ASSETS').toUpperCase()
                  });
                }
              }
            });
          }
        }
      } catch (e) {}
    });

    return accounts;
  },

  calculateTrialBalance: (firmId) => {
    const fId = firmId || StorageService.getActiveFirmId();
    const accounts = CleanFinancialEngine.getAccountsForActiveFirm(fId);
    const vouchers = CleanFinancialEngine.getVouchersForActiveFirm(fId);

    const ledgerBalances = {};
    accounts.forEach(acc => {
      const name = acc.account_name || acc.name;
      ledgerBalances[name] = {
        account_name: name,
        primary_type: String(acc.primary_type || acc.type || 'ASSETS').toUpperCase(),
        group: acc.group || acc.sub_group || 'General',
        debit: parseFloat(acc.opening_balance || acc.openingBalance || 0) > 0 && (acc.balance_type || acc.balanceType) === 'Dr' ? parseFloat(acc.opening_balance || acc.openingBalance || 0) : 0,
        credit: parseFloat(acc.opening_balance || acc.openingBalance || 0) > 0 && (acc.balance_type || acc.balanceType) === 'Cr' ? parseFloat(acc.opening_balance || acc.openingBalance || 0) : 0
      };
    });

    vouchers.forEach(v => {
      const entries = Array.isArray(v.entries) ? v.entries : [];
      entries.forEach(e => {
        const accName = String(e.account_name || e.party || '').trim();
        if (!accName) return;

        if (!ledgerBalances[accName]) {
          ledgerBalances[accName] = {
            account_name: accName,
            primary_type: 'EXPENSES',
            group: 'General',
            debit: 0,
            credit: 0
          };
        }

        const drAmt = parseFloat(e.debit || (e.type === 'Dr' ? e.amount : 0) || 0);
        const crAmt = parseFloat(e.credit || (e.type === 'Cr' ? e.amount : 0) || 0);

        ledgerBalances[accName].debit += drAmt;
        ledgerBalances[accName].credit += crAmt;
      });
    });

    const rows = [];
    let totalDr = 0;
    let totalCr = 0;

    Object.keys(ledgerBalances).forEach(name => {
      const b = ledgerBalances[name];
      const net = Math.round((b.debit - b.credit + Number.EPSILON) * 100) / 100;
      
      let drVal = 0;
      let crVal = 0;

      if (net >= 0) {
        drVal = net;
        totalDr += net;
      } else {
        crVal = Math.abs(net);
        totalCr += Math.abs(net);
      }

      rows.push({
        account_name: name,
        category: b.primary_type,
        debit: drVal,
        credit: crVal
      });
    });

    return {
      rows,
      totalDebit: Math.round((totalDr + Number.EPSILON) * 100) / 100,
      totalCredit: Math.round((totalCr + Number.EPSILON) * 100) / 100
    };
  }
};
