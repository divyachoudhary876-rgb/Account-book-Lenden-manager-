// frontend/src/components/CreateInvoice.jsx

import React, { useState, useEffect } from 'react';
import { processSalesInvoicePosting } from '../utils/salesPostingEngine';

export default function CreateInvoice({ firm }) {
  const industryType = firm?.industry_type || 'BRICK_KILN';

  const [parties, setParties] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Dynamic Industry Meta States
  const [truckNo, setTruckNo] = useState('');
  const [slipNo, setSlipNo] = useState('');
  const [grossWeight, setGrossWeight] = useState('');
  const [tareWeight, setTareWeight] = useState('');
  
  // Amounts
  const [taxableAmount, setTaxableAmount] = useState('');
  const [gstRate, setGstRate] = useState('18');
  const [narration, setNarration] = useState('');

  const loadParties = () => {
    const saved = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
    const debtors = saved.filter(a => a.sub_group === 'SUNDRY_DEBTORS' || a.primary_type === 'ASSET');
    setParties(debtors);
    if (debtors.length > 0 && !selectedCustomer) setSelectedCustomer(debtors[0].id);
  };

  useEffect(() => { loadParties(); }, []);

  const handleSaveInvoice = (e) => {
    e.preventDefault();
    if (!selectedCustomer) return alert("❌ Kripya Customer Party select karein!");

    try {
      processSalesInvoicePosting({
        customerId: selectedCustomer,
        invoiceDate,
        taxableAmount,
        gstRate,
        narration: `${industryType === 'BRICK_KILN' ? `Truck: ${truckNo}, Slip: ${slipNo} | ` : ''}${narration}`
      });

      alert("✓ Sales Invoice Posted! Ledger, Day Book & Dashboard figures updated.");
      setTaxableAmount('');
      setTruckNo('');
      setSlipNo('');
      setNarration('');
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: '720px', margin: '0 auto' }}>
      
      <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: '10px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f172a' }}>
            🧾 {industryType === 'BRICK_KILN' ? '🧱 ईंट भट्ठा सेल्स बिल एंट्री (Brick Sales)' : industryType === 'BIOMASS_BRIQUETTE' ? '🌱 बायोमास ब्रिकेट सेल्स इनवॉइस' : '🛒 Sales Invoice Entry'}
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Firm: <strong>{firm?.legal_name}</strong> | Industry: <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{industryType}</span></span>
        </div>
      </div>

      <form onSubmit={handleSaveInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Customer Selection & Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Select Customer / Party *</label>
            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} style={inputStyle} required>
              {parties.map(p => <option key={p.id} value={p.id}>{p.name} {p.gstin ? `(GST: ${p.gstin})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Invoice Date *</label>
            <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} style={inputStyle} required />
          </div>
        </div>

        {/* DYNAMIC FIELD RENDER BASED ON FIRM INDUSTRY TYPE */}
        {industryType === 'BRICK_KILN' && (
          <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>गाड़ी / ट्रक नंबर (Truck No.)</label>
              <input type="text" placeholder="RJ31-GA-1234" value={truckNo} onChange={e => setTruckNo(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>पर्ची नंबर / निकासी स्लिप No.</label>
              <input type="text" placeholder="SLIP-5021" value={slipNo} onChange={e => setSlipNo(e.target.value)} style={inputStyle} />
            </div>
          </div>
        )}

        {industryType === 'BIOMASS_BRIQUETTE' && (
          <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>धर्म कांटा ग्रॉस वेट (Gross Weight Tonne)</label>
              <input type="number" placeholder="25.50" value={grossWeight} onChange={e => setGrossWeight(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>खाली गाड़ी वेट (Tare Weight Tonne)</label>
              <input type="number" placeholder="10.20" value={tareWeight} onChange={e => setTareWeight(e.target.value)} style={inputStyle} />
            </div>
          </div>
        )}

        {/* Billing Amount */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Taxable Amount (₹) *</label>
            <input type="number" step="0.01" placeholder="25000.00" value={taxableAmount} onChange={(e) => setTaxableAmount(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>GST Tax Rate (%)</label>
            <select value={gstRate} onChange={(e) => setGstRate(e.target.value)} style={inputStyle}>
              <option value="0">0% (Exempted)</option>
              <option value="5">5% GST</option>
              <option value="12">12% GST</option>
              <option value="18">18% GST</option>
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Particulars / Narration</label>
          <input type="text" placeholder="Sales dispatch details..." value={narration} onChange={(e) => setNarration(e.target.value)} style={inputStyle} />
        </div>

        <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}>
          💾 Save & Post Dynamic Invoice
        </button>

      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };
