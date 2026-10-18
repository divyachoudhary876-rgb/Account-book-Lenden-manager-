/**
 * CreateFirmForm Component: UI modal/form to register a new enterprise firm profile.
 */

import React, { useState } from 'react';
import { createNewFirm } from '../utils/multiFirmEngine.js';

export default function CreateFirmForm({ onSuccess, onCancel }) {
  const [firmName, setFirmName] = useState('');
  const [category, setCategory] = useState('BRICK_KILN');
  const [gstin, setGstin] = useState('UNREGISTERED');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!firmName.trim()) {
      setError('Firm Name bharna anivarya hai.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const newFirm = createNewFirm({
        legal_name: firmName.trim(),
        trade_name: firmName.trim(),
        business_category: category,
        gstin: gstin.trim()
      });

      if (onSuccess) onSuccess(newFirm);
    } catch (err) {
      setError(err.message || 'Firm banane mein asafalta hui.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <h3 className="text-xl font-bold text-gray-800">🏢 Create New Firm Profile</h3>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Firm Legal Name *</label>
            <input
              type="text"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              placeholder="e.g. Neelkanth Int Udyog"
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="BRICK_KILN">Brick Kiln (Eent Bhatta)</option>
              <option value="BIOMASS">Biomass Briquette</option>
              <option value="TRADING">General Trading</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              placeholder="UNREGISTERED or GSTIN Number"
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow"
            >
              {loading ? 'Creating...' : 'Save Firm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
