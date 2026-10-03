// frontend/src/components/MaterialAdjustmentView.jsx

import React, { useState, useEffect } from 'react';
import { loadFirmData, saveFirmData } from '../utils/firmIsolationEngine';
import { getCurrentActiveFY } from '../utils/financialYearLockEngine';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import { saveUniversalVoucher } from '../utils/voucherPostingEngine.js';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';
import SearchableStockDropdown from './SearchableStockDropdown.jsx';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export default function MaterialAdjustmentView({ firm, onClose }) {
  const activeFirmId = firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  const activeFY = getCurrentActiveFY();
  const todayMaxDate = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(todayMaxDate);
  const [targetAccount, setTargetAccount] = useState('');
  const [selectedStockId, setSelectedStockId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [ratePerUnit, setRatePerUnit] = useState('');
  const [itemUnit, setItemUnit] = useState('Units');
  const [referenceDetail, setReferenceDetail] = useState('');
  const [remarks, setRemarks] = useState('');

  const [accountsList, setAccountsList] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);
  const [recentAdjustments, setRecentAdjustments] = useState([]);
  const [feedback, setFeedback] = useState(null);

  const loadData = () => {
    if (!firm) return;

    // 1. Load All Master Accounts (Drivers, Thekedars, Suppliers, Expense Heads)
    const allAccounts = getFirmMasterAccounts(activeFirmId) || [];
    setAccountsList(allAccounts);

    // 2. Load Inventory (Raw Material, Fuel, Finished Goods)
    const rawStock = loadFirmData('inventory_items', firm, []);
    const validStock = rawStock.filter(i => i && (i.name || i.item_name));
    setInventoryList(validStock);

    // 3. Load Adjustment History Logs
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

  // Stock Item change hone par rate aur unit auto-detect karein
  const handleStockChange = (stockId) => {
    setSelectedStockId(stockId);
    const itemObj = inventoryList.find(i => String(i.id) === String(stockId));
    if (itemObj) {
      setItemUnit(itemObj.unit || 'Units');
      const pRate = parseFloat(
        itemObj.unit_purchase_price || 
        itemObj.purchase_price || 
        itemObj.cost_price || 
        itemObj.unit_valuation || 
        itemObj.rate || 
        0
      );
      if (pRate > 0) {
        setRatePerUnit(String(pRate));
      }
    }
  };

  const calculatedTotal = round2((Number(quantity) || 0) * (Number(ratePerUnit) || 0));

  const handlePostAdjustment = (e) => {
    e.preventDefault();
    setFeedback(null);

    const partyName = (
      typeof targetAccount === 'object'
        ? (targetAccount.account_name || targetAccount.name || '')
        : targetAccount || ''
    ).trim();

    if (!partyName) {
      setFeedback({ type: 'error', message: 'Kripya Party / Contractor / Ledger Account chunein!' });
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

    const itemObj = inventoryList.find(i => String(i.id) === String(selectedStockId));
    if (!itemObj) {
      setFeedback({ type: 'error', message: 'Selected stock item inventory me nahi mila!' });
      return;
    }

    const currentAvail = parseFloat(itemObj.current_stock || itemObj.stock || 0);
    if (qty > currentAvail && !itemObj.is_service && itemObj.item_type !== 'SERVICE') {
      setFeedback({ 
        type: 'error', 
        message: `Available stock se zyada quantity nahi nikaal sakte! (Uplabdh Stock: ${currentAvail} ${itemObj.unit || 'Units'})` 
      });
      return;
    }

    try {
      const recordId = 'MAT-ADJ-' + Date.now();
      const cleanItemName = (itemObj.name || itemObj.item_name || 'Material').trim();
      const stockAssetAccount = `${cleanItemName} Stock Account`;

      // 1. DEDUCT PHYSICAL STOCK ITEM FROM INVENTORY
      const updatedStockList = inventoryList.map(inv => {
        if (String(inv.id) === String(selectedStockId)) {
          const oldStock = parseFloat(inv.current_stock || inv.stock || 0);
          const newStock = round2(Math.max(0, oldStock - qty));
          return {
            ...inv,
            current_stock: newStock,
            stock: newStock,
            qty: newStock,
            updated_at: new Date().toISOString()
          };
        }
        return inv;
      });

      saveFirmData('inventory_items', firm, updatedStockList);
      setInventoryList(updatedStockList);

      // 2. POST IND AS BALANCED JOURNAL VOUCHER (JV)
      // DR: Party / Expense Account (Katoti ya Direct kharcha)
      // CR: Stock Account (Inventory asset out)
      const narrationText = `Material Issue: ${qty} ${itemObj.unit || 'Units'} ${cleanItemName} @ ₹${rate} for ${referenceDetail || partyName} | Ledger adjusted - ${remarks || 'Internal Issue'}`;

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
        narration: narrationText,
        is_compound: true,
        entries: [
          { account_name: partyName, party: partyName, type: 'DR', debit: calculatedTotal, credit: 0, amount: calculatedTotal },
          { account_name: stockAssetAccount, party: stockAssetAccount, type: 'CR', debit: 0, credit: calculatedTotal, amount: calculatedTotal }
        ]
      });

      // 3. SAVE TO LOCAL HISTORY LOGS
      const newLog = {
        id: recordId,
        date,
        party: partyName,
        reference: referenceDetail,
        item_name: cleanItemName,
        quantity: qty,
        unit: itemObj.unit || 'Units',
        rate,
        total_amount: calculatedTotal,
        remarks
      };

      const updatedLogs = [newLog, ...recentAdjustments];
      setRecentAdjustments(updatedLogs);
      saveFirmData('universal_material_adjustments', firm, updatedLogs);

      // Trigger instant UI re-render across the entire app
      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('storage'));

      setFeedback({
        type: 'success',
        message: `✓ ${qty} ${itemObj.unit || 'Units'} ${cleanItemName} stock se minus hua aur ₹${calculatedTotal.toLocaleString('en-IN')} "${partyName}" ke khate me adjust ho gaye!`
      });

      // Reset form fields
      setQuantity('');
      setReferenceDetail('');
      setRemarks('');
      loadData();

    } catch (err) {
      setFeedback({ type: 'error', message: `Adjustment failed: ${err.message}` });
    }
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: '720px', margin: '0 auto', boxSizing: 'border-box', color: '#0f172a' }}>
      
      {/* Header Banner */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#d97706', fontWeight: '800', textTransform: 'uppercase' }}>
              DIRECT STOCK OUT & LEDGER KNOCK-OFF • {activeFY}
            </div>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
              📦 Material Issue & Ledger Adjustment (सामग्री निकासी व कटौती)
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
          backgroundColor: feedback.type === 'error' ? '#fef2f2' : '#f0fdf4',
          color: feedback.type === 'error' ? '#991b1b' : '#166534',
          fontWeight: 'bold',
          fontSize: '12px',
          border: `1px solid ${feedback.type === 'error' ? '#fecaca' : '#bbf7d0'}`
        }}>
          {feedback.message}
        </div>
      )}

      {/* Main Adjustment Form */}
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

        {/* Target Party or Expense Account Dropdown */}
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

        {/* Stock Item Selection */}
        <div>
          <SearchableStockDropdown
            firm={firm}
            label="Stock Item to Issue (-Stock OUT) *"
            value={selectedStockId}
            onChange={handleStockChange}
            placeholder="-- Choose Material (Diesel, Mitti, Coal, Eent, etc.) --"
          />
        </div>

        {/* Qty & Rate */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Quantity ({itemUnit}) *</label>
            <input 
              type="number" 
              step="0.01" 
              placeholder={`Enter Qty in ${itemUnit}`} 
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

        {/* Total Cost Box */}
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
            placeholder="e.g. Kiraya adjustment / internal site work" 
            value={remarks} 
            onChange={e => setRemarks(e.target.value)} 
            style={inputStyle} 
          />
        </div>

        <button 
          type="submit" 
          style={{ 
            backgroundColor: '#0f172a', 
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
          ⚡ Deduct Stock & Adjust in Selected Khata
        </button>

      </form>

      {/* Recent Adjustments Register */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
          📋 Recent Material Deductions & Adjustments ({recentAdjustments.length})
        </h3>

        {recentAdjustments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '11px' }}>
            No recent material adjustments recorded yet.
          </div>
        ) : (
          <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentAdjustments.map((item) => (
              <div key={item.id} style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#0f172a' }}>
                    {item.date} | <span style={{ color: '#dc2626' }}>{item.party}</span> {item.reference ? `(${item.reference})` : ''}
                  </div>
                  <div style={{ color: '#64748b', marginTop: '2px' }}>
                    📦 {item.item_name}: {item.quantity} {item.unit} @ ₹{item.rate} | {item.remarks || 'Adjustment'}
                  </div>
                </div>
                <div style={{ fontWeight: '900', color: '#b45309', fontSize: '13px' }}>
                  ₹{Number(item.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' };
const inputStyle = { width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#0f172a', outline: 'none' };
