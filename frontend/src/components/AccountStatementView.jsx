// frontend/src/components/AccountStatementView.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';
import { downloadAccountStatementPDF } from '../utils/pdfDownloadEngine.js';

export default function AccountStatementView({ firm }) {
  const activeFirmId = firm?.id || firm?.firm_id || 'FIRM-001';
  const firmName = firm?.legal_name || firm?.trade_name || firm?.name || 'Neelkanth Groups';
  const todayMaxDate = new Date().toISOString().split('T')[0];

  const [accounts, setAccounts] = useState([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statementData, setStatementData] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [statusNotification, setStatusNotification] = useState(null);

  const loadData = () => {
    try {
      const accList = getFirmMasterAccounts(activeFirmId) || [];
      setAccounts(accList);
      if (accList.length > 0 && !selectedParty) {
        setSelectedParty(accList[0].name || accList[0].account_name || '');
      }
    } catch (e) {
      console.error("Error loading accounts:", e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_state_updated', loadData);
    window.addEventListener('app_storage_updated', loadData);
    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('app_state_updated', loadData);
      window.removeEventListener('app_storage_updated', loadData);
      window.removeEventListener('storage', loadData);
    };
  }, [activeFirmId]);

  useEffect(() => {
    if (!selectedParty) {
      setStatementData(null);
      return;
    }

    try {
      let rawTx = [];
      const keysToScan = [
        'account_book_vouchers',
        'app_vouchers',
        'transactions',
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

      // Strict Deduplication Map
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
      const targetClean = String(selectedParty).trim().toLowerCase();
      const matchedTransactions = [];

      uniqueVouchers.forEach(v => {
        const vDate = v.voucher_date || v.date || '2026-04-01';
        
        // Date range filtering validation
        if (fromDate && vDate < fromDate) return;
        if (toDate && vDate > toDate) return;

        const vType = String(v.voucher_type || v.type || 'JV').toUpperCase();
        const vNum = v.reference_no || v.voucher_number || (v.id ? v.id.slice(-6) : 'N/A');
        const narration = v.narration || v.notes || v.description || '';

        // Handle Direct Payroll/Wages Entry
        if (v.worker && v.expense_ledger && v.total_amount) {
          if (String(v.worker).trim().toLowerCase() === targetClean) {
            matchedTransactions.push({
              date: vDate,
              voucher_type: 'PAY',
              voucher_number: vNum,
              narration: `Wages via ${v.expense_ledger} [Qty: ${v.quantity} x Rate: ${v.rate}] - ${narration}`,
              debit: 0,
              credit: Number(v.total_amount || 0)
            });
          }
          return;
        }

        // Handle Structured Entries Array
        if (Array.isArray(v.entries) && v.entries.length > 0) {
          let partyDebit = 0;
          let partyCredit = 0;
          let isMatch = false;

          v.entries.forEach(e => {
            const accName = (e.account_name || e.party || '').trim();
            if (accName.toLowerCase() === targetClean) {
              isMatch = true;
              const amt = Number(e.amount || e.debit || e.credit || 0);
              const type = (e.type || '').toUpperCase();
              if (type === 'DR' || Number(e.debit || 0) > 0) partyDebit += amt;
              if (type === 'CR' || Number(e.credit || 0) > 0) partyCredit += amt;
            }
          });

          if (isMatch) {
            matchedTransactions.push({
              date: vDate,
              voucher_type: vType,
              voucher_number: vNum,
              narration: narration,
              debit: partyDebit,
              credit: partyCredit
            });
          }
        } 
        // Handle Flat Format
        else {
          const amt = Number(v.amount || v.total_amount || 0);
          if (amt <= 0) return;
          const dr = (v.dr_account || v.dr_party || v.debit_account || '').trim();
          const cr = (v.cr_account || v.cr_party || v.credit_account || '').trim();

          if (dr.toLowerCase() === targetClean || cr.toLowerCase() === targetClean) {
            matchedTransactions.push({
              date: vDate,
              voucher_type: vType,
              voucher_number: vNum,
              narration: narration,
              debit: dr.toLowerCase() === targetClean ? amt : 0,
              credit: cr.toLowerCase() === targetClean ? amt : 0
            });
          }
        }
      });

      matchedTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

      let runningBal = 0;
      const processedTransactions = matchedTransactions.map(t => {
        runningBal += (t.debit - t.credit);
        return {
          ...t,
          runningBalance: Math.abs(runningBal),
          balanceType: runningBal >= 0 ? 'Dr' : 'Cr'
        };
      });

      const lastClosing = processedTransactions.length > 0 
        ? processedTransactions[processedTransactions.length - 1] 
        : { runningBalance: 0, balanceType: 'Dr' };

      setStatementData({
        openingBalance: 0,
        openingType: 'Dr',
        closingBalance: lastClosing.runningBalance,
        closingType: lastClosing.balanceType,
        transactions: processedTransactions
      });

    } catch (e) {
      console.error("Error generating account statement:", e);
    }
  }, [selectedParty, fromDate, toDate, activeFirmId]);

  const handleExportPDF = async () => {
    if (!statementData || statementData.transactions.length === 0) {
      alert("⚠️ No transactions found to export.");
      return;
    }

    setIsExporting(true);
    setStatusNotification({ type: 'info', message: '⏳ Generating PDF document...' });

    try {
      const res = await downloadAccountStatementPDF(statementData, selectedParty, firm);
      if (res?.success) {
        setStatusNotification({ type: 'success', message: '✓ PDF downloaded successfully!' });
      }
    } catch (e) {
      setStatusNotification({ type: 'error', message: `❌ Export Failed: ${e.message}` });
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatusNotification(null), 4000);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '750px', margin: '0 auto', boxSizing: 'border-box', padding: '0 8px 50px 8px', display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: 'sans-serif' }}>
      
      {/* Header Design */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
              📖 खाता मिलान (Account Statement)
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Double-Entry General Ledger & Real-Time Balance</span>
          </div>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExporting || !statementData || statementData.transactions.length === 0}
            style={{ backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            <span>📄</span> {isExporting ? 'Saving...' : 'Save PDF'}
          </button>
        </div>
      </div>

      {statusNotification && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold' }}>
          {statusNotification.message}
        </div>
      )}

      {/* Account Selector & Date Filters */}
      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <SearchableAccountDropdown
          label="खाता चुनें (Select Party/Account) *"
          accounts={accounts}
          value={selectedParty}
          onChange={val => setSelectedParty(val)}
          placeholder="पार्टी का नाम खोजें..."
          colorAccent="#0284c7"
          required
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>From Date (से)</label>
            <input 
              type="date" 
              max={todayMaxDate}
              value={fromDate} 
              onChange={e => setFromDate(e.target.value)} 
              style={{ width: '100%', padding: '9px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box', backgroundColor: '#fff' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>To Date (तक)</label>
            <input 
              type="date" 
              max={todayMaxDate}
              value={toDate} 
              onChange={e => setToDate(e.target.value)} 
              style={{ width: '100%', padding: '9px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box', backgroundColor: '#fff' }} 
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {statementData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ ...cardStyle, backgroundColor: '#f8fafc' }}>
            <div style={labelStyle}>OPENING BALANCE</div>
            <strong style={{ fontSize: '16px', color: '#0f172a' }}>
              ₹{statementData.openingBalance.toLocaleString('en-IN')} {statementData.openingType}
            </strong>
          </div>
          <div style={{ ...cardStyle, backgroundColor: statementData.closingType === 'Dr' ? '#eff6ff' : '#fef2f2' }}>
            <div style={labelStyle}>NET CLOSING BALANCE</div>
            <strong style={{ fontSize: '16px', color: statementData.closingType === 'Dr' ? '#1d4ed8' : '#b91c1c' }}>
              ₹{statementData.closingBalance.toLocaleString('en-IN')} {statementData.closingType}
            </strong>
          </div>
        </div>
      )}

      {/* Original Ledger Table */}
      <div style={{ ...cardStyle, padding: '12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={thStyle}>तारीख</th>
              <th style={thStyle}>विवरण (Particulars)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>नामे (Dr ₹)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>जमा (Cr ₹)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>बाकी (Balance ₹)</th>
            </tr>
          </thead>
          <tbody>
            {!statementData || statementData.transactions.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  इस खाते में कोई लेन-देन दर्ज नहीं है।
                </td>
              </tr>
            ) : (
              statementData.transactions.map((t, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={tdStyle}>{t.date}</td>
                  <td style={tdStyle}>
                    <strong>{t.voucher_type}</strong> #{t.voucher_number}
                    {t.narration && <div style={{ color: '#64748b', fontSize: '10px' }}>{t.narration}</div>}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: t.debit > 0 ? '#059669' : '#94a3b8', fontWeight: t.debit > 0 ? 'bold' : 'normal' }}>
                    {t.debit > 0 ? t.debit.toFixed(2) : '-'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: t.credit > 0 ? '#dc2626' : '#94a3b8', fontWeight: t.credit > 0 ? 'bold' : 'normal' }}>
                    {t.credit > 0 ? t.credit.toFixed(2) : '-'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', color: t.balanceType === 'Dr' ? '#1d4ed8' : '#b91c1c' }}>
                    {t.runningBalance.toFixed(2)} {t.balanceType}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

const cardStyle = { backgroundColor: '#ffffff', borderRadius: '14px', padding: '16px', border: '1px solid #cbd5e1', boxSizing: 'border-box' };
const labelStyle = { fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' };
const thStyle = { padding: '10px 8px', fontWeight: 'bold' };
const tdStyle = { padding: '10px 8px', verticalAlign: 'top' };
