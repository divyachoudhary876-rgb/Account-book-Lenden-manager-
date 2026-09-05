// frontend/src/components/MaterialConsumptionView.jsx
import React, { useState, useEffect, useMemo } from 'react';

export default function MaterialConsumptionView({ firm, inventoryItems = [], expenseAccounts = [], onSave, onClose }) {
  const [itemsList, setItemsList] = useState([]);
  const [accountsList, setAccountsList] = useState([]);
  const [consumptionList, setConsumptionList] = useState([]);

  // Form State
  const [usageDate, setUsageDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [vehicleRef, setVehicleRef] = useState('');
  const [expenseLedger, setExpenseLedger] = useState('');
  const [remarks, setRemarks] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Sync Inventory & Master Accounts from props or localStorage dynamically
  useEffect(() => {
    const loadMasterData = () => {
      try {
        // 1. Load Inventory Items
        const storedItems = JSON.parse(localStorage.getItem('inventory_items') || '[]');
        if (storedItems.length > 0) {
          setItemsList(storedItems);
        } else if (inventoryItems.length > 0) {
          setItemsList(inventoryItems);
        } else {
          setItemsList([{ id: 'default_diesel', item_name: 'Diesel', unit: 'Liters', current_stock: 4557.40, purchase_rate: 97.50 }]);
        }

        // 2. Load Created Chart of Accounts (Debit Dropdown Source)
        const storedAccounts = JSON.parse(localStorage.getItem('ledger_accounts') || '[]');
        const defaultAccounts = [
          { id: 'acc_1', name: 'Diesel Expenses', category: 'EXPENSES' },
          { id: 'acc_2', name: 'Petrol expenses', category: 'EXPENSES' },
          { id: 'acc_3', name: 'Machinery Maintenance', category: 'EXPENSES' },
          { id: 'acc_4', name: 'Fuel & Coal Consumption', category: 'EXPENSES' }
        ];

        // Merge stored accounts with props and defaults, removing duplicates by name
        const combinedMap = new Map();
        [...defaultAccounts, ...expenseAccounts, ...storedAccounts].forEach(acc => {
          const name = acc.name || acc.account_name;
          if (name) combinedMap.set(name.trim(), { ...acc, name: name.trim() });
        });
        
        setAccountsList(Array.from(combinedMap.values()));

        // 3. Load Consumption History
        const savedConsumptions = JSON.parse(localStorage.getItem('material_consumptions') || '[]');
        setConsumptionList(savedConsumptions);
      } catch (e) {
        console.error('Master data sync error:', e);
      }
    };

    loadMasterData();
    window.addEventListener('storage', loadMasterData);
    return () => window.removeEventListener('storage', loadMasterData);
  }, [inventoryItems, expenseAccounts]);

  const selectedItem = useMemo(() => {
    if (!Array.isArray(itemsList) || itemsList.length === 0) return null;
    return itemsList.find(i => String(i.id) === String(selectedItemId)) || null;
  }, [itemsList, selectedItemId]);

  const currentStock = Number(selectedItem?.current_stock || selectedItem?.stock || 0);
  const unitRate = Number(selectedItem?.purchase_rate || selectedItem?.rate || selectedItem?.average_rate || 97.50);
  const parsedQty = Number(quantity || 0);
  const estimatedCost = parsedQty * unitRate;

  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedItemId) {
      setFeedback({ type: 'error', message: 'कृपया खपत के लिए स्टॉक आइटम चुनें।' });
      return;
    }
    if (parsedQty <= 0) {
      setFeedback({ type: 'error', message: 'कृपया वैध मात्रा (Quantity) दर्ज करें।' });
      return;
    }
    if (!editingId && parsedQty > currentStock) {
      setFeedback({ type: 'error', message: `स्टॉक अपर्याप्त है! उपलब्ध स्टॉक: ${currentStock.toFixed(2)}` });
      return;
    }
    if (!expenseLedger) {
      setFeedback({ type: 'error', message: 'कृपया डेबिट खर्चे का खाता चुनें।' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: editingId || `CONSUME-${Date.now()}`,
        firm_id: firm?.id || 'default_firm',
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

      // Deduct inventory stock
      const updatedInventory = itemsList.map(item => {
        if (String(item.id) === String(selectedItemId)) {
          const oldStock = Number(item.current_stock || item.stock || 0);
          return { ...item, current_stock: Math.max(0, oldStock - parsedQty) };
        }
        return item;
      });
      setItemsList(updatedInventory);
      localStorage.setItem('inventory_items', JSON.stringify(updatedInventory));

      let updatedConsumptions = [];
      if (editingId) {
        updatedConsumptions = consumptionList.map(c => c.id === editingId ? payload : c);
        setFeedback({ type: 'success', message: '✓ खपत प्रविष्टि सफलतापूर्वक अपडेट कर दी गई!' });
      } else {
        updatedConsumptions = [payload, ...consumptionList];
        setFeedback({ type: 'success', message: '✓ स्टॉक सफलतापूर्वक घटा दिया गया और खर्चे का वाउचर दर्ज हो गया!' });
      }

      setConsumptionList(updatedConsumptions);
      localStorage.setItem('material_consumptions', JSON.stringify(updatedConsumptions));

      if (typeof onSave === 'function') {
        onSave(payload);
      }

      setEditingId(null);
      setQuantity('');
      setVehicleRef('');
      setRemarks('');
      setSelectedItemId('');
    } catch (err) {
      setFeedback({ type: 'error', message: 'सहेजने में विफल: ' + err.message });
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

  const handleDelete = (id) => {
    if (!window.confirm('क्या आप वाकई इस प्रविष्टि को हटाना चाहते हैं?')) return;
    try {
      const filtered = consumptionList.filter(item => item.id !== id);
      setConsumptionList(filtered);
      localStorage.setItem('material_consumptions', JSON.stringify(filtered));
      setFeedback({ type: 'success', message: 'प्रविष्टि सफलतापूर्वक हटा दी गई।' });
    } catch (e) {
      setFeedback({ type: 'error', message: 'हटाने में विफल।' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', width: '100%', maxWidth: '100vw', overflowX: 'hidden', color: '#0f172a' }}>
      
      {/* Top Header */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', marginBottom: '14px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          {onClose && (
            <button
              onClick={onClose}
              style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}
            >
              ← Dashboard
            </button>
          )}
          <div style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', backgroundColor: editingId ? '#fef3c7' : '#f1f5f9', color: editingId ? '#92400e' : '#475569', border: editingId ? '1px solid #fde68a' : '1px solid #cbd5e1' }}>
            {editingId ? '⚠️ Editing Mode Active' : 'Internal Ledger Mode'}
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

      {/* Main Form Card */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', marginBottom: '16px', boxSizing: 'border-box' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>Date of Usage *</label>
            <input
              type="date"
              value={usageDate}
              onChange={(e) => setUsageDate(e.target.value)}
              style={{ width: '100%', padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '12px', fontWeight: 500, boxSizing: 'border-box', outline: 'none' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>Select Stock Item to Consume *</label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              style={{ width: '100%', padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '12px', fontWeight: 500, boxSizing: 'border-box', outline: 'none' }}
              required
            >
              <option value="">-- Choose Stock Item from Inventory --</option>
              {itemsList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.item_name || item.name} (Available: {Number(item.current_stock || item.stock || 0).toFixed(2)} {item.unit || 'Units'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>Quantity Consumed *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 20"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={{ width: '100%', padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '12px', fontWeight: 500, boxSizing: 'border-box', outline: 'none' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>Used In / Vehicle Ref *</label>
            <input
              type="text"
              placeholder="e.g. Mahindra 585 / Generator"
              value={vehicleRef}
              onChange={(e) => setVehicleRef(e.target.value)}
              style={{ width: '100%', padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '12px', fontWeight: 500, boxSizing: 'border-box', outline: 'none' }}
              required
            />
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
              Estimated Cost Valuation (@ ₹{unitRate.toFixed(2)}/{selectedItem?.unit || 'Unit'}):
            </span>
            <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>
              ₹{estimatedCost.toFixed(2)}
            </span>
          </div>

          {/* DEBIT EXPENSE LEDGER DROPDOWN - POPULATES CREATED ACCOUNTS */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>Debit Expense Ledger (P&L Kharch Khata) *</label>
            <select
              value={expenseLedger}
              onChange={(e) => setExpenseLedger(e.target.value)}
              style={{ width: '100%', padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '12px', fontWeight: 500, boxSizing: 'border-box', outline: 'none' }}
              required
            >
              <option value="">-- Select Created Account / Expense Ledger --</option>
              {accountsList.map((acc, idx) => (
                <option key={acc.id || idx} value={acc.name}>
                  {acc.name} ({acc.category || acc.account_group || 'Expenses'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>Remarks / Operational Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Field work session"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              style={{ width: '100%', padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '12px', fontWeight: 500, boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: 'bold',
                fontSize: '12px',
                backgroundColor: isSubmitting ? '#94a3b8' : '#0284c7',
                color: '#ffffff',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(2,132,199,0.2)'
              }}
            >
              ⚡ {isSubmitting ? 'Processing...' : editingId ? 'Update Consumption Entry' : 'Deduct Stock & Post Expense'}
            </button>
            
            {editingId && (
              <button
                type="button"
                onClick={() => { setEditingId(null); setQuantity(''); setVehicleRef(''); setSelectedItemId(''); }}
                style={{ padding: '12px 16px', backgroundColor: '#e2e8f0', color: '#334155', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            )}
          </div>

        </form>
      </div>

      {/* Live Consumption Log Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
            📋 Recorded Consumption Logs
          </h2>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Total: {consumptionList.length}</span>
        </div>

        <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '320px', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                <th style={{ padding: '8px 6px', textAlign: 'left', width: '22%' }}>Date</th>
                <th style={{ padding: '8px 6px', textAlign: 'left', width: '28%' }}>Item & Ref</th>
                <th style={{ padding: '8px 6px', textAlign: 'right', width: '15%' }}>Qty</th>
                <th style={{ padding: '8px 6px', textAlign: 'right', width: '20%' }}>Valuation</th>
                <th style={{ padding: '8px 6px', textAlign: 'center', width: '15%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {consumptionList.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                    कोई खपत प्रविष्टि दर्ज नहीं की गई है।
                  </td>
                </tr>
              ) : (
                consumptionList.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 6px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>{entry.usage_date}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{entry.item_name}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{entry.vehicle_ref}</div>
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>
                      {Number(entry.quantity).toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                      ₹{Number(entry.total_valuation).toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => handleStartEdit(entry)}
                        style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '10px', cursor: 'pointer', marginRight: '4px' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        style={{ backgroundColor: '#ffe4e6', color: '#9f1239', border: 'none', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '10px', cursor: 'pointer' }}
                      >
                        Del
                      </button>
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
