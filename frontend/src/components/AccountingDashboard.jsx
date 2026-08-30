// frontend/src/components/AccountingDashboard.jsx

import React, { useState, useEffect } from 'react';
import { getCalculatedDashboardMetrics } from '../utils/dashboardDataEngine.js';

export default function AccountingDashboard({ firm, onNavigate }) {
  const [metrics, setMetrics] = useState({
    totalReceivables: 0,
    totalPayables: 0,
    cashBankBalance: 0,
    rawStockQty: 0,
    finishedStockQty: 0
  });

  useEffect(() => {
    const liveData = getCalculatedDashboardMetrics();
    setMetrics(liveData);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Dynamic Active Firm Banner */}
      <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '18px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        <h2 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>
          🏭 {firm?.legal_name || 'Neelkanth Int Udyog'}
        </h2>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
          GSTIN: {firm?.gstin || 'Unregistered'} | Category: {firm?.industry_type || 'BRICK_KILN'}
        </div>
      </div>

      {/* Live Financial Metrics (Strictly Real Data) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
        <div style={{ ...cardStyle, borderLeft: '4px solid #10b981' }}>
          <span style={cardTitleStyle}>Receivables (Denadar)</span>
          <h3 style={{ margin: '4px 0 0 0', color: '#10b981', fontSize: '16px' }}>₹{metrics.totalReceivables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
        </div>

        <div style={{ ...cardStyle, borderLeft: '4px solid #ef4444' }}>
          <span style={cardTitleStyle}>Payables (Lendhar)</span>
          <h3 style={{ margin: '4px 0 0 0', color: '#ef4444', fontSize: '16px' }}>₹{metrics.totalPayables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
        </div>

        <div style={{ ...cardStyle, borderLeft: '4px solid #0284c7' }}>
          <span style={cardTitleStyle}>Cash & Bank Balance</span>
          <h3 style={{ margin: '4px 0 0 0', color: '#0284c7', fontSize: '16px' }}>₹{metrics.cashBankBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
        </div>
      </div>

      {/* Live Inventory Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div style={{ ...cardStyle, borderLeft: '4px solid #2563eb' }}>
          <span style={cardTitleStyle}>Raw Bricks (Kacchi)</span>
          <h3 style={{ margin: '4px 0 0 0', color: '#2563eb', fontSize: '15px' }}>{metrics.rawStockQty.toLocaleString('en-IN')} NOS</h3>
        </div>

        <div style={{ ...cardStyle, borderLeft: '4px solid #f59e0b' }}>
          <span style={cardTitleStyle}>Finished Bricks (Pakki)</span>
          <h3 style={{ margin: '4px 0 0 0', color: '#f59e0b', fontSize: '15px' }}>{metrics.finishedStockQty.toLocaleString('en-IN')} NOS</h3>
        </div>
      </div>

      {/* High-Contrast Quick Action Buttons */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '14px' }}>⚡ Quick Accounting Actions</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button onClick={() => onNavigate('billing')} style={{ ...actionBtnStyle, backgroundColor: '#2563eb', color: '#ffffff' }}>
            🧾 Sales Billing
          </button>
          <button onClick={() => onNavigate('bhatta_prod')} style={{ ...actionBtnStyle, backgroundColor: '#d97706', color: '#ffffff' }}>
            🧱 Brick Production
          </button>
          <button onClick={() => onNavigate('purchase')} style={{ ...actionBtnStyle, backgroundColor: '#059669', color: '#ffffff' }}>
            🛍️ Purchase Entry
          </button>
          <button onClick={() => onNavigate('ledger')} style={{ ...actionBtnStyle, backgroundColor: '#4f46e5', color: '#ffffff' }}>
            📖 View Account Milan
          </button>
        </div>
      </div>

    </div>
  );
}

const cardStyle = { backgroundColor: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const cardTitleStyle = { fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' };
const actionBtnStyle = { border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', textAlign: 'center' };
