// frontend/src/App.jsx

import React, { useState } from 'react';

// Component Imports
import EnterpriseDashboard from './components/EnterpriseDashboard.jsx';
import AccountStatementView from './components/AccountStatementView.jsx';
import CreateAccountHeadModal from './components/CreateAccountHeadModal.jsx';
import CreateInvoice from './components/CreateInvoice.jsx';
import VoucherEntryForm from './components/VoucherEntryForm.jsx';
import BillSettlementView from './components/BillSettlementView.jsx';
import FinancialReportsView from './components/FinancialReportsView.jsx';
import SecurityBackupSettings from './components/SecurityBackupSettings.jsx';
import InventoryStockView from './components/InventoryStockView.jsx';
import CreateFirmForm from './components/CreateFirmForm.jsx';

export default function App() {
  const [activeFirm, setActiveFirm] = useState(() => {
    try {
      const saved = localStorage.getItem('active_firm_profile');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('active_firm_profile') ? 'dashboard' : 'firm_setup';
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setIsMenuOpen(false);
  };

  // Complete Sidebar Navigation List (Backup & Inventory Added)
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard & Overview', icon: '📊' },
    { id: 'statement', label: 'Account Milan & Ledger', icon: '📖' },
    { id: 'create_account', label: 'Create Account Head', icon: '➕' },
    { id: 'inventory', label: 'Inventory & Stock Master', icon: '📦' },
    { id: 'billing', label: 'Sales Billing & Invoicing', icon: '🧾' },
    { id: 'voucher', label: 'Voucher Entry (JV/PV/RV)', icon: '📒' },
    { id: 'settlement', label: 'Bill Settlement (FIFO)', icon: '💳' },
    { id: 'reports', label: 'Financial Reports (P&L / BS)', icon: '📈' },
    { id: 'backup', label: 'Data Backup & Protection', icon: '🔒' },
    { id: 'firm_setup', label: 'Firm Profile Settings', icon: '⚙️' }
  ];

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      
      {/* Top Header */}
      <header style={{ backgroundColor: '#0f172a', color: '#fff', height: '60px', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000 }}>
        <div>
          <strong style={{ fontSize: '15px' }}>{activeFirm ? activeFirm.legal_name : 'Account Book Engine'}</strong>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>GSTIN: {activeFirm?.gstin || 'Unregistered'}</div>
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
          {isMenuOpen ? '✕ Close' : '☰ Accounting Suite'}
        </button>
      </header>

      {/* Mobile Backdrop */}
      {isMenuOpen && (
        <div style={{ position: 'fixed', top: '60px', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1100 }} onClick={() => setIsMenuOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside style={{ position: 'fixed', top: '60px', bottom: 0, left: isMenuOpen ? '0px' : '-300px', width: '280px', backgroundColor: '#0f172a', zIndex: 1200, transition: 'left 0.25s ease', padding: '16px', boxSizing: 'border-box', overflowY: 'auto' }}>
        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', marginBottom: '12px' }}>MAIN ACCOUNTING MODULES</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                color: '#fff',
                fontSize: '13px',
                textAlign: 'left',
                cursor: 'pointer',
                backgroundColor: activeTab === item.id ? '#2563eb' : '#1e293b'
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Workspace Router */}
      <main style={{ padding: '16px', maxWidth: '1100px', margin: '0 auto' }}>
        {!activeFirm || activeTab === 'firm_setup' ? (
          <CreateFirmForm onFirmCreated={(firm) => { localStorage.setItem('active_firm_profile', JSON.stringify(firm)); setActiveFirm(firm); setActiveTab('dashboard'); }} />
        ) : (
          <>
            {activeTab === 'dashboard' && <EnterpriseDashboard firm={activeFirm} onNavigate={(tab) => setActiveTab(tab)} />}
            {activeTab === 'statement' && <AccountStatementView firm={activeFirm} />}
            {activeTab === 'create_account' && <CreateAccountHeadModal firmId={activeFirm?.id} />}
            {activeTab === 'inventory' && <InventoryStockView firm={activeFirm} />}
            {activeTab === 'billing' && <CreateInvoice firm={activeFirm} />}
            {activeTab === 'voucher' && <VoucherEntryForm firm={activeFirm} />}
            {activeTab === 'settlement' && <BillSettlementView firm={activeFirm} />}
            {activeTab === 'reports' && <FinancialReportsView firm={activeFirm} />}
            {activeTab === 'backup' && <SecurityBackupSettings />}
          </>
        )}
      </main>
    </div>
  );
}
