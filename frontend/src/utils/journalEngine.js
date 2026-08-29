// frontend/src/utils/journalEngine.js

export const getJournalRegisterEntries = (filterType = 'ALL', searchQuery = '') => {
  const journalLines = JSON.parse(localStorage.getItem('app_journal_entries') || '[]');
  const vouchers = JSON.parse(localStorage.getItem('app_vouchers') || '[]');

  // Map Voucher details to Journal Lines
  const fullJournal = journalLines.map(line => {
    const parentVoucher = vouchers.find(v => v.id === line.voucher_id);
    return {
      ...line,
      voucher_type: parentVoucher?.voucher_type || 'JOURNAL',
      narration: line.narration || parentVoucher?.narration || 'General Entry'
    };
  });

  // Apply Voucher Type and Search Filters
  return fullJournal.filter(item => {
    const matchesType = filterType === 'ALL' || item.voucher_type === filterType;
    const matchesSearch = item.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.voucher_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.narration.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });
};
