// frontend/src/components/AccountingDashboard.jsx

import React, { useState, useEffect } from 'react';
import { getDynamicDashboardMetrics } from '../utils/dashboardDataEngine.js';

export default function AccountingDashboard({ firm, onNavigate }) {
  const [metrics, setMetrics] = useState(null);
  const activeFirmId = firm?.id || firm?.firm_id || 'FIRM-001';

  const loadData = () => {
    try {
      const data = getDynamicDashboardMetrics(firm);
      setMetrics(data || {});
    } catch (err) {
      console.error("Error loading dashboard metrics:", err);
      setMetrics({
        receivables: 0,
        payables: 0,
        cashAndBank: 0,
        categorySpecifics: { cards: [], actions: [] }
      });
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_state_updated', loadData);
    window.addEventListener('stock_updated', loadData);
    window.addEventListener('app_storage_updated', loadData);
    return () => {
      window.removeEventListener('app_state_updated', loadData);
      window.removeEventListener('stock_updated', loadData);
      window.removeEventListener('app_storage_updated', loadData);
    };
  }, [firm, activeFirmId]);

  if (!metrics) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>
        Loading Accounting Dashboard & Financial KPIs...
      </div>
    );
  }

  const receivables = Number(metrics.receivables || 0);
  const payables = Number(metrics.payables || 0);
  const cashAndBank = Number(metrics.cashAndBank || 0);
  
  const legalName = firm?.legal_name || firm?.trade_name || firm?.name || 'Enterprise Profile';
  const categoryLabel = firm?.category || firm?.business_category || 'INDUSTRIAL / TRADING';
  
  const cards = metrics.categorySpecifics?.cards || [];
  const actions = metrics.categorySpecifics?.actions || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
      
      {/* Top Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', borderRadius: '16px', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🏢</span>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', letterSpacing: '-0.01em' }}>{legalName}</h2>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Category:</span>
            <span style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase' }}>
              {categoryLabel}
            </span>
            <span style={{ marginLeft: '8px', opacity: 0.7 }}>Firm ID: {activeFirmId}</span>
          </div>
        </div>
      </div>

      {/* Financial KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
        
        {/* Receivables Card */}
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', borderLeft: '5px solid #10b981', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', letterSpacing: '0.03em' }}>RECEIVABLES (देनदार)</span>
          <div style={{ fontSize: '20px', fontWeight: '900', color: '#059669', marginTop: '6px' }}>
            ₹{receivables.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Payables Card */}
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', borderLeft: '5px solid #ef4444', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', letterSpacing: '0.03em' }}>PAYABLES (लेनदार)</span>
          <div style={{ fontSize: '20px', fontWeight: '900', color: '#dc2626', marginTop: '6px' }}>
            ₹{payables.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Cash & Bank Card */}
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', borderLeft: '5px solid #0284c7', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', letterSpacing: '0.03em' }}>CASH & BANK BALANCE</span>
          <div style={{ fontSize: '20px', fontWeight: '900', color: '#0284c7', marginTop: '6px' }}>
            ₹{cashAndBank.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

      </div>

      {/* Category Specific Operational Insights */}
      {cards.length > 0 && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            ⚡ {categoryLabel} Operational Insights
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
            {cards.map((card, idx) => (
              <div key={idx} style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: `4px solid ${card.color || '#3b82f6'}` }}>
                <span style={{ fontSize: '10px', color: '#475569', fontWeight: 'bold', textTransform: 'uppercase' }}>{card.label}</span>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>{card.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Accounting Actions */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          ⚡ Quick Accounting Actions
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
          
          {/* Dedicated Cash Flow Statement Navigation Button */}
          <button
            onClick={() => onNavigate && onNavigate('CASH_FLOW')}
            style={{ 
              backgroundColor: '#0f172a', 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: '10px', 
              padding: '12px 10px', 
              fontSize: '12px', 
              fontWeight: '700', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              transition: 'transform 0.1s ease'
            }}
          >
            <span style={{ fontSize: '14px' }}>📈</span>
            <span>Cash Flow Statement</span>
          </button>

          {actions.map((act, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate && onNavigate(act.key)}
              style={{ 
                backgroundColor: act.bg || '#334155', 
                color: '#ffffff', 
                border: 'none', 
                borderRadius: '10px', 
                padding: '12px 10px', 
                fontSize: '12px', 
                fontWeight: '700', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                transition: 'transform 0.1s ease'
              }}
            >
              <span style={{ fontSize: '14px' }}>{act.icon}</span>
              <span>{act.label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
