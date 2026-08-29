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
      { id: 'DEF-CASH', name: 'Cash Account', sub_group: 'CASH', opening_balance: 0, opening_balance_type: 'Dr' },
      { id: 'DEF-BANK', name: 'Bank Account', sub_group: 'BANK', opening_balance: 0, opening_balance_type: 'Dr' }
    ];

    try {
      const saved = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
      const combined = [...systemDefaults, ...saved];
      setLedgers(combined);
      if (saved.length > 0) {
        setSelectedAccountId(saved[0].id);
      } else if (systemDefaults.length > 0) {
        setSelectedAccountId(systemDefaults[0].id);
      }
    } catch (e) {
      setLedgers(systemDefaults);
    }
  };

  const selectedLedger = ledgers.find(l => l.id === selectedAccountId);

  // Cross-Platform Universal PDF / Print Engine
  const handlePrintOrDownloadPDF = () => {
    if (!selectedLedger) {
      return alert('Kripya pehle Account / Party Select karein!');
    }
    // Triggers Native High-Resolution System PDF Generator Dialog (PC & Mobile Compatible)
    window.print();
  };

  const openingBal = parseFloat(selectedLedger?.opening_balance || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Selector & Actions Bar */}
      <div className="no-print" style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>📖 Complete Ledger Milan & Statement</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', color: '#334155', marginBottom: '4px' }}>
              Select Party / Account Head *
            </label>
            <select 
              value={selectedAccountId} 
              onChange={(e) => setSelectedAccountId(e.target.value)} 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            >
              <option value="">-- Select Party / Particular Account --</option>
              {ledgers.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.sub_group || 'LEDGER'})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>To Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Action Button: PDF Download & Print */}
        <button 
          onClick={handlePrintOrDownloadPDF} 
          style={{ 
            width: '100%', 
            backgroundColor: '#10b981', 
            color: '#ffffff', 
            border: 'none', 
            padding: '12px', 
            borderRadius: '8px', 
            fontWeight: 'bold', 
            fontSize: '14px', 
            cursor: 'pointer', 
            marginTop: '16px' 
          }}
        >
          🖨️ / 📥 Print or Save Complete Ledger Statement (PDF)
        </button>
      </div>

      {/* Printable Sheet View */}
      <div 
        id="printable-ledger-sheet" 
        style={{ 
          border: '1px solid #cbd5e1', 
          padding: '24px', 
          borderRadius: '8px', 
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)' 
        }}
      >
        {/* Document Header */}
        <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '14px' }}>
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '20px', color: '#0f172a' }}>
            {firm?.legal_name || 'My Business Firm'}
          </div>
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#475569' }}>
            {firm?.trade_name ? `Trade Name: ${firm.trade_name} | ` : ''} GSTIN: {firm?.gstin || 'Unregistered'}
          </div>
          <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 'bold', marginTop: '6px', color: '#2563eb' }}>
            GENERAL LEDGER ACCOUNT STATEMENT
          </div>
          <div style={{ textAlign: 'center', fontSize: '10px', color: '#64748b' }}>
            Period: {fromDate} to {toDate}
          </div>
        </div>

        {/* Party Summary Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '12px' }}>
          <div>
            <strong>Account Head:</strong> {selectedLedger ? selectedLedger.name : 'All Ledgers'}
          </div>
          <div>
            <strong>Category:</strong> {selectedLedger ? (selectedLedger.sub_group || selectedLedger.primary_type || 'GENERAL LEDGER') : 'N/A'}
          </div>
        </div>

        {/* Ledger Transactions Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ border: '1px solid #0f172a', padding: '8px', textAlign: 'left' }}>Date</th>
              <th style={{ border: '1px solid #0f172a', padding: '8px', textAlign: 'left' }}>Particulars / Description</th>
              <th style={{ border: '1px solid #0f172a', padding: '8px', textAlign: 'right' }}>Debit (₹)</th>
              <th style={{ border: '1px solid #0f172a', padding: '8px', textAlign: 'right' }}>Credit (₹)</th>
              <th style={{ border: '1px solid #0f172a', padding: '8px', textAlign: 'right' }}>Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{fromDate}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>Opening Balance B/F</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>
                {selectedLedger?.opening_balance_type === 'Dr' ? `₹${openingBal.toFixed(2)}` : '-'}
              </td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>
                {selectedLedger?.opening_balance_type === 'Cr' ? `₹${openingBal.toFixed(2)}` : '-'}
              </td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>
                ₹{openingBal.toFixed(2)} {selectedLedger?.opening_balance_type || 'Dr'}
              </td>
            </tr>
            <tr>
              <td colSpan="5" style={{ border: '1px solid #e2e8f0', padding: '18px', textAlign: 'center', color: '#64748b' }}>
                Is selected period range me koi Naya Voucher Entry record nahi hua hai.
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
              <td colSpan="2" style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'right' }}>Closing Net Ledger Balance:</td>
              <td colSpan="3" style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'right', color: '#2563eb', fontSize: '13px' }}>
                ₹{openingBal.toFixed(2)} {selectedLedger?.opening_balance_type || 'Dr'}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Compliance Footer */}
        <div style={{ marginTop: '36px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '10px', color: '#475569' }}>
          <div>
            <div>Computer Generated Account Statement</div>
            <div>Generated Date: {new Date().toLocaleDateString('en-IN')}</div>
          </div>
          <div style={{ textAlign: 'center', fontWeight: 'bold', borderTop: '1px solid #94a3b8', paddingTop: '4px', width: '150px', color: '#0f172a' }}>
            Authorized Signatory
          </div>
        </div>
      </div>

      {/* Print Specific CSS to Hide Navigation Controls in Printed PDF */}
      <style>{`
        @media print {
          .no-print, header, aside, button {
            display: none !important;
          }
          body, #printable-ledger-sheet {
            background-color: #ffffff !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
