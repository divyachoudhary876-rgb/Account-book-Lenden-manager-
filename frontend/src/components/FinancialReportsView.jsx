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

      // 1. Initialize master accounts
      masterAccounts.forEach(acc => {
        const name = (acc.name || acc.account_name || '').trim();
        if (name) {
          ledgerMap[name] = {
            name,
            category: (acc.category || acc.primary_type || 'GENERAL').toUpperCase(),
            debit: 0,
            credit: 0
          };
        }
      });

      // 2. Scan all possible storage keys
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
        } catch (e) {}
      });

      // 3. STRICT ID-BASED DEDUPLICATION MAP
      const uniqueVoucherMap = new Map();
      rawTx.forEach(v => {
        if (!v) return;
        const vFirm = v.firm_id || activeFirmId;
        if (vFirm !== activeFirmId && vFirm !== 'FIRM-001' && activeFirmId !== 'FIRM-001') return;

        // Unique deterministic signature to prevent duplicate accumulation
        const uniqueId = v.id || v.reference_no || `${v.voucher_date || v.date}-${v.total_amount || v.amount || 0}-${JSON.stringify(v.entries || '')}`;
        
        if (!uniqueVoucherMap.has(uniqueId)) {
          uniqueVoucherMap.set(uniqueId, v);
        }
      });

      const uniqueVouchers = Array.from(uniqueVoucherMap.values());
      let directExpensesSum = 0;
      let totalSales = 0;
      let totalPurchases = 0;

      // 4. Process unique vouchers with Double-Entry rules
      uniqueVouchers.forEach(v => {
        // Payroll / Wage entry format
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

        // Standard JV / Sales / Purchase entries (Entries Array)
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
        // Flat voucher format fallback
        else {
          const amt = Number(v.amount || v.total_amount || 0);
          if (amt <= 0) return;
          const dr = (v.dr_account || '').trim();
          const cr = (v.cr_account || '').trim();

          if (dr) {
            if (!ledgerMap[dr]) ledgerMap[dr] = { name: dr, category: 'EXPENSES', debit: 0, credit: 0 };
            ledgerMap[dr].debit += amt;
          }
          if (cr) {
            if (!ledgerMap[cr]) ledgerMap[cr] = { name: cr, category: 'LIABILITIES', debit: 0, credit: 0 };
            ledgerMap[cr].credit += amt;
          }
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

      setReportData({
        trialBalance: tbRows,
        totalDebit: tDr,
        totalCredit: tCr,
        isBalanced: Math.abs(tDr - tCr) < 1,
        trading: { purchases: totalPurchases, directExpenses: directExpensesSum, sales: totalSales, closingStock: 0, grossResult },
        pnl: { grossProfit: grossResult, indirectIncomes: 0, indirectExpenses: 0, netResult: grossResult }
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
      
      {/* Enterprise Header & Tabs */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '16px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>ENTERPRISE GENERAL LEDGER</div>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>📊 वित्तीय विवरण (Financial Statements)</h2>
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

        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setActiveTab('TRIAL_BALANCE')}
            style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'TRIAL_BALANCE' ? '#0284c7' : '#f1f5f9', color: activeTab === 'TRIAL_BALANCE' ? '#fff' : '#475569', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
          >
            1. Trial Balance (तलपट)
          </button>
          <button 
            onClick={() => setActiveTab('TRADING')}
            style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'TRADING' ? '#0284c7' : '#f1f5f9', color: activeTab === 'TRADING' ? '#fff' : '#475569', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
          >
            2. Trading Account (व्यापार खाता)
          </button>
          <button 
            onClick={() => setActiveTab('PNL')}
            style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'PNL' ? '#0284c7' : '#f1f5f9', color: activeTab === 'PNL' ? '#fff' : '#475569', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
          >
            3. Profit & Loss (लाभ-हानि)
          </button>
        </div>
      </div>

      {/* Trial Balance View */}
      {activeTab === 'TRIAL_BALANCE' && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>तलपट विवरण (Trial Balance)</h3>
            <span style={{ fontSize: '11px', backgroundColor: reportData.isBalanced ? '#f0fdf4' : '#fef2f2', color: reportData.isBalanced ? '#166534' : '#991b1b', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold' }}>
              {reportData.isBalanced ? '✓ Balanced (संतुलित)' : '⚠ Unbalanced'}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#fff' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>खाते का नाम (Account Name)</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>प्रकार (Category)</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>नामे (Dr ₹)</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>जमा (Cr ₹)</th>
                </tr>
              </thead>
              <tbody>
                {(!reportData.trialBalance || reportData.trialBalance.length === 0) ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No active accounts found.</td>
                  </tr>
                ) : (
                  reportData.trialBalance.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#0f172a' }}>{row.name}</td>
                      <td style={{ padding: '10px', color: '#64748b' }}>{row.category}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{row.dr > 0 ? row.dr.toFixed(2) : '-'}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>{row.cr > 0 ? row.cr.toFixed(2) : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f1f5f9', fontWeight: '900' }}>
                  <td colSpan={2} style={{ padding: '12px' }}>कुल योग (Total)</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#059669' }}>₹{Number(reportData.totalDebit || 0).toFixed(2)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#dc2626' }}>₹{Number(reportData.totalCredit || 0).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Trading Account View */}
      {activeTab === 'TRADING' && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>व्यापार खाता (Trading Account)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div style={{ backgroundColor: '#fef2f2', padding: '16px', borderRadius: '12px', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#991b1b', textTransform: 'uppercase', marginBottom: '8px' }}>व्यय विवरण (Debit / Direct Cost)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span>कुल खरीद व मजदूरी (Purchases & Wages):</span>
                <strong>₹{reportData.trading.directExpenses.toFixed(2)}</strong>
              </div>
            </div>

            <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase', marginBottom: '8px' }}>आय व स्टॉक (Credit / Revenue)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span>कुल बिक्री (Sales):</span>
                <strong>₹{reportData.trading.sales.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profit & Loss View */}
      {activeTab === 'PNL' && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>लाभ-हानि विवरण (Profit & Loss Statement)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', backgroundColor: reportData.pnl.netResult >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: '12px', border: `1px solid ${reportData.pnl.netResult >= 0 ? '#bbf7d0' : '#fecaca'}` }}>
              <span style={{ fontWeight: 'bold', color: reportData.pnl.netResult >= 0 ? '#166534' : '#991b1b' }}>शुद्ध लाभ / हानि (Net Profit / Loss):</span>
              <strong style={{ fontSize: '16px', color: reportData.pnl.netResult >= 0 ? '#15803d' : '#dc2626' }}>
                ₹{reportData.pnl.netResult.toFixed(2)}
              </strong>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
