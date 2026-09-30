// frontend/src/components/AppUpdateBanner.jsx

import React, { useState, useEffect } from 'react';
import { checkForAppUpdates, triggerAppDownload, CURRENT_APP_VERSION } from '../utils/otaUpdateEngine.js';

export default function AppUpdateBanner() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const runUpdateCheck = async () => {
    setIsChecking(true);
    const result = await checkForAppUpdates();
    if (result.updateAvailable) {
      setUpdateInfo(result);
    }
    setIsChecking(false);
  };

  useEffect(() => {
    runUpdateCheck();
  }, []);

  if (isDismissed || !updateInfo || !updateInfo.updateAvailable) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: '#f0fdf4',
      color: '#0f172a',
      padding: '10px 16px',
      borderRadius: '8px',
      margin: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '10px',
      border: '1px solid #bbf7d0',
      borderLeft: '4px solid #10b981',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '18px' }}>🚀</span>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#065f46' }}>
            New Update Available: {updateInfo.latestVersion}
          </div>
          <div style={{ fontSize: '11px', color: '#475569' }}>
            Current version: v{CURRENT_APP_VERSION.versionName} • Direct in-place upgrade ready
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => triggerAppDownload(updateInfo.downloadUrl)}
          style={{
            backgroundColor: '#10b981',
            color: '#ffffff',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          ⬇️ Update Now
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          style={{
            backgroundColor: 'transparent',
            color: '#64748b',
            border: '1px solid #cbd5e1',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
