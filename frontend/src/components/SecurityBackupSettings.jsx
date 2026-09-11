// frontend/src/components/SecurityBackupSettings.jsx
import React, { useState } from 'react';
import { exportUniversalBackup, restoreUniversalBackup } from '../utils/backupEngine';

export default function SecurityBackupSettings({ firm, onClose }) {
  const [pastedJson, setPastedJson] = useState('');
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPasteSection, setShowPasteSection] = useState(false);

  // Handle Export Backup
  const handleExport = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsProcessing(true);
    try {
      await exportUniversalBackup(firm, {});
      setSuccessMsg('✓ Full Backup Downloaded Successfully!');
    } catch (err) {
      setErrorMsg(err.message || 'Export failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // MODERN FILE READER FIX (Mobile / Android Compatible)
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

      setSuccessMsg(`✓ Successfully restored ${vCount} vouchers and ${aCount} accounts! Reloading...`);
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err) {
      console.error("Restore Catch Error: ", err);
      setErrorMsg(err.message || 'Failed to process the backup file.');
    } finally {
      setIsProcessing(false);
      e.target.value = null; 
    }
  };

  // Handle Pasted JSON Restore
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

      setSuccessMsg(`✓ Successfully restored ${vCount} vouchers! Reloading...`);
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Restore failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', width: '100%', maxWidth: '100vw', overflowX: 'hidden', color: '#0f172a' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', marginBottom: '14px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          {onClose && (
            <button onClick={onClose} style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
              ← Dashboard
            </button>
          )}
          <div style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
            Active Firm: {firm?.legal_name || firm?.trade_name || 'Neelkanth Int Udyog'}
          </div>
        </div>

        <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🛡️</span>
          <span>Data Backup & Migration Center</span>
        </h1>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
          Secure local storage export & disaster recovery portal
        </div>
      </div>

      {/* Error / Success Toast Banners */}
      {errorMsg && (
        <div style={{ marginBottom: '14px', padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
          ⚠️ Restore Error: {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{ marginBottom: '14px', padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
          {successMsg}
        </div>
      )}

      {/* Export Card */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', marginBottom: '16px', boxSizing: 'border-box' }}>
        <h2 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
          📥 Download Full Data Backup
        </h2>
        <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
          Saves all ledger accounts, voucher entries, stock counts, and internal consumption logs to your phone's storage or Documents folder.
        </p>
        <button
          onClick={handleExport}
          disabled={isProcessing}
          style={{ width: '100%', padding: '12px', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(2,132,199,0.2)' }}
        >
          💾 {isProcessing ? 'Generating Backup...' : 'Export Backup (.JSON)'}
        </button>
      </div>

      {/* Restore Card */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
        <h2 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
          📤 Restore Old / Previous App Backup
        </h2>
        <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
          Upload your previously downloaded backup JSON file to restore all your financial transactions instantly.
        </p>

        {/* Option 1: File Input */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
            Option 1: Choose File from Phone Storage (.JSON)
          </label>
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            disabled={isProcessing}
            style={{ width: '100%', padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '11px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ textAlign: 'center', margin: '10px 0', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>
          — OR —
        </div>

        {/* Option 2: Paste JSON Code */}
        <div>
          <button
            type="button"
            onClick={() => setShowPasteSection(!showPasteSection)}
            style={{ background: 'none', border: 'none', color: '#0284c7', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', padding: 0 }}
          >
            {showPasteSection ? '▼ Hide Option 2: Paste JSON Code' : '▶ Option 2: Paste Backup JSON Code directly'}
          </button>

          {showPasteSection && (
            <form onSubmit={handlePasteRestore} style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea
                rows={5}
                placeholder="Paste raw backup JSON text here..."
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '11px', boxSizing: 'border-box', fontFamily: 'monospace' }}
              />
              <button
                type="submit"
                disabled={isProcessing}
                style={{ padding: '10px', backgroundColor: '#059669', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}
              >
                {isProcessing ? 'Restoring...' : 'Restore from Pasted JSON'}
              </button>
            </form>
          )}
        </div>
      </div>

    </div>
  );
}
