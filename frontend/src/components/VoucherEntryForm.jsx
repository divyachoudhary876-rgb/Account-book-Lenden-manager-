import React, { useState } from 'react';

export default function VoucherEntryForm() {
  const [voucherType, setVoucherType] = useState('JOURNAL');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [financialYear, setFinancialYear] = useState('2026-27');
  const [narration, setNarration] = useState('');
  const [rows, setRows] = useState([
    { entry_type: 'DR', account_id: '', amount: '', particulars: '' },
    { entry_type: 'CR', account_id: '', amount: '', particulars: '' }
  ]);

  const updateRow = (idx, field, val) => {
    const copy = [...rows];
    copy[idx][field] = val;
    setRows(copy);
  };

  const addRow = () => setRows([...rows, { entry_type: 'DR', account_id: '', amount: '', particulars: '' }]);
  const removeRow = (idx) => setRows(rows.filter((_, i) => i !== idx));

  const totalDr = rows.filter(r => r.entry_type === 'DR').reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const totalCr = rows.filter(r => r.entry_type === 'CR').reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const isBalanced = totalDr > 0 && Math.abs(totalDr - totalCr) < 0.01;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isBalanced) return alert('Cannot Submit: Total Debit must equal Total Credit');

    const payload = {
      voucher_type: voucherType,
      voucher_date: voucherDate,
      financial_year: financialYear,
      narration,
      line_items: rows
    };

    try {
      const res = await fetch('/api/vouchers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert(`Voucher Posted Successfully: ${data.voucher_number}`);
        setNarration('');
        setRows([
          { entry_type: 'DR', account_id: '', amount: '', particulars: '' },
          { entry_type: 'CR', account_id: '', amount: '', particulars: '' }
        ]);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      alert(`Network Error: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '20px auto', padding: '24px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Standard Accounting Voucher Entry</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <select value={voucherType} onChange={e => setVoucherType(e.target.value)} style={{ padding: '8px', flex: 1 }}>
            <option value="JOURNAL">Journal Voucher (JV)</option>
            <option value="PAYMENT">Payment Voucher (PAY)</option>
            <option value="RECEIPT">Receipt Voucher (REC)</option>
            <option value="CONTRA">Contra Voucher (Bank/Cash)</option>
          </select>
          <input type="date" value={voucherDate} onChange={e => setVoucherDate(e.target.value)} style={{ padding: '8px', flex: 1 }} />
          <input type="text" value={financialYear} onChange={e => setFinancialYear(e.target.value)} placeholder="FY (2026-27)" style={{ padding: '8px', flex: 1 }} />
        </div>

        <h4>Voucher Line Items</h4>
        {rows.map((row, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <select value={row.entry_type} onChange={e => updateRow(idx, 'entry_type', e.target.value)} style={{ padding: '8px' }}>
              <option value="DR">By (Dr)</option>
              <option value="CR">To (Cr)</option>
            </select>
            <input type="text" placeholder="Account UUID / Name" value={row.account_id} onChange={e => updateRow(idx, 'account_id', e.target.value)} required style={{ flex: 2, padding: '8px' }} />
            <input type="number" placeholder="Amount (₹)" value={row.amount} onChange={e => updateRow(idx, 'amount', e.target.value)} required style={{ flex: 1, padding: '8px' }} />
            {rows.length > 2 && (
              <button type="button" onClick={() => removeRow(idx)} style={{ background: 'red', color: 'white', border: 'none', padding: '8px' }}>X</button>
            )}
          </div>
        ))}

        <button type="button" onClick={addRow} style={{ marginBottom: '16px', padding: '6px 12px' }}>+ Add Row</button>

        <textarea placeholder="Voucher Narration / Description" value={narration} onChange={e => setNarration(e.target.value)} required style={{ width: '100%', height: '60px', padding: '8px', marginBottom: '16px' }} />

        <div style={{ background: isBalanced ? '#e6ffe6' : '#ffe6e6', padding: '12px', marginBottom: '16px', borderRadius: '4px' }}>
          <strong>Total DR: ₹{totalDr} | Total CR: ₹{totalCr}</strong>
          <span style={{ marginLeft: '16px', color: isBalanced ? 'green' : 'red', fontWeight: 'bold' }}>
            {isBalanced ? '✓ Balanced Entry' : '✗ Unbalanced (Debits must equal Credits)'}
          </span>
        </div>

        <button type="submit" disabled={!isBalanced} style={{ background: isBalanced ? '#28a745' : '#ccc', color: 'white', border: 'none', padding: '12px 24px', cursor: isBalanced ? 'pointer' : 'not-allowed' }}>
          Post Voucher
        </button>
      </form>
    </div>
  );
}
