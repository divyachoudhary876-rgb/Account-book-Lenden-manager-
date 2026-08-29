// frontend/src/components/FinancialReportsView.jsx

import React, { useState } from 'react';
import { downloadElementAsPDF } from '../utils/pdfDownloadEngine';

export default function FinancialReportsView({ firm }) {
  const [reportType, setReportType] = useState('PL'); // 'PL' or 'BS'
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    const reportName = reportType === 'PL' ? 'Profit_and_Loss_Statement' : 'Balance_Sheet';
    await downloadElementAsPDF('printable-financial-report', `${firm?.legal_name || 'Business'}_${reportName}`);
    setIsDownloading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Report Controls Bar */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>📈 Financial Reports Engine</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          <button 
            onClick={() => setReportType('PL')}
            style={{ padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', backgroundColor: reportType === 'PL' ? '#2563eb' : '#e2e8f0', color: reportType === 'PL' ? '#fff' : '#334155' }}
          >
            📊 Profit & Loss Account
          </button>
          <button 
            onClick={() => setReportType('BS')}
            style={{ padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', backgroundColor: reportType === 'BS' ? '#2563eb' : '#e2e8f0', color: reportType === 'BS' ? '#fff' : '#334155' }}
          >
            ⚖️ Balance Sheet Position
          </button>
        </div>

        {/* Download Action Button */}
        <button 
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          style={{ width: '100%', backgroundColor: isDownloading ? '#94a3b8' : '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: isDownloading ? 'wait' : 'pointer' }}
        >
          {isDownloading ? '⏳ Generating Financial Report PDF...' : '📲 Download & Share Report PDF (WhatsApp / Local Save)'}
        </button>
      </div>

      {/* Printable Financial Sheet View */}
      <div id="printable-financial-report" style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
        <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '14px', textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#0f172a' }}>{firm?.legal_name || 'My Business Firm'}</div>
          <div style={{ fontSize: '11px', color: '#475569' }}>GSTIN: {firm?.gstin || 'Unregistered'}</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '6px', color: '#2563eb' }}>
            {reportType === 'PL' ? 'STATEMENT OF PROFIT & LOSS ACCOUNT' : 'BALANCE SHEET STATEMENT'}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>As on {new Date().toLocaleDateString('en-IN')}</div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ border: '1px solid #0f172a', padding: '8px', textAlign: 'left' }}>Particular Head</th>
              <th style={{ border: '1px solid #0f172a', padding: '8px', textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {reportType === 'PL' ? (
              <>
                <tr><td style={{ padding: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Revenue From Operations (Sales)</td><td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>₹0.00</td></tr>
                <tr><td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>Less: Cost of Goods Sold & Expenses</td><td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>₹0.00</td></tr>
                <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}><td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Net Profit / (Loss)</td><td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#16a34a' }}>₹0.00</td></tr>
              </>
            ) : (
              <>
                <tr><td style={{ padding: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Total Capital & Liabilities</td><td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>₹0.00</td></tr>
                <tr><td style={{ padding: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Total Fixed & Current Assets</td><td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>₹0.00</td></tr>
                <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}><td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Balance Sheet Matching Difference</td><td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#2563eb' }}>₹0.00 (Balanced)</td></tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
