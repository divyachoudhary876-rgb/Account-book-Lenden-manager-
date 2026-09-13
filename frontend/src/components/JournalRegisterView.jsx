// frontend/src/components/JournalRegisterView.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { downloadJournalRegisterPDF } from '../utils/pdfDownloadEngine.js';

export default function JournalRegisterView({ firm, onClose }) {
  const activeFirmId = firm?.id || firm?.firm_id || 'FIRM-001';
  const [journalEntries, setJournalEntries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('ASC');
  const [isExporting, setIsExporting] = useState(false);
  const [statusNotification, setStatusNotification] = useState(null);

  const loadJournal = () => {
    try {
      let rawTx = [];
      const keysToScan = [
        'account_book_vouchers',
        'app_vouchers',
        'app_payroll_entries',
        `account_book_vouchers_${activeFirmId}`,
        `app_vouchers_${activeFirmId}`
      ];

      keysToScan.forEach(k => {
        try {
          const val = StorageService.getItem ? StorageService.getItem(k) : JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(val)) rawTx.push(...val);
        } catch (e) {}
      });

      const uniqueMap = new Map();
      rawTx.forEach(tx => {
        if (!tx) return;
        const vFirm = tx.firm_id || activeFirmId;
        if (vFirm !== activeFirmId && vFirm !== 'FIRM-001' && activeFirmId !== 'FIRM-001') return;

        const uId = tx.id || tx.reference_no || `${tx.voucher_date || tx.date}-${Math.random()}`;
        if (!uniqueMap.has(uId)) {
          let drAcc = 'Account';
          let crAcc = 'Account';
          let totalAmt = Number(tx.amount || tx.total_amount || 0);

          if (Array.isArray(tx.entries) && tx.entries.length >= 2) {
            const dr = tx.entries.find(e => (e.type || '').toUpperCase() === 'DR' || Number(e.debit || 0) > 0);
            const cr = tx.entries.find(e => (e.type || '').toUpperCase() === 'CR' || Number(e.credit || 0) > 0);
            if (dr) drAcc = (dr.account_name || dr.party || 'Account').trim();
            if (cr) crAcc = (cr.account_name || cr.party || 'Account').trim();
            if (totalAmt <= 0) totalAmt = Number(dr?.amount || dr?.debit || 0);
          } else {
            drAcc = (tx.dr_account || tx.debit_account || 'Account').trim();
            crAcc = (tx.cr_account || tx.credit_account || 'Account').trim();
          }

          uniqueMap.set(uId, {
            ...tx,
            voucher_date: tx.voucher_date || tx.date || '2026-09-13',
            voucher_type: String(tx.voucher_type || tx.type || 'JV').toUpperCase(),
            reference_no: tx.reference_no || tx.voucher_number || (tx.id ? tx.id.slice(-6) : '1001'),
            dr_account: drAcc,
            cr_account: crAcc,
            amount: totalAmt
          });
        }
      });

      const sorted = Array.from(uniqueMap.values()).sort((a, b) => {
        const dateA = new Date(a.voucher_date || 0);
        const dateB = new Date(b.voucher_date || 0);
        return sortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
      });

      setJournalEntries(sorted);
    } catch (err) {
      console.error("Error loading journal:", err);
    }
  };

  useEffect(() => {
    loadJournal();
    window.addEventListener('app_storage_updated', loadJournal);
    window.addEventListener('storage', loadJournal);
    return () => {
      window.removeEventListener('app_storage_updated', loadJournal);
      window.removeEventListener('storage', loadJournal);
    };
  }, [activeFirmId, sortOrder]);

  const filteredEntries = journalEntries.filter(entry => {
    if (!entry) return false;
    const q = searchQuery.toLowerCase();
    return (
      (entry.reference_no && entry.reference_no.toLowerCase().includes(q)) ||
      (entry.dr_account && entry.dr_account.toLowerCase().includes(q)) ||
      (entry.cr_account && entry.cr_account.toLowerCase().includes(q)) ||
      (entry.narration && entry.narration.toLowerCase().includes(q))
    );
  });

  const totalDebit = filteredEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalCredit = totalDebit;

  const handleExportPDF = async () => {
    if (filteredEntries.length === 0) {
      alert("⚠️ No records found to export.");
      return;
    }

    setIsExporting(true);
    setStatusNotification({ type: 'info', message: '⏳ Generating PDF...' });

    try {
      await downloadJournalRegisterPDF(firm, filteredEntries);
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
      
      {/* Original Daybook Header */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '16px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>CHRONOLOGICAL AUDIT BOOK</div>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>📖 General Journal / Daybook</h2>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
              style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {sortOrder === 'ASC' ? '📅 Oldest ➔ Newest' : '📅 Newest ➔ Oldest'}
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isExporting || filteredEntries.length === 0}
              style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              <span>📄</span> {isExporting ? 'Saving...' : 'Save PDF'}
            </button>
            {onClose && <button onClick={onClose} style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Close</button>}
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <input 
            type="text" 
            placeholder="🔍 Search account, ref no, narration..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '10px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase' }}>TOTAL DEBIT (नामे)</div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: '#059669', marginTop: '2px' }}>₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase' }}>TOTAL CREDIT (जमा)</div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: '#dc2626', marginTop: '2px' }}>₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>

      {/* Original Daybook Entry Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredEntries.length === 0 ? (
          <div style={{ backgroundColor: '#fff', textAlign: 'center', padding: '40px', borderRadius: '16px', color: '#94a3b8', fontSize: '13px', border: '1px solid #e2e8f0' }}>
            No journal entries found matching criteria.
          </div>
        ) : (
          filteredEntries.map((entry, idx) => {
            const amt = Number(entry.amount || 0);
            const vType = String(entry.voucher_type || 'JV').toUpperCase();

            return (
              <div key={entry.id || idx} style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxSizing: 'border-box' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', color: '#475569' }}>{entry.voucher_date}</span>
                    <span style={{ fontSize: '10px', backgroundColor: '#059669', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: '800' }}>{vType}</span>
                    <strong style={{ fontSize: '12px', color: '#0f172a' }}>#{entry.reference_no}</strong>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>
                    Dr: <span style={{ color: '#059669' }}>{entry.dr_account}</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                    Cr: <span style={{ color: '#dc2626' }}>{entry.cr_account}</span>
                  </div>

                  {entry.narration && (
                    <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>{entry.narration}</div>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a' }}>₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
