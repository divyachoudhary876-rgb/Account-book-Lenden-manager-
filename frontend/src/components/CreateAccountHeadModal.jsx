// frontend/src/components/CreateAccountHeadModal.jsx

import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';

export default function CreateAccountHeadModal({ firm, selectedFY, onClose }) {
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
    <div style={{ padding: '4px', maxWidth: '650px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', backgroundColor: '#f8fafc', color: '#0f172a' }}>
      
      {/* Form Container */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', marginBottom: '16px', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📊 Create & Manage Account Heads ({businessCategory})
        </h3>

        <form onSubmit={handleSaveAccount}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Account Name *</label>
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
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Account Type *</label>
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
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Sub-Group Category *</label>
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
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Opening Balance (₹)</label>
              <input 
                type="number" 
                value={openingBalance} 
                onChange={e => setOpeningBalance(e.target.value)} 
                placeholder="0.00" 
                style={inputStyle} 
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Dr / Cr</label>
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

          <button type="submit" style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '11px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '12px' }}>
            + Save Professional Account Head
          </button>
        </form>
      </div>

      {/* Existing List Container */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#0f172a', fontWeight: 'bold' }}>Existing Account Heads ({selectedFY})</h4>
        {accounts.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '16px', fontSize: '11px' }}>Koi account head create nahi kiya gaya hai.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>
                  <th style={{ padding: '8px' }}>Account Name</th>
                  <th style={{ padding: '8px' }}>Type / Sub-Group</th>
                  <th style={{ padding: '8px' }}>Opening Balance</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(acc => (
                  <tr key={acc.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: '#0f172a' }}>{acc.name}</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ color: '#0284c7', fontWeight: 'bold' }}>{acc.type}</span>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{acc.group}</div>
                    </td>
                    <td style={{ padding: '8px', color: '#334155' }}>{acc.openingBalance ? `₹${acc.openingBalance} ${acc.balanceType}` : '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button onClick={() => handleDelete(acc.id)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>
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
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '11px',
  boxSizing: 'border-box',
  marginTop: '4px',
  backgroundColor: '#ffffff',
  color: '#0f172a'
};
