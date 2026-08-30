// frontend/src/App.jsx

import React, { useState, useEffect } from 'react';
import EnterpriseDashboard from './components/EnterpriseDashboard.jsx';
import AccountStatementView from './components/AccountStatementView.jsx';
import JournalRegisterView from './components/JournalRegisterView.jsx';
import VoucherEntryForm from './components/VoucherEntryForm.jsx';
import SecurityBackupSettings from './components/SecurityBackupSettings.jsx';
import DataPurgeView from './components/DataPurgeView.jsx';
import FinancialReportsView from './components/FinancialReportsView.jsx';
import CreateAccountHeadModal from './components/CreateAccountHeadModal.jsx';
import InventoryStockView from './components/InventoryStockView.jsx';
import CreateInvoice from './components/CreateInvoice.jsx';
import BillSettlementView from './components/BillSettlementView.jsx';
import CreateFirmForm from './components/CreateFirmForm.jsx';
import BhattaProductionMasterView from './components/BhattaProductionMasterView.jsx';

import { SORTED_ACCOUNTING_MENU } from './utils/navigationRegistry.js';
import { isFirstTimeUser } from './utils/firmValidationEngine.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeFirm, setActiveFirm] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const syncFirmState = () => {
    const firstTime = isFirstTimeUser();
    setNeedsOnboarding(firstTime);

    if (firstTime) {
      setActiveTab('firm_setup');
    } else {
      const firm = JSON.parse(localStorage.getItem('active_firm_profile'));
      setActiveFirm(firm);
    }
  };

  useEffect(() => {
    syncFirmState();
    window.addEventListener('storage', syncFirmState);
    return () => window.removeEventListener('storage', syncFirmState);
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Navbar Header */}
      <header style={{ backgroundColor: '#0f172a', color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{activeFirm?.legal_name || 'Business Onboarding Required'}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>GSTIN: {activeFirm?.gstin || 'Unregistered'} | Category: {activeFirm?.industry_type || 'Setup Pending'}</div>
        </div>

        {!needsOnboarding && (
          <button 
            onClick={() => setIsDrawerOpen(true)}
            style={{ backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ☰ Navigation Menu
          </button>
        )}
      </header>

      {/* Ascending Order Slide-out Drawer */}
      {isDrawerOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex' }}>
          <div style={{ width: '320px', backgroundColor: '#0f172a', color: '#fff', height: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>WORKFLOW SEQUENCED MENU</span>
              <button onClick={() => setIsDrawerOpen(false)} style={{ backgroundColor: '#1e293b', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>✕ Close</button>
            </div>

            {SORTED_ACCOUNTING_MENU.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsDrawerOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeTab === item.id ? '#2563eb' : 'transparent',
                  color: '#ffffff',
                  fontWeight: activeTab === item.id ? 'bold' : 'normal',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} onClick={() => setIsDrawerOpen(false)} />
        </div>
      )}

      {needsOnboarding && (
        <div style={{ backgroundColor: '#eff6ff', borderBottom: '1px solid #bfdbfe', padding: '12px', textAlign: 'center', color: '#1e40af', fontSize: '13px', fontWeight: 'bold' }}>
          👋 Welcome to Account Book! Kripya pehle Step 1 (Firm Profile Settings) me apni firm details save karein.
        </div>
      )}

      {/* Main View Router */}
      <main style={{ padding: '16px', maxWidth: '1000px', margin: '0 auto' }}>
        {activeTab === 'firm_setup' && <CreateFirmForm onSaved={() => { syncFirmState(); setActiveTab('dashboard'); }} />}
        {activeTab === 'create_account' && <CreateAccountHeadModal onClose={() => setActiveTab('ledger')} />}
        {activeTab === 'inventory' && <InventoryStockView />}
        {activeTab === 'billing' && <CreateInvoice firm={activeFirm} />}
        {activeTab === 'vouchers' && <VoucherEntryForm firm={activeFirm} />}
        {activeTab === 'bhatta_prod' && <BhattaProductionMasterView />}
        {activeTab === 'settlement' && <BillSettlementView firm={activeFirm} />}
        {activeTab === 'dashboard' && <EnterpriseDashboard firm={activeFirm} onNavigate={(tab) => setActiveTab(tab)} />}
        {activeTab === 'ledger' && <AccountStatementView firm={activeFirm} />}
        {activeTab === 'journal' && <JournalRegisterView firm={activeFirm} />}
        {activeTab === 'reports' && <FinancialReportsView firm={activeFirm} />}
        {activeTab === 'backup' && <SecurityBackupSettings />}
        {activeTab === 'purge' && <DataPurgeView />}
      </main>
    </div>
  );
}
