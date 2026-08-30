// frontend/src/components/NavbarHeader.jsx

import React from 'react';

export default function NavbarHeader({ firm, activeTab, onNavigate, onOpenMenu }) {
  return (
    <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', sticky: 'top', top: 0, zIndex: 100 }}>
      
      {/* Brand / Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {activeTab !== 'dashboard' && (
          <button
            onClick={() => onNavigate('dashboard')}
            style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            ⬅ Dashboard
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '30px', height: '30px', backgroundColor: '#0f172a', borderRadius: '6px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
            AB
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '14px', color: '#0f172a', lineHeight: '1.2' }}>Account Book</h2>
            <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#2563eb' }}>SMART LENDEN MANAGER</span>
          </div>
        </div>
      </div>

      {/* Navigation Suite Drawer Button */}
      <button
        onClick={onOpenMenu}
        style={{ backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
      >
        ☰ Menu
      </button>

    </header>
  );
}
