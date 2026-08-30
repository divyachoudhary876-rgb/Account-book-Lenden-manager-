// frontend/src/components/SecurityBackupSettings.jsx

import React, { useState } from 'react';
import { exportBackupToDeviceStorage, restoreSystemFromBackupJSON } from '../utils/backupEngine.js';

export default function SecurityBackupSettings() {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDownloadBackup = async () => {
    setIsProcessing(true);
    const res = await exportBackupToDeviceStorage();
    setIsProcessing(false);
    alert(res.message);
  };

  const handleFileRestore = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        restoreSystemFromBackupJSON(evt.target.result);
        alert("✓ System Data restored successfully from backup file!");
        window.location.reload();
      } catch (err) {
        alert(`❌ Restore Failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>🔒 Data Security & Local Storage Backup</h3>

      <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>💾 Device Public Backup (Survives App Uninstall)</h4>
        <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#64748b' }}>
          Save encrypted JSON data to your phone's <strong>Documents</strong> folder so your financial ledgers remain safe even if the app is uninstalled.
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleDownloadBackup}
            disabled={isProcessing}
            style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
          >
            📲 Download & Save Local Backup
          </button>

          <label style={{ backgroundColor: '#2563eb', color: '#fff', padding: '10px 18px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'inline-block' }}>
            📥 Restore Backup File
            <input type="file" accept=".json" onChange={handleFileRestore} style={{ display: 'none' }} />
          </label>
        </div>
      </div>
    </div>
  );
}
