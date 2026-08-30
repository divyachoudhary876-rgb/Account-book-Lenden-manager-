// frontend/src/components/CreateInvoice.jsx

import React, { useState, useEffect } from 'react';
import { getCustomerAccounts } from '../utils/accountMasterEngine.js';

export default function CreateInvoice({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');

  useEffect(() => {
    const list = getCustomerAccounts(activeFirmId);
    setCustomers(list);
    if (list.length > 0) setSelectedCustomer(list[0].id);
  }, [activeFirmId]);

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>🧾 Sales Bill Entry</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Select Customer / Party *</label>
          <select
            value={selectedCustomer}
            onChange={e => setSelectedCustomer(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
          >
            {customers.map(c => (
              <option key={c.id} value={c.id}>👤 {c.name} ({c.group_type})</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
