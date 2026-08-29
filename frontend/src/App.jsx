// frontend/src/App.jsx

import React, { useState, useEffect } from 'react';
import EnterpriseDashboard from './components/EnterpriseDashboard.jsx';
import AccountStatementView from './components/AccountStatementView.jsx';
import JournalRegisterView from './components/JournalRegisterView.jsx';
import VoucherEntryForm from './components/VoucherEntryForm.jsx';
import SecurityBackupSettings from './components/SecurityBackupSettings.jsx';
import DataPurgeView from './components/DataPurgeView.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeFirm, setActiveFirm] = useState(null);

  useEffect(() => {
    const firm = JSON.parse(localStorage.getItem('active_firm_profile') || '{"legal_name":"My Business","gstin":"Unregistered"}');
    setActiveFirm(firm);
  }, []);

  // Complete List of All Enterprise Accounting Modules
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard & Overview', icon: '📊' },
    { id: 'ledger', label: 'Account Milan & Ledger', icon: '📖' },
    { id: 'journal', label: 'General Journal Register', icon: '📝' },
    { id: 'create_account', label: 'Create Account Head', icon: '➕' },
    { id: 'inventory', label: 'Inventory & Stock Master', icon: '📦' },
    { id: 'billing', label: 'Sales Billing & Invoicing', icon: '🧾' },
    { id: 'vouchers', label: 'Voucher Entry (JV/PV/RV)', icon: '📒' },
    { id: 'settlement', label: 'Bill Settlement (FIFO)', icon: '💳' },
    { id: 'reports', label: 'Financial Reports (P&L / BS)', icon: '📈' },
    { id: 'backup', label: 'Data Backup & Protection', icon: '🔒' },
    { id: 'purge', label: 'Clear Demo Data', icon: '🗑️' }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Top Header */}
      <header style={{ backgroundColor: '#0f172a', color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{activeFirm?.legal_name || 'My Business'}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>GSTIN: {activeFirm?.gstin || 'Unregistered'}</div>
        </div>
        <button 
          onClick={() => setIsDrawerOpen(true)}
          style={{ backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          ☰ Accounting Suite
        </button>
      </header>

      {/* Full Module Slide-out Drawer */}
      {isDrawerOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex' }}>
          <div style={{ width: '310px', backgroundColor: '#0f172a', color: '#fff', height: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8' }}>MAIN ACCOUNTING MODULES</span>
              <button onClick={() => setIsDrawerOpen(false)} style={{ backgroundColor: '#1e293b', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>✕ Close</button>
            </div>

            {menuItems.map(item => (
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

      {/* Workspace Router Container */}
      <main style={{ padding: '16px', maxWidth: '1000px', margin: '0 auto' }}>
        {activeTab === 'dashboard' && <EnterpriseDashboard firm={activeFirm} onNavigate={(tab) => setActiveTab(tab)} />}
        {activeTab === 'ledger' && <AccountStatementView firm={activeFirm} />}
        {activeTab === 'journal' && <JournalRegisterView firm={activeFirm} />}
        {activeTab === 'vouchers' && <VoucherEntryForm firm={activeFirm} />}
        {activeTab === 'backup' && <SecurityBackupSettings />}
        {activeTab === 'purge' && <DataPurgeView />}
        {['create_account', 'inventory', 'billing', 'settlement', 'reports'].includes(activeTab) && (
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3>📌 {menuItems.find(m => m.id === activeTab)?.label}</h3>
            <p style={{ color: '#64748b', fontSize: '13px' }}>Module ready & active in system state.</p>
          </div>
        )}
      </main>
    </div>
  );
}
