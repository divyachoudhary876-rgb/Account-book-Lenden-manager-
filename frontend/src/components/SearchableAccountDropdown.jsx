// frontend/src/components/SearchableAccountDropdown.jsx

import React, { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Strips all bracketed parenthetical text (Devanagari, Latin, punctuation, numbers)
 * to yield a clean, canonical comparison key for legacy and bilingual reconciliation.
 */
const getBaseName = (str = '') => {
  return String(str || '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .trim()
    .toLowerCase();
};

export default function SearchableAccountDropdown({
  label = 'Select Account',
  accounts = [],
  value = '',
  onChange,
  placeholder = '-- Search or Select Account --',
  required = false,
  colorAccent = '#0284c7',
  onAddNew = null,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const listContainerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Manage focus and reset search term on visibility change
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 40);
      setHighlightedIndex(0);
      return () => clearTimeout(timer);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // A to Z (Ascending Order) Sorting & Bilingual Real-Time Search Filtering
  const processedAccounts = useMemo(() => {
    const validAccounts = Array.isArray(accounts) ? accounts.filter(Boolean) : [];

    const sortedList = [...validAccounts].sort((a, b) => {
      const nameA = a.account_name || a.name || '';
      const nameB = b.account_name || b.name || '';
      return nameA.localeCompare(nameB, 'en', { sensitivity: 'base' });
    });

    const cleanSearch = searchTerm.trim().toLowerCase();
    if (!cleanSearch) return sortedList;

    const baseSearch = getBaseName(cleanSearch);

    return sortedList.filter(acc => {
      const nameStr = String(acc.account_name || acc.name || '').toLowerCase();
      const nameEn = String(acc.name_en || '').toLowerCase();
      const nameHi = String(acc.name_hi || '').toLowerCase();
      const groupMatch = String(acc.sub_group || acc.group || acc.primary_type || '').toLowerCase();
      const baseAccName = getBaseName(nameStr);

      return (
        nameStr.includes(cleanSearch) ||
        nameEn.includes(cleanSearch) ||
        nameHi.includes(cleanSearch) ||
        groupMatch.includes(cleanSearch) ||
        (baseSearch && baseAccName.includes(baseSearch))
      );
    });
  }, [accounts, searchTerm]);

  // Robust Selection Matching: Resolves Object values, legacy strings, and bilingual names
  const selectedAccount = useMemo(() => {
    if (!value) return null;

    // Support when value is passed as an Account Object
    const rawVal = typeof value === 'object' 
      ? (value.account_name || value.name || value.id || '') 
      : String(value);

    const cleanVal = String(rawVal).trim().toLowerCase();
    const baseVal = getBaseName(cleanVal);

    return accounts.find(a => {
      if (!a) return false;
      const aId = String(a.id || '').trim().toLowerCase();
      const aName = String(a.account_name || a.name || '').trim().toLowerCase();
      const aEn = String(a.name_en || '').trim().toLowerCase();
      const aBase = getBaseName(aName);

      return (
        aId === cleanVal ||
        aName === cleanVal ||
        aEn === cleanVal ||
        aBase === cleanVal ||
        (baseVal && aBase === baseVal)
      );
    });
  }, [accounts, value]);

  // Unified Handler: Returns targetName as 1st arg and full account as 2nd arg
  const handleSelect = (acc) => {
    if (!acc) return;
    const targetName = acc.account_name || acc.name || '';
    if (typeof onChange === 'function') {
      onChange(targetName, acc);
    }
    setIsOpen(false);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < processedAccounts.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (processedAccounts[highlightedIndex]) {
        handleSelect(processedAccounts[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Keep highlighted item visible during scroll
  useEffect(() => {
    if (listContainerRef.current && listContainerRef.current.children[highlightedIndex]) {
      listContainerRef.current.children[highlightedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [highlightedIndex]);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }} onKeyDown={handleKeyDown}>
      {label && (
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
          {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
        </label>
      )}

      {/* Selected Box / Trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: '8px',
          border: `1px solid ${isOpen ? colorAccent : '#cbd5e1'}`,
          backgroundColor: disabled ? '#f8fafc' : '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxSizing: 'border-box',
          boxShadow: isOpen ? `0 0 0 2px ${colorAccent}25` : 'none',
          opacity: disabled ? 0.7 : 1,
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {selectedAccount ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                {selectedAccount.account_name || selectedAccount.name}
              </strong>
              <span style={{ fontSize: '10px', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                {selectedAccount.sub_group || selectedAccount.primary_type}
              </span>
            </div>
          ) : (
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>
              {typeof value === 'string' && value.trim() ? value : placeholder}
            </span>
          )}
        </div>
        <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '6px' }}>
          {isOpen ? '\u25b2' : '\u25bc'}
        </span>
      </div>

      {/* Dropdown Floating Panel */}
      {isOpen && !disabled && (
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
          overflow: 'hidden'
        }}>
          {/* Top Search Bar */}
          <div style={{ padding: '8px 10px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>{'\uD83D\uDD0D'}</span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search in English or हिंदी (e.g. Ramlal / रामलाल)..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setHighlightedIndex(0);
              }}
              style={{
                width: '100%',
                padding: '7px 8px',
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
                onClick={() => {
                  setSearchTerm('');
                  searchInputRef.current?.focus();
                }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', padding: '0 4px', fontWeight: 'bold' }}
              >
                {'\u2715'}
              </button>
            )}
          </div>

          {/* Sorted List Items */}
          <div ref={listContainerRef} style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {processedAccounts.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
                Koi khata nahi mila "{searchTerm}"
              </div>
            ) : (
              processedAccounts.map((acc, index) => {
                const accFullName = acc.account_name || acc.name || '';
                const isSelected = selectedAccount && (
                  (selectedAccount.id && acc.id && selectedAccount.id === acc.id) ||
                  (selectedAccount.account_name && selectedAccount.account_name === accFullName)
                );
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={acc.id || `${accFullName}-${index}`}
                    onClick={() => handleSelect(acc)}
                    style={{
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isHighlighted ? '#f1f5f9' : (isSelected ? '#eff6ff' : '#ffffff'),
                      transition: 'background-color 0.1s ease'
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: isSelected ? 'bold' : '600', color: isSelected ? '#0284c7' : '#0f172a' }}>
                        {accFullName}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>
                        {acc.sub_group || acc.primary_type}
                      </div>
                    </div>

                    {(acc.opening_balance !== undefined || acc.openingBalance !== undefined) && (
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: (acc.balance_type || acc.balanceType) === 'Dr' ? '#059669' : '#dc2626' }}>
                        {'\u20b9'}{parseFloat(acc.opening_balance || acc.openingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {(acc.balance_type || acc.balanceType || 'Dr')}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Inline Add Action */}
          {onAddNew && (
            <div
              onClick={() => { 
                setIsOpen(false); 
                onAddNew(searchTerm); 
              }}
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
              <span>{'\u2795'}</span> + Naya Account Banayein {searchTerm ? `"${searchTerm}"` : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
