// frontend/src/components/VoucherEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { executeVoucherPosting } from '../utils/voucherPostingEngine';

export default function VoucherEntryForm() {
  const [accounts, setAccounts] = useState([]);
  const [voucherType, setVoucherType] = useState('PAYMENT');
  const [drAccountId, setDrAccountId] = useState('');
  const [crAccountId, setCrAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = () => {
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
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsPosting(true);

    try {
      executeVoucherPosting({
        voucherType,
        drAccountId,
        crAccountId,
        amount,
        narration,
        date: entryDate
      });

      alert('✓ Voucher Entry Successfully Posted! Account Milan, Ledger, aur Dashboard updates ready hain.');
      setAmount('');
      setNarration('');
      loadAccounts(); // Dropdown balances update
    } catch (err) {
      alert(`❌ Posting Error: ${err.message}`);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: '650px', margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>📒 Double-Entry Voucher Posting Engine</h3>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Voucher Type *</label>
            <select value={voucherType} onChange={(e) => setVoucherType(e.target.value)} style={inputStyle}>
              <option value="PAYMENT">Payment Voucher (PV)</option>
              <option value="RECEIPT">Receipt Voucher (RV)</option>
              <option value="JOURNAL">Journal Voucher (JV)</option>
              <option value="CONTRA">Contra Entry (CV)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Posting Date *</label>
            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} style={inputStyle} required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ ...labelStyle, color: '#16a34a' }}>Debit Account (Dr / Received By) *</label>
            <select value={drAccountId} onChange={(e) => setDrAccountId(e.target.value)} style={inputStyle} required>
              <option value="">-- Select Debit Account --</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (Bal: ₹{parseFloat(acc.current_balance || acc.opening_balance || 0).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ ...labelStyle, color: '#dc2626' }}>Credit Account (Cr / Paid By) *</label>
            <select value={crAccountId} onChange={(e) => setCrAccountId(e.target.value)} style={inputStyle} required>
              <option value="">-- Select Credit Account --</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (Bal: ₹{parseFloat(acc.current_balance || acc.opening_balance || 0).toFixed(2)})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Amount (₹) *</label>
            <input 
              type="number" 
              step="0.01" 
              placeholder="0.00" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              style={inputStyle} 
              required 
            />
          </div>
          <div>
            <label style={labelStyle}>Narration / Particulars</label>
            <input 
              type="text" 
              placeholder="Being payment made towards..." 
              value={narration} 
              onChange={(e) => setNarration(e.target.value)} 
              style={inputStyle} 
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isPosting}
          style={{ 
            marginTop: '10px', 
            padding: '12px', 
            backgroundColor: isPosting ? '#94a3b8' : '#2563eb', 
            color: '#ffffff', 
            border: 'none', 
            borderRadius: '8px', 
            fontWeight: 'bold', 
            fontSize: '14px', 
            cursor: isPosting ? 'wait' : 'pointer' 
          }}
        >
          {isPosting ? '⏳ General Ledger Me Post Ho Raha Hai...' : '💾 Save & Post Voucher Entry'}
        </button>

      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' };
