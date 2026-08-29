// frontend/src/components/FinancialReportsView.jsx

import React, { useState, useEffect } from 'react';
import { calculateFinancialReports } from '../utils/financialReportEngine';
import { downloadElementAsPDF } from '../utils/pdfDownloadEngine';

export default function FinancialReportsView({ firm }) {
  const [activeTab, setActiveTab] = useState('PNL');
  const [reportData, setReportData] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const loadReports = () => {
    const data = calculateFinancialReports();
    setReportData(data);
  };

  useEffect(() => {
    loadReports();
    window.addEventListener('ACCOUNT_BOOK_VOUCHER_POSTED', loadReports);
    window.addEventListener('storage', loadReports);
    return () => {
      window.removeEventListener('ACCOUNT_BOOK_VOUCHER_POSTED', loadReports);
      window.removeEventListener('storage', loadReports);
    };
  }, []);

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    await downloadElementAsPDF('printable-financial-report', `${firm?.legal_name || 'Business'}_Financial_Report`);
    setIsExporting(false);
  };

  if (!reportData) return <div style={{ padding: '20px', textAlign: 'center' }}>⏳ Loading Financial Reports...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Selector Controls */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setActiveTab('PNL')}
            style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: activeTab === 'PNL' ? '#2563eb' : '#e2e8f0', color: activeTab === 'PNL' ? '#fff' : '#0f172a', fontWeight: 'bold', cursor: 'pointer' }}
          >
            📊 Profit & Loss Statement
          </button>
          <button 
            onClick={() => setActiveTab('BS')}
            style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: activeTab === 'BS' ? '#2563eb' : '#e2e8f0', color: activeTab === 'BS' ? '#fff' : '#0f172a', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ⚖️ Balance Sheet
          </button>
        </div>

        <button 
          onClick={handleDownloadPDF}
          disabled={isExporting}
          style={{ backgroundColor: isExporting ? '#94a3b8' : '#10b981', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: isExporting ? 'wait' : 'pointer' }}
        >
          {isExporting ? '⏳ Generating PDF...' : '📲 Share & Download Report PDF'}
        </button>
      </div>

      {/* Printable Financial Statement */}
      <div id="printable-financial-report" style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
        <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '14px', textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#0f172a' }}>{firm?.legal_name || 'My Business Firm'}</div>
          <div style={{ fontSize: '11px', color: '#475569' }}>GSTIN: {firm?.gstin || 'Unregistered'}</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '6px', color: '#2563eb' }}>
            {activeTab === 'PNL' ? 'PROFIT & LOSS STATEMENT' : 'BALANCE SHEET STATEMENT'}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>As of {new Date().toLocaleDateString('en-IN')}</div>
        </div>

        {activeTab === 'PNL' ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <h4 style={{ color: '#16a34a', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px' }}>Income (Revenue)</h4>
                {reportData.pnl.incomeHeads.length === 0 ? <p style={emptyStyle}>No Income Entries</p> : reportData.pnl.incomeHeads.map(item => (
                  <div key={item.id} style={rowStyle}><span>{item.name}</span><span>₹{item.balance.toFixed(2)}</span></div>
                ))}
                <div style={totalRowStyle}><span>Total Income</span><span>₹{reportData.pnl.totalIncome.toFixed(2)}</span></div>
              </div>

              <div>
                <h4 style={{ color: '#dc2626', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px' }}>Expenses</h4>
                {reportData.pnl.expenseHeads.length === 0 ? <p style={emptyStyle}>No Expense Entries</p> : reportData.pnl.expenseHeads.map(item => (
                  <div key={item.id} style={rowStyle}><span>{item.name}</span><span>₹{item.balance.toFixed(2)}</span></div>
                ))}
                <div style={totalRowStyle}><span>Total Expenses</span><span>₹{reportData.pnl.totalExpenses.toFixed(2)}</span></div>
              </div>
            </div>

            <div style={{ marginTop: '20px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: reportData.pnl.netProfitOrLoss >= 0 ? '#16a34a' : '#dc2626' }}>
                {reportData.pnl.netProfitOrLoss >= 0 ? 'Net Profit: ' : 'Net Loss: '} ₹{Math.abs(reportData.pnl.netProfitOrLoss).toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <h4 style={{ color: '#2563eb', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px' }}>Assets</h4>
                {reportData.balanceSheet.assetHeads.length === 0 ? <p style={emptyStyle}>No Asset Heads</p> : reportData.balanceSheet.assetHeads.map(item => (
                  <div key={item.id} style={rowStyle}><span>{item.name}</span><span>₹{item.balance.toFixed(2)}</span></div>
                ))}
                <div style={totalRowStyle}><span>Total Assets</span><span>₹{reportData.balanceSheet.totalAssets.toFixed(2)}</span></div>
              </div>

              <div>
                <h4 style={{ color: '#d97706', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px' }}>Liabilities & Capital</h4>
                {reportData.balanceSheet.liabilityHeads.map(item => (
                  <div key={item.id} style={rowStyle}><span>{item.name}</span><span>₹{item.balance.toFixed(2)}</span></div>
                ))}
                {reportData.balanceSheet.equityHeads.map(item => (
                  <div key={item.id} style={rowStyle}><span>{item.name}</span><span>₹{item.balance.toFixed(2)}</span></div>
                ))}
                <div style={rowStyle}>
                  <span>Retained Earnings (Net Profit)</span>
                  <span>₹{reportData.balanceSheet.netProfitOrLoss.toFixed(2)}</span>
                </div>
                <div style={totalRowStyle}>
                  <span>Total Liabilities & Equity</span>
                  <span>₹{reportData.balanceSheet.totalLiabilitiesAndEquity.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', padding: '10px', borderRadius: '6px', textAlign: 'center', backgroundColor: reportData.balanceSheet.isBalanced ? '#dcfce7' : '#fee2e2', color: reportData.balanceSheet.isBalanced ? '#166534' : '#991b1b', fontWeight: 'bold', fontSize: '12px' }}>
              {reportData.balanceSheet.isBalanced ? '✓ Balance Sheet Matched (Assets = Liabilities + Equity)' : '⚠️ Balance Sheet Mismatch Alert'}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const emptyStyle = { fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' };
const rowStyle = { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #e2e8f0', fontSize: '11px' };
const totalRowStyle = { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid #0f172a', fontWeight: 'bold', fontSize: '12px', marginTop: '10px' };
