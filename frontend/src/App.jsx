// frontend/src/App.jsx

import React, { useState } from 'react';

// Import All Application Components
import AccountStatementView from './components/AccountStatementView';
import CreateInvoice from './components/CreateInvoice';
import VoucherEntryForm from './components/VoucherEntryForm';
import CreateFirmForm from './components/CreateFirmForm';
import BillSettlementView from './components/BillSettlementView';
import FinancialReportsView from './components/FinancialReportsView';

export default function App() {
  // Active Tab State Control
  const [activeTab, setActiveTab] = useState('statement'); // Default view: Account Milan

  return (
    <div style={styles.appContainer}>
      {/* 1. Global Navigation Header */}
      <header style={styles.topHeader}>
        <div style={styles.brandContainer}>
          <span style={{ fontSize: '20px' }}>📘</span>
          <span style={styles.brandTitle}>Account Book Engine</span>
        </div>

        {/* Navigation Bar Menu */}
        <nav style={styles.navMenu}>
          <button 
            onClick={() => setActiveTab('statement')} 
            style={{ ...styles.navTab, backgroundColor: activeTab === 'statement' ? '#2563eb' : 'transparent' }}
          >
            📖 Account Milan
          </button>
          
          <button 
            onClick={() => setActiveTab('billing')} 
            style={{ ...styles.navTab, backgroundColor: activeTab === 'billing' ? '#2563eb' : 'transparent' }}
          >
            🧾 Sales Billing
          </button>

          <button 
            onClick={() => setActiveTab('voucher')} 
            style={{ ...styles.navTab, backgroundColor: activeTab === 'voucher' ? '#2563eb' : 'transparent' }}
          >
            📒 Voucher Entry
          </button>

          <button 
            onClick={() => setActiveTab('settlement')} 
            style={{ ...styles.navTab, backgroundColor: activeTab === 'settlement' ? '#2563eb' : 'transparent' }}
          >
            💳 Bill Settlement
          </button>

          <button 
            onClick={() => setActiveTab('reports')} 
            style={{ ...styles.navTab, backgroundColor: activeTab === 'reports' ? '#2563eb' : 'transparent' }}
          >
            📊 Financial Reports
          </button>

          <button 
            onClick={() => setActiveTab('firm_setup')} 
            style={{ ...styles.navTab, backgroundColor: activeTab === 'firm_setup' ? '#2563eb' : 'transparent' }}
          >
            ⚙️ Firm Setup
          </button>
        </nav>
      </header>

      {/* 2. Main Active Workspace Container */}
      <main style={styles.mainWorkspace}>
        {activeTab === 'statement' && <AccountStatementView organizationId="ORG-101" />}
        {activeTab === 'billing' && <CreateInvoice organizationId="ORG-101" />}
        {activeTab === 'voucher' && <VoucherEntryForm organizationId="ORG-101" />}
        {activeTab === 'settlement' && <BillSettlementView organizationId="ORG-101" />}
        {activeTab === 'reports' && <FinancialReportsView organizationId="ORG-101" />}
        {activeTab === 'firm_setup' && <CreateFirmForm />}
      </main>
    </div>
  );
}

const styles = {
  appContainer: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column'
  },
  topHeader: {
    backgroundColor: '#0f172a',
    color: '#fff',
    padding: '12px 24px',
    display: 'flex',
    justify: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    position: 'sticky',
    top: 0,
    zIndex: 1000
  },
  brandContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  brandTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#f8fafc',
    letterSpacing: '0.5px'
  },
  navMenu: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  navTab: {
    color: '#fff',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    transition: 'background-color 0.2s ease, transform 0.1s ease'
  },
  mainWorkspace: {
    flex: 1,
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box'
  }
};
