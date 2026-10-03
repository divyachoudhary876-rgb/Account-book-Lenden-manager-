// frontend/src/components/CreateFirmForm.jsx

import React, { useState } from 'react';
import { INDUSTRY_SECTORS, getStarterAccountsForCategory } from '../utils/industryEngine.js';

export default function CreateFirmForm({ onFirmCreated, onCancel }) {
  const [firmName, setFirmName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('BRICK_KILN');
  const [gstin, setGstin] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = firmName.trim();
    if (!cleanName) {
      alert("⚠️ Legal Business / Firm Name is required.");
      return;
    }

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

    try {
      // 1. Register firm in registry
      const existingFirms = JSON.parse(localStorage.getItem('app_firms_registry') || '[]');
      const updatedFirms = [...existingFirms, newFirmPayload];
      localStorage.setItem('app_firms_registry', JSON.stringify(updatedFirms));

      // 2. Initialize isolated starter accounts (strictly scoped to this firmId)
      let starterAccounts = [];
      if (typeof getStarterAccountsForCategory === 'function') {
        starterAccounts = getStarterAccountsForCategory(selectedCategory) || [];
      }
      
      if (!starterAccounts || starterAccounts.length === 0) {
        starterAccounts = [
          { id: `ACC-${firmId}-001`, account_name: 'Cash in Hand (रोकड़)', name: 'Cash in Hand (रोकड़)', primary_type: 'ASSETS', type: 'Assets', sub_group: 'Cash in Hand (रोकड़)', group: 'Cash-in-Hand', opening_balance: 0, balance_type: 'Dr', is_system_locked: true, isSystemLocked: true },
          { id: `ACC-${firmId}-002`, account_name: 'State Bank of India (बैंक)', name: 'State Bank of India (बैंक)', primary_type: 'ASSETS', type: 'Assets', sub_group: 'Bank Accounts (बैंक खाते)', group: 'Bank Accounts', opening_balance: 0, balance_type: 'Dr', is_system_locked: false, isSystemLocked: false },
          { id: `ACC-${firmId}-003`, account_name: 'Sales Revenue Account', name: 'Sales Revenue Account', primary_type: 'INCOME', type: 'Income', sub_group: 'Direct Sales Revenue (बिक्री)', group: 'Sales / Revenue Accounts', opening_balance: 0, balance_type: 'Cr', is_system_locked: true, isSystemLocked: true },
          { id: `ACC-${firmId}-004`, account_name: 'Purchase Raw Material Account', name: 'Purchase Raw Material Account', primary_type: 'EXPENSES', type: 'Expenses', sub_group: 'Direct Production Expenses', group: 'Raw Material Consumed', opening_balance: 0, balance_type: 'Dr', is_system_locked: true, isSystemLocked: true },
          { id: `ACC-${firmId}-005`, account_name: 'Capital Account (स्वामी की पूंजी)', name: 'Capital Account (स्वामी की पूंजी)', primary_type: 'EQUITY', type: 'Income', sub_group: 'Proprietor / Partner Capital Account', group: 'Capital / Owner Equity', opening_balance: 0, balance_type: 'Cr', is_system_locked: false, isSystemLocked: false }
        ];
      }

      localStorage.setItem(`app_accounts_${firmId}`, JSON.stringify(starterAccounts));
      localStorage.setItem(`account_heads_${firmId}`, JSON.stringify(starterAccounts));

      // 3. Clean empty transaction buckets for fresh firm isolation
      localStorage.setItem(`app_vouchers_${firmId}`, JSON.stringify([]));
      localStorage.setItem(`account_book_vouchers_${firmId}`, JSON.stringify([]));
      localStorage.setItem(`inventory_items_${firmId}`, JSON.stringify([]));
      localStorage.setItem(`material_consumptions_${firmId}`, JSON.stringify([]));
      localStorage.setItem(`sales_invoices_${firmId}`, JSON.stringify([]));
      localStorage.setItem(`purchase_bills_${firmId}`, JSON.stringify([]));

      // 4. Switch active firm pointer
      localStorage.setItem('app_active_firm_id', firmId);

      // 5. Broadcast global state update
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('storage'));

      alert(`✓ Firm "${newFirmPayload.legal_name}" Created Successfully!`);
      if (onFirmCreated) onFirmCreated(newFirmPayload);
    } catch (err) {
      alert("Failed to save firm: " + err.message);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 14px rgba(0,0,0,0.05)', maxWidth: '650px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🏢</span> Register New Business Enterprise / Firm
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Configure multi-firm tenant with automated industry-tailored ledger heads</span>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Legal Firm Name (कानूनी व्यापार नाम) *</label>
            <input type="text" placeholder="e.g. Neelkanth Fuels / Shivam Bricks" value={firmName} onChange={e => setFirmName(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Trade Name / Brand (वैकल्पिक)</label>
            <input type="text" placeholder="e.g. Neelkanth Group" value={tradeName} onChange={e => setTradeName(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Business Category & Industry Type (व्यापार श्रेणी) *</label>
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold', backgroundColor: '#f8fafc', color: '#0f172a' }}>
            {INDUSTRY_SECTORS && Object.entries(INDUSTRY_SECTORS).map(([secKey, sec]) => (
              <optgroup key={secKey} label={sec.label}>
                {sec.categories.map(cat => (
                  <option key={cat.code} value={cat.code}>{cat.icon} {cat.label}</option>
                ))}
              </optgroup>
            ))}
            {!INDUSTRY_SECTORS && (
              <>
                <option value="BRICK_KILN">🧱 Brick Kiln Manufacturing (ईंट भट्टा उद्योग)</option>
                <option value="BIOMASS_BRIQUETTES">🔥 Biomass Briquettes & Biofuel (बायोमास ब्रिकेट्स)</option>
                <option value="TRADING">📦 General Trading & Wholesale</option>
              </>
            )}
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

        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          {onCancel && (
            <button type="button" onClick={onCancel} style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
          )}
          <button type="submit" style={{ flex: 2, backgroundColor: '#059669', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
            💾 Create Enterprise & Initialize Ledgers
          </button>
        </div>
      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#0f172a' };
