import React, { useState } from 'react';

export default function AccountStatementView({ firm }) {
  const [ledgers] = useState([]); // Empty array (Zero-State)
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [fromDate, setFromDate] = useState('2026-08-01');
  const [toDate, setToDate] = useState('2026-08-29');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>📖 Account Statement & Milan</h3>
        
        <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', color: '#334155', marginBottom: '4px' }}>Select Party / Account *</label>
        <select 
          value={selectedAccountId} 
          onChange={(e) => setSelectedAccountId(e.target.value)} 
          style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
        >
          <option value="">-- Select Party / Ledger Account --</option>
          {ledgers.map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      <div style={{ border: '1px solid #cbd5e1', padding: '16px', borderRadius: '8px', backgroundColor: '#fff' }}>
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px', color: '#0f172a' }}>
          {firm?.legal_name || 'Your Business Name'}
        </div>
        <div style={{ textAlign: 'center', fontSize: '10px', color: '#64748b', marginBottom: '10px' }}>
          GSTIN: {firm?.gstin || 'Not Provided'}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'left' }}>Date</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'left' }}>Particulars</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'right' }}>Debit (₹)</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'right' }}>Credit (₹)</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'right' }}>Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="5" style={{ border: '1px solid #e2e8f0', padding: '14px', textAlign: 'center', color: '#94a3b8' }}>
                Abhi tak koi Ledger / Party Account add nahi hua hai. Voucher Entry ya Billing se naya account create karein.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
