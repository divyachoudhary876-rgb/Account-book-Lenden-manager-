// frontend/src/components/JournalRegisterView.jsx

import React, { useState, useEffect } from 'react';
import { getJournalRegisterEntries } from '../utils/journalEngine';

export default function JournalRegisterView({ firm }) {
  const [entries, setEntries] = useState([]);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadJournal = () => {
    const data = getJournalRegisterEntries(filterType, searchQuery);
    setEntries(data);
  };

  useEffect(() => {
    loadJournal();

    window.addEventListener('ACCOUNT_BOOK_VOUCHER_POSTED', loadJournal);
    window.addEventListener('storage', loadJournal);

    return () => {
      window.removeEventListener('ACCOUNT_BOOK_VOUCHER_POSTED', loadJournal);
      window.removeEventListener('storage', loadJournal);
    };
  }, [filterType, searchQuery]);

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f172a' }}>📖 General Journal Register (Day Book)</h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Firm: {firm?.legal_name || 'My Business'}</span>
        </div>

        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={inputStyle}>
            <option value="ALL">All Voucher Types</option>
            <option value="PAYMENT">Payment (PV)</option>
            <option value="RECEIPT">Receipt (RV)</option>
            <option value="JOURNAL">Journal (JV)</option>
            <option value="CONTRA">Contra (CV)</option>
          </select>

          <input 
            type="text" 
            placeholder="Search Particulars / Ref No..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            style={inputStyle} 
          />
        </div>
      </div>

      {/* Journal Table Display */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Voucher Ref</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Particulars (Account Head)</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Debit (Dr ₹)</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Credit (Cr ₹)</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                No Journal entries recorded yet.
              </td>
            </tr>
          ) : (
            entries.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={tdStyle}>{item.date}</td>
                <td style={{ ...tdStyle, fontWeight: 'bold', color: '#2563eb' }}>{item.voucher_id}</td>
                <td style={tdStyle}>
                  <span style={badgeStyle(item.voucher_type)}>{item.voucher_type}</span>
                </td>
                <td style={tdStyle}>
                  <strong>{item.account_name}</strong>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>{item.narration}</div>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: item.debit > 0 ? '#16a34a' : '#94a3b8', fontWeight: item.debit > 0 ? 'bold' : 'normal' }}>
                  {item.debit > 0 ? `₹${item.debit.toFixed(2)}` : '-'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: item.credit > 0 ? '#dc2626' : '#94a3b8', fontWeight: item.credit > 0 ? 'bold' : 'normal' }}>
                  {item.credit > 0 ? `₹${item.credit.toFixed(2)}` : '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const inputStyle = { padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' };
const thStyle = { padding: '10px', textAlign: 'left', border: '1px solid #0f172a' };
const tdStyle = { padding: '10px', border: '1px solid #cbd5e1' };

const badgeStyle = (type) => ({
  padding: '2px 6px',
  borderRadius: '4px',
  fontSize: '10px',
  fontWeight: 'bold',
  backgroundColor: type === 'PAYMENT' ? '#fee2e2' : type === 'RECEIPT' ? '#dcfce7' : '#e0f2fe',
  color: type === 'PAYMENT' ? '#991b1b' : type === 'RECEIPT' ? '#166534' : '#075985'
});
