// frontend/src/components/FinancialReportsView.jsx

import React, { useState, useEffect } from 'react';
import { generateFinancialStatements } from '../utils/financialReportEngine.js';

export default function FinancialReportsView({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [reports, setReports] = useState(null);

  const loadReports = () => {
    const data = generateFinancialStatements(activeFirmId);
    setReports(data);
  };

  useEffect(() => {
    loadReports();
    window.addEventListener('app_state_updated', loadReports);
    return () => window.removeEventListener('app_state_updated', loadReports);
  }, [firm, activeFirmId]);

  if (!reports) return <div>Loading Financial Statements...</div>;

  const { tradingAndPL, balanceSheet } = reports;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '17px', borderBottom: '2px solid #3b82f6', paddingBottom: '6px' }}>
          📈 Trading & Profit / Loss Statement
        </h3>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
          <span>Sales Revenue (+)</span>
          <strong style={{ color: '#059669' }}>₹{tradingAndPL.salesRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
          <span>Closing Stock (+)</span>
          <strong style={{ color: '#0284c7' }}>₹{tradingAndPL.closingStock.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
          <span>Purchases Inward (-)</span>
          <strong style={{ color: '#dc2626' }}>₹{tradingAndPL.purchasesCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
          <span>Direct Expenses & Fuel (-)</span>
          <strong style={{ color: '#dc2626' }}>₹{tradingAndPL.directExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0 0', marginTop: '10px', borderTop: '2px dashed #cbd5e1', fontSize: '15px' }}>
          <strong>Net Profit / (Loss)</strong>
          <strong style={{ color: tradingAndPL.netProfit >= 0 ? '#059669' : '#dc2626' }}>₹{tradingAndPL.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>

      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '17px', borderBottom: '2px solid #10b981', paddingBottom: '6px' }}>
          🏛️ Balance Sheet (Assets & Liabilities)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e3a8a' }}>CURRENT ASSETS</span>
            <div style={{ fontSize: '11px', marginTop: '6px' }}>
              <div>Debtors: ₹{balanceSheet.assets.sundryDebtors.toFixed(2)}</div>
              <div>Cash/Bank: ₹{balanceSheet.assets.cashAndBank.toFixed(2)}</div>
              <div>Stock: ₹{balanceSheet.assets.closingStock.toFixed(2)}</div>
            </div>
            <div style={{ marginTop: '8px', fontWeight: 'bold', fontSize: '12px', color: '#0f172a', borderTop: '1px solid #cbd5e1', paddingTop: '4px' }}>
              Total: ₹{balanceSheet.assets.totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#b91c1c' }}>LIABILITIES & EQUITY</span>
            <div style={{ fontSize: '11px', marginTop: '6px' }}>
              <div>Creditors: ₹{balanceSheet.liabilities.sundryCreditors.toFixed(2)}</div>
              <div>Capital / Net: ₹{balanceSheet.liabilities.capitalAccount.toFixed(2)}</div>
            </div>
            <div style={{ marginTop: '8px', fontWeight: 'bold', fontSize: '12px', color: '#0f172a', borderTop: '1px solid #cbd5e1', paddingTop: '4px' }}>
              Total: ₹{balanceSheet.liabilities.totalLiabilitiesAndEquity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
