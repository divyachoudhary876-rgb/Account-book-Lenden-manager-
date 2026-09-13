// frontend/src/components/JournalRegisterView.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';

export default function JournalRegisterView({ firm, onClose }) {
  const activeFirmId = firm?.id || firm?.firm_id || 'FIRM-001';
  const [journalEntries, setJournalEntries] = useState([]);

  const loadJournal = () => {
    try {
      const storageKey = `account_book_vouchers_${activeFirmId}`;
      const rawTx = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const genericTx = JSON.parse(localStorage.getItem('account_book_vouchers') || '[]');

      const combined = [...rawTx, ...genericTx];
      const uniqueMap = new Map();

      combined.forEach(tx => {
        if (!tx) return;
        const uId = tx.id || tx.reference_no;
        if (!uniqueMap.has(uId)) {
          let drAcc = tx.dr_account || 'Account';
          let crAcc = tx.cr_account || 'Account';
          let totalAmt = Number(tx.amount || tx.total_amount || 0);

          if (Array.isArray(tx.entries) && tx.entries.length >= 2) {
            const dr = tx.entries.find(e => (e.type || '').toUpperCase() === 'DR' || Number(e.debit || 0) > 0);
            const cr = tx.entries.find(e => (e.type || '').toUpperCase() === 'CR' || Number(e.credit || 0) > 0);
            if (dr) drAcc = dr.account_name || dr.party || 'Account';
            if (cr) crAcc = cr.account_name || cr.party || 'Account';
            totalAmt = Number(dr?.amount || dr?.debit || totalAmt);
          }

          uniqueMap.set(uId, {
            ...tx,
            voucher_date: tx.voucher_date || tx.date || '2026-09-13',
            voucher_type: String(tx.voucher_type || tx.type || 'JV').toUpperCase(),
            reference_no: tx.reference_no || tx.voucher_number || '1001',
            dr_account: drAcc,
            cr_account: crAcc,
            amount: totalAmt
          });
        }
      });

      setJournalEntries(Array.from(uniqueMap.values()));
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
  }, [activeFirmId]);

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>📖 General Journal / Daybook</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {journalEntries.length === 0 ? (
          <div style={{ backgroundColor: '#fff', textAlign: 'center', padding: '30px', borderRadius: '12px', color: '#94a3b8' }}>
            कोई जर्नल प्रविष्टि नहीं मिली।
          </div>
        ) : (
          journalEntries.map((entry, idx) => (
            <div key={entry.id || idx} style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>{entry.voucher_date} | #{entry.reference_no}</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#059669', marginTop: '4px' }}>Dr: {entry.dr_account}</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#dc2626' }}>Cr: {entry.cr_account}</div>
                {entry.narration && <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>{entry.narration}</div>}
              </div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>
                ₹{Number(entry.amount || 0).toFixed(2)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
