// frontend/src/components/MaterialConsumptionView.jsx

import React, { useState, useEffect } from 'react';
import { loadFirmData, saveFirmData } from '../utils/firmIsolationEngine';
import { getCurrentActiveFY } from '../utils/financialYearLockEngine';
import { saveUniversalVoucher } from '../utils/voucherPostingEngine';
import { getFirmMasterAccounts, saveMasterAccount } from '../utils/accountMasterEngine';
import SearchableStockDropdown from './SearchableStockDropdown';
import SearchableAccountDropdown from './SearchableAccountDropdown';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export default function MaterialConsumptionView({ firm, onClose }) {
  const activeFY = getCurrentActiveFY();
  const activeFirmId = firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';

  const [usageDate, setUsageDate] = useState(new Date().toISOString().slice(0, 10));
  const [usesFor, setUsesFor] = useState('');
  
  // Dynamic Expense Account State (Default to Land Development or Factory Expense)
  const [expenseLedger, setExpenseLedger] = useState('Land Development (Land development)');
  const [accountsList, setAccountsList] = useState([]);

  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedStockId, setSelectedStockId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [consumptionList, setConsumptionList] = useState([]);
  
  const [savedRecords, setSavedRecords] = useState([]);
  const [feedback, setFeedback] = useState(null);

  const loadData = () => {
    if (!firm) return;
    
    // 1. Load Inventory Items
    const rawInventory = loadFirmData('inventory_items', firm, []);
    const validInventory = rawInventory.filter(i => i && (i.name || i.item_name));
    setInventoryItems(validInventory);

    // 2. Load Master Accounts for Expense/Purpose selection
    const masterAccs = getFirmMasterAccounts(activeFirmId) || [];
    setAccountsList(masterAccs);

    // Set smart default if Land Development exists
    const landDevAccount = masterAccs.find(a => 
      (a.account_name || a.name || '').toLowerCase().includes('land development')
    );
    if (landDevAccount && !expenseLedger) {
      setExpenseLedger(landDevAccount.account_name || landDevAccount.name);
    }

    // 3. Load Saved Consumption Records
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

    // Complete multi-key rate fallback resolution
    const rateVal = parseFloat(
      itemObj.unit_purchase_price || 
      itemObj.purchase_price || 
      itemObj.cost_price || 
      itemObj.unit_valuation || 
      itemObj.rate || 
      0
    );
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

    const targetExpenseLedger = (
      typeof expenseLedger === 'object' 
        ? (expenseLedger.account_name || expenseLedger.name || '') 
        : expenseLedger || ''
    ).trim();

    if (!targetExpenseLedger) return alert('Kripya Debit Expense Account (e.g. Land Development) chunein!');
    if (!usesFor) return alert('Kripya usage purpose/location darj karein (e.g. Land Development Bharti).');
    if (consumptionList.length === 0) return alert('Kam se kam ek item consumption list me jodein.');

    try {
      const recordId = 'CONS-' + Date.now();

      // STEP 1: DEDUCT PHYSICAL STOCK FROM INVENTORY
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

      // STEP 2: SAVE CONSUMPTION HISTORY RECORD
      const newRecord = {
        id: recordId,
        fiscal_year: activeFY,
        date: usageDate,
        uses_for: usesFor,
        expense_account: targetExpenseLedger,
        items: consumptionList,
        total_value: totalConsumptionValue,
        created_at: new Date().toISOString()
      };

      const updatedRecords = [newRecord, ...savedRecords];
      setSavedRecords(updatedRecords);
      saveFirmData('material_consumption_records', firm, updatedRecords);

      // STEP 3: ENSURE STATUTORY MASTER ACCOUNTS EXIST
      const masterAccounts = getFirmMasterAccounts(activeFirmId);
      
      // Ensure Debit Account exists
      if (!masterAccounts.some(a => (a.account_name || a.name || '').trim().toLowerCase() === targetExpenseLedger.toLowerCase())) {
        saveMasterAccount(activeFirmId, {
          account_name: targetExpenseLedger,
          primary_type: 'EXPENSES',
          type: 'Expenses',
          sub_group: 'Direct Production & Site Development Expenses',
          balance_type: 'Dr'
        });
      }

      // Determine stock asset head to credit
      const itemNames = consumptionList.map(c => c.name).join(', ');
      const isFuel = consumptionList.some(c => c.name.toLowerCase().includes('diesel') || c.name.toLowerCase().includes('fuel'));
      const stockAssetLedger = isFuel 
        ? 'Consumables & Fuel Stock' 
        : `${consumptionList[0]?.name || 'Raw Material'} Stock Account`;

      if (!masterAccounts.some(a => (a.account_name || a.name || '').trim().toLowerCase() === stockAssetLedger.toLowerCase())) {
        saveMasterAccount(activeFirmId, {
          account_name: stockAssetLedger,
          primary_type: 'ASSETS',
          type: 'Assets',
          sub_group: 'Raw Material Inventory (कच्चा माल)',
          balance_type: 'Dr'
        });
      }

      // STEP 4: POST DOUBLE-ENTRY JOURNAL VOUCHER (JV)
      // DR: Land Development (Land development) Expense
      // CR: Mitti Stock Account (Asset/Inventory)
      saveUniversalVoucher(activeFirmId, {
        id: `JV-${recordId}`,
        firm_id: activeFirmId,
        voucher_type: 'JOURNAL',
        type: 'JOURNAL',
        voucher_date: usageDate,
        date: usageDate,
        reference_no: recordId,
        dr_account: targetExpenseLedger,
        cr_account: stockAssetLedger,
        amount: totalConsumptionValue,
        total_amount: totalConsumptionValue,
        narration: `Consumed ${itemNames} for ${usesFor}. Debited to ${targetExpenseLedger} & Stock Deducted. Total: ₹${totalConsumptionValue}`,
        is_compound: true,
        entries: [
          { account_name: targetExpenseLedger, party: targetExpenseLedger, type: 'DR', debit: totalConsumptionValue, credit: 0, amount: totalConsumptionValue },
          { account_name: stockAssetLedger, party: stockAssetLedger, type: 'CR', debit: 0, credit: totalConsumptionValue, amount: totalConsumptionValue }
        ]
      });

      // Broadcast reactivity across all open views
      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('storage'));

      setFeedback({ 
        type: 'success', 
        message: `✓ Mitti stock deducted & ₹${totalConsumptionValue.toLocaleString('en-IN')} successfully debited to "${targetExpenseLedger}"!` 
      });

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
          <div>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
              🚜 Fuel & Material Consumption / Bharti Work ({activeFY})
            </h2>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Stock item minus karein aur kharcha seedhe expense khate me transfer karein</span>
          </div>
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
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div>
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
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', color: '#475569' }}>
                Uses For / Location *
              </label>
              <input 
                type="text" 
                placeholder="e.g. Land Development Bharti / Site Filling" 
                value={usesFor} 
                onChange={e => setUsesFor(e.target.value)} 
                style={inputStyle} 
                required 
              />
            </div>
          </div>

          {/* DYNAMIC EXPENSE/PURPOSE ACCOUNT (e.g. Land Development) */}
          <div style={{ marginBottom: '12px' }}>
            <SearchableAccountDropdown
              label="Debit Expense Account (खर्चे का खाता) *"
              accounts={accountsList}
              value={expenseLedger}
              onChange={val => setExpenseLedger(val)}
              placeholder="-- Select Expense Head (e.g. Land Development) --"
              colorAccent="#0284c7"
              required={true}
            />
          </div>

          <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '10px', marginBottom: '14px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#334155', marginBottom: '8px' }}>
              Select Stock Item (Mitti/Fuel/Coal) & Quantity
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
              <SearchableStockDropdown 
                firm={firm}
                label=""
                value={selectedStockId}
                onChange={val => setSelectedStockId(val)}
                placeholder="-- Search & Choose Mitti / Stock Item --"
              />

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="Enter Qty (Quintal/Trolly)" 
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
                    <span><strong>{c.name}</strong> - {c.qty} {c.unit} (@ ₹{c.rate}/unit = ₹{c.totalCost.toFixed(2)})</span>
                    <button type="button" onClick={() => removeItemFromList(c.id)} style={{ color: '#dc2626', border: 'none', background: 'none', fontWeight: 'bold', cursor: 'pointer' }}>✕ Remove</button>
                  </div>
                ))}
                <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '11px', color: '#059669', marginTop: '4px' }}>
                  Total Khapat Cost: ₹{totalConsumptionValue.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            style={{ width: '100%', padding: '12px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
          >
            ⚡ Deduct Mitti Stock & Debit to {typeof expenseLedger === 'object' ? (expenseLedger.account_name || 'Land Development') : (expenseLedger || 'Land Development')}
          </button>

        </form>
      </div>

      {/* Consumption History Register */}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong style={{ color: '#0f172a' }}>{rec.date} | Location: {rec.uses_for}</strong>
                  <span style={{ color: '#059669', fontWeight: 'bold' }}>₹{Number(rec.total_value || 0).toFixed(2)}</span>
                </div>
                <div style={{ color: '#0284c7', fontWeight: '600', marginBottom: '2px' }}>
                  Debited to: {rec.expense_account || 'Land Development'}
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
