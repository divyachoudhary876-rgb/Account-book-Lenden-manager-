// frontend/src/components/VoucherEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { getAccountHeads } from '../utils/statementEngine.js';
import { processCompoundVoucherSubmission } from '../utils/voucherPostingEngine.js';

export default function VoucherEntryForm({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [accounts, setAccounts] = useState([]);

  // Header State
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherType, setVoucherType] = useState('JOURNAL');
  const [narration, setNarration] = useState('');

  // Multi-Line Dynamic States (Split Dr/Cr)
  const [debitLines, setDebitLines] = useState([{ account_name: '', amount: '' }]);
  const [creditLines, setCreditLines] = useState([{ account_name: '', amount: '' }]);

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
      if (!debitLines[0].account_name) {
        setDebitLines([{ account_name: list[0].account_name, amount: '' }]);
      }
      if (!creditLines[0].account_name) {
        setCreditLines([{ account_name: list[1]?.account_name || list[0].account_name, amount: '' }]);
      }
    }
  };

  // Handlers for Adding & Removing Lines
  const addDebitLine = () => {
    const defaultAcc = accounts.length > 0 ? accounts[0].account_name : '';
    setDebitLines([...debitLines, { account_name: defaultAcc, amount: '' }]);
  };

  const removeDebitLine = (index) => {
    if (debitLines.length === 1) return;
    setDebitLines(debitLines.filter((_, i) => i !== index));
  };

  const addCreditLine = () => {
    const defaultAcc = accounts.length > 0 ? accounts[0].account_name : '';
    setCreditLines([...creditLines, { account_name: defaultAcc, amount: '' }]);
  };

  const removeCreditLine = (index) => {
    if (creditLines.length === 1) return;
    setCreditLines(creditLines.filter((_, i) => i !== index));
  };

  // Calculations
  const totalDebit = debitLines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
  const totalCredit = creditLines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = totalDebit > 0 && difference < 0.01;

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      const payload = {
        voucher_date: voucherDate,
        voucher_type: voucherType,
        debit_lines: debitLines,
        credit_lines: creditLines,
        narration
      };

      const created = processCompoundVoucherSubmission(activeFirmId, payload);
      alert(`✓ Compound Voucher ${created.id} Posted Successfully!`);
      
      // Reset Form Lines
      if (accounts.length > 0) {
        setDebitLines([{ account_name: accounts[0].account_name, amount: '' }]);
        setCreditLines([{ account_name: accounts[1]?.account_name || accounts[0].account_name, amount: '' }]);
      }
      setNarration('');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px' }}>📒 Split / Compound Voucher Posting</h3>

      <form onSubmit={handleSubmit}>
        
        {/* Header Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div>
            <label style={labelStyle}>Voucher Date *</label>
            <input type="date" value={voucherDate} onChange={e => setVoucherDate(e.target.value)} style={inputStyle} required />
          </div>

          <div>
            <label style={labelStyle}>Voucher Type *</label>
            <select value={voucherType} onChange={e => setVoucherType(e.target.value)} style={inputStyle}>
              <option value="JOURNAL">JOURNAL VOUCHER (JV)</option>
              <option value="PAYMENT">PAYMENT VOUCHER (PV / PMT)</option>
              <option value="RECEIPT">RECEIPT VOUCHER (RV / RCT)</option>
              <option value="SALES">SALES VOUCHER (SV)</option>
              <option value="PURCHASE">PURCHASE VOUCHER (PUR)</option>
              <option value="CONTRA">CONTRA VOUCHER (Cash ↔ Bank)</option>
            </select>
          </div>
        </div>

        {/* SECTION 1: DEBIT LINES (Dr) */}
        <div style={{ backgroundColor: '#ecfdf5', padding: '12px', borderRadius: '8px', border: '1px solid #a7f3d0', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <strong style={{ color: '#047857', fontSize: '13px' }}>📥 DEBIT ENTRIES (Dr)</strong>
            <button type="button" onClick={addDebitLine} style={addBtnStyle('#059669')}>➕ Add Debit Line</button>
          </div>

          {debitLines.map((line, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
              <select 
                value={line.account_name} 
                onChange={e => {
                  const updated = [...debitLines];
                  updated[idx].account_name = e.target.value;
                  setDebitLines(updated);
                }} 
                style={inputStyle} 
                required
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.account_name}>{a.account_name} ({a.account_group || 'GENERAL'})</option>
                ))}
              </select>

              <input 
                type="number" 
                step="0.01" 
                placeholder="Dr Amount (₹)" 
                value={line.amount} 
                onChange={e => {
                  const updated = [...debitLines];
                  updated[idx].amount = e.target.value;
                  setDebitLines(updated);
                }} 
                style={inputStyle} 
                required 
              />

              {debitLines.length > 1 && (
                <button type="button" onClick={() => removeDebitLine(idx)} style={removeBtnStyle}>❌</button>
              )}
            </div>
          ))}
          <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: 'bold', color: '#047857' }}>
            Total Debit: ₹{totalDebit.toFixed(2)}
          </div>
        </div>

        {/* SECTION 2: CREDIT LINES (Cr) */}
        <div style={{ backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <strong style={{ color: '#b91c1c', fontSize: '13px' }}>📤 CREDIT ENTRIES (Cr)</strong>
            <button type="button" onClick={addCreditLine} style={addBtnStyle('#dc2626')}>➕ Add Credit Line</button>
          </div>

          {creditLines.map((line, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
              <select 
                value={line.account_name} 
                onChange={e => {
                  const updated = [...creditLines];
                  updated[idx].account_name = e.target.value;
                  setCreditLines(updated);
                }} 
                style={inputStyle} 
                required
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.account_name}>{a.account_name} ({a.account_group || 'GENERAL'})</option>
                ))}
              </select>

              <input 
                type="number" 
                step="0.01" 
                placeholder="Cr Amount (₹)" 
                value={line.amount} 
                onChange={e => {
                  const updated = [...creditLines];
                  updated[idx].amount = e.target.value;
                  setCreditLines(updated);
                }} 
                style={inputStyle} 
                required 
              />

              {creditLines.length > 1 && (
                <button type="button" onClick={() => removeCreditLine(idx)} style={removeBtnStyle}>❌</button>
              )}
            </div>
          ))}
          <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: 'bold', color: '#b91c1c' }}>
            Total Credit: ₹{totalCredit.toFixed(2)}
          </div>
        </div>

        {/* Real-time Double-Entry Balance Check Bar */}
        <div style={{ backgroundColor: isBalanced ? '#f0fdf4' : '#fff1f2', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${isBalanced ? '#86efac' : '#fda4af'}`, marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: isBalanced ? '#166534' : '#9f1239' }}>
            {isBalanced ? "✓ Entry Balanced (Ready to Post)" : `⚠️ Difference: ₹${difference.toFixed(2)}`}
          </span>
          <span style={{ fontSize: '11px', color: '#475569' }}>
            Dr: ₹{totalDebit.toFixed(2)} | Cr: ₹{totalCredit.toFixed(2)}
          </span>
        </div>

        {/* Narration & Submit */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Narration / Particulars</label>
          <input type="text" placeholder="Transaction details..." value={narration} onChange={e => setNarration(e.target.value)} style={inputStyle} />
        </div>

        <button 
          type="submit" 
          disabled={!isBalanced} 
          style={{ 
            backgroundColor: isBalanced ? '#059669' : '#94a3b8', 
            color: '#ffffff', 
            border: 'none', 
            padding: '12px', 
            borderRadius: '8px', 
            fontWeight: 'bold', 
            width: '100%', 
            cursor: isBalanced ? 'pointer' : 'not-allowed', 
            fontSize: '13px' 
          }}
        >
          💾 Post Compound Voucher Entry
        </button>
      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff' };
const addBtnStyle = (bg) => ({ backgroundColor: bg, color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' });
const removeBtnStyle = { backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 8px', cursor: 'pointer' };
