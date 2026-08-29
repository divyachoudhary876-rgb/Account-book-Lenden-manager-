// frontend/src/components/VoucherEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { processVoucherPosting } from '../utils/voucherPostingEngine';

export default function VoucherEntryForm({ firm }) {
  const [accounts, setAccounts] = useState([]);
  const [voucherType, setVoucherType] = useState('PAYMENT'); // PAYMENT, RECEIPT, JOURNAL, CONTRA
  const [drAccountId, setDrAccountId] = useState('');
  const [crAccountId, setCrAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleVoucherSubmit = (e) => {
    e.preventDefault();
    if (drAccountId === crAccountId) {
      return alert('❌ Error: Debit aur Credit Account Heads bilkul SAME nahi ho sakte!');
    }

    setIsSubmitting(true);
    try {
      processVoucherPosting({
        voucherType,
        drAccountId,
        crAccountId,
        amount,
        narration,
        date: entryDate
      });

      alert('✓ Voucher Entry Successfully Posted to General Ledger & Account Milan!');
      setAmount('');
      setNarration('');
      loadAccounts(); // Reload balance state
    } catch (err) {
      alert(`❌ Posting Failure: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: '700px', margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>📒 Accounting Voucher Entry & Posting</h3>

      <form onSubmit={handleVoucherSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Voucher Type Selector */}
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
            <label style={labelStyle}>Voucher Date *</label>
            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} style={inputStyle} required />
          </div>
        </div>

        {/* Debit & Credit Accounts Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ ...labelStyle, color: '#16a34a' }}>Debit Account (Dr / Receiving) *</label>
            <select value={drAccountId} onChange={(e) => setDrAccountId(e.target.value)} style={inputStyle} required>
              <option value="">-- Select Debit Account --</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} (Bal: ₹{parseFloat(acc.current_balance || acc.opening_balance || 0).toFixed(2)})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ ...labelStyle, color: '#dc2626' }}>Credit Account (Cr / Giving) *</label>
            <select value={crAccountId} onChange={(e) => setCrAccountId(e.target.value)} style={inputStyle} required>
              <option value="">-- Select Credit Account --</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} (Bal: ₹{parseFloat(acc.current_balance || acc.opening_balance || 0).toFixed(2)})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount & Narration */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Amount (₹) *</label>
            <input type="number" step="0.01" placeholder="5000.00" value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Narration / Particulars Description</label>
            <input type="text" placeholder="Being payment made against Invoice #102..." value={narration} onChange={(e) => setNarration(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Submit & Auto-Post Button */}
        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{ 
            marginTop: '10px', 
            padding: '12px', 
            backgroundColor: isSubmitting ? '#94a3b8' : '#2563eb', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '8px', 
            fontWeight: 'bold', 
            fontSize: '14px', 
            cursor: isSubmitting ? 'wait' : 'pointer' 
          }}
        >
          {isSubmitting ? '⏳ Ledger Me Post Ho Raha Hai...' : '💾 Save & Post Voucher Entry'}
        </button>

      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' };
