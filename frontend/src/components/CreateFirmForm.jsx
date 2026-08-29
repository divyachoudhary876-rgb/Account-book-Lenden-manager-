import React, { useState } from 'react';

export default function CreateFirmForm({ onFirmCreated }) {
  const [formData, setFormData] = useState({
    legal_name: '',
    trade_name: '',
    gstin: '',
    business_type: 'MANUFACTURING',
    custom_type: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.legal_name.trim()) return alert('Firm Legal Name enter karein!');

    const newFirmData = {
      ...formData,
      id: `FIRM-${Date.now()}`
    };

    if (onFirmCreated) {
      onFirmCreated(newFirmData);
    } else {
      localStorage.setItem('active_firm_profile', JSON.stringify(newFirmData));
      alert('Firm Created Successfully!');
      window.location.reload();
    }
  };

  return (
    <div style={styles.cardContainer}>
      <h3 style={{ color: '#0f172a', marginBottom: '8px' }}>🏢 Create New Firm / Organization</h3>
      <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>Pehle apni business details setup karein taaki billing aur accounting ledger initialize ho sakein.</p>

      <form onSubmit={handleSubmit}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Firm / Business Legal Name *</label>
          <input 
            type="text" 
            required 
            placeholder="e.g. Neelkanth Bricks & Biomass Unit" 
            value={formData.legal_name}
            onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
            style={styles.input}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Trade Name / Brand (Optional)</label>
          <input 
            type="text" 
            placeholder="e.g. Neelkanth Group" 
            value={formData.trade_name}
            onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
            style={styles.input}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>GSTIN Registration No (Optional)</label>
          <input 
            type="text" 
            placeholder="e.g. 08AAAAA0000A1Z5" 
            value={formData.gstin}
            onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
            style={styles.input}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Business Type / Category *</label>
          <select 
            value={formData.business_type}
            onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
            style={styles.input}
          >
            <option value="BRICK_KILN">Brick Kiln / Int Bhatta Manufacturing</option>
            <option value="BIOMASS">Biomass Briquettes / Biofuel Unit</option>
            <option value="RETAIL">Retail Store / Trading</option>
            <option value="SERVICES">Services / Consulting</option>
            <option value="OTHER">Other / Custom Business</option>
          </select>
        </div>

        {formData.business_type === 'OTHER' && (
          <div style={styles.fieldGroup}>
            <label style={{ ...styles.label, color: '#2563eb' }}>Specify Custom Business Type *</label>
            <input 
              type="text" 
              required
              placeholder="Specify business type" 
              value={formData.custom_type}
              onChange={(e) => setFormData({ ...formData, custom_type: e.target.value })}
              style={{ ...styles.input, border: '2px solid #3b82f6' }}
            />
          </div>
        )}

        <button type="submit" style={styles.btnSubmit}>
          🚀 Create Firm & Start Accounting
        </button>
      </form>
    </div>
  );
}

const styles = {
  cardContainer: { maxWidth: '500px', margin: '20px auto', padding: '24px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  fieldGroup: { marginBottom: '14px' },
  label: { display: 'block', fontWeight: 'bold', fontSize: '12px', color: '#334155', marginBottom: '4px' },
  input: { width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' },
  btnSubmit: { width: '100%', padding: '12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: '10px' }
};
