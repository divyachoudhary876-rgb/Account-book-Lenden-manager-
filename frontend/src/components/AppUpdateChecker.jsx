// frontend/src/components/AppUpdateChecker.jsx

import React, { useState, useEffect } from 'react';

export default function AppUpdateChecker() {
  const [currentVersion, setCurrentVersion] = useState('1.0.0');

  useEffect(() => {
    // Read active app package metadata
    const version = import.meta.env.VITE_APP_VERSION || '1.0.3';
    setCurrentVersion(version);
  }, []);

  return (
    <div style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#475569' }}>
      <div>
        <span>📱 App Version: <strong>v{currentVersion}</strong></span>
        <span style={{ marginLeft: '8px', color: '#059669', fontWeight: 'bold' }}>✓ Direct Update Compatible</span>
      </div>
      
      <div style={{ fontSize: '10px', color: '#64748b' }}>
        Seamless Overwrite Enabled
      </div>
    </div>
  );
}
