// frontend/src/components/CreateFirmForm.jsx

import React, { useState, useEffect } from 'react';
import { getAllFirms, saveOrUpdateFirm, switchActiveFirm } from '../utils/multiFirmEngine.js';

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
    loadFirmsData();
  }, [existingFirm]);

  const loadFirmsData = () => {
    const list = getAllFirms();
    setFirmsList(list);
  };

  const handleOpenCreateModal = () => {
    setEditingFirm(null);
    setFormData({
      id: '',
      legal_name: '',
      industry_type: 'TRADING',
      gstin: '',
      office_address: '',
      contact_mobile: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (firmToEdit) => {
    setEditingFirm(firmToEdit);
    setFormData(firmToEdit);
    setIsModalOpen(true);
  };

  const handleSwitch = (firmId) => {
    try {
      const switched = switchActiveFirm(firmId);
      if (onSave) onSave(switched);
      alert(`✓ Switched to active firm: ${switched.legal_name}`);
      loadFirmsData();
    } catch (err) {
      alert(`❌ Switch Error: ${err.message}`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.legal_name.trim()) return alert("❌ Please enter Legal Firm Name.");

    try {
      const saved = saveOrUpdateFirm(formData);
      setIsModalOpen(false);
      alert(`✓ Business Firm "${saved.legal_name}" saved successfully!`);
      if (onSave) onSave(saved);
      loadFirmsData();
    } catch (err) {
      alert(`❌ Error saving firm: ${err.message}`);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      
      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>🏢 Business Entity & Firm Settings</h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Switch active firm context or add new business entities</span>
        </div>

        <button
          onClick={handleOpenCreateModal}
          style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
        >
          ➕ Create New Business Firm
        </button>
      </div>

      {/* Clean Directory Cards View */}
      {firmsList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <p style={{ margin: 0, color: '#64748b', fontWeight: 'bold' }}>No business firms found. Click above to setup your first firm.</p>
        </div>
      ) : (
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
                    {isActive && <span style={{ fontSize: '10px', backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>Active</span>}
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
      )}

      {/* Professional Pop-up Modal Window for Create / Edit Firm */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '500px', borderRadius: '12px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '16px' }}>
                {editingFirm ? `✏️ Edit Profile: ${editingFirm.legal_name}` : '➕ Setup & Create New Business Firm'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Firm Legal / Trade Name *</label>
                <input type="text" placeholder="e.g. Neelkanth Groups" value={formData.legal_name} onChange={e => setFormData({...formData, legal_name: e.target.value})} style={inputStyle} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Business Industry / Category *</label>
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
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ backgroundColor: '#94a3b8', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                  💾 Save Profile
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
