import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../utils/storageSync';
import { useItemMaster } from '../hooks/useItemMaster';

export default function MaterialConsumptionView({ firm, onSave, onClose }) {
  const allItems = useItemMaster();
  const [accountsList, setAccountsList] = useState([]);
  const [consumptionList, setConsumptionList] = useState([]);

  const [usageDate, setUsageDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [vehicleRef, setVehicleRef] = useState('');
  const [expenseLedger, setExpenseLedger] = useState('');
  const [remarks, setRemarks] = useState('');
  
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const syncData = () => {
      const storedAccounts = StorageService.getLedgerAccounts() || [];
      // Robust extraction to handle legacy data formats
      const formattedAccounts = storedAccounts.map(acc => ({
        id: acc.id || Math.random().toString(),
        displayName: acc.account_name || acc.name || 'Unnamed Account'
      }));
      
      formattedAccounts.sort((a, b) => a.displayName.localeCompare(b.displayName));
      setAccountsList(formattedAccounts);
      setConsumptionList(StorageService.getMaterialConsumptions() || []);
    };

    syncData();
    window.addEventListener('app_storage_updated', syncData);
    window.addEventListener('storage', syncData);
    return () => {
      window.removeEventListener('app_storage_updated', syncData);
      window.removeEventListener('storage', syncData);
    };
  }, []);

  const filteredAccounts = useMemo(() => {
    if (!accountSearchQuery.trim()) return accountsList;
    return accountsList.filter(acc => 
      acc.displayName.toLowerCase().includes(accountSearchQuery.toLowerCase())
    );
  }, [accountsList, accountSearchQuery]);

  const selectedItem = useMemo(() => {
    return allItems.find(i => String(i.id) === String(selectedItemId)) || null;
  }, [allItems, selectedItemId]);

  const currentStock = Number(selectedItem?.current_stock || 0);
  const unitRate = Number(selectedItem?.unit_purchase_price || 0);
  const parsedQty = Number(quantity || 0);
  const estimatedCost = parsedQty * unitRate;

  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedItemId) return setFeedback({ type: 'error', message: 'कृपया Stock Item चुनें।' });
    if (parsedQty <= 0) return setFeedback({ type: 'error', message: 'कृपया वैध खपत मात्रा दर्ज करें।' });
    if (!editingId && parsedQty > currentStock) return setFeedback({ type: 'error', message: `स्टॉक अपर्याप्त है! उपलब्ध: ${currentStock.toFixed(2)}` });
    if (!expenseLedger) return setFeedback({ type: 'error', message: 'कृपया Debit Expense Ledger चुनें।' });

    setIsSubmitting(true);
    try {
      const currentInventory = StorageService.getInventoryItems() || [];
      const currentConsumptions = StorageService.getMaterialConsumptions() || [];

      let finalQtyDelta = parsedQty;
      if (editingId) {
        const existingEntry = currentConsumptions.find(c => c.id === editingId);
        if (existingEntry && String(existingEntry.item_id) === String(selectedItemId)) {
          finalQtyDelta = parsedQty - Number(existingEntry.quantity || 0);
        }
      }

      const payload = {
        id: editingId || `CONSUME-${Date.now()}`,
        firm_id: firm?.id || 'firm_default',
        usage_date: usageDate,
        item_id: selectedItemId,
        item_name: selectedItem?.item_name || 'Material Item',
        quantity: parsedQty,
        unit_rate: unitRate,
        total_valuation: estimatedCost,
        vehicle_ref: vehicleRef || 'General Usage',
        expense_ledger: expenseLedger,
        remarks: remarks || '',
        created_at: new Date().toISOString()
      };

      const updatedInventory = currentInventory.map(item => {
        if (String(item.id) === String(selectedItemId)) {
          return { ...item, current_stock: Math.max(0, Number(item.current_stock || 0) - finalQtyDelta) };
        }
        return item;
      });
      StorageService.setItem('inventory_items', updatedInventory);

      let updatedConsumptions;
      if (editingId) {
        updatedConsumptions = currentConsumptions.map(c => c.id === editingId ? payload : c);
        setFeedback({ type: 'success', message: '✓ खपत प्रविष्टि अपडेट हो गई!' });
      } else {
        updatedConsumptions = [payload, ...currentConsumptions];
        setFeedback({ type: 'success', message: '✓ स्टॉक घटा दिया गया!' });
      }
      StorageService.setItem('material_consumptions', updatedConsumptions);

      if (typeof onSave === 'function') onSave(payload);
      setEditingId(null); setQuantity(''); setVehicleRef(''); setRemarks(''); setSelectedItemId(''); setExpenseLedger('');
    } catch (err) {
      setFeedback({ type: 'error', message: 'त्रुटि: ' + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (entry) => {
    setEditingId(entry.id);
    setUsageDate(entry.usage_date);
    setSelectedItemId(entry.item_id);
    setQuantity(String(entry.quantity));
    setVehicleRef(entry.vehicle_ref);
    setExpenseLedger(entry.expense_ledger);
    setRemarks(entry.remarks);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (!window.confirm('हटाने पर खपत की गई मात्रा वापस स्टॉक में जुड़ जाएगी। जारी रखें?')) return;
    try {
      const currentConsumptions = StorageService.getMaterialConsumptions() || [];
      const entryToDelete = currentConsumptions.find(c => c.id === id);

      if (entryToDelete) {
        const currentInventory = StorageService.getInventoryItems() || [];
        const restoredInventory = currentInventory.map(item => {
          if (String(item.id) === String(entryToDelete.item_id)) {
            return { ...item, current_stock: Number(item.current_stock || 0) + Number(entryToDelete.quantity || 0) };
          }
          return item;
        });
        StorageService.setItem('inventory_items', restoredInventory);
      }

      const filtered = currentConsumptions.filter(item => item.id !== id);
      StorageService.setItem('material_consumptions', filtered);
      setFeedback({ type: 'success', message: '✓ प्रविष्टि हटा दी गई।' });
    } catch (err) {
      setFeedback({ type: 'error', message: 'विफल: ' + err.message });
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '16px', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>🚜 Fuel & Material Consumption</h1>
          {onClose && <button onClick={onClose} style={{ padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Close</button>}
        </div>

        {feedback && <div style={{ padding: '10px', marginBottom: '16px', borderRadius: '8px', backgroundColor: feedback.type === 'error' ? '#fef2f2' : '#ecfdf5', color: feedback.type === 'error' ? '#991b1b' : '#065f46' }}>{feedback.message}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Date of Usage *</label>
            <input type="date" value={usageDate} onChange={(e) => setUsageDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Select Stock Item *</label>
            <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} required>
              <option value="">-- Choose Stock Item --</option>
              {allItems.map(item => (
                <option key={item.id} value={item.id}>{item.item_name} (Available: {item.current_stock || 0})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Quantity *</label>
            <input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Vehicle Ref *</label>
            <input type="text" value={vehicleRef} onChange={(e) => setVehicleRef(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} required />
          </div>

          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Debit Expense Ledger *</label>
            <div onClick={() => setIsDropdownOpen(!isDropdownOpen)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#fff' }}>
              {expenseLedger || '-- Select Expense Ledger --'}
            </div>
            {isDropdownOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', zIndex: 10, marginTop: '4px', padding: '8px', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <input type="text" placeholder="Search..." value={accountSearchQuery} onChange={(e) => setAccountSearchQuery(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }} />
                <div onClick={() => { setExpenseLedger(''); setIsDropdownOpen(false); }} style={{ padding: '8px', cursor: 'pointer', color: '#64748b' }}>-- Clear --</div>
                {filteredAccounts.map((acc, idx) => (
                  <div key={idx} onClick={() => { setExpenseLedger(acc.displayName); setIsDropdownOpen(false); }} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                    {acc.displayName}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={isSubmitting} style={{ padding: '14px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            {editingId ? 'Update Entry' : 'Deduct Stock'}
          </button>
        </form>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>📋 Consumption Logs ({consumptionList.length})</h2>
        {consumptionList.map(entry => (
          <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>{entry.item_name}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>{entry.usage_date} | {entry.vehicle_ref}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 'bold', color: '#059669' }}>Qty: {entry.quantity}</div>
              <div style={{ marginTop: '4px' }}>
                <button onClick={() => handleStartEdit(entry)} style={{ marginRight: '8px', padding: '4px 8px', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => handleDelete(entry.id)} style={{ padding: '4px 8px', color: 'red', cursor: 'pointer' }}>Del</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
