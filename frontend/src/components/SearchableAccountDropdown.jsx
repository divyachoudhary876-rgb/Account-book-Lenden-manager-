// frontend/src/components/SearchableAccountDropdown.jsx

import React, { useState, useEffect, useRef } from 'react';

export default function SearchableAccountDropdown({
  label = 'Select Account',
  accounts = [],
  value = '',
  onChange,
  placeholder = '-- Search or Select Account --',
  required = false,
  colorAccent = '#0284c7',
  onAddNew = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredAccounts = accounts.filter(acc => {
    const term = searchTerm.toLowerCase();
    return (
      acc.account_name.toLowerCase().includes(term) ||
      (acc.sub_group && acc.sub_group.toLowerCase().includes(term))
    );
  });

  const selectedAccount = accounts.find(a => a.account_name === value);

  const handleSelect = (accountName) => {
    onChange(accountName);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      {label && (
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
          {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
        </label>
      )}

      {/* Selected Box / Toggle Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: '8px',
          border: `1px solid ${isOpen ? colorAccent : '#cbd5e1'}`,
          backgroundColor: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          boxSizing: 'border-box',
          boxShadow: isOpen ? `0 0 0 2px ${colorAccent}25` : 'none',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedAccount ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>{selectedAccount.account_name}</strong>
              <span style={{ fontSize: '10px', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                {selectedAccount.sub_group || selectedAccount.primary_type}
              </span>
            </div>
          ) : (
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>{placeholder}</span>
          )}
        </div>
        <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '6px' }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {/* Dropdown Floating Panel */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '6px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #cbd5e1',
          zIndex: 9999,
          overflow: 'hidden',
          animation: 'fadeIn 0.1s ease-out'
        }}>
          {/* 1. TOP SEARCH INPUT BAR */}
          <div style={{ padding: '8px 10px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '6px' }}>
            <span style={{ alignSelf: 'center', fontSize: '13px', color: '#64748b' }}>🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Party ya Khata ka naam search karein..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px', padding: '0 4px' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* 2. FILTERED ACCOUNTS LIST */}
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {filteredAccounts.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
                Koi khata nahi mila "{searchTerm}"
              </div>
            ) : (
              filteredAccounts.map((acc) => {
                const isSelected = acc.account_name === value;
                return (
                  <div
                    key={acc.id}
                    onClick={() => handleSelect(acc.account_name)}
                    style={{
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      transition: 'background-color 0.1s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isSelected ? '#dbeafe' : '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected ? '#eff6ff' : '#ffffff'}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: isSelected ? 'bold' : '600', color: isSelected ? '#0284c7' : '#0f172a' }}>
                        {acc.account_name}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>
                        {acc.sub_group || acc.primary_type}
                      </div>
                    </div>

                    {acc.opening_balance !== undefined && (
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: acc.balance_type === 'Dr' ? '#059669' : '#dc2626' }}>
                        ₹{parseFloat(acc.opening_balance || 0).toLocaleString('en-IN')} {acc.balance_type}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 3. OPTIONAL INLINE ADD NEW BUTTON */}
          {onAddNew && (
            <div
              onClick={() => { setIsOpen(false); onAddNew(searchTerm); }}
              style={{
                padding: '10px 14px',
                backgroundColor: '#f0fdf4',
                borderTop: '1px solid #bbf7d0',
                color: '#15803d',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>➕</span> + Naya Account Banayein {searchTerm ? `"${searchTerm}"` : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
