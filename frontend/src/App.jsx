// frontend/src/App.jsx

import React, { useState, useEffect } from 'react';
import { getActiveFirm, getFirmsRegistry, setActiveFirmId } from './utils/multiFirmEngine.js';
import { getDynamicWorkflowMenu } from './utils/navigationRegistry.js';
import { getFirmFinancialYears, createFinancialYear } from './utils/financialYearEngine.js';
import { performFinancialYearRollover } from './utils/autoRolloverEngine.js';

// Application Core Views
import EnterpriseDashboard from './components/EnterpriseDashboard.jsx';
import FirmProfileSettingsView from './components/FirmProfileSettingsView.jsx';
import CreateInvoice from './components/CreateInvoice.jsx';
import PurchaseStockEntryForm from './components/PurchaseStockEntryForm.jsx';
import VoucherEntryForm from './components/VoucherEntryForm.jsx';
import MaterialConsumptionView from './components/MaterialConsumptionView.jsx';
import BhattaProductionMasterView from './components/BhattaProductionMasterView.jsx';
import PayrollManagementView from './components/PayrollManagementView.jsx';
import BillSettlementView from './components/BillSettlementView.jsx';
import CreateAccountHeadModal from './components/CreateAccountHeadModal.jsx';
import InventoryStockView from './components/InventoryStockView.jsx';
import AccountStatementView from './components/AccountStatementView.jsx';
import JournalRegisterView from './components/JournalRegisterView.jsx';
import FinancialReportsView from './components/FinancialReportsView.jsx';
import CashFlowStatementView from './components/CashFlowStatementView.jsx';
import SecurityBackupSettings from './components/SecurityBackupSettings.jsx';
import DataPurgeView from './components/DataPurgeView.jsx';
import CreateFirmForm from './components/CreateFirmForm.jsx';
import AppUpdateBanner from './components/AppUpdateBanner.jsx';

// Sector-Specific Views
import TransportTripView from './components/TransportTripView.jsx';
import TradingInventoryCatalogView from './components/TradingInventoryCatalogView.jsx';

export default function App() {
  const [activeFirm, setActiveFirm] = useState(null);
  const [firmsList, setFirmsList] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard');
  
  // Navigation & Drawer States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreatingFirm, setIsCreatingFirm] = useState(false);

  // Financial Year State
  const [fyList, setFyList] = useState([]);
  const [selectedFY, setSelectedFY] = useState('FY 2026-27');
  const [isAddFYModalOpen, setIsAddFYModalOpen] = useState(false);
  const [newFYStartYear, setNewFYStartYear] = useState('2027');

  const refreshState = () => {
    try {
      const list = getFirmsRegistry() || [];
      const firm = getActiveFirm();
      setFirmsList(list);
      setActiveFirm(firm);

      if (list.length === 0) {
        setIsCreatingFirm(true);
      } else if (firm) {
        const availableYears = getFirmFinancialYears(firm.id) || [];
        setFyList(availableYears);
        
        const savedFY = localStorage.getItem(`app_active_fy_${firm.id}`);
        let activeTargetFY = savedFY && availableYears.some(y => y.label === savedFY) 
          ? savedFY 
          : (availableYears[0]?.label || 'FY 2026-27');
        
        setSelectedFY(activeTargetFY);
        performFinancialYearRollover(firm.id, activeTargetFY);
      }
    } catch (e) {
      console.error("State load error:", e);
      setIsCreatingFirm(true);
    }
  };

  useEffect(() => {
    refreshState();
    window.addEventListener('app_state_updated', refreshState);
    window.addEventListener('fy_state_updated', refreshState);

    const safetyTimer = setTimeout(() => {
      const list = getFirmsRegistry() || [];
      if (list.length === 0) {
        setIsCreatingFirm(true);
      }
    }, 1500);

    return () => {
      window.removeEventListener('app_state_updated', refreshState);
      window.removeEventListener('fy_state_updated', refreshState);
      clearTimeout(safetyTimer);
    };
  }, []);

  const firmCat = String(activeFirm?.category || 'TRADING').toUpperCase();
  const menuItems = getDynamicWorkflowMenu(firmCat);

  const handleMenuClick = (item) => {
    setIsMenuOpen(false);

    if (item.key === 'create_account') {
      setCurrentView('ADD_ACCOUNT');
      return;
    }

    if (item.key === 'firm_settings') {
      setIsCreatingFirm(false);
      setCurrentView('firm_settings');
      return;
    }

    setIsCreatingFirm(false);
    setCurrentView(item.key);
  };

  const handleFYSelectChange = (e) => {
    const val = e.target.value;
    if (val === 'ADD_NEW_FY') {
      setIsAddFYModalOpen(true);
    } else {
      setSelectedFY(val);
      if (activeFirm?.id) {
        localStorage.setItem(`app_active_fy_${activeFirm.id}`, val);
        performFinancialYearRollover(activeFirm.id, val);
      }
      window.dispatchEvent(new Event('app_storage_updated'));
    }
  };

  const handleCreateFYSubmit = (e) => {
    e.preventDefault();
    try {
      const created = createFinancialYear(activeFirm?.id || 'FIRM-001', newFYStartYear);
      setSelectedFY(created.label);
      if (activeFirm?.id) {
        localStorage.setItem(`app_active_fy_${activeFirm.id}`, created.label);
        performFinancialYearRollover(activeFirm.id, created.label);
      }
      setIsAddFYModalOpen(false);
      refreshState();
      alert(`✓ ${created.label} registered & balances rolled over successfully!`);
    } catch (err) {
      alert(err.message);
    }
  };

  const renderProductionOrSectorView = () => {
    if (firmCat.includes('TRANSPORT') || firmCat.includes('LOGISTICS')) {
      return <TransportTripView firm={activeFirm} selectedFY={selectedFY} />;
    }
    if (firmCat.includes('TRADING') || firmCat.includes('RETAIL') || firmCat.includes('WHOLESALE')) {
      return <TradingInventoryCatalogView firm={activeFirm} selectedFY={selectedFY} />;
    }
    return <BhattaProductionMasterView firm={activeFirm} selectedFY={selectedFY} />;
  };

  return (
    <div style={{ minHeight: '100vh', width: '100%', backgroundColor: '#0f172a', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box' }}>
      
      <AppUpdateBanner />

      {/* Single Clean Unified Header (Only when active firm exists) */}
      {!isCreatingFirm && activeFirm && currentView === 'dashboard' && (
        <div style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ backgroundColor: '#0f766e', color: '#fff', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '11px' }}>
              AB
            </div>
          </div>

          <div style={{ flex: 1.2, minWidth: '120px' }}>
            <select
              value={activeFirm?.id || ''}
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
              style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #475569', fontSize: '11px', fontWeight: '700', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
            >
              {firmsList.map(f => (
                <option key={f.id} value={f.id}>🏢 {f.legal_name}</option>
              ))}
              <option value="CREATE_NEW">➕ Create New Firm...</option>
            </select>
          </div>

          <div style={{ flex: 0.9, minWidth: '100px' }}>
            <select
              value={selectedFY}
              onChange={handleFYSelectChange}
              style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #475569', fontSize: '11px', fontWeight: '700', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
            >
              {fyList.map(fy => (
                <option key={fy.id} value={fy.label}>{fy.label}</option>
              ))}
              <option value="ADD_NEW_FY">➕ Add FY...</option>
            </select>
          </div>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{ backgroundColor: isMenuOpen ? '#dc2626' : '#0f766e', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {isMenuOpen ? '✕' : '☰ Menu'}
          </button>
        </div>
      )}

      {/* Workflow Menu Drawer */}
      {isMenuOpen && currentView === 'dashboard' && (
        <div style={{
          backgroundColor: '#0c1322',
          padding: '14px',
          borderBottom: '3px solid #0284c7',
          boxShadow: '0 20px 30px rgba(0,0,0,0.5)',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{ color: '#94a3b8', fontSize: '10px', fontWeight: '800', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '10px' }}>
            ACCOUNTING WORKFLOW MENU ({firmCat})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {menuItems.map(item => (
              <button
                key={item.key}
                onClick={() => handleMenuClick(item)}
                style={{
                  backgroundColor: item.key === 'cash_flow' ? '#0284c7' : '#161f33',
                  color: item.isDanger ? '#f87171' : '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <span>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Screen Routing View */}
      <main style={{ width: '100%', maxWidth: '650px', margin: '0 auto', padding: '16px', boxSizing: 'border-box' }}>
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
            {currentView === 'dashboard' && (
              <EnterpriseDashboard 
                firm={activeFirm} 
                selectedFY={selectedFY}
                onNavigate={(viewKey) => {
                  if (viewKey === 'firm_settings') setCurrentView('firm_settings');
                  else setCurrentView(viewKey);
                }} 
              />
            )}
            {currentView === 'ADD_ACCOUNT' && (
              <div>
                <button 
                  onClick={() => setCurrentView('dashboard')} 
                  style={{ marginBottom: '12px', backgroundColor: '#334155', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}
                >
                  ← Back to Dashboard
                </button>
                <CreateAccountHeadModal 
                  firm={activeFirm} 
                  selectedFY={selectedFY} 
                  isOpen={true}
                  onClose={() => setCurrentView('dashboard')} 
                />
              </div>
            )}
            {currentView === 'firm_settings' && (
              <FirmProfileSettingsView 
                firm={activeFirm} 
                selectedFY={selectedFY}
                onNavigateToCreate={() => setIsCreatingFirm(true)}
                onNavigateDashboard={() => setCurrentView('dashboard')}
              />
            )}
            {currentView === 'sales' && <CreateInvoice firm={activeFirm} selectedFY={selectedFY} />}
            {currentView === 'purchase' && <PurchaseStockEntryForm firm={activeFirm} selectedFY={selectedFY} />}
            {currentView === 'vouchers' && <VoucherEntryForm firm={activeFirm} selectedFY={selectedFY} />}
            {currentView === 'consumption' && <MaterialConsumptionView firm={activeFirm} selectedFY={selectedFY} />}
            {currentView === 'production' && renderProductionOrSectorView()}
            {currentView === 'payroll' && <PayrollManagementView firm={activeFirm} selectedFY={selectedFY} />}
            {currentView === 'settlement' && <BillSettlementView firm={activeFirm} selectedFY={selectedFY} />}
            {currentView === 'inventory' && <InventoryStockView firm={activeFirm} selectedFY={selectedFY} />}
            {currentView === 'milan' && <AccountStatementView firm={activeFirm} selectedFY={selectedFY} />}
            {currentView === 'journal' && <JournalRegisterView firm={activeFirm} selectedFY={selectedFY} />}
            {currentView === 'reports' && <FinancialReportsView firm={activeFirm} selectedFY={selectedFY} />}
            {currentView === 'cash_flow' && <CashFlowStatementView firm={activeFirm} selectedFY={selectedFY} onClose={() => setCurrentView('dashboard')} />} 
            {currentView === 'backup' && <SecurityBackupSettings firm={activeFirm} selectedFY={selectedFY} />}
            {currentView === 'purge' && <DataPurgeView firm={activeFirm} selectedFY={selectedFY} />}
          </>
        )}
      </main>

      {/* Add New FY Modal */}
      {isAddFYModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '15px', fontWeight: 'bold' }}>
                📅 Add New Financial Year
              </h3>
              <button onClick={() => setIsAddFYModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <form onSubmit={handleCreateFYSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '6px' }}>
                  Starting Year (1st April)
                </label>
                <input
                  type="number"
                  min="2020"
                  max="2040"
                  value={newFYStartYear}
                  onChange={(e) => setNewFYStartYear(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #475569', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#0f172a', color: '#fff' }}
                  required
                />
              </div>

              <div style={{ backgroundColor: '#064e3b', border: '1px solid #059669', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '11px', color: '#ecfdf5' }}>
                <strong>Generated Period:</strong><br />
                01-Apr-{newFYStartYear} to 31-Mar-{parseInt(newFYStartYear || 0, 10) + 1} (FY {newFYStartYear}-{((parseInt(newFYStartYear || 0, 10) + 1) % 100).toString().padStart(2, '0')})
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddFYModalOpen(false)}
                  style={{ flex: 1, backgroundColor: '#334155', color: '#cbd5e1', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 1.5, backgroundColor: '#0f766e', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  💾 Create FY
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '16px',
  boxSizing: 'border-box'
};

const modalCardStyle = {
  backgroundColor: '#1e293b',
  borderRadius: '16px',
  padding: '20px',
  width: '100%',
  maxWidth: '400px',
  border: '1px solid #334155',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
  boxSizing: 'border-box'
};
