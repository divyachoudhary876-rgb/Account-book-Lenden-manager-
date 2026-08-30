// frontend/src/components/PurchaseStockEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { getSupplierAccounts } from '../utils/accountMasterEngine.js';

export default function PurchaseStockEntryForm({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');

  useEffect(() => {
    const list = getSupplierAccounts(activeFirmId);
    setSuppliers(list);
    if (list.length > 0) setSelectedSupplier(list[0].id);
  }, [activeFirmId]);

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>🛍️ Purchase Inward & Raw Material Entry</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Supplier / Creditor Account *</label>
          <select
            value={selectedSupplier}
            onChange={e => setSelectedSupplier(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
          >
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>🏬 {s.name} ({s.group_type})</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
