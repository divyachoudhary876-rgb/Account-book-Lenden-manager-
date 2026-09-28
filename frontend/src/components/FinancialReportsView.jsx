// frontend/src/components/FinancialReportsView.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { generateFinancialStatements } from '../utils/financialReportEngine.js';
import { downloadFinancialReportPDF } from '../utils/pdfDownloadEngine.js';

export default function FinancialReportsView({ firm, onClose }) {
  const activeFirmId = firm?.id || firm?.firm_id || 'FIRM-001';

  const [activeTab, setActiveTab] = useState('TRIAL_BALANCE');
  const [reportData, setReportData] = useState({
    trialBalance: { rows: [], totalDebit: 0, totalCredit: 0, isBalanced: true },
    tradingAccount: { sales: 0, purchases: 0, directExpenses: 0, closingStock: 0, grossProfit: 0 },
    profitAndLoss: { grossProfit: 0, indirectIncomes: 0, indirectExpenses: 0, netProfit: 0 },
    balanceSheet: { netProfit: 0, closingStock: 0 }
  });
  const [isExporting, setIsExporting] = useState(false);
  const [statusNotification, setStatusNotification] = useState(null);

  const computeFinancials = () => {
    try {
      const statements = generateFinancialStatements(activeFirmId);
      if (statements) {
        setReportData(statements);
      }
    } catch (e) {
      console.error("Error computing financials via engine:", e);
    }
  };

  useEffect(() => {
    computeFinancials();
    window.addEventListener('app_storage_updated', computeFinancials);
    window.addEventListener('storage', computeFinancials);
    return () => {
      window.removeEventListener('app_storage_updated', computeFinancials);
      window.removeEventListener('storage', computeFinancials);
    };
  }, [activeFirmId]);

  const handleExportPDF = async () => {
    setIsExporting(true);
    setStatusNotification({ type: 'info', message: '⏳ Generating PDF...' });

    try {
      await downloadFinancialReportPDF(firm, reportData, activeTab);
      setStatusNotification({ type: 'success', message: '✓ PDF downloaded successfully!' });
    } catch (e) {
      setStatusNotification({ type: 'error', message: `❌ Export Failed: ${e.message}` });
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatusNotification(null), 4000);
    }
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* Header & Tabs */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '16px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>ENTERPRISE GENERAL LEDGER</div>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>📊 वित्तीय विवरण & रिपोर्ट्स (Financial Reports & GST)</h2>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              <span>📄</span> {isExporting ? 'Saving...' : 'Save PDF'}
            </button>
            {onClose && <button onClick={onClose} style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Close</button>}
          </div>
        </div>

        {statusNotification && (
          <div style={{ backgroundColor: statusNotification.type === 'error' ? '#fef2f2' : '#ecfdf5', color: statusNotification.type === 'error' ? '#991b1b' : '#065f46', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', marginBottom: '12px' }}>
            {statusNotification.message}
          </div>
        )}

        <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', flexWrap: 'wrap' }}>
          {['TRIAL_BALANCE', 'TRADING', 'PNL', 'BALANCE_SHEET', 'GST_SUMMARY'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === tab ? '#0284c7' : '#f1f5f9', color: activeTab === tab ? '#fff' : '#475569', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}
            >
              {tab === 'TRIAL_BALANCE' && '1. Trial Balance'}
              {tab === 'TRADING' && '2. Trading'}
              {tab === 'PNL' && '3. P&L'}
              {tab === 'BALANCE_SHEET' && '4. Balance Sheet'}
              {tab === 'GST_SUMMARY' && '5. GSTR Summary'}
            </button>
          ))}
        </div>
      </div>

      {/* Trial Balance */}
      {activeTab === 'TRIAL_BALANCE' && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>तलपट विवरण (Trial Balance)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#fff' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Account Name</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Dr (₹)</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Cr (₹)</th>
              </tr>
            </thead>
            <tbody>
              {reportData.trialBalance.rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{r.account_name}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#059669' }}>{r.debit > 0 ? r.debit.toFixed(2) : '-'}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#dc2626' }}>{r.credit > 0 ? r.credit.toFixed(2) : '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                <td style={{ padding: '10px' }}>Total</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#059669' }}>₹{reportData.trialBalance.totalDebit.toFixed(2)}</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#dc2626' }}>₹{reportData.trialBalance.totalCredit.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Trading Account */}
      {activeTab === 'TRADING' && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>व्यापार खाता (Trading Account)</h3>
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>Total Sales: <strong>₹{reportData.tradingAccount.sales.toFixed(2)}</strong></div>
            <div>Purchases & Direct Expenses: <strong>₹{(reportData.tradingAccount.purchases + reportData.tradingAccount.directExpenses).toFixed(2)}</strong></div>
            <div>Closing Stock Valuation: <strong>₹{reportData.tradingAccount.closingStock.toFixed(2)}</strong></div>
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '8px', color: '#166534', fontWeight: 'bold' }}>
              Gross Profit / Loss: ₹{reportData.tradingAccount.grossProfit.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* P&L Statement */}
      {activeTab === 'PNL' && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>लाभ-हानि विवरण (Profit & Loss)</h3>
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            <div>Gross Profit: <strong>₹{reportData.profitAndLoss.grossProfit.toFixed(2)}</strong></div>
            <div>Indirect Incomes: <strong>₹{reportData.profitAndLoss.indirectIncomes.toFixed(2)}</strong></div>
            <div>Indirect Expenses: <strong>₹{reportData.profitAndLoss.indirectExpenses.toFixed(2)}</strong></div>
          </div>
          <div style={{ padding: '16px', backgroundColor: reportData.profitAndLoss.netProfit >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: '12px' }}>
            <strong style={{ fontSize: '16px', color: reportData.profitAndLoss.netProfit >= 0 ? '#15803d' : '#dc2626' }}>
              Net Profit / Loss: ₹{reportData.profitAndLoss.netProfit.toFixed(2)}
            </strong>
          </div>
        </div>
      )}

      {/* Balance Sheet */}
      {activeTab === 'BALANCE_SHEET' && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>🏛️ बैलेंस शीट (Balance Sheet Summary)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div>Closing Stock Asset: <strong>₹{reportData.balanceSheet.closingStock.toFixed(2)}</strong></div>
              <div>Net Profit Addition: <strong style={{ color: '#059669' }}>₹{reportData.balanceSheet.netProfit.toFixed(2)}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* GST Summary Report */}
      {activeTab === 'GST_SUMMARY' && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>🧾 GSTR-1 & GSTR-3B Tax Summary</h3>
          <div style={{ fontSize: '13px', color: '#475569' }}>
            Saari tax entries aur outward/inward supplies trial balance aur ledger lines ke anusaar yahan sync hain.
          </div>
        </div>
      )}

    </div>
  );
}
