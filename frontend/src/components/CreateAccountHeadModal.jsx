// frontend/src/components/CreateAccountHeadModal.jsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  getFirmMasterAccounts, 
  saveMasterAccount, 
  deleteMasterAccount, 
  getIndustrySuggestions,
  resolveIndustryKey 
} from '../utils/accountMasterEngine.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export default function CreateAccountHeadModal({ firm, selectedFY, isOpen = true, onClose }) {
  const firmId = firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  
  const rawCat = useMemo(() => {
    return String(
      firm?.category || 
      firm?.businessCategory || 
      firm?.firmType || 
      firm?.industry || 
      localStorage.getItem(`app_firm_category_${firmId}`) || 
      ''
    ).toUpperCase();
  }, [firm, firmId]);

  const industryKey = useMemo(() => resolveIndustryKey(rawCat), [rawCat]);

  const [accounts, setAccounts] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // Form States
  const [selectedCatId, setSelectedCatId] = useState('DEBTOR');
  const [accountName, setAccountName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [balanceDirection, setBalanceDirection] = useState('LE_NA_HAI');

  // Manual Guide Modal State
  const [isManualOpen, setIsManualOpen] = useState(false);

  const [showDropdownSuggestions, setShowDropdownSuggestions] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);
  
  const dropdownRef = useRef(null);

  const businessCategories = useMemo(() => {
    const isBhatta = industryKey === 'BRICK_KILN';

    return [
      {
        id: 'DEBTOR',
        title: 'Customer / Grahak',
        subtitle: isBhatta ? 'ईंट व माल खरीदने वाला ग्राहक' : 'दुकानदार व रिटेल ग्राहक (Customer)',
        primaryBadge: 'Assets • Normal Dr',
        icon: '🛒',
        color: '#0284c7',
        primaryType: 'ASSETS',
        subGroup: 'Sundry Debtors (Customer / देनदार)',
        defaultBalanceType: 'Dr',
        isParty: true
      },
      {
        id: 'CREDITOR',
        title: 'Supplier / Vyapari',
        subtitle: isBhatta ? 'कोयला, मिट्टी, सीमेंट सप्लायर' : 'होलसेलर व माल सप्लायर (Vendor)',
        primaryBadge: 'Liabilities • Normal Cr',
        icon: '🚚',
        color: '#b45309',
        primaryType: 'LIABILITIES',
        subGroup: 'Sundry Creditors (Suppliers / लेनदार)',
        defaultBalanceType: 'Cr',
        isParty: true
      },
      {
        id: 'THEKEDAR',
        title: isBhatta ? 'Thekedar / Worker' : 'Staff & Worker',
        subtitle: isBhatta ? 'पथाई, भराई, निकासी व लेबर ठेका' : 'कर्मचारी वेतन व मजदूर',
        primaryBadge: 'Liabilities • Normal Cr',
        icon: '👷',
        color: '#166534',
        primaryType: 'LIABILITIES',
        subGroup: 'Outstanding Expenses Payable',
        defaultBalanceType: 'Cr',
        isParty: true
      },
      {
        id: 'BANK_CASH',
        title: 'Bank & Cash',
        subtitle: 'SBI, PNB, Cash in Hand, UPI',
        primaryBadge: 'Assets • Normal Dr',
        icon: '🏦',
        color: '#0f766e',
        primaryType: 'ASSETS',
        subGroup: 'Cash in Hand (रोकड़)',
        defaultBalanceType: 'Dr',
        isParty: false
      },
      {
        id: 'ASSET',
        title: 'Machine & Property',
        subtitle: 'ट्रैक्टर, जमीन, चिमनी, Godown, Mining Security',
        primaryBadge: 'Assets • Normal Dr',
        icon: '🚜',
        color: '#4338ca',
        primaryType: 'ASSETS',
        subGroup: 'Fixed Assets & Security Deposits',
        defaultBalanceType: 'Dr',
        isParty: false
      },
      {
        id: 'EXPENSE',
        title: 'Kharcha (Expense)',
        subtitle: 'डीजल, मरम्मत, मजदूरी, Mining Duty',
        primaryBadge: 'Expenses • Normal Dr',
        icon: '📉',
        color: '#be123c',
        primaryType: 'EXPENSES',
        subGroup: 'Direct Production & Factory Expenses',
        defaultBalanceType: 'Dr',
        isParty: false
      },
      {
        id: 'INCOME',
        title: 'Income / Sales',
        subtitle: 'बिक्री, Commission, Interest Received',
        primaryBadge: 'Income • Normal Cr',
        icon: '📈',
        color: '#059669',
        primaryType: 'INCOME',
        subGroup: 'Direct Sales Revenue (बिक्री)',
        defaultBalanceType: 'Cr',
        isParty: false
      },
      {
        id: 'CAPITAL',
        title: 'Capital & Equity',
        subtitle: 'मालिक/पार्टनर की पूंजी (Capital Account)',
        primaryBadge: 'Equity • Normal Cr',
        icon: '💼',
        color: '#7c3aed',
        primaryType: 'EQUITY',
        subGroup: 'Proprietor / Partner Capital Account',
        defaultBalanceType: 'Cr',
        isParty: false
      }
    ];
  }, [industryKey]);

  const activeCategory = useMemo(() => {
    return businessCategories.find(c => c.id === selectedCatId) || businessCategories[0];
  }, [selectedCatId, businessCategories]);

  const industrySuggestions = useMemo(() => {
    return getIndustrySuggestions(rawCat);
  }, [rawCat]);

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
    if (!editingId) {
      if (activeCategory.defaultBalanceType === 'Dr') {
        setBalanceDirection('LE_NA_HAI');
      } else {
        setBalanceDirection('DE_NA_HAI');
      }
    }
  }, [selectedCatId, activeCategory, editingId]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdownSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = useMemo(() => {
    const q = accountName.trim().toLowerCase();
    if (!q) return [];
    return industrySuggestions.filter(s => 
      s.categoryId === selectedCatId &&
      s.name.toLowerCase().includes(q) && 
      s.name.toLowerCase() !== q
    ).slice(0, 5);
  }, [accountName, selectedCatId, industrySuggestions]);

  const handleApplySuggestion = (sug) => {
    setAccountName(sug.name);
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
        balance_type: numBalance > 0 ? finalBalanceType : activeCategory.defaultBalanceType,
        balanceType: numBalance > 0 ? finalBalanceType : activeCategory.defaultBalanceType,
        createdAtFY: selectedFY
      });

      setStatusMessage({
        type: 'success',
        text: editingId 
          ? `✓ Khata "${cleanName}" successfully update ho gaya!` 
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

    const grp = (acc.sub_group || acc.group || '').toLowerCase();
    const pType = (acc.primary_type || acc.type || '').toUpperCase();

    if (pType === 'INCOME') setSelectedCatId('INCOME');
    else if (pType === 'EQUITY') setSelectedCatId('CAPITAL');
    else if (pType === 'EXPENSES') setSelectedCatId('EXPENSE');
    else if (pType === 'ASSETS' && (grp.includes('security') || grp.includes('fixed') || grp.includes('property'))) setSelectedCatId('ASSET');
    else if (pType === 'ASSETS' && (grp.includes('bank') || grp.includes('cash'))) setSelectedCatId('BANK_CASH');
    else if (pType === 'ASSETS') setSelectedCatId('DEBTOR');
    else setSelectedCatId('CREDITOR');

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
        
        {/* Header with Manual Guide Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
              {editingId ? '✏️ Edit Account Head' : `✨ Naya Khata Banayein (${firm?.legal_name || firm?.trade_name || 'Business'})`}
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Multi-Firm Indian Accounting Standards (Ind AS / GAAP) Compliant
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setIsManualOpen(true)}
              style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              📖 Help Manual
            </button>
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
        </div>

        {/* HELP MANUAL MODAL POPUP */}
        {isManualOpen && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px', marginBottom: '14px', fontSize: '11px', color: '#166534', lineHeight: '1.5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', borderBottom: '1px solid #dcfce7', paddingBottom: '4px' }}>
              <strong style={{ fontSize: '12px', color: '#14532d' }}>📖 Account Creation Help Manual (किस खाते को कहाँ बनाएँ?)</strong>
              <button onClick={() => setIsManualOpen(false)} style={{ background: 'none', border: 'none', fontWeight: 'bold', color: '#166534', cursor: 'pointer' }}>✕ Close</button>
            </div>
            <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>🛒 <strong>Customer / Grahak:</strong> Jinse paise lene baaki hain ya jo aapse mal kharida karte hain (Sundry Debtors).</li>
              <li>🚚 <strong>Supplier / Vyapari:</strong> Jinhe paise dene hain ya jo aapko koyla, mitti, cement soplai karte hain (Sundry Creditors).</li>
              <li>👷 <strong>Thekedar / Worker:</strong> Pathai, bharai, nikasi karne wale mazdoor ya driver jinhe mazdoori deni hai.</li>
              <li>🏦 <strong>Bank & Cash:</strong> SBI, PNB, Galla Cash, ya Bank Interest A/c.</li>
              <li>🚜 <strong>Machine & Property:</strong> Tractor, Jhughi Construction (Building), Godown, aur Mining Security Deposits.</li>
              <li>📉 <strong>Kharcha (Expense):</strong> Diesel, repair, electricity, Mining Duty, aur miscellaneous factory kharche.</li>
              <li>📈 <strong>Income / Sales:</strong> Kisi bhi prakar ki aay, commission, ya sales account.</li>
              <li>💼 <strong>Capital & Equity:</strong> Malik ya partner ki पूंजी (Capital Account).</li>
            </ul>
          </div>
        )}

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

        <form onSubmit={handleSaveAccount} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* 1. Category Intent Selector with Badges */}
          <div>
            <label style={labelStyle}>1. KHATE KI CATEGORY CHUNEIN (SELECT TYPE) *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '6px' }}>
              {businessCategories.map(cat => {
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
                      <span style={{ fontSize: '13px' }}>{cat.icon}</span>
                      <strong style={{ fontSize: '11px', color: isSelected ? cat.color : '#0f172a' }}>
                        {cat.title}
                      </strong>
                    </div>
                    <span style={{ fontSize: '9px', color: '#64748b', lineHeight: '1.2' }}>
                      {cat.subtitle}
                    </span>
                    <span style={{ fontSize: '8.5px', fontWeight: 'bold', color: isSelected ? cat.color : '#0369a1', marginTop: '2px', backgroundColor: '#f1f5f9', padding: '1px 4px', borderRadius: '4px', width: 'fit-content' }}>
                      {cat.primaryBadge}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Account Name Input */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <label style={labelStyle}>2. KHATE KA NAAM (ACCOUNT NAME) *</label>
            <input 
              type="text" 
              placeholder="e.g. Mining Security / Jhughi Construction / Bank Interest"
              value={accountName} 
              onChange={e => {
                setAccountName(e.target.value);
                setShowDropdownSuggestions(true);
              }}
              style={{ ...inputStyle, fontSize: '12px', fontWeight: 'bold', width: '100%' }} 
              required 
            />
          </div>

          {activeCategory.isParty && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={labelStyle}>MOBILE NUMBER (ऐच्छिक)</label>
                <input type="tel" placeholder="e.g. 9876543210" value={phone} onChange={e => setPhone(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div>
                <label style={labelStyle}>SHAHAR / GAON / ADDRESS</label>
                <input type="text" placeholder="e.g. Hanumangarh Town" value={address} onChange={e => setAddress(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
              </div>
            </div>
          )}

          {/* 3. Opening Balance & Direction */}
          <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ ...labelStyle, color: '#0f172a' }}>
              3. PICHHLA PURANA BAKI HISAB (OPENING BALANCE)
            </label>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
              <input 
                type="number" 
                step="0.01" 
                placeholder="0.00" 
                value={openingBalance} 
                onChange={e => setOpeningBalance(e.target.value)} 
                style={{ ...inputStyle, fontSize: '13px', fontWeight: '800', color: '#059669', width: '100%', flex: 1 }} 
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
                cursor: 'pointer'
              }}
            >
              {editingId ? '✓ Update Account Head' : '💾 Save & Create Account'}
            </button>
          </div>

        </form>

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
  backdropFilter: 'blur(3px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 99999,
  padding: '10px',
  boxSizing: 'border-box'
};

const modalCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '16px',
  width: '100%',
  maxWidth: '560px',
  maxHeight: '94vh',
  overflowY: 'auto',
  border: '1px solid #e2e8f0',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  boxSizing: 'border-box',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
};

const labelStyle = {
  display: 'block',
  fontSize: '10px',
  fontWeight: '800',
  color: '#475569',
  marginBottom: '3px',
  letterSpacing: '0.3px',
  textTransform: 'uppercase'
};

const inputStyle = {
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '11px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  outline: 'none'
};
