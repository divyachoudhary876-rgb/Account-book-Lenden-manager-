// frontend/src/components/AccountingDashboard.jsx

import React, { useState, useEffect } from 'react';
import { getDynamicDashboardMetrics } from '../utils/dashboardDataEngine.js';

export default function AccountingDashboard({ firm, onNavigate }) {
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

  if (!metrics) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading Accounting Dashboard...</div>;

  const { receivables, payables, cashAndBank, categorySpecifics } = metrics;
  const legalName = firm?.legal_name || firm?.name || 'Enterprise Profile';
  const categoryLabel = firm?.category || firm?.business_category || 'TRADING';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* Top Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', borderRadius: '16px', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🏢</span>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>{legalName}</h2>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            Category: <span style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{categoryLabel}</span>
          </div>
        </div>
      </div>

      {/* Financial KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '5px solid #10b981' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>RECEIVABLES (देनदार)</span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#059669', marginTop: '4px' }}>
            ₹{receivables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '5px solid #ef4444' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>PAYABLES (लेनदार)</span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#dc2626', marginTop: '4px' }}>
            ₹{payables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '5px solid #0284c7' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>CASH & BANK BALANCE</span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0284c7', marginTop: '4px' }}>
            ₹{cashAndBank.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Category Specific Cards */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>
          ⚡ {categoryLabel} Operational Insights
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
          {categorySpecifics.cards.map((card, idx) => (
            <div key={idx} style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: `4px solid ${card.color}` }}>
              <span style={{ fontSize: '11px', color: '#475569', fontWeight: 'bold' }}>{card.label}</span>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>{card.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>
          ⚡ Quick Accounting Actions
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
          {categorySpecifics.actions.map((act, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate && onNavigate(act.key)}
              style={{ backgroundColor: act.bg, color: '#ffffff', border: 'none', borderRadius: '8px', padding: '12px 10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <span>{act.icon}</span>
              <span>{act.label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
