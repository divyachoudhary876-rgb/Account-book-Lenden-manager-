// frontend/src/components/MaterialConsumptionView.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import SearchableStockDropdown from './SearchableStockDropdown';
import SearchableAccountDropdown from './SearchableAccountDropdown';

export default function MaterialConsumptionView({ firm, onClose }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [usageDate, setUsageDate] = useState(new Date().toISOString().slice(0, 10));
  const [vehicleRef, setVehicleRef] = useState('');
  
  const [stockItems, setStockItems] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  
  const [selectedStockItem, setSelectedStockItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [selectedExpenseLedger, setSelectedExpenseLedger] = useState('');
  const [consumptionCart, setConsumptionCart] = useState([]);
  
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [batchesList, setBatchesList] = useState([]);

  const loadData = () => {
    try {
      // 1. सीधे StorageService से inventory_items लोड करें (कोई डिफ़ॉल्ट हार्डकोडेड आइटम नहीं)
      const allStoredStock = StorageService.getItem('inventory_items') || StorageService.getInventoryItems() || [];
      const firmStock = allStoredStock.filter(item => !item.firm_id || item.firm_id === activeFirmId);
      setStockItems(firmStock);

      // 2. लेजर्स/अकाउंट्स लोड करें
      const allAccounts = StorageService.getItem('app_accounts') || [];
      const firmAccounts = allAccounts.filter(acc => !acc.firm_id || acc.firm_id === activeFirmId);
      setExpenseAccounts(firmAccounts);

      // 3. कंजम्पशन बैचेस लोड करें
      const savedBatches = StorageService.getItem(`app_fuel_consumption_batches_${activeFirmId}`) || [];
      setBatchesList(savedBatches);
    } catch (e) {
      console.error("Error loading consumption data:", e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_storage_updated', loadData);
    window.addEventListener('app_state_updated', loadData);
    return () => {
      window.removeEventListener('app_storage_updated', loadData);
      window.removeEventListener('app_state_updated', loadData);
    };
  }, [activeFirmId]);

  const handleAddItemToCart = () => {
    setErrorMsg(null);
    if (!selectedStockItem) {
      setErrorMsg('Please select a stock item/fuel.');
      return;
    }
    const qtyNum = Number(quantity);
    if (!qtyNum || qtyNum <= 0) {
      setErrorMsg('Please enter a valid consumption quantity.');
      return;
    }
    if (!selectedExpenseLedger) {
      setErrorMsg('Please select a debit expense ledger.');
      return;
    }

    const itemObj = stockItems.find(i => (i.item_name || i.name) === selectedStockItem);
    const availableStock = Number(itemObj?.current_stock || itemObj?.stock || 0);

    if (qtyNum > availableStock) {
      setErrorMsg(`❌ Insufficient stock. Available: ${availableStock}`);
      return;
    }

    setConsumptionCart([
      ...consumptionCart, 
      { 
        id: itemObj?.id || Math.random().toString(), 
        item_name: selectedStockItem, 
        qty: qtyNum, 
        expense_account: selectedExpenseLedger 
      }
    ]);
    setSelectedStockItem('');
    setQuantity('');
  };

  const handlePostAllConsumptions = (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!vehicleRef.trim()) {
      setErrorMsg('Please enter vehicle or chamber reference.');
      return;
    }
    if (consumptionCart.length === 0) {
      setErrorMsg('Please add at least one item to consumption cart.');
      return;
    }

    try {
      const newBatch = {
        id: 'CONS-' + Date.now(),
        date: usageDate,
        vehicle_ref: vehicleRef,
        items: consumptionCart,
        timestamp: new Date().toISOString()
      };

      const updatedBatches = [newBatch, ...batchesList];
      setBatchesList(updatedBatches);
      StorageService.setItem(`app_fuel_consumption_batches_${activeFirmId}`, updatedBatches);

      // स्टॉक घटाने की लॉजिक (इन्वेंट्री अपडेट करें)
      let allStoredStock = StorageService.getItem('inventory_items') || StorageService.getInventoryItems() || [];
      consumptionCart.forEach(cartItem => {
        const target = allStoredStock.find(i => (i.item_name || i.name) === cartItem.item_name && (!i.firm_id || i.firm_id === activeFirmId));
        if (target) {
          const current = Number(target.current_stock || target.stock || 0);
          target.current_stock = Math.max(0, current - cartItem.qty);
        }
      });
      StorageService.setItem('inventory_items', allStoredStock);
      window.dispatchEvent(new Event('app_storage_updated'));

      setSuccessMsg(`✓ Fuel & Material consumption posted successfully!`);
      setVehicleRef('');
      setConsumptionCart([]);
      loadData();
    } catch (err) {
      setErrorMsg('Error posting consumption: ' + err.message);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '100vw', minHeight: '100vh', backgroundColor: '#f8fafc', padding: '16px', fontFamily: 'sans-serif', boxSizing: 'border-box', color: '#0f172a' }}>
      
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          {onClose && (
            <button onClick={onClose} style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
              ← Dashboard
            </button>
          )}
          <div style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569' }}>
            Firm ID: {activeFirmId}
          </div>
        </div>
        <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>🚜 Multi-Item Fuel & Material Consumption</h1>
      </div>

      {errorMsg && <div style={{ marginBottom: '12px', padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>{errorMsg}</div>}
      {successMsg && <div style={{ marginBottom: '12px', padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #bbf7d0' }}>{successMsg}</div>}

      <form onSubmit={handlePostAllConsumptions} style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#475569' }}>Date of Usage *</label>
            <input type="date" value={usageDate} onChange={(e) => setUsageDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#475569' }}>Vehicle / Chamber Ref *</label>
            <input type="text" placeholder="e.g. Tractor-1" value={vehicleRef} onChange={(e) => setVehicleRef(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ backgroundColor: '#f0fdf4', padding: '14px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800, color: '#166534' }}>➕ Add Items to Consumption Cart</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <SearchableStockDropdown 
              firm={firm}
              label="Select Stock Item / Fuel *"
              items={stockItems}
              value={selectedStockItem}
              onChange={(val) => setSelectedStockItem(val)}
              placeholder="-- Search & Choose Fuel/Stock --"
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#475569' }}>Quantity *</label>
                <input type="number" step="0.01" placeholder="0.0" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 2 }}>
                <SearchableAccountDropdown 
                  firm={firm}
                  label="Debit Expense Account *"
                  accounts={expenseAccounts}
                  value={selectedExpenseLedger}
                  onChange={(val) => setSelectedExpenseLedger(val)}
                  placeholder="-- Search Expense Account --"
                />
              </div>
            </div>

            <button type="button" onClick={handleAddItemToCart} style={{ width: '100%', padding: '12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', marginTop: '4px' }}>
              + Add Item to Cart
            </button>
          </div>

          {consumptionCart.length > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {consumptionCart.map((cartItem, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                  <span><b>{cartItem.item_name}</b> (Qty: {cartItem.qty}) → {cartItem.expense_account}</span>
                  <button type="button" onClick={() => { const u = [...consumptionCart]; u.splice(index, 1); setConsumptionCart(u); }} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: '4px' }}>
          🚀 Post All Consumptions & Deduct Stock
        </button>
      </form>

      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 800 }}>📋 Consumption Register ({batchesList.length})</h3>
        {batchesList.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', padding: '12px' }}>No consumption records found.</div>
        ) : (
          batchesList.map((batch, idx) => (
            <div key={idx} style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', marginBottom: '8px' }}>
              <b>Ref: {batch.vehicle_ref}</b> ({batch.date}) — Items Count: {batch.items?.length || 0}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
