// frontend/src/components/CreateAccountHeadModal.jsx

import React, { useState } from 'react';
import { saveOrUpdateAccountHead, ACCOUNT_HIERARCHY } from '../utils/accountMasterEngine.js';

export default function CreateAccountHeadModal({ firm, isOpen, onClose, onAccountCreated }) {
  if (isOpen === false) return null;

  const activeFirmId = firm?.id || 'FIRM-001';

  const [accountName, setAccountName] = useState('');
  const [primaryType, setPrimaryType] = useState('ASSETS');
  const [subGroup, setSubGroup] = useState(ACCOUNT_HIERARCHY.ASSETS.subGroups[0]);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [balanceType, setBalanceType] = useState('Dr');
  const [gstin, setGstin] = useState('');
  const [phone, setPhone] = useState('');

  const handlePrimaryTypeChange = (type) => {
    setPrimaryType(type);
    const config = ACCOUNT_HIERARCHY[type];
    setSubGroup(config.subGroups[0]);
    setBalanceType(config.defaultBalanceType);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!accountName.trim()) {
      alert("⚠️ Account / Party Name enter karna zaroori hai.");
      return;
    }

    try {
      const created = saveOrUpdateAccountHead(activeFirmId, {
        account_name: accountName.trim(),
        primary_type: primaryType,
        sub_group: subGroup,
        opening_balance: openingBalance,
        balance_type: balanceType,
        gstin,
        phone
      });

      alert(`✓ Ledger Account "${created.account_name}" Successfully Created!`);
      setAccountName('');
      setOpeningBalance('0');
      setGstin('');
      setPhone('');
      if (onAccountCreated) onAccountCreated(created);
      if (onClose) onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>➕</span> Create New Ledger Account
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Account / Party Name *</label>
            <input type="text" placeholder="e.g. Propritor Capital A/C / Shyam Steel" value={accountName} onChange={e => setAccountName(e.target.value)} style={inputStyle} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>1. Primary Account Type *</label>
              <select value={primaryType} onChange={e => handlePrimaryTypeChange(e.target.value)} style={inputStyle}>
                {Object.entries(ACCOUNT_HIERARCHY).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>2. Accounting Sub-Group *</label>
              <select value={subGroup} onChange={e => setSubGroup(e.target.value)} style={inputStyle}>
                {ACCOUNT_HIERARCHY[primaryType]?.subGroups.map(sg => <option key={sg} value={sg}>{sg}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Opening Balance (₹)</label>
              <input type="number" step="0.01" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Balance Type</label>
              <select value={balanceType} onChange={e => setBalanceType(e.target.value)} style={inputStyle}>
                <option value="Dr">Debit (Dr)</option>
                <option value="Cr">Credit (Cr)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
            <div>
              <label style={labelStyle}>GSTIN Number (Optional)</label>
              <input type="text" placeholder="08AAAAA0000A1Z5" value={gstin} onChange={e => setGstin(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Mobile / Phone</label>
              <input type="tel" placeholder="98290XXXXX" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '10px' }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button type="submit" style={saveBtnStyle}>💾 Save Account</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' };
const modalCardStyle = { backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff' };
const cancelBtnStyle = { backgroundColor: '#94a3b8', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' };
const saveBtnStyle = { backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' };
