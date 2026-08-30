// frontend/src/App.jsx

import React, { useState, useEffect, lazy, Suspense } from 'react';
import NavbarHeader from './components/NavbarHeader.jsx';
import CreateFirmForm from './components/CreateFirmForm.jsx';
import AccountingDashboard from './components/AccountingDashboard.jsx';

import { filterMenuByIndustry } from './utils/industryEngine.js';
import { getActiveFirm } from './utils/multiFirmEngine.js';

// Lazy load heavy enterprise components to reduce initial launch bundle size
const CreateAccountHeadModal = lazy(() => import('./components/CreateAccountHeadModal.jsx'));
const InventoryStockView = lazy(() => import('./components/InventoryStockView.jsx'));
const CreateInvoice = lazy(() => import('./components/CreateInvoice.jsx'));
const PurchaseStockEntryForm = lazy(() => import('./components/PurchaseStockEntryForm.jsx'));
const VoucherEntryForm = lazy(() => import('./components/VoucherEntryForm.jsx'));
const BhattaProductionMasterView = lazy(() => import('./components/BhattaProductionMasterView.jsx'));
const BillSettlementView = lazy(() => import('./components/BillSettlementView.jsx'));
const AccountStatementView = lazy(() => import('./components/AccountStatementView.jsx'));
const JournalRegisterView = lazy(() => import('./components/JournalRegisterView.jsx'));
const FinancialReportsView = lazy(() => import('./components/FinancialReportsView.jsx'));
const SecurityBackupSettings = lazy(() => import('./components/SecurityBackupSettings.jsx'));
const DataPurgeView = lazy(() => import('./components/DataPurgeView.jsx'));

export default function App() {
  const [firm, setFirm] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    // Instant micro-task execution to hydrate initial state
    requestAnimationFrame(() => {
      const currentFirm = getActiveFirm();
      if (currentFirm) {
        setFirm(currentFirm);
        setActiveTab('dashboard');
      } else {
        setActiveTab('firm_setup');
      }
      setIsHydrating(false);
    });
  }, []);

  const handleSaveFirm = (newFirm) => {
    setFirm(newFirm);
    setActiveTab('dashboard');
  };

  const handleNavigate = (tabId) => {
    setActiveTab(tabId);
    setIsMenuOpen(false);
  };

  if (isHydrating) {
    return null; // Inline HTML loader in index.html will remain visible during this split second
  }

  const menuList = filterMenuByIndustry(firm?.industry_type || 'TRADING');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'Arial, sans-serif' }}>
      
      <NavbarHeader
        firm={firm}
        activeTab={activeTab}
        onNavigate={handleNavigate}
        onToggleMenu={() => setIsMenuOpen(!isMenuOpen)}
      />

      {isMenuOpen && firm && (
        <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '16px', borderBottom: '2px solid #2563eb' }}>
          <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '10px', color: '#94a3b8' }}>
            {firm.legal_name.toUpperCase()} ({firm.industry_type}) WORKFLOW MENU
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
            {menuList.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                style={{
                  backgroundColor: activeTab === item.id ? '#2563eb' : '#1e293b',
                  color: '#ffffff',
                  border: '1px solid #334155',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <main style={{ padding: '16px', maxWidth: '1000px', margin: '0 auto' }}>
        {!firm || activeTab === 'firm_setup' ? (
          <CreateFirmForm onSave={handleSaveFirm} existingFirm={firm} />
        ) : (
          <Suspense fallback={
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              ⚡ Loading module...
            </div>
          }>
            {activeTab === 'dashboard' && <AccountingDashboard firm={firm} onNavigate={handleNavigate} />}
            {activeTab === 'create_account' && <CreateAccountHeadModal firm={firm} onClose={() => setActiveTab('dashboard')} />}
            {activeTab === 'inventory' && <InventoryStockView firm={firm} />}
            {activeTab === 'billing' && <CreateInvoice firm={firm} />}
            {activeTab === 'purchase' && <PurchaseStockEntryForm firm={firm} />}
            {activeTab === 'vouchers' && <VoucherEntryForm firm={firm} />}
            {activeTab === 'bhatta_prod' && firm.industry_type === 'BRICK_KILN' && <BhattaProductionMasterView firm={firm} />}
            {activeTab === 'settlement' && <BillSettlementView firm={firm} />}
            {activeTab === 'ledger' && <AccountStatementView firm={firm} />}
            {activeTab === 'journal' && <JournalRegisterView firm={firm} />}
            {activeTab === 'reports' && <FinancialReportsView firm={firm} />}
            {activeTab === 'backup' && <SecurityBackupSettings />}
            {activeTab === 'purge' && <DataPurgeView />}
          </Suspense>
        )}
      </main>

    </div>
  );
}
