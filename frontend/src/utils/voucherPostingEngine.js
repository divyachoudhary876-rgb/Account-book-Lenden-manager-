// frontend/src/utils/voucherPostingEngine.js

import { IDBStorage } from './indexedDbStorage.js';
import { getFirmMasterAccounts } from './accountMasterEngine.js';

export const normalizeLedgerAccountMatch = (targetAccount = '', candidateAccount = '') => {
  if (!targetAccount || !candidateAccount) return false;
  const t = String(targetAccount).trim().toLowerCase();
  const c = String(candidateAccount).trim().toLowerCase();
  if (t === c) return true;
  const stripHi = (s) => s.replace(/\s*\([\u0900-\u097F\s]+\)/g, '').trim();
  return stripHi(t) === stripHi(c);
};

export const getUniversalVouchersByFirm = (firmId) => {
  const activeFirmId = String(firmId || IDBStorage.getItem('app_active_firm_id') || 'FIRM-1790909076433').trim();
  const vouchersKey = `account_book_vouchers_${activeFirmId}`;

  try {
    const rawScoped = IDBStorage.getItem(vouchersKey, []) || [];
    const map = new Map();

    rawScoped.forEach(v => {
      if (v && v.id) {
        const vFirm = String(v.firm_id || v.firmId || '').trim();
        if (!vFirm || vFirm === activeFirmId) {
          map.set(v.id, v);
        }
      }
    });

    const firmFiltered = Array.from(map.values());
    firmFiltered.sort((a, b) => {
      const dateA = new Date(a.voucher_date || a.date || 0);
      const dateB = new Date(b.voucher_date || b.date || 0);
      return dateA.getTime() !== dateB.getTime() ? dateB - dateA : String(b.id || '').localeCompare(String(a.id || ''));
    });

    return firmFiltered;
  } catch (e) {
    console.error('[voucherPostingEngine] Error:', e);
    return [];
  }
};

const getNextSequentialNumber = (existingVouchers, vType) => {
  let maxNum = 0;
  const prefix = vType === 'PAYMENT' ? 'PAY' :
                 vType === 'RECEIPT' ? 'REC' :
                 vType === 'JOURNAL' ? 'JV' :
                 vType === 'CONTRA' ? 'CONTRA' :
                 vType === 'PURCHASE' ? 'PUR' :
                 vType === 'SALES' ? 'INV' : 'VCH';

  (existingVouchers || []).forEach(v => {
    if (!v) return;
    const type = String(v.voucher_type || v.type || '').toUpperCase();
    if (type === vType || type.includes(prefix)) {
      const ref = String(v.reference_no || v.voucher_number || '').trim();
      const match = ref.match(/\d+/g);
      if (match) {
        const val = parseInt(match[match.length - 1], 10);
        if (!isNaN(val) && val > maxNum && val < 1000000) maxNum = val;
      }
    }
  });

  return `${prefix}-${maxNum + 1}`;
};

export const saveUniversalVoucher = (firmId, voucherPayload = {}) => {
  const activeFirmId = String(firmId || IDBStorage.getItem('app_active_firm_id') || 'FIRM-1790909076433').trim();
  const vouchersKey = `account_book_vouchers_${activeFirmId}`;
  const existingVouchers = IDBStorage.getItem(vouchersKey, []) || [];

  const {
    id = null,
    voucher_type = 'PAYMENT',
    voucher_date = new Date().toISOString().split('T')[0],
    reference_no = '',
    narration = '',
    dr_account = '',
    cr_account = '',
    amount = 0,
    is_compound = false,
    entries = [],
    items = []
  } = voucherPayload;

  const normalizedType = voucher_type.toUpperCase();
  const cleanRef = (reference_no || '').trim();
  const vchNumber = cleanRef && !cleanRef.includes('MAT-ADJ') && !cleanRef.includes('BILL-')
    ? cleanRef
    : getNextSequentialNumber(existingVouchers, normalizedType);

  let finalVoucher = null;
  let processedEntries = [];

  if (is_compound && Array.isArray(entries) && entries.length > 0) {
    let totalDr = 0;
    let totalCr = 0;

    processedEntries = entries.map(entry => {
      const val = Math.abs(parseFloat(entry.amount || entry.debit || entry.credit || 0));
      const isDebit = (entry.type || '').toUpperCase() === 'DR' || parseFloat(entry.debit || 0) > 0;
      if (isDebit) totalDr += val;
      else totalCr += val;

      return {
        account_name: (entry.account_name || entry.party || '').trim(),
        party: (entry.account_name || entry.party || '').trim(),
        type: isDebit ? 'DR' : 'CR',
        debit: isDebit ? val : 0,
        credit: isDebit ? 0 : val,
        amount: val
      };
    });

    const diff = Math.round((totalDr - totalCr) * 100) / 100;
    if (Math.abs(diff) > 0.001) {
      if (Math.abs(diff) <= 0.99) {
        if (diff > 0) {
          processedEntries.push({ account_name: 'Round Off Account', party: 'Round Off Account', type: 'CR', debit: 0, credit: Math.abs(diff), amount: Math.abs(diff) });
          totalCr += Math.abs(diff);
        } else {
          processedEntries.push({ account_name: 'Round Off Account', party: 'Round Off Account', type: 'DR', debit: Math.abs(diff), credit: 0, amount: Math.abs(diff) });
          totalDr += Math.abs(diff);
        }
      } else {
        throw new Error(`Unbalanced Voucher! Total Debit (₹${totalDr.toFixed(2)}) != Total Credit (₹${totalCr.toFixed(2)}).`);
      }
    }

    finalVoucher = {
      id: id || `VCH-${Date.now()}`,
      firm_id: activeFirmId,
      firmId: activeFirmId,
      voucher_number: vchNumber,
      voucher_date,
      date: voucher_date,
      voucher_type: normalizedType,
      type: normalizedType,
      reference_no: vchNumber,
      narration: (narration || '').trim(),
      amount: parseFloat(totalDr.toFixed(2)),
      total_amount: parseFloat(totalDr.toFixed(2)),
      is_compound: true,
      entries: processedEntries,
      items: items || [],
      dr_account: processedEntries.filter(e => e.type === 'DR').map(e => e.account_name).join(', '),
      cr_account: processedEntries.filter(e => e.type === 'CR').map(e => e.account_name).join(', '),
      updated_at: new Date().toISOString()
    };
  } else {
    const cleanAmt = parseFloat(amount || 0);
    if (!cleanAmt || cleanAmt <= 0) throw new Error('Transaction amount must be greater than zero.');
    if (!dr_account || !dr_account.trim()) throw new Error('Debit Account is mandatory.');
    if (!cr_account || !cr_account.trim()) throw new Error('Credit Account is mandatory.');

    processedEntries = [
      { account_name: dr_account.trim(), party: dr_account.trim(), type: 'DR', amount: cleanAmt, debit: cleanAmt, credit: 0 },
      { account_name: cr_account.trim(), party: cr_account.trim(), type: 'CR', amount: cleanAmt, debit: 0, credit: cleanAmt }
    ];

    finalVoucher = {
      id: id || `VCH-${Date.now()}`,
      firm_id: activeFirmId,
      firmId: activeFirmId,
      voucher_number: vchNumber,
      voucher_date,
      date: voucher_date,
      voucher_type: normalizedType,
      type: normalizedType,
      reference_no: vchNumber,
      narration: (narration || '').trim(),
      amount: cleanAmt,
      total_amount: cleanAmt,
      is_compound: false,
      dr_account: dr_account.trim(),
      cr_account: cr_account.trim(),
      entries: processedEntries,
      items: items || [],
      updated_at: new Date().toISOString()
    };
  }

  const existingIdx = existingVouchers.findIndex(v => v && String(v.id) === String(finalVoucher.id));
  if (existingIdx !== -1) {
    existingVouchers[existingIdx] = finalVoucher;
  } else {
    existingVouchers.unshift(finalVoucher);
  }
  IDBStorage.setItem(vouchersKey, existingVouchers);
  IDBStorage.setItem(`app_vouchers_${activeFirmId}`, existingVouchers);

  // Update Account Balances
  const accountsKey = `account_heads_${activeFirmId}`;
  const accounts = IDBStorage.getItem(accountsKey, []) || [];
  const accountMap = new Map();
  accounts.forEach(a => accountMap.set((a.name || a.account_name || '').trim().toLowerCase(), a));

  processedEntries.forEach(entry => {
    const accKey = entry.account_name.toLowerCase();
    let accObj = accountMap.get(accKey);

    if (!accObj) {
      accObj = {
        id: `ACC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        account_name: entry.account_name,
        name: entry.account_name,
        primary_type: entry.type === 'DR' ? 'EXPENSES' : 'INCOME',
        sub_group: 'General Ledger',
        opening_balance: 0,
        current_balance: 0,
        balance_type: entry.type === 'DR' ? 'Dr' : 'Cr'
      };
      accountMap.set(accKey, accObj);
    }

    const balChange = entry.type === 'DR' ? entry.amount : -entry.amount;
    accObj.current_balance = (parseFloat(accObj.current_balance || 0) + balChange);
  });

  IDBStorage.setItem(accountsKey, Array.from(accountMap.values()));

  window.dispatchEvent(new Event('app_accounts_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('storage'));

  return finalVoucher;
};

export const deleteUniversalVoucher = (firmId, voucherId) => {
  if (!voucherId) return false;
  const activeFirmId = String(firmId || IDBStorage.getItem('app_active_firm_id') || 'FIRM-1790909076433').trim();
  const vouchersKey = `account_book_vouchers_${activeFirmId}`;
  
  const existingVouchers = IDBStorage.getItem(vouchersKey, []) || [];
  const filtered = existingVouchers.filter(v => v && String(v.id) !== String(voucherId) && String(v.reference_no) !== String(voucherId));

  if (filtered.length === existingVouchers.length) return false;

  IDBStorage.setItem(vouchersKey, filtered);
  IDBStorage.setItem(`app_vouchers_${activeFirmId}`, filtered);

  window.dispatchEvent(new Event('app_accounts_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('storage'));
  return true;
};

export const VoucherPostingEngine = {
  postTransaction: (payload) => saveUniversalVoucher(payload.firm_id, payload)
};
