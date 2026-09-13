// frontend/src/components/SecurityBackupSettings.jsx
import React, { useState } from 'react';
import { exportUniversalBackup, restoreUniversalBackup } from '../utils/backupEngine';

export default function SecurityBackupSettings({ firm, onClose }) {
  const [pastedJson, setPastedJson] = useState('');
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPasteSection, setShowPasteSection] = useState(false);

  // Handle Export / Download Backup using backupEngine
  const handleDownloadBackup = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsProcessing(true);
    try {
      await exportUniversalBackup(firm);
      setSuccessMsg('✓ Full Backup Downloaded Successfully!');
    } catch (err) {
      setErrorMsg(err.message || 'Backup export failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle File Upload Restore using backupEngine
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsProcessing(true);

    try {
      const fileText = await file.text();
      const result = await restoreUniversalBackup(fileText);
      const vCount = result?.stats?.vouchersCount || 0;
      const aCount = result?.stats?.accountsCount || 0;
      
      setSuccessMsg(`✓ Successfully restored ${vCount} vouchers and ${aCount} accounts! Reloading application...`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to process and restore the backup file.');
    } finally {
      setIsProcessing(false);
      e.target.value = null; // Reset file input
    }
  };

  // Handle Paste JSON Restore
  const handlePasteRestore = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!pastedJson.trim()) {
      setErrorMsg('Please paste valid JSON code into the box.');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await restoreUniversalBackup(pastedJson);
      const vCount = result?.stats?.vouchersCount || 0;
      const aCount = result?.stats?.accountsCount || 0;

      setSuccessMsg(`✓ Successfully restored ${vCount} vouchers and ${aCount} accounts! Reloading...`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Restore failed from pasted text.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', maxWidth: '650px', margin: '0 auto', boxSizing: 'border-box', color: '#0f172a' }}>
      
      {/* Header Card */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>SECURITY & GOVERNANCE</div>
          <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>🔒 Data Backup & Migration Center</h2>
        </div>
        {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Close</button>}
      </div>

      {/* Status Messages */}
      {errorMsg && (
        <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px', border: '1px solid #fecaca' }}>
          ⚠️ Error: {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px', border: '1px solid #a7f3d0' }}>
          {successMsg}
        </div>
      )}

      {/* Main Container */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Export Section */}
        <div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>📥 Download Full Data Backup</h3>
          <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#64748b' }}>
            सुरक्षा के लिए अपने सभी वाउचर्स, लेजर्स और इन्वेंट्री डेटा की एक समेकित JSON फाइल डाउनलोड करें।
          </p>
          <button 
            onClick={handleDownloadBackup}
            disabled={isProcessing}
            style={{ width: '100%', padding: '14px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(2, 132, 199, 0.2)' }}
          >
            {isProcessing ? 'Generating Backup...' : '📥 Export Backup (.JSON)'}
          </button>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0' }} />

        {/* Restore Section */}
        <div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>📤 Restore App Backup</h3>
          <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#64748b' }}>
            पूर्व में ली गई बैकअप फाइल अपलोड करें या नीचे दिए गए विकल्प से JSON कोड पेस्ट करें।
          </p>
          
          <div style={{ marginBottom: '12px' }}>
            <input 
              type="file" 
              accept=".json,application/json"
              onChange={handleFileChange}
              disabled={isProcessing}
              style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}
            />
          </div>

          <div style={{ textAlign: 'center', margin: '12px 0', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>— OR —</div>

          <div>
            <button 
              type="button" 
              onClick={() => setShowPasteSection(!showPasteSection)} 
              style={{ background: 'none', border: 'none', color: '#0284c7', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', padding: 0 }}
            >
              {showPasteSection ? '▼ Hide Paste Option' : '▶ Option 2: Paste Backup JSON Code'}
            </button>

            {showPasteSection && (
              <form onSubmit={handlePasteRestore} style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea 
                  rows={5} 
                  placeholder="Paste raw backup JSON text here..." 
                  value={pastedJson} 
                  onChange={(e) => setPastedJson(e.target.value)} 
                  style={{ width: '100%', padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '11px', fontFamily: 'monospace', boxSizing: 'border-box' }} 
                />
                <button 
                  type="submit" 
                  disabled={isProcessing} 
                  style={{ padding: '12px', backgroundColor: '#059669', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
                  {isProcessing ? 'Restoring Data...' : 'Restore from Pasted JSON'}
                </button>
              </form>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
