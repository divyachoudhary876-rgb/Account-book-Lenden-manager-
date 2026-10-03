// frontend/src/components/MaterialConsumptionView.jsx

import React, { useState, useEffect } from 'react';
import { loadFirmData, saveFirmData } from '../utils/firmIsolationEngine';
import { getCurrentActiveFY } from '../utils/financialYearLockEngine';
import { saveUniversalVoucher } from '../utils/voucherPostingEngine';
import { getFirmMasterAccounts, saveMasterAccount } from '../utils/accountMasterEngine';
import SearchableStockDropdown from './SearchableStockDropdown';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export default function MaterialConsumptionView({ firm, onClose }) {
  const activeFY = getCurrentActiveFY();
  const activeFirmId = firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';

  const [usageDate, setUsageDate] = useState(new Date().toISOString().slice(0, 10));
  const [usesFor, setUsesFor] = useState('');
  
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedStockId, setSelectedStockId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [consumptionList, setConsumptionList] = useState([]);
  
  const [savedRecords, setSavedRecords] = useState([]);
  const [feedback, setFeedback] = useState(null);

  const loadData = () => {
    if (!firm) return;
    
    const rawInventory = loadFirmData('inventory_items', firm, []);
    const validInventory = rawInventory.filter(i => i && (i.name || i.item_name));
    setInventoryItems(validInventory);

    const records = loadFirmData('material_consumption_records', firm, []);
    records.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    setSavedRecords(records);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_storage_updated', loadData);
    window.addEventListener('app_state_updated', loadData);
    return () => {
      window.removeEventListener('app_storage_updated', loadData);
      window.removeEventListener('app_state_updated', loadData);
    };
  }, [firm, activeFirmId]);

  const handleAddToList = () => {
    if (!selectedStockId || !quantity || Number(quantity) <= 0) {
      return alert('Kripya item chunein aur valid quantity darj karein.');
    }

    const itemObj = inventoryItems.find(i => String(i.id) === String(selectedStockId));
    if (!itemObj) return alert('Selected inventory item not found.');

    const qty = Number(quantity);
    const availableStock = Number(itemObj.current_stock || itemObj.stock || 0);

    if (qty > availableStock && !itemObj.is_service && itemObj.item_type !== 'SERVICE') {
      return alert(`Available stock se zyada quantity darj nahi kar sakte! (Uplabdh: ${availableStock} ${itemObj.unit || 'Units'})`);
    }

    // Complete rate fallback resolution
    const rateVal = parseFloat(itemObj.unit_purchase_price || itemObj.purchase_price || itemObj.cost_price || itemObj.rate || 0);
    const totalItemCost = round2(qty * rateVal);

    setConsumptionList([
      ...consumptionList,
      {
        id: Date.now(),
        itemId: itemObj.id,
        name: (itemObj.name || itemObj.item_name || 'Item').trim(),
        unit: itemObj.unit || 'Units',
        qty,
        rate: rateVal,
        totalCost: totalItemCost
      }
    ]);

    setSelectedStockId('');
    setQuantity('');
  };

  const removeItemFromList = (id) => {
    setConsumptionList(consumptionList.filter(c => c.id !== id));
  };

  const totalConsumptionValue = round2(consumptionList.reduce((sum, c) => sum + (c.totalCost || 0), 0));

  const handleSaveConsumption = (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!usesFor) return alert('Kripya usage location / purpose darj karein (e.g. Chamber-1 / Tractor / Generator).');
    if (consumptionList.length === 0) return alert('Kam se kam ek item consumption list me jodein.');

    try {
      const recordId = 'CONS-' + Date.now();

      // 1. Deduct Stock from Inventory
      const updatedInventory = inventoryItems.map(inv => {
        const matched = consumptionList.find(c => String(c.itemId) === String(inv.id));
        if (matched) {
          const currentQty = parseFloat(inv.current_stock || inv.stock || 0);
          const newQty = round2(Math.max(0, currentQty - matched.qty));
          return {
            ...inv,
            current_stock: newQty,
            stock: newQty,
            qty: newQty,
            updated_at: new Date().toISOString()
          };
        }
        return inv;
      });

      setInventoryItems(updatedInventory);
      saveFirmData('inventory_items', firm, updatedInventory);

      // 2. Save Consumption History Record
      const newRecord = {
        id: recordId,
        fiscal_year: activeFY,
        date: usageDate,
        uses_for: usesFor,
        items: consumptionList,
        total_value: totalConsumptionValue,
        created_at: new Date().toISOString()
      };

      const updatedRecords = [newRecord, ...savedRecords];
      setSavedRecords(updatedRecords);
      saveFirmData('material_consumption_records', firm, updatedRecords);

      // 3. Post Ind AS Double-Entry Fuel/Material Consumption Journal Voucher (JV)
      // Resolves P&L Expense Head vs Stock Asset Head
      const isFuel = consumptionList.some(c => c.name.toLowerCase().includes('diesel') || c.name.toLowerCase().includes('fuel'));
      const expenseLedgerName = isFuel 
        ? 'Tractor Diesel & Running Expense' 
        : 'Direct Production & Factory Expenses';
      
      const stockAssetLedger = isFuel 
        ? 'Consumables & Fuel Stock' 
        : 'Raw Material Inventory';

      const masterAccounts = getFirmMasterAccounts(activeFirmId);
      if (!masterAccounts.some(a => (a.account_name || a.name || '').trim().toLowerCase() === expenseLedgerName.toLowerCase())) {
        saveMasterAccount(activeFirmId, {
          account_name: expenseLedgerName,
          primary_type: 'EXPENSES',
          type: 'Expenses',
          sub_group: isFuel ? 'Operating Fuel Costs (Tractor / Generator Diesel)' : 'Direct Production Expenses',
          balance_type: 'Dr'
        });
      }
      if (!masterAccounts.some(a => (a.account_name || a.name || '').trim().toLowerCase() === stockAssetLedger.toLowerCase())) {
        saveMasterAccount(activeFirmId, {
          account_name: stockAssetLedger,
          primary_type: 'ASSETS',
          type: 'Assets',
          sub_group: isFuel ? 'Consumables & Fuel Stock (ईंधन/डीजल स्टॉक)' : 'Raw Material Inventory (कच्चा माल)',
          balance_type: 'Dr'
        });
      }

      saveUniversalVoucher(activeFirmId, {
        id: `JV-${recordId}`,
        firm_id: activeFirmId,
        voucher_type: 'JOURNAL',
        type: 'JOURNAL',
        voucher_date: usageDate,
        date: usageDate,
        reference_no: recordId,
        dr_account: expenseLedgerName,
        cr_account: stockAssetLedger,
        amount: totalConsumptionValue,
        total_amount: totalConsumptionValue,
        narration: `Material/Fuel consumed for ${usesFor}: ${consumptionList.map(c => `${c.name} (${c.qty}${c.unit})`).join(', ')}. Total: ₹${totalConsumptionValue}`,
        is_compound: true,
        entries: [
          { account_name: expenseLedgerName, party: expenseLedgerName, type: 'DR', debit: totalConsumptionValue, credit: 0, amount: totalConsumptionValue },
          { account_name: stockAssetLedger, party: stockAssetLedger, type: 'CR', debit: 0, credit: totalConsumptionValue, amount: totalConsumptionValue }
        ]
      });

      // 4. Trigger Global System Broadcast
      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('storage'));

      setFeedback({ type: 'success', message: '✓ Consumption recorded, inventory deducted & accounting JV posted successfully!' });

      setUsesFor('');
      setConsumptionList([]);

    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', color: '#0f172a' }}>
      
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
            🚜 Multi-Item Fuel & Material Consumption ({activeFY})
          </h2>
          {onClose && (
            <button onClick={onClose} style={{ padding: '6px 10px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
              Close
            </button>
          )}
        </div>

        {feedback && (
          <div style={{ padding: '10px', marginBottom: '12px', borderRadius: '8px', backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 'bold', fontSize: '11px', border: '1px solid #bbf7d0' }}>
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSaveConsumption}>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', color: '#475569' }}>
                Date of Usage *
              </label>
              <input 
                type="date" 
                value={usageDate} 
                onChange={e => setUsageDate(e.target.value)} 
                style={inputStyle} 
                required 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', color: '#475569' }}>
                Uses For / Location *
              </label>
              <input 
                type="text" 
                placeholder="e.g. Chamber-1 / Tractor / GenSet" 
                value={usesFor} 
                onChange={e => setUsesFor(e.target.value)} 
                style={inputStyle} 
                required 
              />
            </div>
          </div>

          <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '10px', marginBottom: '14px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#334155', marginBottom: '8px' }}>
              Select Stock Item & Quantity
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
              <SearchableStockDropdown 
                firm={firm}
                label=""
                value={selectedStockId}
                onChange={val => setSelectedStockId(val)}
                placeholder="-- Search & Choose Fuel/Stock --"
              />

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="Enter Qty" 
                    value={quantity} 
                    onChange={e => setQuantity(e.target.value)} 
                    style={inputStyle} 
                  />
                </div>
                <button 
                  type="button" 
                  onClick={handleAddToList} 
                  style={{ padding: '9px 20px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  + Add Item
                </button>
              </div>
            </div>

            {consumptionList.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                {consumptionList.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }}>
                    <span><strong>{c.name}</strong> - {c.qty} {c.unit} (₹{c.totalCost.toFixed(2)})</span>
                    <button type="button" onClick={() => removeItemFromList(c.id)} style={{ color: '#dc2626', border: 'none', background: 'none', fontWeight: 'bold', cursor: 'pointer' }}>✕ Remove</button>
                  </div>
                ))}
                <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '11px', color: '#059669', marginTop: '4px' }}>
                  Total Consumption Value: ₹{totalConsumptionValue.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            style={{ width: '100%', padding: '12px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
          >
            ⚡ Post Material Consumption & Sync Journal
          </button>

        </form>
      </div>

      {/* Scrollable Consumption History Register */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
          Consumption History Register ({activeFY}) - ({savedRecords.length})
        </h3>

        {savedRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '11px' }}>
            Koi consumption record darj nahi hai.
          </div>
        ) : (
          <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {savedRecords.map(rec => (
              <div key={rec.id} style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', boxSizing: 'border-box' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#0f172a' }}>
                  {rec.date} | Location: {rec.uses_for} {rec.total_value ? `(₹${Number(rec.total_value).toFixed(2)})` : ''}
                </div>
                <div style={{ color: '#64748b' }}>
                  Items: {(rec.items || []).map(i => `${i.name} (${i.qty} ${i.unit})`).join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '11px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#0f172a'
};
