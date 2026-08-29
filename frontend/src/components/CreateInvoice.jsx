import React, { useState } from 'react';

export default function CreateInvoice({ organizationId = "ORG-101" }) {
  const [partyId, setPartyId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState([
    { item_name: '', qty: 1, rate: 0, gst_percent: 18 }
  ]);
  const [loading, setLoading] = useState(false);

  // Add Row
  const handleAddItem = () => {
    setItems([...items, { item_name: '', qty: 1, rate: 0, gst_percent: 18 }]);
  };

  // Remove Row
  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Update Item Fields
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // Tax & Totals Calculation
  const calculateTotals = () => {
    let subtotal = 0;
    let totalGst = 0;

    items.forEach(item => {
      const lineSubtotal = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
      const lineGst = (lineSubtotal * (parseFloat(item.gst_percent) || 0)) / 100;
      subtotal += lineSubtotal;
      totalGst += lineGst;
    });

    return {
      subtotal,
      totalGst,
      grandTotal: subtotal + totalGst
    };
  };

  const { subtotal, totalGst, grandTotal } = calculateTotals();

  // Submit Invoice to Backend API
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!partyId) return alert('Please select a customer!');

    setLoading(true);
    const payload = {
      organization_id: organizationId,
      party_id: partyId,
      invoice_date: invoiceDate,
      items,
      subtotal,
      tax_total: totalGst,
      grand_total: grandTotal
    };

    try {
      const res = await fetch('/api/v1/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert('Invoice Created Successfully!');
        setItems([{ item_name: '', qty: 1, rate: 0, gst_percent: 18 }]);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Network error while saving invoice.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={{ color: '#0f172a', marginBottom: '16px' }}>🧾 Fast Sales Invoice Entry</h2>
      <form onSubmit={handleSubmit}>
        
        {/* Header Inputs */}
        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>Select Customer / Debtor *</label>
            <select 
              value={partyId} 
              onChange={(e) => setPartyId(e.target.value)}
              style={styles.input}
              required
            >
              <option value="">-- Choose Party --</option>
              <option value="LED-3">Shree Ram Traders</option>
              <option value="LED-4">Jaipur BioFuels</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>Invoice Date</label>
            <input 
              type="date" 
              value={invoiceDate} 
              onChange={(e) => setInvoiceDate(e.target.value)} 
              style={styles.input} 
            />
          </div>
        </div>

        {/* Dynamic Items Table */}
        <table style={styles.table}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={styles.th}>Item Particulars</th>
              <th style={{ ...styles.th, width: '80px' }}>Qty</th>
              <th style={{ ...styles.th, width: '120px' }}>Rate (₹)</th>
              <th style={{ ...styles.th, width: '100px' }}>GST %</th>
              <th style={{ ...styles.th, width: '120px', textAlign: 'right' }}>Total (₹)</th>
              <th style={{ ...styles.th, width: '50px' }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const lineTotal = (item.qty || 0) * (item.rate || 0) * (1 + (item.gst_percent || 0)/100);
              return (
                <tr key={index}>
                  <td style={styles.td}>
                    <input 
                      type="text" 
                      placeholder="Item name / description" 
                      value={item.item_name}
                      onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                      style={styles.tableInput}
                      required
                    />
                  </td>
                  <td style={styles.td}>
                    <input 
                      type="number" 
                      min="1" 
                      value={item.qty}
                      onChange={(e) => handleItemChange(index, 'qty', parseFloat(e.target.value) || 0)}
                      style={styles.tableInput}
                    />
                  </td>
                  <td style={styles.td}>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={item.rate}
                      onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                      style={styles.tableInput}
                    />
                  </td>
                  <td style={styles.td}>
                    <select 
                      value={item.gst_percent}
                      onChange={(e) => handleItemChange(index, 'gst_percent', parseFloat(e.target.value))}
                      style={styles.tableInput}
                    >
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>
                    ₹{lineTotal.toFixed(2)}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveItem(index)}
                      style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <button 
          type="button" 
          onClick={handleAddItem} 
          style={styles.btnAddRow}
        >
          + Add Item Row
        </button>

        {/* Calculation Summary Card */}
        <div style={styles.summaryCard}>
          <div>Subtotal: <strong>₹{subtotal.toFixed(2)}</strong></div>
          <div>GST Tax: <strong>₹{totalGst.toFixed(2)}</strong></div>
          <div style={{ fontSize: '16px', color: '#2563eb', marginTop: '4px' }}>
            Grand Total: <strong>₹{grandTotal.toFixed(2)}</strong>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          style={styles.btnSubmit}
        >
          {loading ? 'Saving Invoice...' : '💾 Save & Generate Invoice'}
        </button>

      </form>
    </div>
  );
}

const styles = {
  container: { maxWidth: '800px', margin: '0 auto', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  label: { display: 'block', fontWeight: 'bold', fontSize: '12px', color: '#334155', marginBottom: '4px' },
  input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  th: { border: '1px solid #cbd5e1', padding: '8px', fontSize: '12px', textAlign: 'left' },
  td: { border: '1px solid #e2e8f0', padding: '6px' },
  tableInput: { width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '13px' },
  btnAddRow: { marginTop: '10px', padding: '8px 14px', backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  summaryCard: { marginTop: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', textAlign: 'right', fontSize: '13px' },
  btnSubmit: { width: '100%', marginTop: '16px', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }
};
