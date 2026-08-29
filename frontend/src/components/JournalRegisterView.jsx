// frontend/src/components/JournalRegisterView.jsx

import React, { useState, useEffect } from 'react';
import { getJournalRegisterEntries } from '../utils/journalEngine';
import { downloadElementAsPDF } from '../utils/pdfDownloadEngine';

export default function JournalRegisterView({ firm }) {
  const [entries, setEntries] = useState([]);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

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

  // Direct Browser Print Trigger
  const handlePrint = () => {
    window.print();
  };

  // Mobile Native PDF Download & Share Trigger
  const handlePDFDownload = async () => {
    setIsExporting(true);
    await downloadElementAsPDF('printable-journal-register', `${firm?.legal_name || 'Business'}_Journal_Register`);
    setIsExporting(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Action Bar (Print / PDF Controls) */}
      <div className="no-print" style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#0f172a' }}>📖 General Journal Register (Day Book)</h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Firm: {firm?.legal_name || 'My Business Firm'}</span>
          </div>

          {/* Export Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={handlePrint} 
              style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              🖨️ Print Journal
            </button>
            <button 
              onClick={handlePDFDownload}
              disabled={isExporting} 
              style={{ backgroundColor: isExporting ? '#94a3b8' : '#10b981', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: isExporting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {isExporting ? '⏳ Rendering...' : '📲 Download & Share PDF'}
            </button>
          </div>
        </div>

        {/* Filters & Search Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Filter Voucher Type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={inputStyle}>
              <option value="ALL">All Voucher Types (PV/RV/JV/CV)</option>
              <option value="PAYMENT">Payment Voucher (PV)</option>
              <option value="RECEIPT">Receipt Voucher (RV)</option>
              <option value="JOURNAL">Journal Voucher (JV)</option>
              <option value="CONTRA">Contra Entry (CV)</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Search Journal Records</label>
            <input 
              type="text" 
              placeholder="Search by Particulars, Ref No, or Narration..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              style={inputStyle} 
            />
          </div>
        </div>
      </div>

      {/* Printable Sheet Wrapper */}
      <div id="printable-journal-register" style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
        
        {/* Document Print Header */}
        <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '14px', textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#0f172a' }}>{firm?.legal_name || 'My Business Firm'}</div>
          <div style={{ fontSize: '11px', color: '#475569' }}>GSTIN: {firm?.gstin || 'Unregistered'}</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '6px', color: '#2563eb' }}>GENERAL JOURNAL REGISTER / DAY BOOK</div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>As on {new Date().toLocaleDateString('en-IN')}</div>
        </div>

        {/* Journal Entries Dynamic Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Voucher Ref</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Particulars (Account Head & Narration)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Debit (Dr ₹)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Credit (Cr ₹)</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                  Selected filter me koi Journal entries recorded nahi hain.
                </td>
              </tr>
            ) : (
              entries.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td style={tdStyle}>{item.date}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold', color: '#2563eb' }}>{item.voucher_id}</td>
                  <td style={tdStyle}>
                    <span style={badgeStyle(item.voucher_type)}>{item.voucher_type}</span>
                  </td>
                  <td style={tdStyle}>
                    <strong style={{ color: '#0f172a' }}>{item.account_name}</strong>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{item.narration}</div>
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
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };
const thStyle = { padding: '8px', textAlign: 'left', border: '1px solid #0f172a' };
const tdStyle = { padding: '8px', border: '1px solid #cbd5e1' };

const badgeStyle = (type) => ({
  padding: '2px 6px',
  borderRadius: '4px',
  fontSize: '9px',
  fontWeight: 'bold',
  backgroundColor: type === 'PAYMENT' ? '#fee2e2' : type === 'RECEIPT' ? '#dcfce7' : '#e0f2fe',
  color: type === 'PAYMENT' ? '#991b1b' : type === 'RECEIPT' ? '#166534' : '#075985'
});
