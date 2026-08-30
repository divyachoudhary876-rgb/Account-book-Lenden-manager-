// frontend/src/components/CreateFirmForm.jsx

import React, { useState } from 'react';
import { initializeFirmWithIndustryDefaults } from '../utils/firmInitializationEngine';

export default function CreateFirmForm({ onSaved }) {
  const [legalName, setLegalName] = useState('');
  const [gstin, setGstin] = useState('');
  const [industryType, setIndustryType] = useState('BRICK_KILN');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!legalName.trim()) return alert("❌ Please enter Firm Legal Name!");

    const newFirm = initializeFirmWithIndustryDefaults({
      legal_name: legalName.trim(),
      gstin: gstin.trim(),
      industry_type: industryType,
      address: address.trim(),
      phone: phone.trim()
    });

    alert(`✓ Business Firm '${legalName}' created! Chart of Accounts & Inventory for '${industryType}' initialized.`);
    if (onSaved) onSaved(newFirm);
    window.location.reload();
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: '600px', margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>⚙️ Setup & Create New Business Firm</h3>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        <div>
          <label style={labelStyle}>Firm Legal / Trade Name *</label>
          <input type="text" placeholder="e.g. Neelkanth Groups / Sri Ram Brick Works" value={legalName} onChange={e => setLegalName(e.target.value)} style={inputStyle} required />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Business Industry / Category *</label>
            <select value={industryType} onChange={e => setIndustryType(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold', color: '#2563eb' }}>
              <option value="BRICK_KILN">🧱 Brick Kiln (ईंट भट्ठा उद्योग)</option>
              <option value="BIOMASS_BRIQUETTE">🌱 Biomass Briquette & Pellets (बायोमास ब्रिकेट)</option>
              <option value="GENERAL_TRADING">🛒 General Trading & Goods</option>
              <option value="SERVICES">💼 Professional Services / Agencies</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>GSTIN Number (Optional)</label>
            <input type="text" placeholder="08AAAAA0000A1Z5" value={gstin} onChange={e => setGstin(e.target.value)} style={inputStyle} maxLength="15" />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Factory / Office Address</label>
          <input type="text" placeholder="RIICO Industrial Area, Hanumangarh" value={address} onChange={e => setAddress(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Contact Mobile Number</label>
          <input type="text" placeholder="98290XXXXX" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
        </div>

        <button type="submit" style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: '10px' }}>
          💾 Initialize Firm & Auto-Generate Masters
        </button>

      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };
