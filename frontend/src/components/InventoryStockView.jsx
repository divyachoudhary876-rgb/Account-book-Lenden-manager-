// frontend/src/components/InventoryStockView.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { loadFirmData, saveFirmData } from '../utils/firmIsolationEngine';

export default function InventoryStockView({ firm, onClose }) {
  const [inventoryList, setInventoryList] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('Quintal');
  const [openingStock, setOpeningStock] = useState('0');
  const [purchaseRate, setPurchaseRate] = useState('0');

  const loadInventory = () => {
    try {
      if (!firm) return;
      const activeFirmId = firm?.id || firm?.firm_id || 'FIRM-001';
      
      const scopedKey = `inventory_items_${activeFirmId}`;
      let items = loadFirmData('inventory_items', firm, []);
      if (!Array.isArray(items) || items.length === 0) {
        items = StorageService.getItem(scopedKey) || StorageService.getItem('inventory_items') || [];
      }

      const allVouchers = StorageService.getItem('account_book_vouchers') || [];
      const productionBatches = loadFirmData('production_batches', firm, []);
      const consumptionRecords = loadFirmData('material_consumption_records', firm, []);

      const normalized = items.map(item => {
        if (!item) return null;
        const itemId = String(item.id || '');
        const itemNameClean = String(item.item_name || item.name || '').trim().toLowerCase();

        let totalPurQty = 0;
        let totalPurAmt = 0;
        let totalOutFlowQty = 0;
        let totalOutFlowAmt = 0;

        allVouchers.forEach(v => {
          if (!v) return;
          const vType = String(v.voucher_type || v.type || '').toUpperCase();

          if (vType === 'PURCHASE') {
            const vItemId = String(v.itemId || v.item_id || '');
            const vItemName = String(v.item_name || '').trim().toLowerCase();
            const narrationText = String(v.narration || '').toLowerCase();

            const isMatch = (vItemId && vItemId === itemId) || 
                            (itemNameClean && vItemName === itemNameClean) ||
                            (itemNameClean && narrationText.includes(itemNameClean));

            if (isMatch) {
              const q = Number(v.qty || v.quantity || 0);
              const a = Number(v.amount || v.total_amount || (q * Number(v.rate || 0)) || 0);
              totalPurQty += q;
              totalPurAmt += a;
            }
          } else if (vType === 'SALES') {
            const vItems = Array.isArray(v.items) ? v.items : [];
            vItems.forEach(ci => {
              if (!ci) return;
              const ciId = String(ci.itemId || ci.id || '');
              const ciName = String(ci.itemName || ci.name || '').trim().toLowerCase();

              const isCiMatch = (ciId && ciId === itemId) || (itemNameClean && ciName === itemNameClean);
              if (isCiMatch) {
                const q = Number(ci.quantity || ci.qty || 0);
                const a = Number(ci.total || (q * Number(ci.rate || 0)) || 0);
                totalOutFlowQty += q;
                totalOutFlowAmt += a;
              }
            });
          }
        });

        productionBatches.forEach(batch => {
          if (!batch) return;
          const outId = String(batch.output_item_id || '');
          if (outId === itemId) {
            const q = Number(batch.produced_qty || 0);
            const a = Number(batch.total_cost || 0);
            totalPurQty += q;
            totalPurAmt += a;
          }
        });

        consumptionRecords.forEach(rec => {
          if (!rec) return;
          const recItems = Array.isArray(rec.items) ? rec.items : [];
          recItems.forEach(ri => {
            if (!ri) return;
            const rId = String(ri.itemId || ri.id || '');
            const rName = String(ri.name || '').trim().toLowerCase();
            if (rId === itemId || (itemNameClean && rName === itemNameClean)) {
              const q = Number(ri.qty || 0);
              const a = q * Number(ri.rate || item.unit_purchase_price || 0);
              totalOutFlowQty += q;
              totalOutFlowAmt += a;
            }
          });
        });

        const opStock = Number(item.opening_stock ?? item.stock ?? item.current_stock ?? 0);
        const computedStock = opStock + totalPurQty - totalOutFlowQty;
        const finalStock = computedStock >= 0 ? computedStock : 0;
        const rateVal = Number(item.unit_purchase_price ?? item.purchasePrice ?? item.rate ?? 0);

        return {
          ...item,
          current_stock: finalStock,
          stock: finalStock,
          qty: finalStock,
          unit_purchase_price: rateVal,
          rate: rateVal,
          totalPurchaseQty: totalPurQty,
          totalPurchaseAmount: totalPurAmt,
          totalSaleQty: totalOutFlowQty,
          totalSaleAmount: totalOutFlowAmt
        };
      }).filter(Boolean);

      setInventoryList(normalized);
    } catch (e) {
      console.error("Error loading inventory:", e);
    }
  };

  useEffect(() => {
    loadInventory();
    window.addEventListener('app_state_updated', loadInventory);
    window.addEventListener('app_storage_updated', loadInventory);
    window.addEventListener('storage', loadInventory);
    return () => {
      window.removeEventListener('app_state_updated', loadInventory);
      window.removeEventListener('app_storage_updated', loadInventory);
      window.removeEventListener('storage', loadInventory);
    };
  }, [firm]);

  const handleOpenAddModal = () => {
    setEditingItemId(null);
    setItemName('');
    setUnit('Quintal');
    setOpeningStock('0');
    setPurchaseRate('0');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItemId(item.id);
    setItemName(item.item_name || item.itemName || item.name || '');
    setUnit(item.unit || 'Quintal');
    const stock = item.opening_stock || item.current_stock || item.stock || 0;
    const rate = item.unit_purchase_price || item.purchasePrice || item.rate || 0;
    setOpeningStock(String(stock));
    setPurchaseRate(String(rate));
    setIsModalOpen(true);
  };

  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!itemName.trim()) return alert('कृपया आइटम का नाम दर्ज करें।');

    try {
      const currentItems = loadFirmData('inventory_items', firm, []);
      const stockNum = Number(openingStock || 0);
      const rateNum = Number(purchaseRate || 0);
      const firmKey = typeof firm === 'object' ? (firm.firm_id || firm.id || firm.legal_name || 'default_firm') : (firm || 'default_firm');
      
      let updated = [];
      if (editingItemId) {
        updated = currentItems.map(i => {
          if (String(i.id) === String(editingItemId)) {
            return {
              ...i,
              item_name: itemName.trim(),
              itemName: itemName.trim(),
              name: itemName.trim(),
              unit: unit,
              opening_stock: stockNum,
              current_stock: stockNum,
              stock: stockNum,
              qty: stockNum,
              unit_purchase_price: rateNum,
              purchasePrice: rateNum,
              rate: rateNum,
              updated_at: new Date().toISOString()
            };
          }
          return i;
        });
        alert('✓ Item Updated Successfully!');
      } else {
        const newItem = {
          id: `ITEM-${Date.now()}`,
          firm_id: firmKey,
          item_name: itemName.trim(),
          itemName: itemName.trim(),
          name: itemName.trim(),
          item_type: 'PHYSICAL',
          unit: unit,
          opening_stock: stockNum,
          current_stock: stockNum,
          stock: stockNum,
          qty: stockNum,
          unit_purchase_price: rateNum,
          purchasePrice: rateNum,
          rate: rateNum,
          created_at: new Date().toISOString()
        };
        updated = [newItem, ...currentItems];
        alert('✓ Item Created Successfully in Master!');
      }

      saveFirmData('inventory_items', firm, updated);
      StorageService.setItem('inventory_items', updated);
      StorageService.setItem(`inventory_items_${firmKey}`, updated);

      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));

      setItemName('');
      setOpeningStock('0');
      setPurchaseRate('0');
      setEditingItemId(null);
      setIsModalOpen(false);
      loadInventory();
    } catch (err) {
      alert('Error saving item: ' + err.message);
    }
  };

  const totalValuation = inventoryList.reduce((sum, item) => {
    const stock = Number(item.current_stock || item.stock || item.qty || 0);
    const rate = Number(item.unit_purchase_price || item.purchasePrice || item.rate || 0);
    return sum + (stock * rate);
  }, 0);

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', color: '#0f172a' }}>
      
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', marginBottom: '16px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '800' }}>Perpetual Valuation</div>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>📦 Live Stock & Inventory</h2>
          </div>
          {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Close</button>}
        </div>

        <div style={{ marginBottom: '14px' }}>
          <button 
            onClick={handleOpenAddModal} 
            style={{ width: '100%', padding: '11px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}
          >
            + Add New Item to Master
          </button>
        </div>

        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>Total Portfolio Value</div>
            <div style={{ fontSize: '10px', color: '#15803d', marginTop: '1px' }}>Real-time stock valuation</div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#15803d' }}>
            ₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {inventoryList.length === 0 ? (
          <div style={{ backgroundColor: '#fff', textAlign: 'center', padding: '30px 20px', borderRadius: '12px', color: '#94a3b8', fontSize: '11px', border: '1px solid #e2e8f0' }}>
            No items found. Click '+ Add New Item to Master' above to create one.
          </div>
        ) : (
          inventoryList.map((item, idx) => {
            const stock = Number(item.current_stock || item.stock || item.qty || 0);
            const rate = Number(item.unit_purchase_price || item.purchasePrice || item.rate || 0);
            const val = stock * rate;
            const displayName = item.item_name || item.itemName || item.name || 'Item';

            const purQty = Number(item.totalPurchaseQty || 0);
            const purAmt = Number(item.totalPurchaseAmount || 0);
            const saleQty = Number(item.totalSaleQty || 0);
            const saleAmt = Number(item.totalSaleAmount || 0);

            return (
              <div key={item.id || idx} style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>{displayName}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span>Stock: <strong style={{ color: stock < 0 ? '#dc2626' : '#059669' }}>{stock.toFixed(2)} {item.unit || 'Pcs'}</strong></span>
                      <span>•</span>
                      <span>Rate: ₹{rate.toFixed(2)}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleOpenEditModal(item)}
                    style={{ padding: '5px 12px', backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', fontWeight: '700' }}
                  >
                    Edit
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}>
                  <div>
                    <span style={{ color: '#64748b', fontWeight: '700', display: 'block' }}>Total Purchase:</span>
                    <strong style={{ color: '#0284c7' }}>{purQty.toFixed(2)} {item.unit || 'Pcs'}</strong> 
                    <span style={{ color: '#475569', fontSize: '10px', display: 'block' }}>(₹{purAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })})</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontWeight: '700', display: 'block' }}>Total Sale / Consumption:</span>
                    <strong style={{ color: '#9333ea' }}>{saleQty.toFixed(2)} {item.unit || 'Pcs'}</strong> 
                    <span style={{ color: '#475569', fontSize: '10px', display: 'block' }}>(₹{saleAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })})</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Valuation</span>
                  <span style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a' }}>₹{val.toFixed(2)}</span>
                </div>

              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                {editingItemId ? '✏️ Edit Item' : '📦 Create New Item'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', width: '28px', height: '28px', borderRadius: '50%', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', color: '#64748b' }}>✕</button>
            </div>

            <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Item Name *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Coal, Husk, Diesel, Bricks" 
                  value={itemName} 
                  onChange={e => setItemName(e.target.value)} 
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '12px', outline: 'none', backgroundColor: '#fff', color: '#0f172a' }}
                  required 
                  autoFocus 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Measurement Unit *</label>
                <select 
                  value={unit} 
                  onChange={e => setUnit(e.target.value)} 
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', backgroundColor: '#fff', fontSize: '12px', outline: 'none', color: '#0f172a' }}
                >
                  <option value="Quintal">Quintal (क्विंटल)</option>
                  <option value="Tonnes">Tonnes (टन)</option>
                  <option value="Kg">Kg (किलो)</option>
                  <option value="Pcs">Pcs (पीस)</option>
                  <option value="Liters">Liters (लीटर)</option>
                  <option value="Truck">Truck (ट्रक)</option>
                  <option value="Trolley">Trolley (ट्रॉली)</option>
                  <option value="Thousands">Thousands (हजार)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Opening Stock</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={openingStock} 
                    onChange={e => setOpeningStock(e.target.value)} 
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '12px', outline: 'none', backgroundColor: '#fff', color: '#0f172a' }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Purchase Rate (₹)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={purchaseRate} 
                    onChange={e => setPurchaseRate(e.target.value)} 
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '12px', outline: 'none', backgroundColor: '#fff', color: '#0f172a' }} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="submit" style={{ flex: 1, padding: '11px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
                  {editingItemId ? '✓ Update Item' : '+ Save Item'}
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '11px 14px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
                  Cancel
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
