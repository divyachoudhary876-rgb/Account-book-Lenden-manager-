// frontend/src/components/EnterpriseDashboard.jsx

import React, { useState } from 'react';

export default function EnterpriseDashboard({ firm }) {
  const [activeTab, setActiveTab] = useState('dashboard');

  const metrics = [
    { title: 'Total Sales (This Month)', amount: '₹ 12,45,600', trend: '↑ 18.6% vs Apr', color: '#10b981', bg: '#ecfdf5' },
    { title: 'Total Purchases (This Month)', amount: '₹ 8,76,300', trend: '↑ 12.4% vs Apr', color: '#f59e0b', bg: '#fffbeb' },
    { title: 'Total Receivables', amount: '₹ 9,65,250', trend: 'Outstanding', color: '#2563eb', bg: '#eff6ff' },
    { title: 'Total Payables', amount: '₹ 6,25,780', trend: 'Outstanding', color: '#7c3aed', bg: '#f5f3ff' },
    { title: 'Cash & Bank Balance', amount: '₹ 15,62,450', trend: 'Across all accounts', color: '#059669', bg: '#ecfdf5' }
  ];

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '16px' }}>
      
      {/* Top Bar Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '12px 20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>📊 Business Dashboard</h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '13px', color: '#475569' }}>
          <span>📅 29 May 2026</span>
          <span style={{ backgroundColor: '#e2e8f0', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold' }}>👤 Admin ▼</span>
        </div>
      </div>

      {/* 5 Key Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {metrics.map((m, idx) => (
          <div key={idx} style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: `4px solid ${m.color}` }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>{m.title}</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '6px 0' }}>{m.amount}</div>
            <div style={{ fontSize: '10px', color: m.color, fontWeight: 'bold' }}>{m.trend}</div>
          </div>
        ))}
      </div>

      {/* Main Overview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
        
        {/* Business Overview Graph Container */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>Business Overview (Sales vs Purchases)</h4>
          <div style={{ height: '180px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px' }}>
            📈 Real-Time Interactive Sales & Purchase Line Chart Engine
          </div>
        </div>

        {/* Top Outstanding Receivables */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>Top Outstanding Receivables</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
              <span>1. ABC Traders</span>
              <strong style={{ color: '#0f172a' }}>₹ 2,45,600</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
              <span>2. S.K. Enterprises</span>
              <strong style={{ color: '#0f172a' }}>₹ 1,75,300</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
              <span>3. R.K. Electric Co.</span>
              <strong style={{ color: '#0f172a' }}>₹ 1,25,000</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Sub-Modules Grid View (Section 2 from Blueprint) */}
      <h3 style={{ margin: '0 0 14px 0', color: '#0f172a', fontSize: '16px' }}>⚙️ Enterprise Modules Summary</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={moduleCardStyle}>
          <h4 style={moduleHeaderStyle}>🧾 Sales & Invoicing</h4>
          <p style={moduleTextStyle}>Sales Invoice, Credit/Debit Notes, Delivery Challan, Quotations, Sales Register</p>
        </div>
        <div style={moduleCardStyle}>
          <h4 style={moduleHeaderStyle}>📦 Inventory / Stock</h4>
          <p style={moduleTextStyle}>Stock Summary, Ledger, Transfer, Godown/Warehouse Tracking, Low-Stock Alert</p>
        </div>
        <div style={moduleCardStyle}>
          <h4 style={moduleHeaderStyle}>💳 Banking & Reconciliation</h4>
          <p style={moduleTextStyle}>Bank Accounts, Cheque Management, Statement Auto-Import, Reconciliation</p>
        </div>
        <div style={moduleCardStyle}>
          <h4 style={moduleHeaderStyle}>🏛️ GST & Tax Compliance</h4>
          <p style={moduleTextStyle}>GSTR-1, GSTR-3B, ITC Ledger, E-Way Bills, Automated Tax Computation</p>
        </div>
      </div>
    </div>
  );
}

const moduleCardStyle = { backgroundColor: '#ffffff', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' };
const moduleHeaderStyle = { margin: '0 0 8px 0', color: '#1e293b', fontSize: '14px' };
const moduleTextStyle = { margin: 0, fontSize: '11px', color: '#64748b', lineHeight: '1.4' };
