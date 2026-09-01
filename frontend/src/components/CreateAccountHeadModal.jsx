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

  // Form View Visibility State (Default: False taaki Directory puri dikhe)
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form Field States
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
    // Modal open hone par default directory list dikhayenge
    setIsFormOpen(false);
    handleResetForm();
  }, [activeFirmId, isOpen]);

  const handlePrimaryTypeChange = (type) => {
    setPrimaryType(type);
    const config = ACCOUNT_HIERARCHY[type];
    setSubGroup(config.subGroups[0]);
    setBalanceType(config.defaultBalanceType);
  };

  const openCreateMode = () => {
    handleResetForm();
    setIsFormOpen(true);
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
    setIsFormOpen(true); // Edit click hone par form open hoga
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

  const handleCancelForm = () => {
    handleResetForm();
    setIsFormOpen(false); // Form band karke list par wapas le jayega
  };

  const handleDeleteClick = (acc) => {
    if (window.confirm(`⚠️ Are you sure you want to delete ledger account "${acc.account_name}"?`)) {
      try {
        deleteMasterAccount(activeFirmId, acc.id);
        loadAccounts();
        if (editingId === acc.id) handleCancelForm();
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
      setIsFormOpen(false); // Save ke baad form auto-close hoga taaki updated list dikhe
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
        
        {/* Modal Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
          <h3 style={{ margin: 0, color: '#1e293b', fontSize: '17px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📋</span> Chart of Accounts & Ledger Master
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        {/* 1. COLLAPSIBLE FORM: Sirf tabhi dikhega jab isFormOpen === true ho */}
        {isFormOpen ? (
          <form onSubmit={handleSubmit} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
              <strong style={{ color: '#0f172a', fontSize: '14px' }}>
                {editingId ? '✏️ Edit Ledger Account' : '➕ Create New Ledger Account'}
              </strong>
              <button 
                type="button" 
                onClick={handleCancelForm} 
                style={{ background: '#e2e8f0', border: 'none', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', color: '#475569' }}
              >
                ✕ Close Form
              </button>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Account / Party Name *</label>
              <input 
                type="text" 
                placeholder="e.g. Proprietor Capital A/C / Radhey Traders" 
                value={accountName} 
                onChange={e => setAccountName(e.target.value)} 
                style={inputStyle} 
                required 
                autoFocus
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>GSTIN (Optional)</label>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
              <button 
                type="button" 
                onClick={handleCancelForm} 
                style={cancelButtonStyle}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                style={saveButtonStyle}
              >
                💾 {editingId ? 'Update Account' : 'Save Account'}
              </button>
            </div>
          </form>
        ) : (
          /* 2. DIRECTORY TOP ACTION BAR (Jab form band ho tab bada button dikhega) */
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>
              Accounts Directory ({accountList.length})
            </div>
            <button 
              type="button" 
              onClick={openCreateMode} 
              style={{
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
              }}
            >
              ➕ Add New Account
            </button>
          </div>
        )}

        {/* 3. FULL DIRECTORY DIRECTORY & SEARCH VIEW */}
        <div>
          <div style={{ marginBottom: '10px' }}>
            <input 
              type="text" 
              placeholder="🔍 Search party name, phone, or group..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} 
            />
          </div>

          <div style={{ maxHeight: isFormOpen ? '200px' : '480px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '10px', transition: 'max-height 0.3s ease' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '400px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', position: 'sticky', top: 0, zIndex: 1 }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Account / Party Name</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}>Sub-Group</th>
                  <th style={{ padding: '10px 10px', textAlign: 'right' }}>Opening Bal</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                      No ledger accounts found. Click <strong>"+ Add New Account"</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map(acc => (
                    <tr key={acc.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: editingId === acc.id ? '#eff6ff' : '#ffffff' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#1e293b' }}>
                        {acc.account_name}
                        {acc.phone && <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'normal' }}>📞 {acc.phone}</div>}
                      </td>
                      <td style={{ padding: '10px 8px', color: '#475569' }}>
                        <span style={{ backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>
                          {acc.sub_group}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 'bold', color: acc.balance_type === 'Dr' ? '#dc2626' : '#16a34a', whiteSpace: 'nowrap' }}>
                        ₹{parseFloat(acc.opening_balance || 0).toFixed(2)} {acc.balance_type}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button 
                          type="button" 
                          onClick={() => handleEditClick(acc)} 
                          style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '6px', padding: '5px 10px', marginRight: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                        >
                          ✏️ Edit
                        </button>
                        {!acc.is_system_locked && (
                          <button 
                            type="button" 
                            onClick={() => handleDeleteClick(acc)} 
                            style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '11px' }}
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

        {/* Modal Bottom Footer (Jab Form Band Ho) */}
        {!isFormOpen && (
          <div style={{ marginTop: '14px', textAlign: 'right' }}>
            <button 
              type="button" 
              onClick={onClose} 
              style={{ backgroundColor: '#64748b', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
            >
              Close
            </button>
          </div>
        )}

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
  padding: '14px'
};

const modalCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '18px',
  width: '100%',
  maxWidth: '520px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
  boxSizing: 'border-box',
  maxHeight: '94vh',
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
