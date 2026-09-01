// frontend/src/components/SecurityBackupSettings.jsx

import React, { useState } from 'react';
import { exportUniversalBackup, restoreUniversalBackup } from '../utils/backupEngine.js';

export default function SecurityBackupSettings({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const firmName = firm?.legal_name || 'Enterprise Profile';

  const [statusMessage, setStatusMessage] = useState(null);
  const [copiedBackup, setCopiedBackup] = useState('');
  const [pastedJson, setPastedJson] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Export Trigger
  const handleExport = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await exportUniversalBackup(activeFirmId, firmName);
      setCopiedBackup(res.jsonString);
      
      setStatusMessage({
        type: 'success',
        text: `✓ Backup Generated Successfully!\n• File: ${res.fileName}\n• Saved in: Documents/Downloads Folder\n• Transactions: ${res.count}\n\nTip: You can also copy the backup code below or share via WhatsApp/Drive.`
      });
    } catch (e) {
      setStatusMessage({ type: 'error', text: `❌ Backup Failed: ${e.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Direct Clipboard Copy
  const handleCopyClipboard = () => {
    if (!copiedBackup) {
      alert("Please click 'Export Backup' first.");
      return;
    }
    navigator.clipboard.writeText(copiedBackup);
    alert("✓ Backup JSON copied to clipboard! You can paste and save it anywhere (WhatsApp / Notes).");
  };

  // 3. File Restore
  const handleFileRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm(`⚠️ Restoring backup will update accounts, vouchers, and inventory for "${firmName}". Proceed?`)) {
      e.target.value = '';
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await restoreUniversalBackup(file, activeFirmId);
      setStatusMessage({
        type: 'success',
        text: `✓ Restore Successful!\n• Accounts: ${res.accountsRestored}\n• Vouchers: ${res.vouchersRestored}\n• Stock SKUs: ${res.stockRestored}`
      });
    } catch (err) {
      setStatusMessage({ type: 'error', text: `❌ ${err.message}` });
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  // 4. Paste Text Restore
  const handlePasteRestore = async () => {
    if (!pastedJson.trim()) {
      alert("Please paste the backup JSON text first.");
      return;
    }

    if (!window.confirm(`⚠️ Restore data from pasted text into "${firmName}"?`)) return;

    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await restoreUniversalBackup(pastedJson.trim(), activeFirmId);
      setStatusMessage({
        type: 'success',
        text: `✓ Restore Successful!\n• Accounts: ${res.accountsRestored}\n• Vouchers: ${res.vouchersRestored}\n• Stock SKUs: ${res.stockRestored}`
      });
      setPastedJson('');
      setShowPasteBox(false);
    } catch (err) {
      setStatusMessage({ type: 'error', text: `❌ ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '30px' }}>
      
      {/* Header Banner */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px 20px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🛡️</span> Data Backup & Migration Center
        </h3>
        <span style={{ fontSize: '11px', color: '#64748b' }}>
          Active Firm: <strong>{firmName}</strong> ({activeFirmId})
        </span>
      </div>

      {statusMessage && (
        <div style={{
          backgroundColor: statusMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${statusMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: statusMessage.type === 'success' ? '#065f46' : '#b91c1c',
          padding: '14px 18px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '700',
          whiteSpace: 'pre-line'
        }}>
          {statusMessage.text}
        </div>
      )}

      {/* 1. EXPORT BACKUP CARD */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', display: 'grid', gap: '12px' }}>
        <strong style={{ fontSize: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📥</span> Download & Export Full Data Backup
        </strong>
        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
          Saves all ledger accounts, vouchers, stock records, and firm settings directly to your phone's storage / Documents folder.
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExport}
            disabled={isProcessing}
            style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
            }}
          >
            💾 Export & Share Backup
          </button>

          {copiedBackup && (
            <button
              onClick={handleCopyClipboard}
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: 'none',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              📋 Copy Backup Text
            </button>
          )}
        </div>
      </div>

      {/* 2. RESTORE BACKUP CARD */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', display: 'grid', gap: '12px' }}>
        <strong style={{ fontSize: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📤</span> Restore Old / Previous App Backup
        </strong>
        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
          Upload your previously downloaded `.json` backup file from File Manager or paste raw backup code.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* File Picker */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
              Option A: Select Backup File (.JSON)
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileRestore}
              disabled={isProcessing}
              style={{ fontSize: '12px' }}
            />
          </div>

          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}>
            ── OR ──
          </div>

          {/* Paste JSON Option */}
          <div>
            <button
              type="button"
              onClick={() => setShowPasteBox(!showPasteBox)}
              style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
            >
              {showPasteBox ? '▲ Hide Paste Box' : '▼ Option B: Paste Backup Text Code directly'}
            </button>

            {showPasteBox && (
              <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
                <textarea
                  rows={5}
                  placeholder="Paste your copied JSON backup text here..."
                  value={pastedJson}
                  onChange={e => setPastedJson(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={handlePasteRestore}
                  disabled={isProcessing}
                  style={{ backgroundColor: '#10b981', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  ⚡ Restore from Pasted Text
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
