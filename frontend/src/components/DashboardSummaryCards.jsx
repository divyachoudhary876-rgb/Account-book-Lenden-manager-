// frontend/src/components/DashboardSummaryCards.jsx

import React, { useState, useEffect } from 'react';
import { calculateDashboardKPIs } from '../utils/financialReportEngine.js';

export default function DashboardSummaryCards({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [kpis, setKpis] = useState({
    cashInHand: 0,
    bankBalance: 0,
    sundryDebtors: 0,
    sundryCreditors: 0
  });

  const syncBalances = () => {
    try {
      const metrics = calculateDashboardKPIs(activeFirmId);
      setKpis(metrics);
    } catch (e) {
      console.error('Failed to calculate dashboard KPIs:', e);
    }
  };

  useEffect(() => {
    syncBalances();
    window.addEventListener('app_state_updated', syncBalances);
    window.addEventListener('stock_updated', syncBalances);
    return () => {
      window.removeEventListener('app_state_updated', syncBalances);
      window.removeEventListener('stock_updated', syncBalances);
    };
  }, [activeFirmId]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', width: '100%', marginBottom: '14px', boxSizing: 'border-box' }}>
      
      {/* 1. Cash-in-Hand */}
      <div style={{ ...kpiCardStyle, borderLeft: '4px solid #059669' }}>
        <div style={kpiHeaderStyle}>
          <span>💵</span> Cash-in-Hand (गल्ला)
        </div>
        <div style={{ ...kpiAmountStyle, color: '#059669' }}>
          ₹{kpis.cashInHand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      </div>

      {/* 2. Bank Balance */}
      <div style={{ ...kpiCardStyle, borderLeft: '4px solid #0284c7' }}>
        <div style={kpiHeaderStyle}>
          <span>🏛️</span> Bank Balance (बैंक)
        </div>
        <div style={{ ...kpiAmountStyle, color: '#0284c7' }}>
          ₹{kpis.bankBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      </div>

      {/* 3. Market Receivables (Debtors) */}
      <div style={{ ...kpiCardStyle, borderLeft: '4px solid #f59e0b' }}>
        <div style={kpiHeaderStyle}>
          <span>📥</span> कुल लेना (Debtors)
        </div>
        <div style={{ ...kpiAmountStyle, color: '#b45309' }}>
          ₹{kpis.sundryDebtors.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      </div>

      {/* 4. Payables (Creditors) */}
      <div style={{ ...kpiCardStyle, borderLeft: '4px solid #ef4444' }}>
        <div style={kpiHeaderStyle}>
          <span>📤</span> कुल देना (Creditors)
        </div>
        <div style={{ ...kpiAmountStyle, color: '#b91c1c' }}>
          ₹{kpis.sundryCreditors.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      </div>

    </div>
  );
}

const kpiCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '12px 14px',
  border: '1px solid #cbd5e1',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
  boxSizing: 'border-box'
};

const kpiHeaderStyle = {
  fontSize: '11px',
  fontWeight: '700',
  color: '#64748b',
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  marginBottom: '4px'
};

const kpiAmountStyle = {
  fontSize: '16px',
  fontWeight: '900',
  letterSpacing: '-0.3px'
};
