// frontend/src/App.jsx

import React, { useState, useEffect, Component } from 'react';
import { getActiveFirm, getFirmsRegistry, setActiveFirmId, DEFAULT_FIRM } from './utils/multiFirmEngine.js';
import { filterMenuByIndustry } from './utils/industryEngine.js';

// Components
import EnterpriseDashboard from './components/EnterpriseDashboard.jsx';
import AccountingDashboard from './components/AccountingDashboard.jsx';
import CreateInvoice from './components/CreateInvoice.jsx';
import PurchaseStockEntryForm from './components/PurchaseStockEntryForm.jsx';
import InventoryStockView from './components/InventoryStockView.jsx';
import AccountStatementView from './components/AccountStatementView.jsx';
import CreateFirmForm from './components/CreateFirmForm.jsx';
import SecurityBackupSettings from './components/SecurityBackupSettings.jsx';
import AppUpdateBanner from './components/AppUpdateBanner.jsx';

// Error Boundary to prevent any dark/blank crash screen
class SafeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("App Crash Caught:", error, errorInfo);
  }
  handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#0f172a', color: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h2 style={{ color: '#ef4444' }}>⚠️ System Recovery Mode</h2>
          <p style={{ color: '#94a3b8', maxWidth: '400px', fontSize: '13px' }}>
            The application encountered a runtime initialization error. Click below to restore default configuration safely.
          </p>
          <button 
            onClick={this.handleReset}
            style={{ backgroundColor: '#10b981', color: '#ffffff', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '12px' }}
          >
            🔄 Safe Reset & Launch
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeFirm, setActiveFirm] = useState(DEFAULT_FIRM);
  const [firmsList, setFirmsList] = useState([DEFAULT_FIRM]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreatingFirm, setIsCreatingFirm] = useState(false);

  const refreshFirmContext = () => {
    try {
      const firm = getActiveFirm() || DEFAULT_FIRM;
      const list = getFirmsRegistry() || [DEFAULT_FIRM];
      setActiveFirm(firm);
      setFirmsList(list);
    } catch {
      setActiveFirm(DEFAULT_FIRM);
      setFirmsList([DEFAULT_FIRM]);
    }
  };

  useEffect(() => {
    refreshFirmContext();
    window.addEventListener('app_state_updated', refreshFirmContext);
    return () => window.removeEventListener('app_state_updated', refreshFirmContext);
  }, []);

  const rawNavigation = [
    { key: 'dashboard', label: '📊 Dashboard', category: 'ALL' },
    { key: 'sales', label: '🧾 Sales Invoicing', category: 'ALL' },
    { key: 'purchase', label: '🛍️ Purchase Inward', category: 'ALL' },
    { key: 'inventory', label: '📦 Live Stock & UOM', category: 'ALL' },
    { key: 'milan', label: '📑 Account Milan / Statement', category: 'ALL' },
    { key: 'backup', label: '🛡️ Backup & Restore', category: 'ALL' }
  ];

  const allowedNav = filterMenuByIndustry(rawNavigation, activeFirm?.category || 'TRADING');

  return (
    <SafeErrorBoundary>
      <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', color: '#0f172a', display: 'flex', flexDirection: 'column' }}>
        
        {/* App Update Notification */}
        <AppUpdateBanner />

        {/* Global Navbar */}
        <header style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>📒</span>
            <div>
              <div style={{ fontWeight: '800', fontSize: '15px' }}>Account Book</div>
              <div style={{ fontSize: '10px', color: '#38bdf8' }}>ENTERPRISE ERP</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Firm Selector */}
            <select
              value={activeFirm?.id || DEFAULT_FIRM.id}
              onChange={(e) => {
                if (e.target.value === 'NEW_FIRM') {
                  setIsCreatingFirm(true);
                } else {
                  setActiveFirmId(e.target.value);
                  refreshFirmContext();
                }
              }}
              style={{ backgroundColor: '#1e293b', color: '#ffffff', border: '1px solid #334155', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}
            >
              {firmsList.map(f => (
                <option key={f.id} value={f.id}>{f.legal_name || f.trade_name} ({f.category || 'TRADING'})</option>
              ))}
              <option value="NEW_FIRM">➕ Add New Firm...</option>
            </select>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ☰ Menu
            </button>
          </div>
        </header>

        {/* Slide-out Menu Drawer */}
        {isMenuOpen && (
          <div style={{ backgroundColor: '#1e293b', borderBottom: '2px solid #334155', padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
            {allowedNav.map(item => (
              <button
                key={item.key}
                onClick={() => {
                  setCurrentView(item.key);
                  setIsCreatingFirm(false);
                  setIsMenuOpen(false);
                }}
                style={{
                  backgroundColor: currentView === item.key ? '#0284c7' : '#0f172a',
                  color: '#ffffff',
                  border: '1px solid #334155',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: '14px', maxWidth: '1000px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          {isCreatingFirm ? (
            <CreateFirmForm 
              onFirmCreated={() => {
                setIsCreatingFirm(false);
                refreshFirmContext();
                setCurrentView('dashboard');
              }}
              onCancel={() => setIsCreatingFirm(false)}
            />
          ) : (
            <>
              {currentView === 'dashboard' && <EnterpriseDashboard firm={activeFirm} onNavigate={(view) => setCurrentView(view)} />}
              {currentView === 'sales' && <CreateInvoice firm={activeFirm} />}
              {currentView === 'purchase' && <PurchaseStockEntryForm firm={activeFirm} />}
              {currentView === 'inventory' && <InventoryStockView firm={activeFirm} />}
              {currentView === 'milan' && <AccountStatementView firm={activeFirm} />}
              {currentView === 'backup' && <SecurityBackupSettings firm={activeFirm} />}
            </>
          )}
        </main>

      </div>
    </SafeErrorBoundary>
  );
}
