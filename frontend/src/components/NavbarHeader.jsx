// frontend/src/components/NavbarHeader.jsx

import React, { useState, useEffect } from 'react';
import { getAllFirms, switchActiveFirm } from '../utils/multiFirmEngine.js';
import { getCurrentActiveFY, setActiveFY } from '../utils/financialYearLockEngine.js';

export default function NavbarHeader({ firm, activeTab, onNavigate, onToggleMenu }) {
  const [firmsList, setFirmsList] = useState([]);
  const [currentFY, setCurrentFY] = useState('2026-2027');

  useEffect(() => {
    setFirmsList(getAllFirms());
    setCurrentFY(getCurrentActiveFY());
  }, [firm]);

  const handleQuickFirmSwitch = (firmId) => {
    try {
      const switched = switchActiveFirm(firmId);
      if (onNavigate) onNavigate('dashboard');
      window.location.reload();
    } catch (err) {
      alert(`❌ Context Switch Error: ${err.message}`);
    }
  };

  const handleFYChange = (fy) => {
    setActiveFY(fy);
    setCurrentFY(fy);
    alert(`📅 Active Audit Period set to ${fy}`);
  };

  return (
    <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap', gap: '10px' }}>
      
      {/* Brand & Direct Navigation Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {activeTab !== 'dashboard' && firm && (
          <button
            onClick={() => onNavigate('dashboard')}
            style={{ backgroundColor: '#1e3a8a', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            ← Dashboard
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '28px', height: '28px', backgroundColor: '#0f172a', borderRadius: '6px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '11px' }}>
            AB
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '13px', color: '#0f172a', lineHeight: '1.2' }}>Account Book</h2>
            <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#2563eb' }}>SMART MANAGER</span>
          </div>
        </div>
      </div>

      {/* Top Bar Quick Controls */}
      {firm && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          
          <select
            value={firm.id}
            onChange={(e) => handleQuickFirmSwitch(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #2563eb', backgroundColor: '#eff6ff', fontSize: '12px', fontWeight: 'bold', color: '#1e40af', outline: 'none' }}
          >
            {firmsList.map(f => (
              <option key={f.id} value={f.id}>🏢 {f.legal_name} ({f.industry_type})</option>
            ))}
          </select>

          <select
            value={currentFY}
            onChange={(e) => handleFYChange(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '12px', fontWeight: 'bold', color: '#334155', outline: 'none' }}
          >
            <option value="2025-2026">FY 2025-26</option>
            <option value="2026-2027">FY 2026-27</option>
          </select>

        </div>
      )}

      {/* Navigation Suite Toggle */}
      <button
        onClick={onToggleMenu}
        style={{ backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
      >
        ☰ Menu
      </button>

    </header>
  );
}
