// frontend/src/components/MaterialConsumptionView.jsx

import React, { useState, useEffect } from 'react';
import { getStockItemsByFirm, recordStockConsumption } from '../utils/stockInventoryEngine.js';
import { getExpenseAccountHeads } from '../utils/accountMasterEngine.js';

export default function MaterialConsumptionView({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';

  const [stockList, setStockList] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  
  const [selectedItem, setSelectedItem] = useState('Diesel');
  const [availableStock, setAvailableStock] = useState(0);
  const [itemUnit, setItemUnit] = useState('Ltr');
  const [itemRate, setItemRate] = useState(0);
  
  const [quantity, setQuantity] = useState('');
  const [machineryRef, setMachineryRef] = useState('Tractor No. 1');
  const [expenseHead, setExpenseHead] = useState('Tractor Fuel & Running Expense');
  const [isCustomExpense, setIsCustomExpense] = useState(false);
  const [customExpenseName, setCustomExpenseName] = useState('');

  const [consumptionDate, setConsumptionDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState(null);

  const loadData = () => {
    // 1. Load Stocks
    const items = getStockItemsByFirm(activeFirmId);
    setStockList(items);

    if (items.length > 0) {
      const target = items.find(i => i.item_name.toLowerCase().includes('diesel')) || items[0];
      setSelectedItem(target.item_name);
      setAvailableStock(parseFloat(target.current_stock || 0));
      setItemUnit(target.unit || 'Ltr');
      setItemRate(parseFloat(target.unit_purchase_price || target.purchase_rate || 0));
    }

    // 2. Load Expense Accounts from Chart of Accounts
    const expenses = getExpenseAccountHeads(activeFirmId);
    setExpenseAccounts(expenses);
    if (expenses.length > 0) {
      setExpenseHead(expenses[0].account_name);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('stock_updated', loadData);
    window.addEventListener('app_state_updated', loadData);
    return () => {
      window.removeEventListener('stock_updated', loadData);
      window.removeEventListener('app_state_updated', loadData);
    };
  }, [activeFirmId]);

  const handleItemChange = (name) => {
    setSelectedItem(name);
    const item = stockList.find(i => i.item_name === name);
    if (item) {
      setAvailableStock(parseFloat(item.current_stock || 0));
      setItemUnit(item.unit || 'Ltr');
      setItemRate(parseFloat(item.unit_purchase_price || item.purchase_rate || 0));

      // Intelligent mapping to standard expense heads
      if (name.toLowerCase().includes('diesel') || name.toLowerCase().includes('fuel')) {
        const tractorAcc = expenseAccounts.find(a => a.account_name.toLowerCase().includes('tractor') || a.account_name.toLowerCase().includes('fuel'));
        if (tractorAcc) setExpenseHead(tractorAcc.account_name);
      } else if (name.toLowerCase().includes('coal') || name.toLowerCase().includes('husk')) {
        const kilnAcc = expenseAccounts.find(a => a.account_name.toLowerCase().includes('kiln') || a.account_name.toLowerCase().includes('burning'));
        if (kilnAcc) setExpenseHead(kilnAcc.account_name);
      }
    }
  };

  const handleExpenseDropdownChange = (val) => {
    if (val === 'ADD_CUSTOM_EXPENSE') {
      setIsCustomExpense(true);
      setCustomExpenseName('');
    } else {
      setIsCustomExpense(false);
      setExpenseHead(val);
    }
  };

  const calculatedCost = (parseFloat(quantity || 0) * itemRate).toFixed(2);

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus(null);

    const finalExpenseAccount = isCustomExpense ? customExpenseName.trim() : expenseHead.trim();
    if (!finalExpenseAccount) {
      setStatus({ type: 'error', text: 'Expense account select ya enter karein.' });
      return;
    }

    try {
      const res = recordStockConsumption(activeFirmId, {
        item_name: selectedItem,
        quantity: quantity,
        consumption_date: consumptionDate,
        expense_head: finalExpenseAccount,
        machinery_ref: machineryRef,
        remarks: remarks
      });

      setStatus({
        type: 'success',
        text: `✓ Success! ${res.quantity_consumed} ${res.unit} ${res.item_name} consumed.\n• Remaining Stock: ${res.remaining_stock.toFixed(2)} ${res.unit}\n• Debited to: ${finalExpenseAccount}\n• P&L Impact: ₹${res.total_expense.toFixed(2)}`
      });

      setQuantity('');
      setRemarks('');
      if (isCustomExpense) setIsCustomExpense(false);
      loadData();
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '30px' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🚜</span> Fuel & Material Internal Consumption
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Automatic Stock Deduction & Expense Voucher Generator</span>
        </div>

        {/* Live Stock Meter */}
        <div style={{ backgroundColor: availableStock > 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${availableStock > 0 ? '#bbf7d0' : '#fecaca'}`, padding: '6px 12px', borderRadius: '8px', textAlign: 'right' }}>
          <span style={{ fontSize: '10px', color: availableStock > 0 ? '#166534' : '#991b1b', fontWeight: 'bold', display: 'block' }}>
            AVAILABLE {selectedItem.toUpperCase()}
          </span>
          <strong style={{ fontSize: '14px', color: availableStock > 0 ? '#15803d' : '#dc2626' }}>
            {availableStock.toFixed(2)} {itemUnit}
          </strong>
        </div>
      </div>

      {status && (
        <div style={{
          backgroundColor: status.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${status.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: status.type === 'success' ? '#065f46' : '#b91c1c',
          padding: '12px 16px',
          borderRadius: '10px',
          fontSize: '12px',
          fontWeight: 'bold',
          whiteSpace: 'pre-line'
        }}>
          {status.text}
        </div>
      )}

      {/* Main Entry Form */}
      <form onSubmit={handleSubmit} style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', display: 'grid', gap: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Date of Usage *</label>
            <input 
              type="date" 
              value={consumptionDate} 
              onChange={e => setConsumptionDate(e.target.value)} 
              style={inputStyle} 
              required 
            />
          </div>

          <div>
            <label style={labelStyle}>Select Stock Item to Consume *</label>
            <select 
              value={selectedItem} 
              onChange={e => handleItemChange(e.target.value)} 
              style={{ ...inputStyle, fontWeight: 'bold' }} 
              required
            >
              {stockList.map(i => (
                <option key={i.id} value={i.item_name}>
                  {i.item_name} (Avail: {i.current_stock} {i.unit})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Quantity Consumed ({itemUnit}) *</label>
            <input 
              type="number" 
              step="0.01" 
              placeholder={`e.g. 25 ${itemUnit}`} 
              value={quantity} 
              onChange={e => setQuantity(e.target.value)} 
              style={{ ...inputStyle, fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }} 
              required 
            />
          </div>

          <div>
            <label style={labelStyle}>Used In / Vehicle Ref *</label>
            <input 
              type="text" 
              placeholder="e.g. Tractor RJ-13 / JCB / Generator" 
              value={machineryRef} 
              onChange={e => setMachineryRef(e.target.value)} 
              style={inputStyle} 
              required 
            />
          </div>
        </div>

        {/* Real-Time Cost Preview */}
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <span>Estimated Cost Valuation (@ ₹{itemRate.toFixed(2)}/{itemUnit}):</span>
          <strong style={{ fontSize: '14px', color: '#0f172a' }}>₹{calculatedCost}</strong>
        </div>

        {/* 2. DEBIT EXPENSE LEDGER (DYNAMIC DROPDOWN LIST) */}
        <div>
          <label style={labelStyle}>Debit Expense Ledger (P&L Kharch Khata) *</label>
          {!isCustomExpense ? (
            <select
              value={expenseHead}
              onChange={e => handleExpenseDropdownChange(e.target.value)}
              style={{ ...inputStyle, fontWeight: 'bold' }}
              required
            >
              {expenseAccounts.map(acc => (
                <option key={acc.id} value={acc.account_name}>
                  {acc.account_name} ({acc.sub_group || 'Expense'})
                </option>
              ))}
              <option value="ADD_CUSTOM_EXPENSE">➕ + Type New Expense Ledger...</option>
            </select>
          ) : (
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="Enter new expense account name..."
                value={customExpenseName}
                onChange={e => setCustomExpenseName(e.target.value)}
                style={{ ...inputStyle, fontWeight: 'bold' }}
                required
              />
              <button
                type="button"
                onClick={() => setIsCustomExpense(false)}
                style={{ backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', padding: '0 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                List
              </button>
            </div>
          )}
        </div>

        <div>
          <label style={labelStyle}>Remarks / Operational Notes (Optional)</label>
          <input 
            type="text" 
            placeholder="e.g. Mitti khudai & kachi eent transport" 
            value={remarks} 
            onChange={e => setRemarks(e.target.value)} 
            style={inputStyle} 
          />
        </div>

        <button 
          type="submit" 
          style={{ 
            backgroundColor: '#0284c7', 
            color: '#ffffff', 
            border: 'none', 
            padding: '13px', 
            borderRadius: '8px', 
            fontSize: '13px', 
            fontWeight: 'bold', 
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
          }}
        >
          ⚡ Deduct Stock & Post Expense
        </button>

      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#0f172a' };
