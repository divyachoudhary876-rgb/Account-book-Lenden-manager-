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
import { runSafeAppMigration } from './utils/databaseMigrationEngine.js';

export default function App() {
  const [firm, setFirm] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Run database migration for update stability
    runSafeAppMigration();

    // 2. Check for existing firm setup
    const savedFirm = JSON.parse(localStorage.getItem('active_firm_profile') || 'null');
    
    if (savedFirm && savedFirm.legal_name) {
      setFirm(savedFirm);
      setActiveTab('dashboard'); // Existing User ➔ Go to Dashboard
    } else {
      setActiveTab('firm_setup'); // First-Time User ➔ Go to Setup Wizard
    }
    setIsLoading(false);
  }, []);

  const handleFirmCreated = (newFirmData) => {
    localStorage.setItem('active_firm_profile', JSON.stringify(newFirmData));
    setFirm(newFirmData);
    setActiveTab('dashboard'); // Redirect to Dashboard after creation
  };

  const handleNavigate = (tabId) => {
    setActiveTab(tabId);
    setIsMenuOpen(false);
  };

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center', fontWeight: 'bold' }}>⏳ Loading Business Workspace...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Top Application Header */}
      <NavbarHeader firm={firm} onOpenMenu={() => setIsMenuOpen(!isMenuOpen)} />

      {/* Navigation Suite Drawer (Only enabled once firm is created) */}
      {isMenuOpen && firm && (
        <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '16px', borderBottom: '2px solid #2563eb' }}>
          <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '10px', color: '#94a3b8' }}>ACCOUNTING WORKFLOW MENU</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
            <button onClick={() => handleNavigate('dashboard')} style={{ ...menuBtnStyle, backgroundColor: activeTab === 'dashboard' ? '#2563eb' : '#1e293b' }}>📊 1. Firm Dashboard & Overview</button>
            <button onClick={() => handleNavigate('firm_setup')} style={menuBtnStyle}>⚙️ 2. Firm Profile Settings</button>
            <button onClick={() => handleNavigate('create_account')} style={menuBtnStyle}>➕ 3. Create Account Head</button>
            <button onClick={() => handleNavigate('inventory')} style={menuBtnStyle}>📦 4. Inventory & Stock Master</button>
            <button onClick={() => handleNavigate('billing')} style={menuBtnStyle}>🧾 5. Sales Billing & Invoicing</button>
            <button onClick={() => handleNavigate('purchase')} style={menuBtnStyle}>🛍️ 6. Purchase Entry & Inward Stock</button>
            <button onClick={() => handleNavigate('vouchers')} style={menuBtnStyle}>📒 7. Voucher Entry (JV/PV/RV)</button>
            <button onClick={() => handleNavigate('bhatta_prod')} style={menuBtnStyle}>🧱 8. Brick Production / Nikasi</button>
            <button onClick={() => handleNavigate('settlement')} style={menuBtnStyle}>💳 9. Bill Settlement (FIFO)</button>
            <button onClick={() => handleNavigate('ledger')} style={menuBtnStyle}>📖 10. Account Milan & Ledger</button>
            <button onClick={() => handleNavigate('journal')} style={menuBtnStyle}>📝 11. General Journal Register</button>
            <button onClick={() => handleNavigate('reports')} style={menuBtnStyle}>📈 12. Financial Reports (P&L / BS)</button>
            <button onClick={() => handleNavigate('backup')} style={menuBtnStyle}>🔒 13. Data Backup & Protection</button>
            <button onClick={() => handleNavigate('purge')} style={menuBtnStyle}>🗑️ 14. Clear Demo Data</button>
          </div>
        </div>
      )}

      {/* Main Workspace Dynamic Router */}
      <main style={{ padding: '16px', maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* FIRST-TIME USER FLOW */}
        {!firm || activeTab === 'firm_setup' ? (
          <CreateFirmForm onSave={handleFirmCreated} existingFirm={firm} />
        ) : (
          /* EXISTING USER DASHBOARD & WORKFLOW FLOW */
          <>
            {activeTab === 'dashboard' && <AccountingDashboard firm={firm} onNavigate={handleNavigate} />}
            {activeTab === 'create_account' && <CreateAccountHeadModal onClose={() => setActiveTab('dashboard')} />}
            {activeTab === 'inventory' && <InventoryStockView firm={firm} />}
            {activeTab === 'billing' && <CreateInvoice firm={firm} />}
            {activeTab === 'purchase' && <PurchaseStockEntryForm firm={firm} />}
            {activeTab === 'vouchers' && <VoucherEntryForm firm={firm} />}
            {activeTab === 'bhatta_prod' && <BhattaProductionMasterView firm={firm} />}
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

const menuBtnStyle = {
  backgroundColor: '#1e293b',
  color: '#ffffff',
  border: '1px solid #334155',
  padding: '10px 12px',
  borderRadius: '6px',
  textAlign: 'left',
  fontWeight: 'bold',
  fontSize: '12px',
  cursor: 'pointer'
};
