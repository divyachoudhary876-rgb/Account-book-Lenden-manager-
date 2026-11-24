import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../utils/storageSync';
import { downloadFinancialReportPDF } from '../utils/pdfDownloadEngine.js';
import { generateFinancialStatements } from '../utils/financialReportEngine.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export default function FinancialReportsView({ firm, onClose }) {
  const activeFirmId = String(firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001').trim();
  const rawFY = localStorage.getItem(`app_active_fy_${activeFirmId}`) || '2026-27';
  const cleanFY = String(rawFY).replace(/^FY\s*/i, '').trim() || '2026-27';

  const [activeTab, setActiveTab] = useState('TRIAL_BALANCE');
  const [reportData, setReportData] = useState({
    trialBalance: { rows: [], totalDebit: 0, totalCredit: 0, difference: 0, isBalanced: true },
    tradingAccount: { sales: 0, purchases: 0, directExpenses: 0, closingStock: 0, grossProfit: 0 },
    profitAndLoss: { grossProfit: 0, indirectIncomes: 0, indirectExpenses: 0, netProfit: 0 },
    balanceSheet: { netProfit: 0, closingStock: 0 }
  });
  const [gstSummary, setGstSummary] = useState({
    taxableSales: 0,
    outputTax: 0,
    outputCgst: 0,
    outputSgst: 0,
    grossSales: 0,
    invoiceCount: 0
  });
  const [isExporting, setIsExporting] = useState(false);
  const [statusNotification, setStatusNotification] = useState(null);

  const computeFinancials = () => {
    try {
      const statements = generateFinancialStatements(activeFirmId, cleanFY);
      setReportData(statements);

      const vKeys = [`sales_invoices_${activeFirmId}`, `app_invoices_${activeFirmId}`, `account_book_vouchers_${activeFirmId}`];
      const uniqueInvMap = new Map();
      vKeys.forEach(k => {
        try {
          const list = StorageService.getItem(k, []) || [];
          if (Array.isArray(list)) {
            list.forEach(v => {
              if (!v) return;
              if (String(v.voucher_type || v.type || '').toUpperCase() === 'SALES') {
                const uid = String(v.id || v.reference_no || v.voucher_number || '').trim();
                if (uid && !uniqueInvMap.has(uid)) uniqueInvMap.set(uid, v);
              }
            });
          }
        } catch (e) {}
      });

      let taxableSales = 0;
      let outputCgst = 0;
      let outputSgst = 0;
      let grossSales = 0;

      uniqueInvMap.forEach(inv => {
        const gAmt = Number(inv.total_amount || inv.amount || 0);
        const tAmt = inv.total_taxable !== undefined ? Number(inv.total_taxable) : gAmt;
        let cgst = 0;
        let sgst = 0;

        if (Array.isArray(inv.items) && inv.items.length > 0) {
          inv.items.forEach(it => {
            cgst += Number(it.cgst || 0);
            sgst += Number(it.sgst || 0);
          });
        }
        if (cgst === 0 && sgst === 0 && inv.gst_amount) {
          cgst = Number(inv.gst_amount) / 2;
          sgst = Number(inv.gst_amount) / 2;
        }

        taxableSales = round2(taxableSales + tAmt);
        outputCgst = round2(outputCgst + cgst);
        outputSgst = round2(outputSgst + sgst);
        grossSales = round2(grossSales + gAmt);
      });

      setGstSummary({
        taxableSales,
        outputCgst,
        outputSgst,
        outputTax: round2(outputCgst + outputSgst),
        grossSales,
        invoiceCount: uniqueInvMap.size
      });
    } catch (e) {
      console.error("Error computing financials:", e);
    }
  };

  useEffect(() => {
    computeFinancials();
    window.addEventListener('app_storage_updated', computeFinancials);
    window.addEventListener('app_state_updated', computeFinancials);
    window.addEventListener('storage', computeFinancials);
    return () => {
      window.removeEventListener('app_storage_updated', computeFinancials);
      window.removeEventListener('app_state_updated', computeFinancials);
      window.removeEventListener('storage', computeFinancials);
    };
  }, [activeFirmId, cleanFY]);

  const handleExportPDF = async () => {
    setIsExporting(true);
    setStatusNotification({ type: 'info', message: `⏳ Generating PDF for ${activeTab.replace('_', ' ')}...` });

    try {
      await downloadFinancialReportPDF(firm, reportData, activeTab);
      setStatusNotification({ type: 'success', message: '✓ Report PDF downloaded successfully!' });
    } catch (e) {
      setStatusNotification({ type: 'error', message: `❌ Export Failed: ${e.message}` });
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatusNotification(null), 4000);
    }
  };

  const tbRows = reportData.trialBalance?.rows || [];

  const balanceSheetBreakdown = useMemo(() => {
    const assets = [];
    const liabilities = [];

    tbRows.forEach(r => {
      const pType = String(r.primary_type || '').toUpperCase();
      const nameLower = String(r.account_name || '').toLowerCase();
      if (pType === 'ASSETS' && r.debit > 0) {
        assets.push({ name: r.account_name, amount: r.debit });
      } else if ((pType === 'LIABILITIES' || pType === 'EQUITY' || nameLower.includes('capital')) && r.credit > 0) {
        liabilities.push({ name: r.account_name, amount: r.credit });
      }
    });

    const netProfit = Number(reportData.balanceSheet?.netProfit || 0);
    const totalAssets = round2(
      assets.reduce((s, a) => s + a.amount, 0) + (netProfit < 0 ? Math.abs(netProfit) : 0)
    );
    const totalLiabilitiesAndEquity = round2(
      liabilities.reduce((s, l) => s + l.amount, 0) + (netProfit > 0 ? netProfit : 0)
    );

    return { assets, liabilities, netProfit, totalAssets, totalLiabilitiesAndEquity };
  }, [tbRows, reportData.balanceSheet]);

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto', boxSizing: 'border-box' }}>

      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '16px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>ENTERPRISE GENERAL LEDGER • FY {cleanFY}</div>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>📊 वित्तीय विवरण & रिपोर्ट्स (Financial Reports & GST)</h2>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              <span>📄</span> {isExporting ? 'Saving...' : `Save ${activeTab.replace('_', ' ')} PDF`}
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

      {activeTab === 'TRIAL_BALANCE' && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>तलपट विवरण (Trial Balance) - A to Z Sorted</h3>
          <div style={{ maxHeight: '450px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#fff', position: 'sticky', top: 0, zIndex: 1 }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Account Name</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Category</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Dr (₹)</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Cr (₹)</th>
                </tr>
              </thead>
              <tbody>
                {tbRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{r.account_name}</td>
                    <td style={{ padding: '10px', color: '#64748b' }}>{r.primary_type}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#059669' }}>{r.debit > 0 ? r.debit.toFixed(2) : '-'}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#dc2626' }}>{r.credit > 0 ? r.credit.toFixed(2) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f1f5f9', padding: '12px', marginTop: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', flexWrap: 'wrap', gap: '8px' }}>
            <span>Total {reportData.trialBalance.isBalanced ? '✓ (Balanced)' : `⚠️ (Diff: ₹${Number(reportData.trialBalance.difference || 0).toFixed(2)})`}</span>
            <div>
              <span style={{ color: '#059669', marginRight: '20px' }}>Dr: ₹{reportData.trialBalance.totalDebit.toFixed(2)}</span>
              <span style={{ color: '#dc2626' }}>Cr: ₹{reportData.trialBalance.totalCredit.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'TRADING' && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>व्यापार खाता (Trading Account)</h3>
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>Total Sales (बिक्री): <strong>₹{reportData.tradingAccount.sales.toFixed(2)}</strong></div>
            <div>Purchases (खरीद): <strong>₹{reportData.tradingAccount.purchases.toFixed(2)}</strong></div>
            <div>Direct Expenses (प्रत्यक्ष खर्च): <strong>₹{reportData.tradingAccount.directExpenses.toFixed(2)}</strong></div>
            <div>Closing Stock Valuation: <strong>₹{reportData.tradingAccount.closingStock.toFixed(2)}</strong></div>
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '8px', color: '#166534', fontWeight: 'bold' }}>
              Gross Profit: ₹{reportData.tradingAccount.grossProfit.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'PNL' && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>लाभ-हानि विवरण (Profit & Loss)</h3>
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
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

      {activeTab === 'BALANCE_SHEET' && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>🏛️ बैलेंस शीट (Balance Sheet)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', fontSize: '12px' }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <strong style={{ color: '#991b1b', display: 'block', marginBottom: '8px' }}>Liabilities & Capital (देयताएं व पूंजी)</strong>
              {balanceSheetBreakdown.liabilities.length === 0 ? (
                <div style={{ color: '#94a3b8' }}>No liability/capital balances.</div>
              ) : (
                balanceSheetBreakdown.liabilities.map((l, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #f1f5f9' }}>
                    <span>{l.name}</span>
                    <strong>₹{l.amount.toFixed(2)}</strong>
                  </div>
                ))
              )}
              {balanceSheetBreakdown.netProfit >= 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '6px', borderTop: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                  <span>Net Profit (P&L)</span>
                  <span style={{ color: '#059669' }}>₹{balanceSheetBreakdown.netProfit.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', fontWeight: '900', color: '#0f172a' }}>
                <span>Total Liabilities Side</span>
                <span>₹{balanceSheetBreakdown.totalLiabilitiesAndEquity.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <strong style={{ color: '#0369a1', display: 'block', marginBottom: '8px' }}>Assets (संपत्तियां)</strong>
              {balanceSheetBreakdown.assets.length === 0 ? (
                <div style={{ color: '#94a3b8' }}>No asset balances.</div>
              ) : (
                balanceSheetBreakdown.assets.map((a, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #f1f5f9' }}>
                    <span>{a.name}</span>
                    <strong>₹{a.amount.toFixed(2)}</strong>
                  </div>
                ))
              )}
              {balanceSheetBreakdown.netProfit < 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '6px', borderTop: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                  <span>Net Loss (P&L)</span>
                  <span style={{ color: '#dc2626' }}>₹{Math.abs(balanceSheetBreakdown.netProfit).toFixed(2)}</span>
                </div>
              )}
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
                Closing Stock Valuation (Ref): <strong>₹{Number(reportData.balanceSheet?.closingStock || 0).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', marginTop: '6px', borderTop: '1px solid #cbd5e1', fontWeight: '900', color: '#0f172a' }}>
                <span>Total Assets Side</span>
                <span>₹{balanceSheetBreakdown.totalAssets.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'GST_SUMMARY' && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>🧾 GSTR Tax Summary ({gstSummary.invoiceCount} Invoices)</h3>
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>Total Taxable Sales Value: <strong>₹{gstSummary.taxableSales.toFixed(2)}</strong></div>
            <div>Output CGST Total: <strong>₹{gstSummary.outputCgst.toFixed(2)}</strong></div>
            <div>Output SGST Total: <strong>₹{gstSummary.outputSgst.toFixed(2)}</strong></div>
            <div>Total Output GST Liability: <strong>₹{gstSummary.outputTax.toFixed(2)}</strong></div>
            <div style={{ marginTop: '8px', padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '8px', color: '#166534', fontWeight: 'bold' }}>
              Gross Sales (Inc. Tax): ₹{gstSummary.grossSales.toFixed(2)}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
