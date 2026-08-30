// frontend/src/components/AccountingDashboard.jsx

import React from 'react';

export default function AccountingDashboard({ firm, onNavigate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Firm Greeting Banner */}
      <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>🏭 {firm?.legal_name || 'Neelkanth Int Udyog'}</h2>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>GSTIN: {firm?.gstin || 'Unregistered'} | Category: {firm?.industry_type || 'BRICK_KILN'}</span>
      </div>

      {/* Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ ...cardStyle, borderLeft: '4px solid #10b981' }}>
          <span style={cardTitleStyle}>Total Receivables (Denadar)</span>
          <h3 style={{ margin: '6px 0 0 0', color: '#10b981' }}>₹1,45,000.00</h3>
        </div>
        <div style={{ ...cardStyle, borderLeft: '4px solid #ef4444' }}>
          <span style={cardTitleStyle}>Total Payables (Lendhar)</span>
          <h3 style={{ margin: '6px 0 0 0', color: '#ef4444' }}>₹62,500.00</h3>
        </div>
        <div style={{ ...cardStyle, borderLeft: '4px solid #2563eb' }}>
          <span style={cardTitleStyle}>Total Raw Bricks Stock</span>
          <h3 style={{ margin: '6px 0 0 0', color: '#2563eb' }}>10,000 NOS</h3>
        </div>
      </div>

      {/* Quick Actions Shortcuts */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>⚡ Quick Accounting Actions</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
          <button onClick={() => onNavigate('billing')} style={actionBtnStyle}>🧾 Create Sales Invoice</button>
          <button onClick={() => onNavigate('bhatta_prod')} style={actionBtnStyle}>🧱 Brick Production Entry</button>
          <button onClick={() => onNavigate('purchase')} style={actionBtnStyle}>🛍️ Purchase Stock Inward</button>
          <button onClick={() => onNavigate('ledger')} style={actionBtnStyle}>📖 View Account Milan</button>
        </div>
      </div>

    </div>
  );
}

const cardStyle = { backgroundColor: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' };
const cardTitleStyle = { fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' };
const actionBtnStyle = { backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0f172a', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', textAlign: 'center' };
