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
  // Check if firm is already set up in LocalStorage
  const [activeFirm, setActiveFirm] = useState(() => {
    return JSON.parse(localStorage.getItem('active_firm_profile')) || null;
  });

  // Default view: If no firm exists, force 'firm_setup' screen
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('active_firm_profile') ? 'statement' : 'firm_setup';
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync state if firm profile changes
  const handleFirmCreated = (firmData) => {
    localStorage.setItem('active_firm_profile', JSON.stringify(firmData));
    setActiveFirm(firmData);
    setActiveTab('statement'); // Redirect to main dashboard upon creation
  };

  const handleClearDataAndReset = () => {
    if (window.confirm("Kya aap saara data clear karke nayi Firm Setup karna chahte hain?")) {
      localStorage.clear();
      setActiveFirm(null);
      setActiveTab('firm_setup');
    }
  };

  const menuItems = [
    { id: 'statement', label: 'Account Milan', icon: '📖', disabled: !activeFirm },
    { id: 'billing', label: 'Sales Billing', icon: '🧾', disabled: !activeFirm },
    { id: 'voucher', label: 'Voucher Entry', icon: '📒', disabled: !activeFirm },
    { id: 'settlement', label: 'Bill Settlement', icon: '💳', disabled: !activeFirm },
    { id: 'reports', label: 'Financial Reports', icon: '📊', disabled: !activeFirm },
    { id: 'firm_setup', label: '⚙️ Firm Setup & Accounts', icon: '⚙️', disabled: false },
  ];

  return (
    <div style={styles.appShell}>
      {/* Top Header */}
      <header style={styles.topHeader}>
        <div style={styles.brandGroup}>
          <span style={{ fontSize: '22px' }}>📘</span>
          <div>
            <div style={styles.brandTitle}>
              {activeFirm ? activeFirm.legal_name : 'Account Book Engine'}
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
              {activeFirm ? `GSTIN: ${activeFirm.gstin || 'N/A'}` : 'First Time Setup Required'}
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

      {/* Main Body Layout */}
      <div style={styles.layoutBody}>
        {/* Navigation Menu */}
        <aside style={{
          ...styles.sidebar,
          display: mobileMenuOpen ? 'flex' : undefined,
        }} className={mobileMenuOpen ? 'mobile-drawer-open' : 'desktop-sidebar'}>
          <div style={styles.sidebarHeader}>MAIN MENU</div>
          <nav style={styles.navMenu}>
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.disabled) {
                    alert('Pehle apni Firm create karein!');
                    return;
                  }
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
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

          {/* Reset Application Data Button */}
          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #1e293b' }}>
            <button 
              onClick={handleClearDataAndReset} 
              style={styles.btnClearReset}
            >
              🗑️ Clear Data & Reset Firm
            </button>
          </div>
        </aside>

        {/* Workspace Container */}
        <main style={styles.workspace}>
          <div style={styles.contentContainer}>
            {!activeFirm && activeTab !== 'firm_setup' ? (
              <div style={styles.warningBox}>
                ⚠️ Koi Firm setup nahi mili. Kripya pehle <strong>Firm Setup</strong> option se nayi firm create karein.
              </div>
            ) : null}

            {activeTab === 'statement' && <AccountStatementView firm={activeFirm} />}
            {activeTab === 'billing' && <CreateInvoice firm={activeFirm} />}
            {activeTab === 'voucher' && <VoucherEntryForm firm={activeFirm} />}
            {activeTab === 'settlement' && <BillSettlementView firm={activeFirm} />}
            {activeTab === 'reports' && <FinancialReportsView firm={activeFirm} />}
            {activeTab === 'firm_setup' && <CreateFirmForm onFirmCreated={handleFirmCreated} />}
          </div>
        </main>
      </div>
    </div>
  );
}

const styles = {
  appShell: { fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column' },
  topHeader: { backgroundColor: '#0f172a', color: '#f8fafc', height: '60px', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000 },
  brandGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
  brandTitle: { fontSize: '15px', fontWeight: '700', color: '#ffffff' },
  mobileHamburger: { background: 'none', border: 'none', color: '#ffffff', fontSize: '24px', cursor: 'pointer' },
  layoutBody: { display: 'flex', flex: 1 },
  sidebar: { width: '240px', backgroundColor: '#0f172a', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '8px', borderRight: '1px solid #1e293b' },
  sidebarHeader: { fontSize: '11px', color: '#64748b', fontWeight: '700', paddingLeft: '8px', marginBottom: '8px' },
  navMenu: { display: 'flex', flexDirection: 'column', gap: '4px' },
  navItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', border: 'none', fontSize: '14px', width: '100%', textAlign: 'left' },
  workspace: { flex: 1, padding: '16px', overflowY: 'auto' },
  contentContainer: { maxWidth: '1000px', margin: '0 auto' },
  warningBox: { backgroundColor: '#fef3c7', color: '#92400e', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', border: '1px solid #f59e0b' },
  btnClearReset: { width: '100%', padding: '8px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }
};
