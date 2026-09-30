// frontend/src/components/EnterpriseComplianceView.jsx

import React, { useState } from 'react';

export default function EnterpriseComplianceView({ firm, onClose }) {
  const [period, setPeriod] = useState('082026');
  const [invoiceId, setInvoiceId] = useState('');
  const [transporter, setTransporter] = useState({ VehicleNo: '', Distance: 100 });
  const [feedback, setFeedback] = useState(null);

  const downloadGSTR1 = () => {
    try {
      window.open(`/api/gst/gstr1/json?period=${period}`, '_blank');
    } catch (e) {
      alert("Portal JSON export trigger failed: " + e.message);
    }
  };

  const generateEInvoice = async () => {
    try {
      const res = await fetch('/api/gst/einvoice/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}` 
        },
        body: JSON.stringify({ invoice_id: invoiceId, transport_details: transporter })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `✓ Generated IRN: ${data.irn} | E-Way Bill: ${data.eway_bill_number}` });
      } else {
        setFeedback({ type: 'error', message: `❌ Failed: ${data.message || 'Unknown error'}` });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: `❌ Network / API Error: ${err.message}` });
    }
  };

  return (
    <div style={{ padding: '4px', maxWidth: '650px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', color: '#0f172a' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>REGULATORY PORTAL</div>
          <h2 style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>🏛️ GST Compliance, Returns & E-Way Bill Hub</h2>
        </div>
        {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Close</button>}
      </div>

      {feedback && (
        <div style={{ padding: '10px 14px', marginBottom: '14px', borderRadius: '8px', backgroundColor: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2', color: feedback.type === 'success' ? '#166534' : '#991b1b', fontWeight: '700', fontSize: '12px', border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
          {feedback.message}
        </div>
      )}

      {/* Module 1: GSTR-1 */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>1. Direct GSTR-1 Portal JSON Export</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="Period (MMYYYY)" 
            value={period} 
            onChange={e => setPeriod(e.target.value)} 
            style={inputStyle} 
          />
          <button onClick={downloadGSTR1} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '9px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            📥 Download JSON
          </button>
        </div>
      </div>

      {/* Module 2: E-Invoicing */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>2. E-Invoicing & E-Way Bill Generation (&gt; ₹50,000)</h3>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Sales Invoice UUID / ID</label>
          <input 
            type="text" 
            placeholder="e.g. INV-179069977" 
            value={invoiceId} 
            onChange={e => setInvoiceId(e.target.value)} 
            style={inputStyle} 
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Vehicle Number</label>
          <input 
            type="text" 
            placeholder="e.g. RJ31GA1234" 
            value={transporter.VehicleNo} 
            onChange={e => setTransporter({...transporter, VehicleNo: e.target.value})} 
            style={inputStyle} 
          />
        </div>

        <button onClick={generateEInvoice} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '11px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', width: '100%' }}>
          ⚡ Generate IRN & E-Way Bill
        </button>
      </div>

    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '9px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '11px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#0f172a'
};
