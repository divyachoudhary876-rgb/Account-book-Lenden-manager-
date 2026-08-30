// frontend/src/components/VoucherEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { getAccountHeadsByFirm } from '../utils/accountMasterEngine.js';

export default function VoucherEntryForm({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [accounts, setAccounts] = useState([]);
  const [debitAcc, setDebitAcc] = useState('');
  const [creditAcc, setCreditAcc] = useState('');

  useEffect(() => {
    const list = getAccountHeadsByFirm(activeFirmId);
    setAccounts(list);
    if (list.length > 0) {
      setDebitAcc(list[0].id);
      setCreditAcc(list[1]?.id || list[0].id);
    }
  }, [activeFirmId]);

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>📒 Double-Entry Voucher Posting Engine</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Debit Account *</label>
          <select
            value={debitAcc}
            onChange={e => setDebitAcc(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
          >
            {accounts.map(a => (
              <option key={a.id} value={a.id}>Dr: {a.name} ({a.group_type})</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Credit Account *</label>
          <select
            value={creditAcc}
            onChange={e => setCreditAcc(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
          >
            {accounts.map(a => (
              <option key={a.id} value={a.id}>Cr: {a.name} ({a.group_type})</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
