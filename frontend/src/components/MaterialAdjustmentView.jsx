// frontend/src/components/MaterialAdjustmentView.jsx

import React, { useState, useEffect } from 'react';
import { loadFirmData, saveFirmData } from '../utils/firmIsolationEngine';
import { getCurrentActiveFY } from '../utils/financialYearLockEngine';
import { getFirmMasterAccounts, saveMasterAccount } from '../utils/accountMasterEngine.js';
import { saveUniversalVoucher, deleteUniversalVoucher } from '../utils/voucherPostingEngine.js';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';
import SearchableStockDropdown from './SearchableStockDropdown.jsx';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export default function MaterialAdjustmentView({ firm, onClose }) {
  const activeFirmId = firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  const activeFY = getCurrentActiveFY();
  const todayMaxDate = new Date().toISOString().split('T')[0];

  const [editingId, setEditingId] = useState(null);
  const [editingOriginalItem, setEditingOriginalItem] = useState(null);

  const [date, setDate] = useState(todayMaxDate);
  const [targetAccount, setTargetAccount] = useState('');
  const [selectedStockId, setSelectedStockId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [ratePerUnit, setRatePerUnit] = useState('');
  const [itemUnit, setItemUnit] = useState('Liters');
  const [referenceDetail, setReferenceDetail] = useState('');
  const [remarks, setRemarks] = useState('');

  const [accountsList, setAccountsList] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);
  const [recentAdjustments, setRecentAdjustments] = useState([]);
  const [feedback, setFeedback] = useState(null);

  const loadData = () => {
    if (!firm) return;

    // 1. Master Accounts load karein
    const allAccounts = getFirmMasterAccounts(activeFirmId) || [];
    setAccountsList(allAccounts);

    // 2. Firm-scoped Inventory load karein
    const rawStock = loadFirmData('inventory_items', firm, []);
    const validStock = rawStock.filter(i => i && (i.name || i.item_name));
    setInventoryList(validStock);

    // 3. Saved Adjustment logs load karein
    const savedLogs = loadFirmData('universal_material_adjustments', firm, []);
    savedLogs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    setRecentAdjustments(savedLogs);
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

  const handleStockChange = (stockId) => {
    setSelectedStockId(stockId);
    const itemObj = inventoryList.find(i => String(i.id) === String(stockId) || String(i.name || i.item_name) === String(stockId));
    if (itemObj) {
      setItemUnit(itemObj.unit || 'Liters');
      const pRate = parseFloat(
        itemObj.unit_purchase_price || 
        itemObj.purchase_price || 
        itemObj.cost_price || 
        itemObj.unit_valuation || 
        itemObj.rate || 
        0
      );
      if (pRate > 0 && !ratePerUnit) {
        setRatePerUnit(String(pRate));
      }
    }
  };

  const calculatedTotal = round2((Number(quantity) || 0) * (Number(ratePerUnit) || 0));

  // Edit Button Click Handler
  const handleEditInit = (item) => {
    setEditingId(item.id);
    setEditingOriginalItem(item);
    setDate(item.date || todayMaxDate);
    setTargetAccount(item.party || '');
    setReferenceDetail(item.reference || '');
    setQuantity(String(item.quantity || ''));
    setRatePerUnit(String(item.rate || ''));
    setItemUnit(item.unit || 'Liters');
    setRemarks(item.remarks || '');

    // Match stock item by id or name
    const matchedStock = inventoryList.find(i => 
      String(i.id) === String(item.stock_id) || 
      String(i.name || i.item_name || '').trim().toLowerCase() === String(item.item_name || '').trim().toLowerCase()
    );
    if (matchedStock) {
      setSelectedStockId(matchedStock.id);
    } else {
      setSelectedStockId(item.item_name || '');
    }

    setFeedback({
      type: 'info',
      message: `✏️ Editing adjustment for "${item.party}". Details badal kar update karein.`
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingOriginalItem(null);
    setQuantity('');
    setRatePerUnit('');
    setReferenceDetail('');
    setRemarks('');
    setFeedback(null);
  };

  // Delete Adjustment Handler
  const handleDeleteAdjustment = (item) => {
    const isConfirm = window.confirm(`Kya aap "${item.party}" ke liye ki gayi yeh adjustment delete karna chahte hain? Isse stock wapas inventory mein add ho jayega.`);
    if (!isConfirm) return;

    try {
      // 1. Stock wapas inventory mein add (revert) karein
      let currentStock = [...inventoryList];
      const revertQty = parseFloat(item.quantity || 0);

      currentStock = currentStock.map(inv => {
        const isMatch = String(inv.id) === String(item.stock_id) || 
          String(inv.name || inv.item_name || '').trim().toLowerCase() === String(item.item_name || '').trim().toLowerCase();
        if (isMatch) {
          const oldQty = parseFloat(inv.current_stock || inv.stock || 0);
          const restoredQty = round2(oldQty + revertQty);
          return {
            ...inv,
            current_stock: restoredQty,
            stock: restoredQty,
            qty: restoredQty,
            updated_at: new Date().toISOString()
          };
        }
        return inv;
      });

      saveFirmData('inventory_items', firm, currentStock);
      setInventoryList(currentStock);

      // 2. Universal Voucher Delete karein
      try {
        deleteUniversalVoucher(activeFirmId, `JV-${item.id}`);
        deleteUniversalVoucher(activeFirmId, item.id);
      } catch (e) {}

      // 3. Adjustment list se remove karein
      const updatedLogs = recentAdjustments.filter(x => x.id !== item.id);
      saveFirmData('universal_material_adjustments', firm, updatedLogs);
      setRecentAdjustments(updatedLogs);

      // Trigger UI updates
      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('storage'));

      if (editingId === item.id) {
        handleCancelEdit();
      }

      setFeedback({ type: 'success', message: '✓ Adjustment record deleted & stock wapas restore ho gaya.' });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: `Delete failed: ${err.message}` });
    }
  };

  const handlePostAdjustment = (e) => {
    e.preventDefault();
    setFeedback(null);

    const partyName = (
      typeof targetAccount === 'object'
        ? (targetAccount.account_name || targetAccount.name || '')
        : targetAccount || ''
    ).trim();

    if (!partyName) {
      setFeedback({ type: 'error', message: 'Kripya Party / Contractor / Khata chunein!' });
      return;
    }
    if (!selectedStockId) {
      setFeedback({ type: 'error', message: 'Kripya Stock Item chunein!' });
      return;
    }

    const qty = parseFloat(quantity);
    const rate = parseFloat(ratePerUnit);

    if (!qty || qty <= 0) {
      setFeedback({ type: 'error', message: 'Kripya valid Quantity (> 0) darj karein!' });
      return;
    }
    if (!rate || rate <= 0) {
      setFeedback({ type: 'error', message: 'Kripya valid Rate (> 0) darj karein!' });
      return;
    }

    const itemObj = inventoryList.find(i => 
      String(i.id) === String(selectedStockId) || 
      String(i.name || i.item_name || '').trim().toLowerCase() === String(selectedStockId).trim().toLowerCase()
    );

    if (!itemObj) {
      setFeedback({ type: 'error', message: 'Selected stock item inventory me nahi mila!' });
      return;
    }

    // Edit case me stock availability check karne se pehle purani qty consider karein
    let effectiveAvailable = parseFloat(itemObj.current_stock || itemObj.stock || 0);
    if (editingOriginalItem) {
      const origQty = parseFloat(editingOriginalItem.quantity || 0);
      const isSameItem = String(itemObj.id) === String(editingOriginalItem.stock_id) || 
        String(itemObj.name || itemObj.item_name).trim().toLowerCase() === String(editingOriginalItem.item_name).trim().toLowerCase();
      if (isSameItem) {
        effectiveAvailable += origQty;
      }
    }

    if (qty > effectiveAvailable && !itemObj.is_service && itemObj.item_type !== 'SERVICE') {
      setFeedback({ 
        type: 'error', 
        message: `Available stock se zyada quantity nahi nikaal sakte! (Uplabdh: ${effectiveAvailable} ${itemObj.unit || 'Liters'})` 
      });
      return;
    }

    try {
      const recordId = editingId || ('MAT-ADJ-' + Date.now());
      const cleanItemName = (itemObj.name || itemObj.item_name || 'Material').trim();
      const stockAssetAccount = `${cleanItemName} Stock Account`;

      // Master ledger head verify karein
      const masterAccounts = getFirmMasterAccounts(activeFirmId);
      if (!masterAccounts.some(a => (a.account_name || a.name || '').trim().toLowerCase() === stockAssetAccount.toLowerCase())) {
        saveMasterAccount(activeFirmId, {
          account_name: stockAssetAccount,
          primary_type: 'ASSETS',
          type: 'Assets',
          sub_group: 'Raw Material Inventory (कच्चा माल)',
          balance_type: 'Dr'
        });
      }

      // 1. STOCK ADJUSTMENT (Atomic Rollback + New Deduction)
      let updatedStockList = [...inventoryList];

      // Agar edit ho raha hai, pehle purani item ki stock wapas add karein
      if (editingOriginalItem) {
        const origQty = parseFloat(editingOriginalItem.quantity || 0);
        updatedStockList = updatedStockList.map(inv => {
          const isOrig = String(inv.id) === String(editingOriginalItem.stock_id) || 
            String(inv.name || inv.item_name).trim().toLowerCase() === String(editingOriginalItem.item_name).trim().toLowerCase();
          if (isOrig) {
            const cur = parseFloat(inv.current_stock || inv.stock || 0);
            return {
              ...inv,
              current_stock: round2(cur + origQty),
              stock: round2(cur + origQty)
            };
          }
          return inv;
        });
      }

      // Ab nayi quantity minus karein
      updatedStockList = updatedStockList.map(inv => {
        if (String(inv.id) === String(itemObj.id)) {
          const oldStock = parseFloat(inv.current_stock || inv.stock || 0);
          const newStock = round2(Math.max(0, oldStock - qty));
          return {
            ...inv,
            current_stock: newStock,
            stock: newStock,
            qty: newStock,
            unit_purchase_price: rate,
            updated_at: new Date().toISOString()
          };
        }
        return inv;
      });

      saveFirmData('inventory_items', firm, updatedStockList);
      setInventoryList(updatedStockList);

      // 2. DOUBLE-ENTRY JOURNAL VOUCHER POST KAREIN
      const refPart = referenceDetail ? ` | Ref: ${referenceDetail}` : '';
      const remPart = remarks ? ` - ${remarks}` : '';
      const detailedNarration = `Material Issue: ${qty} ${itemObj.unit || 'Units'} ${cleanItemName} @ ₹${rate}${refPart}${remPart}`;

      saveUniversalVoucher(activeFirmId, {
        id: `JV-${recordId}`,
        firm_id: activeFirmId,
        voucher_type: 'JOURNAL',
        type: 'JOURNAL',
        voucher_date: date,
        date: date,
        reference_no: recordId,
        voucher_number: recordId,
        dr_account: partyName,
        cr_account: stockAssetAccount,
        amount: calculatedTotal,
        total_amount: calculatedTotal,
        narration: detailedNarration,
        is_compound: true,
        items: [
          { itemName: cleanItemName, name: cleanItemName, qty, quantity: qty, unit: itemObj.unit || 'Units', rate }
        ],
        entries: [
          { account_name: partyName, party: partyName, type: 'DR', debit: calculatedTotal, credit: 0, amount: calculatedTotal },
          { account_name: stockAssetAccount, party: stockAssetAccount, type: 'CR', debit: 0, credit: calculatedTotal, amount: calculatedTotal }
        ]
      });

      // 3. LOG RECORD SAVE / UPDATE KAREIN
      const newLog = {
        id: recordId,
        date,
        party: partyName,
        reference: referenceDetail,
        stock_id: itemObj.id,
        item_name: cleanItemName,
        quantity: qty,
        unit: itemObj.unit || 'Liters',
        rate,
        total_amount: calculatedTotal,
        remarks
      };

      const filteredLogs = recentAdjustments.filter(x => x.id !== recordId);
      const updatedLogs = [newLog, ...filteredLogs];

      setRecentAdjustments(updatedLogs);
      saveFirmData('universal_material_adjustments', firm, updatedLogs);

      // Reactivity events
      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('storage'));

      setFeedback({
        type: 'success',
        message: editingId
          ? `✓ Adjustment updated! ₹${calculatedTotal.toLocaleString('en-IN')} "${partyName}" ke khate me update ho gaye.`
          : `✓ ${qty} ${itemObj.unit || 'Units'} ${cleanItemName} deduct hua aur ₹${calculatedTotal.toLocaleString('en-IN')} "${partyName}" ke khate me darj ho gaye!`
      });

      handleCancelEdit();
      loadData();

    } catch (err) {
      setFeedback({ type: 'error', message: `Adjustment failed: ${err.message}` });
    }
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: '720px', margin: '0 auto', boxSizing: 'border-box', color: '#0f172a' }}>
      
      {/* Top Banner */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase' }}>
              DIRECT STOCK OUT & LEDGER KNOCK-OFF • {activeFY}
            </div>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
              {editingId ? '✏️ Edit Material Adjustment' : '📦 Material Issue & Adjustment (सामग्री निकासी व कटौती)'}
            </h2>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
              Close
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div style={{
          padding: '10px 14px',
          marginBottom: '14px',
          borderRadius: '8px',
          backgroundColor: feedback.type === 'error' ? '#fef2f2' : feedback.type === 'info' ? '#eff6ff' : '#f0fdf4',
          color: feedback.type === 'error' ? '#991b1b' : feedback.type === 'info' ? '#1e40af' : '#166534',
          fontWeight: 'bold',
          fontSize: '12px',
          border: `1px solid ${feedback.type === 'error' ? '#fecaca' : feedback.type === 'info' ? '#bfdbfe' : '#bbf7d0'}`
        }}>
          {feedback.message}
        </div>
      )}

      {/* Main Entry Form */}
      <form onSubmit={handlePostAdjustment} style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Date of Issue *</label>
            <input 
              type="date" 
              max={todayMaxDate}
              value={date} 
              onChange={e => setDate(e.target.value)} 
              style={inputStyle} 
              required 
            />
          </div>
          <div>
            <label style={labelStyle}>Vehicle No / Reference Slip</label>
            <input 
              type="text" 
              placeholder="e.g. RJ-31-R-4512 / Slip #42" 
              value={referenceDetail} 
              onChange={e => setReferenceDetail(e.target.value)} 
              style={inputStyle} 
            />
          </div>
        </div>

        <div>
          <SearchableAccountDropdown
            label="Party / Contractor / Expense Khata (Dr - नामे) *"
            accounts={accountsList}
            value={targetAccount}
            onChange={val => setTargetAccount(val)}
            placeholder="Search Driver, Contractor, Party or Expense ledger..."
            colorAccent="#dc2626"
            required={true}
          />
        </div>

        <div>
          <SearchableStockDropdown
            firm={firm}
            label="Stock Item to Issue (-Stock OUT) *"
            value={selectedStockId}
            onChange={handleStockChange}
            placeholder="-- Material chunein (Diesel, Mitti, Koyla, Eent) --"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Quantity ({itemUnit}) *</label>
            <input 
              type="number" 
              step="0.01" 
              placeholder={`Qty darj karein (${itemUnit})`} 
              value={quantity} 
              onChange={e => setQuantity(e.target.value)} 
              style={inputStyle} 
              required 
            />
          </div>
          <div>
            <label style={labelStyle}>Rate per {itemUnit} (₹) *</label>
            <input 
              type="number" 
              step="0.01" 
              placeholder="Rate" 
              value={ratePerUnit} 
              onChange={e => setRatePerUnit(e.target.value)} 
              style={inputStyle} 
              required 
            />
          </div>
        </div>

        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#92400e' }}>
            Khate Me Se Katoti / Adjustment Amount (Dr):
          </span>
          <span style={{ fontSize: '16px', fontWeight: '900', color: '#b45309' }}>
            ₹{calculatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div>
          <label style={labelStyle}>Narration / Purpose</label>
          <input 
            type="text" 
            placeholder="e.g. Kiraya adjustment / Land development bharti" 
            value={remarks} 
            onChange={e => setRemarks(e.target.value)} 
            style={inputStyle} 
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="submit" 
            style={{ 
              flex: 1,
              backgroundColor: editingId ? '#0284c7' : '#0f172a', 
              color: '#ffffff', 
              border: 'none', 
              padding: '12px', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              fontSize: '12px', 
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            {editingId ? '✓ Update Material Adjustment' : '⚡ Deduct Stock & Adjust in Selected Khata'}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                padding: '12px 16px',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          )}
        </div>

      </form>

      {/* Adjustments History Register with Edit & Delete */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
          📋 Recent Material Deductions & Adjustments ({recentAdjustments.length})
        </h3>

        {recentAdjustments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '11px' }}>
            Abhi koi material deduction record nahi hai.
          </div>
        ) : (
          <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentAdjustments.map((item) => {
              const isSelected = editingId === item.id;
              return (
                <div 
                  key={item.id} 
                  style={{ 
                    padding: '12px', 
                    backgroundColor: isSelected ? '#eff6ff' : '#f8fafc', 
                    borderRadius: '8px', 
                    border: `1px solid ${isSelected ? '#0284c7' : '#e2e8f0'}`, 
                    fontSize: '11px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    boxSizing: 'border-box'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#0f172a' }}>
                      {item.date} | <span style={{ color: '#dc2626' }}>{item.party}</span> {item.reference ? `(${item.reference})` : ''}
                    </div>
                    <div style={{ color: '#475569', marginTop: '3px' }}>
                      📦 {item.item_name}: <strong>{item.quantity} {item.unit}</strong> @ ₹{item.rate}
                    </div>
                    {item.remarks && (
                      <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
                        Note: {item.remarks}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <div style={{ fontWeight: '900', color: '#b45309', fontSize: '14px' }}>
                      ₹{Number(item.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => handleEditInit(item)}
                        style={{
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAdjustment(item)}
                        style={{
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' };
const inputStyle = { width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#0f172a', outline: 'none' };
