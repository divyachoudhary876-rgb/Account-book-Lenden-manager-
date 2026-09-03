// frontend/src/components/FinancialReportsView.jsx
import React, { useState, useMemo } from 'react';

export default function FinancialReportsView({ firm, transactions = [], accounts = [], onClose }) {
  const [activeTab, setActiveTab] = useState('TB'); // 'TB' | 'TRADING' | 'PL'
  const [isExporting, setIsExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState(null);

  const firmName = firm?.legal_name || firm?.trade_name || (typeof firm === 'string' ? firm : 'Neelkanth Int Udyog');
  const financialYear = 'FY 2026-27';

  // Double-Entry Ledger Calculation Engine
  const { trialBalance, tradingAccount, profitAndLoss } = useMemo(() => {
    let allTx = Array.isArray(transactions) && transactions.length > 0 ? [...transactions] : [];

    if (allTx.length === 0) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.includes('voucher') || key.includes('transaction') || key.includes('daybook') || key.includes('entry')) {
            const parsed = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(parsed)) allTx.push(...parsed);
            else if (parsed && typeof parsed === 'object') {
              if (Array.isArray(parsed.vouchers)) allTx.push(...parsed.vouchers);
              if (Array.isArray(parsed.transactions)) allTx.push(...parsed.transactions);
            }
          }
        }
      } catch (e) {}
    }

    const accTotals = {};
    (accounts || []).forEach(a => {
      const name = a.name || a.account_name;
      if (name) {
        accTotals[name] = { name, category: a.category || a.type || 'ASSETS', debit: 0, credit: 0 };
      }
    });

    const deduceCategory = (accName) => {
      const n = String(accName).toLowerCase();
      if (n.includes('diesel') || n.includes('petrol') || n.includes('wages') || n.includes('freight') || n.includes('expense') || n.includes('loan')) {
        return 'EXPENSES';
      }
      if (n.includes('driver') || n.includes('payable') || n.includes('supplier')) {
        return 'LIABILITIES';
      }
      if (n.includes('cash') || n.includes('bank') || n.includes('debtor')) {
        return 'ASSETS';
      }
      return 'LIABILITIES';
    };

    allTx.forEach(tx => {
      const amount = parseFloat(tx.amount || tx.total_amount || 0);
      if (amount <= 0 || isNaN(amount)) return;

      const dr = tx.dr_account || tx.dr_party || tx.debit_party;
      const cr = tx.cr_account || tx.cr_party || tx.credit_party;

      if (dr) {
        if (!accTotals[dr]) accTotals[dr] = { name: dr, category: deduceCategory(dr), debit: 0, credit: 0 };
        accTotals[dr].debit += amount;
      }
      if (cr) {
        if (!accTotals[cr]) accTotals[cr] = { name: cr, category: deduceCategory(cr), debit: 0, credit: 0 };
        accTotals[cr].credit += amount;
      }
    });

    let totalDebit = 0;
    let totalCredit = 0;
    const tbRows = [];

    let purchases = 0;
    let directExpenses = 0;
    let sales = 0;
    let closingStock = parseFloat(firm?.closing_stock || 0);
    let indirectExpenses = 0;
    let indirectIncomes = 0;

    Object.values(accTotals).forEach(acc => {
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
        const catUpper = String(acc.category).toUpperCase();

        if (nameLower.includes('purchase') || nameLower.includes('khareed')) purchases += d;
        else if (nameLower.includes('sale') || nameLower.includes('bikri')) sales += c;
        else if (nameLower.includes('diesel') || nameLower.includes('wages') || nameLower.includes('freight')) directExpenses += d;
        else if (catUpper.includes('EXPENSE')) indirectExpenses += d;
        else if (catUpper.includes('INCOME')) indirectIncomes += c;
      }
    });

    const grossProfit = sales + closingStock - (purchases + directExpenses);
    const netProfit = grossProfit + indirectIncomes - indirectExpenses;

    return {
      trialBalance: {
        rows: tbRows.sort((a, b) => a.account_name.localeCompare(b.account_name)),
        totalDebit,
        totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
      },
      tradingAccount: { purchases, directExpenses, sales, closingStock, grossProfit },
      profitAndLoss: { grossProfit, indirectIncomes, indirectExpenses, netProfit }
    };
  }, [transactions, accounts, firm]);

  // Robust HTML Print & Download Handler
  const handlePrintReport = async () => {
    setIsExporting(true);
    setExportFeedback(null);
    try {
      const activeName = activeTab === 'TB' ? 'Trial_Balance' : activeTab === 'TRADING' ? 'Trading_Account' : 'Profit_and_Loss';
      const cleanFileName = `${firmName}_${activeName}_${Date.now()}.html`;

      const rowsHtml = trialBalance.rows.map(r => `
        <tr>
          <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong>${r.account_name}</strong></td>
          <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 11px; color: #64748b;">${r.primary_type}</td>
          <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; color: #059669; font-weight: bold;">
            ${r.debit > 0 ? '₹' + r.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
          </td>
          <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; color: #dc2626; font-weight: bold;">
            ${r.credit > 0 ? '₹' + r.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
          </td>
        </tr>
      `).join('');

      const printableHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>${activeName} -${firmName}</title>
          <style>
            @media print { body { margin: 0; padding: 10mm; font-size: 12px; } }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #0f172a; }
            h2 { margin: 0 0 4px 0; text-transform: uppercase; font-size: 18px; }
            .sub { color: #64748b; font-size: 12px; margin-bottom: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
            th { background: #0f172a; color: #fff; padding: 10px; text-align: left; }
          </style>
        </head>
        <body>
          <h2>${firmName}</h2>
          <div class="sub">${financialYear} | Statement: ${activeName.replace(/_/g, ' ')} \vert{} Date:${new Date().toLocaleDateString('en-IN')}</div>
          <table>
            <thead>
              <tr>
                <th>खाते का नाम (Account)</th>
                <th>प्रकार (Category)</th>
                <th style="text-align: right;">नामे (Debit ₹)</th>
                <th style="text-align: right;">जमा (Credit ₹)</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot>
              <tr style="background: #f1f5f9; font-weight: bold;">
                <td colspan="2" style="padding: 12px; border: 1px solid #cbd5e1; text-align: right;">कुल योग (Total):</td>
                <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: right; color: #059669;">₹${trialBalance.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: right; color: #dc2626;">₹${trialBalance.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        </body>
        </html>
      `;

      let sharedNatively = false;

      try {
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');

        const writeRes = await Filesystem.writeFile({
          path: cleanFileName,
          data: printableHtml,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });

        if (writeRes && writeRes.uri) {
          await Share.share({
            title: activeName,
            text: `${firmName} - Financial Report`,
            url: writeRes.uri,
            dialogTitle: 'Save or Print PDF'
          });
          sharedNatively = true;
          setExportFeedback('✅ रिपोर्ट सफलतापूर्वक शेयर / सहेजी गई।');
        }
      } catch (nativeErr) {}

      if (!sharedNatively) {
        const blob = new Blob([printableHtml], { type: 'text/html;charset=utf-8;' });
        const blobUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = cleanFileName;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();

        setTimeout(() => {
          document.body.removeChild(anchor);
          URL.revokeObjectURL(blobUrl);
        }, 1000);

        const win = window.open('', '_blank');
        if (win) {
          win.document.write(printableHtml);
          win.document.close();
          win.focus();
          setTimeout(() => win.print(), 350);
        }

        setExportFeedback('✅ रिपोर्ट Downloads फोल्डर में सहेज दी गई है।');
      }
    } catch (err) {
      setExportFeedback('❌ एक्सपोर्ट में समस्या आई: ' + (err.message || 'Error'));
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportFeedback(null), 4000);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
      
      {/* Top Header Card */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', marginBottom: '14px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          {onClose && (
            <button
              onClick={onClose}
              style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}
            >
              ← Dashboard
            </button>
          )}
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>
            {financialYear}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ flex: '1 1 200px' }}>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📊</span>
              <span>वित्तीय विवरण (Financial Statements)</span>
            </h1>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', wordBreak: 'break-word' }}>
              {firmName} | General Ledger
            </div>
          </div>

          <button
            onClick={handlePrintReport}
            disabled={isExporting}
            style={{
              backgroundColor: isExporting ? '#94a3b8' : '#0f172a',
              color: '#ffffff',
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '11px',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(15,23,42,0.2)',
              whiteSpace: 'nowrap'
            }}
          >
            <span>🖨️</span>
            <span>{isExporting ? 'प्रतीक्षा करें...' : 'Print Report'}</span>
          </button>
        </div>

        {exportFeedback && (
          <div style={{ marginTop: '10px', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1' }}>
            {exportFeedback}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '14px' }}>
        <button
          onClick={() => setActiveTab('TB')}
          style={{
            padding: '8px 4px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 'bold',
            border: activeTab === 'TB' ? '1px solid #0284c7' : '1px solid #cbd5e1',
            backgroundColor: activeTab === 'TB' ? '#0284c7' : '#ffffff',
            color: activeTab === 'TB' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          1. Trial Balance
        </button>
        <button
          onClick={() => setActiveTab('TRADING')}
          style={{
            padding: '8px 4px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 'bold',
            border: activeTab === 'TRADING' ? '1px solid #0284c7' : '1px solid #cbd5e1',
            backgroundColor: activeTab === 'TRADING' ? '#0284c7' : '#ffffff',
            color: activeTab === 'TRADING' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          2. Trading
        </button>
        <button
          onClick={() => setActiveTab('PL')}
          style={{
            padding: '8px 4px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 'bold',
            border: activeTab === 'PL' ? '1px solid #0284c7' : '1px solid #cbd5e1',
            backgroundColor: activeTab === 'PL' ? '#0284c7' : '#ffffff',
            color: activeTab === 'PL' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          3. Profit & Loss
        </button>
      </div>

      {/* Main Statement Content Card */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
        
        {/* TAB 1: TRIAL BALANCE */}
        {activeTab === 'TB' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
              <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                तलपट विवरण (Trial Balance)
              </h2>
              <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '20px', backgroundColor: trialBalance.isBalanced ? '#ecfdf5' : '#fef2f2', color: trialBalance.isBalanced ? '#047857' : '#b91c1c', border: trialBalance.isBalanced ? '1px solid #a7f3d0' : '1px solid #fecaca' }}>
                {trialBalance.isBalanced ? '✓ Balanced (संतुलित)' : '⚠️ Unbalanced'}
              </span>
            </div>

            {/* Responsive Table Wrapper with Horizontal Scroll */}
            <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '320px', borderCollapse: 'collapse', fontSize: '11px', tableLayout: 'auto' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                    <th style={{ padding: '8px 6px', textAlign: 'left', width: '38%' }}>खाते का नाम</th>
                    <th style={{ padding: '8px 6px', textAlign: 'left', width: '22%' }}>प्रकार</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right', width: '20%' }}>नामे (Dr)</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right', width: '20%' }}>जमा (Cr)</th>
                  </tr>
                </thead>
                <tbody>
                  {trialBalance.rows.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                        कोई लेन-देन दर्ज नहीं है।
                      </td>
                    </tr>
                  ) : (
                    trialBalance.rows.map((r, idx) => (
                      <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 6px', fontWeight: 700, color: '#1e293b', wordBreak: 'break-word' }}>{r.account_name}</td>
                        <td style={{ padding: '8px 6px', color: '#64748b', fontSize: '9px', fontWeight: 600 }}>{r.primary_type}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>
                          {r.debit > 0 ? '₹' + r.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: '#dc2626', whiteSpace: 'nowrap' }}>
                          {r.credit > 0 ? '₹' + r.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 800, borderTop: '2px solid #cbd5e1' }}>
                    <td colSpan="2" style={{ padding: '10px 6px', textAlign: 'right', color: '#0f172a' }}>कुल योग:</td>
                    <td style={{ padding: '10px 6px', textAlign: 'right', color: '#059669', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      ₹{trialBalance.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'right', color: '#dc2626', fontSize: '11px', whiteSpace: 'nowrap' }}>
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
            <div style={{ marginBottom: '10px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              व्यापार खाता (Trading Account)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 'bold', color: '#dc2626', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', marginBottom: '6px', fontSize: '11px' }}>
                  व्यय विवरण (Debit / Direct Cost)
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span>कुल खरीद (Purchases):</span>
                  <strong>₹{tradingAccount.purchases.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span>प्रत्यक्ष खर्चे (Direct Expenses):</span>
                  <strong>₹{tradingAccount.directExpenses.toFixed(2)}</strong>
                </div>
              </div>

              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 'bold', color: '#059669', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', marginBottom: '6px', fontSize: '11px' }}>
                  आय व स्टॉक (Credit / Revenue)
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span>कुल बिक्री (Sales):</span>
                  <strong>₹{tradingAccount.sales.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span>अंतिम स्टॉक (Closing Stock):</span>
                  <strong>₹{tradingAccount.closingStock.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: '11px', color: '#065f46' }}>सकल लाभ (Gross Profit):</span>
              <span style={{ fontWeight: 800, fontSize: '13px', color: '#059669' }}>₹{tradingAccount.grossProfit.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* TAB 3: PROFIT & LOSS */}
        {activeTab === 'PL' && (
          <div>
            <div style={{ marginBottom: '10px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              लाभ-हानि विवरण (Profit & Loss Statement)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span>सकल लाभ (Gross Profit b/d):</span>
                <strong>₹{profitAndLoss.grossProfit.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span>अन्य आय (Indirect Incomes):</span>
                <strong style={{ color: '#059669' }}>+ ₹{profitAndLoss.indirectIncomes.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <span>कार्यालय व अन्य खर्चे (Indirect Expenses):</span>
                <strong style={{ color: '#dc2626' }}>- ₹{profitAndLoss.indirectExpenses.toFixed(2)}</strong>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px',
                borderRadius: '8px',
                marginTop: '8px',
                backgroundColor: profitAndLoss.netProfit >= 0 ? '#ecfdf5' : '#fef2f2',
                border: profitAndLoss.netProfit >= 0 ? '1px solid #a7f3d0' : '1px solid #fecaca'
              }}>
                <span style={{ fontWeight: 800, color: profitAndLoss.netProfit >= 0 ? '#065f46' : '#991b1b' }}>
                  {profitAndLoss.netProfit >= 0 ? 'शुद्ध लाभ (Net Profit):' : 'शुद्ध हानि (Net Loss):'}
                </span>
                <span style={{ fontWeight: 800, fontSize: '14px', color: profitAndLoss.netProfit >= 0 ? '#059669' : '#dc2626' }}>
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
