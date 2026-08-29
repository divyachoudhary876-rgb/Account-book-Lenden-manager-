// frontend/src/App.jsx

import React, { useState } from 'react';

// Core Application Module Imports
import EnterpriseDashboard from './components/EnterpriseDashboard.jsx';
import AccountStatementView from './components/AccountStatementView.jsx';
import CreateAccountHeadModal from './components/CreateAccountHeadModal.jsx';
import CreateInvoice from './components/CreateInvoice.jsx';
import VoucherEntryForm from './components/VoucherEntryForm.jsx';
import CreateFirmForm from './components/CreateFirmForm.jsx';
import BillSettlementView from './components/BillSettlementView.jsx';
import FinancialReportsView from './components/FinancialReportsView.jsx';

export default function App() {
  const [activeFirm, setActiveFirm] = useState(() => {
    try {
      const saved = localStorage.getItem('active_firm_profile');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Default Active Tab set to 'dashboard'
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('active_firm_profile') ? 'dashboard' : 'firm_setup';
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  const handleTabClick = (tabId) => {
    if (!activeFirm && tabId !== 'firm_setup') {
      alert('Pehle apni Firm details submit karke Firm create karein!');
      return;
    }
    setActiveTab(tabId);
    setIsMenuOpen(false);
  };

  const handleFirmCreated = (firmData) => {
    localStorage.setItem('active_firm_profile', JSON.stringify(firmData));
    setActiveFirm(firmData);
    setActiveTab('dashboard');
    setIsMenuOpen(false);
  };

  const handlePurgeData = () => {
    if (confirmInput.trim() !== 'DELETE MY DATA') {
      return alert('Incorrect confirmation string! Type "DELETE MY DATA".');
    }
    localStorage.clear();
    setActiveFirm(null);
    setActiveTab('firm_setup');
    setIsResetModalOpen(false);
    setConfirmInput('');
    alert('System Reset Completed.');
  };

  // Enterprise Menu Items Structure
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard & Overview', icon: '📊' },
    { id: 'statement', label: 'Account Milan & Ledger', icon: '📖' },
    { id: 'create_account', label: 'Create Account Head', icon: '➕' },
    { id: 'billing', label: 'Sales Billing & Invoicing', icon: '🧾' },
    { id: 'voucher', label: 'Voucher Entry (JV/PV/RV)', icon: '📒' },
    { id: 'settlement', label: 'Bill Settlement (FIFO)', icon: '💳' },
    { id: 'reports', label: 'Financial Reports (P&L / BS)', icon: '📈' },
    { id: 'firm_setup', label: 'Firm Profile Settings', icon: '⚙️' }
  ];

  return (
    <div style={styles.appShell}>
      
      {/* Top Main Navigation Bar */}
      <header style={styles.topHeader}>
        <div style={styles.brandGroup}>
          <span style={{ fontSize: '24px' }}>🏢</span>
          <div>
            <div style={styles.brandTitle}>
              {activeFirm ? activeFirm.legal_name : 'Account Book Engine'}
            </div>
            <div style={styles.brandSub}>
              {activeFirm ? `GSTIN: ${activeFirm.gstin || 'Unregistered'}` : 'Mandatory Setup Required'}
            </div>
          </div>
        </div>

        {activeFirm && (
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={styles.btnMenuToggle}>
            {isMenuOpen ? '✕ Close' : '☰ Accounting Suite'}
          </button>
        )}
      </header>

      {/* Mobile Drawer Overlay Backdrop */}
      {isMenuOpen && (
        <div style={styles.drawerBackdrop} onClick={() => setIsMenuOpen(false)} />
      )}

      {/* Main Sidebar Navigation */}
      {activeFirm && (
        <aside style={{
          ...styles.sidebar,
          left: isMenuOpen ? '0px' : '-300px'
        }}>
          <div style={styles.menuHeader}>MAIN ACCOUNTING MODULES</div>

          <div style={styles.menuList}>
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                style={{
                  ...styles.menuItem,
                  backgroundColor: activeTab === item.id ? '#2563eb' : '#1e293b',
                  fontWeight: activeTab === item.id ? 'bold' : 'normal'
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div style={styles.sidebarFooter}>
            <button 
              onClick={() => { setIsMenuOpen(false); setIsResetModalOpen(true); }}
              style={styles.btnSecurityReset}
            >
              🔒 Security & System Purge
            </button>
          </div>
        </aside>
      )}

      {/* Central View Router Workspace */}
      <main style={styles.mainWorkspace}>
        {!activeFirm && (
          <div style={styles.onboardingBanner}>
            <h2>Welcome to Enterprise Account Engine 🚀</h2>
            <p>Accounting workspace initialize karne ke liye pehle apni Firm details create karein.</p>
          </div>
        )}

        {!activeFirm || activeTab === 'firm_setup' ? (
          <CreateFirmForm onFirmCreated={handleFirmCreated} />
        ) : (
          <>
            {activeTab === 'dashboard' && <EnterpriseDashboard firm={activeFirm} />}
            {activeTab === 'statement' && <AccountStatementView firm={activeFirm} />}
            {activeTab === 'create_account' && <CreateAccountHeadModal firmId={activeFirm?.id || 'FIRM-101'} />}
            {activeTab === 'billing' && <CreateInvoice firm={activeFirm} />}
            {activeTab === 'voucher' && <VoucherEntryForm firm={activeFirm} />}
            {activeTab === 'settlement' && <BillSettlementView firm={activeFirm} />}
            {activeTab === 'reports' && <FinancialReportsView firm={activeFirm} />}
          </>
        )}
      </main>

      {/* System Security Purge Modal */}
      {isResetModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ color: '#dc2626', margin: '0 0 10px 0' }}>⚠️ Critical Warning: Reset System</h3>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>
              Action authorize karne ke liye exact "<strong>DELETE MY DATA</strong>" type karein:
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
                  backgroundColor: confirmInput.trim() === 'DELETE MY DATA' ? '#dc2626' : '#cbd5e1',
                  cursor: confirmInput.trim() === 'DELETE MY DATA' ? 'pointer' : 'not-allowed'
                }}
              >
                Confirm System Purge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  appShell: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', minHeight: '100vh', backgroundColor: '#f1f5f9' },
  topHeader: { backgroundColor: '#0f172a', color: '#ffffff', height: '64px', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
  brandGroup: { display: 'flex', alignItems: 'center', gap: '12px' },
  brandTitle: { fontSize: '16px', fontWeight: 'bold', color: '#f8fafc' },
  brandSub: { fontSize: '11px', color: '#94a3b8' },
  btnMenuToggle: { backgroundColor: '#1e293b', color: '#ffffff', border: '1px solid #334155', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' },
  drawerBackdrop: { position: 'fixed', top: '64px', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1100 },
  sidebar: { position: 'fixed', top: '64px', bottom: 0, width: '280px', backgroundColor: '#0f172a', zIndex: 1200, transition: 'left 0.25s ease-in-out', padding: '16px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 16px rgba(0,0,0,0.25)' },
  menuHeader: { fontSize: '11px', color: '#64748b', fontWeight: 'bold', letterSpacing: '0.6px', marginBottom: '12px' },
  menuList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  menuItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '8px', border: 'none', color: '#ffffff', fontSize: '13px', width: '100%', textAlign: 'left', cursor: 'pointer' },
  sidebarFooter: { marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #1e293b' },
  btnSecurityReset: { width: '100%', padding: '10px', backgroundColor: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  mainWorkspace: { padding: '20px', maxWidth: '1150px', margin: '0 auto' },
  onboardingBanner: { backgroundColor: '#1e293b', color: '#ffffff', padding: '20px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  modalContent: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '420px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' },
  modalInput: { width: '100%', padding: '10px', border: '2px solid #ef4444', borderRadius: '6px', boxSizing: 'border-box', marginTop: '12px', outline: 'none' },
  modalActions: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' },
  btnCancel: { padding: '9px 16px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  btnPurge: { padding: '9px 16px', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }
};
