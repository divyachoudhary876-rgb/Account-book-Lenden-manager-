// frontend/src/components/JournalRegisterView.jsx

import React, { useState, useEffect } from 'react';
import { getJournalVouchersByFirm, deleteJournalVoucher, updateJournalVoucher } from '../utils/journalEngine.js';

export default function JournalRegisterView({ firm, onSelectAccount }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [vouchers, setVouchers] = useState([]);
  const [editingVoucher, setEditingVoucher] = useState(null);

  useEffect(() => {
    loadVouchers();
    window.addEventListener('storage', loadVouchers);
    return () => window.removeEventListener('storage', loadVouchers);
  }, [firm]);

  const loadVouchers = () => setVouchers(getJournalVouchersByFirm(activeFirmId));

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>📖 General Journal Register (Day Book)</h3>

      {/* Overflow Wrapper Prevents Cutoff in Image 2 */}
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '450px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Voucher Type</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Particulars (Dr / Cr)</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Amount (₹)</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((v) => (
              <tr key={v.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>{v.date || '2026-08-31'}</td>
                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{v.voucher_type || 'JOURNAL'}</td>
                <td style={{ padding: '10px' }}>
                  <div><strong>Dr:</strong> <span style={{ color: '#2563eb' }}>{v.dr_account}</span></div>
                  <div><strong>Cr:</strong> <span style={{ color: '#2563eb' }}>{v.cr_account}</span></div>
                </td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#1e3a8a', whiteSpace: 'nowrap' }}>
                  ₹{parseFloat(v.amount || 0).toFixed(2)}
                </td>
                <td style={{ padding: '10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <button style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', marginRight: '4px' }}>✏️ Edit</button>
                  <button style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px' }}>🗑️ Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
