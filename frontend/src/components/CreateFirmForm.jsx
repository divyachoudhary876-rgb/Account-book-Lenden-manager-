// frontend/src/components/CreateFirmForm.jsx

import React, { useState, useEffect } from 'react';
import { getAllFirms, saveOrUpdateFirm, switchActiveFirm } from '../utils/multiFirmEngine.js';

export default function CreateFirmForm({ onSave, existingFirm }) {
  const [firmsList, setFirmsList] = useState([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    legal_name: '',
    industry_type: 'BRICK_KILN',
    gstin: '',
    office_address: '',
    contact_mobile: ''
  });

  useEffect(() => {
    loadFirmsData();
  }, [existingFirm]);

  const loadFirmsData = () => {
    const list = getAllFirms();
    setFirmsList(list);

    if (existingFirm && existingFirm.id && !isCreatingNew) {
      setFormData(existingFirm);
    } else {
      setFormData({
        id: '',
        legal_name: '',
        industry_type: 'BRICK_KILN',
        gstin: '',
        office_address: '',
        contact_mobile: ''
      });
    }
  };

  const handleStartNewFirm = () => {
    setIsCreatingNew(true);
    setFormData({
      id: '',
      legal_name: '',
      industry_type: 'TRADING',
      gstin: '',
      office_address: '',
      contact_mobile: ''
    });
  };

  const handleSwitch = (firmId) => {
    try {
      const switched = switchActiveFirm(firmId);
      setIsCreatingNew(false);
      if (onSave) onSave(switched);
      alert(`✓ Switched to firm: ${switched.legal_name}`);
    } catch (err) {
      alert(`❌ Switch Error: ${err.message}`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.legal_name.trim()) return alert("❌ Please enter Legal Firm Name.");

    try {
      const saved = saveOrUpdateFirm(formData);
      setIsCreatingNew(false);
      alert(`✓ Firm profile "${saved.legal_name}" saved successfully!`);
      if (onSave) onSave(saved);
      loadFirmsData();
    } catch (err) {
      alert(`❌ Error saving firm: ${err.message}`);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      
      {/* Top Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f172a' }}>⚙️ Business Firm Management</h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Manage profiles or switch between registered business entities</span>
        </div>

        {!isCreatingNew && (
          <button
            onClick={handleStartNewFirm}
            style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '9px 15px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
          >
            ➕ Create New Business Firm
          </button>
        )}
      </div>

      {/* 1. All Created Firms Directory Card List */}
      {!isCreatingNew && firmsList.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#334155', fontSize: '13px' }}>🏢 Registered Business Firms List</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
            {firmsList.map(f => {
              const isActive = existingFirm?.id === f.id;
              return (
                <div
                  key={f.id}
                  style={{
                    backgroundColor: isActive ? '#f0f9ff' : '#f8fafc',
                    border: isActive ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    padding: '12px',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>
                      {f.legal_name} {isActive && <span style={{ fontSize: '10px', backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>Active Firm</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      GSTIN: {f.gstin || 'Unregistered'} | Category: {f.industry_type}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    {!isActive && (
                      <button
                        onClick={() => handleSwitch(f.id)}
                        style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        ⚡ Switch & Open
                      </button>
                    )}
                    <button
                      onClick={() => { setIsCreatingNew(true); setFormData(f); }}
                      style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      ✏️ Edit Profile
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Firm Form (Edit Existing / Create New) */}
      {(isCreatingNew || firmsList.length === 0 || formData.id) && (
        <form onSubmit={handleSubmit} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>
            {formData.id ? `✏️ Edit Profile: ${formData.legal_name}` : '➕ Setup & Create New Business Firm'}
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Firm Legal / Trade Name *</label>
              <input type="text" placeholder="e.g. Neelkanth Groups" value={formData.legal_name} onChange={e => setFormData({...formData, legal_name: e.target.value})} style={inputStyle} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Business Industry / Category *</label>
                <select value={formData.industry_type} onChange={e => setFormData({...formData, industry_type: e.target.value})} style={inputStyle}>
                  <option value="BRICK_KILN">Brick Kiln (ईंट भट्ठा)</option>
                  <option value="TRADING">Wholesale & Retail Trading</option>
                  <option value="MANUFACTURING">General Manufacturing</option>
                  <option value="SERVICES">Services & Consulting</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>GSTIN Number (Optional)</label>
                <input type="text" placeholder="08AAAAA0000A1Z5" value={formData.gstin} onChange={e => setFormData({...formData, gstin: e.target.value})} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Factory / Office Address</label>
                <input type="text" placeholder="RIICO Industrial Area, Hanumangarh" value={formData.office_address} onChange={e => setFormData({...formData, office_address: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Contact Mobile Number</label>
                <input type="text" placeholder="98290XXXXX" value={formData.contact_mobile} onChange={e => setFormData({...formData, contact_mobile: e.target.value})} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit" style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                💾 {formData.id ? 'Save Profile Updates' : 'Initialize & Create Firm'}
              </button>
              {isCreatingNew && (
                <button type="button" onClick={() => setIsCreatingNew(false)} style={{ backgroundColor: '#94a3b8', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>
      )}

    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };
