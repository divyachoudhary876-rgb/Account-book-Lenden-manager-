// frontend/src/components/JournalRegisterView.jsx

import React, { useState, useEffect } from 'react';

export default function JournalRegisterView({ firm }) {
  const activeFirmId = firm?.id;
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    loadJournal();
    const handleStorage = () => loadJournal();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [firm]);

  const loadJournal = () => {
    const targetId = activeFirmId || 'FIRM-001';
    const list = JSON.parse(localStorage.getItem(`app_journal_entries_${targetId}`) || '[]');
    setEntries(list);
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px' }}>📖 General Journal Register (Day Book)</h3>
      
      <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Voucher Type</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Particulars (Dr / Cr)</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                  No journal entries recorded.
                </td>
              </tr>
            ) : (
              entries.map((item, idx) => (
                <tr key={item.id || idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '10px' }}>{item.date}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.voucher_type}</td>
                  <td style={{ padding: '10px' }}>
                    <div><strong>Dr:</strong> {item.debit_account_name || item.debit_account_id}</div>
                    <div><strong>Cr:</strong> {item.credit_account_name || item.credit_account_id}</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{item.narration}</div>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#1e3a8a' }}>
                    ₹{parseFloat(item.amount).toFixed(2)}
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
