// frontend/src/components/CreateFirmForm.jsx

import React, { useState, useEffect } from 'react';
import { getAllFirms, createInitialFirmProfile, saveOrUpdateFirm, switchActiveFirm } from '../utils/multiFirmEngine.js';

export default function CreateFirmForm({ onSave, existingFirm }) {
  const [firmsList, setFirmsList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFirm, setEditingFirm] = useState(null);

  const [formData, setFormData] = useState({
    id: '',
    legal_name: '',
    industry_type: 'TRADING',
    gstin: '',
    office_address: '',
    contact_mobile: ''
  });

  useEffect(() => {
    loadFirmsList();
  }, [existingFirm]);

  const loadFirmsList = () => {
    const list = getAllFirms();
    setFirmsList(list);
  };

  const handleOpenCreateModal = () => {
    setEditingFirm(null);
    setFormData({ id: '', legal_name: '', industry_type: 'TRADING', gstin: '', office_address: '', contact_mobile: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (f) => {
    setEditingFirm(f);
    setFormData(f);
    setIsModalOpen(true);
  };

  const handleSwitch = (firmId) => {
    try {
      const switched = switchActiveFirm(firmId);
      if (onSave) onSave(switched);
      loadFirmsList();
    } catch (err) {
      alert(`❌ Error switching firm: ${err.message}`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.legal_name.trim()) return alert("❌ Please enter Legal Business/Firm Name.");

    try {
      const saved = formData.id ? saveOrUpdateFirm(formData) : createInitialFirmProfile(formData);
      setIsModalOpen(false);
      if (onSave) onSave(saved);
      loadFirmsList();
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  // FIRST-TIME USER LANDING HERO SCREEN (Zero Firms State)
  if (firmsList.length === 0 && !isModalOpen) {
    return (
      <div style={{ padding: '24px 16px', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
        
        {/* Professional Brand Hero Card */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px 20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
          
          <div style={{ width: '60px', height: '60px', backgroundColor: '#1e3a8a', color: '#ffffff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', fontSize: '24px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(30,58,138,0.25)' }}>
            AB
          </div>

          <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', color: '#0f172a' }}>Welcome to Account Book</h2>
          <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
            Enterprise Multi-Tenant Accounting, GST Billing & Stock Management Engine.
          </p>

          {/* Quick Feature Chips */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px', textAlign: 'left' }}>
            <div style={featureChipStyle}>📊 Live P&L & Balance Sheet</div>
            <div style={featureChipStyle}>🧾 GST B2B & B2C Billing</div>
            <div style={featureChipStyle}>📦 Stock Inventory Control</div>
            <div style={featureChipStyle}>🔒 Public Device Local Backup</div>
          </div>

          {/* Primary Action Target */}
          <button
            onClick={handleOpenCreateModal}
            style={{ width: '100%', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}
          >
            🚀 Setup Your First Business Firm
          </button>

        </div>

      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      
      {/* Directory Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>🏢 Business Entity & Firm Settings</h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Switch active context or register new entities</span>
        </div>

        <button
          onClick={handleOpenCreateModal}
          style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
        >
          ➕ Create New Business Firm
        </button>
      </div>

      {/* Directory List Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {firmsList.map(f => {
          const isActive = existingFirm?.id === f.id;
          return (
            <div
              key={f.id}
              style={{
                backgroundColor: isActive ? '#f0f9ff' : '#f8fafc',
                border: isActive ? '2px solid #2563eb' : '1px solid #cbd5e1',
                padding: '16px',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>{f.legal_name}</h4>
                  {isActive && <span style={{ fontSize: '10px', backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>Active Context</span>}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                  <strong>Category:</strong> {f.industry_type} | <strong>GSTIN:</strong> {f.gstin || 'Unregistered'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                {!isActive && (
                  <button
                    onClick={() => handleSwitch(f.id)}
                    style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}
                  >
                    ⚡ Switch Firm
                  </button>
                )}
                <button
                  onClick={() => handleOpenEditModal(f)}
                  style={{ backgroundColor: '#475569', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}
                >
                  ✏️ Edit Profile
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Professional Pop-up Overlay Modal for Firm Setup */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '500px', borderRadius: '12px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '16px' }}>
                {editingFirm ? `✏️ Edit Profile: ${editingFirm.legal_name}` : '🚀 Setup & Register New Business Firm'}
              </h3>
              {firmsList.length > 0 && (
                <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
              )}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Firm Legal / Trade Name *</label>
                <input type="text" placeholder="e.g. Neelkanth Groups / Sri Ram Traders" value={formData.legal_name} onChange={e => setFormData({...formData, legal_name: e.target.value})} style={inputStyle} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Business Category *</label>
                  <select value={formData.industry_type} onChange={e => setFormData({...formData, industry_type: e.target.value})} style={inputStyle}>
                    <option value="TRADING">Wholesale & Retail Trading</option>
                    <option value="BRICK_KILN">Brick Kiln (ईंट भट्ठा)</option>
                    <option value="MANUFACTURING">General Manufacturing</option>
                    <option value="SERVICES">Services & Consulting</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>GSTIN Number (Optional)</label>
                  <input type="text" placeholder="08AAAAA0000A1Z5" value={formData.gstin} onChange={e => setFormData({...formData, gstin: e.target.value})} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Office / Factory Address</label>
                <input type="text" placeholder="RIICO Industrial Area, Hanumangarh" value={formData.office_address} onChange={e => setFormData({...formData, office_address: e.target.value})} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Contact Mobile Number</label>
                <input type="text" placeholder="98290XXXXX" value={formData.contact_mobile} onChange={e => setFormData({...formData, contact_mobile: e.target.value})} style={inputStyle} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                {firmsList.length > 0 && (
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ backgroundColor: '#94a3b8', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                )}
                <button type="submit" style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                  💾 {formData.id ? 'Save Updates' : 'Initialize Firm Workspace'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };
const featureChipStyle = { backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', color: '#334155' };
