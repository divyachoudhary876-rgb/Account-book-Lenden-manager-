// frontend/src/components/SearchableStockDropdown.jsx
import React, { useState, useEffect, useRef } from 'react';
import { loadFirmData } from '../utils/firmIsolationEngine';

export default function SearchableStockDropdown({
  firm,
  label = "Select Stock Item *",
  value,
  onChange,
  placeholder = "-- Search & Choose Stock / Fuel --",
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockList, setStockList] = useState([]);
  const dropdownRef = useRef(null);

  const loadItems = () => {
    try {
      let items = [];
      
      // Strict firm isolation: Sirf current active firm ka data load hoga bina kisi global leakage ke
      if (firm) {
        items = loadFirmData('inventory_items', firm, []);
      }

      const validItems = (Array.isArray(items) ? items : []).filter(i => i && (i.name || i.item_name));
      setStockList(validItems);
    } catch (e) {
      console.error("Error loading stock items in dropdown:", e);
      setStockList([]);
    }
  };

  useEffect(() => {
    loadItems();
    window.addEventListener('app_storage_updated', loadItems);
    window.addEventListener('app_state_updated', loadItems);
    return () => {
      window.removeEventListener('app_storage_updated', loadItems);
      window.removeEventListener('app_state_updated', loadItems);
    };
  }, [firm]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedItemObj = stockList.find(i => String(i.id) === String(value) || String(i.name || i.item_name) === String(value));
  const displayText = selectedItemObj ? `${selectedItemObj.name || selectedItemObj.item_name} (Stock: ${selectedItemObj.current_stock || selectedItemObj.stock || 0} ${selectedItemObj.unit || ''})` : '';

  const filteredItems = stockList.filter(item => {
    const name = (item.name || item.item_name || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }} ref={dropdownRef}>
      {label && (
        <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', color: '#475569' }}>
          {label}
        </label>
      )}

      <div 
        onClick={() => {
          loadItems(); 
          setIsOpen(!isOpen);
        }}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '6px',
          border: '1px solid #cbd5e1',
          backgroundColor: '#ffffff',
          fontSize: '11px',
          color: displayText ? '#0f172a' : '#94a3b8',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayText || placeholder}
        </span>
        <span style={{ fontSize: '10px', color: '#64748b' }}>▼</span>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 9999,
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          marginTop: '4px',
          maxHeight: '220px',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, backgroundColor: '#fff' }}>
            <input 
              type="text" 
              placeholder="Search item..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                fontSize: '11px',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ padding: '4px' }}>
            <div 
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              style={{
                padding: '8px 10px',
                fontSize: '11px',
                color: '#94a3b8',
                cursor: 'pointer',
                borderRadius: '4px',
                borderBottom: '1px solid #f1f5f9'
              }}
            >
              -- Clear Selection --
            </div>

            {filteredItems.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '11px' }}>
                Koi stock item uplabdh nahi hai.
              </div>
            ) : (
              filteredItems.map(item => {
                const itemId = item.id;
                const itemName = item.name || item.item_name;
                const stockQty = item.current_stock || item.stock || 0;
                const unitName = item.unit || 'Units';

                return (
                  <div 
                    key={itemId}
                    onClick={() => {
                      onChange(itemId);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    style={{
                      padding: '8px 10px',
                      fontSize: '11px',
                      color: '#0f172a',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #f8fafc'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <span style={{ fontWeight: 'bold' }}>{itemName}</span>
                    <span style={{ color: '#166534', fontSize: '10px' }}>Stock: {stockQty} {unitName}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
