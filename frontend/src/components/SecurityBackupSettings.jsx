// frontend/src/components/SecurityBackupSettings.jsx
import React, { useState } from 'react';
import { StorageService } from '../utils/storageSync';

export default function SecurityBackupSettings({ firm, onClose }) {
  const [statusMsg, setStatusMsg] = useState(null);

  const handleDownloadBackup = () => {
    try {
      const allData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        allData[key] = StorageService.getItem ? StorageService.getItem(key) : localStorage.getItem(key);
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `account_book_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setStatusMsg({ type: 'success', text: '✓ Backup JSON downloaded successfully!' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Backup failed: ' + err.message });
    }
  };

  const handleRestoreBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsedData = JSON.parse(event.target.result);
        Object.keys(parsedData).forEach(key => {
          localStorage.setItem(key, typeof parsedData[key] === 'string' ? parsedData[key] : JSON.stringify(parsedData[key]));
        });
        window.dispatchEvent(new Event('app_storage_updated'));
        setStatusMsg({ type: 'success', text: '✓ Data restored successfully from backup file!' });
      } catch (err) {
        setStatusMsg({ type: 'error', text: 'Restore failed: Invalid JSON file format.' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', maxWidth: '650px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>SECURITY & GOVERNANCE</div>
          <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>🔒 Data Backup & Restore Settings</h2>
        </div>
        {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Close</button>}
      </div>

      {statusMsg && (
        <div style={{ backgroundColor: statusMsg.type === 'error' ? '#fef2f2' : '#ecfdf5', color: statusMsg.type === 'error' ? '#991b1b' : '#065f46', padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px', border: `1px solid ${statusMsg.type === 'error' ? '#fecaca' : '#bbf7d0'}` }}>
          {statusMsg.text}
        </div>
      )}

      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>📥 Download Full Backup</h3>
          <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#64748b' }}>सुरक्षा के लिए अपने सभी वाउचर्स, लेजर्स और इन्वेंट्री डेटा की एक JSON फाइल डाउनलोड करें।</p>
          <button 
            onClick={handleDownloadBackup}
            style={{ width: '100%', padding: '12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
          >
            📥 Download Backup File (.json)
          </button>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />

        <div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>📤 Restore Data from Backup</h3>
          <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#64748b' }}>पूर्व में ली गई बैकअप फाइल को अपलोड करके अपना डेटा रीस्टोर करें।</p>
          <input 
            type="file" 
            accept=".json"
            onChange={handleRestoreBackup}
            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}
          />
        </div>

      </div>

    </div>
  );
}
