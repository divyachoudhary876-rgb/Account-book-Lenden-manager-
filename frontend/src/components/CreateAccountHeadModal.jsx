// frontend/src/components/CreateAccountHeadModal.jsx

import React, { useState } from 'react';

export default function CreateAccountHeadModal({ firmId, onAccountCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    primary_type: 'ASSET',
    sub_group: 'SUNDRY_DEBTOR',
    opening_balance: 0,
    opening_balance_type: 'Dr'
  });

  const subGroupMapping = {
    ASSET: [
      { code: 'SUNDRY_DEBTOR', label: 'Sundry Debtors (Customers)' },
      { code: 'CASH', label: 'Cash-in-Hand' },
      { code: 'BANK', label: 'Bank Accounts' },
      { code: 'FIXED_ASSET', label: 'Fixed Assets (Machinery/Land/Plant)' }
    ],
    LIABILITY: [
      { code: 'SUNDRY_CREDITOR', label: 'Sundry Creditors (Suppliers)' },
      { code: 'DUTIES_AND_TAXES', label: 'Duties & Taxes (GST Output/TDS Payable)' },
      { code: 'CURRENT_LIABILITY', label: 'Current Liabilities' }
    ],
    EQUITY: [
      { code: 'CAPITAL_ACCOUNT', label: 'Owner Capital / Partner Equity' },
      { code: 'RESERVES', label: 'Retained Earnings & Reserves' }
    ],
    INCOME: [
      { code: 'DIRECT_INCOME', label: 'Sales / Direct Operating Revenue' },
      { code: 'INDIRECT_INCOME', label: 'Indirect Income (Interest/Discount)' }
    ],
    EXPENSE: [
      { code: 'DIRECT_EXPENSE', label: 'Purchase / Freight / Direct Expense' },
      { code: 'INDIRECT_EXPENSE', label: 'Indirect Expense (Rent/Salaries/Utility)' }
    ]
  };

  const handlePrimaryTypeChange = (e) => {
    const selectedType = e.target.value;
    setFormData({
      ...formData,
      primary_type: selectedType,
      sub_group: subGroupMapping[selectedType][0].code
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert('Account / Party Name enter karein!');

    try {
      const res = await fetch('/api/v1/account-heads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, organization_id: firmId })
      });
      const data = await res.json();
      if (data.success) {
        alert('Naya Account Head accounting rules ke mutabiq save ho gaya hai!');
        setFormData({ name: '', primary_type: 'ASSET', sub_group: 'SUNDRY_DEBTOR', opening_balance: 0, opening_balance_type: 'Dr' });
        if (onAccountCreated) onAccountCreated(data.data);
      } else {
        alert('Error: ' + (data.error || 'Failed to create account head'));
      }
    } catch (err) {
      alert('Network error while creating account.');
    }
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>➕ Create Ledger Account (Chart of Accounts)</h3>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div>
          <label style={styles.label}>Account / Party Name *</label>
          <input 
            type="text" 
            required 
            placeholder="e.g. Shyam Steel Traders / Factory Rent"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={styles.input} 
          />
        </div>

        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>1. Primary Account Type *</label>
            <select value={formData.primary_type} onChange={handlePrimaryTypeChange} style={styles.input}>
              <option value="ASSET">Assets (संपत्ति)</option>
              <option value="LIABILITY">Liabilities (देनदारियां)</option>
              <option value="EQUITY">Equity / Capital (पूंजी)</option>
              <option value="INCOME">Income / Revenue (आय)</option>
              <option value="EXPENSE">Expense (खर्च)</option>
            </select>
          </div>

          <div>
            <label style={styles.label}>2. Accounting Sub-Group *</label>
            <select 
              value={formData.sub_group} 
              onChange={(e) => setFormData({ ...formData, sub_group: e.target.value })}
              style={styles.input}
            >
              {subGroupMapping[formData.primary_type].map(sub => (
                <option key={sub.code} value={sub.code}>{sub.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>Opening Balance (₹)</label>
            <input 
              type="number" 
              step="0.01"
              value={formData.opening_balance}
              onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
              style={styles.input} 
            />
          </div>

          <div>
            <label style={styles.label}>Balance Type</label>
            <select 
              value={formData.opening_balance_type} 
              onChange={(e) => setFormData({ ...formData, opening_balance_type: e.target.value })}
              style={styles.input}
            >
              <option value="Dr">Debit (Dr)</option>
              <option value="Cr">Credit (Cr)</option>
            </select>
          </div>
        </div>

        <button type="submit" style={styles.btnPrimary}>💾 Save Account Head</button>
      </form>
    </div>
  );
}

const styles = {
  card: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', maxWidth: '650px', margin: '0 auto' },
  title: { margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  label: { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' },
  input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' },
  btnPrimary: { padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }
};
