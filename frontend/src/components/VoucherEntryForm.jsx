import React, { useState, useEffect } from 'react';
import CreateAccountHeadModal from './CreateAccountHeadModal';

export default function VoucherEntryForm({ organizationId = "ORG-101" }) {
  const [voucherType, setVoucherType] = useState('JOURNAL');
  const [entryDate, setEntryDate] = useState('2026-08-29');
  const [narration, setNarration] = useState('');
  
  const [accounts, setAccounts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeLineIdx, setActiveLineIdx] = useState(null);

  const [lines, setLines] = useState([
    { type: 'Dr', account_id: '', debit: 0, credit: 0 },
    { type: 'Cr', account_id: '', debit: 0, credit: 0 }
  ]);

  // Load Ledger Accounts Dropdown Data
  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`/api/v1/account-heads?organization_id=${organizationId}`);
      const data = await res.json();
      if (data.success) {
        setAccounts(data.data);
      }
    } catch (err) {
      console.error('Failed to load ledger dropdowns:', err);
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

  return (
    <div style={styles.cardMain}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>Standard Accounting Voucher Entry</h3>

      {/* Header Info */}
      <div style={styles.grid2}>
        <select value={voucherType} onChange={(e) => setVoucherType(e.target.value)} style={styles.input}>
          <option value="JOURNAL">Journal Voucher (JV)</option>
          <option value="RECEIPT">Receipt Voucher (RV)</option>
          <option value="PAYMENT">Payment Voucher (PV)</option>
          <option value="CONTRA">Contra Voucher (CV)</option>
        </select>
        <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} style={styles.input} />
      </div>

      <h4 style={{ margin: '16px 0 8px 0', color: '#334155' }}>Voucher Line Items</h4>

      {/* Dynamic Lines Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9' }}>
            <th style={{ ...styles.th, width: '90px' }}>Type</th>
            <th style={styles.th}>Particular Account (Dropdown)</th>
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
                    const newType = e.target.value;
                    const updated = [...lines];
                    updated[idx].type = newType;
                    setLines(updated);
                  }}
                  style={styles.tableInput}
                >
                  <option value="Dr">By (Dr)</option>
                  <option value="Cr">To (Cr)</option>
                </select>
              </td>

              {/* DYNAMIC ACCOUNT HEAD DROPDOWN */}
              <td style={{ ...styles.td, display: 'flex', gap: '6px', alignItems: 'center' }}>
                <select
                  value={line.account_id}
                  onChange={(e) => handleLineChange(idx, 'account_id', e.target.value)}
                  style={{ ...styles.tableInput, flex: 1 }}
                  required
                >
                  <option value="">-- Select Ledger Account --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.parent_group})
                    </option>
                  ))}
                </select>
                <button 
                  type="button" 
                  title="Create New Account"
                  onClick={() => { setActiveLineIdx(idx); setIsModalOpen(true); }}
                  style={styles.btnAddAccount}
                >
                  +
                </button>
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

      {/* Narration */}
      <div style={{ marginTop: '16px' }}>
        <textarea 
          placeholder="Voucher Narration / Description" 
          value={narration} 
          onChange={(e) => setNarration(e.target.value)} 
          style={{ ...styles.input, height: '60px' }} 
        />
      </div>

      {/* Math Equilibrium Guard Indicator */}
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

      <button type="button" disabled={!isBalanced} style={{ ...styles.btnSubmit, backgroundColor: isBalanced ? '#2563eb' : '#cbd5e1', cursor: isBalanced ? 'pointer' : 'not-allowed' }}>
        Post Voucher
      </button>

      {/* Account Head Creation Modal */}
      <CreateAccountHeadModal 
        organizationId={organizationId}
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onAccountCreated={(newAccount) => {
          setAccounts(prev => [...prev, newAccount]);
          if (activeLineIdx !== null) {
            handleLineChange(activeLineIdx, 'account_id', newAccount.id);
          }
        }}
      />
    </div>
  );
}

const styles = {
  cardMain: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', maxWidth: '700px', margin: '0 auto' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  input: { width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' },
  th: { border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left', fontSize: '11px' },
  td: { border: '1px solid #e2e8f0', padding: '6px' },
  tableInput: { width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '13px' },
  btnAddAccount: { padding: '4px 8px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' },
  btnAddRow: { marginTop: '10px', padding: '6px 12px', backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  btnSubmit: { width: '100%', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', marginTop: '16px' }
};
