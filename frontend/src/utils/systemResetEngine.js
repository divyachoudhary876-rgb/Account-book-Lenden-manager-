// frontend/src/utils/systemResetEngine.js

export const purgeDemoData = () => {
  try {
    // 1. Remove all transactional state keys
    localStorage.removeItem('app_account_heads');
    localStorage.removeItem('app_inventory');
    localStorage.removeItem('app_vouchers');
    localStorage.removeItem('app_journal_entries');
    localStorage.removeItem('app_invoices');

    // 2. Re-initialize clean, empty array structures
    localStorage.setItem('app_account_heads', JSON.stringify([]));
    localStorage.setItem('app_inventory', JSON.stringify([]));
    localStorage.setItem('app_vouchers', JSON.stringify([]));
    localStorage.setItem('app_journal_entries', JSON.stringify([]));
    localStorage.setItem('app_invoices', JSON.stringify([]));

    // 3. Dispatch global events so Dashboard & Navigation immediately update to ₹0.00
    window.dispatchEvent(new CustomEvent('ACCOUNT_BOOK_VOUCHER_POSTED', { detail: {} }));
    window.dispatchEvent(new Event('storage'));

    return { success: true, message: "All demo accounting records successfully cleared." };
  } catch (error) {
    console.error("Data Purge Error:", error);
    return { success: false, message: error.message };
  }
};
