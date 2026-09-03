// frontend/src/components/FinancialReportsView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { generateFinancialReports } from '../utils/financialReportEngine.js';
import { downloadFinancialStatementsReport } from '../utils/pdfDownloadEngine.js';

export default function FinancialReportsView({ firm, transactions = [], accounts = [], onClose }) {
  const [activeTab, setActiveTab] = useState('TB'); // 'TB' | 'TRADING' | 'PL'
  const [isExporting, setIsExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState(null);

  // Safe firm name resolution
  const firmName = firm?.legal_name || firm?.trade_name || (typeof firm === 'string' ? firm : 'Neelkanth Int Udyog');
  const financialYear = 'FY 2026-27';

  // 1. Resolve Data: Uses financialReportEngine, or localStorage fallback, or prop transactions
  const reportData = useMemo(() => {
    // Attempt engine generation first
    try {
      if (typeof generateFinancialReports === 'function') {
        const generated = generateFinancialReports();
        if (generated && generated.trialBalance && generated.trialBalance.rows && generated.trialBalance.rows.length > 0) {
          return generated;
        }
      }
    } catch (e) {
      console.warn('generateFinancialReports invocation bypassed:', e);
    }

    // Secondary: Read from localStorage ledgers/transactions
    let allTx = Array.isArray(transactions) && transactions.length > 0 ? transactions : [];
    if (allTx.length === 0) {
      try {
        const storedVouchers = JSON.parse(localStorage.getItem('account_book_vouchers') || '[]');
        const storedJournal = JSON.parse(localStorage.getItem('daybook_entries') || '[]');
        const storedTx = JSON.parse(localStorage.getItem('transactions') || '[]');
        allTx = [...storedVouchers, ...storedJournal, ...storedTx];
      } catch (e) {
        allTx = [];
      }
    }

    const accountMap = {};
    (accounts || []).forEach(acc => {
      accountMap[acc.name] = { name: acc.name, category: acc.category || acc.type || 'ASSETS', debit: 0, credit: 0 };
    });

    allTx.forEach(tx => {
      const amt = parseFloat(tx.amount || 0);
      if (amt <= 0) return;

      const dr = tx.dr_account || tx.dr_party;
      const cr = tx.cr_account || tx.cr_party;

      if (dr) {
        if (!accountMap[dr]) accountMap[dr] = { name: dr, category: 'EXPENSES', debit: 0, credit: 0 };
        accountMap[dr].debit += amt;
      }
      if (cr) {
        if (!accountMap[cr]) accountMap[cr] = { name: cr, category: 'LIABILITIES', debit: 0, credit: 0 };
        accountMap[cr].credit += amt;
      }
    });

    let totalDebit = 0;
    let totalCredit = 0;
    const tbRows = [];

    let totalPurchases = 0;
    let directExpenses = 0;
    let totalSales = 0;
    let closingStock = parseFloat(firm?.closing_stock || 0);
    let indirectExpenses = 0;
    let indirectIncomes = 0;

    Object.values(accountMap).forEach(acc => {
      const diff = acc.debit - acc.credit;
      let d = 0;
      let c = 0;

      if (diff > 0) {
        d = diff;
        totalDebit += diff;
      } else if (diff < 0) {
        c = Math.abs(diff);
        totalCredit += c;
      }

      if (d > 0 || c > 0) {
        tbRows.push({
          account_name: acc.name,
          primary_type: acc.category,
          debit: d,
          credit: c
        });

        const nameLower = acc.name.toLowerCase();
        if (nameLower.includes('purchase') || nameLower.includes('khareed')) totalPurchases += d;
        else if (nameLower.includes('sale') || nameLower.includes('bikri')) totalSales += c;
        else if (nameLower.includes('diesel') || nameLower.includes('wages') || nameLower.includes('freight')) directExpenses += d;
        else if (acc.category === 'EXPENSES') indirectExpenses += d;
        else if (acc.category === 'INCOME') indirectIncomes += c;
      }
    });

    const grossProfit = totalSales + closingStock - (totalPurchases + directExpenses);
    const netProfit = grossProfit + indirectIncomes - indirectExpenses;

    return {
      trialBalance: {
        rows: tbRows.sort((a, b) => a.account_name.localeCompare(b.account_name)),
        totalDebit,
        totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
      },
      tradingAccount: {
        purchases: totalPurchases,
        directExpenses: directExpenses,
        sales: totalSales,
        closingStock: closingStock,
        grossProfit: grossProfit
      },
      profitAndLoss: {
        grossProfit: grossProfit,
        indirectIncomes: indirectIncomes,
        indirectExpenses: indirectExpenses,
        netProfit: netProfit
      }
    };
  }, [firm, transactions, accounts]);

  // Safe Export Handler
  const handlePrintReport = async () => {
    try {
      setIsExporting(true);
      setExportFeedback(null);
      await downloadFinancialStatementsReport(firmName, reportData, activeTab);
      setExportFeedback('✅ रिपोर्ट सफलतापूर्वक डाउनलोड / शेयर की गई।');
    } catch (err) {
      console.error('Print Error:', err);
      setExportFeedback('❌ डाउनलोड विफल: ' + (err.message || 'Error occurred'));
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportFeedback(null), 4500);
    }
  };

  const { trialBalance, tradingAccount, profitAndLoss } = reportData;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Top Header Card */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          {onClose && (
            <button
              onClick={onClose}
              style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '6px 14px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
            >
              ← Dashboard
            </button>
          )}
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '6px' }}>
            {financialYear}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📊</span>
              <span>वित्तीय विवरण (Financial Statements)</span>
            </h1>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              {firmName} | FY 2026-27 | Double-Entry General Ledger
            </div>
          </div>

          <button
            onClick={handlePrintReport}
            disabled={isExporting}
            style={{
              backgroundColor: isExporting ? '#94a3b8' : '#0f172a',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '12px',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(15,23,42,0.2)'
            }}
          >
            <span>🖨️</span>
            <span>{isExporting ? 'कृपया प्रतीक्षा करें...' : 'Print Report'}</span>
          </button>
        </div>

        {exportFeedback && (
          <div style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1' }}>
            {exportFeedback}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => setActiveTab('TB')}
          style={{
            padding: '10px 6px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 'bold',
            border: activeTab === 'TB' ? '1px solid #0284c7' : '1px solid #cbd5e1',
            backgroundColor: activeTab === 'TB' ? '#0284c7' : '#ffffff',
            color: activeTab === 'TB' ? '#ffffff' : '#475569',
            cursor: 'pointer'
          }}
        >
          1. Trial Balance (तलपट)
        </button>
        <button
          onClick={() => setActiveTab('TRADING')}
          style={{
            padding: '10px 6px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 'bold',
            border: activeTab === 'TRADING' ? '1px solid #0284c7' : '1px solid #cbd5e1',
            backgroundColor: activeTab === 'TRADING' ? '#0284c7' : '#ffffff',
            color: activeTab === 'TRADING' ? '#ffffff' : '#475569',
            cursor: 'pointer'
          }}
        >
          2. Trading (व्यापार खाता)
        </button>
        <button
          onClick={() => setActiveTab('PL')}
          style={{
            padding: '10px 6px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 'bold',
            border: activeTab === 'PL' ? '1px solid #0284c7' : '1px solid #cbd5e1',
            backgroundColor: activeTab === 'PL' ? '#0284c7' : '#ffffff',
            color: activeTab === 'PL' ? '#ffffff' : '#475569',
            cursor: 'pointer'
          }}
        >
          3. Profit & Loss (लाभ-हानि)
        </button>
      </div>

      {/* Report Body Card */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
        
        {/* TAB 1: TRIAL BALANCE */}
        {activeTab === 'TB' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                तलपट विवरण (Trial Balance)
              </h2>
              <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '20px', backgroundColor: trialBalance.isBalanced ? '#ecfdf5' : '#fef2f2', color: trialBalance.isBalanced ? '#047857' : '#b91c1c', border: trialBalance.isBalanced ? '1px solid #a7f3d0' : '1px solid #fecaca' }}>
                {trialBalance.isBalanced ? '✓ Balanced (तलपट संतुलित)' : '⚠️ Unbalanced (असंतुलित)'}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>खाते का नाम (Ledger Account)</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>प्रकार (Category)</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>नामे (Debit ₹)</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>जमा (Credit ₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {trialBalance.rows.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                        कोई लेन-देन दर्ज नहीं है।
                      </td>
                    </tr>
                  ) : (
                    trialBalance.rows.map((r, idx) => (
                      <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px', fontWeight: 700, color: '#1e293b' }}>{r.account_name}</td>
                        <td style={{ padding: '10px', color: '#64748b', fontSize: '10px', fontWeight: 600 }}>{r.primary_type}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                          {r.debit > 0 ? r.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                          {r.credit > 0 ? r.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 800, borderTop: '2px solid #cbd5e1' }}>
                    <td colSpan="2" style={{ padding: '12px 10px', textAlign: 'right', color: '#0f172a' }}>कुल योग (Grand Total):</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: '#059669', fontSize: '13px' }}>
                      ₹{trialBalance.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: '#dc2626', fontSize: '13px' }}>
                      ₹{trialBalance.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: TRADING ACCOUNT */}
        {activeTab === 'TRADING' && (
          <div>
            <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              व्यापार खाता (Trading Account)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 'bold', color: '#dc2626', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '8px', fontSize: '12px' }}>
                  व्यय विवरण (Debit / Direct Cost)
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span>कुल खरीद (Purchases):</span>
                  <strong>₹{tradingAccount.purchases.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>प्रत्यक्ष खर्चे (Direct Expenses):</span>
                  <strong>₹{tradingAccount.directExpenses.toFixed(2)}</strong>
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 'bold', color: '#059669', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '8px', fontSize: '12px' }}>
                  आय व स्टॉक (Credit / Revenue)
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span>कुल बिक्री (Sales):</span>
                  <strong>₹{tradingAccount.sales.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>अंतिम स्टॉक (Closing Stock):</span>
                  <strong>₹{tradingAccount.closingStock.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#065f46' }}>सकल लाभ (Gross Profit):</span>
              <span style={{ fontWeight: 800, fontSize: '15px', color: '#059669' }}>₹{tradingAccount.grossProfit.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* TAB 3: PROFIT & LOSS */}
        {activeTab === 'PL' && (
          <div>
            <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              लाभ-हानि विवरण (Profit & Loss Statement)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <span>सकल लाभ (Gross Profit b/d):</span>
                <strong>₹{profitAndLoss.grossProfit.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <span>अन्य आय (Indirect Incomes):</span>
                <strong style={{ color: '#059669' }}>+ ₹{profitAndLoss.indirectIncomes.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <span>कार्यालय व अन्य खर्चे (Indirect Expenses):</span>
                <strong style={{ color: '#dc2626' }}>- ₹{profitAndLoss.indirectExpenses.toFixed(2)}</strong>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px',
                borderRadius: '10px',
                marginTop: '10px',
                backgroundColor: profitAndLoss.netProfit >= 0 ? '#ecfdf5' : '#fef2f2',
                border: profitAndLoss.netProfit >= 0 ? '1px solid #a7f3d0' : '1px solid #fecaca'
              }}>
                <span style={{ fontWeight: 800, color: profitAndLoss.netProfit >= 0 ? '#065f46' : '#991b1b' }}>
                  {profitAndLoss.netProfit >= 0 ? 'शुद्ध लाभ (Net Profit):' : 'शुद्ध हानि (Net Loss):'}
                </span>
                <span style={{ fontWeight: 800, fontSize: '16px', color: profitAndLoss.netProfit >= 0 ? '#059669' : '#dc2626' }}>
                  ₹{profitAndLoss.netProfit.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
