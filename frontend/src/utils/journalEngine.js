// frontend/src/utils/journalEngine.js

import { getAllUniversalVouchers } from './statementEngine.js';

/**
 * Compile and sort General Journal Register vouchers strictly by date
 * @param {string} firmId 
 * @param {string} sortOrder 'ASC' (Oldest to Newest) or 'DESC' (Newest to Oldest)
 */
export const getSortedJournalRegister = (firmId = 'FIRM-001', sortOrder = 'ASC') => {
  const rawVouchers = getAllUniversalVouchers(firmId);

  return [...rawVouchers].sort((a, b) => {
    const dateA = new Date(a.voucher_date || a.date || 0).getTime();
    const dateB = new Date(b.voucher_date || b.date || 0).getTime();

    // 1. Primary Sort by Transaction Date
    if (dateA !== dateB) {
      return sortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
    }

    // 2. Secondary Sort by Creation Timestamp
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    if (timeA !== timeB) {
      return sortOrder === 'ASC' ? timeA - timeB : timeB - timeA;
    }

    // 3. Tertiary Sort by Voucher ID / Reference
    return sortOrder === 'ASC' 
      ? (a.voucher_number || '').localeCompare(b.voucher_number || '')
      : (b.voucher_number || '').localeCompare(a.voucher_number || '');
  });
};
