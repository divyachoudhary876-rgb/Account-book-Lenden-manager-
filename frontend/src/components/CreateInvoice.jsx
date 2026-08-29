import React, { useState } from 'react';

export default function CreateInvoice() {
  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState([{ item_id: '', quantity: 1, unit_price: 0 }]);

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addItemRow = () => setItems([...items, { item_id: '', quantity: 1, unit_price: 0 }]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      customer_id: customerId,
      invoice_date: invoiceDate,
      company_state_code: "08",
      items_list: items
    };

    try {
      const res = await fetch('/api/sales-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert(`Invoice Generated Successfully: ${data.invoice_number}`);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      alert(`Submission Failed: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '700px' }}>
      <h2>Create Sales Invoice</h2>
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          placeholder="Customer UUID" 
          value={customerId} 
          onChange={(e) => setCustomerId(e.target.value)} 
          required 
        /><br /><br />
        
        <input 
          type="date" 
          value={invoiceDate} 
          onChange={(e) => setInvoiceDate(e.target.value)} 
          required 
        /><br /><br />

        <h4>Line Items</h4>
        {items.map((row, idx) => (
          <div key={idx} style={{ marginBottom: '10px' }}>
            <input 
              type="text" 
              placeholder="Item UUID" 
              value={row.item_id} 
              onChange={(e) => handleItemChange(idx, 'item_id', e.target.value)} 
              required 
            />
            <input 
              type="number" 
              placeholder="Qty" 
              value={row.quantity} 
              onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value))} 
              required 
            />
            <input 
              type="number" 
              placeholder="Rate" 
              value={row.unit_price} 
              onChange={(e) => handleItemChange(idx, 'unit_price', parseFloat(e.target.value))} 
              required 
            />
          </div>
        ))}
        
        <button type="button" onClick={addItemRow}>+ Add Row</button><br /><br />
        <button type="submit" style={{ background: '#28a745', color: '#fff', border: 'none', padding: '10px 20px' }}>
          Generate Invoice
        </button>
      </form>
    </div>
  );
}
