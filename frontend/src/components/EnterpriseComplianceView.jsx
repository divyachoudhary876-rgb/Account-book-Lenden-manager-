import React, { useState } from 'react';

export default function EnterpriseComplianceView() {
  const [period, setPeriod] = useState('082026');
  const [invoiceId, setInvoiceId] = useState('');
  const [transporter, setTransporter] = useState({ VehicleNo: '', Distance: 100 });

  const downloadGSTR1 = () => {
    window.open(`/api/gst/gstr1/json?period=${period}`, '_blank');
  };

  const generateEInvoice = async () => {
    const res = await fetch('/api/gst/einvoice/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ invoice_id: invoiceId, transport_details: transporter })
    });
    const data = await res.json();
    if (data.success) {
      alert(`Generated IRN: ${data.irn}\nE-Way Bill: ${data.eway_bill_number}`);
    } else {
      alert(`Failed: ${data.message}`);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '20px auto', padding: '24px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>GST Compliance, Returns & E-Way Bill Hub</h2>

      {/* Module 2 UI */}
      <div style={{ padding: '16px', background: '#f8f9fa', marginBottom: '20px' }}>
        <h3>1. Direct GSTR-1 Portal JSON Export</h3>
        <input type="text" placeholder="Period (MMYYYY)" value={period} onChange={e => setPeriod(e.target.value)} style={{ padding: '8px', marginRight: '10px' }} />
        <button onClick={downloadGSTR1} style={{ background: '#28a745', color: '#fff', border: 'none', padding: '8px 16px', cursor: 'pointer' }}>
          Download Direct Portal JSON
        </button>
      </div>

      {/* Module 3 UI */}
      <div style={{ padding: '16px', background: '#f8f9fa' }}>
        <h3>2. E-Invoicing & E-Way Bill Generation (Invoices > ₹50,000)</h3>
        <input type="text" placeholder="Sales Invoice UUID" value={invoiceId} onChange={e => setInvoiceId(e.target.value)} style={{ display: 'block', width: '100%', padding: '8px', marginBottom: '10px' }} />
        <input type="text" placeholder="Vehicle Number (e.g. RJ14GC1234)" value={transporter.VehicleNo} onChange={e => setTransporter({...transporter, VehicleNo: e.target.value})} style={{ display: 'block', width: '100%', padding: '8px', marginBottom: '10px' }} />
        <button onClick={generateEInvoice} style={{ background: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', cursor: 'pointer' }}>
          Generate IRN & E-Way Bill
        </button>
      </div>
    </div>
  );
}
