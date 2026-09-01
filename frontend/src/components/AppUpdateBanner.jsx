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
      backgroundColor: '#0f172a',
      color: '#ffffff',
      padding: '10px 16px',
      borderRadius: '8px',
      margin: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '10px',
      borderLeft: '4px solid #10b981',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '20px' }}>🚀</span>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
            New Update Available: {updateInfo.latestVersion}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
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
            color: '#94a3b8',
            border: '1px solid #334155',
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
