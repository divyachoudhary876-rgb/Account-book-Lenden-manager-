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

  // New Party Master Modal States
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyGstin, setNewPartyGstin] = useState('');
  const [newPartyState, setNewPartyState] = useState('08 - Rajasthan');
  const [newPartyAddress, setNewPartyAddress] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');

  // Re-fetch Dynamic Real Parties from Local Storage
  const loadDynamicParties = () => {
    const saved = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
    // Filter Debtors or Asset accounts created by user
    const debtors = saved.filter(a => a.sub_group === 'SUNDRY_DEBTORS' || a.primary_type === 'ASSET');
    setParties(debtors);
    if (debtors.length > 0 && !selectedCustomer) {
      setSelectedCustomer(debtors[0].id);
    }
  };

  useEffect(() => {
    loadDynamicParties();

    window.addEventListener('ACCOUNT_BOOK_VOUCHER_POSTED', loadDynamicParties);
    window.addEventListener('storage', loadDynamicParties);

    return () => {
      window.removeEventListener('ACCOUNT_BOOK_VOUCHER_POSTED', loadDynamicParties);
      window.removeEventListener('storage', loadDynamicParties);
    };
  }, []);

  const handleCreateNewParty = (e) => {
    e.preventDefault();
    if (!newPartyName.trim()) return alert("❌ Please enter Party Legal Name.");

    const saved = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
    const newAccount = {
      id: `ACC-CUST-${Date.now()}`,
      name: newPartyName.trim(),
      sub_group: 'SUNDRY_DEBTORS',
      primary_type: 'ASSET',
      gstin: newPartyGstin.trim(),
      state: newPartyState,
      address: newPartyAddress.trim(),
      phone: newPartyPhone.trim(),
      opening_balance: 0,
      current_balance: 0
    };

    const updated = [...saved, newAccount];
    localStorage.setItem('app_account_heads', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));

    alert(`✓ Party Master '${newPartyName}' successfully created!`);
    setShowAddPartyModal(false);
    setNewPartyName('');
    setNewPartyGstin('');
    setNewPartyAddress('');
    setNewPartyPhone('');
    
    loadDynamicParties();
    setSelectedCustomer(newAccount.id);
  };

  const handleSaveInvoice = (e) => {
    e.preventDefault();
    if (!selectedCustomer) {
      return alert("❌ Kripya select karein ki bill kis Customer/Party ke naam par banana hai.");
    }

    try {
      processSalesInvoicePosting({
        customerId: selectedCustomer,
        invoiceDate,
        taxableAmount,
        gstRate,
        narration
      });

      alert("✓ Sales Invoice Successfully Posted! Account Milan, General Journal Register, aur Dashboard figures update ho gaye hain.");
      setTaxableAmount('');
      setNarration('');
    } catch (err) {
      alert(`❌ Sales Posting Error: ${err.message}`);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: '700px', margin: '0 auto' }}>
      
      {/* Top Bar Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f172a' }}>🧾 Fast Sales Invoice Entry</h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Firm: {firm?.legal_name || 'My Business'}</span>
        </div>
        <button 
          onClick={() => setShowAddPartyModal(true)} 
          style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
        >
          + Create Complete New Party
        </button>
      </div>

      <form onSubmit={handleSaveInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Customer Select Dropdown & Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Select Customer / Debtor *</label>
            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} style={inputStyle} required>
              {parties.length === 0 ? (
                <option value="">-- No Real Parties Found (Click '+ Create Complete New Party') --</option>
              ) : (
                parties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.gstin ? `(GST: ${p.gstin})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Invoice Date *</label>
            <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} style={inputStyle} required />
          </div>
        </div>

        {/* Amount & Tax Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Taxable Bill Amount (₹) *</label>
            <input 
              type="number" 
              step="0.01" 
              placeholder="10000.00" 
              value={taxableAmount} 
              onChange={(e) => setTaxableAmount(e.target.value)} 
              style={inputStyle} 
              required 
            />
          </div>
          <div>
            <label style={labelStyle}>GST Tax Rate (%)</label>
            <select value={gstRate} onChange={(e) => setGstRate(e.target.value)} style={inputStyle}>
              <option value="0">0% (Exempted / Nil Rated)</option>
              <option value="5">5% GST</option>
              <option value="12">12% GST</option>
              <option value="18">18% GST</option>
              <option value="28">28% GST</option>
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Invoice Narration / Item Description</label>
          <input 
            type="text" 
            placeholder="Sales of Biomass Briquettes Order #105..." 
            value={narration} 
            onChange={(e) => setNarration(e.target.value)} 
            style={inputStyle} 
          />
        </div>

        <button 
          type="submit" 
          style={{ backgroundColor: '#2563eb', color: '#fff', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: '10px' }}
        >
          💾 Save & Post Sales Invoice
        </button>

      </form>

      {/* Complete Party Master Creation Popup Modal */}
      {showAddPartyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '520px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>🏢 Complete New Customer Party Master</h3>
              <button onClick={() => setShowAddPartyModal(false)} style={{ backgroundColor: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <form onSubmit={handleCreateNewParty} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Party Legal / Business Name *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Rajasthan Biomass Energy Corp" 
                  value={newPartyName} 
                  onChange={e => setNewPartyName(e.target.value)} 
                  style={inputStyle} 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>GSTIN Number</label>
                  <input 
                    type="text" 
                    placeholder="08AAAAA0000A1Z5" 
                    value={newPartyGstin} 
                    onChange={e => setNewPartyGstin(e.target.value)} 
                    style={inputStyle} 
                    maxLength="15" 
                  />
                </div>
                <div>
                  <label style={labelStyle}>State / POS Code</label>
                  <select value={newPartyState} onChange={e => setNewPartyState(e.target.value)} style={inputStyle}>
                    <option value="08 - Rajasthan">08 - Rajasthan</option>
                    <option value="07 - Delhi">07 - Delhi</option>
                    <option value="03 - Punjab">03 - Punjab</option>
                    <option value="06 - Haryana">06 - Haryana</option>
                    <option value="09 - Uttar Pradesh">09 - Uttar Pradesh</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Billing & Dispatch Address</label>
                <input 
                  type="text" 
                  placeholder="RIICO Industrial Area, Hanumangarh" 
                  value={newPartyAddress} 
                  onChange={e => setNewPartyAddress(e.target.value)} 
                  style={inputStyle} 
                />
              </div>

              <div>
                <label style={labelStyle}>Contact Mobile Phone</label>
                <input 
                  type="text" 
                  placeholder="98290XXXXX" 
                  value={newPartyPhone} 
                  onChange={e => setNewPartyPhone(e.target.value)} 
                  style={inputStyle} 
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                  💾 Save Party Master
                </button>
                <button type="button" onClick={() => setShowAddPartyModal(false)} style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer' }}>
                  Cancel
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
