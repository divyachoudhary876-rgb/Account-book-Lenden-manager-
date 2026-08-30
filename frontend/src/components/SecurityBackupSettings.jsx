// frontend/src/components/SecurityBackupSettings.jsx

import React, { useState, useEffect } from 'react';
import { validateEntryModificationPermission } from '../utils/financialYearLockEngine.js';

export default function SecurityBackupSettings() {
  const [isLocked, setIsLocked] = useState(false);
  const [lockDate, setLockDate] = useState('2026-03-31');

  useEffect(() => {
    setIsLocked(localStorage.getItem('is_fy_period_locked') === 'true');
    setLockDate(localStorage.getItem('fy_lock_until_date') || '2026-03-31');
  }, []);

  const handleSaveSecurityLock = () => {
    localStorage.setItem('is_fy_period_locked', isLocked ? 'true' : 'false');
    localStorage.setItem('fy_lock_until_date', lockDate);
    alert(`🔒 Security Lock Configuration updated! Entries on or before ${lockDate} are now ${isLocked ? 'LOCKED' : 'UNLOCKED'}.`);
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>🔒 Data Security & Financial Period Lock</h3>

      <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h4 style={{ margin: 0, color: '#1e293b' }}>CA Audit Period Lock</h4>
        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
          Lock historical voucher entries to prevent accidental modifications or backdated tampering in closed financial periods.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            id="lockToggle"
            checked={isLocked}
            onChange={(e) => setIsLocked(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          <label htmlFor="lockToggle" style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>
            Enable Read-Only Period Lock
          </label>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
            Lock Entries On or Before Date
          </label>
          <input
            type="date"
            value={lockDate}
            onChange={(e) => setLockDate(e.target.value)}
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
          />
        </div>

        <button
          onClick={handleSaveSecurityLock}
          style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', alignSelf: 'flex-start' }}
        >
          💾 Apply Security Settings
        </button>
      </div>
    </div>
  );
}
