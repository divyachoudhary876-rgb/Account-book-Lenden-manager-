// frontend/src/App.jsx

import React, { useState, useEffect } from 'react';
import { getActiveFirm, getFirmsRegistry, setActiveFirmId } from './utils/multiFirmEngine.js';
import { filterMenuByIndustry } from './utils/industryEngine.js';

// Components
import EnterpriseDashboard from './components/EnterpriseDashboard.jsx';
import CreateInvoice from './components/CreateInvoice.jsx';
import PurchaseStockEntryForm from './components/PurchaseStockEntryForm.jsx';
import InventoryStockView from './components/InventoryStockView.jsx';
import AccountStatementView from './components/AccountStatementView.jsx';
import CreateFirmForm from './components/CreateFirmForm.jsx';
import SecurityBackupSettings from './components/SecurityBackupSettings.jsx';
import AppUpdateBanner from './components/AppUpdateBanner.jsx';

export default function App() {
  const [activeFirm, setActiveFirm] = useState(null);
  const [firmsList, setFirmsList] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreatingFirm, setIsCreatingFirm] = useState(false);
  const [selectedFY, setSelectedFY] = useState('FY 2026-27');

  const refreshAppState = () => {
    const list = getFirmsRegistry();
    const firm = getActiveFirm();
    setFirmsList(list);
    setActiveFirm(firm);

    // Agar system me koi firm registered nahi hai, to direct Create Firm form dikhayenge
    if (list.length === 0) {
      setIsCreatingFirm(true);
    }
  };

  useEffect(() => {
    refreshAppState();
    window.addEventListener('app_state_updated', refreshAppState);
    return () => window.removeEventListener('app_state_updated', refreshAppState);
  }, []);

  const handleFirmSelectChange = (e) => {
    const val = e.target.value;
    if (val === 'CREATE_NEW') {
      setIsCreatingFirm(true);
    } else {
      setActiveFirmId(val);
      setIsCreatingFirm(false);
      refreshAppState();
    }
  };

  const handleFirmCreated = (newFirm) => {
    setIsCreatingFirm(false);
    setActiveFirmId(newFirm.id);
    refreshAppState();
    setCurrentView('dashboard');
  };

  const navigationItems = [
    { key: 'dashboard', label: '📊 Dashboard', icon: '📊' },
    { key: 'sales', label: '🧾 Sales Invoicing', icon: '🧾' },
    { key: 'purchase', label: '🛍️ Purchase Inward', icon: '🛍️' },
    { key: 'inventory', label: '📦 Live Stock & Inventory', icon: '📦' },
    { key: 'milan', label: '📑 Account Milan / Statement', icon: '📑' },
    { key: 'backup', label: '🛡️ Data Backup & Settings', icon: '🛡️' }
  ];

  const filteredNav = filterMenuByIndustry(navigationItems, activeFirm?.category || 'TRADING');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* 1. App Update Banner */}
      <AppUpdateBanner />

      {/* 2. Original Top Header */}
      <div style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentView !== 'dashboard' && !isCreatingFirm ? (
            <button
              onClick={() => setCurrentView('dashboard')}
              style={{ backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              ← Dashboard
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ backgroundColor: '#0f172a', color: '#ffffff', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' }}>
                AB
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a', lineHeight: '1.1' }}>Account Book</div>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#0284c7', letterSpacing: '0.4px' }}>SMART MANAGER</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
          {activeFirm ? (activeFirm.trade_name || activeFirm.legal_name) : 'No Firm Configured'}
        </div>
      </div>

      {/* 3. Original Sub-Bar (Firm Picker + FY Picker + Menu) */}
      <div style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        
        {/* Firm Selector */}
        <div style={{ flex: 1.2, minWidth: '130px' }}>
          <select
            value={isCreatingFirm ? 'CREATE_NEW' : (activeFirm?.id || '')}
            onChange={handleFirmSelectChange}
            style={{ width: '100%', padding: '7px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: '700', backgroundColor: '#f8fafc', color: '#0f172a', textOverflow: 'ellipsis' }}
          >
            {firmsList.map(f => (
              <option key={f.id} value={f.id}>
                🏢 {f.legal_name} ({f.category || 'TRADING'})
              </option>
            ))}
            <option value="CREATE_NEW">➕ Create New Firm...</option>
          </select>
        </div>

        {/* Financial Year */}
        <div style={{ flex: 0.8, minWidth: '105px' }}>
          <select
            value={selectedFY}
            onChange={(e) => setSelectedFY(e.target.value)}
            style={{ width: '100%', padding: '7px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: '700', backgroundColor: '#f8fafc', color: '#334155' }}
          >
            <option value="FY 2026-27">FY 2026-27</option>
            <option value="FY 2025-26">FY 2025-26</option>
          </select>
        </div>

        {/* Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{ backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '7px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          ☰ Menu
        </button>
      </div>

      {/* 4. Menu Drawer */}
      {isMenuOpen && (
        <div style={{ backgroundColor: '#0f172a', padding: '12px 16px', borderBottom: '2px solid #1e293b', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
          {filteredNav.map(item => (
            <button
              key={item.key}
              onClick={() => {
                setCurrentView(item.key);
                setIsCreatingFirm(false);
                setIsMenuOpen(false);
              }}
              style={{
                backgroundColor: currentView === item.key && !isCreatingFirm ? '#0284c7' : '#1e293b',
                color: '#ffffff',
                border: '1px solid #334155',
                padding: '9px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => {
              setIsCreatingFirm(true);
              setIsMenuOpen(false);
            }}
            style={{ backgroundColor: '#10b981', color: '#ffffff', border: 'none', padding: '9px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', textAlign: 'left' }}
          >
            ➕ Add Another Firm
          </button>
        </div>
      )}

      {/* 5. Content View */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '14px', boxSizing: 'border-box' }}>
        {isCreatingFirm || !activeFirm ? (
          <CreateFirmForm 
            onFirmCreated={handleFirmCreated} 
            onCancel={firmsList.length > 0 ? () => setIsCreatingFirm(false) : null} 
          />
        ) : (
          <>
            {currentView === 'dashboard' && (
              <EnterpriseDashboard 
                firm={activeFirm} 
                onNavigate={(viewKey) => {
                  if (viewKey === 'firm_create') setIsCreatingFirm(true);
                  else setCurrentView(viewKey);
                }} 
              />
            )}
            {currentView === 'sales' && <CreateInvoice firm={activeFirm} />}
            {currentView === 'purchase' && <PurchaseStockEntryForm firm={activeFirm} />}
            {currentView === 'inventory' && <InventoryStockView firm={activeFirm} />}
            {currentView === 'milan' && <AccountStatementView firm={activeFirm} />}
            {currentView === 'backup' && <SecurityBackupSettings firm={activeFirm} />}
          </>
        )}
      </div>

    </div>
  );
}
