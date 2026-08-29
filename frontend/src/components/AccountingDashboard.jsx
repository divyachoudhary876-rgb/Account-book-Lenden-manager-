import React, { useState } from 'react';

export default function AccountingDashboard() {
  const [activeTab, setActiveTab] = useState('receipt');
  const [invoiceIdForPdf, setInvoiceIdForPdf] = useState('');

  // Payment Receipt Form State
  const [receiptData, setReceiptData] = useState({
    customer_id: '',
    receipt_date: new Date().toISOString().split('T')[0],
    amount_received: '',
    payment_mode: 'BANK_TRANSFER',
    reference_number: ''
  });

  const handleReceiptSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/payment-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receiptData)
      });
      const data = await res.json();
      if (data.success) {
        alert(`Receipt Generated & Ledger Updated! Ref: ${data.receipt_number}`);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      alert(`Network Error: ${err.message}`);
    }
  };

  const handlePrintPdf = () => {
    if (!invoiceIdForPdf) return alert('Enter Invoice ID');
    window.open(`/api/sales-invoice/${invoiceIdForPdf}/pdf`, '_blank');
  };

  return (
    <div style={{ maxWidth: '900px', margin: '20px auto', padding: '20px', fontFamily: 'Arial' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setActiveTab('receipt')} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          Module 2: Add Payment Receipt
        </button>
        <button onClick={() => setActiveTab('pdf')} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          Module 3: Print GST PDF Invoice
        </button>
      </div>

      {activeTab === 'receipt' && (
        <form onSubmit={handleReceiptSubmit} style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '5px' }}>
          <h3>Record Customer Payment & Auto Ledger Knock-off</h3>
          <input 
            type="text" 
            placeholder="Customer UUID" 
            value={receiptData.customer_id} 
            onChange={e => setReceiptData({...receiptData, customer_id: e.target.value})} 
            required style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
          />
          <input 
            type="number" 
            placeholder="Amount Received (₹)" 
            value={receiptData.amount_received} 
            onChange={e => setReceiptData({...receiptData, amount_received: parseFloat(e.target.value)})} 
            required style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
          />
          <select 
            value={receiptData.payment_mode} 
            onChange={e => setReceiptData({...receiptData, payment_mode: e.target.value})}
            style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
          >
            <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
            <option value="UPI">UPI Payment</option>
            <option value="CASH">Cash</option>
            <option value="CHEQUE">Cheque</option>
          </select>
          <input 
            type="text" 
            placeholder="Reference/Transaction No." 
            value={receiptData.reference_number} 
            onChange={e => setReceiptData({...receiptData, reference_number: e.target.value})} 
            style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
          />
          <button type="submit" style={{ background: '#28a745', color: '#fff', border: 'none', padding: '10px 20px', cursor: 'pointer' }}>
            Save Receipt & Post Ledger
          </button>
        </form>
      )}

      {activeTab === 'pdf' && (
        <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '5px' }}>
          <h3>Print Printable GST PDF Invoice</h3>
          <input 
            type="text" 
            placeholder="Enter Invoice UUID" 
            value={invoiceIdForPdf} 
            onChange={e => setInvoiceIdForPdf(e.target.value)} 
            style={{ width: '70%', padding: '8px', marginRight: '10px' }}
          />
          <button onClick={handlePrintPdf} style={{ background: '#007bff', color: '#fff', border: 'none', padding: '8px 16px', cursor: 'pointer' }}>
            Generate & View PDF
          </button>
        </div>
      )}
    </div>
  );
}
