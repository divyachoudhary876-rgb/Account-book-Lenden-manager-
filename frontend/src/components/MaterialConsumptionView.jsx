// frontend/src/components/MaterialConsumptionView.jsx
import React, { useState, useEffect } from 'react';
import { loadFirmData, saveFirmData } from '../utils/firmIsolationEngine';
import SearchableStockDropdown from './SearchableStockDropdown';
import SearchableAccountDropdown from './SearchableAccountDropdown';

export default function MaterialConsumptionView({ firm, onClose }) {
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
    if (!firm) return;
    try {
      let savedStock = loadFirmData('app_inventory', firm, []);
      const savedBatches = loadFirmData('app_fuel_consumption_batches', firm, []);
      let savedAccounts = loadFirmData('app_accounts', firm, []);

      if (!savedStock || savedStock.length === 0) {
        savedStock = [
          { id: 'f_1', name: 'Coal (कोयला - Fuel)', stock_qty: 5000, type: 'raw' },
          { id: 'f_2', name: 'Diesel (डीजल)', stock_qty: 1000, type: 'raw' },
          { id: 'f_3', name: 'Biomass Briquette (ब्रिकेट)', stock_qty: 12000, type: 'raw' }
        ];
        saveFirmData('app_inventory', firm, savedStock);
      }

      setStockItems(savedStock);
      setExpenseAccounts(savedAccounts);
      setBatchesList(savedBatches);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('focus', loadData);
    return () => window.removeEventListener('focus', loadData);
  }, [firm]);

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

    const itemObj = stockItems.find(i => (i.name || i.item_name) === selectedStockItem);
    const availableStock = Number(itemObj?.stock_qty || itemObj?.quantity || 0);

    if (qtyNum > availableStock) {
      setErrorMsg(`❌ Insufficient stock. Available: ${availableStock}`);
      return;
    }

    setConsumptionCart([...consumptionCart, { id: itemObj?.id || Math.random().toString(), item_name: selectedStockItem, qty: qtyNum, expense_account: selectedExpenseLedger }]);
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

    const newBatch = {
      id: 'CONS-' + Date.now(),
      date: usageDate,
      vehicle_ref: vehicleRef,
      items: consumptionCart,
      timestamp: new Date().toISOString()
    };

    const updatedBatches = [newBatch, ...batchesList];
    setBatchesList(updatedBatches);
    saveFirmData('app_fuel_consumption_batches', firm, updatedBatches);

    setSuccessMsg(`✓ Fuel & Material consumption posted successfully!`);
    setVehicleRef('');
    setConsumptionCart([]);
  };

  return (
    <div style={{ width: '100%', maxWidth: '100vw', minHeight: '100vh', backgroundColor: '#f8fafc', padding: '8px', fontFamily: 'sans-serif', boxSizing: 'border-box', overflowX: 'hidden', color: '#0f172a' }}>
      
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          {onClose && (
            <button onClick={onClose} style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
              ← Dashboard
            </button>
          )}
          <div style={{ fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569' }}>
            Firm: {firm?.legal_name || firm?.name || 'Active Firm'}
          </div>
        </div>
        <h1 style={{ margin: 0, fontSize: '14px', fontWeight: 800 }}>🚜 Multi-Item Fuel & Material Consumption</h1>
      </div>

      {errorMsg && <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fef2f2', color: '#991b1b' }}>{errorMsg}</div>}
      {successMsg && <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#ecfdf5', color: '#065f46' }}>{successMsg}</div>}

      <form onSubmit={handlePostAllConsumptions} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '3px' }}>Date of Usage *</label>
            <input type="date" value={usageDate} onChange={(e) => setUsageDate(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '3px' }}>Vehicle / Chamber Ref *</label>
            <input type="text" placeholder="e.g. Tractor-1" value={vehicleRef} onChange={(e) => setVehicleRef(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 800, color: '#166534' }}>➕ Add Items to Consumption Cart</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <SearchableStockDropdown 
              label="Select Stock Item / Fuel *"
              items={stockItems}
              value={selectedStockItem}
              onChange={(val) => setSelectedStockItem(val)}
              placeholder="-- Search & Choose Fuel/Stock --"
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>Quantity *</label>
                <input type="number" placeholder="0.0" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 2 }}>
                <SearchableAccountDropdown 
                  label="Debit Expense Account *"
                  accounts={expenseAccounts}
                  value={selectedExpenseLedger}
                  onChange={(val) => setSelectedExpenseLedger(val)}
                  placeholder="-- Search Expense Account --"
                />
              </div>
            </div>

            <button type="button" onClick={handleAddItemToCart} style={{ width: '100%', padding: '10px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', marginTop: '4px' }}>
              + Add Item to Cart
            </button>
          </div>

          {consumptionCart.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {consumptionCart.map((cartItem, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }}>
                  <span><b>{cartItem.item_name}</b> (Qty: {cartItem.qty}) → {cartItem.expense_account}</span>
                  <button type="button" onClick={() => { const u = [...consumptionCart]; u.splice(index, 1); setConsumptionCart(u); }} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', marginTop: '4px' }}>
          🚀 Post All Consumptions & Deduct Stock
        </button>
      </form>

      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800 }}>📋 Consumption Register ({batchesList.length})</h3>
        {batchesList.map((batch, idx) => (
          <div key={idx} style={{ padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px', marginBottom: '6px' }}>
            <b>Ref: {batch.vehicle_ref}</b> ({batch.date}) — Items Count: {batch.items?.length || 0}
          </div>
        ))}
      </div>
    </div>
  );
}
