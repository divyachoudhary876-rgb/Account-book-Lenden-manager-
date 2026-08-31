// frontend/src/components/FinancialReportsView.jsx

import React, { useState, useEffect } from 'react';

export default function FinancialReportsView({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const firmName = firm?.legal_name || 'NEELKANTH ENTERPRISES';
  const [reportType, setReportType] = useState('pl'); // 'pl' or 'bs'

  const [financials, setFinancials] = useState({
    salesIncome: 0,
    purchaseExpense: 0,
    netProfit: 0,
    totalAssets: 0,
    totalLiabilities: 0
  });

  useEffect(() => {
    calculateRealTimeFinancials();
    window.addEventListener('storage', calculateRealTimeFinancials);
    return () => window.removeEventListener('storage', calculateRealTimeFinancials);
  }, [firm]);

  const calculateRealTimeFinancials = () => {
    const salesInvoices = JSON.parse(localStorage.getItem(`app_sales_invoices_${activeFirmId}`) || '[]');
    const purchaseInvoices = JSON.parse(localStorage.getItem(`app_purchase_invoices_${activeFirmId}`) || '[]');

    const salesTotal = salesInvoices.reduce((sum, inv) => sum + parseFloat(inv.grand_total || 0), 0);
    const purchaseTotal = purchaseInvoices.reduce((sum, inv) => sum + parseFloat(inv.grand_total || 0), 0);
    const profit = salesTotal - purchaseTotal;

    setFinancials({
      salesIncome: salesTotal,
      purchaseExpense: purchaseTotal,
      netProfit: profit,
      totalAssets: salesTotal,
      totalLiabilities: purchaseTotal
    });
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `FINANCIAL REPORT: ${reportType === 'pl' ? 'Profit & Loss Statement' : 'Balance Sheet'}\n`;
    csvContent += `Firm: ${firmName}\n\n`;

    if (reportType === 'pl') {
      csvContent += `Particulars,Amount (Rs)\n`;
      csvContent += `Gross Sales Revenue,${financials.salesIncome.toFixed(2)}\n`;
      csvContent += `Cost of Goods Purchased,${financials.purchaseExpense.toFixed(2)}\n`;
      csvContent += `Net Operating Profit/Loss,${financials.netProfit.toFixed(2)}\n`;
    } else {
      csvContent += `Assets,Amount (Rs),Liabilities & Equity,Amount (Rs)\n`;
      csvContent += `Current Assets / Receivables,${financials.totalAssets.toFixed(2)},Current Liabilities / Payables,${financials.totalLiabilities.toFixed(2)}\n`;
      csvContent += `TOTAL ASSETS,${financials.totalAssets.toFixed(2)},TOTAL LIABILITIES,${financials.totalLiabilities.toFixed(2)}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportType.toUpperCase()}_Report_${firmName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      
      {/* Tab Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => setReportType('pl')} 
          style={tabButtonStyle(reportType === 'pl')}
        >
          📊 Profit & Loss Statement
        </button>
        <button 
          onClick={() => setReportType('bs')} 
          style={tabButtonStyle(reportType === 'bs')}
        >
          ⚖️ Balance Sheet
        </button>
      </div>

      {/* Report Header & Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>{firmName} (FY 2026-27)</div>
          <h3 style={{ margin: '2px 0 0 0', color: '#0f172a', fontSize: '16px' }}>
            {reportType === 'pl' ? 'PROFIT & LOSS STATEMENT' : 'BALANCE SHEET STATEMENT'}
          </h3>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleExportCSV} style={actionBtnStyle('#10b981')}>
            📊 Export Excel/CSV
          </button>
          <button onClick={handlePrintPDF} style={actionBtnStyle('#2563eb')}>
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>

      {/* P&L View */}
      {reportType === 'pl' && (
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Particulars</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px', color: '#059669', fontWeight: 'bold' }}>📈 Sales & Revenue Income</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>₹{financials.salesIncome.toFixed(2)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px', color: '#dc2626', fontWeight: 'bold' }}>🛍️ Cost of Goods & Purchases</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>₹{financials.purchaseExpense.toFixed(2)}</td>
              </tr>
              <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', fontSize: '14px' }}>
                <td style={{ padding: '12px' }}>Net Operating Profit / (Loss)</td>
                <td style={{ padding: '12px', textAlign: 'right', color: financials.netProfit >= 0 ? '#059669' : '#dc2626' }}>
                  ₹{financials.netProfit.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Balance Sheet View */}
      {reportType === 'bs' && (
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #cbd5e1', backgroundColor: '#0f172a', color: '#ffffff', fontWeight: 'bold', fontSize: '13px' }}>
            <div style={{ padding: '10px', borderRight: '1px solid #cbd5e1' }}>Assets</div>
            <div style={{ padding: '10px' }}>Liabilities & Equity</div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: '12px', minHeight: '120px' }}>
            <div style={{ padding: '12px', borderRight: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Current Assets / Receivables</span>
                <strong>₹{financials.totalAssets.toFixed(2)}</strong>
              </div>
            </div>

            <div style={{ padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Current Liabilities / Payables</span>
                <strong>₹{financials.totalLiabilities.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                <span>Retained Earnings (Capital)</span>
                <strong>₹{financials.netProfit.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '2px solid #0f172a', backgroundColor: '#f8fafc', fontWeight: 'bold', fontSize: '13px' }}>
            <div style={{ padding: '10px', borderRight: '1px solid #cbd5e1', color: '#2563eb' }}>
              Total Assets: ₹{financials.totalAssets.toFixed(2)}
            </div>
            <div style={{ padding: '10px', color: '#d97706' }}>
              Total Liabilities: ₹{(financials.totalLiabilities + financials.netProfit).toFixed(2)}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const tabButtonStyle = (isActive) => ({
  backgroundColor: isActive ? '#2563eb' : '#f1f5f9',
  color: isActive ? '#ffffff' : '#334155',
  border: '1px solid #cbd5e1',
  padding: '10px',
  borderRadius: '8px',
  fontWeight: 'bold',
  fontSize: '12px',
  cursor: 'pointer'
});

const actionBtnStyle = (bg) => ({
  backgroundColor: bg,
  color: '#ffffff',
  border: 'none',
  padding: '8px 12px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 'bold',
  cursor: 'pointer'
});
