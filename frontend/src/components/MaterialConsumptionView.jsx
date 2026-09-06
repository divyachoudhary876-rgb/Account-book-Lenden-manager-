import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../utils/storageSync';
import { useItemMaster } from '../hooks/useItemMaster';

const CustomAccountDropdown = ({ label, value, onChange, accounts, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const getName = (a) => a.account_name || a.name || a.displayName || '';
  const getGroup = (a) => a.sub_group || a.category || a.primary_type || 'Ledger Account';
  const getBal = (a) => Number(a.opening_balance || 0);
  const getBalType = (a) => a.balance_type || 'Dr';

  const filtered = accounts.filter(a => getName(a).toLowerCase().includes(search.toLowerCase()));
  const selectedAcc = accounts.find(a => getName(a) === value);

  return (
    <div style={{ position: 'relative', marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#0f172a' }}>{label}</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: isOpen ? '2px solid #059669' : '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}
      >
        {selectedAcc ? (
          <div>
            <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{getName(selectedAcc)}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{getGroup(selectedAcc)}</div>
          </div>
        ) : (
          <span style={{ color: '#64748b' }}>{placeholder || '-- Select Expense Account --'}</span>
        )}
        <span style={{ fontSize: '10px', color: '#64748b' }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', zIndex: 100, marginTop: '4px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', maxHeight: '350px' }}>
          <div style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px' }}>🔍</span>
            <input
              type="text"
              placeholder="Search Expense Ledger..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box', fontSize: '13px' }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No expense accounts found. Create one first!</div>
            ) : (
              filtered.map(acc => {
                const accName = getName(acc);
                return (
                  <div
                    key={acc.id || Math.random()}
                    onClick={() => { onChange(accName); setIsOpen(false); setSearch(''); }}
                    style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: value === accName ? '#f0fdf4' : '#fff' }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: value === accName ? '#059669' : '#0f172a' }}>{accName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{getGroup(acc)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

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
      
      // 🔥 ACCOUNTING RULE APPLIED: Filter ONLY Expenses
      const expenseAccounts = stored.filter(acc => {
        const group = String(acc.sub_group || acc.category || acc.primary_type || '').toUpperCase();
        const name = String(acc.account_name || acc.name || '').toUpperCase();

        // Must be an expense
        const isExpense = group.includes('EXPENSE') || group.includes('DIRECT') || group.includes('INDIRECT') || group.includes('FREIGHT');
        
        // Strict Blacklist to prevent Parties/Cash/Bank/Capital from showing here
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
            <input type="date" value={usageDate} onChange={(e) => setUsageDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Select Stock Item *</label>
            <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #eab308', boxSizing: 'border-box', backgroundColor: '#fff' }} required>
              <option value="">-- Choose Stock Item --</option>
              {allItems.map(item => (
                <option key={item.id} value={item.id}>{item.item_name} [Stock: {item.current_stock || 0} {item.unit}]</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Quantity *</label>
              <input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Used In / Vehicle Ref *</label>
              <input type="text" value={vehicleRef} onChange={(e) => setVehicleRef(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
            </div>
          </div>

          <CustomAccountDropdown
            label="Debit Expense Ledger (P&L Kharch Khata) *"
            value={expenseLedger}
            onChange={setExpenseLedger}
            accounts={accountsList}
            placeholder="-- Select Expense Ledger --"
          />

          <button type="submit" disabled={isSubmitting} style={{ padding: '14px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
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
