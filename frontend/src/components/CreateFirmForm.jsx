/**
 * CreateFirmForm Component: Original Professional Modal Form
 * Perfectly centered card layout matching your exact requirements.
 */

import React, { useState } from 'react';
import { createNewFirm } from '../utils/multiFirmEngine.js';

export default function CreateFirmForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    legal_name: '',
    trade_name: '',
    business_category: 'BRICK_KILN',
    gstin: '',
    mobile: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.legal_name.trim()) {
      setError('Legal Firm Name bharna anivarya hai.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const newFirm = createNewFirm({
        legal_name: formData.legal_name.trim(),
        trade_name: formData.trade_name.trim() || formData.legal_name.trim(),
        business_category: formData.business_category,
        gstin: formData.gstin.trim() || 'UNREGISTERED',
        mobile: formData.mobile.trim(),
        address: formData.address.trim()
      });

      if (onSuccess) onSuccess(newFirm);
    } catch (err) {
      setError(err.message || 'Enterprise banane mein asafalta hui.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
      overflowY: 'auto'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        maxWidth: '500px',
        width: '100%',
        padding: '28px',
        boxSizing: 'border-box'
      }}>
        
        {/* Header */}
        <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <span style={{ fontSize: '28px', background: '#f8fafc', padding: '8px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>🏢</span>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
              Register New Business Enterprise / Firm
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Configure multi-firm tenant with automated industry-tailored ledger heads
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', marginBottom: '16px', border: '1px solid #fee2e2' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '6px', textTransform: 'uppercase' }}>
                Legal Firm Name *
              </label>
              <input
                type="text"
                name="legal_name"
                value={formData.legal_name}
                onChange={handleChange}
                placeholder="e.g. Neelkanth Int Udyog"
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '6px', textTransform: 'uppercase' }}>
                Trade Name / Brand
              </label>
              <input
                type="text"
                name="trade_name"
                value={formData.trade_name}
                onChange={handleChange}
                placeholder="e.g. Neelkanth Group"
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '6px', textTransform: 'uppercase' }}>
              Business Category & Industry Type *
            </label>
            <select
              name="business_category"
              value={formData.business_category}
              onChange={handleChange}
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#f8fafc', fontWeight: '600', color: '#0f172a' }}
            >
              <option value="BRICK_KILN">🧱 Brick Kiln & Clay Works (ईंट भट्ठा उद्योग)</option>
              <option value="BIOMASS">🌿 Biomass Briquette & Fuel</option>
              <option value="TRADING">📦 General Trading & Supplies</option>
              <option value="CONSTRUCTION">🏗️ Construction & Civil Works</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '6px', textTransform: 'uppercase' }}>
                GSTIN Number (Optional)
              </label>
              <input
                type="text"
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                placeholder="08AAAAA0000A1Z5"
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#f8fafc', textTransform: 'uppercase' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '6px', textTransform: 'uppercase' }}>
                Registered Mobile
              </label>
              <input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="98290XXXXX"
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '6px', textTransform: 'uppercase' }}>
              Factory / Office Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="2"
              placeholder="e.g. Industrial Area, Hanumangarh, Rajasthan"
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#f8fafc', resize: 'none' }}
            ></textarea>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={{ flex: 1, padding: '14px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', borderRadius: '14px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{ flex: 2, padding: '14px', background: '#059669', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(5, 150, 105, 0.3)' }}
            >
              {loading ? 'Initializing...' : '💾 Create Enterprise & Initialize Ledgers'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
