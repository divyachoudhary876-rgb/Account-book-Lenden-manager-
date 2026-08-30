// frontend/src/App.jsx

import React, { useState, useEffect } from 'react';
import NavbarHeader from './components/NavbarHeader.jsx';
import CreateFirmForm from './components/CreateFirmForm.jsx';
import CreateAccountHeadModal from './components/CreateAccountHeadModal.jsx';
import InventoryStockView from './components/InventoryStockView.jsx';
import CreateInvoice from './components/CreateInvoice.jsx';
import PurchaseStockEntryForm from './components/PurchaseStockEntryForm.jsx';
import VoucherEntryForm from './components/VoucherEntryForm.jsx';
import BhattaProductionMasterView from './components/BhattaProductionMasterView.jsx';
import BillSettlementView from './components/BillSettlementView.jsx';
import AccountingDashboard from './components/AccountingDashboard.jsx';
import AccountStatementView from './components/AccountStatementView.jsx';
import JournalRegisterView from './components/JournalRegisterView.jsx';
import FinancialReportsView from './components/FinancialReportsView.jsx';
import SecurityBackupSettings from './components/SecurityBackupSettings.jsx';
import DataPurgeView from './components/DataPurgeView.jsx';
import { runSafeAppMigration } from './utils/databaseMigrationEngine.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('bhatta_prod');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [firm, setFirm] = useState({
    id: 'FIRM-001',
    legal_name: 'Neelkanth Int Udyog',
    industry_type: 'BRICK_KILN',
    gstin: '08AAAAA0000A1Z5'
  });

  useEffect(() => {
    // Run safe migration on startup to preserve user data across app re-installs/updates
    runSafeAppMigration();
    
    const savedFirm = JSON.parse(localStorage.getItem('active_firm_profile') || 'null');
    if (savedFirm) setFirm(savedFirm);
  }, []);

  const handleNavigate = (tabId) => {
    setActiveTab(tabId);
    setIsMenuOpen(false);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Top Application Navbar & Logo Header */}
      <NavbarHeader firm={firm} onOpenMenu={() => setIsMenuOpen(!isMenuOpen)} />

      {/* Navigation Drawer Sequence */}
      {isMenuOpen && (
        <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '16px', borderBottom: '2px solid #2563eb' }}>
          <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '10px', color: '#94a3b8' }}>ACCOUNTING WORKFLOW MENU</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
            <button onClick={() => handleNavigate('firm_setup')} style={menuBtnStyle}>1. Firm Profile Settings</button>
            <button onClick={() => handleNavigate('create_account')} style={menuBtnStyle}>2. Create Account Head</button>
            <button onClick={() => handleNavigate('inventory')} style={menuBtnStyle}>3. Inventory & Stock Master</button>
            <button onClick={() => handleNavigate('billing')} style={menuBtnStyle}>4. Sales Billing & Invoicing</button>
            <button onClick={() => handleNavigate('purchase')} style={menuBtnStyle}>5. Purchase Entry & Inward Stock</button>
            <button onClick={() => handleNavigate('vouchers')} style={menuBtnStyle}>6. Voucher Entry (JV/PV/RV)</button>
            <button onClick={() => handleNavigate('bhatta_prod')} style={menuBtnStyle}>7. Brick Production / Nikasi</button>
            <button onClick={() => handleNavigate('settlement')} style={menuBtnStyle}>8. Bill Settlement (FIFO)</button>
            <button onClick={() => handleNavigate('dashboard')} style={menuBtnStyle}>9. Dashboard & Overview</button>
            <button onClick={() => handleNavigate('ledger')} style={menuBtnStyle}>10. Account Milan & Ledger</button>
            <button onClick={() => handleNavigate('journal')} style={menuBtnStyle}>11. General Journal Register</button>
            <button onClick={() => handleNavigate('reports')} style={menuBtnStyle}>12. Financial Reports (P&L / BS)</button>
            <button onClick={() => handleNavigate('backup')} style={menuBtnStyle}>13. Data Backup & Protection</button>
            <button onClick={() => handleNavigate('purge')} style={menuBtnStyle}>14. Clear Demo Data</button>
          </div>
        </div>
      )}

      {/* Dynamic Main Workspace Router */}
      <main style={{ padding: '16px', maxWidth: '1000px', margin: '0 auto' }}>
        {activeTab === 'firm_setup' && <CreateFirmForm onSave={(f) => setFirm(f)} />}
        {activeTab === 'create_account' && <CreateAccountHeadModal onClose={() => setActiveTab('bhatta_prod')} />}
        {activeTab === 'inventory' && <InventoryStockView firm={firm} />}
        {activeTab === 'billing' && <CreateInvoice firm={firm} />}
        {activeTab === 'purchase' && <PurchaseStockEntryForm firm={firm} />}
        {activeTab === 'vouchers' && <VoucherEntryForm firm={firm} />}
        {activeTab === 'bhatta_prod' && <BhattaProductionMasterView firm={firm} />}
        {activeTab === 'settlement' && <BillSettlementView firm={firm} />}
        {activeTab === 'dashboard' && <AccountingDashboard firm={firm} />}
        {activeTab === 'ledger' && <AccountStatementView firm={firm} />}
        {activeTab === 'journal' && <JournalRegisterView firm={firm} />}
        {activeTab === 'reports' && <FinancialReportsView firm={firm} />}
        {activeTab === 'backup' && <SecurityBackupSettings />}
        {activeTab === 'purge' && <DataPurgeView />}
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
