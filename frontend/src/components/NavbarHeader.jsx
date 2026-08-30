// frontend/src/components/NavbarHeader.jsx

import React from 'react';

export default function NavbarHeader({ firm, activeTab, onNavigate, onToggleMenu }) {
  return (
    <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
      
      {/* Fixed Functional Back Button */}
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
            <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#2563eb' }}>{firm?.legal_name || 'SMART MANAGER'}</span>
          </div>
        </div>
      </div>

      {/* Menu Drawer Toggle */}
      <button
        onClick={onToggleMenu}
        style={{ backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
      >
        ☰ Menu
      </button>

    </header>
  );
}
