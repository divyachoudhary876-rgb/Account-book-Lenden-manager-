/**
 * Main Application Root Component: Account Book ERP
 * Initializes IndexedDB, manages firm context, navigation, and renders active views.
 */

import React, { useState, useEffect } from 'react';
import { initIndexedDB, IDBStorage } from './utils/indexedDbStorage.js';
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
    const firms = getFirmsRegistry();
    setFirmsList(firms);
    const currentActive = getActiveFirm();
    setActiveFirm(currentActive);
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
      </header>

      {/* Main View Container */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        {activeFirm ? (
          <EnterpriseDashboard activeFirm={activeFirm} />
        ) : (
          <div className="text-center py-12 text-gray-500">No firm profile selected. Kripya firm banayein.</div>
        )}
      </main>

      {/* Modal for creating a new firm */}
      {showNewFirmModal && (
        <CreateFirmForm
          onSuccess={() => {
            setShowNewFirmModal(false);
            refreshFirmContext();
          }}
          onCancel={() => setShowNewFirmModal(false)}
        />
      )}
    </div>
  );
}
