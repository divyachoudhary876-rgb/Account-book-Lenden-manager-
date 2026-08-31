// frontend/src/components/AppUpdateBanner.jsx

import React, { useState, useEffect } from 'react';
import { checkForSilentAppUpdates, applySilentAppUpdate } from '../utils/otaUpdateEngine.js';

export default function AppUpdateBanner() {
  const [updateMeta, setUpdateMeta] = useState(null);

  useEffect(() => {
    // Check for updates on mount and every 30 minutes
    runCheck();
    const interval = setInterval(runCheck, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const runCheck = async () => {
    const info = await checkForSilentAppUpdates();
    if (info.hasUpdate) {
      setUpdateMeta(info);
    }
  };

  if (!updateMeta) return null;

  return (
    <div style={bannerStyle}>
      <div style={{ flex: 1 }}>
        <strong style={{ fontSize: '13px', display: 'block' }}>🚀 New Version Available ({updateMeta.versionName})</strong>
        <span style={{ fontSize: '11px', opacity: 0.9 }}>App update bina kisi data loss ya reinstall ke ready hai.</span>
      </div>
      <button onClick={applySilentAppUpdate} style={updateBtnStyle}>
        🔄 Update Now
      </button>
    </div>
  );
}

const bannerStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  backgroundColor: '#2563eb',
  color: '#ffffff',
  padding: '10px 16px',
  display: 'flex',
  alignItems: 'center',
  justify: 'space-between',
  zIndex: 9999,
  boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
  fontFamily: 'sans-serif'
};

const updateBtnStyle = {
  backgroundColor: '#ffffff',
  color: '#2563eb',
  border: 'none',
  padding: '8px 14px',
  borderRadius: '6px',
  fontWeight: 'bold',
  fontSize: '12px',
  cursor: 'pointer'
};
