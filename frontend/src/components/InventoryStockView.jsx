// frontend/src/components/InventoryStockView.jsx

import React, { useState, useEffect } from 'react';
import { getStockItemsByFirm } from '../utils/stockInventoryEngine.js';

export default function InventoryStockView({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [stockList, setStockList] = useState([]);

  const loadStock = () => {
    const items = getStockItemsByFirm(activeFirmId);
    setStockList(items);
  };

  useEffect(() => {
    loadStock();
    window.addEventListener('app_state_updated', loadStock);
    return () => window.removeEventListener('app_state_updated', loadStock);
  }, [firm, activeFirmId]);

  const totalValuation = stockList.reduce((acc, it) => {
    return acc + (parseFloat(it.current_stock || 0) * parseFloat(it.unit_purchase_price || 0));
  }, 0);

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>📦 Live Stock & Inventory</h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Perpetual Inventory Valuation (Weighted Average)</span>
        </div>
        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#059669', backgroundColor: '#ecfdf5', padding: '6px 12px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
          Total Valuation: ₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '500px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '9px 10px', textAlign: 'left' }}>Item / Material</th>
              <th style={{ padding: '9px 10px', textAlign: 'center' }}>Unit</th>
              <th style={{ padding: '9px 10px', textAlign: 'right' }}>Current Stock</th>
              <th style={{ padding: '9px 10px', textAlign: 'right' }}>Avg Cost Rate (₹)</th>
              <th style={{ padding: '9px 10px', textAlign: 'right' }}>Total Value (₹)</th>
            </tr>
          </thead>
          <tbody>
            {stockList.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>No stock items found.</td></tr>
            ) : (
              stockList.map(item => {
                const stock = parseFloat(item.current_stock || 0);
                const rate = parseFloat(item.unit_purchase_price || 0);
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '9px 10px', fontWeight: 'bold' }}>{item.item_name}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'center' }}>{item.unit || 'Units'}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 'bold', color: stock > 0 ? '#059669' : '#dc2626' }}>{stock.toFixed(2)}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right' }}>₹{rate.toFixed(2)}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 'bold', color: '#1e3a8a' }}>₹{(stock * rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
