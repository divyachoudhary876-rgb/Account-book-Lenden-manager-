// frontend/src/components/SearchableAccountDropdown.jsx
import React, { useState, useEffect } from 'react';
import { loadFirmData } from '../utils/firmIsolationEngine';

export default function SearchableAccountDropdown({ firm, value, onChange, type = 'account' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [optionsList, setOptionsList] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!firm) return;
    
    // केवल एक्टिव फर्म का डेटा लोड होगा, दूसरी फर्म का नहीं
    const baseKey = type === 'inventory' ? 'app_inventory' : 'app_accounts';
    const firmData = loadFirmData(baseKey, firm, []);
    setOptionsList(firmData);
  }, [firm, type]);

  const filteredOptions = optionsList.filter(item => {
    const itemName = item.name || item.legal_name || item.account_name || '';
    return itemName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
      <input
        type="text"
        placeholder={value ? `Selected: ${value}` : `-- Search & Select ${type} --`}
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          fontSize: '11px',
          backgroundColor: '#fff',
          boxSizing: 'border-box'
        }}
      />

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          maxHeight: '180px',
          overflowY: 'auto',
          backgroundColor: '#fff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          zIndex: 1000,
          marginTop: '2px'
        }}>
          {filteredOptions.length === 0 ? (
            <div style={{ padding: '10px', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
              No items found in this firm.
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const displayName = opt.name || opt.legal_name || opt.account_name;
              const stockInfo = opt.stock_qty !== undefined ? ` [Stock: ${opt.stock_qty}]` : '';
              
              return (
                <div
                  key={idx}
                  onClick={() => {
                    onChange(displayName);
                    setSearchTerm(displayName);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '8px 10px',
                    fontSize: '11px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    backgroundColor: '#fff'
                  }}
                >
                  <b>{displayName}</b>{stockInfo}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
