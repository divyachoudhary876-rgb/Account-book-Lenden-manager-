// frontend/src/components/SecurityBackupSettings.jsx

import React, { useState } from 'react';
import { exportCompleteDataBackup, restoreDataBackup } from '../utils/backupEngine';

export default function SecurityBackupSettings() {
  const [restoreStatus, setRestoreStatus] = useState('');

  const handleExport = () => {
    const res = exportCompleteDataBackup();
    if (res.success) {
      alert('Data Backup JSON File downloads folder me save ho chuki hai!');
    } else {
      alert('Backup Fail: ' + res.error);
    }
  };

  const handleFileChange = (e) => {
    const fileReader = new FileReader();
    if (e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        const res = restoreDataBackup(event.target.result);
        if (res.success) {
          alert('Data Successfully Restore Ho Gaya Hai! App reload ho raha hai...');
          window.location.reload();
        } else {
          alert('Restore Failed: ' + res.error);
        }
      };
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: '600px', margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>🔒 Data Protection & Migration Center</h3>
      <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>
        App update ya device change karne se pehle 1-Click backup export karein taaki kabhi data delete na ho.
      </p>

      {/* Backup Export */}
      <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 6px 0', color: '#1e293b' }}>1. Export Data Backup (सुरक्षित बैकअप लें)</h4>
        <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>
          Apni firm, ledger accounts, vouchers, aur bills ko JSON file format me download karein.
        </p>
        <button 
          onClick={handleExport}
          style={{ padding: '10px 18px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
        >
          📥 Download Data Backup File
        </button>
      </div>

      {/* Backup Restore */}
      <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 6px 0', color: '#1e293b' }}>2. Restore Backup Data (पुराना बैकअप वापस लोड करें)</h4>
        <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>
          Purane backup JSON file ko choose karke saara data ek click me restore karein.
        </p>
        <input 
          type="file" 
          accept=".json"
          onChange={handleFileChange}
          style={{ fontSize: '12px', cursor: 'pointer' }}
        />
      </div>
    </div>
  );
}
