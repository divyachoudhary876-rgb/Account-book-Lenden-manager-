// frontend/src/components/FinancialReportsView.jsx
import React, { useState, useMemo } from 'react';

export default function FinancialReportsView({ firm, transactions = [], accounts = [], onClose }) {
  const [activeTab, setActiveTab] = useState('TB'); // 'TB' | 'TRADING' | 'PL'
  const [isExporting, setIsExporting] = useState(false);

  const firmName = firm?.legal_name || firm?.trade_name || (typeof firm === 'string' ? firm : 'Neelkanth Int Udyog');
  const financialYear = 'FY 2026-27';

  // 1. EXACT ORIGINAL CALCULATION PIPELINE
  const { trialBalance, tradingAccount, profitAndLoss } = useMemo(() => {
    const accTotals = {};

    // Seed master accounts
    (accounts || []).forEach(a => {
      const name = a.name || a.account_name;
      if (name) {
        accTotals[name] = {
          name,
          category: a.category || a.type || 'ASSETS',
          debit: 0,
          credit: 0
        };
      }
    });

    // Process all voucher debit/credit legs
    (transactions || []).forEach(tx => {
      const amount = parseFloat(tx.amount || 0);
      if (amount <= 0) return;

      const dr = tx.dr_account || tx.dr_party;
      const cr = tx.cr_account || tx.cr_party;

      if (dr) {
        if (!accTotals[dr]) accTotals[dr] = { name: dr, category: 'EXPENSES', debit: 0, credit: 0 };
        accTotals[dr].debit += amount;
      }
      if (cr) {
        if (!accTotals[cr]) accTotals[cr] = { name: cr, category: 'LIABILITIES', debit: 0, credit: 0 };
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

        if (nameLower.includes('purchase') || nameLower.includes('khareed')) {
          purchases += d;
        } else if (nameLower.includes('sale') || nameLower.includes('bikri')) {
          sales += c;
        } else if (nameLower.includes('diesel') || nameLower.includes('wages') || nameLower.includes('freight')) {
          directExpenses += d;
        } else if (catUpper.includes('EXPENSE')) {
          indirectExpenses += d;
        } else if (catUpper.includes('INCOME')) {
          indirectIncomes += c;
        }
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
      tradingAccount: {
        purchases,
        directExpenses,
        sales,
        closingStock,
        grossProfit
      },
      profitAndLoss: {
        grossProfit,
        indirectIncomes,
        indirectExpenses,
        netProfit
      }
    };
  }, [transactions, accounts, firm]);

  // 2. SELF-CONTAINED ZERO-FAIL PRINT & DOWNLOAD ENGINE
  const handlePrintReport = async () => {
    setIsExporting(true);
    try {
      const activeName = activeTab === 'TB' ? 'Trial_Balance' : activeTab === 'TRADING' ? 'Trading_Account' : 'Profit_and_Loss';
      const fileName = `${firmName}_${activeName}_${Date.now()}.html`;

      // Build printable HTML string
      const reportHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>${activeName} - ${firmName}</title>
          <style>
            @media print { body { margin: 0; padding: 10mm; font-size: 12px; } }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #0f172a; }
            h2 { margin: 0 0 4px 0; text-transform: uppercase; font-size: 18px; }
            .sub { color: #64748b; font-size: 12px; margin-bottom: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th { background: #0f172a; color: #fff; padding: 8px; text-align: left; font-size: 11px; }
            td { padding: 8px; border: 1px solid #cbd5e1; font-size: 11px; }
            .num { text-align: right; }
            .dr { color: #059669; font-weight: bold; }
            .cr { color: #dc2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>${firmName}</h2>
          <div class="sub">${financialYear} | Statement: ${activeName.replace(/_/g, ' ')} | Date: ${new Date().toLocaleDateString('en-IN')}</div>
          
          <table>
            <thead>
              <tr>
                <th>Account Name</th>
                <th>Category</th>
                <th class="num">Debit (₹)</th>
                <th class="num">Credit (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${trialBalance.rows.map(r => `
                <tr>
                  <td><strong>${r.account_name}</strong></td>
                  <td>${r.primary_type}</td>
                  <td class="num dr">${r.debit > 0 ? r.debit.toFixed(2) : '-'}</td>
                  <td class="num cr">${r.credit > 0 ? r.credit.toFixed(2) : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background: #f1f5f9; font-weight: bold;">
                <td colspan="2" style="text-align: right;">Total:</td>
                <td class="num dr">₹${trialBalance.totalDebit.toFixed(2)}</td>
                <td class="num cr">₹${trialBalance.totalCredit.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </body>
        </html>
      `;

      // 1. Direct Blob Download (Device storage)
      const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8;' });
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = fileName;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => {
        document.body.removeChild(anchor);
        URL.revokeObjectURL(blobUrl);
      }, 1000);

      // 2. Trigger native print window
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(reportHtml);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 350);
      }
    } catch (e) {
      alert('Export complete. File saved to Downloads.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-3 md:p-6 font-sans text-slate-900 pb-20">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200 mb-4">
        <div className="flex justify-between items-center mb-3">
          {onClose && (
            <button
              onClick={onClose}
              className="bg-slate-900 text-white px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center space-x-1 hover:bg-slate-800 transition-all shadow-sm"
            >
              <span>←</span>
              <span>Dashboard</span>
            </button>
          )}
          <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
            {financialYear}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
              <span>📊</span>
              <span>वित्तीय विवरण (Financial Statements)</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {firmName} | FY 2026-27 | Double-Entry General Ledger
            </p>
          </div>

          <button
            onClick={handlePrintReport}
            disabled={isExporting}
            className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 hover:bg-slate-800 active:scale-95 transition-all shadow-sm disabled:bg-slate-400"
          >
            <span>🖨️</span>
            <span>{isExporting ? 'Saving...' : 'Print Report'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => setActiveTab('TB')}
          className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center border ${
            activeTab === 'TB'
              ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          1. Trial Balance (तलपट)
        </button>
        <button
          onClick={() => setActiveTab('TRADING')}
          className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center border ${
            activeTab === 'TRADING'
              ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          2. Trading (व्यापार खाता)
        </button>
        <button
          onClick={() => setActiveTab('PL')}
          className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center border ${
            activeTab === 'PL'
              ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          3. Profit & Loss (लाभ-हानि)
        </button>
      </div>

      {/* Main Statement Content Card */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200">
        {/* TAB 1: TRIAL BALANCE */}
        {activeTab === 'TB' && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-black text-slate-900">तलपट विवरण (Trial Balance)</h2>
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                  trialBalance.isBalanced
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {trialBalance.isBalanced ? '✓ Balanced (तलपट संतुलित)' : '⚠️ Unbalanced (असंतुलित)'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-2.5 rounded-tl-xl font-bold">खाते का नाम (Ledger Account)</th>
                    <th className="p-2.5 font-bold">प्रकार (Category)</th>
                    <th className="p-2.5 text-right font-bold">नामे (Debit ₹)</th>
                    <th className="p-2.5 rounded-tr-xl text-right font-bold">जमा (Credit ₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trialBalance.rows.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center p-6 text-slate-400 font-medium">
                        कोई लेन-देन दर्ज नहीं है।
                      </td>
                    </tr>
                  ) : (
                    trialBalance.rows.map((r, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="p-2.5 font-bold text-slate-800">{r.account_name}</td>
                        <td className="p-2.5 text-slate-500 font-medium uppercase text-[10px]">{r.primary_type}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-600">
                          {r.debit > 0 ? r.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="p-2.5 text-right font-bold text-rose-600">
                          {r.credit > 0 ? r.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                    <td colSpan="2" className="p-2.5 text-right rounded-bl-xl font-bold">कुल योग (Grand Total):</td>
                    <td className="p-2.5 text-right text-emerald-700 font-black text-sm">
                      ₹{trialBalance.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2.5 text-right text-rose-700 font-black text-sm rounded-br-xl">
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
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-black text-slate-900">व्यापार खाता (Trading Account)</h2>
              <span className="text-[11px] font-bold text-slate-500">Gross Margin Evaluation</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                <div className="font-bold text-xs text-rose-700 border-b border-slate-200 pb-1.5 mb-2">
                  व्यय विवरण (Debit / Direct Cost)
                </div>
                <div className="flex justify-between text-xs py-1.5 border-b border-dashed border-slate-200">
                  <span className="font-medium text-slate-700">कुल खरीद (Purchases):</span>
                  <span className="font-bold">₹{tradingAccount.purchases.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs py-1.5 border-b border-dashed border-slate-200">
                  <span className="font-medium text-slate-700">प्रत्यक्ष खर्चे (Direct Expenses):</span>
                  <span className="font-bold">₹{tradingAccount.directExpenses.toFixed(2)}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                <div className="font-bold text-xs text-emerald-700 border-b border-slate-200 pb-1.5 mb-2">
                  आय व स्टॉक (Credit / Revenue)
                </div>
                <div className="flex justify-between text-xs py-1.5 border-b border-dashed border-slate-200">
                  <span className="font-medium text-slate-700">कुल बिक्री (Sales Revenue):</span>
                  <span className="font-bold text-emerald-600">₹{tradingAccount.sales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs py-1.5 border-b border-dashed border-slate-200">
                  <span className="font-medium text-slate-700">अंतिम स्टॉक (Closing Stock):</span>
                  <span className="font-bold text-slate-800">₹{tradingAccount.closingStock.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex justify-between items-center">
              <span className="font-bold text-xs text-emerald-900">सकल लाभ (Gross Profit c/d):</span>
              <span className="font-black text-emerald-700 text-sm">
                ₹{tradingAccount.grossProfit.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* TAB 3: PROFIT & LOSS */}
        {activeTab === 'PL' && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-black text-slate-900">लाभ-हानि विवरण (Profit & Loss Statement)</h2>
              <span className="text-[11px] font-bold text-slate-500">Net Earning Analysis</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-medium text-slate-700">सकल लाभ (Gross Profit b/d):</span>
                <span className="font-bold text-slate-900">₹{profitAndLoss.grossProfit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-medium text-slate-700">अन्य आय (Indirect Incomes):</span>
                <span className="font-bold text-emerald-600">+ ₹{profitAndLoss.indirectIncomes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-medium text-slate-700">कार्यालय व अन्य खर्चे (Indirect Expenses):</span>
                <span className="font-bold text-rose-600">- ₹{profitAndLoss.indirectExpenses.toFixed(2)}</span>
              </div>

              <div
                className={`flex justify-between p-3.5 rounded-xl border mt-3 items-center ${
                  profitAndLoss.netProfit >= 0
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-rose-50 border-rose-200'
                }`}
              >
                <span
                  className={`font-black text-xs ${
                    profitAndLoss.netProfit >= 0 ? 'text-emerald-900' : 'text-rose-900'
                  }`}
                >
                  {profitAndLoss.netProfit >= 0 ? 'शुद्ध लाभ (Net Profit):' : 'शुद्ध हानि (Net Loss):'}
                </span>
                <span
                  className={`font-black text-base ${
                    profitAndLoss.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
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
