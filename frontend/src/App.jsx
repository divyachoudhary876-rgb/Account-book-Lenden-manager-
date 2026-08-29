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
  const [activeTab, setActiveTab] = useState('statement');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'statement', label: 'Account Milan', icon: '📖' },
    { id: 'billing', label: 'Sales Billing', icon: '🧾' },
    { id: 'voucher', label: 'Voucher Entry', icon: '📒' },
    { id: 'settlement', label: 'Bill Settlement', icon: '💳' },
    { id: 'reports', label: 'Financial Reports', icon: '📊' },
    { id: 'firm_setup', label: 'Firm Setup', icon: '⚙️' },
  ];

  const handleTabChange = (id) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <div style={styles.appShell}>
      {/* 1. Header Bar for Mobile & Tablet */}
      <header style={styles.topHeader}>
        <div style={styles.brandGroup}>
          <span style={{ fontSize: '22px' }}>📘</span>
          <span style={styles.brandTitle}>Account Book Engine</span>
        </div>
        
        {/* Mobile Hamburger Toggle Button */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          style={styles.mobileHamburger}
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* 2. Main Layout Shell */}
      <div style={styles.layoutBody}>
        {/* Desktop Sidebar & Mobile Drawer Navigation */}
        <aside style={{
          ...styles.sidebar,
          display: mobileMenuOpen ? 'flex' : undefined,
          '@media (max-width: 768px)': {
            display: mobileMenuOpen ? 'flex' : 'none'
          }
        }} className={mobileMenuOpen ? 'mobile-drawer-open' : 'desktop-sidebar'}>
          <div style={styles.sidebarHeader}>Navigation Menu</div>
          <nav style={styles.navMenu}>
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                style={{
                  ...styles.navItem,
                  backgroundColor: activeTab === item.id ? '#2563eb' : 'transparent',
                  color: activeTab === item.id ? '#ffffff' : '#94a3b8',
                  fontWeight: activeTab === item.id ? '700' : '500',
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* 3. Main Workspace Area */}
        <main style={styles.workspace}>
          <div style={styles.contentContainer}>
            {activeTab === 'statement' && <AccountStatementView organizationId="ORG-101" />}
            {activeTab === 'billing' && <CreateInvoice organizationId="ORG-101" />}
            {activeTab === 'voucher' && <VoucherEntryForm organizationId="ORG-101" />}
            {activeTab === 'settlement' && <BillSettlementView organizationId="ORG-101" />}
            {activeTab === 'reports' && <FinancialReportsView organizationId="ORG-101" />}
            {activeTab === 'firm_setup' && <CreateFirmForm />}
          </div>
        </main>
      </div>

      {/* 4. CSS Media Queries Injected */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar {
            display: ${mobileMenuOpen ? 'flex !important' : 'none !important'};
            position: fixed;
            top: 56px;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 999;
            width: 100% !important;
            background-color: #0f172a !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-hamburger {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  appShell: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    flexDirection: 'column',
  },
  topHeader: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    height: '56px',
    padding: '0 16px',
    display: 'flex',
    justify: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #1e293b',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  brandGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  brandTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: '0.3px',
  },
  mobileHamburger: {
    background: 'none',
    border: 'none',
    color: '#ffffff',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  layoutBody: {
    display: 'flex',
    flex: 1,
  },
  sidebar: {
    width: '240px',
    backgroundColor: '#0f172a',
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    borderRight: '1px solid #1e293b',
    boxSizing: 'border-box',
  },
  sidebarHeader: {
    fontSize: '11px',
    textTransform: 'uppercase',
    color: '#64748b',
    fontWeight: '700',
    paddingLeft: '12px',
    marginBottom: '8px',
    letterSpacing: '0.8px',
  },
  navMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    textAlign: 'left',
    transition: 'all 0.15s ease-in-out',
    width: '100%',
  },
  workspace: {
    flex: 1,
    padding: '16px',
    boxSizing: 'border-box',
    overflowY: 'auto',
  },
  contentContainer: {
    maxWidth: '1000px',
    margin: '0 auto',
  },
};
