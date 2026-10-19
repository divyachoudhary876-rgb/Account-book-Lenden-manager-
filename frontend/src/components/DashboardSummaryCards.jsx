/**
 * Frontend Component: Dashboard Summary Cards
 * Interactive enterprise KPI cards with Click-to-PDF breakdown reporting.
 */

import React from 'react';
import { 
  downloadDashboardStockReportPDF, 
  downloadDashboardReceivablesReportPDF, 
  downloadDashboardPayablesReportPDF, 
  downloadDashboardConsumptionReportPDF 
} from '../utils/dashboardReportEngine';

export default function DashboardSummaryCards({ firm, summaryData, activeFY }) {
  const activeFirmId = firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';

  // 1. Click Handler for Stock Valuation Card
  const handleStockClick = async (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    try {
      await downloadDashboardStockReportPDF(firm, activeFirmId);
    } catch (err) {
      alert("Stock Report PDF download error: " + err.message);
    }
  };

  // 2. Click Handler for Receivables (Lena Baaki) Card
  const handleReceivablesClick = async (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    try {
      await downloadDashboardReceivablesReportPDF(firm, activeFirmId, activeFY);
    } catch (err) {
      alert("Receivables Report PDF download error: " + err.message);
    }
  };

  // 3. Click Handler for Payables (Dena Baaki) Card
  const handlePayablesClick = async (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    try {
      await downloadDashboardPayablesReportPDF(firm, activeFirmId, activeFY);
    } catch (err) {
      alert("Payables Report PDF download error: " + err.message);
    }
  };

  // 4. Click Handler for Consumption / Issue Records Card
  const handleConsumptionClick = async (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    try {
      await downloadDashboardConsumptionReportPDF(firm, activeFirmId);
    } catch (err) {
      alert("Consumption Report PDF download error: " + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
      
      {/* 1. Cash & Bank Card */}
      <div style={cardStyle('#ffffff', '#0f172a', '#cbd5e1')}>
        <span style={titleStyle}>💵 CASH & BANK (रोकड़/बैंक)</span>
        <strong style={valueStyle('#0f172a')}>₹{Number(summaryData?.cashAndBank || 0).toFixed(2)}</strong>
        <span style={subText}>Current liquidity balance across accounts</span>
      </div>

      {/* 2. Stock Valuation Card (Clickable PDF Export) */}
      <div 
        onClick={handleStockClick}
        title="Click to download complete Stock Valuation breakdown PDF statement"
        style={interactiveCardStyle('#f0fdf4', '#166534', '#bbf7d0')}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={titleStyle}>📦 STOCK VALUATION (स्टॉक)</span>
          <span style={badgeStyle('#166534', '#dcfce7')}>📥 Download PDF</span>
        </div>
        <strong style={valueStyle('#166534')}>₹{Number(summaryData?.totalStockValuation || summaryData?.stockValuation || 0).toFixed(2)}</strong>
        <span style={subText}>* Click card to export uncorrupted item-wise stock breakdown PDF</span>
      </div>

      {/* 3. Receivables Card (Clickable PDF Export) */}
      <div 
        onClick={handleReceivablesClick}
        title="Click to download complete Receivables breakdown PDF statement"
        style={interactiveCardStyle('#eff6ff', '#1e40af', '#bfdbfe')}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={titleStyle}>📥 RECEIVABLES (लेना बाकी)</span>
          <span style={badgeStyle('#1e40af', '#dbeafe')}>📥 Download PDF</span>
        </div>
        <strong style={valueStyle('#1e40af')}>₹{Number(summaryData?.receivables || 0).toFixed(2)}</strong>
        <span style={subText}>* Click card to export customer-wise outstanding statement PDF</span>
      </div>

      {/* 4. Payables Card (Clickable PDF Export) */}
      <div 
        onClick={handlePayablesClick}
        title="Click to download complete Payables breakdown PDF statement"
        style={interactiveCardStyle('#fef2f2', '#991b1b', '#fecaca')}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
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

      {/* 6. Consumption Records Card (Clickable PDF Export) */}
      <div 
        onClick={handleConsumptionClick}
        title="Click to download complete Material Consumption records PDF statement"
        style={interactiveCardStyle('#ecfdf5', '#065f46', '#a7f3d0')}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
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
