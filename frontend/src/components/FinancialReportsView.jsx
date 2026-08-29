// frontend/src/components/FinancialReportsView.jsx

import React, { useState, useEffect } from 'react';

export default function FinancialReportsView() {
  const [reportType, setReportType] = useState('BALANCE_SHEET'); // Default Balance Sheet
  const [fromDate, setFromDate] = useState('2026-08-01');
  const [toDate, setToDate] = useState('2026-08-29');

  const [reportData, setReportData] = useState({
    assets: [],
    liabilities: [],
    equity: [],
    income: [],
    expenses: []
  });

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = () => {
    try {
      const savedAccounts = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
      
      const assets = savedAccounts.filter(a => a.primary_type === 'ASSET');
      const liabilities = savedAccounts.filter(a => a.primary_type === 'LIABILITY');
      const equity = savedAccounts.filter(a => a.primary_type === 'EQUITY');
      const income = savedAccounts.filter(a => a.primary_type === 'INCOME');
      const expenses = savedAccounts.filter(a => a.primary_type === 'EXPENSE');

      setReportData({ assets, liabilities, equity, income, expenses });
    } catch (e) {
      console.error('Error loading report data:', e);
    }
  };

  const totalAssets = reportData.assets.reduce((sum, a) => sum + (parseFloat(a.opening_balance) || 0), 0);
  const totalLiabilities = reportData.liabilities.reduce((sum, l) => sum + (parseFloat(l.opening_balance) || 0), 0);
  const totalEquity = reportData.equity.reduce((sum, e) => sum + (parseFloat(e.opening_balance) || 0), 0);

  return (
    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', maxWidth: '800px', margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>📊 Financial Statements & Reports</h3>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button 
          onClick={() => setReportType('PNL')} 
          style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: reportType === 'PNL' ? '#2563eb' : '#e2e8f0', color: reportType === 'PNL' ? '#fff' : '#334155' }}
        >
          📈 Profit & Loss Statement
        </button>
        <button 
          onClick={() => setReportType('BALANCE_SHEET')} 
          style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: reportType === 'BALANCE_SHEET' ? '#2563eb' : '#e2e8f0', color: reportType === 'BALANCE_SHEET' ? '#fff' : '#334155' }}
        >
          ⚖️ Balance Sheet
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>From Date</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>To Date</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* BALANCE SHEET VIEW */}
      {reportType === 'BALANCE_SHEET' && (
        <div style={{ marginTop: '12px' }}>
          <h4 style={{ color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>Balance Sheet Position</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Liabilities & Equity Column */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
              <h5 style={{ margin: '0 0 8px 0', color: '#dc2626' }}>Liabilities & Equity</h5>
              {reportData.liabilities.length === 0 && reportData.equity.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>No Liability/Equity Accounts created.</div>
              ) : (
                [...reportData.liabilities, ...reportData.equity].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>{item.name}</span>
                    <span>₹{parseFloat(item.opening_balance || 0).toFixed(2)}</span>
                  </div>
                ))
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', marginTop: '12px', color: '#0f172a' }}>
                <span>Total Liabilities:</span>
                <span>₹{(totalLiabilities + totalEquity).toFixed(2)}</span>
              </div>
            </div>

            {/* Assets Column */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
              <h5 style={{ margin: '0 0 8px 0', color: '#16a34a' }}>Assets</h5>
              {reportData.assets.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>No Asset Accounts created.</div>
              ) : (
                reportData.assets.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>{item.name}</span>
                    <span>₹{parseFloat(item.opening_balance || 0).toFixed(2)}</span>
                  </div>
                ))
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', marginTop: '12px', color: '#0f172a' }}>
                <span>Total Assets:</span>
                <span>₹{totalAssets.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
