// frontend/src/components/AccountHeadManager.jsx

import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';

export default function AccountHeadManager({ firm, selectedFY }) {
  const firmId = firm?.id || 'FIRM-001';
  const businessCategory = firm?.businessCategory || firm?.firmType || 'MANUFACTURING';
  const storageKey = `account_heads_${firmId}_${selectedFY}`;

  const [accounts, setAccounts] = useState([]);
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState('Expenses');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [balanceType, setBalanceType] = useState('Dr');

  // Dynamic Groups & Sub-Groups based on General Manufacturing & Business Categories
  const getDynamicGroups = (type) => {
    if (type === 'Expenses') {
      if (businessCategory === 'MANUFACTURING' || businessCategory === 'BRICK_KILN' || businessCategory.includes('MANUF')) {
        return [
          'Direct Production & Factory Expenses',
          'Raw Material Consumed',
          'Operating Fuel & Power (Diesel / Electricity)',
          'Direct Labor & Wages (मज़दूर)',
          'Factory Machinery Repairs & Maintenance',
          'Freight & Cartage Inward (भाड़ा)',
          'Administrative & Office Expenses',
          'Financial Charges & Bank Interest'
        ];
      } else if (businessCategory === 'TRANSPORT') {
        return [
          'Direct Trip & Route Expenses',
          'Vehicle Diesel & Fuel Expenses',
          'Vehicle Maintenance & Spare Parts',
          'Driver Salary & Allowances',
          'Toll & Permit Charges',
          'Administrative & Office Expenses',
          'Financial Charges & Bank Interest'
        ];
      } else {
        // Trading / General
        return [
          'Direct Purchase & Trading Expenses',
          'Freight & Cartage Inward',
          'Selling & Distribution Expenses',
          'Administrative & Office Expenses',
          'Salary & Staff Welfare',
          'Financial Charges & Bank Interest'
        ];
      }
    } else if (type === 'Fixed Assets') {
      if (businessCategory === 'MANUFACTURING' || businessCategory === 'BRICK_KILN' || businessCategory.includes('MANUF')) {
        return [
          'Factory Building & Civil Construction',
          'Plant, Machinery & Equipment',
          'Land Development & Site Preparation',
          'Sheds & Infrastructure',
          'Tubewell & Boring Installation',
          'Electrical Installation & Transformers',
          'Office Equipment & Computers'
        ];
      } else if (businessCategory === 'TRANSPORT') {
        return [
          'Commercial Vehicles / Trucks / Fleet',
          'Garage & Workshop Equipment',
          'Office Equipment & Computers'
        ];
      } else {
        return [
          'Building & Office Premises',
          'Plant, Machinery & Equipment',
          'Furniture & Fixtures',
          'Computers & Technology'
        ];
      }
    } else if (type === 'Liabilities') {
      return [
        'Bank Loans & Term Loans',
        'Working Capital / CC Limit',
        'Sundry Creditors (Suppliers)',
        'Secured / Unsecured Loans',
        'Duties & Taxes (GST / TDS Payable)'
      ];
    } else if (type === 'Assets') {
      return [
        'Sundry Debtors (Customers)',
        'Bank Accounts',
        'Cash-in-Hand',
        'Security Deposits & Advances'
      ];
    } else {
      return ['Income / Revenue Accounts', 'Capital / Equity'];
    }
  };

  const currentSubGroups = getDynamicGroups(accountType);

  useEffect(() => {
    try {
      const saved = StorageService.getItem ? StorageService.getItem(storageKey) : JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(saved)) setAccounts(saved);
    } catch (e) {
      console.error("Error loading account heads:", e);
    }
  }, [storageKey]);

  // Reset default group when account type changes
  useEffect(() => {
    const groups = getDynamicGroups(accountType);
    if (groups.length > 0) setSelectedGroup(groups[0]);
  }, [accountType, businessCategory]);

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

    // Reset Form
    setAccountName('');
    setOpeningBalance('');
    alert("✓ Account Head successfully created!");
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
    <div style={{ padding: '8px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📊 Create & Manage Account Heads ({businessCategory})
        </h3>

        <form onSubmit={handleSaveAccount}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Account Name *</label>
              <input 
                type="text" 
                value={accountName} 
                onChange={e => setAccountName(e.target.value)} 
                placeholder="e.g. Plant & Machinery A/c" 
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
                <option value="Expenses">Expenses</option>
                <option value="Fixed Assets">Fixed Assets</option>
                <option value="Liabilities">Liabilities</option>
                <option value="Assets">Assets</option>
                <option value="Income">Income</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '14px' }}>
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

          <button type="submit" style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '12px' }}>
            + Save Account Head
          </button>
        </form>
      </div>

      {/* Accounts List Register */}
      <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#334155' }}>Existing Account Heads ({selectedFY})</h4>
        {accounts.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '16px', fontSize: '11px' }}>Koi account head create nahi kiya gaya hai.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '6px' }}>Account Name</th>
                  <th style={{ padding: '6px' }}>Type / Sub-Group</th>
                  <th style={{ padding: '6px' }}>Opening Balance</th>
                  <th style={{ padding: '6px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(acc => (
                  <tr key={acc.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: 'bold' }}>{acc.name}</td>
                    <td style={{ padding: '6px' }}>
                      <span style={{ color: '#0284c7', fontWeight: 'bold' }}>{acc.type}</span>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{acc.group}</div>
                    </td>
                    <td style={{ padding: '6px' }}>{acc.openingBalance ? `₹${acc.openingBalance} ${acc.balanceType}` : '-'}</td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>
                      <button onClick={() => handleDelete(acc.id)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>
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
  padding: '7px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '11px',
  boxSizing: 'border-box',
  marginTop: '3px',
  backgroundColor: '#ffffff'
};
