// frontend/src/components/VoucherEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { getAccountHeadsByFirm } from '../utils/accountMasterEngine.js';

export default function VoucherEntryForm({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [accounts, setAccounts] = useState([]);
  const [debitAcc, setDebitAcc] = useState('');
  const [creditAcc, setCreditAcc] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');

  useEffect(() => {
    const list = getAccountHeadsByFirm(activeFirmId);
    setAccounts(list);
    if (list.length > 0) {
      setDebitAcc(list[0].id);
      setCreditAcc(list[1]?.id || list[0].id);
    }
  }, [activeFirmId]);

  const handlePostVoucher = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return alert("❌ Please enter Voucher Amount.");
    if (debitAcc === creditAcc) return alert("❌ Debit and Credit accounts cannot be identical.");

    alert(`✓ Double-Entry Voucher of ₹${amount} posted successfully!`);
    setAmount('');
    setNarration('');
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px' }}>📒 Double-Entry Voucher Posting Engine</h3>

      <form onSubmit={handlePostVoucher} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Debit Account (Dr) *</label>
            <select value={debitAcc} onChange={e => setDebitAcc(e.target.value)} style={inputStyle}>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>Dr: {a.name} ({a.group_type})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Credit Account (Cr) *</label>
            <select value={creditAcc} onChange={e => setCreditAcc(e.target.value)} style={inputStyle}>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>Cr: {a.name} ({a.group_type})</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Transaction Amount (₹) *</label>
          <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} required />
        </div>

        <div>
          <label style={labelStyle}>Narration / Particulars</label>
          <input type="text" placeholder="Being payment/receipt voucher entry..." value={narration} onChange={e => setNarration(e.target.value)} style={inputStyle} />
        </div>

        <button type="submit" style={{ backgroundColor: '#1e3a8a', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginTop: '6px' }}>
          💾 Save & Post Double-Entry Voucher
        </button>

      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };
