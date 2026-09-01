// frontend/src/components/JournalRegisterView.jsx

import React, { useState, useEffect } from 'react';
import { getFirmVouchers } from '../utils/journalEngine.js';
import { downloadJournalPDF } from '../utils/pdfDownloadEngine.js';

export default function JournalRegisterView({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const firmName = firm?.legal_name || 'Neelkanth Enterprise';

  const [vouchers, setVouchers] = useState([]);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadVouchers = () => {
    const list = getFirmVouchers(activeFirmId);
    setVouchers(list);
  };

  useEffect(() => {
    loadVouchers();
    window.addEventListener('app_state_updated', loadVouchers);
    return () => window.removeEventListener('app_state_updated', loadVouchers);
  }, [firm, activeFirmId]);

  const filtered = vouchers.filter(v => {
    const matchesType = filterType === 'ALL' || v.voucher_type === filterType;
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (v.dr_account || '').toLowerCase().includes(query) ||
      (v.cr_account || '').toLowerCase().includes(query) ||
      (v.narration || '').toLowerCase().includes(query) ||
      (v.id || '').toLowerCase().includes(query);
    return matchesType && matchesSearch;
  });

  const totalAmount = filtered.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>📖 General Journal / Day Book</h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Firm: {firmName} | Entries: {filtered.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={() => downloadJournalPDF(firmName, filtered, filterType)} 
            style={{ backgroundColor: '#dc2626', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            📄 Download Journal PDF
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '14px' }}>
        <input type="text" placeholder="🔍 Search voucher, party, narration..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={inputStyle} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={inputStyle}>
          <option value="ALL">All Vouchers</option>
          <option value="SALES">Sales Invoices</option>
          <option value="PURCHASE">Purchase Inward</option>
          <option value="JOURNAL">General Journal</option>
        </select>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '600px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '9px 10px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '9px 10px', textAlign: 'left' }}>Type</th>
              <th style={{ padding: '9px 10px', textAlign: 'left' }}>Dr / Cr Accounts</th>
              <th style={{ padding: '9px 10px', textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No entries found.</td></tr>
            ) : (
              filtered.map(v => (
                <tr key={v.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '9px 10px', whiteSpace: 'nowrap' }}>{v.voucher_date || v.date}</td>
                  <td style={{ padding: '9px 10px' }}>
                    <span style={{ backgroundColor: v.voucher_type === 'SALES' ? '#dbeafe' : v.voucher_type === 'PURCHASE' ? '#dcfce7' : '#f1f5f9', color: v.voucher_type === 'SALES' ? '#1e40af' : v.voucher_type === 'PURCHASE' ? '#166534' : '#334155', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                      {v.voucher_type}
                    </span>
                  </td>
                  <td style={{ padding: '9px 10px' }}>
                    <div><strong>Dr:</strong> <span style={{ color: '#b91c1c' }}>{v.dr_account}</span></div>
                    <div><strong>Cr:</strong> <span style={{ color: '#15803d' }}>{v.cr_account}</span></div>
                    {v.narration && <div style={{ fontSize: '10px', color: '#64748b' }}>{v.narration}</div>}
                  </td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 'bold' }}>₹{parseFloat(v.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };
