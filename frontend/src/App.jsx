// frontend/src/App.jsx

import React, { useState } from 'react';

// Explicitly define component imports with file extensions to prevent bundler resolution failures
import AccountStatementView from './components/AccountStatementView.jsx';
import CreateInvoice from './components/CreateInvoice.jsx';
import VoucherEntryForm from './components/VoucherEntryForm.jsx';
import CreateFirmForm from './components/CreateFirmForm.jsx';
import BillSettlementView from './components/BillSettlementView.jsx';
import FinancialReportsView from './components/FinancialReportsView.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('statement');

  return (
    <div style={styles.appContainer}>
      <header style={styles.topHeader}>
        <div style={styles.brandContainer}>
          <span style={{ fontSize: '20px' }}>📘</span>
          <span style={styles.brandTitle}>Account Book Engine</span>
        </div>

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
    color: '#f8fafc'
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
    transition: 'background-color 0.2s ease'
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
