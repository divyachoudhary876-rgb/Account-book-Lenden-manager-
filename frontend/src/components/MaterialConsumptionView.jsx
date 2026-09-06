import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../utils/storageSync';
import { useItemMaster } from '../hooks/useItemMaster';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';

export default function MaterialConsumptionView({ firm, onSave, onClose }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const allItems = useItemMaster();
  const [accountsList, setAccountsList] = useState([]);
  const [consumptionList, setConsumptionList] = useState([]);

  // Form Header State
  const [usageDate, setUsageDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleRef, setVehicleRef] = useState('');
  
  // Row Input State for Cart
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expenseLedger, setExpenseLedger] = useState('');
  const [remarks, setRemarks] = useState('');

  // Multi-Item Cart
  const [cart, setCart] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const syncData = () => {
      const allAccs = getFirmMasterAccounts(activeFirmId) || [];
      
      // Strict Rule: Only Expense accounts are allowed here
      const expenseAccounts = allAccs.filter(acc => {
        const group = String(acc.sub_group || acc.group_name || acc.category || acc.primary_type || '').toUpperCase();
        const name = String(acc.account_name || acc.name || '').toUpperCase();
        const isExpense = group.includes('EXPENSE') || group.includes('DIRECT') || group.includes('INDIRECT') || group.includes('FREIGHT');
        const isRestricted = group.includes('LIABILIT') || group.includes('ASSET') || group.includes('EQUITY') || group.includes('INCOME') || group.includes('CREDITOR') || group.includes('DEBTOR') || name.includes('CASH') || name.includes('BANK');
        return isExpense && !isRestricted;
      });

      setAccountsList(expenseAccounts);
      setConsumptionList(StorageService.getItem('material_consumptions_v2') || StorageService.getMaterialConsumptions() || []);
    };

    syncData();
    window.addEventListener('app_state_updated', syncData);
    window.addEventListener('app_storage_updated', syncData);
    return () => {
      window.removeEventListener('app_state_updated', syncData);
      window.removeEventListener('app_storage_updated', syncData);
    };
  }, [activeFirmId]);

  // Add Item to Cart
  const handleAddToCart = () => {
    if (!selectedItemId) return alert('कृपया स्टॉक आइटम चुनें।');
    if (!quantity || Number(quantity) <= 0) return alert('कृपया वैध मात्रा (Qty) दर्ज करें।');
    if (!expenseLedger) return alert('कृपया इस आइटम के लिए Debit Expense Ledger चुनें।');

    const itemObj = allItems.find(i => String(i.id) === String(selectedItemId));
    if (!itemObj) return;

    const parsedQty = Number(quantity);
    const unitRate = Number(itemObj.unit_purchase_price || 0);

    // Check stock availability
    const availableStock = Number(itemObj.current_stock || 0);
    if (parsedQty > availableStock) {
      return alert(`स्टॉक अपर्याप्त है! उपलब्ध: ${availableStock}`);
    }

    const newItem = {
      id: Date.now(),
      itemId: selectedItemId,
      itemName: itemObj.item_name,
      unit: itemObj.unit || 'Units',
      qty: parsedQty,
      unitRate,
      totalValuation: parsedQty * unitRate,
      expenseLedger,
      remarks: remarks || ''
    };

    setCart([...cart, newItem]);
    // Reset row inputs
    setSelectedItemId('');
    setQuantity('');
    setRemarks('');
  };

  const removeCartItem = (id) => {
    setCart(cart.filter(c => c.id !== id));
  };

  // Submit Multi-Item Consumption Batch
  const handleSubmitBatch = (e) => {
    e.preventDefault();
    setFeedback(null);

    if (cart.length === 0) return alert('कम से कम एक आइटम खपत सूची (Cart) में जोड़ें।');
    if (!vehicleRef) return alert('कृपया 'Used In / Vehicle Ref' दर्ज करें।');

    setIsSubmitting(true);
    try {
      const currentInventory = StorageService.getInventoryItems() || [];
      const currentConsumptions = StorageService.getItem('material_consumptions_v2') || [];

      // 1. Deduct Stock for all items in cart
      let workingInventory = [...currentInventory];
      cart.forEach(cartItem => {
        workingInventory = workingInventory.map(inv => {
          if (String(inv.id) === String(cartItem.itemId)) {
            return { ...inv, current_stock: Math.max(0, Number(inv.current_stock || 0) - cartItem.qty) };
          }
          return inv;
        });
      });
      StorageService.setItem('inventory_items', workingInventory);

      // 2. Save Batch Payload
      const batchPayload = {
        id: editingId || `CONSUME-BATCH-${Date.now()}`,
        firm_id: activeFirmId,
        usageDate,
        vehicleRef,
        items: cart,
        totalBatchCost: cart.reduce((sum, i) => sum + i.totalValuation, 0),
        created_at: new Date().toISOString()
      };

      let updatedConsumptions = [batchPayload, ...currentConsumptions];
      StorageService.setItem('material_consumptions_v2', updatedConsumptions);

      setFeedback({ type: 'success', message: '✓ Multi-Item Consumption Posted & Stock Deducted Successfully!' });
      
      // Reset form
      setCart([]);
      setVehicleRef('');
      setEditingId(null);
      loadData?.();

    } catch (err) {
      setFeedback({ type: 'error', message: 'त्रुटि: ' + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBatch = (batchId) => {
    if (!window.confirm('इस खपत बैच को हटाने पर सारा कंज्यूम हुआ माल वापस स्टॉक में जुड़ जाएगा। जारी रखें?')) return;
    try {
      const allConsumptions = StorageService.getItem('material_consumptions_v2') || [];
      const targetBatch = allConsumptions.find(b => b.id === batchId);

      if (targetBatch && targetBatch.items) {
        const currentInventory = StorageService.getInventoryItems() || [];
        let restoredInventory = [...currentInventory];
        
        targetBatch.items.forEach(item => {
          restoredInventory = restoredInventory.map(inv => {
            if (String(inv.id) === String(item.itemId)) {
              return { ...inv, current_stock: Number(inv.current_stock || 0) + Number(item.qty) };
            }
            return inv;
          });
        });
        StorageService.setItem('inventory_items', restoredInventory);
      }

      const filtered = allConsumptions.filter(b => b.id !== batchId);
      StorageService.setItem('material_consumptions_v2', filtered);
      setConsumptionList(filtered);
      setFeedback({ type: 'success', message: '✓ Batch deleted & stock restored.' });
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '16px', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '16px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>🚜 Multi-Item Fuel & Material Consumption</h1>
          {onClose && <button onClick={onClose} style={{ padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Close</button>}
        </div>

        {feedback && <div style={{ padding: '10px', marginBottom: '16px', borderRadius: '8px', backgroundColor: feedback.type === 'error' ? '#fef2f2' : '#ecfdf5', color: feedback.type === 'error' ? '#991b1b' : '#065f46', fontWeight: 'bold' }}>{feedback.message}</div>}

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', boxSizing: 'border-box' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Date of Usage *</label>
            <input type="date" value={usageDate} onChange={(e) => setUsageDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Used In / Vehicle Ref *</label>
            <input type="text" value={vehicleRef} onChange={(e) => setVehicleRef(e.target.value)} placeholder="e.g. Tractor-1 / Chamber-4" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
          </div>
        </div>

        {/* ROW BUILDER CONTAINER */}
        <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e293b' }}>➕ Add Items to Consumption Cart</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Select Stock Item</label>
              <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #eab308', boxSizing: 'border-box', backgroundColor: '#fff' }}>
                <option value="">-- Choose Stock Item --</option>
                {allItems.filter(i => i.item_type !== 'SERVICE').map(item => (
                  <option key={item.id} value={item.id}>{item.item_name} [Stock: {item.current_stock || 0} {item.unit}]</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Quantity</label>
                <input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 2 }}>
                <SearchableAccountDropdown
                  label="Debit Expense Ledger"
                  accounts={accountsList}
                  value={expenseLedger}
                  onChange={val => setExpenseLedger(val)}
                  placeholder="Select expense account..."
                  colorAccent="#dc2626"
                />
              </div>
            </div>

            <button type="button" onClick={handleAddToCart} style={{ padding: '10px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px' }}>
              + Add Item to Cart
            </button>
          </div>

          {/* CART ITEMS LIST */}
          {cart.length > 0 && (
            <div style={{ marginTop: '16px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#334155' }}>Items in Current Batch ({cart.length}):</div>
              {cart.map((c, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '8px 12px', borderRadius: '6px', marginBottom: '6px', border: '1px solid #cbd5e1' }}>
                  <div>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>{c.itemName}</strong>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Qty: {c.qty} {c.unit} | A/c: {c.expenseLedger}</div>
                  </div>
                  <button type="button" onClick={() => removeCartItem(c.id)} style={{ color: '#ef4444', background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>X</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="button" onClick={handleSubmitBatch} disabled={isSubmitting} style={{ width: '100%', padding: '14px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
          🚀 Post All Consumptions & Deduct Stock
        </button>
      </div>
      
      {/* CONSUMPTION BATCHES REGISTER */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>📋 Consumption Batches Register ({consumptionList.length})</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {consumptionList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>No consumption batches recorded yet.</div>
          ) : (
            consumptionList.map(batch => (
              <div key={batch.id} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                  <div>
                    <span style={{ fontSize: '10px', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', marginRight: '6px' }}>{batch.usageDate}</span>
                    <strong style={{ fontSize: '12px', color: '#0f172a' }}>Ref: {batch.vehicleRef}</strong>
                  </div>
                  <button onClick={() => handleDeleteBatch(batch.id)} style={{ padding: '4px 8px', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>🗑️ Delete Batch</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(batch.items || []).map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#334155' }}>
                      <span>• {item.itemName} (<b>{item.qty} {item.unit}</b>)</span>
                      <span style={{ color: '#0284c7' }}>{item.expenseLedger}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
