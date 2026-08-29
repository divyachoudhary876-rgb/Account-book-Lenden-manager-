// frontend/src/App.jsx

import React, { useState } from 'react';

// Import Components
import AccountStatementView from './components/AccountStatementView.jsx';
import CreateInvoice from './components/CreateInvoice.jsx';
import VoucherEntryForm from './components/VoucherEntryForm.jsx';
import CreateFirmForm from './components/CreateFirmForm.jsx';
import BillSettlementView from './components/BillSettlementView.jsx';
import FinancialReportsView from './components/FinancialReportsView.jsx';

export default function App() {
  const [activeFirm, setActiveFirm] = useState(() => {
    try {
      const saved = localStorage.getItem('active_firm_profile');
      return saved ? JSON.parse(saved) : { legal_name: 'My Business Firm', gstin: '' };
    } catch (e) {
      return { legal_name: 'My Business Firm', gstin: '' };
    }
  });

  const [activeTab, setActiveTab] = useState('statement');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  const handleTabSelect = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false); // Force close mobile drawer immediately
  };

  const handleFirmCreated = (firmData) => {
    localStorage.setItem('active_firm_profile', JSON.stringify(firmData));
    setActiveFirm(firmData);
    setActiveTab('statement');
    setMobileMenuOpen(false);
  };

  const handlePurgeData = () => {
    if (confirmInput.trim() !== 'DELETE MY DATA') {
      return alert('Incorrect Confirmation! Type "DELETE MY DATA" exact.');
    }
    localStorage.clear();
    setActiveFirm({ legal_name: 'My Business Firm', gstin: '' });
    setActiveTab('firm_setup');
    setIsResetModalOpen(false);
    setConfirmInput('');
    alert('All Data Cleared Successfully.');
  };

  const menuItems = [
    { id: 'statement', label: 'Account Milan', icon: '📖' },
    { id: 'billing', label: 'Sales Billing', icon: '🧾' },
    { id: 'voucher', label: 'Voucher Entry', icon: '📒' },
    { id: 'settlement', label: 'Bill Settlement', icon: '💳' },
    { id: 'reports', label: 'Financial Reports', icon: '📊' },
    { id: 'firm_setup', label: 'Firm Profile Setup', icon: '⚙️' },
  ];

  return (
    <div style={styles.appShell}>
      {/* 1. Top Header */}
      <header style={styles.topHeader}>
        <div style={styles.brandGroup}>
          <span style={{ fontSize: '22px' }}>📘</span>
          <div>
            <div style={styles.brandTitle}>{activeFirm?.legal_name || 'My Business Firm'}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
              {activeFirm?.gstin ? `GSTIN: ${activeFirm.gstin}` : 'Active Workspace'}
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          style={styles.mobileHamburger}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* 2. Main Workspace Layout */}
      <div style={styles.layoutBody}>
        
        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div style={styles.drawerBackdrop} onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Sidebar Menu */}
        <aside style={{
          ...styles.sidebar,
          transform: mobileMenuOpen ? 'translateX(0)' : undefined,
        }} className={mobileMenuOpen ? 'mobile-drawer-open' : 'desktop-sidebar'}>
          <div style={styles.sidebarHeader}>MAIN NAVIGATION</div>
          <nav style={styles.navMenu}>
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleTabSelect(item.id)}
                style={{
                  ...styles.navItem,
                  backgroundColor: activeTab === item.id ? '#2563eb' : 'transparent',
                  color: activeTab === item.id ? '#ffffff' : '#cbd5e1',
                  fontWeight: activeTab === item.id ? '700' : '500',
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div style={styles.sidebarFooter}>
            <button onClick={() => { setMobileMenuOpen(false); setIsResetModalOpen(true); }} style={styles.btnSecureReset}>
              🔒 Security & Purge Settings
            </button>
          </div>
        </aside>

        {/* Workspace Screens */}
        <main style={styles.workspace}>
          <div style={styles.contentContainer}>
            {activeTab === 'statement' && <AccountStatementView firm={activeFirm} />}
            {activeTab === 'billing' && <CreateInvoice firm={activeFirm} />}
            {activeTab === 'voucher' && <VoucherEntryForm firm={activeFirm} />}
            {activeTab === 'settlement' && <BillSettlementView firm={activeFirm} />}
            {activeTab === 'reports' && <FinancialReportsView firm={activeFirm} />}
            {activeTab === 'firm_setup' && <CreateFirmForm onFirmCreated={handleFirmCreated} />}
          </div>
        </main>
      </div>

      {/* Security Data Purge Modal */}
      {isResetModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContainer}>
            <h3 style={{ color: '#dc2626', margin: '0 0 10px 0' }}>⚠️ Data Reset Confirmation</h3>
            <p style={{ fontSize: '12px', color: '#475569' }}>
              Saara local business data aur entries clean ho jayengi. Confirm karne ke liye niche "<strong>DELETE MY DATA</strong>" type karein:
            </p>
            <input 
              type="text" 
              value={confirmInput} 
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="DELETE MY DATA"
              style={styles.modalInput}
            />
            <div style={styles.modalActions}>
              <button onClick={() => setIsResetModalOpen(false)} style={styles.btnCancel}>Cancel</button>
              <button 
                onClick={handlePurgeData}
                disabled={confirmInput.trim() !== 'DELETE MY DATA'}
                style={{
                  ...styles.btnPurge,
                  backgroundColor: confirmInput.trim() === 'DELETE MY DATA' ? '#dc2626' : '#cbd5e1'
                }}
              >
                Purge All Data
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar {
            position: fixed;
            top: 60px;
            left: 0;
            bottom: 0;
            z-index: 1000;
            width: 260px !important;
            transform: ${mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)'};
            transition: transform 0.25s ease-in-out;
            box-shadow: 4px 0 12px rgba(0,0,0,0.3);
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  appShell: { fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' },
  topHeader: { backgroundColor: '#0f172a', color: '#f8fafc', height: '60px', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1001 },
  brandGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
  brandTitle: { fontSize: '15px', fontWeight: '700', color: '#ffffff' },
  mobileHamburger: { background: 'none', border: 'none', color: '#ffffff', fontSize: '24px', cursor: 'pointer' },
  layoutBody: { display: 'flex', flex: 1, position: 'relative' },
  drawerBackdrop: { position: 'fixed', top: '60px', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 999 },
  sidebar: { width: '250px', backgroundColor: '#0f172a', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '8px', borderRight: '1px solid #1e293b' },
  sidebarHeader: { fontSize: '11px', color: '#64748b', fontWeight: '700', paddingLeft: '8px', marginBottom: '8px' },
  navMenu: { display: 'flex', flexDirection: 'column', gap: '4px' },
  navItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', border: 'none', fontSize: '14px', width: '100%', textAlign: 'left', cursor: 'pointer' },
  sidebarFooter: { marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #1e293b' },
  btnSecureReset: { width: '100%', padding: '8px', backgroundColor: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  workspace: { flex: 1, padding: '16px', overflowY: 'auto' },
  contentContainer: { maxWidth: '1000px', margin: '0 auto' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  modalContainer: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '400px' },
  modalInput: { width: '100%', padding: '10px', borderRadius: '6px', border: '2px solid #ef4444', marginTop: '10px', boxSizing: 'border-box' },
  modalActions: { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' },
  btnCancel: { padding: '8px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  btnPurge: { padding: '8px 14px', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }
};
