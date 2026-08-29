import React, { useState } from 'react';

export default function BillSettlementView() {
  const [customerId, setCustomerId] = useState('');
  const [receiptId, setReceiptId] = useState('');
  const [amount, setAmount] = useState('');

  const handleFIFOAdjust = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settlements/auto-fifo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          customer_id: customerId,
          receipt_id: receiptId,
          total_received_amount: parseFloat(amount)
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`${data.message} Unadjusted Advance: ₹${data.unadjusted_balance}`);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      alert(`Network Failure: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '20px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h3>Bill-by-Bill Payment Reconciliation (FIFO Knock-Off)</h3>
      <form onSubmit={handleFIFOAdjust}>
        <input 
          type="text" 
          placeholder="Customer UUID" 
          value={customerId} 
          onChange={e => setCustomerId(e.target.value)} 
          required 
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
        <input 
          type="text" 
          placeholder="Payment Receipt UUID" 
          value={receiptId} 
          onChange={e => setReceiptId(e.target.value)} 
          required 
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
        <input 
          type="number" 
          placeholder="Amount Received (₹)" 
          value={amount} 
          onChange={e => setAmount(e.target.value)} 
          required 
          style={{ width: '100%', padding: '8px', marginBottom: '15px' }}
        />
        <button type="submit" style={{ background: '#28a745', color: '#fff', border: 'none', padding: '10px 20px', cursor: 'pointer' }}>
          Apply Auto FIFO Settlement
        </button>
      </form>
    </div>
  );
}
