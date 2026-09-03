// frontend/src/components/FinancialReportsView.jsx
import React, { useState, useMemo } from 'react';
import { downloadFinancialStatementsReport } from '../utils/pdfDownloadEngine.js';

export default function FinancialReportsView({ firm, transactions = [], accounts = [], onClose }) {
  const [activeTab, setActiveTab] = useState('TB'); // 'TB' | 'TRADING' | 'PL'
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState(null);

  // Financial Year and Metadata
  const firmName = firm?.legal_name || firm?.trade_name || (typeof firm === 'string' ? firm : 'Neelkanth Int Udyog');
  const financialYear = 'FY 2026-27';

  // 1. Process Double-Entry Ledger Aggregates
  const financialData = useMemo(() => {
    const accountMap = {};

    // Populate with registered accounts first
    accounts.forEach((acc) => {
      accountMap[acc.name] = {
        name: acc.name,
        category: acc.category || acc.type || 'ASSETS',
        debit: 0,
        credit: 0
      };
    });

    // Aggregate ledger debit/credit balances
    transactions.forEach((tx) => {
      const amt = parseFloat(tx.amount || 0);
      if (amt <= 0) return;

      const drParty = tx.dr_account || tx.dr_party;
      const crParty = tx.cr_account || tx.cr_party;

      if (drParty) {
        if (!accountMap[drParty]) {
          accountMap[drParty] = { name: drParty, category: 'EXPENSES', debit: 0, credit: 0 };
        }
        accountMap[drParty].debit += amt;
      }

      if (crParty) {
        if (!accountMap[crParty]) {
          accountMap[crParty] = { name: crParty, category: 'LIABILITIES', debit: 0, credit: 0 };
        }
        accountMap[crParty].credit += amt;
      }
    });

    // Calculate net debit / net credit per account
    let totalDebit = 0;
    let totalCredit = 0;
    const tbRows = [];

    let totalPurchases = 0;
    let directExpenses = 0;
    let totalSales = 0;
    let closingStock = parseFloat(firm?.closing_stock || 0);

    let indirectExpenses = 0;
    let indirectIncomes = 0;

    Object.values(accountMap).forEach((acc) => {
      const net = acc.debit - acc.credit;
      let d = 0;
      let c = 0;

      if (net > 0) {
        d = net;
        totalDebit += net;
      } else if (net < 0) {
        c = Math.abs(net);
        totalCredit += c;
      }

      if (d > 0 || c > 0) {
        tbRows.push({
          account_name: acc.name,
          primary_type: acc.category,
          debit: d,
          credit: c
        });

        // Group into Trading / P&L components
        const lowerCat = String(acc.category).toUpperCase();
        const lowerName = String(acc.name).toLowerCase();

        if (lowerCat.includes('PURCHASE') || lowerName.includes('purchase') || lowerName.includes('raw material')) {
          totalPurchases += d;
        } else if (lowerCat.includes('SALE') || lowerName.includes('sales') || lowerName.includes('revenue')) {
          totalSales += c;
        } else if (lowerCat.includes('DIRECT_EXPENSE') || lowerName.includes('wages') || lowerName.includes('freight') || lowerName.includes('diesel')) {
          directExpenses += d;
        } else if (lowerCat.includes('INDIRECT_EXPENSE') || lowerCat.includes('EXPENSES')) {
          indirectExpenses += d;
        } else if (lowerCat.includes('INDIRECT_INCOME') || lowerCat.includes('INCOME')) {
          indirectIncomes += c;
        }
      }
    });

    // Trading Calculations
    const costOfGoodsSold = totalPurchases + directExpenses - closingStock;
    const grossProfit = totalSales - costOfGoodsSold;

    // Profit & Loss Calculations
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
  }, [transactions, accounts, firm]);

  // Safe Export Trigger
  const handlePrintReport = async () => {
    try {
      setIsExporting(true);
      setExportMessage(null);

      const success = await downloadFinancialStatementsReport(firm, financialData, activeTab);

      if (success) {
        setExportMessage('✅ रिपोर्ट सफलतापूर्वक डाउनलोड / शेयर की गई।');
      } else {
        setExportMessage('ℹ️ रिपोर्ट डिवाइस स्टोरेज में सहेज दी गई है।');
      }
    } catch (err) {
      console.error('Export Error:', err);
      setExportMessage('❌ एक्सपोर्ट विफल: ' + (err.message || 'कृपया दोबारा प्रयास करें।'));
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportMessage(null), 5000);
    }
  };

  const { trialBalance, tradingAccount, profitAndLoss } = financialData;

  return (
    <div className="bg-slate-50 min-h-screen p-3 md:p-6 font-sans text-slate-900 pb-20">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200 mb-4">
        <div className="flex justify-between items-center mb-3">
          <button
            onClick={onClose}
            className="bg-slate-900 text-white px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center space-x-1 hover:bg-slate-800 active:scale-95 transition-all shadow-sm"
          >
            <span>←</span>
            <span>Dashboard</span>
          </button>
          <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
            {financialYear}
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
              <span>📊</span>
              <span>वित्तीय विवरण (Financial Statements)</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {firmName} | Double-Entry General Ledger System
            </p>
          </div>

          <button
            onClick={handlePrintReport}
            disabled={isExporting}
            className={`w-full md:w-auto px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-sm ${
              isExporting
                ? 'bg-slate-400 text-white cursor-not-allowed'
                : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'
            }`}
          >
            <span>🖨️</span>
            <span>{isExporting ? 'Generating Report...' : 'Print Report'}</span>
          </button>
        </div>

        {/* Alert Notification Toast */}
        {exportMessage && (
          <div className="mt-3 p-2.5 rounded-xl text-xs font-semibold bg-slate-100 border border-slate-300 text-slate-800 transition-all animate-fadeIn">
            {exportMessage}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
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
              <h2 className="text-sm font-black text-slate-900">
                तलपट विवरण (Trial Balance)
              </h2>
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
              {/* Debit Side (Direct Expenses) */}
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

              {/* Credit Side (Sales & Stock) */}
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

        {/* TAB 3: PROFIT & LOSS ACCOUNT */}
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
