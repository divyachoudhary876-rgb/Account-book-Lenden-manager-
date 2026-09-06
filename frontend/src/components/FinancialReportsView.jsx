// frontend/src/components/FinancialReportsView.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import { downloadFinancialReportPDF } from '../utils/pdfDownloadEngine.js';

export default function FinancialReportsView({ firm, onClose }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const firmName = firm?.legal_name || firm?.trade_name || firm?.name || 'Neelkanth Groups';

  const [activeTab, setActiveTab] = useState('TRIAL_BALANCE'); // TRIAL_BALANCE, TRADING, PNL
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
      // 1. Fetch Vouchers & Transactions from all possible storage keys
      let rawTx = [];
      ['account_book_vouchers', 'vouchers', 'transactions', 'journal_entries', 'voucher_list'].forEach(k => {
        const val = StorageService.getItem(k);
        if (Array.isArray(val)) rawTx.push(...val);
      });

      const firmVouchers = rawTx.filter(v => v && (!v.firm_id || v.firm_id === activeFirmId));

      // Compute Closing Stock from Inventory
      const inventory = StorageService.getItem('inventory_items') || StorageService.getInventoryItems() || [];
      const firmInventory = inventory.filter(i => !i.firm_id || i.firm_id === activeFirmId);
      const closingStockValue = firmInventory.reduce((sum, item) => {
        const stock = Number(item.current_stock || item.stock || 0);
        const rate = Number(item.unit_purchase_price || item.rate || 0);
        return sum + (stock * rate);
      }, 0);

      // Ledger Map for Trial Balance
      const ledgerMap = {};
      const addLedger = (accName, drAmt, crAmt) => {
        if (!accName) return;
        const cleanName = String(accName).trim();
        if (!ledgerMap[cleanName]) {
          ledgerMap[cleanName] = { name: cleanName, debit: 0, credit: 0, type: 'GENERAL' };
        }
        ledgerMap[cleanName].debit += Number(drAmt || 0);
        ledgerMap[cleanName].credit += Number(crAmt || 0);
      };

      let totalPurchases = 0;
      let totalSales = 0;

      firmVouchers.forEach(v => {
        const amt = Number(v.amount || v.total_amount || v.net_amount || 0);
        if (amt <= 0) return;
        
        // Extended support for multiple field names for accounts
        const dr = v.dr_account || v.dr_party || v.debit_account || v.debit_ledger || v.account_dr;
        const cr = v.cr_account || v.cr_party || v.credit_account || v.credit_ledger || v.account_cr;
        const vType = String(v.voucher_type || v.type || v.category || '').toUpperCase();

        if (dr && cr) {
          addLedger(dr, amt, 0);
          addLedger(cr, 0, amt);
        } else {
          // If individual ledger fields aren't strictly split, map based on type
          if (vType.includes('PURCHASE') || vType.includes('PUR') || vType.includes('PURCH')) {
            addLedger('Purchase A/c', amt, 0);
          } else if (vType.includes('SALE') || vType.includes('SELL') || vType.includes('REV')) {
            addLedger('Sales & Revenue', 0, amt);
          }
        }

        if (vType.includes('PURCHASE') || vType.includes('PUR')) {
          totalPurchases += amt;
        }
        if (vType.includes('SALE') || vType.includes('SELL')) {
          totalSales += amt;
        }
      });

      // Format Trial Balance Rows with intelligent classification
      const tbRows = Object.values(ledgerMap).map(l => {
        const net = l.debit - l.credit;
        const lowerName = l.name.toLowerCase();
        let category = 'EXPENSES';

        if (lowerName.includes('cash') || lowerName.includes('bank') || lowerName.includes('asset') || lowerName.includes('stock')) {
          category = 'ASSETS';
        } else if (lowerName.includes('capital') || lowerName.includes('liability') || lowerName.includes('creditor') || lowerName.includes('loan')) {
          category = 'LIABILITIES';
        } else if (lowerName.includes('sale') || lowerName.includes('revenue') || lowerName.includes('income')) {
          category = 'INCOME';
        }

        return {
          name: l.name,
          category: category,
          dr: net > 0 ? net : 0,
          cr: net < 0 ? Math.abs(net) : (l.debit === 0 ? l.credit : 0)
        };
      });

      const tDr = tbRows.reduce((s, r) => s + r.dr, 0);
      const tCr = tbRows.reduce((s, r) => s + r.cr, 0);

      // Trading Account Math
      const grossResult = (totalSales + closingStockValue) - totalPurchases;

      // P&L Math
      const netResult = grossResult; // Simplified for initial setup

      setReportData({
        trialBalance: tbRows,
        totalDebit: tDr,
        totalCredit: tCr,
        isBalanced: Math.abs(tDr - tCr) < 1,
        trading: { purchases: totalPurchases, directExpenses: 0, sales: totalSales, closingStock: closingStockValue, grossResult },
        pnl: { grossProfit: grossResult, indirectIncomes: 0, indirectExpenses: 0, netResult }
      });

    } catch (e) {
      console.error("Error computing financial reports:", e);
    }
  };

  useEffect(() => {
    computeFinancials();
    window.addEventListener('app_storage_updated', computeFinancials);
    window.addEventListener('app_state_updated', computeFinancials);
    return () => {
      window.removeEventListener('app_storage_updated', computeFinancials);
      window.removeEventListener('app_state_updated', computeFinancials);
    };
  }, [activeFirmId]);

  const handleExportPDF = async () => {
    setIsExporting(true);
    setStatusNotification({ type: 'info', message: '⏳ Generating Financial Report PDF...' });

    try {
      const res = await downloadFinancialReportPDF(reportData, activeTab, firm);
      if (res?.success) {
        setStatusNotification({ type: 'success', message: '✓ Financial Report PDF downloaded successfully!' });
      } else {
        setStatusNotification(null);
      }
    } catch (e) {
      setStatusNotification({ type: 'error', message: `❌ Export Failed: ${e.message}` });
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatusNotification(null), 5000);
    }
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', boxSizing: 'border-box', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Header & Export Action */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>Enterprise General Ledger</div>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>📊 वित्तीय विवरण (Financial Statements)</h2>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', opacity: isExporting ? 0.7 : 1 }}
            >
              <span>📄</span> {isExporting ? 'Saving...' : 'Save PDF'}
            </button>
            {onClose && <button onClick={onClose} style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Close</button>}
          </div>
        </div>

        {statusNotification && (
          <div style={{ backgroundColor: statusNotification.type === 'error' ? '#fef2f2' : '#ecfdf5', color: statusNotification.type === 'error' ? '#991b1b' : '#065f46', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', marginBottom: '12px' }}>
            {statusNotification.message}
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
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

      {/* Tab Content 1: Trial Balance */}
      {activeTab === 'TRIAL_BALANCE' && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>तलपट विवरण (Trial Balance)</h3>
            <span style={{ fontSize: '11px', backgroundColor: reportData.isBalanced ? '#f0fdf4' : '#fef2f2', color: reportData.isBalanced ? '#166534' : '#991b1b', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold' }}>
              {reportData.isBalanced ? '✓ Balanced (संतुलित)' : '⚠ Unbalanced'}
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#fff' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>खाते का नाम (Account Name)</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>प्रकार</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>नामे (Dr ₹)</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>जमा (Cr ₹)</th>
              </tr>
            </thead>
            <tbody>
              {reportData.trialBalance.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#0f172a' }}>{row.name}</td>
                  <td style={{ padding: '10px', color: '#64748b' }}>{row.category}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{row.dr > 0 ? row.dr.toFixed(2) : '-'}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>{row.cr > 0 ? row.cr.toFixed(2) : '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f1f5f9', fontWeight: '900' }}>
                <td colSpan={2} style={{ padding: '12px' }}>कुल योग (Total)</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#059669' }}>₹{reportData.totalDebit.toFixed(2)}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#dc2626' }}>₹{reportData.totalCredit.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Tab Content 2: Trading Account */}
      {activeTab === 'TRADING' && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>व्यापार खाता (Trading Account)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ backgroundColor: '#fef2f2', padding: '16px', borderRadius: '12px', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#991b1b', textTransform: 'uppercase', marginBottom: '8px' }}>व्यय विवरण (Debit / Direct Cost)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span>कुल खरीद (Purchases):</span>
                <strong>₹{reportData.trading.purchases.toFixed(2)}</strong>
              </div>
            </div>

            <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase', marginBottom: '8px' }}>आय व स्टॉक (Credit / Revenue)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span>कुल बिक्री (Sales):</span>
                <strong>₹{reportData.trading.sales.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>अंतिम स्टॉक (Closing Stock):</span>
                <strong>+ ₹{reportData.trading.closingStock.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #cbd5e1' }}>
            <span style={{ fontWeight: 'bold', color: '#0f172a' }}>सकल लाभ / हानि (Gross Profit / Loss):</span>
            <span style={{ fontSize: '16px', fontWeight: '900', color: reportData.trading.grossResult >= 0 ? '#059669' : '#dc2626' }}>
              ₹{reportData.trading.grossResult.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Tab Content 3: Profit & Loss */}
      {activeTab === 'PNL' && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>लाभ-हानि विवरण (Profit & Loss Statement)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-name', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span>सकल लाभ b/d (Gross Profit):</span>
              <strong>₹{reportData.pnl.grossProfit.toFixed(2)}</strong>
            </div>
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
