// frontend/src/components/CreateAccountHeadModal.jsx

import React, { useState, useEffect } from 'react';
import { getAccountHeadsByFirm, saveOrUpdateAccountHead } from '../utils/accountMasterEngine.js';

export default function CreateAccountHeadModal({ firm, onClose, onAccountCreated }) {
  const activeFirmId = firm?.id || 'FIRM-001';

  const [accountName, setAccountName] = useState('');
  const [accountGroup, setAccountGroup] = useState('SUNDRY_DEBTORS');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [balanceType, setBalanceType] = useState('Dr');
  const [existingAccounts, setExistingAccounts] = useState([]);

  useEffect(() => {
    const list = getAccountHeadsByFirm(activeFirmId);
    setExistingAccounts(list);
  }, [activeFirmId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!accountName.trim()) {
      alert("⚠️ Account Name is required.");
      return;
    }

    try {
      const created = saveOrUpdateAccountHead(activeFirmId, {
        account_name: accountName.trim(),
        account_group: accountGroup,
        opening_balance: openingBalance,
        balance_type: balanceType
      });

      alert(`✓ Account Head "${created.account_name}" saved successfully!`);
      if (onAccountCreated) onAccountCreated(created);
      if (onClose) onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '420px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>👤 Create Account Head</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Party / Account Name *</label>
            <input 
              type="text" 
              placeholder="e.g. Balaji Petroleum / Ramesh Kumar" 
              value={accountName} 
              onChange={e => setAccountName(e.target.value)} 
              style={inputStyle} 
              required 
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Account Group *</label>
            <select 
              value={accountGroup} 
              onChange={e => {
                setAccountGroup(e.target.value);
                setBalanceType(e.target.value === 'SUNDRY_CREDITORS' ? 'Cr' : 'Dr');
              }} 
              style={inputStyle}
            >
              <option value="SUNDRY_DEBTORS">Sundry Debtors (ग्राहक / देनदार)</option>
              <option value="SUNDRY_CREDITORS">Sundry Creditors (आपूर्तिकर्ता / लेनदार)</option>
              <option value="DIRECT_EXPENSES">Direct Expenses (खर्च खाता)</option>
              <option value="CASH_BANK">Cash / Bank Account</option>
              <option value="INCOME">Revenue / Income Account</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Opening Balance (₹)</label>
              <input 
                type="number" 
                step="0.01" 
                value={openingBalance} 
                onChange={e => setOpeningBalance(e.target.value)} 
                style={inputStyle} 
              />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={balanceType} onChange={e => setBalanceType(e.target.value)} style={inputStyle}>
                <option value="Dr">Dr (बाकी)</option>
                <option value="Cr">Cr (जमा)</option>
              </select>
            </div>
          </div>

          <button type="submit" style={{ width: '100%', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
            💾 Save Account Head
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', backgroundColor: '#ffffff' };
