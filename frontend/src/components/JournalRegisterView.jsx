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
    if (window.confirm("Delete this entry? Ledger will adjust automatically.")) {
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
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>📖 General Journal Register (Day Book)</h3>

      {editingVoucher && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleSaveEdit} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', maxWidth: '360px', width: '100%' }}>
            <h4>✏️ Edit Voucher Entry</h4>
            <input type="text" value={editDr} onChange={e => setEditDr(e.target.value)} style={inputStyle} placeholder="Dr Account" required />
            <input type="text" value={editCr} onChange={e => setEditCr(e.target.value)} style={inputStyle} placeholder="Cr Account" required />
            <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} style={inputStyle} placeholder="Amount" required />
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
              <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px' }}>Save</button>
              <button type="button" onClick={() => setEditingVoucher(null)} style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ backgroundColor: '#0f172a', color: '#fff' }}>
            <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
            <th style={{ padding: '8px', textAlign: 'center' }}>Voucher Type</th>
            <th style={{ padding: '8px', textAlign: 'left' }}>Particulars (Dr / Cr)</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>Amount (₹)</th>
            <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {vouchers.length === 0 ? (
            <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
              <td style={{ padding: '8px' }}>2026-08-31</td>
              <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>JOURNAL</td>
              <td style={{ padding: '8px' }}>
                <div>Dr: <span onClick={() => onSelectAccount && onSelectAccount('Cash-in-Hand A/C')} style={linkStyle}>Cash-in-Hand A/C</span></div>
                <div>Cr: <span onClick={() => onSelectAccount && onSelectAccount('Rk')} style={linkStyle}>Rk</span></div>
              </td>
              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#1e3a8a' }}>₹10000.00</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>
                <button onClick={() => handleOpenEdit({ id: 'DEMO-1', dr_account: 'Cash-in-Hand A/C', cr_account: 'Rk', amount: 10000 })} style={btnStyle('#2563eb')}>✏️ Edit</button>
                <button onClick={() => handleDelete('DEMO-1')} style={btnStyle('#ef4444')}>🗑️ Delete</button>
              </td>
            </tr>
          ) : (
            vouchers.map(v => (
              <tr key={v.id} style={{ borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ padding: '8px' }}>{v.date || '2026-08-31'}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{v.voucher_type || 'JOURNAL'}</td>
                <td style={{ padding: '8px' }}>
                  <div>Dr: <span onClick={() => onSelectAccount && onSelectAccount(v.dr_account)} style={linkStyle}>{v.dr_account}</span></div>
                  <div>Cr: <span onClick={() => onSelectAccount && onSelectAccount(v.cr_account)} style={linkStyle}>{v.cr_account}</span></div>
                </td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>₹{v.amount}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  <button onClick={() => handleOpenEdit(v)} style={btnStyle('#2563eb')}>✏️ Edit</button>
                  <button onClick={() => handleDelete(v.id)} style={btnStyle('#ef4444')}>🗑️ Delete</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const linkStyle = { color: '#2563eb', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' };
const btnStyle = (bg) => ({ backgroundColor: bg, color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', margin: '0 2px' });
