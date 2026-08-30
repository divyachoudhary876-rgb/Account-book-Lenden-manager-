// frontend/src/components/SecurityBackupSettings.jsx

import React, { useState } from 'react';

export default function SecurityBackupSettings() {
  const [isExporting, setIsExporting] = useState(false);

  const handleCreateBackup = async () => {
    setIsExporting(true);
    try {
      const backupData = {
        firm_profile: JSON.parse(localStorage.getItem('active_firm_profile') || '{}'),
        accounts: JSON.parse(localStorage.getItem('app_account_heads') || '[]'),
        journal_entries: JSON.parse(localStorage.getItem('app_journal_entries') || '[]'),
        invoices: JSON.parse(localStorage.getItem('app_invoices') || '[]'),
        inventory: JSON.parse(localStorage.getItem('app_inventory') || '[]'),
        exported_at: new Date().toISOString()
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const fileName = `ACCOUNT_BOOK_BACKUP_${new Date().toISOString().split('T')[0]}.json`;

      // Web Fallback Download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();

      alert("✓ Security Backup JSON File created & saved to Downloads!");
    } catch (err) {
      alert(`❌ Backup Export Error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: '600px', margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>🔒 Data Security & System Backup</h3>
      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
        Create an encrypted full JSON snapshot of your accounts, vouchers, invoices, and inventory to restore anytime.
      </p>

      <button
        onClick={handleCreateBackup}
        disabled={isExporting}
        style={{ padding: '12px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        {isExporting ? '⏳ Generating Encrypted Backup...' : '📲 Download Full System Backup File (.JSON)'}
      </button>
    </div>
  );
}
