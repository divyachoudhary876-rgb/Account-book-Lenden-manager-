// frontend/src/components/MaterialConsumptionView.jsx

import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';

export default function MaterialConsumptionView({ firm, selectedFY }) {
  const firmId = firm?.id || 'FIRM-001';
  const storageKey = `fuel_consumption_${firmId}_${selectedFY}`;
  const stockStorageKey = `trading_catalog_${firmId}_${selectedFY}`;
  const accountsStorageKey = `account_heads_${firmId}`; // Firm-wide common account heads
  const voucherStorageKey = `account_book_vouchers_${firmId}`;

  const [consumptions, setConsumptions] = useState([]);
  const [usageDate, setUsageDate] = useState(new Date().toISOString().split('T')[0]);
  const [usesFor, setUsesFor] = useState('');

  const [stockItems, setStockItems] = useState([]);
  const [expenseAccountsList, setExpenseAccountsList] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [qty, setQty] = useState('');
  const [expenseAccount, setExpenseAccount] = useState('');
  const [cartItems, setCartItems] = useState([]);

  const loadData = () => {
    try {
      const saved = StorageService.getItem ? StorageService.getItem(storageKey) : JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(saved)) setConsumptions(saved);

      // Fallback inventory loading across possible keys
      let catalog = StorageService.getItem ? StorageService.getItem(stockStorageKey) : JSON.parse(localStorage.getItem(stockStorageKey) || '[]');
      if (!catalog || catalog.length === 0) {
        catalog = JSON.parse(localStorage.getItem(`trading_catalog_${firmId}`) || localStorage.getItem('inventory_items') || '[]');
      }
      if (Array.isArray(catalog)) setStockItems(catalog);

      let accounts = StorageService.getItem ? StorageService.getItem(accountsStorageKey) : JSON.parse(localStorage.getItem(accountsStorageKey) || '[]');
      if (!accounts || accounts.length === 0) {
        accounts = JSON.parse(localStorage.getItem(`account_heads_${firmId}`) || localStorage.getItem('app_account_heads') || '[]');
      }
      if (Array.isArray(accounts)) setExpenseAccountsList(accounts);
    } catch (e) {
      console.error("Error loading consumption data:", e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_storage_updated', loadData);
    window.addEventListener('app_state_updated', loadData);
    return () => {
      window.removeEventListener('app_storage_updated', loadData);
      window.removeEventListener('app_state_updated', loadData);
    };
  }, [storageKey, stockStorageKey, accountsStorageKey, firmId]);

  const handleAddToCart = () => {
    if (!selectedItem || !qty || Number(qty) <= 0 || !expenseAccount) {
      alert("Kripya inventory item, quantity aur debit expense account teeno chunein!");
      return;
    }

    const itemObj = stockItems.find(i => String(i.id) === String(selectedItem) || String(i.itemName || i.name) === String(selectedItem));
    const itemName = itemObj ? (itemObj.itemName || itemObj.name) : selectedItem;
    const unitCost = Number(itemObj?.purchasePrice || itemObj?.unit_purchase_price || itemObj?.rate || 0);

    const accObj = expenseAccountsList.find(a => String(a.id) === String(expenseAccount) || String(a.name || a.account_name) === String(expenseAccount));
    const accountName = accObj ? (accObj.name || accObj.account_name) : expenseAccount;

    const newCartItem = {
      id: 'CART-' + Date.now(),
      itemId: itemObj?.id || selectedItem,
      itemName,
      qty: Number(qty) || 0,
      unitCost,
      totalCost: (Number(qty) || 0) * unitCost,
      expenseAccount: accountName
    };

    setCartItems([...cartItems, newCartItem]);
    setSelectedItem('');
    setQty('');
  };

  const handleRemoveCartItem = (id) => {
    setCartItems(cartItems.filter(c => c.id !== id));
  };

  const handlePostConsumptions = (e) => {
    e.preventDefault();
    if (!usesFor || cartItems.length === 0) {
      alert("Kripya 'Uses For' (Kaha use hua h) bharein aur cart me items jodein!");
      return;
    }

    const recordId = 'CONS-' + Date.now();
    const record = {
      id: recordId,
      usageDate,
      usesFor,
      items: cartItems,
      selectedFY
    };

    try {
      // 1. Deduct Stock from Inventory Catalog
      let currentCatalog = [...stockItems];
      cartItems.forEach(c => {
        const idx = currentCatalog.findIndex(i => String(i.id) === String(c.itemId) || String(i.itemName || i.name).toLowerCase() === String(c.itemName).toLowerCase());
        if (idx !== -1) {
          const curStock = Number(currentCatalog[idx].stockQty ?? currentCatalog[idx].current_stock ?? currentCatalog[idx].stock ?? currentCatalog[idx].qty ?? 0);
          const newStock = Math.max(0, curStock - Number(c.qty));
          currentCatalog[idx] = {
            ...currentCatalog[idx],
            stockQty: newStock,
            current_stock: newStock,
            stock: newStock,
            qty: newStock
          };
        }
      });
      StorageService.setItem(stockStorageKey, currentCatalog);
      StorageService.setItem('inventory_items', currentCatalog);

      // 2. Post Double-Entry Journal Voucher (JV)
      const totalConsumptionValue = cartItems.reduce((sum, c) => sum + c.totalCost, 0);
      const voucherEntries = cartItems.map(c => ({
        account_name: c.expenseAccount,
        type: 'DR',
        amount: c.totalCost > 0 ? c.totalCost : 1 // Fallback amount if unitCost was 0
      }));

      const newVoucher = {
        id: 'JV-CONS-' + Date.now(),
        voucher_type: 'JOURNAL',
        voucher_date: usageDate,
        reference_no: 'CONS-' + Math.floor(1000 + Math.random() * 9000),
        firm_id: firmId,
        selectedFY: selectedFY,
        narration: `Material/Fuel Consumption for ${usesFor}`,
        amount: totalConsumptionValue > 0 ? totalConsumptionValue : 0,
        total_amount: totalConsumptionValue > 0 ? totalConsumptionValue : 0,
        entries: [
          ...voucherEntries,
          { account_name: 'Raw Material Inventory', type: 'CR', amount: totalConsumptionValue > 0 ? totalConsumptionValue : 0 }
        ]
      };

      const existingVouchers = StorageService.getItem(voucherStorageKey) || StorageService.getItem('account_book_vouchers') || [];
      const updatedVouchers = [newVoucher, ...(Array.isArray(existingVouchers) ? existingVouchers : [])];
      StorageService.setItem(voucherStorageKey, updatedVouchers);
      StorageService.setItem('account_book_vouchers', updatedVouchers);

      // 3. Save Consumption Record
      const updatedConsumptions = [record, ...consumptions];
      setConsumptions(updatedConsumptions);
      StorageService.setItem(storageKey, updatedConsumptions);

      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));

      setUsesFor('');
      setCartItems([]);
      loadData();
      alert("✓ Fuel & Material consumption posted, stock deducted & journal voucher created!");
    } catch (err) {
      alert("Error posting consumption: " + err.message);
    }
  };

  const handleDeleteRecord = (id) => {
    if (window.confirm("Kya aap is consumption record ko delete karna chahte hain?")) {
      const updated = consumptions.filter(c => c.id !== id);
      setConsumptions(updated);
      StorageService.setItem(storageKey, updated);
      window.dispatchEvent(new Event('app_storage_updated'));
    }
  };

  return (
    <div style={{ padding: '4px', maxWidth: '650px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', color: '#0f172a' }}>
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🚜 Multi-Item Fuel & Material Consumption ({selectedFY})
        </h3>

        <form onSubmit={handlePostConsumptions}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Date of Usage *</label>
              <input type="date" value={usageDate} onChange={e => setUsageDate(e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Uses For (Kaha use hua h) *</label>
              <input type="text" value={usesFor} onChange={e => setUsesFor(e.target.value)} placeholder="e.g. Chamber-1 / Tractor" style={inputStyle} required />
            </div>
          </div>

          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '10px', marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#15803d', marginBottom: '8px' }}>
              ➕ Add Items to Consumption Cart
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#374155' }}>Select Stock Item / Fuel *</label>
                <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} style={inputStyle}>
                  <option value="">-- Search & Choose Fuel/Stock ({stockItems.length} available) --</option>
                  {stockItems.map(item => (
                    <option key={item.id || item.itemName} value={item.id || item.itemName}>
                      {item.itemName || item.item_name || item.name} (Stock: {item.stockQty ?? item.current_stock ?? item.stock ?? item.qty ?? 0} {item.unit || ''})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#374155' }}>Quantity *</label>
                  <input type="number" step="0.01" value={qty} onChange={e => setQty(e.target.value)} placeholder="0.0" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#374155' }}>Debit Expense Account *</label>
                  <select value={expenseAccount} onChange={e => setExpenseAccount(e.target.value)} style={inputStyle}>
                    <option value="">-- Select Expense Account --</option>
                    {expenseAccountsList.map(acc => (
                      <option key={acc.id || acc.name} value={acc.name || acc.account_name}>{acc.name || acc.account_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button type="button" onClick={handleAddToCart} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '9px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '11px' }}>
              + Add Item to Cart
            </button>

            {cartItems.length > 0 && (
              <div style={{ marginTop: '10px', backgroundColor: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#166534', marginBottom: '4px' }}>Items in Current Cart:</div>
                {cartItems.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #f0fdf4', fontSize: '11px' }}>
                    <span><strong>{c.itemName}</strong> (Qty: {c.qty}) - <span style={{ color: '#64748b' }}>{c.expenseAccount}</span></span>
                    <button type="button" onClick={() => handleRemoveCartItem(c.id)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '11px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '12px' }}>
            🚀 Post All Consumptions & Deduct Stock
          </button>
        </form>
      </div>

      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#0f172a', fontWeight: 'bold' }}>Consumption Register ({selectedFY})</h4>
        {consumptions.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '16px', fontSize: '11px' }}>Koi consumption record darj nahi hai.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>
                  <th style={{ padding: '8px' }}>Date / Uses For</th>
                  <th style={{ padding: '8px' }}>Consumed Items & Qty</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {consumptions.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px' }}>{c.usageDate}<br /><strong>{c.usesFor || c.vehicleRef}</strong></td>
                    <td style={{ padding: '8px' }}>
                      {c.items.map((it, idx) => (
                        <div key={idx}>• {it.itemName}: <strong>{it.qty}</strong> ({it.expenseAccount})</div>
                      ))}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button onClick={() => handleDeleteRecord(c.id)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  marginTop: '4px',
  backgroundColor: '#ffffff',
  color: '#0f172a'
};
