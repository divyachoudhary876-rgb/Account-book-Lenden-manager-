// frontend/src/components/FinancialReportsView.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import { downloadFinancialReportPDF } from '../utils/pdfDownloadEngine.js';

export default function FinancialReportsView({ firm, onClose }) {
  const activeFirmId = firm?.id || firm?.firm_id || 'FIRM-001';

  const [activeTab, setActiveTab] = useState('TRIAL_BALANCE');
  const [reportData, setReportData] = useState({
    trialBalance: [],
    totalDebit: 0,
    totalCredit: 0,
    isBalanced: true,
    trading: { purchases: 0, directExpenses: 0, sales: 0, closingStock: 0, grossResult: 0 },
    pnl: { grossProfit: 0, indirectIncomes: 0, indirectExpenses: 0, netResult: 0 }
  });
  const [isExporting, setIsExporting] = useState(false);
  const [statusNotification, setStatusNotification] = useState(null);

  const computeFinancials = () => {
    try {
      const masterAccounts = getFirmMasterAccounts(activeFirmId) || [];
      const ledgerMap = {};

      // 1. मास्टर अकाउंट्स से लेजर मैप तैयार करें
      masterAccounts.forEach(acc => {
        const name = acc.name || acc.account_name;
        if (name) {
          const cleanName = name.trim();
          ledgerMap[cleanName] = {
            name: cleanName,
            category: (acc.category || acc.primary_type || 'GENERAL').toUpperCase(),
            debit: Number(acc.opening_balance || 0),
            credit: 0
          };
          if (acc.balance_type === 'Cr') {
            ledgerMap[cleanName].debit = 0;
            ledgerMap[cleanName].credit = Number(acc.opening_balance || 0);
          }
        }
      });

      // 2. स्टोरेज से सभी वाउचर्स और पेरोल प्रविष्टियाँ लोड करें
      let rawTx = [];
      const keysToScan = [
        'account_book_vouchers',
        'app_vouchers',
        'app_payroll_entries',
        `account_book_vouchers_${activeFirmId}`,
        `app_vouchers_${activeFirmId}`,
        `app_payroll_entries_${activeFirmId}`
      ];

      keysToScan.forEach(k => {
        try {
          const val = StorageService.getItem ? StorageService.getItem(k) : JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(val)) rawTx.push(...val);
        } catch (err) {}
      });

      let totalPurchases = 0;
      let totalSales = 0;
      let directExpensesSum = 0;
      let indirectExpensesSum = 0;
      let indirectIncomesSum = 0;

      // 3. डेटा को प्रोसेस करें
      rawTx.forEach(v => {
        if (!v) return;

        // पेरोल / मजदूरी प्रविष्टि
        if (v.worker && v.expense_ledger && v.total_amount) {
          const workerName = String(v.worker).trim();
          const expenseName = String(v.expense_ledger).trim();
          const amt = Number(v.total_amount || 0);

          if (amt > 0) {
            if (!ledgerMap[expenseName]) {
              ledgerMap[expenseName] = { name: expenseName, category: 'EXPENSES', debit: 0, credit: 0 };
            }
            ledgerMap[expenseName].debit += amt;
            directExpensesSum += amt;

            if (!ledgerMap[workerName]) {
              ledgerMap[workerName] = { name: workerName, category: 'LIABILITIES', debit: 0, credit: 0 };
            }
            ledgerMap[workerName].credit += amt;
          }
          return;
        }

        // जर्नल वाउचर प्रविष्टि (Entries Array)
        if (Array.isArray(v.entries) && v.entries.length > 0) {
          v.entries.forEach(e => {
            const accName = (e.account_name || e.party || '').trim();
            const amt = Number(e.amount || e.debit || e.credit || 0);
            if (!accName || amt <= 0) return;

            const isDr = (e.type || '').toUpperCase() === 'DR' || Number(e.debit || 0) > 0;
            const isCr = (e.type || '').toUpperCase() === 'CR' || Number(e.credit || 0) > 0;

            if (!ledgerMap[accName]) {
              ledgerMap[accName] = { name: accName, category: 'EXPENSES', debit: 0, credit: 0 };
            }

            if (isDr) {
              ledgerMap[accName].debit += amt;
              if (ledgerMap[accName].category === 'EXPENSES') directExpensesSum += amt;
            }
            if (isCr) {
              ledgerMap[accName].credit += amt;
            }
          });
        }
      });

      const tbRows = Object.values(ledgerMap).map(l => {
        const net = l.debit - l.credit;
        return {
          name: l.name,
          category: l.category,
          dr: net > 0 ? net : 0,
          cr: net < 0 ? Math.abs(net) : 0
        };
      }).filter(r => r.dr > 0 || r.cr > 0);

      const tDr = tbRows.reduce((s, r) => s + r.dr, 0);
      const tCr = tbRows.reduce((s, r) => s + r.cr, 0);

      const grossResult = totalSales - (totalPurchases + directExpensesSum);
      const netResult = (grossResult + indirectIncomesSum) - indirectExpensesSum;

      setReportData({
        trialBalance: tbRows,
        totalDebit: tDr,
        totalCredit: tCr,
        isBalanced: Math.abs(tDr - tCr) < 1,
        trading: { purchases: totalPurchases, directExpenses: directExpensesSum, sales: totalSales, closingStock: 0, grossResult },
        pnl: { grossProfit: grossResult, indirectIncomes: indirectIncomesSum, indirectExpenses: indirectExpensesSum, netResult }
      });

    } catch (e) {
      console.error("Error computing financials:", e);
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
    setStatusNotification({ type: 'info', message: '⏳ PDF जनरेट हो रहा है...' });

    try {
      await downloadFinancialReportPDF(firm, reportData, activeTab);
      setStatusNotification({ type: 'success', message: '✓ PDF सफलतापूर्वक डाउनलोड हो गया!' });
    } catch (e) {
      setStatusNotification({ type: 'error', message: `❌ एक्सपोर्ट असफल: ${e.message}` });
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatusNotification(null), 4000);
    }
  };

  return (
    <div style={{ padding: '12px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', maxWidth: '850px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* Header & Fixed Navigation Tabs */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '14px', marginBottom: '14px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>📊 वित्तीय विवरण (Financial Statements)</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleExportPDF} disabled={isExporting} style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
              {isExporting ? 'Saving...' : '📄 Save PDF'}
            </button>
            {onClose && <button onClick={onClose} style={{ padding: '6px 10px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}>Close</button>}
          </div>
        </div>

        {statusNotification && (
          <div style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', marginBottom: '10px', backgroundColor: statusNotification.type === 'error' ? '#fef2f2' : '#ecfdf5', color: statusNotification.type === 'error' ? '#991b1b' : '#065f46' }}>
            {statusNotification.message}
          </div>
        )}

        {/* All Three Tabs Restored Properly */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setActiveTab('TRIAL_BALANCE')} 
            style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'TRIAL_BALANCE' ? '#0284c7' : '#f1f5f9', color: activeTab === 'TRIAL_BALANCE' ? '#fff' : '#475569', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}
          >
            1. Trial Balance (तलपट)
          </button>
          <button 
            onClick={() => setActiveTab('TRADING')} 
            style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'TRADING' ? '#0284c7' : '#f1f5f9', color: activeTab === 'TRADING' ? '#fff' : '#475569', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}
          >
            2. Trading Account (व्यापार खाता)
          </button>
          <button 
            onClick={() => setActiveTab('PNL')} 
            style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'PNL' ? '#0284c7' : '#f1f5f9', color: activeTab === 'PNL' ? '#fff' : '#475569', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}
          >
            3. Profit & Loss (लाभ-हानि)
          </button>
        </div>
      </div>

      {/* Tab Content 1: Trial Balance */}
      {activeTab === 'TRIAL_BALANCE' && (
        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800' }}>तलपट विवरण (Trial Balance)</h3>
            <span style={{ fontSize: '10px', backgroundColor: reportData.isBalanced ? '#f0fdf4' : '#fef2f2', color: reportData.isBalanced ? '#166534' : '#991b1b', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
              {reportData.isBalanced ? '✓ Balanced' : '⚠ Unbalanced'}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#fff' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>खाते का नाम</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>नामे (Dr ₹)</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>जमा (Cr ₹)</th>
                </tr>
              </thead>
              <tbody>
                {(!reportData.trialBalance || reportData.trialBalance.length === 0) ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>कोई खाता प्रविष्टि नहीं मिली।</td>
                  </tr>
                ) : (
                  reportData.trialBalance.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: '#0f172a' }}>{row.name}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#059669', fontWeight: 'bold' }}>{row.dr > 0 ? row.dr.toFixed(2) : '-'}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626', fontWeight: 'bold' }}>{row.cr > 0 ? row.cr.toFixed(2) : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f1f5f9', fontWeight: '900' }}>
                  <td style={{ padding: '10px' }}>कुल योग (Total)</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#059669' }}>₹{Number(reportData.totalDebit || 0).toFixed(2)}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#dc2626' }}>₹{Number(reportData.totalCredit || 0).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 2: Trading Account */}
      {activeTab === 'TRADING' && (
        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800' }}>व्यापार खाता (Trading Account)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
              <span>प्रत्यक्ष व्यय (Direct Expenses / Wages):</span>
              <strong>₹{reportData.trading.directExpenses.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f0fdf4', borderRadius: '8px', fontWeight: 'bold', color: '#166534' }}>
              <span>सकल परिणाम (Gross Result):</span>
              <span>₹{reportData.trading.grossResult.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 3: Profit & Loss */}
      {activeTab === 'PNL' && (
        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800' }}>लाभ-हानि विवरण (Profit & Loss)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: reportData.pnl.netResult >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: '8px', fontWeight: 'bold', color: reportData.pnl.netResult >= 0 ? '#166534' : '#991b1b' }}>
              <span>शुद्ध लाभ / हानि (Net Profit / Loss):</span>
              <span>₹{reportData.pnl.netResult.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
