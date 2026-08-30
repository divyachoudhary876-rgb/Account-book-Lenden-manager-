// frontend/src/App.jsx

import React, { useState, useEffect } from 'react';
import NavbarHeader from './components/NavbarHeader.jsx';
import CreateFirmForm from './components/CreateFirmForm.jsx';
import AccountingDashboard from './components/AccountingDashboard.jsx';
import CreateAccountHeadModal from './components/CreateAccountHeadModal.jsx';
import InventoryStockView from './components/InventoryStockView.jsx';
import CreateInvoice from './components/CreateInvoice.jsx';
import PurchaseStockEntryForm from './components/PurchaseStockEntryForm.jsx';
import VoucherEntryForm from './components/VoucherEntryForm.jsx';
import BhattaProductionMasterView from './components/BhattaProductionMasterView.jsx';
import BillSettlementView from './components/BillSettlementView.jsx';
import AccountStatementView from './components/AccountStatementView.jsx';
import JournalRegisterView from './components/JournalRegisterView.jsx';
import FinancialReportsView from './components/FinancialReportsView.jsx';
import SecurityBackupSettings from './components/SecurityBackupSettings.jsx';
import DataPurgeView from './components/DataPurgeView.jsx';

import { filterMenuByIndustry, getIndustryDefaultInventory } from './utils/industryEngine.js';
import { runSafeAppMigration } from './utils/databaseMigrationEngine.js';

export default function App() {
  const [firm, setFirm] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    runSafeAppMigration();

    const stored = JSON.parse(localStorage.getItem('active_firm_profile') || 'null');
    if (stored && stored.legal_name) {
      setFirm(stored);
      setActiveTab('dashboard');
    } else {
      setActiveTab('firm_setup');
    }
  }, []);

  const handleSaveFirm = (newFirm) => {
    localStorage.setItem('active_firm_profile', JSON.stringify(newFirm));
    setFirm(newFirm);

    // Initialize Industry Specific Stock
    const defaultStock = getIndustryDefaultInventory(newFirm.industry_type);
    localStorage.setItem('app_inventory', JSON.stringify(defaultStock));

    setActiveTab('dashboard');
  };

  const handleNavigate = (tabId) => {
    setActiveTab(tabId);
    setIsMenuOpen(false);
  };

  const menuList = filterMenuByIndustry(firm?.industry_type || 'TRADING');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Header Bar with Guaranteed Back Button Action */}
      <NavbarHeader
        firm={firm}
        activeTab={activeTab}
        onNavigate={handleNavigate}
        onToggleMenu={() => setIsMenuOpen(!isMenuOpen)}
      />

      {/* Dynamic Industry Filtered Drawer */}
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

      {/* Dynamic Router */}
      <main style={{ padding: '16px', maxWidth: '1000px', margin: '0 auto' }}>
        {!firm || activeTab === 'firm_setup' ? (
          <CreateFirmForm onSave={handleSaveFirm} existingFirm={firm} />
        ) : (
          <>
            {activeTab === 'dashboard' && <AccountingDashboard firm={firm} onNavigate={handleNavigate} />}
            {activeTab === 'create_account' && <CreateAccountHeadModal onClose={() => setActiveTab('dashboard')} />}
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
          </>
        )}
      </main>

    </div>
  );
}
