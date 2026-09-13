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
    pnl: { grossProfit: 0, indirectIncomes: 0, indirectExpenses: 0, netResult: 0 },
    balanceSheet: { assets: [], liabilities: [], totalAssets: 0, totalLiabilities: 0 },
    gstSummary: { taxableSales: 0, outputTax: 0, taxablePurchases: 0, inputTax: 0, netTaxPayable: 0 }
  });
  const [isExporting, setIsExporting] = useState(false);
  const [statusNotification, setStatusNotification] = useState(null);

  const computeFinancials = () => {
    try {
      const masterAccounts = getFirmMasterAccounts(activeFirmId) || [];
      const ledgerMap = {};

      masterAccounts.forEach(acc => {
        const name = (acc.name || acc.account_name || '').trim();
        if (name) {
          const category = (acc.category || acc.primary_type || 'GENERAL').toUpperCase();
          ledgerMap[name] = {
            name,
            category,
            debit: Number(acc.opening_balance || 0) * (acc.balance_type === 'Dr' ? 1 : 0),
            credit: Number(acc.opening_balance || 0) * (acc.balance_type === 'Cr' ? 1 : 0)
          };
        }
      });

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

      const uniqueVoucherMap = new Map();
      rawTx.forEach(v => {
        if (!v) return;
        const vFirm = v.firm_id || activeFirmId;
        if (vFirm !== activeFirmId && vFirm !== 'FIRM-001' && activeFirmId !== 'FIRM-001') return;

        const uniqueId = v.id || v.reference_no || `${v.voucher_date || v.date}-${v.total_amount || v.amount || 0}`;
        if (!uniqueVoucherMap.has(uniqueId)) {
          uniqueVoucherMap.set(uniqueId, v);
        }
      });

      const uniqueVouchers = Array.from(uniqueVoucherMap.values());

      let gstTaxableSales = 0;
      let gstOutputTax = 0;
      let gstTaxablePurchases = 0;
      let gstInputTax = 0;

      uniqueVouchers.forEach(v => {
        const vType = String(v.voucher_type || v.type || '').toUpperCase();
        
        // Extract GST data from invoices if available
        if (vType === 'SALES') {
          gstTaxableSales += Number(v.total_taxable || v.amount || 0);
          gstOutputTax += Number(v.total_cgst || 0) + Number(v.total_sgst || 0);
        } else if (vType === 'PURCHASE') {
          gstTaxablePurchases += Number(v.total_taxable || v.amount || 0);
          gstInputTax += Number(v.total_cgst || 0) + Number(v.total_sgst || 0);
        }

        if (v.worker && v.expense_ledger && v.total_amount) {
          const workerName = String(v.worker).trim();
          const expenseName = String(v.expense_ledger).trim();
          const amt = Number(v.total_amount || 0);

          if (amt > 0) {
            if (!ledgerMap[expenseName]) ledgerMap[expenseName] = { name: expenseName, category: 'EXPENSES', debit: 0, credit: 0 };
            ledgerMap[expenseName].debit += amt;

            if (!ledgerMap[workerName]) ledgerMap[workerName] = { name: workerName, category: 'LIABILITIES', debit: 0, credit: 0 };
            ledgerMap[workerName].credit += amt;
          }
          return;
        }

        if (Array.isArray(v.entries) && v.entries.length > 0) {
          v.entries.forEach(e => {
            const accName = (e.account_name || e.party || '').trim();
            const amt = Number(e.amount || e.debit || e.credit || 0);
            if (!accName || amt <= 0) return;

            const isDr = (e.type || '').toUpperCase() === 'DR' || Number(e.debit || 0) > 0;
            const isCr = (e.type || '').toUpperCase() === 'CR' || Number(e.credit || 0) > 0;

            if (!ledgerMap[accName]) ledgerMap[accName] = { name: accName, category: 'EXPENSES', debit: 0, credit: 0 };
            if (isDr) ledgerMap[accName].debit += amt;
            if (isCr) ledgerMap[accName].credit += amt;
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

      let totalSales = 0;
      let totalPurchasesOrWages = 0;
      let indirectExpenses = 0;
      let indirectIncomes = 0;

      const assets = [];
      const liabilities = [];
      let totalAssets = 0;
      let totalLiabilities = 0;

      tbRows.forEach(row => {
        const n = row.name.toLowerCase();
        const cat = row.category.toLowerCase();

        if (cat.includes('income') || n.includes('sale') || n.includes('revenue')) {
          totalSales += row.cr;
        } else if (cat.includes('expense') || n.includes('wages') || n.includes('pathai') || n.includes('purchase') || n.includes('coal')) {
          totalPurchasesOrWages += row.dr;
        }

        if (cat.includes('asset') || n.includes('cash') || n.includes('bank') || n.includes('stock') || n.includes('debtor')) {
          assets.push({ name: row.name, amount: row.dr - row.cr });
          totalAssets += (row.dr - row.cr);
        } else if (cat.includes('liability') || cat.includes('capital') || n.includes('creditor') || n.includes('loan')) {
          liabilities.push({ name: row.name, amount: row.cr - row.dr });
          totalLiabilities += (row.cr - row.dr);
        }
      });

      const grossResult = totalSales - totalPurchasesOrWages;
      const netResult = grossResult + indirectIncomes - indirectExpenses;

      setReportData({
        trialBalance: tbRows,
        totalDebit: tDr,
        totalCredit: tCr,
        isBalanced: Math.abs(tDr - tCr) < 1,
        trading: { purchases: 0, directExpenses: totalPurchasesOrWages, sales: totalSales, closingStock: 0, grossResult },
        pnl: { grossProfit: grossResult, indirectIncomes, indirectExpenses, netResult },
        balanceSheet: { assets, liabilities, totalAssets, totalLiabilities: totalLiabilities + netResult },
        gstSummary: { taxableSales: gstTaxableSales, outputTax: gstOutputTax, taxablePurchases: gstTaxablePurchases, inputTax: gstInputTax, netTaxPayable: Math.max(0, gstOutputTax - gstInputTax) }
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
              {reportData.trialBalance.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{r.name}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#059669' }}>{r.dr > 0 ? r.dr.toFixed(2) : '-'}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#dc2626' }}>{r.cr > 0 ? r.cr.toFixed(2) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Trading Account */}
      {activeTab === 'TRADING' && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>व्यापार खाता (Trading Account)</h3>
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>Total Sales: <strong>₹{reportData.trading.sales.toFixed(2)}</strong></div>
            <div>Direct Expenses / Purchases: <strong>₹{reportData.trading.directExpenses.toFixed(2)}</strong></div>
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '8px', color: '#166534', fontWeight: 'bold' }}>
              Gross Profit / Loss: ₹{reportData.trading.grossResult.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* P&L Statement */}
      {activeTab === 'PNL' && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>लाभ-हानि विवरण (Profit & Loss)</h3>
          <div style={{ padding: '16px', backgroundColor: reportData.pnl.netResult >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: '12px' }}>
            <strong style={{ fontSize: '16px', color: reportData.pnl.netResult >= 0 ? '#15803d' : '#dc2626' }}>
              Net Profit / Loss: ₹{reportData.pnl.netResult.toFixed(2)}
            </strong>
          </div>
        </div>
      )}

      {/* Balance Sheet (Module 1 & 2 Integrated) */}
      {activeTab === 'BALANCE_SHEET' && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>🏛️ बैलेंस शीट (Balance Sheet - Assets & Liabilities)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#1d4ed8' }}>Assets (संपत्ति)</h4>
              {reportData.balanceSheet.assets.map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span>{a.name}</span>
                  <strong>₹{a.amount.toFixed(2)}</strong>
                </div>
              ))}
              <div style={{ marginTop: '10px', fontWeight: '900', fontSize: '13px' }}>Total Assets: ₹{reportData.balanceSheet.totalAssets.toFixed(2)}</div>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#b91c1c' }}>Liabilities & Capital (दायित्व)</h4>
              {reportData.balanceSheet.liabilities.map((l, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span>{l.name}</span>
                  <strong>₹{l.amount.toFixed(2)}</strong>
                </div>
              ))}
              <div style={{ marginTop: '10px', fontWeight: '900', fontSize: '13px' }}>Total Liabilities: ₹{reportData.balanceSheet.totalLiabilities.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* GST Summary Report (Module 4) */}
      {activeTab === 'GST_SUMMARY' && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>🧾 GSTR-1 & GSTR-3B Tax Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>Taxable Outward Sales: <strong>₹{reportData.gstSummary.taxableSales.toFixed(2)}</strong></div>
              <div>Output GST Collected: <strong style={{ color: '#059669' }}>₹{reportData.gstSummary.outputTax.toFixed(2)}</strong></div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>Taxable Inward Purchases: <strong>₹{reportData.gstSummary.taxablePurchases.toFixed(2)}</strong></div>
              <div>Input Tax Credit (ITC): <strong style={{ color: '#1d4ed8' }}>₹{reportData.gstSummary.inputTax.toFixed(2)}</strong></div>
            </div>
            <div style={{ padding: '14px', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: '#166534' }}>Net Tax Payable (शुद्ध कर देय):</span>
              <strong style={{ fontSize: '16px', color: '#15803d' }}>₹{reportData.gstSummary.netTaxPayable.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
