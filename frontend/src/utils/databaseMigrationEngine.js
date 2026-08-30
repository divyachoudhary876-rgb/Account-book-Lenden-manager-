// frontend/src/utils/databaseMigrationEngine.js

const CURRENT_APP_VERSION = 2; // Incremented on each update release

export const runSafeAppMigration = () => {
  try {
    const savedVersion = parseInt(localStorage.getItem('app_db_schema_version') || '1', 10);

    // Initialize required buckets if absent, without overwriting existing data
    ['app_account_heads', 'app_vouchers', 'app_journal_entries', 'app_invoices', 'app_inventory'].forEach(bucket => {
      if (!localStorage.getItem(bucket)) {
        localStorage.setItem(bucket, '[]');
      }
    });

    if (savedVersion < CURRENT_APP_VERSION) {
      localStorage.setItem('app_db_schema_version', CURRENT_APP_VERSION.toString());
      console.log(`[Account Book] Migration to v${CURRENT_APP_VERSION} complete. Local data preserved.`);
    }

    return { status: 'SUCCESS', version: CURRENT_APP_VERSION };
  } catch (error) {
    console.error("Migration Error:", error);
    return { status: 'FAILED', error: error.message };
  }
};
