// frontend/src/utils/systemResetEngine.js

export const purgeAllDemoData = () => {
  // Clear all sample accounting states from browser/app local storage
  localStorage.removeItem('app_account_heads');
  localStorage.removeItem('app_inventory');
  localStorage.removeItem('app_vouchers');
  localStorage.removeItem('app_journal_entries');
  localStorage.removeItem('app_invoices');

  // Initialize empty state structures for live data
  localStorage.setItem('app_account_heads', JSON.stringify([]));
  localStorage.setItem('app_inventory', JSON.stringify([]));
  localStorage.setItem('app_vouchers', JSON.stringify([]));
  localStorage.setItem('app_journal_entries', JSON.stringify([]));
  localStorage.setItem('app_invoices', JSON.stringify([]));

  return true;
};
