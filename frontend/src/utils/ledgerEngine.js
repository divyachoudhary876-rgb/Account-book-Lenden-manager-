// frontend/src/utils/ledgerEngine.js
import { StorageService } from './storageSync';
import { getFirmScopedStorageKey } from './firmIsolationEngine';
import { normalizeLedgerAccountMatch } from './voucherPostingEngine';

/**
 * Robustly fetch all vouchers across firm-scoped keys
 */
export const getAllFirmVouchers = (activeFirmId = 'FIRM-001') => {
  let rawTx = [];
  
  const baseKeys = ['account_book_vouchers', 'app_vouchers'];
  
  baseKeys.forEach(baseKey => {
    try {
      const scopedKey = getFirmScopedStorageKey(baseKey, activeFirmId);
      const scopedVal = JSON.parse(localStorage.getItem(scopedKey) || '[]');
      if (Array.isArray(scopedVal)) rawTx.push(...scopedVal);
    } catch (e) {}
  });

  const uniqueMap = new Map();
  rawTx.forEach(tx => {
    if (!tx) return;
    const vFirm = String(tx.firm_id || tx.firmId || '').trim();
    if (vFirm && vFirm !== activeFirmId && vFirm !== 'FIRM-001' && activeFirmId !== 'FIRM-001') {
      return;
    }

    const uId = tx.id || tx.voucher_number || tx.reference_no || `${tx.voucher_date || tx.date}-${tx.amount || tx.total_amount}`;
    if (!uniqueMap.has(uId)) {
      uniqueMap.set(uId, tx);
    }
  });

  return Array.from(uniqueMap.values());
};

/**
 * Universal multi-key ledger statement generator with bilingual support
 */
export const getAccountLedgerStatement = (partyName, activeFirmId = 'FIRM-001') => {
  if (!partyName) {
    return { openingBalance: 0, closingBalance: 0, balanceType: 'Dr', transactions: [] };
  }

  const allVouchers = getAllFirmVouchers(activeFirmId);
  const targetClean = String(partyName).trim();
  const matchedTransactions = [];

  allVouchers.forEach(v => {
    const amt = parseFloat(v.amount || v.total_amount || v.grand_total || 0);
    if (amt <= 0 || isNaN(amt)) return;

    const drNames = [
      v.dr_account, v.debit_account, v.dr_party,
      ...(Array.isArray(v.entries) ? v.entries.filter(e => (e.debit || e.dr || (e.type || '').toUpperCase() === 'DR' || 0) > 0).map(e => e.account_name || e.party) : [])
    ].filter(Boolean);

    const crNames = [
      v.cr_account, v.credit_account, v.cr_party,
      ...(Array.isArray(v.entries) ? v.entries.filter(e => (e.credit || e.cr || (e.type || '').toUpperCase() === 'CR' || 0) > 0).map(e => e.account_name || e.party) : [])
    ].filter(Boolean);

    const isDrMatch = drNames.some(name => normalizeLedgerAccountMatch(targetClean, name));
    const isCrMatch = crNames.some(name => normalizeLedgerAccountMatch(targetClean, name));

    if (isDrMatch || isCrMatch) {
      let debitVal = 0;
      let creditVal = 0;

      if (isDrMatch && !isCrMatch) {
        debitVal = amt;
      } else if (isCrMatch && !isDrMatch) {
        creditVal = amt;
      } else if (isDrMatch && isCrMatch) {
        debitVal = amt;
        creditVal = amt;
      }

      const opposingParty = isDrMatch 
        ? (crNames[0] || 'Various Accounts') 
        : (drNames[0] || 'Various Accounts');

      matchedTransactions.push({
        date: v.voucher_date || v.date || '2026-04-01',
        voucher_type: String(v.voucher_type || v.type || 'TX').toUpperCase(),
        voucher_number: v.reference_no || v.voucher_number || v.id || 'N/A',
        particulars: isDrMatch ? `To ${opposingParty}` : `By ${opposingParty}`,
        narration: v.narration || v.notes || '',
        debit: debitVal,
        credit: creditVal
      });
    }
  });

  matchedTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  let runningBal = 0;
  const processedTransactions = matchedTransactions.map(t => {
    runningBal += (t.debit - t.credit);
    return {
      ...t,
      runningBalance: Math.abs(runningBal),
      balanceType: runningBal >= 0 ? 'Dr' : 'Cr'
    };
  });

  const lastClosing = processedTransactions.length > 0 
    ? processedTransactions[processedTransactions.length - 1] 
    : { runningBalance: 0, balanceType: 'Dr' };

  return {
    openingBalance: 0,
    closingBalance: lastClosing.runningBalance,
    balanceType: lastClosing.balanceType,
    transactions: processedTransactions
  };
};
