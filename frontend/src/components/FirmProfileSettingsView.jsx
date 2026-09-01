// frontend/src/components/FirmProfileSettingsView.jsx

import React, { useState, useEffect } from 'react';
import { updateFirmProfile, getFirmsRegistry, setActiveFirmId, deleteFirmProfile } from '../utils/multiFirmEngine.js';
import { INDUSTRY_SECTORS } from '../utils/industryEngine.js';

export default function FirmProfileSettingsView({ firm, onNavigateToCreate, onNavigateDashboard }) {
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [category, setCategory] = useState('TRADING');
  const [gstin, setGstin] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [allFirms, setAllFirms] = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);

  const loadCurrentFirmData = () => {
    if (firm) {
      setLegalName(firm.legal_name || firm.name || '');
      setTradeName(firm.trade_name || '');
      setCategory(firm.category || firm.business_category || 'TRADING');
      setGstin(firm.gstin === 'UNREGISTERED' ? '' : (firm.gstin || ''));
      setPhone(firm.phone || '');
      setAddress(firm.address || '');
    }
    setAllFirms(getFirmsRegistry());
  };

  useEffect(() => {
    loadCurrentFirmData();
  }, [firm]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!legalName.trim()) {
      alert("⚠️ Legal Business Name is required.");
      return;
    }

    try {
      updateFirmProfile(firm.id, {
        legal_name: legalName.trim(),
        trade_name: tradeName.trim() || legalName.trim(),
        category: category,
        business_category: category,
        gstin: gstin.trim().toUpperCase() || 'UNREGISTERED',
        phone: phone.trim(),
        address: address.trim()
      });

      setStatusMessage({ type: 'success', text: `✓ Firm profile "${legalName.trim()}" updated successfully!` });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      setStatusMessage({ type: 'error', text: `❌ ${err.message}` });
    }
  };

  const handleDeleteFirm = (targetFirm) => {
    if (allFirms.length <= 1) {
      alert("⚠️ You cannot delete the only existing firm. Please create a new firm first.");
      return;
    }

    const confirmMsg = `⚠️ DANGER: Are you sure you want to permanently delete "${targetFirm.legal_name}"?\nAll related accounts, vouchers, and inventory will be erased.`;
    if (window.confirm(confirmMsg)) {
      deleteFirmProfile(targetFirm.id);
      loadCurrentFirmData();
    }
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '30px' }}>
      
      {/* Top Action Header */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px 20px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '19px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚙️</span> Firm Profile & Settings
          </h2>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Edit registration details, statutory GSTIN, and business classifications</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={onNavigateDashboard}
            style={{ backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ← Dashboard
          </button>
          <button
            type="button"
            onClick={onNavigateToCreate}
            style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ➕ Register New Firm
          </button>
        </div>
      </div>

      {statusMessage && (
        <div style={{
          backgroundColor: statusMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${statusMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: statusMessage.type === 'success' ? '#065f46' : '#b91c1c',
          padding: '12px 16px',
          borderRadius: '10px',
          fontSize: '12px',
          fontWeight: '700'
        }}>
          {statusMessage.text}
        </div>
      )}

      {/* Edit Form */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '16px' }}>
          <strong style={{ fontSize: '14px', color: '#0f172a' }}>✏️ Edit Active Firm ({firm?.id})</strong>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Legal Business Name *</label>
              <input
                type="text"
                value={legalName}
                onChange={e => setLegalName(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Trade Name / Brand (वैकल्पिक)</label>
              <input
                type="text"
                value={tradeName}
                onChange={e => setTradeName(e.target.value)}
                style={inputStyle}
                placeholder="e.g. Neelkanth Group"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Business Category & Industry *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{ ...inputStyle, fontWeight: 'bold', backgroundColor: '#f8fafc' }}
              >
                {Object.entries(INDUSTRY_SECTORS).map(([secKey, sec]) => (
                  <optgroup key={secKey} label={sec.label}>
                    {sec.categories.map(cat => (
                      <option key={cat.code} value={cat.code}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>GSTIN Number</label>
              <input
                type="text"
                value={gstin}
                onChange={e => setGstin(e.target.value)}
                style={inputStyle}
                placeholder="08AAAAA0000A1Z5"
                maxLength={15}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Contact Mobile</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={inputStyle}
                placeholder="98290XXXXX"
              />
            </div>

            <div>
              <label style={labelStyle}>Address</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                style={inputStyle}
                placeholder="Factory / Office Address"
              />
            </div>
          </div>

          <div style={{ marginTop: '6px', textAlign: 'right' }}>
            <button
              type="submit"
              style={{
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
              }}
            >
              💾 Update Firm Profile
            </button>
          </div>
        </form>
      </div>

      {/* Multi-Firm Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '14px' }}>
          <strong style={{ fontSize: '14px', color: '#0f172a' }}>🏢 Registered Firms Directory ({allFirms.length})</strong>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Firm / Business Name</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Category</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>GSTIN</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allFirms.map(f => {
                const isActive = f.id === firm?.id;
                return (
                  <tr key={f.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: isActive ? '#f0fdf4' : '#ffffff' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#1e293b' }}>
                      {f.legal_name}
                      {f.trade_name && f.trade_name !== f.legal_name && (
                        <div style={{ fontSize: '10px', color: '#64748b' }}>Brand: {f.trade_name}</div>
                      )}
                    </td>
                    <td style={{ padding: '10px', color: '#475569' }}>
                      <span style={{ backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                        {f.category || 'TRADING'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: '#64748b' }}>{f.gstin || 'UNREGISTERED'}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      {isActive ? (
                        <span style={{ color: '#059669', fontWeight: 'bold', backgroundColor: '#dcfce7', padding: '3px 8px', borderRadius: '12px', fontSize: '10px' }}>
                          ● Active
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveFirmId(f.id)}
                          style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          Switch
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteFirm(f)}
                        disabled={allFirms.length <= 1}
                        style={{
                          backgroundColor: allFirms.length <= 1 ? '#f1f5f9' : '#fee2e2',
                          color: allFirms.length <= 1 ? '#94a3b8' : '#b91c1c',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          cursor: allFirms.length <= 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#0f172a' };
