// frontend/src/components/SearchableStockDropdown.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StorageService } from '../utils/storageSync';

export default function SearchableStockDropdown({ firm, label = 'Select Stock Item', items = [], value = '', onChange, placeholder = '-- Search or Select Stock --', required = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [liveItems, setLiveItems] = useState([]);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const activeFirmId = firm?.id || 'FIRM-001';

  // सीधे StorageService से inventory_items लोड करें (वही की जो InventoryStockView उपयोग करता है)
  const fetchStock = () => {
    if (items && items.length > 0) {
      setLiveItems(items);
      return;
    }
    const allStored = StorageService.getItem('inventory_items') || StorageService.getInventoryItems() || [];
    // फर्म के हिसाब से फिल्टर करें
    const firmStock = allStored.filter(item => !item.firm_id || item.firm_id === activeFirmId);
    setLiveItems(firmStock);
  };

  useEffect(() => {
    fetchStock();
    window.addEventListener('app_storage_updated', fetchStock);
    window.addEventListener('app_state_updated', fetchStock);
    return () => {
      window.removeEventListener('app_storage_updated', fetchStock);
      window.removeEventListener('app_state_updated', fetchStock);
    };
  }, [firm, items]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredItems = useMemo(() => {
    const list = [...liveItems].sort((a, b) => (a.item_name || a.name || '').localeCompare(b.item_name || b.name || ''));
    const cleanSearch = searchTerm.trim().toLowerCase();
    if (!cleanSearch) return list;
    return list.filter(i => (i.item_name || i.name || '').toLowerCase().includes(cleanSearch));
  }, [liveItems, searchTerm]);

  const selectedItem = liveItems.find(i => (i.item_name || i.name) === value);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      {label && (
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
          {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
        </label>
      )}

      <div onClick={() => setIsOpen(!isOpen)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxSizing: 'border-box' }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {selectedItem ? (
            <strong>{selectedItem.item_name || selectedItem.name} [Stock: {Number(selectedItem.current_stock || selectedItem.stock || 0).toFixed(2)} {selectedItem.unit || ''}]</strong>
          ) : (
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>{placeholder}</span>
          )}
        </div>
        <span style={{ fontSize: '10px', color: '#64748b' }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #cbd5e1', zIndex: 9999, overflow: 'hidden' }}>
          <div style={{ padding: '8px 10px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <input ref={searchInputRef} autoFocus type="text" placeholder="Search stock item..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {filteredItems.length === 0 ? (
              <div style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
                No stock items found. Please add items via Inventory Master.
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const name = item.item_name || item.name;
                const isSelected = name === value;
                const stockVal = Number(item.current_stock || item.stock || 0);
                return (
                  <div key={item.id || idx} onClick={() => { onChange(name); setIsOpen(false); }} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', backgroundColor: isSelected ? '#eff6ff' : '#fff' }}>
                    <b>{name}</b> <span style={{ fontSize: '11px', color: '#166534' }}>[Stock: {stockVal.toFixed(2)} {item.unit || ''}]</span>
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
