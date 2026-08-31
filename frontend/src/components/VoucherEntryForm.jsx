// frontend/src/components/VoucherEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { getAccountHeads, createQuickAccountHead } from '../utils/statementEngine.js';
import { processVoucherEntrySubmission } from '../utils/voucherPostingEngine.js';

export default function VoucherEntryForm({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [accounts, setAccounts] = useState([]);

  const [voucherType, setVoucherType] = useState('JOURNAL');
  const [drAccount, setDrAccount] = useState('');
  const [crAccount, setCrAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');

  // Quick Account Modal State
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccGroup, setNewAccGroup] = useState('SUNDRY_DEBTOR');

  useEffect(() => {
    loadAccounts();
    window.addEventListener('storage', loadAccounts);
    return () => window.removeEventListener('storage', loadAccounts);
  }, [firm]);

  const loadAccounts = () => {
    const list = getAccountHeads(activeFirmId);
    setAccounts(list);
    if (list.length > 0) {
      if (!drAccount) setDrAccount(list[0].account_name);
      if (!crAccount) setCrAccount(list[1]?.account_name || list[0].account_name);
    }
  };

  const handleQuickAddAccount = (e) => {
    e.preventDefault();
    try {
      const created = createQuickAccountHead(activeFirmId, {
        account_name: newAccName,
        account_group: newAccGroup
      });
      alert(`✓ New Account "${created.account_name}" created successfully!`);
      setShowAccountModal(false);
      setNewAccName('');
      loadAccounts();
      setDrAccount(created.account_name);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      const payload = {
        voucher_type: voucherType,
        dr_account: drAccount,
        cr_account: crAccount,
        amount,
        narration
      };

      const created = processVoucherEntrySubmission(activeFirmId, payload);
      alert(`✓ Voucher ${created.id} Posted Successfully!\n• Reflected in General Journal (Day Book)\n• Reflected in Account Milan & Ledger`);
      setAmount('');
      setNarration('');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      
      {/* Title & Quick Create Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>📒 Voucher Entry Posting (Double-Entry)</h3>
        <button 
          type="button" 
          onClick={() => setShowAccountModal(true)} 
          style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          ➕ Quick Add Account
        </button>
      </div>

      {/* Quick Add Account Modal */}
      {showAccountModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <form onSubmit={handleQuickAddAccount} style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', maxWidth: '380px', width: '100%', border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>➕ Create New Ledger / Party Account</h4>
            
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Account / Party Name *</label>
              <input type="text" placeholder="e.g. Ramesh Supplier A/C" value={newAccName} onChange={e => setNewAccName(e.target.value)} style={inputStyle} required />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Account Group *</label>
              <select value={newAccGroup} onChange={e => setNewAccGroup(e.target.value)} style={inputStyle}>
                <option value="SUNDRY_DEBTOR">Customer (Sundry Debtor)</option>
                <option value="SUNDRY_CREDITOR">Supplier / Vendor (Sundry Creditor)</option>
                <option value="EXPENSE">Expense Account</option>
                <option value="INCOME">Income / Revenue Account</option>
                <option value="BANK">Bank Account</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowAccountModal(false)} style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
              <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>Save Account</button>
            </div>
          </form>
        </div>
      )}

      {/* Main Voucher Form */}
      <form onSubmit={handleSubmit} style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={labelStyle}>Voucher Type</label>
          <select value={voucherType} onChange={e => setVoucherType(e.target.value)} style={inputStyle}>
            <option value="JOURNAL">JOURNAL VOUCHER (JV)</option>
            <option value="PAYMENT">PAYMENT VOUCHER (PV)</option>
            <option value="RECEIPT">RECEIPT VOUCHER (RV)</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label style={labelStyle}>Debit Account (Dr) *</label>
            <select value={drAccount} onChange={e => setDrAccount(e.target.value)} style={inputStyle} required>
              {accounts.map(a => (
                <option key={a.id} value={a.account_name}>
                  {a.account_name} ({a.account_group || 'GENERAL'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Credit Account (Cr) *</label>
            <select value={crAccount} onChange={e => setCrAccount(e.target.value)} style={inputStyle} required>
              {accounts.map(a => (
                <option key={a.id} value={a.account_name}>
                  {a.account_name} ({a.account_group || 'GENERAL'})
                </option>
              ))}
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

        <button type="submit" style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', width: '100%', cursor: 'pointer', fontSize: '13px' }}>
          💾 Post Voucher Entry
        </button>
      </form>

    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff' };
