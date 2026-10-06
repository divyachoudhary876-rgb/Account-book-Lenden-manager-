// frontend/src/components/CreateAccountHeadModal.jsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  getFirmMasterAccounts, 
  saveMasterAccount, 
  deleteMasterAccount, 
  STANDARD_ACCOUNT_SUGGESTIONS 
} from '../utils/accountMasterEngine.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

// 6 Real-Life Business Intent Categories
const BUSINESS_CATEGORIES = [
  {
    id: 'DEBTOR',
    title: 'Customer / Grahak',
    subtitle: 'ईंट व माल खरीदने वाला',
    icon: '🛒',
    color: '#0284c7',
    primaryType: 'ASSETS',
    subGroup: 'Sundry Debtors (Customer / देनदार)',
    defaultBalanceType: 'Dr',
    balanceLabel: 'बाकी लेना है'
  },
  {
    id: 'CREDITOR',
    title: 'Supplier / Vyapari',
    subtitle: 'कोयला, मिट्टी, सीमेंट सप्लायर',
    icon: '🚚',
    color: '#b45309',
    primaryType: 'LIABILITIES',
    subGroup: 'Sundry Creditors (Suppliers / लेनदार)',
    defaultBalanceType: 'Cr',
    balanceLabel: 'बाकी देना है'
  },
  {
    id: 'THEKEDAR',
    title: 'Thekedar / Mazdoor',
    subtitle: 'पथाई, भराई, निकासी व लेबर',
    icon: '👷',
    color: '#166534',
    primaryType: 'LIABILITIES',
    subGroup: 'Outstanding Expenses Payable',
    defaultBalanceType: 'Cr',
    balanceLabel: 'बाकी देना है'
  },
  {
    id: 'BANK_CASH',
    title: 'Bank & Cash',
    subtitle: 'SBI, PNB, Cash, UPI QR',
    icon: '🏦',
    color: '#0f766e',
    primaryType: 'ASSETS',
    subGroup: 'Cash in Hand (रोकड़)',
    defaultBalanceType: 'Dr',
    balanceLabel: 'उपलब्ध बैलेंस'
  },
  {
    id: 'ASSET',
    title: 'Machine & Property',
    subtitle: 'ट्रैक्टर, जमीन, चिमनी, झोपड़ी',
    icon: '🚜',
    color: '#4338ca',
    primaryType: 'ASSETS',
    subGroup: 'Fixed Assets (Machinery / Vehicles / Land)',
    defaultBalanceType: 'Dr',
    balanceLabel: 'संपत्ति का मूल्य'
  },
  {
    id: 'EXPENSE',
    title: 'Kharcha (Expense)',
    subtitle: 'डीजल, मरम्मत, ऑफिस खर्च',
    icon: '📉',
    color: '#be123c',
    primaryType: 'EXPENSES',
    subGroup: 'Operating Fuel Costs (Tractor / Generator Diesel)',
    defaultBalanceType: 'Dr',
    balanceLabel: 'आरंभिक खर्च'
  }
];

export default function CreateAccountHeadModal({ firm, selectedFY, isOpen = true, onClose }) {
  const firmId = firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';

  const [accounts, setAccounts] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // Form States
  const [selectedCatId, setSelectedCatId] = useState('DEBTOR');
  const [accountName, setAccountName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [balanceDirection, setBalanceDirection] = useState('LE_NA_HAI'); // 'LE_NA_HAI' (Dr) | 'DE_NA_HAI' (Cr)

  // Autocomplete / Search States
  const [showDropdownSuggestions, setShowDropdownSuggestions] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);
  
  const dropdownRef = useRef(null);

  const activeCategory = useMemo(() => {
    return BUSINESS_CATEGORIES.find(c => c.id === selectedCatId) || BUSINESS_CATEGORIES[0];
  }, [selectedCatId]);

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

  // Sync default balance direction on category change
  useEffect(() => {
    if (!editingId) {
      if (activeCategory.defaultBalanceType === 'Dr') {
        setBalanceDirection('LE_NA_HAI');
      } else {
        setBalanceDirection('DE_NA_HAI');
      }
    }
  }, [selectedCatId, activeCategory, editingId]);

  // Close suggestions dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdownSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered auto-complete suggestions matching user keystrokes
  const filteredSuggestions = useMemo(() => {
    const q = accountName.trim().toLowerCase();
    if (!q) return [];
    return STANDARD_ACCOUNT_SUGGESTIONS.filter(s => 
      s.name.toLowerCase().includes(q) && s.name.toLowerCase() !== q
    ).slice(0, 5);
  }, [accountName]);

  const handleApplySuggestion = (sug) => {
    setAccountName(sug.name);
    setSelectedCatId(sug.categoryId);
    setBalanceDirection(sug.balanceType === 'Dr' ? 'LE_NA_HAI' : 'DE_NA_HAI');
    setShowDropdownSuggestions(false);
    setStatusMessage(null);
  };

  const handleSaveAccount = (e) => {
    e.preventDefault();
    setStatusMessage(null);

    const cleanName = accountName.trim();
    if (!cleanName) {
      setStatusMessage({ type: 'error', text: 'Kripya khate ka naam darj karein!' });
      return;
    }

    try {
      const numBalance = parseFloat(openingBalance) || 0;
      const finalBalanceType = balanceDirection === 'LE_NA_HAI' ? 'Dr' : 'Cr';

      saveMasterAccount(firmId, {
        id: editingId || undefined,
        account_name: cleanName,
        name: cleanName,
        primary_type: activeCategory.primaryType,
        type: activeCategory.primaryType,
        sub_group: activeCategory.subGroup,
        group: activeCategory.subGroup,
        businessCategory: selectedCatId,
        phone: phone.trim(),
        address: address.trim(),
        opening_balance: round2(numBalance),
        openingBalance: round2(numBalance),
        balance_type: numBalance > 0 ? finalBalanceType : 'Dr',
        balanceType: numBalance > 0 ? finalBalanceType : 'Dr',
        createdAtFY: selectedFY
      });

      setStatusMessage({
        type: 'success',
        text: editingId 
          ? `✓ Khata "${cleanName}" aur purani entries successfully update ho gayi!` 
          : `✓ Naya khata "${cleanName}" safaltapoorvak jod diya gaya!`
      });

      setEditingId(null);
      setAccountName('');
      setPhone('');
      setAddress('');
      setOpeningBalance('');
      loadAccounts();

      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const handleEdit = (acc) => {
    setEditingId(acc.id);
    setAccountName(acc.account_name || acc.name || '');
    setPhone(acc.phone || acc.mobile || '');
    setAddress(acc.address || '');

    // Robust mapping for backup accounts back into visual intent categories
    const grp = (acc.sub_group || acc.group || '').toLowerCase();
    const pType = (acc.primary_type || acc.type || '').toUpperCase();
    const bCat = (acc.businessCategory || '').toUpperCase();

    if (bCat && BUSINESS_CATEGORIES.some(c => c.id === bCat)) {
      setSelectedCatId(bCat);
    } else if (grp.includes('debtor') || grp.includes('customer') || (acc.name || '').toLowerCase().includes('grahak')) {
      setSelectedCatId('DEBTOR');
    } else if (grp.includes('creditor') || grp.includes('supplier')) {
      setSelectedCatId('CREDITOR');
    } else if (grp.includes('labor') || grp.includes('wages') || grp.includes('thekedar') || grp.includes('payable')) {
      setSelectedCatId('THEKEDAR');
    } else if (grp.includes('cash') || grp.includes('bank') || (acc.name || '').toLowerCase().includes('रोकड़')) {
      setSelectedCatId('BANK_CASH');
    } else if (pType === 'ASSETS' && (grp.includes('fixed') || grp.includes('machinery') || grp.includes('land') || (acc.name || '').toLowerCase().includes('tractor'))) {
      setSelectedCatId('ASSET');
    } else {
      setSelectedCatId('EXPENSE');
    }

    const bal = acc.opening_balance !== undefined ? acc.opening_balance : (acc.openingBalance || 0);
    setOpeningBalance(bal ? String(bal) : '');
    setBalanceDirection((acc.balance_type || acc.balanceType || 'Dr') === 'Dr' ? 'LE_NA_HAI' : 'DE_NA_HAI');

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
    const cleanSearch = searchFilter.trim().toLowerCase();
    const sorted = [...accounts].sort((a, b) => {
      const nameA = (a.account_name || a.name || '').toLowerCase();
      const nameB = (b.account_name || b.name || '').toLowerCase();
      return nameA.localeCompare(nameB, 'en', { sensitivity: 'base' });
    });

    if (!cleanSearch) return sorted;
    return sorted.filter(acc => {
      const n = (acc.account_name || acc.name || '').toLowerCase();
      const g = (acc.sub_group || acc.group || '').toLowerCase();
      const p = (acc.phone || acc.mobile || '').toLowerCase();
      return n.includes(cleanSearch) || g.includes(cleanSearch) || p.includes(cleanSearch);
    });
  }, [accounts, searchFilter]);

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
              {editingId ? '✏️ Edit Account Head' : '✨ Naya Khata Banayein (Add Account)'}
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Professional Indian Accounting Standard (Ind AS / GAAP) Compliant
            </span>
          </div>
          {onClose && (
            <button 
              type="button" 
              onClick={onClose} 
              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', color: '#64748b' }}
            >
              ✕
            </button>
          )}
        </div>

        {statusMessage && (
          <div style={{
            backgroundColor: statusMessage.type === 'error' ? '#fef2f2' : '#ecfdf5',
            border: `1px solid ${statusMessage.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
            color: statusMessage.type === 'error' ? '#991b1b' : '#065f46',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 'bold',
            marginBottom: '10px'
          }}>
            {statusMessage.text}
          </div>
        )}

        {/* Quick Click Suggestion Chips */}
        {!editingId && (
          <div style={{ marginBottom: '12px' }}>
            <span style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              ⚡ Popular Bhatta Heads (Click to Quick Fill):
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {STANDARD_ACCOUNT_SUGGESTIONS.slice(0, 6).map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplySuggestion(tpl)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '3px 7px',
                    fontSize: '10px',
                    fontWeight: '700',
                    color: '#0369a1',
                    cursor: 'pointer'
                  }}
                >
                  + {tpl.name.split(' (')[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSaveAccount} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* 1. Category Intent Selector */}
          <div>
            <label style={labelStyle}>1. KHATE KI CATEGORY CHUNEIN (SELECT TYPE) *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }}>
              {BUSINESS_CATEGORIES.map(cat => {
                const isSelected = selectedCatId === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCatId(cat.id)}
                    style={{
                      border: `2px solid ${isSelected ? cat.color : '#e2e8f0'}`,
                      backgroundColor: isSelected ? `${cat.color}0D` : '#ffffff',
                      borderRadius: '8px',
                      padding: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '14px' }}>{cat.icon}</span>
                      <strong style={{ fontSize: '11px', color: isSelected ? cat.color : '#0f172a' }}>
                        {cat.title}
                      </strong>
                    </div>
                    <span style={{ fontSize: '9px', color: '#64748b' }}>
                      {cat.subtitle}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Account Name with Predictive Typeahead */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <label style={labelStyle}>2. KHATE KA NAAM (ACCOUNT NAME) *</label>
            <input 
              type="text" 
              placeholder={
                selectedCatId === 'DEBTOR' ? 'e.g. Ramlal (Bawan Khera) / Jai Shree Ram Builders' :
                selectedCatId === 'CREDITOR' ? 'e.g. Sharma Coal Agency / Agarwal Cement' :
                selectedCatId === 'THEKEDAR' ? 'e.g. Raju Mistri (Pathai) / Sonu Tractor' :
                selectedCatId === 'BANK_CASH' ? 'e.g. SBI Current A/c 5421 / Tijori Cash' :
                selectedCatId === 'ASSET' ? 'e.g. Mahindra Tractor 575 DI / JCB' :
                'e.g. Bhatta Repair / Tractor Diesel'
              }
              value={accountName} 
              onChange={e => {
                setAccountName(e.target.value);
                setShowDropdownSuggestions(true);
              }}
              onFocus={() => setShowDropdownSuggestions(true)}
              style={{ ...inputStyle, fontSize: '12px', fontWeight: 'bold' }} 
              required 
            />

            {/* Smart Auto-Complete Dropdown */}
            {showDropdownSuggestions && filteredSuggestions.length > 0 && (
              <div style={autocompleteBoxStyle}>
                <div style={{ padding: '4px 8px', fontSize: '9px', fontWeight: '800', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>
                  SUGGESTED HEADS (Click to select):
                </div>
                {filteredSuggestions.map((sug, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleApplySuggestion(sug)}
                    style={autocompleteItemStyle}
                  >
                    <div>
                      <strong style={{ color: '#0f172a' }}>{sug.name}</strong>
                      <span style={{ fontSize: '9px', color: '#64748b', marginLeft: '6px' }}>({sug.subGroup})</span>
                    </div>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#0284c7' }}>
                      {sug.balanceType === 'Dr' ? 'Dr (Lena)' : 'Cr (Dena)'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Optional Mobile & Location for Parties */}
          {(selectedCatId === 'DEBTOR' || selectedCatId === 'CREDITOR' || selectedCatId === 'THEKEDAR') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={labelStyle}>MOBILE NUMBER (ऐच्छिक)</label>
                <input 
                  type="tel" 
                  placeholder="e.g. 9876543210" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  style={inputStyle} 
                />
              </div>
              <div>
                <label style={labelStyle}>GAON / SHAHAR (LOCATION)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Hanumangarh Town" 
                  value={address} 
                  onChange={e => setAddress(e.target.value)} 
                  style={inputStyle} 
                />
              </div>
            </div>
          )}

          {/* 3. Opening Balance & Direction (No Dr/Cr Jargon) */}
          <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ ...labelStyle, color: '#0f172a' }}>
              3. PICHHLA PURANA BAKI HISAB (OPENING BALANCE - AGAR HO TOH)
            </label>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
              <input 
                type="number" 
                step="0.01" 
                placeholder="0.00 (Agar koi baki na ho toh khali chhod dein)" 
                value={openingBalance} 
                onChange={e => setOpeningBalance(e.target.value)} 
                style={{ ...inputStyle, fontSize: '13px', fontWeight: '800', color: '#059669', flex: 1 }} 
              />
            </div>

            {Number(openingBalance) > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setBalanceDirection('LE_NA_HAI')}
                  style={{
                    padding: '7px 6px',
                    borderRadius: '6px',
                    border: '2px solid',
                    borderColor: balanceDirection === 'LE_NA_HAI' ? '#0284c7' : '#cbd5e1',
                    backgroundColor: balanceDirection === 'LE_NA_HAI' ? '#e0f2fe' : '#ffffff',
                    color: balanceDirection === 'LE_NA_HAI' ? '#0369a1' : '#475569',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  🟢 Baki Lena Hai (Receivable / Dr)
                </button>

                <button
                  type="button"
                  onClick={() => setBalanceDirection('DE_NA_HAI')}
                  style={{
                    padding: '7px 6px',
                    borderRadius: '6px',
                    border: '2px solid',
                    borderColor: balanceDirection === 'DE_NA_HAI' ? '#dc2626' : '#cbd5e1',
                    backgroundColor: balanceDirection === 'DE_NA_HAI' ? '#fee2e2' : '#ffffff',
                    color: balanceDirection === 'DE_NA_HAI' ? '#b91c1c' : '#475569',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  🔴 Humein Dena Hai (Payable / Cr)
                </button>
              </div>
            )}
          </div>

          {/* 4. Live Confirmation Preview */}
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '8px 10px',
            fontSize: '11px',
            color: '#166534',
            lineHeight: '1.4'
          }}>
            <strong>✓ Pushti (Summary):</strong> Aap <strong>"{accountName || 'Naya Khata'}"</strong> ko{' '}
            <strong style={{ color: activeCategory.color }}>[{activeCategory.title}]</strong> category me save kar rahe hain.
            {Number(openingBalance) > 0 && (
              <span>
                {' '}Pichhla balance: <strong>₹{Number(openingBalance).toLocaleString('en-IN')}</strong>{' '}
                ({balanceDirection === 'LE_NA_HAI' ? 'Humein lena baki hai / Dr' : 'Humein dena baki hai / Cr'}).
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
            <button 
              type="submit" 
              style={{
                flex: 1,
                padding: '11px',
                backgroundColor: editingId ? '#059669' : '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
              }}
            >
              {editingId ? '✓ Update Account Head' : '💾 Save & Create Account'}
            </button>

            {editingId && (
              <button 
                type="button" 
                onClick={() => {
                  setEditingId(null);
                  setAccountName('');
                  setOpeningBalance('');
                  setPhone('');
                  setAddress('');
                }}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            )}
          </div>

        </form>

        {/* Existing Accounts Table with Search */}
        <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
            <strong style={{ fontSize: '12px', color: '#0f172a' }}>
              📋 Registered Accounts ({processedAccounts.length})
            </strong>
            <input 
              type="text" 
              placeholder="🔍 Search accounts..." 
              value={searchFilter} 
              onChange={e => setSearchFilter(e.target.value)} 
              style={{ ...inputStyle, width: '160px', padding: '5px 8px', fontSize: '10px' }} 
            />
          </div>

          <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {processedAccounts.map(acc => {
              const bal = acc.opening_balance !== undefined ? acc.opening_balance : (acc.openingBalance || 0);
              const isLocked = acc.is_system_locked || acc.isSystemLocked;

              return (
                <div 
                  key={acc.id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '6px 8px', 
                    backgroundColor: editingId === acc.id ? '#eff6ff' : '#f8fafc', 
                    borderRadius: '6px', 
                    border: '1px solid #e2e8f0',
                    fontSize: '11px'
                  }}
                >
                  <div>
                    <strong style={{ color: '#0f172a' }}>{acc.account_name || acc.name}</strong>
                    <div style={{ fontSize: '9px', color: '#64748b' }}>
                      {acc.sub_group || acc.group} {acc.phone ? `| 📞 ${acc.phone}` : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '10px', color: (acc.balance_type || acc.balanceType) === 'Dr' ? '#0284c7' : '#dc2626' }}>
                      {bal ? `₹${Number(bal).toLocaleString('en-IN')} ${acc.balance_type || 'Dr'}` : '-'}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => handleEdit(acc)} 
                      style={{ padding: '3px 6px', backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '9px', fontWeight: 'bold' }}
                    >
                      Edit
                    </button>
                    {!isLocked && (
                      <button 
                        type="button" 
                        onClick={() => handleDelete(acc.id, isLocked)} 
                        style={{ padding: '3px 6px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '9px', fontWeight: 'bold' }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
  backdropFilter: 'blur(3
