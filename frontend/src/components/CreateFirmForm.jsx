/**
 * CreateFirmForm Component: Professional Modal Enterprise Registration UI
 * Perfectly centered card layout matching the original design.
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 md:p-8 space-y-6 my-8 border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Title */}
        <div className="space-y-1.5 border-b border-gray-100 pb-4">
          <div className="flex items-center space-x-3 text-slate-900">
            <span className="text-3xl p-2 bg-slate-50 rounded-2xl border border-slate-100">🏢</span>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              Register New Business Enterprise / Firm
            </h2>
          </div>
          <p className="text-xs md:text-sm text-gray-500 pl-1">
            Configure multi-firm tenant with automated industry-tailored ledger heads
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3.5 rounded-2xl text-sm font-medium border border-red-100 flex items-center space-x-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Row 1: Legal Name & Trade Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Legal Firm Name (कानूनी व्यापार नाम) *
              </label>
              <input
                type="text"
                name="legal_name"
                value={formData.legal_name}
                onChange={handleChange}
                placeholder="e.g. Neelkanth Int Udyog"
                className="w-full border border-gray-300 rounded-2xl p-3.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-gray-50/40 text-slate-800 font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Trade Name / Brand (वैकालिक)
              </label>
              <input
                type="text"
                name="trade_name"
                value={formData.trade_name}
                onChange={handleChange}
                placeholder="e.g. Neelkanth Group"
                className="w-full border border-gray-300 rounded-2xl p-3.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-gray-50/40 text-slate-800 font-medium"
              />
            </div>
          </div>

          {/* Business Category */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
              Business Category & Industry Type (व्यापार श्रेणी) *
            </label>
            <select
              name="business_category"
              value={formData.business_category}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-2xl p-3.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-gray-50/40 font-semibold text-slate-800"
            >
              <option value="BRICK_KILN">🧱 Brick Kiln & Clay Works (ईंट भट्ठा उद्योग)</option>
              <option value="BIOMASS">🌿 Biomass Briquette & Fuel</option>
              <option value="TRADING">📦 General Trading & Supplies</option>
              <option value="CONSTRUCTION">🏗️ Construction & Civil Works</option>
            </select>
          </div>

          {/* Row 2: GSTIN & Mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                GSTIN Number (Optional)
              </label>
              <input
                type="text"
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                placeholder="08AAAAA0000A1Z5"
                className="w-full border border-gray-300 rounded-2xl p-3.5 text-sm uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-gray-50/40 text-slate-800 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Registered Mobile / Contact
              </label>
              <input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="98290XXXXX"
                className="w-full border border-gray-300 rounded-2xl p-3.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-gray-50/40 text-slate-800 font-medium"
              />
            </div>
          </div>

          {/* Factory / Office Address */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
              Factory / Office Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="2"
              placeholder="e.g. Industrial Area, Hanumangarh, Rajasthan"
              className="w-full border border-gray-300 rounded-2xl p-3.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-gray-50/40 text-slate-800 font-medium resize-none"
            ></textarea>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex flex-col md:flex-row gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-full md:w-auto px-6 py-3.5 border border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 font-semibold text-sm transition"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl font-bold text-sm shadow-xl shadow-emerald-600/25 transition flex items-center justify-center space-x-2"
            >
              <span>💾</span>
              <span>{loading ? 'Initializing Enterprise...' : 'Create Enterprise & Initialize Ledgers'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
