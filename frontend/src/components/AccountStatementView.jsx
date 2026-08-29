// frontend/src/components/AccountStatementView.jsx

import React, { useState, useEffect } from 'react';

export default function AccountStatementView({ firm }) {
  const [ledgers, setLedgers] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [fromDate, setFromDate] = useState('2026-08-01');
  const [toDate, setToDate] = useState('2026-08-29');
  const [statementRows, setStatementRows] = useState([]);
  const [openingBalance, setOpeningBalance] = useState(0);

  // Load Created Accounts from Storage
  useEffect(() => {
    loadLedgerAccounts();
  }, []);

  const loadLedgerAccounts = () => {
    const defaultAccounts = [
      { id: 'DEF-CASH', name: 'Cash Account', primary_type: 'ASSET', opening_balance: 5000 },
      { id: 'DEF-BANK', name: 'Bank Account', primary_type: 'ASSET', opening_balance: 25000 },
      { id: 'DEF-SALES', name: 'Sales Account', primary_type: 'INCOME', opening_balance: 0 },
      { id: 'DEF-PURCHASE', name: 'Purchase Account', primary_type: 'EXPENSE', opening_balance: 0 }
    ];

    try {
      const savedAccounts = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
      const combined = [...defaultAccounts, ...savedAccounts];
      setLedgers(combined);
      if (combined.length > 0) {
        setSelectedAccountId(combined[0].id);
        calculateStatement(combined[0].id);
      }
    } catch (e) {
      setLedgers(defaultAccounts);
    }
  };

  const handleAccountChange = (accId) => {
    setSelectedAccountId(accId);
    calculateStatement(accId);
  };

  const calculateStatement = (accId) => {
    const selectedAcc = ledgers.find(a => a.id === accId);
    if (!selectedAcc) return;

    const opBal = parseFloat(selectedAcc.opening_balance) || 0;
    setOpeningBalance(opBal);

    // Fetch Vouchers linked to this Account
    try {
      const vouchers = JSON.parse(localStorage.getItem('app_vouchers') || '[]');
      let running = opBal;
      const rows = [];

      vouchers.forEach(v => {
        v.lines.forEach(line => {
          if (line.account_id === accId) {
            const dr = parseFloat(line.debit) || 0;
            const cr = parseFloat(line.credit) || 0;
            running += (dr - cr);
            rows.push({
              date: v.entry_date,
              voucherNo: v.id,
              particulars: v.narration || 'General Entry',
              debit: dr,
              credit: cr,
              balance: running
            });
          }
        });
      });
      setStatementRows(rows);
    } catch (e) {
      setStatementRows([]);
    }
  };

  const totalDebits = statementRows.reduce((sum, r) => sum + r.debit, 0);
  const totalCredits = statementRows.reduce((sum, r) => sum + r.credit, 0);
  const closingBalance = openingBalance + totalDebits - totalCredits;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>📖 Account Statement & Milan</h3>
        
        <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', color: '#334155', marginBottom: '4px' }}>Select Party / Account *</label>
        <select 
          value={selectedAccountId} 
          onChange={(e) => handleAccountChange(e.target.value)} 
          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
        >
          <option value="">-- Select Party / Ledger Account --</option>
          {ledgers.map(l => (
            <option key={l.id} value={l.id}>{l.name} ({l.primary_type || 'LEDGER'})</option>
          ))}
        </select>
      </div>

      <div style={{ border: '1px solid #cbd5e1', padding: '16px', borderRadius: '8px', backgroundColor: '#fff' }}>
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px', color: '#0f172a' }}>
          {firm?.legal_name || 'My Business Firm'}
        </div>
        <div style={{ textAlign: 'center', fontSize: '10px', color: '#64748b', marginBottom: '12px' }}>
          Period: {fromDate} to {toDate}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
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
            <tr style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>{fromDate}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>Opening Balance B/F</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'right' }}>{openingBalance >= 0 ? `₹${openingBalance.toFixed(2)}` : '-'}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'right' }}>{openingBalance < 0 ? `₹${Math.abs(openingBalance).toFixed(2)}` : '-'}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'right' }}>₹{Math.abs(openingBalance).toFixed(2)} {openingBalance >= 0 ? 'Dr' : 'Cr'}</td>
            </tr>

            {statementRows.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ border: '1px solid #e2e8f0', padding: '12px', textAlign: 'center', color: '#94a3b8' }}>
                  Is selected period me koi voucher transaction nahi mila.
                </td>
              </tr>
            ) : (
              statementRows.map((r, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #e2e8f0', padding: '6px' }}>{r.date}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '6px' }}>{r.particulars}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'right' }}>{r.debit > 0 ? `₹${r.debit.toFixed(2)}` : '-'}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'right' }}>{r.credit > 0 ? `₹${r.credit.toFixed(2)}` : '-'}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>₹{Math.abs(r.balance).toFixed(2)} {r.balance >= 0 ? 'Dr' : 'Cr'}</td>
                </tr>
              ))
            )}

            <tr style={{ backgroundColor: '#0f172a', color: '#fff', fontWeight: 'bold' }}>
              <td colSpan="2" style={{ border: '1px solid #cbd5e1', padding: '6px' }}>Closing Account Balance</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'right' }}>₹{totalDebits.toFixed(2)}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'right' }}>₹{totalCredits.toFixed(2)}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'right', color: '#10b981' }}>₹{Math.abs(closingBalance).toFixed(2)} {closingBalance >= 0 ? 'Dr' : 'Cr'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
