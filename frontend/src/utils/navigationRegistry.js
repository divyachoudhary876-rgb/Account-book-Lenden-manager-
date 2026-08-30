// frontend/src/utils/navigationRegistry.js

export const SORTED_ACCOUNTING_MENU = [
  // 1. SETUP & CONFIGURATION
  { sequence_order: 1, id: 'firm_setup', label: '1. Firm Profile Settings', icon: '⚙️', category: 'SETUP' },
  
  // 2. MASTERS CREATION
  { sequence_order: 2, id: 'create_account', label: '2. Create Account Head', icon: '➕', category: 'MASTERS' },
  { sequence_order: 3, id: 'inventory', label: '3. Inventory & Stock Master', icon: '📦', category: 'MASTERS' },
  
  // 3. DAILY TRANSACTIONS & PRODUCTION
  { sequence_order: 4, id: 'billing', label: '4. Sales Billing & Invoicing', icon: '🧾', category: 'TRANSACTIONS' },
  { sequence_order: 5, id: 'vouchers', label: '5. Voucher Entry (JV/PV/RV)', icon: '📒', category: 'TRANSACTIONS' },
  { sequence_order: 6, id: 'bhatta_prod', label: '6. Brick Production / Nikasi', icon: '🧱', category: 'TRANSACTIONS' },
  { sequence_order: 7, id: 'settlement', label: '7. Bill Settlement (FIFO)', icon: '💳', category: 'TRANSACTIONS' },
  
  // 4. REPORTS & AUDIT
  { sequence_order: 8, id: 'dashboard', label: '8. Dashboard & Overview', icon: '📊', category: 'REPORTS' },
  { sequence_order: 9, id: 'ledger', label: '9. Account Milan & Ledger', icon: '📖', category: 'REPORTS' },
  { sequence_order: 10, id: 'journal', label: '10. General Journal Register', icon: '📝', category: 'REPORTS' },
  { sequence_order: 11, id: 'reports', label: '11. Financial Reports (P&L / BS)', icon: '📈', category: 'REPORTS' },
  
  // 5. SYSTEM UTILITIES
  { sequence_order: 12, id: 'backup', label: '12. Data Backup & Protection', icon: '🔒', category: 'UTILITIES' },
  { sequence_order: 13, id: 'purge', label: '13. Clear Demo Data', icon: '🗑️', category: 'UTILITIES' }
];
