// frontend/src/components/CreateInvoice.jsx

import React, { useState, useEffect } from 'react';
import { processSalesInvoicePosting } from '../utils/salesPostingEngine';

export default function CreateInvoice({ firm }) {
  const [parties, setParties] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [taxableAmount, setTaxableAmount] = useState('');
  const [gstRate, setGstRate] = useState('18');
  const [narration, setNarration] = useState('');
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);

  // New Party Form States
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyGstin, setNewPartyGstin] = useState('');
  const [newPartyState, setNewPartyState] = useState('08 - Rajasthan');
  const [newPartyAddress, setNewPartyAddress] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');

  const loadParties = () => {
    const saved = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
    const debtors = saved.filter(a => a.sub_group === 'SUNDRY_DEBTORS' || a.primary_type === 'ASSET');
    setParties(debtors);
  };

  useEffect(() => { loadParties(); }, []);

  const handleCreateParty = (e) => {
    e.preventDefault();
    const saved = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
    const newAccount = {
      id: `ACC-CUST-${Date.now()}`,
      name: newPartyName,
      sub_group: 'SUNDRY_DEBTORS',
      primary_type: 'ASSET',
      gstin: newPartyGstin,
      state: newPartyState,
      address: newPartyAddress,
      phone: newPartyPhone,
      opening_balance: 0,
      current_balance: 0
    };

    localStorage.setItem('app_account_heads', JSON.stringify([...saved, newAccount]));
    alert(`✓ Party '${newPartyName}' with GSTIN successfully created!`);
    setShowAddPartyModal(false);
    setNewPartyName('');
    setNewPartyGstin('');
    setNewPartyAddress('');
    setNewPartyPhone('');
    loadParties();
    setSelectedCustomer(newAccount.id);
  };

  const handleSaveInvoice = (e) => {
    e.preventDefault();
    const cust = parties.find(p => p.id === selectedCustomer);
    if (!cust) return alert("❌ Please select a Customer / Debtors Party!");

    try {
      processSalesInvoicePosting({
        customerId: cust.id,
        customerName: cust.name,
        invoiceDate,
        taxableAmount,
        gstRate,
        narration
      });

      alert("✓ Sales Invoice Posted! Journal Register, Ledger Milan & Dashboard figures updated.");
      setTaxableAmount('');
      setNarration('');
    } catch (err) {
      alert(`❌ Sales Posting Error: ${err.message}`);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: '700px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#0f172a' }}>🧾 Fast Sales Invoice Entry</h3>
        <button onClick={() => setShowAddPartyModal(true)} style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
          + Create Complete New Party
        </button>
      </div>

      <form onSubmit={handleSaveInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Select Customer / Debtor *</label>
            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} style={inputStyle} required>
              <option value="">-- Choose Party --</option>
              {parties.map(p => (
                <option key={p.id} value={p.id}>{p.name} {p.gstin ? `(GST: ${p.gstin})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Invoice Date *</label>
            <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} style={inputStyle} required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Taxable Bill Value (₹) *</label>
            <input type="number" step="0.01" placeholder="10000.00" value={taxableAmount} onChange={(e) => setTaxableAmount(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>GST Tax Rate (%)</label>
            <select value={gstRate} onChange={(e) => setGstRate(e.target.value)} style={inputStyle}>
              <option value="0">0% (Exempted)</option>
              <option value="5">5% GST</option>
              <option value="12">12% GST</option>
              <option value="18">18% GST</option>
              <option value="28">28% GST</option>
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Invoice Narration / Item Description</label>
          <input type="text" placeholder="Sales of Biomass Briquettes Order #105..." value={narration} onChange={(e) => setNarration(e.target.value)} style={inputStyle} />
        </div>

        <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: '10px' }}>
          💾 Save & Post Sales Invoice
        </button>

      </form>

      {/* Complete Party Master Creation Modal */}
      {showAddPartyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '500px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 14px 0', color: '#0f172a' }}>🏢 Complete New Customer Party Master</h3>
            <form onSubmit={handleCreateParty} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Party Legal Name *</label>
                <input type="text" placeholder="Shree Ram Traders" value={newPartyName} onChange={e => setNewPartyName(e.target.value)} style={inputStyle} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>GSTIN Number</label>
                  <input type="text" placeholder="08AAAAA0000A1Z5" value={newPartyGstin} onChange={e => setNewPartyGstin(e.target.value)} style={inputStyle} maxLength="15" />
                </div>
                <div>
                  <label style={labelStyle}>State / POS</label>
                  <select value={newPartyState} onChange={e => setNewPartyState(e.target.value)} style={inputStyle}>
                    <option value="08 - Rajasthan">08 - Rajasthan</option>
                    <option value="07 - Delhi">07 - Delhi</option>
                    <option value="03 - Punjab">03 - Punjab</option>
                    <option value="06 - Haryana">06 - Haryana</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Billing Address</label>
                <input type="text" placeholder="Industrial Area, Hanumangarh" value={newPartyAddress} onChange={e => setNewPartyAddress(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Mobile Phone</label>
                <input type="text" placeholder="98290XXXXX" value={newPartyPhone} onChange={e => setNewPartyPhone(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save Party Master</button>
                <button type="button" onClick={() => setShowAddPartyModal(false)} style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
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
