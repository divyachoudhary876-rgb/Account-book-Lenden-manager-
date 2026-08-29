import React, { useState } from 'react';

// Import All Application Components
import AccountStatementView from './components/AccountStatementView';
import CreateInvoice from './components/CreateInvoice';
import VoucherEntryForm from './components/VoucherEntryForm';
import CreateFirmForm from './components/CreateFirmForm';
import BillSettlementView from './components/BillSettlementView';
import FinancialReportsView from './components/FinancialReportsView';

export default function App() {
  // Navigation State Control
  const [activeTab, setActiveTab] = useState('statement'); // Default active view

  return (
    <div style={styles.appContainer}>
      {/* 1. Global Navigation Header */}
      <header style={styles.topHeader}>
        <div style={styles.brandContainer}>
          <span style={{ fontSize: '18px' }}>📖</span>
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
    padding: '10px 20px',
    display: 'flex',
    justify: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 1000
  },
  brandContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  brandTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#f8fafc'
  },
  navMenu: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
  },
  navTab: {
    color: '#fff',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'all 0.2s ease'
  },
  mainWorkspace: {
    flex: 1,
    padding: '16px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box'
  }
};
