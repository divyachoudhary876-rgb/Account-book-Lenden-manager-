/**
 * Main Application Root Component: Account Book ERP
 * Safely bootstraps IndexedDB, manages firm registry, and handles fresh installations.
 */

import React, { useState, useEffect } from 'react';
import { initIndexedDB } from './utils/indexedDbStorage.js';
import { getFirmsRegistry, getActiveFirm, switchActiveFirm } from './utils/multiFirmEngine.js';
import CreateFirmForm from './components/CreateFirmForm.jsx';
import EnterpriseDashboard from './components/EnterpriseDashboard.jsx';

export default function App() {
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [activeFirm, setActiveFirm] = useState(null);
  const [firmsList, setFirmsList] = useState([]);
  const [showNewFirmModal, setShowNewFirmModal] = useState(false);

  useEffect(() => {
    initIndexedDB().then(() => {
      setIsDbInitialized(true);
      refreshFirmContext();
    });

    const handleStorageUpdate = () => {
      refreshFirmContext();
    };

    window.addEventListener('app_storage_updated', handleStorageUpdate);
    window.addEventListener('app_state_updated', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.removeEventListener('app_storage_updated', handleStorageUpdate);
      window.removeEventListener('app_state_updated', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const refreshFirmContext = () => {
    try {
      const firms = getFirmsRegistry();
      setFirmsList(firms);
      
      if (!Array.isArray(firms) || firms.length === 0) {
        setShowNewFirmModal(true);
        setActiveFirm(null);
      } else {
        const currentActive = getActiveFirm();
        setActiveFirm(currentActive);
      }
    } catch (err) {
      console.error("Error refreshing firm context:", err);
      setShowNewFirmModal(true);
    }
  };

  const handleFirmChange = (e) => {
    const val = e.target.value;
    if (val === 'NEW_FIRM') {
      setShowNewFirmModal(true);
    } else {
      try {
        switchActiveFirm(val);
        refreshFirmContext();
      } catch (err) {
        console.error("Error switching firm:", err);
      }
    }
  };

  if (!isDbInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-600 font-medium">
        Loading Account Book Smart Manager...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      {/* Top Header / Navigation Bar */}
      <header className="bg-slate-900 text-white shadow px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <span className="text-xl font-black tracking-wide text-blue-400">Account Book ERP</span>
        </div>

        {firmsList.length > 0 && (
          <div className="flex items-center space-x-4">
            <select
              value={activeFirm?.id || activeFirm?.firm_id || ''}
              onChange={handleFirmChange}
              className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {firmsList.map(f => (
                <option key={f.id || f.firm_id} value={f.id || f.firm_id}>
                  🏢 {f.legal_name || f.trade_name || f.name}
                </option>
              ))}
              <option value="NEW_FIRM" className="text-blue-300 font-semibold">+ New Firm...</option>
            </select>
          </div>
        )}
      </header>

      {/* Main View Container */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        {activeFirm ? (
          <EnterpriseDashboard activeFirm={activeFirm} />
        ) : (
          <div className="text-center py-16 text-gray-500">
            <h2 className="text-2xl font-bold mb-2">Koi Firm Profile Uplabdh Nahi Hai</h2>
            <p className="mb-4">Shuru karne ke liye kripya apni pehli enterprise firm banayein.</p>
            <button
              onClick={() => setShowNewFirmModal(true)}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium shadow hover:bg-blue-700"
            >
              + Create First Firm
            </button>
          </div>
        )}
      </main>

      {/* Modal for creating a new firm */}
      {showNewFirmModal && (
        <CreateFirmForm
          onSuccess={() => {
            setShowNewFirmModal(false);
            refreshFirmContext();
          }}
          onCancel={firmsList.length > 0 ? () => setShowNewFirmModal(false) : undefined}
        />
      )}
    </div>
  );
}
