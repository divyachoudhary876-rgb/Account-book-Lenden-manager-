// frontend/src/components/FinancialReportsView.jsx

import React, { useState, useEffect } from 'react';
import { generateFinancialStatements } from '../utils/financialReportEngine.js';
import { 
  downloadProfitAndLossPDF, 
  downloadBalanceSheetPDF, 
  downloadTrialBalancePDF 
} from '../utils/pdfDownloadEngine.js';

export default function FinancialReportsView({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const firmName = firm?.legal_name || firm?.trade_name || 'Enterprise Profile';

  const [activeTab, setActiveTab] = useState('pl'); // 'pl', 'bs', 'tb'
  const [reportData, setReportData] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [statusNotification, setStatusNotification] = useState(null);

  const loadData = () => {
    const data = generateFinancialStatements(activeFirmId);
    setReportData(data);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_state_updated', loadData);
    window.addEventListener('stock_updated', loadData);
    return () => {
      window.removeEventListener('app_state_updated', loadData);
      window.removeEventListener('stock_updated', loadData);
    };
  }, [activeFirmId]);

  if (!reportData) return <div style={{ padding: '20px', textAlign: 'center' }}>Generating Financial Statements...</div>;

  const { trialBalance, profitAndLoss, balanceSheet } = reportData;

  const handleExportCurrentReport = async () => {
    setIsExporting(true);
    setStatusNotification({ type: 'info', message: '⏳ Generating document and saving to phone storage...' });

    try {
      let res;
      if (activeTab === 'pl') {
        res = await downloadProfitAndLossPDF(profitAndLoss, firm);
      } else if (activeTab === 'bs') {
        res = await downloadBalanceSheetPDF(balanceSheet, firm);
      } else if (activeTab === 'tb') {
        res = await downloadTrialBalancePDF(trialBalance, firm);
      }

      if (res?.success) {
        setStatusNotification({ type: 'success', message: '✓ Report processed! Check Documents or Share Sheet on your phone.' });
      } else {
        setStatusNotification(null);
      }
    } catch (err) {
      setStatusNotification({ type: 'error', message: `❌ Export Failed: ${err.message}` });
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatusNotification(null), 6000);
    }
  };

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '30px' }}>
      
      {/* Header Banner */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📈</span> Financial Reports & Statements
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Active Firm: <strong>{firmName}</strong></span>
        </div>

        <button
          onClick={handleExportCurrentReport}
          disabled={isExporting}
          style={{
            backgroundColor: '#059669',
            color: '#ffffff',
            border: 'none',
            padding: '9px 16px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)',
            opacity: isExporting ? 0.7 : 1
          }}
        >
          {isExporting ? '⏳ Saving...' : '📄 Save PDF to Phone'}
        </button>
      </div>

      {/* Real-Time Status Notification */}
      {statusNotification && (
        <div style={{
          backgroundColor: statusNotification.type === 'error' ? '#fef2f2' : statusNotification.type === 'info' ? '#eff6ff' : '#ecfdf5',
          border: `1px solid ${statusNotification.type === 'error' ? '#fecaca' : statusNotification.type === 'info' ? '#bfdbfe' : '#a7f3d0'}`,
          color: statusNotification.type === 'error' ? '#991b1b' : statusNotification.type === 'info' ? '#1e40af' : '#065f46',
          padding: '12px 16px',
          borderRadius: '10px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {statusNotification.message}
        </div>
      )}

      {/* Report Tab Switcher */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('pl')}
          style={{
            flex: 1,
            backgroundColor: activeTab === 'pl' ? '#0f172a' : '#ffffff',
            color: activeTab === 'pl' ? '#ffffff' : '#334155',
            border: '1px solid #cbd5e1',
            padding: '10px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          📊 Profit & Loss (P&L)
        </button>
        <button
          onClick={() => setActiveTab('bs')}
          style={{
            flex: 1,
            backgroundColor: activeTab === 'bs' ? '#0f172a' : '#ffffff',
            color: activeTab === 'bs' ? '#ffffff' : '#334155',
            border: '1px solid #cbd5e1',
            padding: '10px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          ⚖️ Balance Sheet
        </button>
        <button
          onClick={() => setActiveTab('tb')}
          style={{
            flex: 1,
            backgroundColor: activeTab === 'tb' ? '#0f172a' : '#ffffff',
            color: activeTab === 'tb' ? '#ffffff' : '#334155',
            border: '1px solid #cbd5e1',
            padding: '10px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          📋 Trial Balance
        </button>
      </div>

      {/* 1. PROFIT & LOSS VIEW */}
      {activeTab === 'pl' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '16px' }}>
            <strong style={{ fontSize: '16px', color: '#0f172a' }}>TRADING & PROFIT & LOSS STATEMENT</strong>
            <strong style={{ fontSize: '15px', color: profitAndLoss.netProfit >= 0 ? '#059669' : '#dc2626' }}>
              {profitAndLoss.netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS'}: ₹{Math.abs(profitAndLoss.netProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </strong>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <div style={{ backgroundColor: '#fee2e2', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', color: '#991b1b', marginBottom: '10px' }}>
                EXPENDITURE & COSTS (खर्च)
              </div>
              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {profitAndLoss.directExpenses.map((e, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                    <span>{e.name}</span>
                    <span style={{ fontWeight: '600' }}>₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                {profitAndLoss.indirectExpenses.map((e, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                    <span>{e.name}</span>
                    <span style={{ fontWeight: '600' }}>₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ backgroundColor: '#dcfce7', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', color: '#166534', marginBottom: '10px' }}>
                INCOME & REVENUE (आय व बिक्री)
              </div>
              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {profitAndLoss.directIncomes.map((inc, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                    <span>{inc.name}</span>
                    <span style={{ fontWeight: '600' }}>₹{inc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px', color: '#0284c7', fontWeight: 'bold' }}>
                  <span>Closing Stock Valuation</span>
                  <span>₹{profitAndLoss.closingStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {profitAndLoss.indirectIncomes.map((inc, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                    <span>{inc.name}</span>
                    <span style={{ fontWeight: '600' }}>₹{inc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. BALANCE SHEET VIEW */}
      {activeTab === 'bs' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '16px' }}>
            <strong style={{ fontSize: '16px', color: '#0f172a' }}>BALANCE SHEET (तुलन पत्र)</strong>
            <span style={{ backgroundColor: balanceSheet.isTally ? '#dcfce7' : '#fee2e2', color: balanceSheet.isTally ? '#166534' : '#991b1b', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
              {balanceSheet.isTally ? '✓ Balance Sheet Tallied' : `⚠️ Difference: ₹${balanceSheet.difference.toFixed(2)}`}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <div style={{ backgroundColor: '#f1f5f9', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', color: '#0f172a', marginBottom: '10px' }}>
                LIABILITIES & CAPITAL
              </div>
              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {balanceSheet.capital.map((c, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                    <span>{c.name}</span>
                    <span style={{ fontWeight: '600' }}>₹{c.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px', color: profitAndLoss.netProfit >= 0 ? '#059669' : '#dc2626', fontWeight: 'bold' }}>
                  <span>Net Profit (From P&L)</span>
                  <span>₹{profitAndLoss.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {balanceSheet.liabilities.map((l, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                    <span>{l.name}</span>
                    <span style={{ fontWeight: '600' }}>₹{l.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div style={{ marginTop: '14px', borderTop: '2px solid #0f172a', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '13px' }}>
                  <span>TOTAL LIABILITIES & EQUITY:</span>
                  <span>₹{balanceSheet.totalLiabilitiesAndEquity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div>
              <div style={{ backgroundColor: '#f1f5f9', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', color: '#0f172a', marginBottom: '10px' }}>
                ASSETS (संपत्तियां)
              </div>
              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {balanceSheet.assets.map((a, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                    <span>{a.name}</span>
                    <span style={{ fontWeight: '600' }}>₹{a.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div style={{ marginTop: 'auto', borderTop: '2px solid #0f172a', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '13px' }}>
                  <span>TOTAL ASSETS:</span>
                  <span>₹{balanceSheet.totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TRIAL BALANCE VIEW */}
      {activeTab === 'tb' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '14px' }}>
            <strong style={{ fontSize: '16px', color: '#0f172a' }}>TRIAL BALANCE (तलपट)</strong>
            <span style={{ backgroundColor: trialBalance.isMatched ? '#dcfce7' : '#fee2e2', color: trialBalance.isMatched ? '#166534' : '#991b1b', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
              {trialBalance.isMatched ? '✓ Balanced' : '⚠️ Unbalanced'}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Account Head</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Group</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Debit Balance (₹)</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Credit Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.entries.map((e, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: '600' }}>{e.name}</td>
                    <td style={{ padding: '8px', color: '#64748b' }}>{e.sub_group}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#059669', fontWeight: 'bold' }}>{e.debit > 0 ? e.debit.toFixed(2) : '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626', fontWeight: 'bold' }}>{e.credit > 0 ? e.credit.toFixed(2) : '-'}</td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #0f172a', fontWeight: '800' }}>
                  <td colSpan={2} style={{ padding: '10px', textAlign: 'right' }}>TOTAL:</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#059669' }}>₹{trialBalance.totalDebit.toFixed(2)}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#dc2626' }}>₹{trialBalance.totalCredit.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
