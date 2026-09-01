// frontend/src/components/SecurityBackupSettings.jsx

import React, { useState } from 'react';
import { exportUniversalBackup, restoreUniversalBackup } from '../utils/backupEngine.js';

export default function SecurityBackupSettings({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const firmName = firm?.legal_name || 'Neelkanth Enterprise';

  const [isRestoring, setIsRestoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleExport = () => {
    try {
      const res = exportUniversalBackup(activeFirmId, firmName);
      setStatusMessage({ type: 'success', text: `✓ Backup file created with ${res.count} transactions!` });
    } catch (e) {
      setStatusMessage({ type: 'error', text: e.message });
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm("⚠️ Restoring backup will merge and update all accounts, transactions, and inventory. Proceed?")) {
      e.target.value = '';
      return;
    }

    setIsRestoring(true);
    setStatusMessage(null);

    try {
      const result = await restoreUniversalBackup(file, activeFirmId);
      setStatusMessage({
        type: 'success',
        text: `✓ Restore Successful!\n• Accounts: ${result.accountsRestored}\n• Vouchers: ${result.vouchersRestored}\n• Stock SKUs: ${result.stockRestored}`
      });
    } catch (err) {
      setStatusMessage({ type: 'error', text: `❌ Restore Failed: ${err.message}` });
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', maxWidth: '600px', margin: '0 auto', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🛡️</span> Data Backup & Migration Center
        </h3>
        <span style={{ fontSize: '11px', color: '#64748b' }}>Active Firm: <strong>{firmName}</strong> ({activeFirmId})</span>
      </div>

      {statusMessage && (
        <div style={{
          backgroundColor: statusMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${statusMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: statusMessage.type === 'success' ? '#065f46' : '#b91c1c',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '12px',
          whiteSpace: 'pre-line',
          fontWeight: '600'
        }}>
          {statusMessage.text}
        </div>
      )}

      <div style={{ display: 'grid', gap: '14px' }}>
        {/* 1. Export Card */}
        <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <strong style={{ fontSize: '13px', color: '#1e293b' }}>📥 Download Full Data Backup</strong>
          <p style={{ margin: '4px 0 10px 0', fontSize: '11px', color: '#64748b' }}>
            Export all ledgers, voucher entries, stock counts, and firm profiles to a standalone JSON file.
          </p>
          <button
            onClick={handleExport}
            style={{ backgroundColor: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            💾 Export Backup (.JSON)
          </button>
        </div>

        {/* 2. Restore Card */}
        <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <strong style={{ fontSize: '13px', color: '#1e293b' }}>📤 Restore Old / Previous App Backup</strong>
          <p style={{ margin: '4px 0 10px 0', fontSize: '11px', color: '#64748b' }}>
            Upload your previously downloaded backup JSON file to restore all your financial transactions instantly.
          </p>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            disabled={isRestoring}
            style={{ fontSize: '12px' }}
          />
        </div>
      </div>
    </div>
  );
}
