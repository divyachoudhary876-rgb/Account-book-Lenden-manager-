// frontend/src/components/JournalRegisterView.jsx

import React, { useState, useEffect } from 'react';
import { getJournalVouchersByFirm, deleteJournalVoucher, updateJournalVoucher } from '../utils/journalEngine.js';

export default function JournalRegisterView({ firm, onSelectAccount }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [vouchers, setVouchers] = useState([]);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [editDr, setEditDr] = useState('');
  const [editCr, setEditCr] = useState('');
  const [editAmount, setEditAmount] = useState('');

  useEffect(() => {
    loadVouchers();
    window.addEventListener('storage', loadVouchers);
    return () => window.removeEventListener('storage', loadVouchers);
  }, [firm]);

  const loadVouchers = () => setVouchers(getJournalVouchersByFirm(activeFirmId));

  const handleDelete = (id) => {
    if (window.confirm("⚠️ Delete this journal voucher entry? Account balance will automatically adjust.")) {
      deleteJournalVoucher(activeFirmId, id);
      loadVouchers();
    }
  };

  const handleOpenEdit = (voucher) => {
    setEditingVoucher(voucher);
    setEditDr(voucher.dr_account || 'Cash-in-Hand A/C');
    setEditCr(voucher.cr_account || 'Rk');
    setEditAmount(voucher.amount || 10000);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    updateJournalVoucher(activeFirmId, {
      ...editingVoucher,
      dr_account: editDr,
      cr_account: editCr,
      amount: parseFloat(editAmount)
    });
    setEditingVoucher(null);
    loadVouchers();
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>📖 General Journal Register (Day Book)</h3>
        <span style={{ fontSize: '11px', color: '#64748b' }}>Firm: {firm?.legal_name || 'Aa (TRADING)'}</span>
      </div>

      {/* Edit Modal Popup */}
      {editingVoucher && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <form onSubmit={handleSaveEdit} style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', maxWidth: '380px', width: '100%', border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 14px 0', color: '#0f172a' }}>✏️ Edit Voucher Entry</h4>
            
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Debit Account (Dr)</label>
              <input type="text" value={editDr} onChange={e => setEditDr(e.target.value)} style={inputStyle} required />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Credit Account (Cr)</label>
              <input type="text" value={editCr} onChange={e => setEditCr(e.target.value)} style={inputStyle} required />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Amount (₹)</label>
              <input type="number" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} style={inputStyle} required />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditingVoucher(null)} style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
              <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {/* Overflow Wrapper Fix to Prevent Table Breakout */}
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '420px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '10px', textAlign: 'left', minWidth: '85px' }}>Date</th>
              <th style={{ padding: '10px', textAlign: 'center', minWidth: '80px' }}>Voucher Type</th>
              <th style={{ padding: '10px', textAlign: 'left', minWidth: '130px' }}>Particulars (Dr / Cr)</th>
              <th style={{ padding: '10px', textAlign: 'right', minWidth: '90px' }}>Amount (₹)</th>
              <th style={{ padding: '10px', textAlign: 'center', minWidth: '110px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((v) => (
              <tr key={v.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>{v.date || '2026-08-31'}</td>
                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{v.voucher_type || 'JOURNAL'}</td>
                <td style={{ padding: '10px' }}>
                  <div><strong>Dr:</strong> <span onClick={() => onSelectAccount && onSelectAccount(v.dr_account)} style={linkStyle}>{v.dr_account}</span></div>
                  <div><strong>Cr:</strong> <span onClick={() => onSelectAccount && onSelectAccount(v.cr_account)} style={linkStyle}>{v.cr_account}</span></div>
                </td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#1e3a8a', whiteSpace: 'nowrap' }}>
                  ₹{parseFloat(v.amount || 0).toFixed(2)}
                </td>
                <td style={{ padding: '10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                    <button onClick={() => handleOpenEdit(v)} style={btnStyle('#2563eb')}>✏️ Edit</button>
                    <button onClick={() => handleDelete(v.id)} style={btnStyle('#ef4444')}>🗑️ Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

const linkStyle = { color: '#2563eb', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' };
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };
const btnStyle = (bg) => ({ backgroundColor: bg, color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' });
