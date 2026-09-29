// frontend/src/components/AccountHeadManager.jsx

import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';

export default function AccountHeadManager({ firm, selectedFY, onClose }) {
  const firmId = firm?.id || 'FIRM-001';
  const businessCategory = firm?.businessCategory || firm?.firmType || 'MANUFACTURING';
  const storageKey = `account_heads_${firmId}_${selectedFY}`;

  const [accounts, setAccounts] = useState([]);
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState('Expenses');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [balanceType, setBalanceType] = useState('Dr');

  // Professional Accounting Standard Groups & Sub-Groups
  const getProfessionalGroups = (type) => {
    switch (type) {
      case 'Expenses':
        return [
          'Direct Production & Factory Expenses',
          'Raw Material Consumed',
          'Operating Fuel & Power (Diesel / Electricity)',
          'Direct Labor & Wages (मज़दूर)',
          'Factory Machinery Repairs & Maintenance',
          'Freight & Cartage Inward (भाड़ा)',
          'Administrative & Office Expenses',
          'Selling & Distribution Expenses',
          'Financial Charges & Bank Interest'
        ];
      case 'Fixed Assets':
        return [
          'Factory Building & Civil Construction',
          'Plant, Machinery & Equipment',
          'Land Development & Site Preparation',
          'Sheds & Infrastructure',
          'Tubewell & Boring Installation',
          'Electrical Installation & Transformers',
          'Office Equipment & Computers',
          'Commercial Vehicles & Fleet'
        ];
      case 'Liabilities':
        return [
          'Bank Loans & Term Loans',
          'Working Capital / CC Limit',
          'Sundry Creditors (Suppliers / Vendors)',
          'Secured / Unsecured Loans',
          'Duties & Taxes (GST / TDS Payable)',
          'Provisions & Outstanding Expenses'
        ];
      case 'Assets':
        return [
          'Sundry Debtors (Customers)',
          'Bank Accounts',
          'Cash-in-Hand',
          'Raw Material Inventory',
          'Finished Goods Inventory',
          'Consumables & Fuel Stock',
          'Security Deposits & Advances'
        ];
      case 'Income':
        return [
          'Sales / Revenue Accounts',
          'Direct Production Income',
          'Indirect Incomes & Commission',
          'Capital / Owner Equity'
        ];
      default:
        return ['General Ledger Accounts'];
    }
  };

  const currentSubGroups = getProfessionalGroups(accountType);

  useEffect(() => {
    try {
      const saved = StorageService.getItem ? StorageService.getItem(storageKey) : JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(saved)) setAccounts(saved);
    } catch (e) {
      console.error("Error loading account heads:", e);
    }
  }, [storageKey]);

  useEffect(() => {
    const groups = getProfessionalGroups(accountType);
    if (groups.length > 0) setSelectedGroup(groups[0]);
  }, [accountType]);

  const handleSaveAccount = (e) => {
    e.preventDefault();
    if (!accountName.trim()) {
      alert("Kripya Account Name darj karein!");
      return;
    }

    const newAccount = {
      id: 'ACC-' + Date.now(),
      name: accountName.trim(),
      type: accountType,
      group: selectedGroup,
      openingBalance: Number(openingBalance) || 0,
      balanceType: openingBalance ? balanceType : '',
      businessCategory,
      selectedFY
    };

    const updated = [newAccount, ...accounts];
    setAccounts(updated);
    StorageService.setItem(storageKey, updated);
    window.dispatchEvent(new Event('app_storage_updated'));

    setAccountName('');
    setOpeningBalance('');
    alert("✓ Professional Account Head successfully created!");
  };

  const handleDelete = (id) => {
    if (window.confirm("Kya aap is account head ko delete karna chahte hain?")) {
      const updated = accounts.filter(a => a.id !== id);
      setAccounts(updated);
      StorageService.setItem(storageKey, updated);
      window.dispatchEvent(new Event('app_storage_updated'));
    }
  };

  return (
    <div style={{ padding: '16px', maxWidth: '650px', margin: '0 auto', fontFamily: 'sans-serif', boxSizing: 'border-box', backgroundColor: '#0f172a', minHeight: '100vh', color: '#fff' }}>
      
      {/* Top Navigation / Close Header */}
      {onClose && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <button 
            onClick={onClose} 
            style={{ backgroundColor: '#334155', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
          >
            ← Back to Dashboard
          </button>
        </div>
      )}

      <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', padding: '16px', borderRadius: '12px', marginBottom: '16px', boxSizing: 'border-box' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#f8fafc', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📊 Create & Manage Account Heads ({businessCategory})
        </h3>

        <form onSubmit={handleSaveAccount}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8' }}>Account Name *</label>
              <input 
                type="text" 
                value={accountName} 
                onChange={e => setAccountName(e.target.value)} 
                placeholder="e.g. State Bank Loan A/c" 
                style={inputStyle} 
                required 
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8' }}>Account Type *</label>
              <select 
                value={accountType} 
                onChange={e => setAccountType(e.target.value)} 
                style={inputStyle}
              >
                <option value="Expenses">Expenses (खर्चे)</option>
                <option value="Fixed Assets">Fixed Assets (स्थाई संपत्ति)</option>
                <option value="Liabilities">Liabilities (दायित्व/देनदारी)</option>
                <option value="Assets">Assets (संपत्ति/स्टॉक)</option>
                <option value="Income">Income (आय/राजस्व)</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8' }}>Sub-Group Category *</label>
            <select 
              value={selectedGroup} 
              onChange={e => setSelectedGroup(e.target.value)} 
              style={inputStyle}
              required
            >
              {currentSubGroups.map((grp, idx) => (
                <option key={idx} value={grp}>{grp}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8' }}>Opening Balance (₹)</label>
              <input 
                type="number" 
                value={openingBalance} 
                onChange={e => setOpeningBalance(e.target.value)} 
                placeholder="0.00" 
                style={inputStyle} 
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8' }}>Dr / Cr</label>
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

          <button type="submit" style={{ backgroundColor: '#0f766e', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '13px' }}>
            + Save Professional Account Head
          </button>
        </form>
      </div>

      <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', padding: '16px', borderRadius: '12px', boxSizing: 'border-box' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#f8fafc' }}>Existing Account Heads ({selectedFY})</h4>
        {accounts.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '16px', fontSize: '12px' }}>Koi account head create nahi kiya gaya hai.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', borderBottom: '2px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '8px' }}>Account Name</th>
                  <th style={{ padding: '8px' }}>Type / Sub-Group</th>
                  <th style={{ padding: '8px' }}>Opening Balance</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(acc => (
                  <tr key={acc.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: '#fff' }}>{acc.name}</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{acc.type}</span>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{acc.group}</div>
                    </td>
                    <td style={{ padding: '8px', color: '#cbd5e1' }}>{acc.openingBalance ? `₹${acc.openingBalance} ${acc.balanceType}` : '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button onClick={() => handleDelete(acc.id)} style={{ backgroundColor: '#7f1d1d', color: '#fca5a5', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '9px',
  borderRadius: '8px',
  border: '1px solid #475569',
  fontSize: '12px',
  boxSizing: 'border-box',
  marginTop: '4px',
  backgroundColor: '#0f172a',
  color: '#fff'
};
