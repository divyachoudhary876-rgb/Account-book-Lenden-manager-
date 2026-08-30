// frontend/src/utils/databaseMigrationEngine.js

const CURRENT_APP_VERSION = 2; // Incremented on every release

export const runSafeAppMigration = () => {
  try {
    const savedVersion = parseInt(localStorage.getItem('app_db_schema_version') || '1', 10);

    // Ensure Persistent Buckets Exist Without Overwriting
    if (!localStorage.getItem('app_account_heads')) {
      localStorage.setItem('app_account_heads', '[]');
    }
    if (!localStorage.getItem('app_vouchers')) {
      localStorage.setItem('app_vouchers', '[]');
    }
    if (!localStorage.getItem('app_journal_entries')) {
      localStorage.setItem('app_journal_entries', '[]');
    }
    if (!localStorage.getItem('app_invoices')) {
      localStorage.setItem('app_invoices', '[]');
    }
    if (!localStorage.getItem('app_inventory')) {
      localStorage.setItem('app_inventory', '[]');
    }

    // Migration V1 -> V2: Add Non-Destructive Fields to Existing Accounts
    if (savedVersion < 2) {
      const accounts = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
      const updatedAccounts = accounts.map(acc => ({
        ...acc,
        gstin: acc.gstin || '',
        state_code: acc.state_code || '08',
        is_active: acc.is_active !== undefined ? acc.is_active : true
      }));

      localStorage.setItem('app_account_heads', JSON.stringify(updatedAccounts));
      localStorage.setItem('app_db_schema_version', CURRENT_APP_VERSION.toString());
      console.log(`✓ Migration to Version ${CURRENT_APP_VERSION} completed safely. Data preserved!`);
    }

    return { status: 'SUCCESS', version: CURRENT_APP_VERSION };
  } catch (err) {
    console.error("Migration Error:", err);
    return { status: 'FAILED', error: err.message };
  }
};
