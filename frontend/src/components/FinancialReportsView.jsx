// frontend/src/components/FinancialReportsView.jsx

import React, { useState, useEffect } from 'react';

export default function FinancialReportsView() {
  const [reportType, setReportType] = useState('BALANCE_SHEET');
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
  
  const totalIncome = reportData.income.reduce((sum, i) => sum + (parseFloat(i.opening_balance) || 0), 0);
  const totalExpense = reportData.expenses.reduce((sum, e) => sum + (parseFloat(e.opening_balance) || 0), 0);
  const netProfit = totalIncome - totalExpense;

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', maxWidth: '850px', margin: '0 auto' }}>
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

      <button 
        onClick={handleDownloadPDF} 
        style={{ width: '100%', backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginBottom: '16px' }}
      >
        🖨️ Download Financial Report (PDF)
      </button>

      {/* PROFIT & LOSS VIEW */}
      {reportType === 'PNL' && (
        <div style={{ marginTop: '12px' }}>
          <h4 style={{ color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>Profit & Loss Account</h4>
          
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
            <h5 style={{ margin: '0 0 8px 0', color: '#16a34a' }}>Operating Income / Revenue</h5>
            {reportData.income.length === 0 ? (
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>No Income Accounts created.</div>
            ) : (
              reportData.income.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span>{item.name}</span>
                  <span>₹{parseFloat(item.opening_balance || 0).toFixed(2)}</span>
                </div>
              ))
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', marginTop: '8px', color: '#16a34a' }}>
              <span>Total Revenue (A):</span>
              <span>₹{totalIncome.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
            <h5 style={{ margin: '0 0 8px 0', color: '#dc2626' }}>Operating Expenses</h5>
            {reportData.expenses.length === 0 ? (
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>No Expense Accounts created.</div>
            ) : (
              reportData.expenses.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span>{item.name}</span>
                  <span>₹{parseFloat(item.opening_balance || 0).toFixed(2)}</span>
                </div>
              ))
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', marginTop: '8px', color: '#dc2626' }}>
              <span>Total Operating Expenses (B):</span>
              <span>₹{totalExpense.toFixed(2)}</span>
            </div>
          </div>

          <div style={{
            marginTop: '16px',
            padding: '14px',
            borderRadius: '8px',
            backgroundColor: netProfit >= 0 ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${netProfit >= 0 ? '#10b981' : '#f87171'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: netProfit >= 0 ? '#065f46' : '#991b1b' }}>
              {netProfit >= 0 ? 'Net Operating Profit' : 'Net Operating Loss'}
            </span>
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: netProfit >= 0 ? '#047857' : '#b91c1c' }}>
              ₹{Math.abs(netProfit).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* BALANCE SHEET VIEW */}
      {reportType === 'BALANCE_SHEET' && (
        <div style={{ marginTop: '12px' }}>
          <h4 style={{ color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>Balance Sheet Position</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                <span>Total Liabilities & Equity:</span>
                <span>₹{(totalLiabilities + totalEquity).toFixed(2)}</span>
              </div>
            </div>

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
