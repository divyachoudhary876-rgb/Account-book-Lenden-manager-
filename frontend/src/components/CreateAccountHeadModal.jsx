// frontend/src/components/CreateAccountHeadModal.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../utils/storageSync';

export default function CreateAccountHeadModal({ firm, selectedFY, onClose }) {
  const firmId = firm?.id || 'FIRM-001';
  const businessCategory = firm?.businessCategory || firm?.firmType || 'MANUFACTURING';
  
  const storageKey = `account_heads_${firmId}`;

  // Pre-defined Professional Baseline Accounts
  const defaultBaselineAccounts = [
    { id: 'ACC-BASE-01', name: 'Cash in Hand (रोकड़)', type: 'Assets', group: 'Cash-in-Hand', openingBalance: 0, balanceType: 'Dr', isSystemLocked: true },
    { id: 'ACC-BASE-02', name: 'State Bank of India (बैंक खाता)', type: 'Assets', group: 'Bank Accounts', openingBalance: 0, balanceType: 'Dr', isSystemLocked: false },
    { id: 'ACC-BASE-03', name: 'Sales / Revenue Account', type: 'Income', group: 'Sales / Revenue Accounts', openingBalance: 0, balanceType: 'Cr', isSystemLocked: true },
    { id: 'ACC-BASE-04', name: 'Purchase Raw Material Account', type: 'Expenses', group: 'Raw Material Consumed', openingBalance: 0, balanceType: 'Dr', isSystemLocked: true },
    { id: 'ACC-BASE-05', name: 'Tractor Diesel & Running Expense', type: 'Expenses', group: 'Operating Fuel & Power (Diesel / Electricity)', openingBalance: 0, balanceType: 'Dr', isSystemLocked: false },
    { id: 'ACC-BASE-06', name: 'Pathai & Labour Expenses (मजदूरी)', type: 'Expenses', group: 'Direct Labor & Wages (मज़दूर)', openingBalance: 0, balanceType: 'Dr', isSystemLocked: false },
    { id: 'ACC-BASE-07', name: 'Proprietor Capital Account', type: 'Income', group: 'Capital / Owner Equity', openingBalance: 0, balanceType: 'Cr', isSystemLocked: false }
  ];

  const [accounts, setAccounts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState('Expenses');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [balanceType, setBalanceType] = useState('Dr');
  const [searchFilter, setSearchFilter] = useState('');

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
      if (Array.isArray(saved) && saved.length > 0) {
        // Ensure baseline accounts are merged if missing
        const existingNames = new Set(saved.map(a => String(a.name || '').trim().toLowerCase()));
        const missingBaseline = defaultBaselineAccounts.filter(b => !existingNames.has(b.name.trim().toLowerCase()));
        const merged = [...saved, ...missingBaseline];
        setAccounts(merged);
      } else {
        setAccounts(defaultBaselineAccounts);
        StorageService.setItem(storageKey, defaultBaselineAccounts);
      }
    } catch (e) {
      console.error("Error loading account heads:", e);
      setAccounts(defaultBaselineAccounts);
    }
  }, [storageKey]);

  useEffect(() => {
    const groups = getProfessionalGroups(accountType);
    if (groups.length > 0 && !groups.includes(selectedGroup)) {
      setSelectedGroup(groups[0]);
    }

    if (accountType === 'Liabilities' || accountType === 'Income') {
      setBalanceType('Cr');
    } else {
      setBalanceType('Dr');
    }
  }, [accountType]);

  const handleSaveAccount = (e) => {
    e.preventDefault();
    if (!accountName.trim()) {
      alert("Kripya Account Name darj karein!");
      return;
    }

    const cleanName = accountName.trim();

    if (editingId) {
      // Update existing account
      const updated = accounts.map(acc => {
        if (acc.id === editingId) {
          return {
            ...acc,
            name: cleanName,
            account_name: cleanName,
            type: accountType,
            primary_type: accountType,
            group: selectedGroup,
            sub_group: selectedGroup,
            openingBalance: Number(openingBalance) || 0,
            opening_balance: Number(openingBalance) || 0,
            balanceType: openingBalance ? balanceType : '',
            balance_type: openingBalance ? balanceType : ''
          };
        }
        return acc;
      });

      setAccounts(updated);
      StorageService.setItem(storageKey, updated);
      StorageService.setItem(`app_accounts_${firmId}`, updated);
      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));

      setEditingId(null);
      setAccountName('');
      setOpeningBalance('');
      alert("✓ Account Head successfully updated!");
    } else {
      // Create new account
      const newAccount = {
        id: 'ACC-' + Date.now(),
        name: cleanName,
        account_name: cleanName,
        type: accountType,
        primary_type: accountType,
        group: selectedGroup,
        sub_group: selectedGroup,
        openingBalance: Number(openingBalance) || 0,
        opening_balance: Number(openingBalance) || 0,
        balanceType: openingBalance ? balanceType : '',
        balance_type: openingBalance ? balanceType : 'Dr',
        businessCategory,
        createdAtFY: selectedFY,
        isSystemLocked: false
      };

      const updated = [newAccount, ...accounts];
      setAccounts(updated);
      StorageService.setItem(storageKey, updated);
      StorageService.setItem(`app_accounts_${firmId}`, updated);
      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));

      setAccountName('');
      setOpeningBalance('');
      alert("✓ Professional Account Head successfully created!");
    }
  };

  const handleEdit = (acc) => {
    setEditingId(acc.id);
    setAccountName(acc.name || acc.account_name || '');
    setAccountType(acc.type || acc.primary_type || 'Expenses');
    setSelectedGroup(acc.group || acc.sub_group || '');
    setOpeningBalance(acc.openingBalance !== undefined ? acc.openingBalance : (acc.opening_balance || ''));
    setBalanceType(acc.balanceType || acc.balance_type || 'Dr');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id, isLocked) => {
    if (isLocked) {
      alert("⚠️ System core baseline accounts ko delete nahi kiya ja sakta.");
      return;
    }
    if (window.confirm("Kya aap is account head ko delete karna chahte hain?")) {
      const updated = accounts.filter(a => a.id !== id);
      setAccounts(updated);
      StorageService.setItem(storageKey, updated);
      StorageService.setItem(`app_accounts_${firmId}`, updated);
      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      
      if (editingId === id) {
        setEditingId(null);
        setAccountName('');
        setOpeningBalance('');
      }
    }
  };

  // A to Z Ascending Order Sorting & Search Filtering
  const processedAccounts = useMemo(() => {
    const sorted = [...accounts].sort((a, b) => {
      const nameA = (a.name || a.account_name || '').toLowerCase();
      const nameB = (b.name || b.account_name || '').toLowerCase();
      return nameA.localeCompare(nameB, 'en', { sensitivity: 'base' });
    });

    const cleanSearch = searchFilter.trim().toLowerCase();
    if (!cleanSearch) return sorted;

    return sorted.filter(acc => {
      const name = (acc.name || acc.account_name || '').toLowerCase();
      const type = (acc.type || acc.primary_type || '').toLowerCase();
      const group = (acc.group || acc.sub_group || '').toLowerCase();
      return name.includes(cleanSearch) || type.includes(cleanSearch) || group.includes(cleanSearch);
    });
  }, [accounts, searchFilter]);

  return (
    <div style={{ padding: '4px', maxWidth: '650px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', backgroundColor: '#f8fafc', color: '#0f172a' }}>
      
      {/* Create / Edit Form Card */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', marginBottom: '16px', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {editingId ? '✏️ Edit Account Head' : `📊 Create & Manage Account Heads (${businessCategory})`}
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

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" style={{ flex: 1, backgroundColor: editingId ? '#059669' : '#0284c7', color: '#fff', border: 'none', padding: '11px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
              {editingId ? '✓ Update Account Head' : '+ Save Professional Account Head'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setAccountName(''); setOpeningBalance(''); }} style={{ padding: '11px 14px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Account Heads Register & Search Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '12px', color: '#0f172a', fontWeight: 'bold' }}>All Firm Account Heads ({processedAccounts.length})</h4>
          <input
            type="text"
            placeholder="🔍 Search account name, type..."
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', outline: 'none', width: '180px', backgroundColor: '#fff', color: '#0f172a' }}
          />
        </div>

        {processedAccounts.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '16px', fontSize: '11px' }}>Koi account head nahi mila.</div>
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
                {processedAccounts.map(acc => {
                  const aName = acc.name || acc.account_name || '';
                  const aType = acc.type || acc.primary_type || '';
                  const aGroup = acc.group || acc.sub_group || '';
                  const aBal = acc.openingBalance !== undefined ? acc.openingBalance : (acc.opening_balance || 0);
                  const aBalType = acc.balanceType || acc.balance_type || 'Dr';

                  return (
                    <tr key={acc.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: '#0f172a' }}>{aName}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ color: '#0284c7', fontWeight: 'bold' }}>{aType}</span>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{aGroup}</div>
                      </td>
                      <td style={{ padding: '8px', color: '#334155' }}>{aBal ? `₹${Number(aBal).toLocaleString('en-IN')} ${aBalType}` : '-'}</td>
                      <td style={{ padding: '8px', textAlign: 'center', display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button onClick={() => handleEdit(acc)} style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>
                          Edit
                        </button>
                        {!acc.isSystemLocked && (
                          <button onClick={() => handleDelete(acc.id, acc.isSystemLocked)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
