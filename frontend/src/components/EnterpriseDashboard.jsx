// frontend/src/components/EnterpriseDashboard.jsx

import React, { useState, useEffect } from 'react';

export default function EnterpriseDashboard({ firm, onNavigate }) {
  const [metrics, setMetrics] = useState({
    totalReceivables: 0,
    totalPayables: 0,
    cashBankBalance: 0,
    topReceivables: []
  });

  const calculateLiveDashboard = () => {
    const accounts = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
    let receivables = 0;
    let payables = 0;
    let cashBank = 0;
    const debtorList = [];

    accounts.forEach(acc => {
      const bal = parseFloat(acc.current_balance || acc.opening_balance || 0);
      if (acc.sub_group === 'SUNDRY_DEBTORS') {
        receivables += bal;
        if (bal > 0) debtorList.push({ name: acc.name, balance: bal });
      }
      if (acc.sub_group === 'SUNDRY_CREDITORS') payables += bal;
      if (['BANK_ACCOUNTS', 'CASH_IN_HAND'].includes(acc.sub_group)) cashBank += bal;
    });

    setMetrics({
      totalReceivables: receivables,
      totalPayables: payables,
      cashBankBalance: cashBank,
      topReceivables: debtorList.sort((a, b) => b.balance - a.balance).slice(0, 5)
    });
  };

  useEffect(() => {
    calculateLiveDashboard();
    window.addEventListener('ACCOUNT_BOOK_VOUCHER_POSTED', calculateLiveDashboard);
    window.addEventListener('storage', calculateLiveDashboard);
    return () => {
      window.removeEventListener('ACCOUNT_BOOK_VOUCHER_POSTED', calculateLiveDashboard);
      window.removeEventListener('storage', calculateLiveDashboard);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Real Live Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <div style={cardStyle('#2563eb')}>
          <div style={labelStyle}>Total Receivables (Debtors)</div>
          <div style={valueStyle}>₹{metrics.totalReceivables.toFixed(2)}</div>
          <small style={{ fontSize: '10px', color: '#64748b' }}>Outstanding Customer Dues</small>
        </div>

        <div style={cardStyle('#dc2626')}>
          <div style={labelStyle}>Total Payables (Creditors)</div>
          <div style={valueStyle}>₹{metrics.totalPayables.toFixed(2)}</div>
          <small style={{ fontSize: '10px', color: '#64748b' }}>Supplier Dues</small>
        </div>

        <div style={cardStyle('#16a34a')}>
          <div style={labelStyle}>Cash & Bank Balance</div>
          <div style={valueStyle}>₹{metrics.cashBankBalance.toFixed(2)}</div>
          <small style={{ fontSize: '10px', color: '#64748b' }}>Liquid Liquidity</small>
        </div>
      </div>

      {/* Top Receivables Customer Dues */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>📋 Top Outstanding Customer Receivables</h4>
        {metrics.topReceivables.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>Koi pending customer dues nahi hain. Pure balance cleared hain.</p>
        ) : (
          metrics.topReceivables.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>
              <span>{idx + 1}. <strong>{item.name}</strong></span>
              <span style={{ fontWeight: 'bold', color: '#2563eb' }}>₹{item.balance.toFixed(2)}</span>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

const cardStyle = (borderColor) => ({
  backgroundColor: '#ffffff',
  padding: '16px',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  borderLeft: `5px solid ${borderColor}`
});
const labelStyle = { fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const valueStyle = { fontSize: '18px', fontWeight: 'bold', color: '#0f172a' };
