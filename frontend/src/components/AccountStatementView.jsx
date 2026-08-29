// frontend/src/components/AccountStatementView.jsx

import React, { useState, useEffect } from 'react';

export default function AccountStatementView({ firm }) {
  const [ledgers, setLedgers] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [fromDate, setFromDate] = useState('2026-08-01');
  const [toDate, setToDate] = useState('2026-08-29');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = () => {
    const systemDefaults = [
      { id: 'DEF-CASH', name: 'Cash Account', sub_group: 'CASH' },
      { id: 'DEF-BANK', name: 'Bank Account', sub_group: 'BANK' }
    ];

    try {
      const saved = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
      const combined = [...systemDefaults, ...saved];
      setLedgers(combined);
      if (saved.length > 0) {
        setSelectedAccountId(saved[0].id);
      }
    } catch (e) {
      setLedgers(systemDefaults);
    }
  };

  const selectedLedger = ledgers.find(l => l.id === selectedAccountId);

  // PDF Generation Trigger
  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Control Selector Card */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>📖 Account Statement & Milan</h3>
        
        <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', color: '#334155', marginBottom: '4px' }}>Select Party / Account *</label>
        <select 
          value={selectedAccountId} 
          onChange={(e) => setSelectedAccountId(e.target.value)} 
          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
        >
          <option value="">-- Select Party / Ledger Account --</option>
          {ledgers.map(l => (
            <option key={l.id} value={l.id}>{l.name} ({l.sub_group || 'LEDGER'})</option>
          ))}
        </select>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>To Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Action Button: Download PDF */}
        <button 
          onClick={handleDownloadPDF} 
          style={{ width: '100%', backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: '14px' }}
        >
          📥 Download Particular Account Statement (PDF)
        </button>
      </div>

      {/* Printable Sheet Sheet */}
      <div id="printable-ledger-sheet" style={{ border: '1px solid #cbd5e1', padding: '16px', borderRadius: '8px', backgroundColor: '#fff' }}>
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px', color: '#0f172a' }}>
          {firm?.legal_name || 'My Business Firm'}
        </div>
        <div style={{ textAlign: 'center', fontSize: '10px', color: '#64748b' }}>
          GSTIN: {firm?.gstin || 'Unregistered'}
        </div>
        <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 'bold', marginTop: '6px', color: '#2563eb' }}>
          ACCOUNT STATEMENT: {selectedLedger ? selectedLedger.name.toUpperCase() : 'ALL ACCOUNTS'}
        </div>
        <div style={{ textAlign: 'center', fontSize: '9px', color: '#475569', marginBottom: '10px' }}>
          Period: {fromDate} to {toDate}
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
            <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
              <td style={{ border: '1px solid #e2e8f0', padding: '6px' }}>{fromDate}</td>
              <td style={{ border: '1px solid #e2e8f0', padding: '6px' }}>Opening Balance B/F</td>
              <td style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'right' }}>₹{parseFloat(selectedLedger?.opening_balance || 0).toFixed(2)}</td>
              <td style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'right' }}>-</td>
              <td style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'right' }}>
                ₹{parseFloat(selectedLedger?.opening_balance || 0).toFixed(2)} {selectedLedger?.opening_balance_type || 'Dr'}
              </td>
            </tr>
            <tr>
              <td colSpan="5" style={{ border: '1px solid #e2e8f0', padding: '14px', textAlign: 'center', color: '#94a3b8' }}>
                Is period me koi Naya Transaction Record nahi mila.
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '9px' }}>
          <div>Computer Generated Account Statement</div>
          <div style={{ textAlign: 'center', fontWeight: 'bold', borderTop: '1px solid #94a3b8', paddingTop: '4px', width: '120px' }}>
            Authorized Signatory
          </div>
        </div>
      </div>
    </div>
  );
}
