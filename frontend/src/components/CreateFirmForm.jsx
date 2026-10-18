// frontend/src/components/CreateFirmForm.jsx

import React, { useState } from 'react';

const SAFE_INDUSTRY_SECTORS = {
  MANUFACTURING: {
    label: 'Manufacturing & Industrial',
    categories: [
      { code: 'BRICK_KILN', icon: '🧱', label: 'Brick Kiln & Clay Works (ईंट भट्ठा उद्योग)' },
      { code: 'BIOMASS_BRIQUETTES', icon: '🔥', label: 'Biomass Briquettes & Biofuel (बायोमास ब्रिकेट्स)' },
      { code: 'GENERAL_MANUFACTURING', icon: '🏭', label: 'General Manufacturing & Factory' }
    ]
  },
  TRADING: {
    label: 'Trading & Distribution',
    categories: [
      { code: 'WHOLESALE_TRADING', icon: '📦', label: 'Wholesale & General Trading' },
      { code: 'RETAIL', icon: '🛒', label: 'Retail Store / Shop' }
    ]
  }
};

export default function CreateFirmForm({ onFirmCreated, onCancel }) {
  const [firmName, setFirmName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('BRICK_KILN');
  const [gstin, setGstin] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleCreateFirmSubmit = (e) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const cleanName = String(firmName || '').trim();
    if (!cleanName) {
      setErrorMessage("⚠️ Legal Firm Name is mandatory.");
      return;
    }

    setIsSubmitting(true);

    try {
      const firmId = `FIRM-${Date.now()}`;
      const newFirmPayload = {
        id: firmId,
        firm_id: firmId,
        legal_name: cleanName,
        trade_name: tradeName.trim() || cleanName,
        category: selectedCategory,
        business_category: selectedCategory,
        businessCategory: selectedCategory,
        gstin: gstin.trim().toUpperCase() || 'UNREGISTERED',
        phone: phone.trim(),
        address: address.trim(),
        created_at: new Date().toISOString()
      };

      // 1. Fetch existing firms
      let existingFirms = [];
      try {
        const raw = localStorage.getItem('app_firms_registry') || localStorage.getItem('app_firms');
        if (raw) existingFirms = JSON.parse(raw);
      } catch (err) {
        existingFirms = [];
      }
      if (!Array.isArray(existingFirms)) existingFirms = [];

      const updatedFirms = [...existingFirms.filter(f => f && (f.id || f.firm_id) !== firmId), newFirmPayload];
      
      // 2. Save registry and scoped storage synchronously
      localStorage.setItem('app_firms_registry', JSON.stringify(updatedFirms));
      localStorage.setItem('app_firms', JSON.stringify(updatedFirms));

      const starterAccounts = [
        { id: `ACC-${firmId}-001`, firm_id: firmId, account_name: 'Cash in Hand (रोकड़)', name: 'Cash in Hand (रोकड़)', primary_type: 'ASSETS', type: 'Assets', sub_group: 'Cash in Hand (रोकड़)', group: 'Cash-in-Hand', opening_balance: 0, balance_type: 'Dr', current_balance: 0, is_system_locked: true },
        { id: `ACC-${firmId}-002`, firm_id: firmId, account_name: 'State Bank of India (बैंक)', name: 'State Bank of India (बैंक)', primary_type: 'ASSETS', type: 'Assets', sub_group: 'Bank Accounts (बैंक खाते)', group: 'Bank Accounts', opening_balance: 0, balance_type: 'Dr', current_balance: 0, is_system_locked: false },
        { id: `ACC-${firmId}-003`, firm_id: firmId, account_name: 'Sales & Revenue', name: 'Sales & Revenue', primary_type: 'INCOME', type: 'Income', sub_group: 'Direct Sales Revenue (बिक्री)', group: 'Sales / Revenue Accounts', opening_balance: 0, balance_type: 'Cr', current_balance: 0, is_system_locked: true },
        { id: `ACC-${firmId}-004`, firm_id: firmId, account_name: 'Purchase Raw Material Account', name: 'Purchase Raw Material Account', primary_type: 'EXPENSES', type: 'Expenses', sub_group: 'Direct Production Expenses', group: 'Raw Material Consumed', opening_balance: 0, balance_type: 'Dr', current_balance: 0, is_system_locked: true },
        { id: `ACC-${firmId}-005`, firm_id: firmId, account_name: 'Proprietor Capital Account', name: 'Proprietor Capital Account', primary_type: 'EQUITY', type: 'Liabilities', sub_group: 'Proprietor / Partner Capital Account', group: 'Capital / Owner Equity', opening_balance: 0, balance_type: 'Cr', current_balance: 0, is_system_locked: false }
      ];

      localStorage.setItem(`app_accounts_${firmId}`, JSON.stringify(starterAccounts));
      localStorage.setItem(`account_heads_${firmId}`, JSON.stringify(starterAccounts));
      localStorage.setItem(`account_book_vouchers_${firmId}`, JSON.stringify([]));
      localStorage.setItem(`inventory_items_${firmId}`, JSON.stringify([]));

      localStorage.setItem('app_active_firm_id', firmId);
      localStorage.setItem('active_firm_profile', JSON.stringify(newFirmPayload));

      setIsSubmitting(false);

      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('storage'));

      if (onFirmCreated && typeof onFirmCreated === 'function') {
        onFirmCreated(newFirmPayload);
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error("[CreateFirmForm] Submission error:", err);
      setIsSubmitting(false);
      setErrorMessage("Firm creation failed: " + (err.message || 'Unknown error'));
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 14px rgba(0,0,0,0.05)', maxWidth: '650px', margin: '20px auto', boxSizing: 'border-box', position: 'relative', zIndex: 10, pointerEvents: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🏢</span> Register New Business Enterprise / Firm
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Configure multi-firm tenant with automated industry-tailored ledger heads</span>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b', pointerEvents: 'auto' }}>✕</button>
        )}
      </div>

      {errorMessage && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', marginBottom: '12px' }}>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleCreateFirmSubmit} style={{ display: 'grid', gap: '12px', pointerEvents: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Legal Firm Name (कानूनी व्यापार नाम) *</label>
            <input type="text" placeholder="e.g. Neelkanth Int Udyog" value={firmName} onChange={e => setFirmName(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Trade Name / Brand (वैकल्पिक)</label>
            <input type="text" placeholder="e.g. Neelkanth Group" value={tradeName} onChange={e => setTradeName(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Business Category & Industry Type (व्यापार श्रेणी) *</label>
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold', backgroundColor: '#f8fafc', color: '#0f172a', pointerEvents: 'auto' }}>
            {Object.entries(SAFE_INDUSTRY_SECTORS).map(([secKey, sec]) => (
              <optgroup key={secKey} label={sec.label}>
                {sec.categories.map(cat => (
                  <option key={cat.code} value={cat.code}>{cat.icon} {cat.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>GSTIN Number (Optional)</label>
            <input type="text" placeholder="08AAAAA0000A1Z5" value={gstin} onChange={e => setGstin(e.target.value)} style={inputStyle} maxLength={15} />
          </div>
          <div>
            <label style={labelStyle}>Registered Mobile / Contact</label>
            <input type="tel" placeholder="98290XXXXX" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Factory / Office Address</label>
          <input type="text" placeholder="e.g. Industrial Area, Hanumangarh, Rajasthan" value={address} onChange={e => setAddress(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '8px', pointerEvents: 'auto' }}>
          {onCancel && (
            <button type="button" onClick={onCancel} style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', pointerEvents: 'auto' }}>Cancel</button>
          )}
          <button 
            type="submit" 
            disabled={isSubmitting} 
            style={{ 
              flex: 2, 
              backgroundColor: '#059669', 
              color: '#ffffff', 
              border: 'none', 
              padding: '12px', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              fontSize: '13px', 
              cursor: 'pointer', 
              opacity: isSubmitting ? 0.7 : 1,
              pointerEvents: 'auto',
              boxShadow: '0 4px 10px rgba(5, 150, 105, 0.3)'
            }}
          >
            {isSubmitting ? 'Creating Enterprise...' : '💾 Create Enterprise & Initialize Ledgers'}
          </button>
        </div>
      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#0f172a', pointerEvents: 'auto' };
