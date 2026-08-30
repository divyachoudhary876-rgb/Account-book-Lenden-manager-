// frontend/src/components/FinancialReportsView.jsx

import React, { useState, useEffect } from 'react';
import { calculateFinancialReports } from '../utils/financialReportEngine.js';

export default function FinancialReportsView({ firm }) {
  const activeFirmId = firm?.id;
  const [activeTab, setActiveTab] = useState('pl'); // 'pl' or 'bs'
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    loadReports();
    const handleStorage = () => loadReports();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [firm]);

  const loadReports = () => {
    const data = calculateFinancialReports(activeFirmId);
    setReportData(data);
  };

  if (!reportData) return null;

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      
      {/* Report Switcher Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <button
          onClick={() => setActiveTab('pl')}
          style={{ backgroundColor: activeTab === 'pl' ? '#2563eb' : '#f1f5f9', color: activeTab === 'pl' ? '#ffffff' : '#475569', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
        >
          📊 Profit & Loss Statement
        </button>
        <button
          onClick={() => setActiveTab('bs')}
          style={{ backgroundColor: activeTab === 'bs' ? '#2563eb' : '#f1f5f9', color: activeTab === 'bs' ? '#ffffff' : '#475569', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
        >
          ⚖️ Balance Sheet
        </button>
      </div>

      {activeTab === 'pl' ? (
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', textAlign: 'center', color: '#0f172a' }}>PROFIT & LOSS STATEMENT</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <h5 style={{ color: '#059669', borderBottom: '2px solid #059669', paddingBottom: '4px' }}>Income (Revenue)</h5>
              {reportData.incomeItems.length === 0 ? <p style={{ fontSize: '11px', color: '#94a3b8' }}>No Income Entries</p> : (
                reportData.incomeItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                    <span>{item.name}</span>
                    <strong>₹{item.amount.toFixed(2)}</strong>
                  </div>
                ))
              )}
              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '8px', paddingTop: '4px', fontWeight: 'bold', fontSize: '13px' }}>
                Total Income: ₹{reportData.totalIncome.toFixed(2)}
              </div>
            </div>

            <div>
              <h5 style={{ color: '#dc2626', borderBottom: '2px solid #dc2626', paddingBottom: '4px' }}>Expenses</h5>
              {reportData.expenseItems.length === 0 ? <p style={{ fontSize: '11px', color: '#94a3b8' }}>No Expense Entries</p> : (
                reportData.expenseItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                    <span>{item.name}</span>
                    <strong>₹{item.amount.toFixed(2)}</strong>
                  </div>
                ))
              )}
              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '8px', paddingTop: '4px', fontWeight: 'bold', fontSize: '13px' }}>
                Total Expenses: ₹{reportData.totalExpenses.toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: reportData.netProfit >= 0 ? '#ecfdf5' : '#fef2f2', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px', textAlign: 'center', marginTop: '16px', fontWeight: 'bold', fontSize: '14px', color: reportData.netProfit >= 0 ? '#047857' : '#b91c1c' }}>
            Net Profit / Loss: ₹{reportData.netProfit.toFixed(2)}
          </div>
        </div>
      ) : (
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', textAlign: 'center', color: '#0f172a' }}>BALANCE SHEET STATEMENT</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <h5 style={{ color: '#2563eb', borderBottom: '2px solid #2563eb', paddingBottom: '4px' }}>Assets</h5>
              {reportData.assetItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                  <span>{item.name}</span>
                  <strong>₹{item.amount.toFixed(2)}</strong>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '8px', paddingTop: '4px', fontWeight: 'bold', fontSize: '13px' }}>
                Total Assets: ₹{reportData.totalAssets.toFixed(2)}
              </div>
            </div>

            <div>
              <h5 style={{ color: '#d97706', borderBottom: '2px solid #d97706', paddingBottom: '4px' }}>Liabilities & Equity</h5>
              {reportData.liabilityItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                  <span>{item.name}</span>
                  <strong>₹{item.amount.toFixed(2)}</strong>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '8px', paddingTop: '4px', fontWeight: 'bold', fontSize: '13px' }}>
                Total Liabilities: ₹{reportData.totalLiabilities.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
