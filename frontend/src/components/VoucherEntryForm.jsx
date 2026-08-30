// frontend/src/components/VoucherEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { getAccountHeadsByFirm } from '../utils/accountMasterEngine.js';
import { postDoubleEntryVoucher } from '../utils/voucherPostingEngine.js';

export default function VoucherEntryForm({ firm }) {
  const activeFirmId = firm?.id;
  const [accounts, setAccounts] = useState([]);
  
  const [voucherType, setVoucherType] = useState('JOURNAL');
  const [debitAcc, setDebitAcc] = useState('');
  const [creditAcc, setCreditAcc] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');

  useEffect(() => {
    loadAccounts();
    const handleStorageChange = () => loadAccounts();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [firm]);

  const loadAccounts = () => {
    const list = getAccountHeadsByFirm(activeFirmId);
    setAccounts(list);
    if (list.length > 0) {
      if (!debitAcc) setDebitAcc(list[0].id);
      if (!creditAcc) setCreditAcc(list[1]?.id || list[0].id);
    }
  };

  const handlePostVoucher = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return alert("❌ Please enter valid Transaction Amount.");
    if (debitAcc === creditAcc) return alert("❌ Debit and Credit Accounts cannot be identical.");

    try {
      postDoubleEntryVoucher(activeFirmId, {
        voucher_type: voucherType,
        debit_account_id: debitAcc,
        credit_account_id: creditAcc,
        amount: amount,
        narration: narration
      });

      alert(`✓ ${voucherType} Voucher of ₹${amount} posted! Entry is now live in Account Statement and Trial Balance.`);
      setAmount('');
      setNarration('');
    } catch (err) {
      alert(`❌ Voucher Posting Error: ${err.message}`);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px' }}>📒 Double-Entry Voucher Posting Engine</h3>

      <form onSubmit={handlePostVoucher} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Select Voucher Entry Type *</label>
          <select value={voucherType} onChange={e => setVoucherType(e.target.value)} style={inputStyle}>
            <option value="JOURNAL">📓 Journal Voucher (General Transfer)</option>
            <option value="PAYMENT">💸 Payment Voucher (Outgoing Cash/Bank)</option>
            <option value="RECEIPT">💰 Receipt Voucher (Incoming Cash/Bank)</option>
            <option value="CONTRA">🏦 Contra Voucher (Cash &lt;-&gt; Bank Transfer)</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Debit Account (Dr) *</label>
            <select value={debitAcc} onChange={e => setDebitAcc(e.target.value)} style={inputStyle}>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>Dr: {a.name} ({a.group_type})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Credit Account (Cr) *</label>
            <select value={creditAcc} onChange={e => setCreditAcc(e.target.value)} style={inputStyle}>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>Cr: {a.name} ({a.group_type})</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Transaction Amount (₹) *</label>
          <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} required />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Narration / Particulars</label>
          <input type="text" placeholder="Particulars of voucher entry..." value={narration} onChange={e => setNarration(e.target.value)} style={inputStyle} />
        </div>

        <button type="submit" style={{ backgroundColor: '#1e3a8a', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
          💾 Save & Post Double-Entry Voucher
        </button>

      </form>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };
