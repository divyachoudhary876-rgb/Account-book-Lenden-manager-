// frontend/src/components/NavbarHeader.jsx

import React from 'react';

export default function NavbarHeader({ firm, onOpenMenu }) {
  return (
    <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      
      {/* Brand Logo & Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '32px', height: '32px', backgroundColor: '#2563eb', borderRadius: '6px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
          AB
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '15px', color: '#0f172a', lineHeight: '1.2' }}>Account Book</h2>
          <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#2563eb' }}>SMART LENDEN MANAGER</span>
        </div>
      </div>

      {/* Active Firm Subtext */}
      <div style={{ textAlign: 'center', display: 'none', minWidth: '180px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#0f172a' }}>{firm?.legal_name || 'Neelkanth Int Udyog'}</div>
        <div style={{ fontSize: '10px', color: '#64748b' }}>GSTIN: {firm?.gstin || '08AAAAA0000A1Z5'}</div>
      </div>

      {/* Navigation Suite Toggle Button */}
      <button
        onClick={onOpenMenu}
        style={{ backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        ☰ Accounting Suite
      </button>

    </header>
  );
}
