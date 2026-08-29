// frontend/src/components/EnterpriseDashboard.jsx

import React from 'react';

export default function EnterpriseDashboard({ firm, onNavigate }) {

  // Dynamic Card Click Handler Function
  const handleCardClick = (targetTab) => {
    if (onNavigate) {
      onNavigate(targetTab);
    }
  };

  const metrics = [
    { id: 'billing', title: 'Total Sales (This Month)', amount: '₹ 12,45,600', trend: '↑ 18.6% vs Apr', color: '#10b981', bg: '#ecfdf5', icon: '🧾' },
    { id: 'voucher', title: 'Total Purchases (This Month)', amount: '₹ 8,76,300', trend: '↑ 12.4% vs Apr', color: '#f59e0b', bg: '#fffbeb', icon: '🛒' },
    { id: 'settlement', title: 'Total Receivables', amount: '₹ 9,65,250', trend: 'Outstanding Dues', color: '#2563eb', bg: '#eff6ff', icon: '💳' },
    { id: 'statement', title: 'Total Payables', amount: '₹ 6,25,780', trend: 'Supplier Bills', color: '#7c3aed', bg: '#f5f3ff', icon: '📖' },
    { id: 'statement', title: 'Cash & Bank Balance', amount: '₹ 15,62,450', trend: 'Across all accounts', color: '#059669', bg: '#ecfdf5', icon: '🏦' }
  ];

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '16px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '14px 20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>📊 Executive Dashboard</h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '13px', color: '#475569' }}>
          <span>📅 {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <span style={{ backgroundColor: '#e2e8f0', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold' }}>👤 Admin ▼</span>
        </div>
      </div>

      {/* 5 Key Metric Cards (CLICKABLE) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {metrics.map((m) => (
          <div 
            key={m.id + m.title} 
            onClick={() => handleCardClick(m.id)}
            style={{ 
              backgroundColor: '#ffffff', 
              padding: '16px', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
              borderLeft: `4px solid ${m.color}`,
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
            className="dashboard-card-hover"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>{m.title}</span>
              <span style={{ fontSize: '18px' }}>{m.icon}</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: '8px 0' }}>{m.amount}</div>
            <div style={{ fontSize: '10px', color: m.color, fontWeight: 'bold' }}>{m.trend} (Click to View)</div>
          </div>
        ))}
      </div>

      {/* Main Overview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
        
        {/* Business Overview Line Chart */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>Business Overview (Sales vs Purchases Trend)</h4>
          <div style={{ height: '180px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px' }}>
            📈 Sales vs Purchase Real-Time Trend Analysis
          </div>
        </div>

        {/* Top Outstanding Receivables List */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>Top Outstanding Receivables</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
            <div 
              onClick={() => handleCardClick('settlement')} 
              style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', cursor: 'pointer' }}
            >
              <span style={{ color: '#2563eb', fontWeight: '500' }}>1. Krishan Padgad</span>
              <strong style={{ color: '#0f172a' }}>₹ 2,45,600</strong>
            </div>
            <div 
              onClick={() => handleCardClick('settlement')} 
              style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', cursor: 'pointer' }}
            >
              <span style={{ color: '#2563eb', fontWeight: '500' }}>2. Shyam Steel Traders</span>
              <strong style={{ color: '#0f172a' }}>₹ 1,75,300</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Modules Grid View (CLICKABLE CARDS) */}
      <h3 style={{ margin: '0 0 14px 0', color: '#0f172a', fontSize: '16px' }}>⚙️ Accounting & Business Modules</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        
        <div onClick={() => handleCardClick('billing')} style={moduleCardStyle}>
          <h4 style={moduleHeaderStyle}>🧾 Sales & Invoicing ➔</h4>
          <p style={moduleTextStyle}>Sales Invoice, Credit/Debit Notes, Delivery Challan, Quotations</p>
        </div>

        <div onClick={() => handleCardClick('statement')} style={moduleCardStyle}>
          <h4 style={moduleHeaderStyle}>📖 Account Statement & Milan ➔</h4>
          <p style={moduleTextStyle}>Party Ledger Statements, Opening & Closing Balances, PDF Exports</p>
        </div>

        <div onClick={() => handleCardClick('voucher')} style={moduleCardStyle}>
          <h4 style={moduleHeaderStyle}>📒 Double-Entry Voucher ➔</h4>
          <p style={moduleTextStyle}>Journal (JV), Payment (PV), Receipt (RV) & Contra (CV) Entries</p>
        </div>

        <div onClick={() => handleCardClick('reports')} style={moduleCardStyle}>
          <h4 style={moduleHeaderStyle}>📈 Financial Reports & GST ➔</h4>
          <p style={moduleTextStyle}>Profit & Loss Statement, Balance Sheet Position, GSTR Compliance</p>
        </div>

      </div>

      <style>{`
        .dashboard-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        }
      `}</style>
    </div>
  );
}

const moduleCardStyle = { 
  backgroundColor: '#ffffff', 
  padding: '16px', 
  borderRadius: '10px', 
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
  border: '1px solid #e2e8f0', 
  cursor: 'pointer',
  transition: 'border-color 0.2s ease'
};
const moduleHeaderStyle = { margin: '0 0 8px 0', color: '#2563eb', fontSize: '14px' };
const moduleTextStyle = { margin: 0, fontSize: '11px', color: '#64748b', lineHeight: '1.4' };
