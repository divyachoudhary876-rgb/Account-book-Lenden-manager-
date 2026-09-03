// frontend/src/components/SecurityBackupSettings.jsx

import React, { useState } from 'react';
import { exportUniversalBackup, restoreUniversalBackup } from '../utils/backupEngine.js';

export default function SecurityBackupSettings({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const activeFirmName = firm?.legal_name || firm?.trade_name || 'Neelkanth Int Udyog';

  const [restoreMetrics, setRestoreMetrics] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showJsonPaste, setShowJsonPaste] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Trigger Export Backup (.JSON)
  const handleExport = () => {
    try {
      setErrorMessage(null);
      const result = exportUniversalBackup(activeFirmId, activeFirmName);
      if (result.success) {
        alert(`✓ Full Backup Downloaded Successfully!\nTimestamp: ${new Date(result.timestamp).toLocaleString('en-IN')}`);
      }
    } catch (err) {
      setErrorMessage(`Export failed: ${err.message}`);
    }
  };

  // Process & Normalize Restore Result
  const applyRestoreResult = (result) => {
    if (!result || !result.success) {
      throw new Error(result?.message || 'Restore failed to complete.');
    }

    // Defensive fallback: inspect all possible key aliases, fallback to 0
    const accounts = result.accountsCount ?? result.accounts ?? 0;
    const vouchers = result.vouchersCount ?? result.vouchers ?? 0;
    const stockSKUs = result.stockCount ?? result.stockSKUs ?? result.stock ?? 0;

    setRestoreMetrics({
      accounts: Number.isFinite(accounts) ? accounts : 0,
      vouchers: Number.isFinite(vouchers) ? vouchers : 0,
      stockSKUs: Number.isFinite(stockSKUs) ? stockSKUs : 0
    });
    setErrorMessage(null);
  };

  // 2. Restore via File Picker (.JSON)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setRestoreMetrics(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const fileContent = event.target?.result;
        const result = restoreUniversalBackup(fileContent);
        applyRestoreResult(result);
      } catch (err) {
        setErrorMessage(err.message || 'Corrupted or invalid backup file.');
      } finally {
        setIsProcessing(false);
        // Reset file input value so the same file can be re-selected if needed
        e.target.value = '';
      }
    };
    reader.onerror = () => {
      setErrorMessage('Could not read the selected backup file from device storage.');
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  // 3. Restore via Direct JSON Paste
  const handlePasteRestore = () => {
    if (!pastedJson.trim()) {
      setErrorMessage('Please paste valid JSON backup content.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setRestoreMetrics(null);

    try {
      const result = restoreUniversalBackup(pastedJson);
      applyRestoreResult(result);
      setPastedJson('');
      setShowJsonPaste(false);
    } catch (err) {
      setErrorMessage(err.message || 'Invalid JSON syntax.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px', paddingBottom: '50px' }}>
      
      {/* Active Firm Header Card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🛡️</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
              Data Backup & Migration Center
            </h3>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              Active Firm: <strong>{activeFirmName}</strong> ({activeFirmId})
            </div>
          </div>
        </div>
      </div>

      {/* Success Feedback Banner (Zero 'undefined' guaranteed) */}
      {restoreMetrics && (
        <div style={successBannerStyle}>
          <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '4px' }}>
            ✓ Backup Restored Successfully!
          </div>
          <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
            • Accounts: <strong>{restoreMetrics.accounts}</strong><br />
            • Vouchers: <strong>{restoreMetrics.vouchers}</strong><br />
            • Stock SKUs: <strong>{restoreMetrics.stockSKUs}</strong>
          </div>
        </div>
      )}

      {/* Error Feedback Banner */}
      {errorMessage && (
        <div style={errorBannerStyle}>
          <strong>⚠️ Restore Error:</strong> {errorMessage}
        </div>
      )}

      {/* Section 1: Download Full Backup */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '18px' }}>📥</span>
          <strong style={{ fontSize: '15px', color: '#0f172a' }}>Download Full Data Backup</strong>
        </div>
        <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
          Saves all ledger accounts, voucher entries, stock counts, and firm profiles to your phone's storage / Documents folder.
        </p>
        <button
          type="button"
          onClick={handleExport}
          style={primaryButtonStyle}
        >
          <span>💾</span> Export Backup (.JSON)
        </button>
      </div>

      {/* Section 2: Restore Backup */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '18px' }}>📤</span>
          <strong style={{ fontSize: '15px', color: '#0f172a' }}>Restore Old / Previous App Backup</strong>
        </div>
        <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
          Upload your previously downloaded backup JSON file to restore all your financial transactions instantly.
        </p>

        {/* Option 1: File Picker */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
            Option 1: Choose File from Phone Storage (.JSON)
          </label>
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            disabled={isProcessing}
            style={{
              fontSize: '12px',
              padding: '6px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Option Divider */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0', color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
          <span style={{ padding: '0 10px' }}>— OR —</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
        </div>

        {/* Option 2: Direct Paste Accordion */}
        <div>
          <button
            type="button"
            onClick={() => setShowJsonPaste(!showJsonPaste)}
            style={{
              background: 'none',
              border: 'none',
              color: '#0284c7',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>{showJsonPaste ? '▲' : '▼'}</span> Option 2: Paste Backup JSON Code directly
          </button>

          {showJsonPaste && (
            <div style={{ marginTop: '10px' }}>
              <textarea
                rows={5}
                placeholder="Paste the raw JSON content here..."
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={handlePasteRestore}
                disabled={isProcessing || !pastedJson.trim()}
                style={{
                  ...primaryButtonStyle,
                  backgroundColor: '#059669',
                  marginTop: '8px',
                  opacity: isProcessing || !pastedJson.trim() ? 0.6 : 1
                }}
              >
                {isProcessing ? 'Restoring Data...' : 'Apply JSON Code'}
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '18px 20px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
};

const successBannerStyle = {
  backgroundColor: '#ecfdf5',
  border: '1px solid #a7f3d0',
  color: '#065f46',
  padding: '14px 18px',
  borderRadius: '14px',
  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.1)'
};

const errorBannerStyle = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  color: '#991b1b',
  padding: '12px 16px',
  borderRadius: '12px',
  fontSize: '12px'
};

const primaryButtonStyle = {
  backgroundColor: '#0284c7',
  color: '#ffffff',
  border: 'none',
  padding: '10px 18px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 'bold',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
};
