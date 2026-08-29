// frontend/src/components/BillSettlementView.jsx

import React, { useState } from 'react';

export default function BillSettlementView() {
  const [selectedParty, setSelectedParty] = useState('LED-3');
  const [receivedAmount, setReceivedAmount] = useState(5000);
  const [loading, setLoading] = useState(false);

  // Demo Unpaid Invoices
  const [pendingInvoices, setPendingInvoices] = useState([
    { id: 'INV-1001', date: '2026-08-05', totalAmount: 3000, paidAmount: 0, pending: 3000 },
    { id: 'INV-1004', date: '2026-08-15', totalAmount: 4500, paidAmount: 500, pending: 4000 },
  ]);

  const handleAutoKnockOff = () => {
    let unallocated = parseFloat(receivedAmount) || 0;
    const updated = pendingInvoices.map(inv => {
      if (unallocated <= 0) return { ...inv, settleNow: 0 };
      const toSettle = Math.min(inv.pending, unallocated);
      unallocated -= toSettle;
      return { ...inv, settleNow: toSettle };
    });
    setPendingInvoices(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Simulate API call to backend settlement endpoint
      setTimeout(() => {
        alert('Payment Settled & Knocked-Off Successfully!');
        setLoading(false);
      }, 1000);
    } catch (err) {
      alert('Error settling bills');
      setLoading(false);
    }
  };

  return (
    <div style={styles.cardMain}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>💳 Customer Bill Settlement & Knock-Off</h3>
      
      <form onSubmit={handleSubmit}>
        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>Select Customer / Debtor *</label>
            <select value={selectedParty} onChange={(e) => setSelectedParty(e.target.value)} style={styles.input}>
              <option value="LED-3">Shree Ram Traders</option>
              <option value="LED-4">Jaipur BioFuels</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>Amount Received (₹)</label>
            <input 
              type="number" 
              value={receivedAmount} 
              onChange={(e) => setReceivedAmount(e.target.value)} 
              style={styles.input} 
            />
          </div>
        </div>

        <button type="button" onClick={handleAutoKnockOff} style={styles.btnAuto}>
          ⚡ Auto-Allocate FIFO (Oldest Bill First)
        </button>

        {/* Invoice List Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={styles.th}>Invoice No</th>
              <th style={styles.th}>Date</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Pending (₹)</th>
              <th style={{ ...styles.th, textAlign: 'right', width: '140px' }}>Settle Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {pendingInvoices.map((inv, idx) => (
              <tr key={idx}>
                <td style={styles.td}>{inv.id}</td>
                <td style={styles.td}>{inv.date}</td>
                <td style={{ ...styles.td, textAlign: 'right', color: '#dc2626', fontWeight: 'bold' }}>
                  ₹{inv.pending.toFixed(2)}
                </td>
                <td style={styles.td}>
                  <input 
                    type="number" 
                    value={inv.settleNow || 0} 
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const updated = [...pendingInvoices];
                      updated[idx].settleNow = val;
                      setPendingInvoices(updated);
                    }}
                    style={{ width: '100%', border: '1px solid #cbd5e1', padding: '4px', textAlign: 'right' }} 
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button type="submit" disabled={loading} style={styles.btnSubmit}>
          {loading ? 'Processing Settlement...' : '💾 Confirm & Save Settlement'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  cardMain: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', maxWidth: '750px', margin: '0 auto' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  label: { display: 'block', fontWeight: 'bold', fontSize: '12px', color: '#334155', marginBottom: '4px' },
  input: { width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' },
  btnAuto: { marginTop: '12px', padding: '8px 14px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  th: { border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left', fontSize: '11px' },
  td: { border: '1px solid #e2e8f0', padding: '6px', fontSize: '12px' },
  btnSubmit: { width: '100%', color: '#fff', backgroundColor: '#10b981', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', marginTop: '16px', cursor: 'pointer' }
};
