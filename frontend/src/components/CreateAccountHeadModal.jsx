// frontend/src/components/CreateAccountHeadModal.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { getFirmMasterAccounts, saveMasterAccount, deleteMasterAccount } from '../utils/accountMasterEngine.js';

export default function CreateAccountHeadModal({ firm, selectedFY, onClose }) {
  const firmId = firm?.id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  const businessCategory = firm?.businessCategory || firm?.firmType || 'MANUFACTURING';

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
          'Direct Labor & Wages (मज़दूर)',
          'Factory Machinery Repairs & Maintenance',
          'Freight & Cartage Inward (भाड़ा)',
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

  const loadAccounts = () => {
    const data = getFirmMasterAccounts(firmId);
    setAccounts(data);
  };

  useEffect(() => {
    loadAccounts();

    window.addEventListener('app_storage_updated', loadAccounts);
    window.addEventListener('app_state_updated', loadAccounts);

    return () => {
      window.removeEventListener('app_storage_updated', loadAccounts);
      window.removeEventListener('app_state_updated', loadAccounts);
    };
  }, [firmId]);

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
    const cleanName = accountName.trim();
    if (!cleanName) {
      alert("Kripya Account Name darj karein!");
      return;
    }

    try {
      saveMasterAccount(firmId, {
        id: editingId || undefined,
        account_name: cleanName,
        name: cleanName,
        primary_type: accountType,
        type: accountType,
        sub_group: selectedGroup,
        group: selectedGroup,
        opening_balance: Number(openingBalance) || 0,
        openingBalance: Number(openingBalance) || 0,
        balance_type: openingBalance ? balanceType : 'Dr',
        balanceType: openingBalance ? balanceType : 'Dr',
        businessCategory,
        createdAtFY: selectedFY
      });

      alert(editingId ? "✓ Account Head aur purani sabhi entries successfully update ho gayi hain!" : "✓ Naya Account Head create ho gaya!");
      setEditingId(null);
      setAccountName('');
      setOpeningBalance('');
      loadAccounts();
    } catch (err) {
      alert("Error saving account: " + err.message);
    }
  };

  const handleEdit = (acc) => {
    setEditingId(acc.id);
    setAccountName(acc.account_name || acc.name || '');
    setAccountType(acc.primary_type || acc.type || 'Expenses');
    setSelectedGroup(acc.sub_group || acc.group || '');
    setOpeningBalance(acc.opening_balance !== undefined ? acc.opening_balance : (acc.openingBalance || ''));
    setBalanceType(acc.balance_type || acc.balanceType || 'Dr');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id, isLocked) => {
    if (isLocked) {
      alert("⚠️ System core baseline accounts ko delete nahi kiya ja sakta.");
      return;
    }
    if (window.confirm("Kya aap is account head ko delete karna chahte hain?")) {
      try {
        deleteMasterAccount(firmId, id);
        if (editingId === id) {
          setEditingId(null);
          setAccountName('');
          setOpeningBalance('');
        }
        loadAccounts();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const processedAccounts = useMemo(() => {
    const sorted = [...accounts].sort((a, b) => {
      const nameA = (a.account_name || a.name || '').toLowerCase();
      const nameB = (b.account_name || b.name || '').toLowerCase();
      return nameA.localeCompare(nameB, 'en', { sensitivity: 'base' });
    });

    const cleanSearch = searchFilter.trim().toLowerCase();
    if (!cleanSearch) return sorted;

    return sorted.filter(acc => {
      const name = (acc.account_name || acc.name || '').toLowerCase();
      const type = (acc.primary_type || acc.type || '').toLowerCase();
      const group = (acc.sub_group || acc.group || '').toLowerCase();
      return name.includes(cleanSearch) || type.includes(cleanSearch) || group.includes(cleanSearch);
    });
  }, [accounts, searchFilter]);

  return (
    <div style={{ padding: '4px', maxWidth: '650px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', backgroundColor: '#f8fafc', color: '#0f172a' }}>
      
      {/* Create / Edit Form Card */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', marginBottom: '16px', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {editingId ? '✏️ Edit Account Head' : `📊 Create & Manage Account Heads (${businessCategory})`}
          </h3>
          {onClose && (
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
          )}
        </div>

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
              {editingId ? '✓ Update Account & Cascade All Vouchers' : '+ Save Professional Account Head'}
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
                  const aName = acc.account_name || acc.name || '';
                  const aType = acc.primary_type || acc.type || '';
                  const aGroup = acc.sub_group || acc.group || '';
                  const aBal = acc.opening_balance !== undefined ? acc.opening_balance : (acc.openingBalance || 0);
                  const aBalType = acc.balance_type || acc.balanceType || 'Dr';
                  const isLocked = acc.is_system_locked || acc.isSystemLocked;

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
                        {!isLocked && (
                          <button onClick={() => handleDelete(acc.id, isLocked)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>
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
