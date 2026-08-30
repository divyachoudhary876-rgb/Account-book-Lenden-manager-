// frontend/src/components/CreateAccountHeadModal.jsx

import React, { useState, useEffect } from 'react';
import { getAccountHeadsByFirm, saveOrUpdateAccountHead } from '../utils/accountMasterEngine.js';

export default function CreateAccountHeadModal({ firm, onClose }) {
  const activeFirmId = firm?.id || 'FIRM-001';

  const [accountsList, setAccountsList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    primary_type: 'ASSETS',
    group_type: 'SUNDRY_DEBTORS',
    opening_balance: '0',
    balance_type: 'Dr',
    phone: '',
    gstin: ''
  });

  useEffect(() => {
    loadAccounts();
  }, [activeFirmId]);

  const loadAccounts = () => {
    const list = getAccountHeadsByFirm(activeFirmId);
    setAccountsList(list);
  };

  const handleOpenCreateModal = () => {
    setEditingAccount(null);
    setFormData({
      id: '',
      name: '',
      primary_type: 'ASSETS',
      group_type: 'SUNDRY_DEBTORS',
      opening_balance: '0',
      balance_type: 'Dr',
      phone: '',
      gstin: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (acc) => {
    setEditingAccount(acc);
    setFormData({
      ...acc,
      opening_balance: (acc.opening_balance || 0).toString()
    });
    setIsModalOpen(true);
  };

  const handlePrimaryTypeChange = (type) => {
    let group = 'SUNDRY_DEBTORS';
    let bal = 'Dr';

    if (type === 'LIABILITIES') {
      group = 'CAPITAL_ACCOUNT';
      bal = 'Cr';
    } else if (type === 'INCOME') {
      group = 'SALES_ACCOUNT';
      bal = 'Cr';
    } else if (type === 'EXPENSES') {
      group = 'PURCHASE_ACCOUNT';
      bal = 'Dr';
    }

    setFormData({
      ...formData,
      primary_type: type,
      group_type: group,
      balance_type: bal
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert("❌ Please enter Account / Party Name.");

    try {
      saveOrUpdateAccountHead(activeFirmId, formData);
      setIsModalOpen(false);
      alert(`✓ Account "${formData.name}" saved successfully!`);
      loadAccounts();
    } catch (err) {
      alert(`❌ Save Failed: ${err.message}`);
    }
  };

  const filteredAccounts = accountsList.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.group_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>📖 Chart of Accounts & Party Master</h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Active Context: {firm?.legal_name || 'Neelkanth Int Udyog'}</span>
        </div>

        <button
          onClick={handleOpenCreateModal}
          style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
        >
          ➕ Create New Account Head
        </button>
      </div>

      {/* Instant Search Bar */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="🔍 Search accounts by name or group (e.g. Capital, Bank, Customer)..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Interactive Account Directory Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={thStyle}>Account / Party Name</th>
              <th style={thStyle}>Sub-Group</th>
              <th style={thStyle}>Primary Type</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Opening Balance (₹)</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                  No accounts found matching search term.
                </td>
              </tr>
            ) : (
              filteredAccounts.map((acc, idx) => (
                <tr key={acc.id || idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ ...tdStyle, fontWeight: 'bold', color: '#0f172a' }}>
                    {acc.name}
                    {acc.gstin && <div style={{ fontSize: '10px', color: '#64748b' }}>GSTIN: {acc.gstin}</div>}
                  </td>
                  <td style={tdStyle}><span style={badgeStyle}>{acc.group_type}</span></td>
                  <td style={tdStyle}>{acc.primary_type}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', color: acc.balance_type === 'Dr' ? '#2563eb' : '#10b981' }}>
                    ₹{parseFloat(acc.opening_balance || 0).toFixed(2)} ({acc.balance_type})
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <button
                      onClick={() => handleOpenEditModal(acc)}
                      style={{ backgroundColor: '#475569', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      ✏️ Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pop-up Overlay Modal Form */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '520px', borderRadius: '12px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '16px' }}>
                {editingAccount ? `✏️ Edit Account: ${editingAccount.name}` : '➕ Create New Ledger Account'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Account / Party Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Propritor Capital A/C / Shyam Steel"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>1. Primary Account Type *</label>
                  <select
                    value={formData.primary_type}
                    onChange={e => handlePrimaryTypeChange(e.target.value)}
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
                    {formData.primary_type === 'ASSETS' && (
                      <>
                        <option value="SUNDRY_DEBTORS">Sundry Debtors (Customer)</option>
                        <option value="BANK">Bank Accounts</option>
                        <option value="CASH">Cash-in-Hand</option>
                        <option value="FIXED_ASSETS">Fixed Assets</option>
                      </>
                    )}
                    {formData.primary_type === 'LIABILITIES' && (
                      <>
                        <option value="CAPITAL_ACCOUNT">Capital Account (पूंजी खाता)</option>
                        <option value="SUNDRY_CREDITORS">Sundry Creditors (Supplier)</option>
                        <option value="DUTIES_AND_TAXES">Duties & Taxes (GST/TDS)</option>
                        <option value="SECURED_LOANS">Bank Loans & Borrowings</option>
                      </>
                    )}
                    {formData.primary_type === 'INCOME' && (
                      <>
                        <option value="SALES_ACCOUNT">Sales Account</option>
                        <option value="INDIRECT_INCOME">Other Income</option>
                      </>
                    )}
                    {formData.primary_type === 'EXPENSES' && (
                      <>
                        <option value="PURCHASE_ACCOUNT">Purchase Account</option>
                        <option value="DIRECT_EXPENSES">Direct Expenses (Labor/Freight)</option>
                        <option value="INDIRECT_EXPENSES">Indirect Expenses (Rent/Office)</option>
                      </>
                    )}
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
                    <option value="Dr">Debit (Dr)</option>
                    <option value="Cr">Credit (Cr)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>GSTIN Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="08AAAAA0000A1Z5"
                    value={formData.gstin}
                    onChange={e => setFormData({ ...formData, gstin: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Mobile / Phone</label>
                  <input
                    type="text"
                    placeholder="98290XXXXX"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ backgroundColor: '#94a3b8', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
                  💾 Save Account
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
const thStyle = { padding: '10px', textAlign: 'left', fontWeight: 'bold', fontSize: '11px' };
const tdStyle = { padding: '10px', verticalAlign: 'top' };
const badgeStyle = { padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#334155' };
