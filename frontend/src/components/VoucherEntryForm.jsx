// frontend/src/components/VoucherEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { processVoucherPosting } from '../utils/voucherPostingEngine';

export default function VoucherEntryForm({ firm }) {
  const [accounts, setAccounts] = useState([]);
  const [voucherType, setVoucherType] = useState('PAYMENT');
  const [drAccountId, setDrAccountId] = useState('');
  const [crAccountId, setCrAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
      setAccounts(saved);
      if (saved.length >= 2) {
        setDrAccountId(saved[0].id);
        setCrAccountId(saved[1].id);
      }
    } catch (e) {
      setAccounts([]);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (drAccountId === crAccountId) {
      return alert('Debit and Credit Account Heads cannot be identical.');
    }

    try {
      processVoucherPosting({ voucherType, drAccountId, crAccountId, amount, narration, date: entryDate });
      alert('✓ Voucher entry successfully posted!');
      setAmount('');
      setNarration('');
    } catch (err) {
      alert(`Posting Error: ${err.message}`);
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: '650px', margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>📒 Voucher Entry Form</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <select value={voucherType} onChange={(e) => setVoucherType(e.target.value)} style={inputStyle}>
          <option value="PAYMENT">Payment Voucher</option>
          <option value="RECEIPT">Receipt Voucher</option>
          <option value="JOURNAL">Journal Voucher</option>
          <option value="CONTRA">Contra Entry</option>
        </select>
        <select value={drAccountId} onChange={(e) => setDrAccountId(e.target.value)} style={inputStyle} required>
          <option value="">Select Debit Account</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={crAccountId} onChange={(e) => setCrAccountId(e.target.value)} style={inputStyle} required>
          <option value="">Select Credit Account</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input type="number" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} required />
        <input type="text" placeholder="Narration" value={narration} onChange={(e) => setNarration(e.target.value)} style={inputStyle} />
        <button type="submit" style={{ padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
          Save & Post Entry
        </button>
      </form>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' };
