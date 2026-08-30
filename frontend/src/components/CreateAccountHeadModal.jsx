// frontend/src/components/CreateAccountHeadModal.jsx

import React, { useState } from 'react';
import { getSubGroupsByPrimary, saveOrUpdateAccountHead } from '../utils/accountMasterEngine.js';

export default function CreateAccountHeadModal({ firm, onClose }) {
  const [formData, setFormData] = useState({
    name: 'Propritor Capital A/C',
    primary_type: 'LIABILITIES', // Capital comes under Liabilities
    group_type: 'CAPITAL_ACCOUNT',
    opening_balance: '0',
    balance_type: 'Cr'
  });

  const handlePrimaryChange = (type) => {
    const groups = getSubGroupsByPrimary(type);
    setFormData({
      ...formData,
      primary_type: type,
      group_type: groups[0]?.id || '',
      balance_type: groups[0]?.defaultBal || 'Dr'
    });
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', maxWidth: '500px', margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>➕ Create Ledger Account</h3>

      <form style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Account / Party Name *</label>
          <input
            type="text"
            placeholder="e.g. Owner Capital A/C"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>1. Primary Account Type *</label>
            <select
              value={formData.primary_type}
              onChange={e => handlePrimaryChange(e.target.value)}
              style={inputStyle}
            >
              <option value="ASSETS">Assets (संपत्ति)</option>
              <option value="LIABILITIES">Liabilities (दायित्व)</option>
              <option value="INCOME">Income (आय)</option>
              <option value="EXPENSES">Expenses (व्यय)</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>2. Accounting Sub-Group *</label>
            <select
              value={formData.group_type}
              onChange={e => setFormData({ ...formData, group_type: e.target.value })}
              style={inputStyle}
            >
              {getSubGroupsByPrimary(formData.primary_type).map(g => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Opening Balance (₹)</label>
            <input
              type="number"
              value={formData.opening_balance}
              onChange={e => setFormData({ ...formData, opening_balance: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Balance Type</label>
            <select
              value={formData.balance_type}
              onChange={e => setFormData({ ...formData, balance_type: e.target.value })}
              style={inputStyle}
            >
              <option value="Cr">Credit (Cr)</option>
              <option value="Dr">Debit (Dr)</option>
            </select>
          </div>
        </div>
      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };
