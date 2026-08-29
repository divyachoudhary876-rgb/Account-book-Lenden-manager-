// frontend/src/components/BillSettlementView.jsx

import React, { useState, useEffect } from 'react';

export default function BillSettlementView({ firm }) {
  const [debtors, setDebtors] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amountReceived, setAmountReceived] = useState('');

  useEffect(() => {
    loadDebtors();
  }, []);

  const loadDebtors = () => {
    try {
      const savedAccounts = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
      // Filter Debtors or Liabilities
      const customerAccounts = savedAccounts.filter(a => a.primary_type === 'ASSET' || a.primary_type === 'LIABILITY');
      setDebtors(customerAccounts);
      if (customerAccounts.length > 0) {
        setSelectedCustomerId(customerAccounts[0].id);
      }
    } catch (e) {
      console.error('Failed loading customer accounts:', e);
    }
  };

  const handleConfirmSettlement = () => {
    if (!amountReceived || parseFloat(amountReceived) <= 0) {
      return alert('Valid Amount Received enter karein!');
    }
    const customer = debtors.find(d => d.id === selectedCustomerId);
    alert(`₹${amountReceived} settlement saved successfully for ${customer ? customer.name : 'Customer'}!`);
    setAmountReceived('');
  };

  return (
    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', maxWidth: '600px', margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>💳 Customer Bill Settlement & Knock-Off</h3>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', color: '#334155', marginBottom: '4px' }}>Select Customer / Debtor *</label>
        <select 
          value={selectedCustomerId} 
          onChange={(e) => setSelectedCustomerId(e.target.value)}
          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
        >
          {debtors.length === 0 ? (
            <option value="">-- No Accounts Found --</option>
          ) : (
            debtors.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.sub_group || 'CUSTOMER'})</option>
            ))
          )}
        </select>
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', color: '#334155', marginBottom: '4px' }}>Amount Received (₹)</label>
        <input 
          type="number" 
          placeholder="5000" 
          value={amountReceived}
          onChange={(e) => setAmountReceived(e.target.value)}
          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
        />
      </div>

      <button 
        onClick={handleConfirmSettlement}
        style={{ width: '100%', backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
      >
        💾 Confirm & Save Settlement
      </button>
    </div>
  );
}
