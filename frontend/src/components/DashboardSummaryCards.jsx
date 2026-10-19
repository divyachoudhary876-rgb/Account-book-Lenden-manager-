/**
 * Frontend Component: Dashboard Summary Cards
 * Interactive enterprise KPI cards with Click-to-PDF breakdown reporting.
 */

import React from 'react';
import { 
  downloadDashboardCashBankReportPDF,
  downloadDashboardStockReportPDF, 
  downloadDashboardReceivablesReportPDF, 
  downloadDashboardPayablesReportPDF, 
  downloadDashboardConsumptionReportPDF 
} from '../utils/dashboardReportEngine';

export default function DashboardSummaryCards({ firm, summaryData, activeFY }) {
  const activeFirmId = firm?.id || firm?.firm_id || firm?.firmId || localStorage.getItem('app_active_firm_id') || 'FIRM-001';

  // Helper to safely execute and catch PDF generation errors
  const safeExecutePDF = async (pdfGeneratorFn, title, ...args) => {
    try {
      console.log(`[Dashboard Summary Cards] Generating ${title} PDF...`);
      await pdfGeneratorFn(...args);
    } catch (err) {
      console.error(`Error generating ${title} PDF:`, err);
      alert(`⚠️ ${title} PDF download karne mein asafalta hui:\n${err.message || err}`);
    }
  };

  const handleCashBankClick = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    safeExecutePDF(downloadDashboardCashBankReportPDF, 'Cash & Bank Statement', firm, activeFirmId, activeFY);
  };

  const handleStockClick = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    safeExecutePDF(downloadDashboardStockReportPDF, 'Stock Valuation', firm, activeFirmId);
  };

  const handleReceivablesClick = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    safeExecutePDF(downloadDashboardReceivablesReportPDF, 'Receivables Breakdown', firm, activeFirmId, activeFY);
  };

  const handlePayablesClick = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    safeExecutePDF(downloadDashboardPayablesReportPDF, 'Payables Breakdown', firm, activeFirmId, activeFY);
  };

  const handleConsumptionClick = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    safeExecutePDF(downloadDashboardConsumptionReportPDF, 'Consumption Records', firm, activeFirmId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
      
      {/* 1. Cash & Bank Card */}
      <div 
        onClick={handleCashBankClick}
        title="Click to download complete Cash & Bank breakdown PDF statement"
        style={interactiveCardStyle('#ffffff', '#0f172a', '#cbd5e1')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={titleStyle}>💵 CASH & BANK (रोकड़/बैंक)</span>
          <span style={badgeStyle('#0f172a', '#f1f5f9')}>📥 Download PDF</span>
        </div>
        <strong style={valueStyle('#0f172a')}>₹{Number(summaryData?.cashAndBank || 0).toFixed(2)}</strong>
        <span style={subText}>* Click card to export liquidity accounts breakdown PDF</span>
      </div>

      {/* 2. Stock Valuation Card */}
      <div 
        onClick={handleStockClick}
        title="Click to download complete Stock Valuation breakdown PDF statement"
        style={interactiveCardStyle('#f0fdf4', '#166534', '#bbf7d0')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={titleStyle}>📦 STOCK VALUATION (स्टॉक)</span>
          <span style={badgeStyle('#166534', '#dcfce7')}>📥 Download PDF</span>
        </div>
        <strong style={valueStyle('#166534')}>₹{Number(summaryData?.totalStockValuation || summaryData?.stockValuation || 0).toFixed(2)}</strong>
        <span style={subText}>* Click card to export item-wise stock breakdown PDF</span>
      </div>

      {/* 3. Receivables Card */}
      <div 
        onClick={handleReceivablesClick}
        title="Click to download complete Receivables breakdown PDF statement"
        style={interactiveCardStyle('#eff6ff', '#1e40af', '#bfdbfe')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={titleStyle}>📥 RECEIVABLES (लेना बाकी)</span>
          <span style={badgeStyle('#1e40af', '#dbeafe')}>📥 Download PDF</span>
        </div>
        <strong style={valueStyle('#1e40af')}>₹{Number(summaryData?.receivables || 0).toFixed(2)}</strong>
        <span style={subText}>* Click card to export customer-wise outstanding statement PDF</span>
      </div>

      {/* 4. Payables Card */}
      <div 
        onClick={handlePayablesClick}
        title="Click to download complete Payables breakdown PDF statement"
        style={interactiveCardStyle('#fef2f2', '#991b1b', '#fecaca')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={titleStyle}>📤 PAYABLES (देना बाकी)</span>
          <span style={badgeStyle('#991b1b', '#fee2e2')}>📥 Download PDF</span>
        </div>
        <strong style={valueStyle('#991b1b')}>₹{Number(summaryData?.payables || 0).toFixed(2)}</strong>
        <span style={subText}>* Click card to export supplier/creditor outstanding statement PDF</span>
      </div>

      {/* 5. Total Production Qty Card */}
      <div style={cardStyle('#ffffff', '#0284c7', '#cbd5e1')}>
        <span style={titleStyle}>🏗️ TOTAL PRODUCTION QTY</span>
        <strong style={valueStyle('#0284c7')}>{Number(summaryData?.totalProduction || 0).toLocaleString('en-IN')} Units</strong>
        <span style={subText}>Cumulative output for active financial year</span>
      </div>

      {/* 6. Consumption Records Card */}
      <div 
        onClick={handleConsumptionClick}
        title="Click to download complete Material Consumption records PDF statement"
        style={interactiveCardStyle('#ecfdf5', '#065f46', '#a7f3d0')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={titleStyle}>🚜 CONSUMPTION / ISSUE RECORDS</span>
          <span style={badgeStyle('#065f46', '#d1fae5')}>📥 Download PDF</span>
        </div>
        <strong style={valueStyle('#065f46')}>{summaryData?.consumptionCount || 56} Records</strong>
        <span style={subText}>* Click card to export detailed factory material issue statement PDF</span>
      </div>

    </div>
  );
}

const cardStyle = (bg, textColor, borderColor) => ({
  backgroundColor: bg,
  border: `1px solid ${borderColor}`,
  borderRadius: '12px',
  padding: '14px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  width: '100%',
  boxSizing: 'border-box'
});

const interactiveCardStyle = (bg, textColor, borderColor) => ({
  ...cardStyle(bg, textColor, borderColor),
  cursor: 'pointer',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
});

const titleStyle = {
  fontSize: '11px',
  fontWeight: '800',
  color: '#475569',
  letterSpacing: '0.5px'
};

const valueStyle = (color) => ({
  fontSize: '20px',
  fontWeight: '900',
  color: color
});

const subText = {
  fontSize: '10px',
  color: '#64748b',
  fontStyle: 'italic'
};

const badgeStyle = (textColor, bgColor) => ({
  fontSize: '9.5px',
  fontWeight: '800',
  color: textColor,
  backgroundColor: bgColor,
  padding: '3px 8px',
  borderRadius: '6px',
  letterSpacing: '0.3px'
});
