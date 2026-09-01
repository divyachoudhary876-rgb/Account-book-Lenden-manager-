// frontend/src/components/CreateAccountHeadModal.jsx

import React, { useState, useEffect } from 'react';
import { 
  getFirmMasterAccounts, 
  saveMasterAccount, 
  deleteMasterAccount, 
  ACCOUNT_HIERARCHY 
} from '../utils/accountMasterEngine.js';

export default function CreateAccountHeadModal({ firm, isOpen, onClose, onAccountCreated }) {
  if (isOpen === false) return null;

  const activeFirmId = firm?.id || 'FIRM-001';

  // Accounts state
  const [accountList, setAccountList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [editingId, setEditingId] = useState(null);
  const [accountName, setAccountName] = useState('');
  const [primaryType, setPrimaryType] = useState('ASSETS');
  const [subGroup, setSubGroup] = useState(ACCOUNT_HIERARCHY.ASSETS.subGroups[0]);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [balanceType, setBalanceType] = useState('Dr');
  const [gstin, setGstin] = useState('');
  const [phone, setPhone] = useState('');

  const loadAccounts = () => {
    const list = getFirmMasterAccounts(activeFirmId);
    setAccountList(list);
  };

  useEffect(() => {
    loadAccounts();
  }, [activeFirmId, isOpen]);

  const handlePrimaryTypeChange = (type) => {
    setPrimaryType(type);
    const config = ACCOUNT_HIERARCHY[type];
    setSubGroup(config.subGroups[0]);
    setBalanceType(config.defaultBalanceType);
  };

  const handleEditClick = (acc) => {
    setEditingId(acc.id);
    setAccountName(acc.account_name);
    setPrimaryType(acc.primary_type || 'ASSETS');
    setSubGroup(acc.sub_group || ACCOUNT_HIERARCHY[acc.primary_type || 'ASSETS']?.subGroups[0] || 'General');
    setOpeningBalance(acc.opening_balance?.toString() || '0');
    setBalanceType(acc.balance_type || 'Dr');
    setGstin(acc.gstin || '');
    setPhone(acc.phone || '');
  };

  const handleResetForm = () => {
    setEditingId(null);
    setAccountName('');
    setPrimaryType('ASSETS');
    setSubGroup(ACCOUNT_HIERARCHY.ASSETS.subGroups[0]);
    setOpeningBalance('0');
    setBalanceType('Dr');
    setGstin('');
    setPhone('');
  };

  const handleDeleteClick = (acc) => {
    if (window.confirm(`⚠️ Are you sure you want to delete ledger account "${acc.account_name}"?`)) {
      try {
        deleteMasterAccount(activeFirmId, acc.id);
        loadAccounts();
        if (editingId === acc.id) handleResetForm();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!accountName.trim()) {
      alert("⚠️ Please enter Account / Party Name.");
      return;
    }

    try {
      const saved = saveMasterAccount(activeFirmId, {
        id: editingId,
        account_name: accountName.trim(),
        primary_type: primaryType,
        sub_group: subGroup,
        opening_balance: openingBalance,
        balance_type: balanceType,
        gstin,
        phone
      });

      alert(`✓ Ledger Account "${saved.account_name}" ${editingId ? 'Updated' : 'Created'} Successfully!`);
      handleResetForm();
      loadAccounts();
      if (onAccountCreated) onAccountCreated(saved);
    } catch (err) {
      alert(err.message);
    }
  };

  const availableSubGroups = ACCOUNT_HIERARCHY[primaryType]?.subGroups || [];

  const filteredAccounts = accountList.filter(a => {
    const q = searchQuery.toLowerCase();
    return (
      (a.account_name || '').toLowerCase().includes(q) ||
      (a.sub_group || '').toLowerCase().includes(q) ||
      (a.phone || '').includes(q)
    );
  });

  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
          <h3 style={{ margin: 0, color: '#1e293b', fontSize: '17px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>➕</span> {editingId ? 'Edit Ledger Account' : 'Create New Ledger Account'}
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        {/* 1. Account Entry / Edit Form */}
        <form onSubmit={handleSubmit} style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
          
          <div style={{ marginBottom: '10px' }}>
            <label style={labelStyle}>Account / Party Name *</label>
            <input 
              type="text" 
              placeholder="e.g. Propritor Capital A/C / Shyam Steel" 
              value={accountName} 
              onChange={e => setAccountName(e.target.value)} 
              style={inputStyle} 
              required 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={labelStyle}>1. Primary Account Type *</label>
              <select 
                value={primaryType} 
                onChange={e => handlePrimaryTypeChange(e.target.value)} 
                style={inputStyle}
              >
                {Object.entries(ACCOUNT_HIERARCHY).map(([key, item]) => (
                  <option key={key} value={key}>{item.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>2. Accounting Sub-Group *</label>
              <select 
                value={subGroup} 
                onChange={e => setSubGroup(e.target.value)} 
                style={inputStyle}
              >
                {availableSubGroups.map(sg => (
                  <option key={sg} value={sg}>{sg}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
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
              <label style={labelStyle}>Balance Type</label>
              <select 
                value={balanceType} 
                onChange={e => setBalanceType(e.target.value)} 
                style={inputStyle}
              >
                <option value="Dr">Debit (Dr)</option>
                <option value="Cr">Credit (Cr)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>GSTIN Number (Optional)</label>
              <input 
                type="text" 
                placeholder="08AAAAA0000A1Z5" 
                value={gstin} 
                onChange={e => setGstin(e.target.value)} 
                style={inputStyle} 
              />
            </div>
            <div>
              <label style={labelStyle}>Mobile / Phone</label>
              <input 
                type="tel" 
                placeholder="98290XXXXX" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                style={inputStyle} 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: editingId ? '1fr 1fr 1.5fr' : '1fr 1.4fr', gap: '8px' }}>
            {editingId && (
              <button 
                type="button" 
                onClick={handleResetForm} 
                style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
              >
                Cancel Edit
              </button>
            )}
            <button 
              type="button" 
              onClick={onClose} 
              style={cancelButtonStyle}
            >
              Close
            </button>
            <button 
              type="submit" 
              style={saveButtonStyle}
            >
              💾 {editingId ? 'Update Account' : 'Save Account'}
            </button>
          </div>

        </form>

        {/* 2. Existing Accounts Directory List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>
              📋 Existing Accounts Directory ({accountList.length})
            </span>
            <input 
              type="text" 
              placeholder="🔍 Search party or group..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', width: '180px' }} 
            />
          </div>

          <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Account Name</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Group / Sub-Group</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Opening Bal</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>
                      No accounts matched your search.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map(acc => (
                    <tr key={acc.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: editingId === acc.id ? '#eff6ff' : '#ffffff' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: '#1e293b' }}>
                        {acc.account_name}
                        {acc.phone && <div style={{ fontSize: '10px', color: '#64748b' }}>📞 {acc.phone}</div>}
                      </td>
                      <td style={{ padding: '8px', color: '#475569' }}>
                        <span style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                          {acc.sub_group}
                        </span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: acc.balance_type === 'Dr' ? '#dc2626' : '#16a34a' }}>
                        ₹{parseFloat(acc.opening_balance || 0).toFixed(2)} {acc.balance_type}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button 
                          type="button" 
                          onClick={() => handleEditClick(acc)} 
                          style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '4px', padding: '3px 6px', marginRight: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}
                        >
                          ✏️ Edit
                        </button>
                        {!acc.is_system_locked && (
                          <button 
                            type="button" 
                            onClick={() => handleDeleteClick(acc)} 
                            style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '4px', padding: '3px 6px', cursor: 'pointer', fontSize: '10px' }}
                          >
                            🗑️
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.65)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '16px'
};

const modalCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '20px',
  width: '100%',
  maxWidth: '480px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
  boxSizing: 'border-box',
  maxHeight: '92vh',
  overflowY: 'auto'
};

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#334155',
  marginBottom: '4px'
};

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '12px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#0f172a'
};

const cancelButtonStyle = {
  backgroundColor: '#94a3b8',
  color: '#ffffff',
  border: 'none',
  padding: '10px',
  borderRadius: '6px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '13px'
};

const saveButtonStyle = {
  backgroundColor: '#10b981',
  color: '#ffffff',
  border: 'none',
  padding: '10px',
  borderRadius: '6px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '13px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px'
};
