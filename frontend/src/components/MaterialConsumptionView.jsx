import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../utils/storageSync';
import { useItemMaster } from '../hooks/useItemMaster';
// 🔥 Importing your exact Voucher Entry Dropdown
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';

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
  
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const syncData = () => {
      let stored = StorageService.getLedgerAccounts() || [];
      
      // 🔥 Accounting Rule: Only Expense accounts are allowed here
      const expenseAccounts = stored.filter(acc => {
        const group = String(acc.sub_group || acc.category || acc.primary_type || '').toUpperCase();
        const name = String(acc.account_name || acc.name || '').toUpperCase();
        const isExpense = group.includes('EXPENSE') || group.includes('DIRECT') || group.includes('INDIRECT') || group.includes('FREIGHT');
        const isRestricted = group.includes('LIABILIT') || group.includes('ASSET') || group.includes('EQUITY') || group.includes('INCOME') || group.includes('CREDITOR') || group.includes('DEBTOR') || name.includes('CASH') || name.includes('BANK');
        return isExpense && !isRestricted;
      });

      expenseAccounts.sort((a, b) => String(a.account_name || a.name || '').localeCompare(String(b.account_name || b.name || '')));
      setAccountsList(expenseAccounts);
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
        setFeedback({ type: 'success', message: '✓ स्टॉक घटा दिया गया और P&L में खर्चे की प्रविष्टि हो गई!' });
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '16px', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '16px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>🚜 Fuel & Material Consumption</h1>
          {onClose && <button onClick={onClose} style={{ padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Close</button>}
        </div>

        {feedback && <div style={{ padding: '10px', marginBottom: '16px', borderRadius: '8px', backgroundColor: feedback.type === 'error' ? '#fef2f2' : '#ecfdf5', color: feedback.type === 'error' ? '#991b1b' : '#065f46' }}>{feedback.message}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Date of Usage *</label>
            <input type="date" value={usageDate} onChange={(e) => setUsageDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Select Stock Item *</label>
            <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #eab308', boxSizing: 'border-box', backgroundColor: '#fff' }} required>
              <option value="">-- Choose Stock Item --</option>
              {allItems.map(item => (
                <option key={item.id} value={item.id}>{item.item_name} [Stock: {item.current_stock || 0} {item.unit}]</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Quantity *</label>
              <input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Used In / Vehicle Ref *</label>
              <input type="text" value={vehicleRef} onChange={(e) => setVehicleRef(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
            </div>
          </div>

          {/* 🔥 Your EXACT Voucher Entry Dropdown */}
          <div style={{ marginBottom: '16px' }}>
            <SearchableAccountDropdown
              label="Debit Expense Ledger (P&L Kharch Khata) *"
              accounts={accountsList}
              value={expenseLedger}
              onChange={val => setExpenseLedger(val)}
              placeholder="Search expense account..."
              colorAccent="#dc2626"
              required
            />
          </div>

          <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '14px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
            {editingId ? 'Update Entry' : 'Deduct Stock & Post Expense'}
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
              <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '2px' }}>A/c: {entry.expense_ledger}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 'bold', color: '#059669' }}>Qty: {entry.quantity}</div>
              <div style={{ marginTop: '4px' }}>
                <button onClick={() => handleStartEdit(entry)} style={{ marginRight: '8px', padding: '4px 8px', cursor: 'pointer', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff' }}>Edit</button>
                <button onClick={() => handleDelete(entry.id)} style={{ padding: '4px 8px', color: 'red', cursor: 'pointer', border: '1px solid #fecaca', borderRadius: '4px', backgroundColor: '#fef2f2' }}>Del</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
