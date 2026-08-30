// frontend/src/components/NavbarHeader.jsx

import React from 'react';
import AppLogo from './AppLogo.jsx';

export default function NavbarHeader({ firm, onOpenMenu }) {
  return (
    <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #E2E8F0', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      
      {/* Brand Logo & Application Title */}
      <AppLogo width={36} height={36} showText={true} />

      {/* Active Business Context */}
      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0F172A' }}>{firm?.legal_name || 'Business Setup Pending'}</span>
          <span style={{ fontSize: '11px', color: '#64748B' }}>GSTIN: {firm?.gstin || 'Unregistered'} | {firm?.industry_type || 'General'}</span>
        </div>

        <button 
          onClick={onOpenMenu}
          style={{ backgroundColor: '#0F172A', color: '#FFFFFF', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          ☰ Accounting Suite
        </button>
      </div>

    </header>
  );
}
