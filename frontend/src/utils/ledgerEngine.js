// frontend/src/utils/ledgerEngine.js
import { StorageService } from './storageSync';

/**
 * Robustly fetch all vouchers across all possible local storage keys and formats
 */
export const getAllFirmVouchers = (activeFirmId = 'FIRM-001') => {
  let rawTx = [];
  const primaryKeys = ['account_book_vouchers', 'vouchers', 'transactions', 'daybook', 'journal_entries'];

  // 1. Scan primary known keys
  primaryKeys.forEach(k => {
    const val = StorageService.getItem ? StorageService.getItem(k) : JSON.parse(localStorage.getItem(k) || '[]');
    if (Array.isArray(val)) rawTx.push(...val);
  });

  // 2. Deep scan localStorage for any keys containing voucher or transaction patterns
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('voucher') || key.includes('transaction') || key.includes('entry') || key.includes('daybook') || key.includes('book'))) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) rawTx.push(...parsed);
          else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.vouchers)) rawTx.push(...parsed.vouchers);
            if (Array.isArray(parsed.transactions)) rawTx.push(...parsed.transactions);
          }
        } catch (err) {}
      }
    }
  }

  // 3. Deduplicate and filter by firm safely
  const uniqueMap = new Map();
  rawTx.forEach(tx => {
    if (!tx) return;

    if (tx.firm_id && activeFirmId && tx.firm_id !== activeFirmId && tx.firm_id !== 'FIRM-001' && activeFirmId !== 'FIRM-001') {
      return;
    }

    const uId = tx.id || tx.voucher_number || tx.reference_no || `${tx.voucher_date || tx.date}-${tx.amount || tx.total_amount}-${tx.dr_account || tx.debit_account}-${tx.cr_account || tx.credit_account}`;
    if (!uniqueMap.has(uId)) {
      uniqueMap.set(uId, tx);
    }
  });

  return Array.from(uniqueMap.values());
};

/**
 * Universal multi-key ledger statement generator ensuring NO transaction is missed
 */
export const getAccountLedgerStatement = (partyName, activeFirmId = 'FIRM-001') => {
  if (!partyName) {
    return { openingBalance: 0, closingBalance: 0, balanceType: 'Dr', transactions: [] };
  }

  const allVouchers = getAllFirmVouchers(activeFirmId);
  const targetClean = String(partyName).trim().toLowerCase();
  const matchedTransactions = [];

  allVouchers.forEach(v => {
    const amt = parseFloat(v.amount || v.total_amount || v.grand_total || 0);
    if (amt <= 0 || isNaN(amt)) return;

    // Extract all possible debit and credit account representations from voucher
    const drNames = [
      v.dr_account, v.debit_account, v.dr_party, v.account_dr,
      ...(Array.isArray(v.entries) ? v.entries.filter(e => (e.debit || e.dr || 0) > 0).map(e => e.account_name || e.party) : [])
    ].filter(Boolean).map(s => String(s).trim().toLowerCase());

    const crNames = [
      v.cr_account, v.credit_account, v.cr_party, v.account_cr,
      ...(Array.isArray(v.entries) ? v.entries.filter(e => (e.credit || e.cr || 0) > 0).map(e => e.account_name || e.party) : [])
    ].filter(Boolean).map(s => String(s).trim().toLowerCase());

    // Check strict or fuzzy matching across all extracted account names
    const isDrMatch = drNames.some(name => name === targetClean || name.includes(targetClean) || targetClean.includes(name));
    const isCrMatch = crNames.some(name => name === targetClean || name.includes(targetClean) || targetClean.includes(name));

    if (isDrMatch || isCrMatch) {
      // Determine effective debit and credit amounts for this party in this voucher
      let debitVal = 0;
      let creditVal = 0;

      if (isDrMatch && !isCrMatch) {
        debitVal = amt;
      } else if (isCrMatch && !isDrMatch) {
        creditVal = amt;
      } else if (isDrMatch && isCrMatch) {
        // Self-transfer or contra entry edge case
        debitVal = amt;
        creditVal = amt;
      }

      const opposingParty = isDrMatch 
        ? (crNames[0] ? crNames[0].toUpperCase() : 'Various Account') 
        : (drNames[0] ? drNames[0].toUpperCase() : 'Various Account');

      matchedTransactions.push({
        date: v.voucher_date || v.date || '2026-04-01',
        voucher_type: String(v.voucher_type || v.type || 'TX').toUpperCase(),
        voucher_number: v.reference_no || v.voucher_number || v.id || 'N/A',
        particulars: isDrMatch ? `To ${opposingParty}` : `By ${opposingParty}`,
        narration: v.narration || v.notes || v.description || '',
        debit: debitVal,
        credit: creditVal
      });
    }
  });

  // Sort chronological by date
  matchedTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Compute running balance
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
