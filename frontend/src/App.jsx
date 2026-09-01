// frontend/src/App.jsx

import React, { useState, useEffect } from 'react';
import { getActiveFirm, getFirmsRegistry, setActiveFirmId } from './utils/multiFirmEngine.js';
import { getDynamicWorkflowMenu } from './utils/navigationRegistry.js';

// Application Core Views
import EnterpriseDashboard from './components/EnterpriseDashboard.jsx';
import CreateInvoice from './components/CreateInvoice.jsx';
import PurchaseStockEntryForm from './components/PurchaseStockEntryForm.jsx';
import VoucherEntryForm from './components/VoucherEntryForm.jsx';
import BillSettlementView from './components/BillSettlementView.jsx';
import CreateAccountHeadModal from './components/CreateAccountHeadModal.jsx';
import InventoryStockView from './components/InventoryStockView.jsx';
import BhattaProductionMasterView from './components/BhattaProductionMasterView.jsx';
import AccountStatementView from './components/AccountStatementView.jsx';
import JournalRegisterView from './components/JournalRegisterView.jsx';
import FinancialReportsView from './components/FinancialReportsView.jsx';
import SecurityBackupSettings from './components/SecurityBackupSettings.jsx';
import DataPurgeView from './components/DataPurgeView.jsx';
import CreateFirmForm from './components/CreateFirmForm.jsx';
import AppUpdateBanner from './components/AppUpdateBanner.jsx';

export default function App() {
  const [activeFirm, setActiveFirm] = useState(null);
  const [firmsList, setFirmsList] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard');
  
  // Drawer menu starts closed
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreatingFirm, setIsCreatingFirm] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [selectedFY, setSelectedFY] = useState('FY 2026-27');

  const refreshState = () => {
    const list = getFirmsRegistry();
    const firm = getActiveFirm();
    setFirmsList(list);
    setActiveFirm(firm);

    if (list.length === 0) {
      setIsCreatingFirm(true);
    }
  };

  useEffect(() => {
    refreshState();
    window.addEventListener('app_state_updated', refreshState);
    return () => window.removeEventListener('app_state_updated', refreshState);
  }, []);

  const menuItems = getDynamicWorkflowMenu(activeFirm?.category || 'TRADING');

  const handleMenuClick = (item) => {
    setIsMenuOpen(false); // Close drawer upon selection

    if (item.key === 'create_account') {
      setIsAccountModalOpen(true);
      return;
    }

    if (item.key === 'firm_settings') {
      setIsCreatingFirm(true);
      return;
    }

    setIsCreatingFirm(false);
    setCurrentView(item.key);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* 1. App Update Banner */}
      <AppUpdateBanner />

      {/* 2. Classic Header Top Bar */}
      <div style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentView !== 'dashboard' && !isCreatingFirm ? (
            <button
              onClick={() => setCurrentView('dashboard')}
              style={{ backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              ← Dashboard
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ backgroundColor: '#0f172a', color: '#ffffff', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' }}>
                AB
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a', lineHeight: '1.1' }}>Account Book</div>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#0284c7', letterSpacing: '0.4px' }}>SMART MANAGER</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>
          {activeFirm ? (activeFirm.trade_name || activeFirm.legal_name) : 'No Firm'}
        </div>
      </div>

      {/* 3. Sub-Header: Firm Selector + FY Picker + Menu Button */}
      <div style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ flex: 1.3, minWidth: '130px' }}>
          <select
            value={isCreatingFirm ? 'CREATE_NEW' : (activeFirm?.id || '')}
            onChange={(e) => {
              if (e.target.value === 'CREATE_NEW') {
                setIsCreatingFirm(true);
                setIsMenuOpen(false);
              } else {
                setActiveFirmId(e.target.value);
                setIsCreatingFirm(false);
                setIsMenuOpen(false);
                refreshState();
              }
            }}
            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: '700', backgroundColor: '#f8fafc', color: '#0f172a' }}
          >
            {firmsList.map(f => (
              <option key={f.id} value={f.id}>
                🏢 {f.legal_name} ({f.category || 'TRADING'})
              </option>
            ))}
            <option value="CREATE_NEW">➕ Create New Firm...</option>
          </select>
        </div>

        <div style={{ flex: 0.8, minWidth: '100px' }}>
          <select
            value={selectedFY}
            onChange={(e) => setSelectedFY(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: '700', backgroundColor: '#f8fafc', color: '#334155' }}
          >
            <option value="FY 2026-27">FY 2026-27</option>
            <option value="FY 2025-26">FY 2025-26</option>
          </select>
        </div>

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{ backgroundColor: isMenuOpen ? '#dc2626' : '#0f172a', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {isMenuOpen ? '✕ Close' : '☰ Menu'}
        </button>
      </div>

      {/* 4. EXACT ORIGINAL WORKFLOW MENU DRAWER */}
      {isMenuOpen && (
        <div style={{
          backgroundColor: '#0c1322',
          padding: '16px 14px 24px 14px',
          borderBottom: '3px solid #0284c7',
          boxShadow: '0 20px 30px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.15s ease-out'
        }}>
          <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '800', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '12px', paddingLeft: '4px' }}>
            ACCOUNTING WORKFLOW MENU
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {menuItems.map(item => (
              <button
                key={item.key}
                onClick={() => handleMenuClick(item)}
                style={{
                  backgroundColor: '#161f33',
                  color: item.isDanger ? '#f87171' : '#ffffff',
                  border: item.isDanger ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. Main Active Screen */}
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '14px', boxSizing: 'border-box' }}>
        {isCreatingFirm || !activeFirm ? (
          <CreateFirmForm 
            onFirmCreated={(newFirm) => {
              setIsCreatingFirm(false);
              setIsMenuOpen(false);
              setActiveFirmId(newFirm.id);
              refreshState();
              setCurrentView('dashboard');
            }} 
            onCancel={firmsList.length > 0 ? () => setIsCreatingFirm(false) : null} 
          />
        ) : (
          <>
            {currentView === 'dashboard' && <EnterpriseDashboard firm={activeFirm} onNavigate={(view) => setCurrentView(view)} />}
            {currentView === 'sales' && <CreateInvoice firm={activeFirm} />}
            {currentView === 'purchase' && <PurchaseStockEntryForm firm={activeFirm} />}
            {currentView === 'vouchers' && <VoucherEntryForm firm={activeFirm} />}
            {currentView === 'settlement' && <BillSettlementView firm={activeFirm} />}
            {currentView === 'inventory' && <InventoryStockView firm={activeFirm} />}
            {currentView === 'production' && <BhattaProductionMasterView firm={activeFirm} />}
            {currentView === 'milan' && <AccountStatementView firm={activeFirm} />}
            {currentView === 'journal' && <JournalRegisterView firm={activeFirm} />}
            {currentView === 'reports' && <FinancialReportsView firm={activeFirm} />}
            {currentView === 'backup' && <SecurityBackupSettings firm={activeFirm} />}
            {currentView === 'purge' && <DataPurgeView firm={activeFirm} />}
          </>
        )}
      </main>

      {/* 6. Directory Head Modal (Triggered directly from Menu Item #3) */}
      <CreateAccountHeadModal 
        firm={activeFirm} 
        isOpen={isAccountModalOpen} 
        onClose={() => setIsAccountModalOpen(false)} 
      />

    </div>
  );
}
