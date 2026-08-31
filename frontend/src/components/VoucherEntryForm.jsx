// frontend/src/components/VoucherEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { getAccountHeads } from '../utils/statementEngine.js';
import { processVoucherEntrySubmission } from '../utils/voucherPostingEngine.js';

export default function VoucherEntryForm({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [accounts, setAccounts] = useState([]);

  const [voucherType, setVoucherType] = useState('JOURNAL');
  const [drAccount, setDrAccount] = useState('');
  const [crAccount, setCrAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');

  useEffect(() => {
    loadAccounts();
    window.addEventListener('storage', loadAccounts);
    window.addEventListener('accounts_master_updated', loadAccounts);
    return () => {
      window.removeEventListener('storage', loadAccounts);
      window.removeEventListener('accounts_master_updated', loadAccounts);
    };
  }, [firm]);

  const loadAccounts = () => {
    const list = getAccountHeads(activeFirmId);
    setAccounts(list);
    if (list.length > 0) {
      if (!drAccount) setDrAccount(list[0].account_name);
      if (!crAccount) setCrAccount(list[1]?.account_name || list[0].account_name);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!drAccount || !crAccount) {
      alert("⚠️ Please select Accounts from dropdowns!");
      return;
    }
    try {
      const payload = { voucher_type: voucherType, dr_account: drAccount, cr_account: crAccount, amount, narration };
      const created = processVoucherEntrySubmission(activeFirmId, payload);
      alert(`✓ Voucher ${created.id} Posted Successfully!`);
      setAmount(''); setNarration('');
    } catch (err) { alert(err.message); }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>📒 Double-Entry Voucher Posting</h3>

      <form onSubmit={handleSubmit} style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
        
        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>Select Voucher Type *</label>
          <select value={voucherType} onChange={e => setVoucherType(e.target.value)} style={inputStyle}>
            <option value="JOURNAL">JOURNAL VOUCHER (JV)</option>
            <option value="PAYMENT">PAYMENT VOUCHER (PV / PMT)</option>
            <option value="RECEIPT">RECEIPT VOUCHER (RV / RCT)</option>
            <option value="SALES">SALES VOUCHER (SV)</option>
            <option value="PURCHASE">PURCHASE VOUCHER (PUR)</option>
            <option value="CONTRA">CONTRA VOUCHER (Cash ↔ Bank)</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label style={labelStyle}>Debit Account (Dr) (From Chart of Accounts) *</label>
            <select value={drAccount} onChange={e => setDrAccount(e.target.value)} style={inputStyle} required>
              {accounts.length === 0 ? (
                <option value="">No Accounts Available</option>
              ) : (
                accounts.map(a => (
                  <option key={a.id} value={a.account_name}>{a.account_name} ({a.account_group || 'GENERAL'})</option>
                ))
              )}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Credit Account (Cr) (From Chart of Accounts) *</label>
            <select value={crAccount} onChange={e => setCrAccount(e.target.value)} style={inputStyle} required>
              {accounts.length === 0 ? (
                <option value="">No Accounts Available</option>
              ) : (
                accounts.map(a => (
                  <option key={a.id} value={a.account_name}>{a.account_name} ({a.account_group || 'GENERAL'})</option>
                ))
              )}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={labelStyle}>Amount (₹) *</label>
          <input type="number" step="0.01" placeholder="Enter Amount" value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} required />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Narration / Particulars</label>
          <input type="text" placeholder="Transaction description..." value={narration} onChange={e => setNarration(e.target.value)} style={inputStyle} />
        </div>

        <button type="submit" style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', width: '100%', cursor: 'pointer' }}>
          💾 Post Voucher Entry
        </button>
      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff', marginBottom: '8px' };
