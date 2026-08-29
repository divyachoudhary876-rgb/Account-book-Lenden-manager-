// frontend/src/App.jsx

import React, { useState, useEffect } from 'react';

// Import All Core Modules
import AccountStatementView from './components/AccountStatementView.jsx';
import CreateInvoice from './components/CreateInvoice.jsx';
import VoucherEntryForm from './components/VoucherEntryForm.jsx';
import CreateFirmForm from './components/CreateFirmForm.jsx';
import BillSettlementView from './components/BillSettlementView.jsx';
import FinancialReportsView from './components/FinancialReportsView.jsx';

export default function App() {
  const [activeFirm, setActiveFirm] = useState(() => {
    return JSON.parse(localStorage.getItem('active_firm_profile')) || null;
  });

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('active_firm_profile') ? 'statement' : 'firm_setup';
  });

  // Navigation Drawer State Control (Default False to fix stuck overlay)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Destructive Action Guard Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  const handleFirmCreated = (firmData) => {
    localStorage.setItem('active_firm_profile', JSON.stringify(firmData));
    setActiveFirm(firmData);
    setActiveTab('statement');
    setMobileMenuOpen(false);
  };

  // Secure Purge System Data with Confirmation Validation
  const handlePurgeData = () => {
    if (confirmInput.trim() !== 'DELETE MY DATA') {
      return alert('Incorrect Confirmation Code! Type "DELETE MY DATA" to proceed.');
    }
    localStorage.clear();
    setActiveFirm(null);
    setActiveTab('firm_setup');
    setIsResetModalOpen(false);
    setConfirmInput('');
    alert('System database wiped successfully.');
  };

  const menuItems = [
    { id: 'statement', label: 'Account Milan', icon: '📖', disabled: !activeFirm },
    { id: 'billing', label: 'Sales Billing', icon: '🧾', disabled: !activeFirm },
    { id: 'voucher', label: 'Voucher Entry', icon: '📒', disabled: !activeFirm },
    { id: 'settlement', label: 'Bill Settlement', icon: '💳', disabled: !activeFirm },
    { id: 'reports', label: 'Financial Reports', icon: '📊', disabled: !activeFirm },
    { id: 'firm_setup', label: 'Firm Profile Setup', icon: '⚙️', disabled: false },
  ];

  return (
    <div style={styles.appShell}>
      {/* 1. Global Navigation Top Header */}
      <header style={styles.topHeader}>
        <div style={styles.brandGroup}>
          <span style={{ fontSize: '22px' }}>📘</span>
          <div>
            <div style={styles.brandTitle}>
              {activeFirm ? activeFirm.legal_name : 'Account Book Engine'}
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
              {activeFirm ? `GSTIN: ${activeFirm.gstin || 'N/A'}` : 'System Ready • Setup Firm'}
            </div>
          </div>
        </div>
        
        {/* Toggle Button for Mobile Drawer */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          style={styles.mobileHamburger}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* 2. Main Layout Shell */}
      <div style={styles.layoutBody}>
        
        {/* Mobile Backdrop Overlay (Clicking outside closes drawer) */}
        {mobileMenuOpen && (
          <div 
            style={styles.drawerBackdrop} 
            onClick={() => setMobileMenuOpen(false)} 
          />
        )}

        {/* Dynamic Sidebar Navigation Menu */}
        <aside style={{
          ...styles.sidebar,
          transform: mobileMenuOpen ? 'translateX(0)' : undefined,
        }} className={mobileMenuOpen ? 'mobile-drawer-open' : 'desktop-sidebar'}>
          <div style={styles.sidebarHeader}>MAIN NAVIGATION</div>
          <nav style={styles.navMenu}>
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.disabled) {
                    alert('Pehle Firm Profile setup complete karein!');
                    return;
                  }
                  setActiveTab(item.id);
                  setMobileMenuOpen(false); // Auto close drawer after selection
                }}
                style={{
                  ...styles.navItem,
                  backgroundColor: activeTab === item.id ? '#2563eb' : 'transparent',
                  color: item.disabled ? '#475569' : (activeTab === item.id ? '#ffffff' : '#94a3b8'),
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  fontWeight: activeTab === item.id ? '700' : '500',
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Secure System Action Slot at Bottom */}
          <div style={styles.sidebarFooter}>
            <button 
              onClick={() => {
                setMobileMenuOpen(false);
                setIsResetModalOpen(true);
              }} 
              style={styles.btnSecureReset}
            >
              🔒 Security & Purge Settings
            </button>
          </div>
        </aside>

        {/* 3. Main Active Workspace Container */}
        <main style={styles.workspace}>
          <div style={styles.contentContainer}>
            {!activeFirm && activeTab !== 'firm_setup' && (
              <div style={styles.warningBox}>
                ⚠️ Business Profile Not Set Up. Kripya pehle <strong>Firm Profile Setup</strong> form fill karein.
              </div>
            )}

            {activeTab === 'statement' && <AccountStatementView firm={activeFirm} />}
            {activeTab === 'billing' && <CreateInvoice firm={activeFirm} />}
            {activeTab === 'voucher' && <VoucherEntryForm firm={activeFirm} />}
            {activeTab === 'settlement' && <BillSettlementView firm={activeFirm} />}
            {activeTab === 'reports' && <FinancialReportsView firm={activeFirm} />}
            {activeTab === 'firm_setup' && <CreateFirmForm onFirmCreated={handleFirmCreated} />}
          </div>
        </main>
      </div>

      {/* 4. Multi-Factor Data Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContainer}>
            <h3 style={{ color: '#dc2626', margin: '0 0 10px 0' }}>⚠️ Critical Warning: Database Reset</h3>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
              Aapka saara Financial Data, Firm Profile, Invoices, aur Voucher Entries Permanently delete ho jayengi. Single click se deletion ko block karne ke liye confirm karein.
            </p>
            <div style={{ margin: '16px 0' }}>
              <label style={styles.modalLabel}>Type "<strong>DELETE MY DATA</strong>" to confirm:</label>
              <input 
                type="text" 
                value={confirmInput} 
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="DELETE MY DATA"
                style={styles.modalInput}
              />
            </div>
            <div style={styles.modalActions}>
              <button 
                onClick={() => setIsResetModalOpen(false)} 
                style={styles.btnCancelModal}
              >
                Cancel / Safe Go Back
              </button>
              <button 
                onClick={handlePurgeData}
                disabled={confirmInput.trim() !== 'DELETE MY DATA'}
                style={{
                  ...styles.btnPurgeModal,
                  backgroundColor: confirmInput.trim() === 'DELETE MY DATA' ? '#dc2626' : '#cbd5e1',
                  cursor: confirmInput.trim() === 'DELETE MY DATA' ? 'pointer' : 'not-allowed'
                }}
              >
                Confirm Complete Purge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Styling for Transitions */}
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
            transition: transform 0.3s ease-in-out;
            box-shadow: 4px 0 12px rgba(0,0,0,0.3);
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  appShell: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' },
  topHeader: { backgroundColor: '#0f172a', color: '#f8fafc', height: '60px', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1001, boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
  brandGroup: { display: 'flex', alignItems: 'center', gap: '12px' },
  brandTitle: { fontSize: '16px', fontWeight: '700', color: '#ffffff' },
  mobileHamburger: { background: 'none', border: 'none', color: '#ffffff', fontSize: '24px', cursor: 'pointer', padding: '4px' },
  layoutBody: { display: 'flex', flex: 1, position: 'relative' },
  drawerBackdrop: { position: 'fixed', top: '60px', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 999 },
  sidebar: { width: '250px', backgroundColor: '#0f172a', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '8px', borderRight: '1px solid #1e293b', boxSizing: 'border-box' },
  sidebarHeader: { fontSize: '11px', color: '#64748b', fontWeight: '700', paddingLeft: '8px', marginBottom: '8px', letterSpacing: '0.5px' },
  navMenu: { display: 'flex', flexDirection: 'column', gap: '4px' },
  navItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', border: 'none', fontSize: '14px', width: '100%', textAlign: 'left', transition: 'all 0.15s ease' },
  sidebarFooter: { marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #1e293b' },
  btnSecureReset: { width: '100%', padding: '9px', backgroundColor: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' },
  workspace: { flex: 1, padding: '20px', overflowY: 'auto' },
  contentContainer: { maxWidth: '1000px', margin: '0 auto' },
  warningBox: { backgroundColor: '#fef3c7', color: '#92400e', padding: '14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', border: '1px solid #f59e0b' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  modalContainer: { backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '440px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' },
  modalLabel: { display: 'block', fontSize: '12px', color: '#334155', marginBottom: '6px' },
  modalInput: { width: '100%', padding: '10px', borderRadius: '6px', border: '2px solid #ef4444', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
  modalActions: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' },
  btnCancelModal: { padding: '10px 16px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' },
  btnPurgeModal: { padding: '10px 16px', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', transition: 'all 0.2s' }
};
