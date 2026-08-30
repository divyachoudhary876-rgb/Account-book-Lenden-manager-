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
    setFormData({ id: '', name: '', primary_type: 'ASSETS', group_type: 'SUNDRY_DEBTORS', opening_balance: '0', balance_type: 'Dr', phone: '', gstin: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (acc) => {
    setEditingAccount(acc);
    setFormData({ ...acc, opening_balance: (acc.opening_balance || 0).toString() });
    setIsModalOpen(true);
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
      
      {/* Directory Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>📖 Chart of Accounts & Party Master</h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Active Firm Context: {firm?.legal_name || 'Neelkanth Int Udyog'}</span>
        </div>

        <button
          onClick={handleOpenCreateModal}
          style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
        >
          ➕ Create New Account Head
        </button>
      </div>

      {/* Instant Filter Input */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="🔍 Search accounts by name or group (e.g. Capital, Bank, Customer)..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
        />
      </div>

      {/* Interactive Account Directory Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Account / Party Name</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Sub-Group</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Primary Type</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Opening Balance (₹)</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.map((acc, idx) => (
              <tr key={acc.id || idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td style={{ padding: '10px', fontWeight: 'bold', color: '#0f172a' }}>{acc.name}</td>
                <td style={{ padding: '10px' }}><span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#334155' }}>{acc.group_type}</span></td>
                <td style={{ padding: '10px' }}>{acc.primary_type}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: acc.balance_type === 'Dr' ? '#2563eb' : '#10b981' }}>
                  ₹{parseFloat(acc.opening_balance || 0).toFixed(2)} ({acc.balance_type})
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <button
                    onClick={() => handleOpenEditModal(acc)}
                    style={{ backgroundColor: '#475569', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    ✏️ Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
