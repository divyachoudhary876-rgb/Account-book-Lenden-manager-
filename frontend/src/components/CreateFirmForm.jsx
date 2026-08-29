import React, { useState } from 'react';

export default function CreateFirmForm() {
  const [formData, setFormData] = useState({
    legal_name: '',
    trade_name: '',
    gstin: '',
    business_type_id: '',
    is_custom_business_type: false,
    custom_business_type_name: ''
  });
  const [loading, setLoading] = useState(false);

  const handleTypeChange = (e) => {
    const selectedValue = e.target.value;
    if (selectedValue === 'OTHER') {
      setFormData(prev => ({ 
        ...prev, 
        business_type_id: '', 
        is_custom_business_type: true 
      }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        business_type_id: selectedValue, 
        is_custom_business_type: false, 
        custom_business_type_name: '' 
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/v1/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        alert('Firm Created Successfully!');
        setFormData({
          legal_name: '',
          trade_name: '',
          gstin: '',
          business_type_id: '',
          is_custom_business_type: false,
          custom_business_type_name: ''
        });
      } else {
        alert('Error: ' + (data.error || 'Failed to create firm'));
      }
    } catch (err) {
      alert('Network error submitting form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.cardContainer}>
      <h2 style={{ color: '#0f172a', marginBottom: '16px' }}>⚙️ Firm Setup & Onboarding</h2>
      <form onSubmit={handleSubmit}>
        
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Legal Business Name *</label>
          <input 
            type="text" 
            required 
            placeholder="e.g. Acme Enterprises" 
            value={formData.legal_name}
            onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
            style={styles.input}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Trade Name (Optional)</label>
          <input 
            type="text" 
            placeholder="e.g. Acme Retail" 
            value={formData.trade_name}
            onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
            style={styles.input}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>GSTIN (Optional)</label>
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
            onChange={handleTypeChange}
            style={styles.input}
            required
          >
            <option value="">-- Select Category --</option>
            <option value="RETAIL">Retail Store / Supermarket</option>
            <option value="WHOLESALE">Wholesale Trader</option>
            <option value="MANUFACTURING">General Goods Manufacturing</option>
            <option value="SERVICES">Services / IT / Consulting</option>
            <option value="OTHER">Other / Custom Business</option>
          </select>
        </div>

        {formData.is_custom_business_type && (
          <div style={styles.fieldGroup}>
            <label style={{ ...styles.label, color: '#2563eb' }}>Specify Your Custom Business Type *</label>
            <input 
              type="text" 
              required
              placeholder="e.g. Solar Panel Maintenance & Supplies" 
              value={formData.custom_business_type_name}
              onChange={(e) => setFormData({ ...formData, custom_business_type_name: e.target.value })}
              style={{ ...styles.input, border: '2px solid #3b82f6' }}
            />
          </div>
        )}

        <button type="submit" style={styles.btnSubmit} disabled={loading}>
          {loading ? 'Saving Firm...' : '💾 Save & Create Firm'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  cardContainer: {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '24px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  fieldGroup: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    fontWeight: 'bold',
    fontSize: '13px',
    color: '#334155',
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  btnSubmit: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '15px',
    cursor: 'pointer',
    marginTop: '10px'
  }
};
