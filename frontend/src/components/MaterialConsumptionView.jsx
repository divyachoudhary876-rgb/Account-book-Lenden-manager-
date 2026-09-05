// frontend/src/components/MaterialConsumptionView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../utils/storageSync';

export default function MaterialConsumptionView({ firm, onSave, onClose }) {
  const [itemsList, setItemsList] = useState([]);
  const [accountsList, setAccountsList] = useState([]);
  const [consumptionList, setConsumptionList] = useState([]);

  const [usageDate, setUsageDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [vehicleRef, setVehicleRef] = useState('');
  const [expenseLedger, setExpenseLedger] = useState('');
  const [remarks, setRemarks] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Load and subscribe to live inventory and accounts
  useEffect(() => {
    const syncData = () => {
      const inventory = StorageService.getInventoryItems();
      setItemsList(inventory);

      const accounts = StorageService.getLedgerAccounts();
      const defaultAccounts = [
        { name: 'Diesel Expenses', category: 'EXPENSES' },
        { name: 'Fuel & Coal Consumption', category: 'EXPENSES' },
        { name: 'Machinery Maintenance', category: 'EXPENSES' }
      ];
      
      const accMap = new Map();
      [...defaultAccounts, ...accounts].forEach(acc => {
        const name = acc.name || acc.account_name;
        if (name) accMap.set(name.trim(), { name: name.trim(), category: acc.category || acc.account_group || 'EXPENSES' });
      });
      setAccountsList(Array.from(accMap.values()));

      setConsumptionList(StorageService.getMaterialConsumptions());
    };

    syncData();

    window.addEventListener('app_storage_updated', syncData);
    window.addEventListener('storage', syncData);

    return () => {
      window.removeEventListener('app_storage_updated', syncData);
      window.removeEventListener('storage', syncData);
    };
  }, []);

  const selectedItem = useMemo(() => {
    if (!Array.isArray(itemsList) || itemsList.length === 0) return null;
    return itemsList.find(i => String(i.id || i.item_name) === String(selectedItemId)) || null;
  }, [itemsList, selectedItemId]);

  const currentStock = Number(selectedItem?.current_stock || selectedItem?.stock || 0);
  const unitRate = Number(selectedItem?.purchase_rate || selectedItem?.rate || selectedItem?.average_rate || 0);
  const parsedQty = Number(quantity || 0);
  const estimatedCost = parsedQty * unitRate;

  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedItemId) {
      setFeedback({ type: 'error', message: 'कृपया सूची से स्टॉक आइटम चुनें।' });
      return;
    }
    if (parsedQty <= 0) {
      setFeedback({ type: 'error', message: 'कृपया वैध खपत मात्रा (Quantity) दर्ज करें।' });
      return;
    }
    if (!editingId && parsedQty > currentStock) {
      setFeedback({ type: 'error', message: `स्टॉक अपर्याप्त है! उपलब्ध स्टॉक: ${currentStock.toFixed(2)} ${selectedItem?.unit || ''}` });
      return;
    }
    if (!expenseLedger) {
      setFeedback({ type: 'error', message: 'कृपया डेबिट खर्चे का खाता (Debit Expense Ledger) चुनें।' });
      return;
    }

    setIsSubmitting(true);
    try {
      const currentInventory = StorageService.getInventoryItems();
      const currentConsumptions = StorageService.getMaterialConsumptions();

      let finalQtyDelta = parsedQty;

      // If editing, calculate difference in quantity to adjust stock correctly
      if (editingId) {
        const existingEntry = currentConsumptions.find(c => c.id === editingId);
        if (existingEntry && String(existingEntry.item_id) === String(selectedItemId)) {
          const oldQty = Number(existingEntry.quantity || 0);
          finalQtyDelta = parsedQty - oldQty; // Net difference
        }
      }

      const payload = {
        id: editingId || `CONSUME-${Date.now()}`,
        firm_id: firm?.id || 'firm_default',
        usage_date: usageDate,
        item_id: selectedItemId,
        item_name: selectedItem?.item_name || selectedItem?.name || 'Material Item',
        quantity: parsedQty,
        unit_rate: unitRate,
        total_valuation: estimatedCost,
        vehicle_ref: vehicleRef || 'General Usage',
        expense_ledger: expenseLedger,
        remarks: remarks || '',
        created_at: new Date().toISOString()
      };

      // 1. Update Inventory Stock Level Atomically
      const updatedInventory = currentInventory.map(item => {
        if (String(item.id || item.item_name) === String(selectedItemId)) {
          const oldStock = Number(item.current_stock || item.stock || 0);
          // If net delta is positive, deduct from stock. If negative, add back to stock.
          const newStock = Math.max(0, oldStock - finalQtyDelta);
          return { ...item, current_stock: newStock };
        }
        return item;
      });
      StorageService.saveInventoryItems(updatedInventory);
      setItemsList(updatedInventory);

      // 2. Save Consumption Log List
      let updatedConsumptions = [];
      if (editingId) {
        updatedConsumptions = currentConsumptions.map(c => c.id === editingId ? payload : c);
        setFeedback({ type: 'success', message: '✓ खपत प्रविष्टि सफलतापूर्वक अपडेट कर दी गई!' });
      } else {
        updatedConsumptions = [payload, ...currentConsumptions];
        setFeedback({ type: 'success', message: '✓ स्टॉक सफलतापूर्वक घटा दिया गया और खर्चे का वाउचर दर्ज हो गया!' });
      }

      StorageService.saveMaterialConsumptions(updatedConsumptions);
      setConsumptionList(updatedConsumptions);

      if (typeof onSave === 'function') onSave(payload);

      // Reset Form
      setEditingId(null);
      setQuantity('');
      setVehicleRef('');
      setRemarks('');
      setSelectedItemId('');
    } catch (err) {
      setFeedback({ type: 'error', message: 'त्रुटि: ' + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (entry) => {
    setEditingId(entry.id);
    setUsageDate(entry.usage_date || new Date().toISOString().split('T')[0]);
    setSelectedItemId(entry.item_id || '');
    setQuantity(String(entry.quantity || ''));
    setVehicleRef(entry.vehicle_ref || '');
    setExpenseLedger(entry.expense_ledger || '');
    setRemarks(entry.remarks || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 3. CRITICAL FIX: Revert stock back to inventory when a consumption entry is deleted
  const handleDelete = (id) => {
    if (!window.confirm('क्या आप वाकई इस खपत प्रविष्टि को हटाना चाहते हैं? हटाने पर खपत की गई मात्रा वापस स्टॉक में जुड़ जाएगी।')) return;
    
    try {
      const currentConsumptions = StorageService.getMaterialConsumptions();
      const entryToDelete = currentConsumptions.find(c => c.id === id);

      if (entryToDelete) {
        const targetItemId = entryToDelete.item_id;
        const returnQty = Number(entryToDelete.quantity || 0);

        // Restore quantity back to inventory stock
        const currentInventory = StorageService.getInventoryItems();
        const restoredInventory = currentInventory.map(item => {
          if (String(item.id || item.item_name) === String(targetItemId)) {
            const currentStk = Number(item.current_stock || item.stock || 0);
            return { ...item, current_stock: currentStk + returnQty };
          }
          return item;
        });

        StorageService.saveInventoryItems(restoredInventory);
        setItemsList(restoredInventory);
      }

      const filtered = currentConsumptions.filter(item => item.id !== id);
      StorageService.saveMaterialConsumptions(filtered);
      setConsumptionList(filtered);
      setFeedback({ type: 'success', message: '✓ प्रविष्टि हटा दी गई और स्टॉक सफलतापूर्वक वापस जोड़ दिया गया।' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({ type: 'error', message: 'हटाने में विफल: ' + err.message });
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', width: '100%', maxWidth: '100vw', overflowX: 'hidden', color: '#0f172a' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', marginBottom: '14px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          {onClose && (
            <button onClick={onClose} style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
              ← Dashboard
            </button>
          )}
          <div style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', backgroundColor: editingId ? '#fef3c7' : '#f1f5f9', color: editingId ? '#92400e' : '#475569', border: editingId ? '1px solid #fde68a' : '1px solid #cbd5e1' }}>
            {editingId ? '⚠️ Editing Mode' : 'Internal Ledger Mode'}
          </div>
        </div>

        <div>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🚜</span>
            <span>Fuel & Material Internal Consumption</span>
          </h1>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
            Automatic Stock Deduction & Expense Voucher Generator
          </div>
        </div>

        {/* Dynamic Stock Badge */}
        <div style={{ marginTop: '12px', padding: '10px 12px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#065f46' }}>
            {selectedItem ? `AVAILABLE ${selectedItem.item_name || selectedItem.name}:` : 'AVAILABLE STOCK:'}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 900, color: '#047857' }}>
            {currentStock.toFixed(2)} {selectedItem?.unit || 'Units'}
          </span>
        </div>
      </div>

      {feedback && (
        <div style={{ marginBottom: '14px', padding: '10px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', backgroundColor: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2', color: feedback.type === 'success' ? '#065f46' : '#991b1b', border: feedback.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca' }}>
          {feedback.message}
        </div>
      )}

      {/* Form */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', marginBottom: '16px', boxSizing: 'border-box' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>Date of Usage *</label>
            <input type="date" value={usageDate} onChange={(e) => setUsageDate(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '12px', boxSizing: 'border-box', outline: 'none' }} required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>Select Stock Item to Consume *</label>
            <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '12px', boxSizing: 'border-box', outline: 'none' }} required>
              <option value="">-- Choose Stock Item from Live Inventory --</option>
              {itemsList.map((item, idx) => (
                <option key={item.id || idx} value={item.id || item.item_name}>
                  {item.item_name || item.name} (Available: {Number(item.current_stock || item.stock || 0).toFixed(2)} {item.unit || 'Units'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>Quantity Consumed *</label>
            <input type="number" step="0.01" min="0.01" placeholder="e.g. 20" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '12px', boxSizing: 'border-box', outline: 'none' }} required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>Used In / Vehicle Ref *</label>
            <input type="text" placeholder="e.g. Mahindra 585 / Generator" value={vehicleRef} onChange={(e) => setVehicleRef(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '12px', boxSizing: 'border-box', outline: 'none' }} required />
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
              Estimated Cost Valuation (@ ₹{unitRate.toFixed(2)}/{selectedItem?.unit || 'Unit'}):
            </span>
            <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>
              ₹{estimatedCost.toFixed(2)}
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>Debit Expense Ledger (P&L Kharch Khata) *</label>
            <select value={expenseLedger} onChange={(e) => setExpenseLedger(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '12px', boxSizing: 'border-box', outline: 'none' }} required>
              <option value="">-- Select Created Account / Expense Ledger --</option>
              {accountsList.map((acc, idx) => (
                <option key={idx} value={acc.name}>
                  {acc.name} ({acc.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>Remarks (Optional)</label>
            <input type="text" placeholder="e.g. Field work session" value={remarks} onChange={(e) => setRemarks(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '12px', boxSizing: 'border-box', outline: 'none' }} />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '12px', backgroundColor: isSubmitting ? '#94a3b8' : '#0284c7', color: '#ffffff', cursor: 'pointer' }}>
              ⚡ {isSubmitting ? 'Processing...' : editingId ? 'Update Entry' : 'Deduct Stock & Post Expense'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setQuantity(''); setVehicleRef(''); setSelectedItemId(''); }} style={{ padding: '12px 16px', backgroundColor: '#e2e8f0', color: '#334155', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                Cancel
              </button>
            )}
          </div>

        </form>
      </div>

      {/* Logs Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>📋 Recorded Consumption Logs</h2>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Total: {consumptionList.length}</span>
        </div>

        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '320px', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                <th style={{ padding: '8px 6px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '8px 6px', textAlign: 'left' }}>Item & Ref</th>
                <th style={{ padding: '8px 6px', textAlign: 'right' }}>Qty</th>
                <th style={{ padding: '8px 6px', textAlign: 'right' }}>Valuation</th>
                <th style={{ padding: '8px 6px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {consumptionList.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>कोई खपत प्रविष्टि दर्ज नहीं है।</td>
                </tr>
              ) : (
                consumptionList.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 6px', fontWeight: 600, color: '#334155' }}>{entry.usage_date}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{entry.item_name}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{entry.vehicle_ref}</div>
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>{Number(entry.quantity).toFixed(2)}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>₹{Number(entry.total_valuation).toFixed(2)}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                      <button onClick={() => handleStartEdit(entry)} style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '10px', cursor: 'pointer', marginRight: '4px' }}>Edit</button>
                      <button onClick={() => handleDelete(entry.id)} style={{ backgroundColor: '#ffe4e6', color: '#9f1239', border: 'none', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '10px', cursor: 'pointer' }}>Del</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
