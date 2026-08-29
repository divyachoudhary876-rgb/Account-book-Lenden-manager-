// frontend/src/components/VoucherEntryForm.jsx

import React, { useState, useEffect } from 'react';

export default function VoucherEntryForm({ firm }) {
  const [voucherType, setVoucherType] = useState('JOURNAL');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState('');
  const [accounts, setAccounts] = useState([]);

  const [lines, setLines] = useState([
    { type: 'Dr', account_id: '', debit: 0, credit: 0 },
    { type: 'Cr', account_id: '', debit: 0, credit: 0 }
  ]);

  // Default Standard System Accounts + User Created Accounts Auto-Fetch
  useEffect(() => {
    loadAllAccounts();
  }, []);

  const loadAllAccounts = () => {
    const defaultAccounts = [
      { id: 'DEF-CASH', name: 'Cash Account', primary_type: 'ASSET' },
      { id: 'DEF-BANK', name: 'Bank Account', primary_type: 'ASSET' },
      { id: 'DEF-SALES', name: 'Sales Account', primary_type: 'INCOME' },
      { id: 'DEF-PURCHASE', name: 'Purchase Account', primary_type: 'EXPENSE' }
    ];

    try {
      const savedAccounts = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
      
      // Combine System Default Accounts + User Created Accounts
      const combined = [...defaultAccounts, ...savedAccounts];
      setAccounts(combined);
    } catch (e) {
      setAccounts(defaultAccounts);
    }
  };

  const handleLineChange = (index, field, value) => {
    const updated = [...lines];
    updated[index][field] = value;

    if (field === 'debit') updated[index].credit = 0;
    if (field === 'credit') updated[index].debit = 0;

    setLines(updated);
  };

  const handleAddLine = () => {
    setLines([...lines, { type: 'Dr', account_id: '', debit: 0, credit: 0 }]);
  };

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handlePostVoucher = () => {
    if (!isBalanced) return alert('Debit aur Credit totals barabar hone chahiye!');

    const voucherRecord = {
      id: `VOUCHER-${Date.now()}`,
      voucher_type: voucherType,
      entry_date: entryDate,
      narration,
      lines,
      created_at: new Date().toISOString()
    };

    try {
      const existingVouchers = JSON.parse(localStorage.getItem('app_vouchers') || '[]');
      localStorage.setItem('app_vouchers', JSON.stringify([...existingVouchers, voucherRecord]));
      
      alert('Voucher successfully posted to General Ledger!');
      setNarration('');
      setLines([
        { type: 'Dr', account_id: '', debit: 0, credit: 0 },
        { type: 'Cr', account_id: '', debit: 0, credit: 0 }
      ]);
    } catch (e) {
      alert('Error saving voucher entry.');
    }
  };

  return (
    <div style={styles.cardMain}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>Standard Double-Entry Voucher</h3>

      <div style={styles.grid2}>
        <div>
          <label style={styles.label}>Voucher Type *</label>
          <select value={voucherType} onChange={(e) => setVoucherType(e.target.value)} style={styles.input}>
            <option value="JOURNAL">Journal Voucher (JV)</option>
            <option value="RECEIPT">Receipt Voucher (RV)</option>
            <option value="PAYMENT">Payment Voucher (PV)</option>
            <option value="CONTRA">Contra Voucher (CV)</option>
          </select>
        </div>
        <div>
          <label style={styles.label}>Entry Date *</label>
          <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} style={styles.input} />
        </div>
      </div>

      <h4 style={{ margin: '16px 0 8px 0', color: '#334155', fontSize: '13px' }}>Voucher Line Items</h4>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9' }}>
            <th style={{ ...styles.th, width: '90px' }}>Type</th>
            <th style={styles.th}>Particular Account (Dynamic Dropdown)</th>
            <th style={{ ...styles.th, width: '130px', textAlign: 'right' }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, idx) => (
            <tr key={idx}>
              <td style={styles.td}>
                <select 
                  value={line.type} 
                  onChange={(e) => {
                    const updated = [...lines];
                    updated[idx].type = e.target.value;
                    setLines(updated);
                  }}
                  style={styles.tableInput}
                >
                  <option value="Dr">By (Dr)</option>
                  <option value="Cr">To (Cr)</option>
                </select>
              </td>

              <td style={styles.td}>
                {/* DYNAMIC DROPDOWN SYNCED WITH CREATED ACCOUNTS */}
                <select
                  value={line.account_id}
                  onChange={(e) => handleLineChange(idx, 'account_id', e.target.value)}
                  style={styles.tableInput}
                  required
                >
                  <option value="">-- Select Particular Account --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.primary_type || 'LEDGER'})
                    </option>
                  ))}
                </select>
              </td>

              <td style={styles.td}>
                <input 
                  type="number" 
                  step="0.01" 
                  value={line.type === 'Dr' ? line.debit : line.credit}
                  onChange={(e) => handleLineChange(idx, line.type === 'Dr' ? 'debit' : 'credit', e.target.value)}
                  style={{ ...styles.tableInput, textAlign: 'right' }} 
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button type="button" onClick={handleAddLine} style={styles.btnAddRow}>+ Add Row</button>

      <div style={{ marginTop: '16px' }}>
        <textarea 
          placeholder="Voucher Narration / Transaction Description" 
          value={narration} 
          onChange={(e) => setNarration(e.target.value)} 
          style={{ ...styles.input, height: '60px' }} 
        />
      </div>

      <div style={{
        marginTop: '16px',
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: isBalanced ? '#ecfdf5' : '#fef2f2',
        border: `1px solid ${isBalanced ? '#10b981' : '#f87171'}`,
        color: isBalanced ? '#065f46' : '#991b1b',
        fontWeight: 'bold',
        fontSize: '13px'
      }}>
        Total DR: ₹{totalDebit.toFixed(2)} | Total CR: ₹{totalCredit.toFixed(2)} {isBalanced ? '✓' : '✗'}
        {!isBalanced && <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '4px' }}>Unbalanced (Debits must equal Credits)</div>}
      </div>

      <button 
        type="button" 
        onClick={handlePostVoucher}
        disabled={!isBalanced} 
        style={{ 
          ...styles.btnSubmit, 
          backgroundColor: isBalanced ? '#2563eb' : '#cbd5e1', 
          cursor: isBalanced ? 'pointer' : 'not-allowed' 
        }}
      >
        Post Double-Entry Voucher
      </button>
    </div>
  );
}

const styles = {
  cardMain: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', maxWidth: '750px', margin: '0 auto' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  label: { display: 'block', fontWeight: 'bold', fontSize: '12px', color: '#334155', marginBottom: '4px' },
  input: { width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' },
  th: { border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left', fontSize: '11px' },
  td: { border: '1px solid #e2e8f0', padding: '6px' },
  tableInput: { width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '13px' },
  btnAddRow: { padding: '6px 12px', backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  btnSubmit: { width: '100%', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', marginTop: '16px' }
};
