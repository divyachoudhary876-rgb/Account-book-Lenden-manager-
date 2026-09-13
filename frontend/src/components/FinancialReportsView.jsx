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

      // 2. सभी स्टोरेज कीज़ और पेरोल प्रविष्टियों को एक साथ स्कैन करें
      let rawTx = [];
      const keysToScan = [
        'account_book_vouchers',
        'app_vouchers',
        'vouchers',
        'transactions',
        'daybook',
        'journal_entries',
        'app_payroll_entries',
        `account_book_vouchers_${activeFirmId}`,
        `app_vouchers_${activeFirmId}`,
        `app_payroll_entries_${activeFirmId}`
      ];

      keysToScan.forEach(k => {
        const val = StorageService.getItem ? StorageService.getItem(k) : JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(val)) rawTx.push(...val);
      });

      // लोकल स्टोरेज का डीप स्कैन
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('voucher') || key.includes('transaction') || key.includes('entry') || key.includes('payroll') || key.includes('daybook'))) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) rawTx.push(...parsed);
              else if (parsed && typeof parsed === 'object') {
                if (Array.isArray(parsed.vouchers)) rawTx.push(...parsed.vouchers);
                if (Array.isArray(parsed.entries)) rawTx.push(...parsed.entries);
              }
            } catch (err) {}
          }
        }
      }

      // 3. डेटा प्रोसेस करें (चाहे वह पेरोल एंट्री हो या जर्नल वाउचर)
      rawTx.forEach(v => {
        if (!v) return;
        if (v.firm_id && activeFirmId && v.firm_id !== activeFirmId && v.firm_id !== 'FIRM-001' && activeFirmId !== 'FIRM-001') return;

        // यदि यह डायरेक्ट पेरोल एंट्री है
        if (v.worker && v.expense_ledger && v.total_amount) {
          const workerName = String(v.worker).trim();
          const expenseName = String(v.expense_ledger).trim();
          const amt = Number(v.total_amount || 0);

          if (amt > 0) {
            if (!ledgerMap[expenseName]) {
              ledgerMap[expenseName] = { name: expenseName, category: 'EXPENSES', debit: 0, credit: 0 };
            }
            ledgerMap[expenseName].debit += amt;

            if (!ledgerMap[workerName]) {
              ledgerMap[workerName] = { name: workerName, category: 'LIABILITIES', debit: 0, credit: 0 };
            }
            ledgerMap[workerName].credit += amt;
          }
          return;
        }

        // यदि यह वाउचर (entries array) है
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

      setReportData({
        trialBalance: tbRows,
        totalDebit: tDr,
        totalCredit: tCr,
        isBalanced: Math.abs(tDr - tCr) < 1,
        trading: { purchases: 0, directExpenses: 0, sales: 0, closingStock: 0, grossResult: 0 },
        pnl: { grossProfit: 0, indirectIncomes: 0, indirectExpenses: 0, netResult: 0 }
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
  }, [activeFirmId]);

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>📊 वित्तीय विवरण (Financial Statements)</h2>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>तलपट विवरण (Trial Balance)</h3>
          <span style={{ fontSize: '11px', backgroundColor: reportData.isBalanced ? '#f0fdf4' : '#fef2f2', color: reportData.isBalanced ? '#166534' : '#991b1b', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold' }}>
            {reportData.isBalanced ? '✓ Balanced (संतुलित)' : '⚠ Unbalanced'}
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#fff' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>खाते का नाम</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>नामे (Dr ₹)</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>जमा (Cr ₹)</th>
            </tr>
          </thead>
          <tbody>
            {reportData.trialBalance.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>{row.name}</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#059669' }}>{row.dr > 0 ? row.dr.toFixed(2) : '-'}</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#dc2626' }}>{row.cr > 0 ? row.cr.toFixed(2) : '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#f1f5f9', fontWeight: '900' }}>
              <td style={{ padding: '12px' }}>कुल योग (Total)</td>
              <td style={{ padding: '12px', textAlign: 'right', color: '#059669' }}>₹{reportData.totalDebit.toFixed(2)}</td>
              <td style={{ padding: '12px', textAlign: 'right', color: '#dc2626' }}>₹{reportData.totalCredit.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
