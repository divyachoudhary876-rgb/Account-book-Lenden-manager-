import React, { useState } from 'react';

export default function CreateAccountHeadModal({ organizationId = "ORG-101", isOpen, onClose, onAccountCreated }) {
  const [name, setName] = useState('');
  const [parentGroup, setParentGroup] = useState('ASSETS');
  const [subGroup, setSubGroup] = useState('SUNDRY_DEBTOR');
  const [openingBal, setOpeningBal] = useState(0);
  const [balType, setBalType] = useState('Dr');
  const [loading, setLoading] = useState(false);

  // Group Mapping as per Accounting Rules
  const subGroupOptions = {
    ASSETS: [
      { id: 'SUNDRY_DEBTOR', label: 'Sundry Debtors (Customers)' },
      { id: 'CASH', label: 'Cash-in-Hand' },
      { id: 'BANK', label: 'Bank Accounts' },
      { id: 'FIXED_ASSETS', label: 'Fixed Assets (Machinery/Property)' }
    ],
    LIABILITIES: [
      { id: 'SUNDRY_CREDITOR', label: 'Sundry Creditors (Suppliers)' },
      { id: 'DUTIES_AND_TAXES', label: 'Duties & Taxes (GST/TDS Output)' },
      { id: 'CURRENT_LIABILITIES', label: 'Current Liabilities' }
    ],
    EQUITY: [
      { id: 'CAPITAL', label: 'Capital Account (Owner Equity)' },
      { id: 'RESERVES', label: 'Reserves & Surplus' }
    ],
    INCOME: [
      { id: 'DIRECT_INCOME', label: 'Sales / Direct Operating Income' },
      { id: 'INDIRECT_INCOME', label: 'Indirect Income (Interest/Commission)' }
    ],
    EXPENSE: [
      { id: 'DIRECT_EXPENSE', label: 'Purchase / Direct Expense' },
      { id: 'INDIRECT_EXPENSE', label: 'Indirect Expense (Rent/Salaries/Utility)' }
    ]
  };

  const handleParentChange = (e) => {
    const selected = e.target.value;
    setParentGroup(selected);
    setSubGroup(subGroupOptions[selected][0].id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/v1/account-heads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          name,
          parent_group: parentGroup,
          sub_group: subGroup,
          opening_balance: openingBal,
          opening_balance_type: balType
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('New Account Head Created!');
        onAccountCreated(data.data);
        onClose();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Network error creating account');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h4>➕ Create New Ledger Account</h4>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ marginTop: '12px' }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={styles.label}>Account Name *</label>
            <input 
              type="text" 
              required 
              placeholder="e.g. Shyam Traders / Office Rent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input} 
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={styles.label}>Primary Accounting Group *</label>
            <select value={parentGroup} onChange={handleParentChange} style={styles.input}>
              <option value="ASSETS">Assets</option>
              <option value="LIABILITIES">Liabilities</option>
              <option value="EQUITY">Equity / Capital</option>
              <option value="INCOME">Income / Revenue</option>
              <option value="EXPENSE">Expenses</option>
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={styles.label}>Sub Group Category *</label>
            <select value={subGroup} onChange={(e) => setSubGroup(e.target.value)} style={styles.input}>
              {subGroupOptions[parentGroup].map(sub => (
                <option key={sub.id} value={sub.id}>{sub.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '14px' }}>
            <div>
              <label style={styles.label}>Opening Balance</label>
              <input 
                type="number" 
                value={openingBal} 
                onChange={(e) => setOpeningBal(e.target.value)} 
                style={styles.input} 
              />
            </div>
            <div>
              <label style={styles.label}>Type</label>
              <select value={balType} onChange={(e) => setBalType(e.target.value)} style={styles.input}>
                <option value="Dr">Dr</option>
                <option value="Cr">Cr</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} style={styles.btnSave}>
            {loading ? 'Saving...' : '💾 Create & Select Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 },
  modal: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '400px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' },
  closeBtn: { border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' },
  label: { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' },
  input: { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' },
  btnSave: { width: '100%', padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }
};
