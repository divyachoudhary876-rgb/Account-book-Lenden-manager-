// frontend/src/components/JournalRegisterView.jsx

import React, { useState, useEffect } from 'react';
import { downloadElementAsPDF } from '../utils/pdfDownloadEngine.js';

export default function JournalRegisterView({ firm }) {
  const [entries, setEntries] = useState([]);
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('app_journal_entries') || '[]');
    setEntries(stored);
  }, []);

  const filteredEntries = entries.filter(e => {
    const matchesType = filterType === 'ALL' || e.voucher_type === filterType;
    const matchesSearch = !searchTerm || 
      (e.account_name && e.account_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.narration && e.narration.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      
      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>📖 General Journal Register (Day Book)</h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Firm: {firm?.legal_name || 'Active Business'}</span>
        </div>

        <button
          onClick={() => downloadElementAsPDF('printable_journal_area', 'Journal_Register_DayBook')}
          style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
        >
          📲 Download & Print PDF
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '16px' }}>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={inputStyle}>
          <option value="ALL">All Voucher Types</option>
          <option value="PAYMENT">Payment Vouchers</option>
          <option value="RECEIPT">Receipt Vouchers</option>
          <option value="SALES">Sales Vouchers</option>
          <option value="JOURNAL">Journal Vouchers</option>
        </select>

        <input
          type="text"
          placeholder="Search Account or Narration..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Clean Journal Table Without Voucher Ref */}
      <div id="printable_journal_area" style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
          <h4 style={{ margin: 0, color: '#0f172a' }}>{firm?.legal_name || 'Account Book'}</h4>
          <span style={{ fontSize: '11px', color: '#64748b' }}>GENERAL JOURNAL REGISTER / DAY BOOK</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ ...thStyle, width: '18%' }}>Date</th>
              <th style={{ ...thStyle, width: '18%' }}>Voucher Type</th>
              <th style={{ ...thStyle, width: '40%' }}>Particulars (Account & Narration)</th>
              <th style={{ ...thStyle, textAlign: 'right', width: '12%' }}>Debit (₹)</th>
              <th style={{ ...thStyle, textAlign: 'right', width: '12%' }}>Credit (₹)</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                  No journal entries found.
                </td>
              </tr>
            ) : (
              filteredEntries.map((item, idx) => (
                <tr key={item.id || idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={tdStyle}>{item.entry_date || '30/08/2026'}</td>
                  <td style={tdStyle}>
                    <span style={badgeStyle(item.voucher_type)}>{item.voucher_type || 'GENERAL'}</span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{item.account_name || 'General Entry'}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{item.narration || '-'}</div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', color: item.debit > 0 ? '#10b981' : '#64748b' }}>
                    {item.debit > 0 ? `₹${parseFloat(item.debit).toFixed(2)}` : '-'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', color: item.credit > 0 ? '#ef4444' : '#64748b' }}>
                    {item.credit > 0 ? `₹${parseFloat(item.credit).toFixed(2)}` : '-'}
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

const inputStyle = { padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' };
const thStyle = { padding: '10px', textAlign: 'left', fontWeight: 'bold', fontSize: '11px' };
const tdStyle = { padding: '10px', verticalAlign: 'top' };
const badgeStyle = (type) => ({
  padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
  backgroundColor: type === 'PAYMENT' ? '#fee2e2' : type === 'RECEIPT' ? '#d1fae5' : '#e0f2fe',
  color: type === 'PAYMENT' ? '#991b1b' : type === 'RECEIPT' ? '#065f46' : '#075985'
});
