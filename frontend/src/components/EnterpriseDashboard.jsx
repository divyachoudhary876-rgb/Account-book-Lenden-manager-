// frontend/src/components/EnterpriseDashboard.jsx

import React, { useState, useEffect } from 'react';
import { getDynamicDashboardMetrics } from '../utils/dashboardDataEngine.js';

export default function EnterpriseDashboard({ firm, onNavigate }) {
  const [metrics, setMetrics] = useState(null);

  const loadData = () => {
    const data = getDynamicDashboardMetrics(firm);
    setMetrics(data);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_state_updated', loadData);
    window.addEventListener('stock_updated', loadData);
    return () => {
      window.removeEventListener('app_state_updated', loadData);
      window.removeEventListener('stock_updated', loadData);
    };
  }, [firm]);

  if (!metrics) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading Dashboard...</div>;

  const { receivables, payables, cashAndBank, categorySpecifics } = metrics;
  const legalName = firm?.legal_name || firm?.name || 'Enterprise Profile';
  const categoryLabel = firm?.category || firm?.business_category || 'TRADING';
  const gstin = firm?.gstin || 'Unregistered / Regular';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '24px' }}>
      
      {/* 1. Executive Firm Badge */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 10px 20px -5px rgba(15, 23, 42, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🏢</span>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '0.3px' }}>{legalName}</h2>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            GSTIN: <span style={{ color: '#e2e8f0', fontWeight: '600' }}>{gstin}</span> • Category: <span style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{categoryLabel}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Financial Health</span>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: cashAndBank >= 0 ? '#10b981' : '#f43f5e' }}>
            {cashAndBank >= 0 ? '● Positive Solvency' : '● Overdrawn / Credit'}
          </div>
        </div>
      </div>

      {/* 2. Core Financial Liquidity HUD */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        <div style={kpiCardStyle('#10b981')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={kpiTitleStyle}>RECEIVABLES (देनदार)</span>
            <span style={{ fontSize: '18px' }}>📥</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#059669', marginTop: '6px' }}>
            ₹{receivables.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: '10px', color: '#64748b' }}>Total pending from customers</span>
        </div>

        <div style={kpiCardStyle('#ef4444')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={kpiTitleStyle}>PAYABLES (लेनदार)</span>
            <span style={{ fontSize: '18px' }}>📤</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#dc2626', marginTop: '6px' }}>
            ₹{payables.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: '10px', color: '#64748b' }}>Total payable to suppliers/pumps</span>
        </div>

        <div style={kpiCardStyle('#0284c7')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={kpiTitleStyle}>CASH & BANK BALANCE</span>
            <span style={{ fontSize: '18px' }}>🏛️</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0284c7', marginTop: '6px' }}>
            ₹{cashAndBank.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: '10px', color: '#64748b' }}>Instant liquid operational funds</span>
        </div>
      </div>

      {/* 3. Category-Specific Operational Inventory Cards */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚡</span> {categoryLabel} Operational Insights
          </span>
          <button onClick={() => onNavigate && onNavigate('inventory')} style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
            Manage Stock ➔
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {categorySpecifics.cards.map((card, idx) => (
            <div key={idx} style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: `4px solid ${card.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>{card.label}</span>
                <span style={{ fontSize: '16px' }}>{card.icon}</span>
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Adaptive Quick Action Grid */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '12px' }}>
          ⚡ Quick Accounting Actions
        </span>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
          {categorySpecifics.actions.map((act, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate && onNavigate(act.key)}
              style={{ backgroundColor: act.bg, color: '#ffffff', border: 'none', borderRadius: '10px', padding: '14px 10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 10px -2px rgba(0,0,0,0.12)' }}
            >
              <span style={{ fontSize: '16px' }}>{act.icon}</span>
              <span>{act.label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

const kpiCardStyle = (borderColor) => ({
  backgroundColor: '#ffffff',
  borderRadius: '14px',
  padding: '14px 16px',
  border: '1px solid #e2e8f0',
  borderLeft: `5px solid ${borderColor}`,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between'
});

const kpiTitleStyle = {
  fontSize: '11px',
  fontWeight: '800',
  color: '#64748b',
  letterSpacing: '0.5px'
};
