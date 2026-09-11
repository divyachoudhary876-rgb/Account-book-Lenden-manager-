// frontend/src/components/MaterialConsumptionView.jsx
import React, { useState, useEffect } from 'react';
import { loadFirmData, saveFirmData } from '../utils/firmIsolationEngine';

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

  // फर्म-वाइज इन्वेंट्री और लेजर्स लोड करने का सुरक्षित फंक्शन (Auto-Sync & Fallback Enabled)
  const loadConsumptionData = () => {
    if (!firm) return;
    try {
      let savedStock = loadFirmData('app_inventory', firm, []);
      const savedBatches = loadFirmData('app_fuel_consumption_batches', firm, []);
      let savedAccounts = loadFirmData('app_accounts', firm, []);

      // यदि स्टॉक खाली है, तो डिफ़ॉल्ट भट्ठा फ्यूल और रॉ मटेरियल्स प्रदान करें
      if (!savedStock || savedStock.length === 0) {
        savedStock = [
          { id: 'f_1', name: 'Coal (कोयला - Fuel)', stock_qty: 5000, type: 'raw' },
          { id: 'f_2', name: 'Diesel (डीजल)', stock_qty: 1000, type: 'raw' },
          { id: 'f_3', name: 'Biomass Briquette (ब्रिकेट)', stock_qty: 12000, type: 'raw' },
          { id: 'm_1', name: 'Mitti (मिट्टी)', stock_qty: 25000, type: 'raw' }
        ];
        saveFirmData('app_inventory', firm, savedStock);
      }

      // यदि एक्सपेंस अकाउंट्स खाली हैं, तो डिफ़ॉल्ट अकाउंट्स प्रदान करें
      if (!savedAccounts || savedAccounts.length === 0) {
        savedAccounts = [
          { id: 'acc_1', name: 'Tractor Diesel & Maintenance Expense', type: 'Expense' },
          { id: 'acc_2', name: 'Kiln Firing & Coal Expense', type: 'Expense' },
          { id: 'acc_3', name: 'General Factory Overheads', type: 'Expense' }
        ];
        saveFirmData('app_accounts', firm, savedAccounts);
      }

      setStockItems(savedStock);
      setExpenseAccounts(savedAccounts);
      setBatchesList(savedBatches);
    } catch (e) {
      console.error("Error loading consumption data:", e);
      setStockItems([
        { id: 'f_1', name: 'Coal (कोयला)', stock_qty: 5000 },
        { id: 'f_2', name: 'Diesel (डीजल)', stock_qty: 1000 }
      ]);
      setExpenseAccounts([
        { name: 'Tractor Diesel & Maintenance Expense' },
        { name: 'Kiln Firing & Coal Expense' }
      ]);
      setBatchesList([]);
    }
  };

  useEffect(() => {
    loadConsumptionData();
    window.addEventListener('focus', loadConsumptionData);
    return () => window.removeEventListener('focus', loadConsumptionData);
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

    const itemObj = stockItems.find(i => i.id === selectedStockItem || i.name === selectedStockItem);
    const availableStock = Number(itemObj?.stock_qty || itemObj?.quantity || 0);

    if (availableStock <= 0) {
      setErrorMsg(`❌ Stock Error: "${itemObj?.name || selectedStockItem}" is OUT OF STOCK (0).`);
      return;
    }
    if (qtyNum > availableStock) {
      setErrorMsg(`❌ Stock Error: Insufficient stock. Available: ${availableStock}, Requested: ${qtyNum}`);
      return;
    }

    const cartItem = {
      id: itemObj?.id || Math.random().toString(),
      item_name: itemObj?.name || selectedStockItem,
      qty: qtyNum,
      expense_account: selectedExpenseLedger
    };

    setConsumptionCart([...consumptionCart, cartItem]);
    setSelectedStockItem('');
    setQuantity('');
  };

  const handleRemoveCartItem = (index) => {
    const updated = [...consumptionCart];
    updated.splice(index, 1);
    setConsumptionCart(updated);
  };

  const handlePostAllConsumptions = (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!vehicleRef.trim()) {
      setErrorMsg('Please enter a vehicle or chamber reference (e.g. Tractor-1 / Chamber-3).');
      return;
    }
    if (consumptionCart.length === 0) {
      setErrorMsg('Please add at least one item to the consumption cart.');
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

    setSuccessMsg(`✓ Fuel & Material consumption successfully posted for ${vehicleRef}!`);
    setVehicleRef('');
    setConsumptionCart([]);
  };

  return (
    <div style={{ width: '100%', maxWidth: '100vw', minHeight: '100vh', backgroundColor: '#f8fafc', padding: '8px', fontFamily: 'sans-serif', boxSizing: 'border-box', overflowX: 'hidden', color: '#0f172a' }}>
      
      {/* हेडर */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', marginBottom: '10px', boxSizing: 'border-box', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          {onClose && (
            <button onClick={onClose} style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
              ← Dashboard
            </button>
          )}
          <div style={{ fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
            Firm: {firm?.legal_name || firm?.name || 'Active Firm'}
          </div>
        </div>
        <h1 style={{ margin: 0, fontSize: '14px', fontWeight: 800 }}>🚜 Multi-Item Fuel & Material Consumption</h1>
      </div>

      {errorMsg && <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', boxSizing: 'border-box', width: '100%' }}>{errorMsg}</div>}
      {successMsg && <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', boxSizing: 'border-box', width: '100%' }}>{successMsg}</div>}

      <form onSubmit={handlePostAllConsumptions} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box', width: '100%' }}>
        
        <div style={{ display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '3px' }}>Date of Usage *</label>
            <input type="date" value={usageDate} onChange={(e) => setUsageDate(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '3px' }}>Vehicle / Chamber Ref *</label>
            <input type="text" placeholder="e.g. Tractor-1" value={vehicleRef} onChange={(e) => setVehicleRef(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* कार्ट एडिशन अनुभाग */}
        <div style={{ backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '10px', border: '1px solid #bbf7d0', boxSizing: 'border-box', width: '100%' }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 800, color: '#166534' }}>➕ Add Items to Consumption Cart</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
            <div>
              <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>Select Stock Item / Fuel *</label>
              <select value={selectedStockItem} onChange={(e) => setSelectedStockItem(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                <option value="">-- Choose Stock Item --</option>
                {stockItems.map((item, idx) => (
                  <option key={idx} value={item.name || item.item_name}>
                    {item.name || item.item_name} [Stock: {item.stock_qty || item.quantity || 0}]
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>Quantity *</label>
                <input type="number" placeholder="0.0" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>Debit Expense Ledger *</label>
                <select value={selectedExpenseLedger} onChange={(e) => setSelectedExpenseLedger(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                  <option value="">-- Select Expense Account --</option>
                  {expenseAccounts.map((acc, idx) => (
                    <option key={idx} value={acc.name || acc.account_name}>{acc.name || acc.account_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button type="button" onClick={handleAddItemToCart} style={{ width: '100%', padding: '10px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', marginTop: '4px', boxSizing: 'border-box' }}>
              + Add Item to Cart
            </button>
          </div>

          {consumptionCart.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px', width: '100%', boxSizing: 'border-box' }}>
              {consumptionCart.map((cartItem, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box', width: '100%' }}>
                  <span style={{ wordBreak: 'break-word', flex: 1 }}><b>{cartItem.item_name}</b> (Qty: {cartItem.qty}) → {cartItem.expense_account}</span>
                  <button type="button" onClick={() => handleRemoveCartItem(index)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', marginLeft: '6px' }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* सबमिट बटन */}
        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', marginTop: '4px', boxSizing: 'border-box' }}>
          🚀 Post All Consumptions & Deduct Stock
        </button>

      </form>

      {/* कंजम्पशन रजिस्टर */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', boxSizing: 'border-box', width: '100%' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800 }}>📋 Consumption Batches Register ({batchesList.length})</h3>
        {batchesList.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '11px', padding: '8px' }}>No consumption batches recorded yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
            {batchesList.map((batch, idx) => (
              <div key={idx} style={{ padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px', boxSizing: 'border-box', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '3px' }}>
                  <span>Ref: {batch.vehicle_ref} ({batch.date})</span>
                  <span style={{ color: '#0284c7' }}>Items: {batch.items?.length || 0}</span>
                </div>
                <div style={{ color: '#64748b', wordBreak: 'break-word' }}>
                  {batch.items?.map(i => `${i.item_name} (${i.qty}) [Acct: ${i.expense_account}]`).join(' | ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
