import React, { useState, useEffect, useRef } from 'react';
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
import MaterialAdjustmentView from './components/MaterialAdjustmentView.jsx';
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

  const isRefreshingRef = useRef(false);

  const refreshState = () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

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
    } finally {
      setTimeout(() => {
        isRefreshingRef.current = false;
      }, 50);
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

  const firmCat = String(activeFirm?.category || 'BRICK_KILN').toUpperCase();
  const menuItems = getDynamicWorkflowMenu(firmCat);

  const handleNavigate = (rawKey) => {
    setIsMenuOpen(false);
    setIsCreatingFirm(false);

    if (!rawKey) return;
    const key = String(rawKey).trim().toLowerCase();

    if (key === 'dashboard') {
      setCurrentView('dashboard');
    } else if (key === 'add_account' || key === 'create_account') {
      setCurrentView('ADD_ACCOUNT');
    } else if (key === 'sales' || key === 'invoice') {
      setCurrentView('sales');
    } else if (key === 'purchase') {
      setCurrentView('purchase');
    } else if (key === 'voucher' || key === 'vouchers') {
      setCurrentView('vouchers');
    } else if (key === 'fuel' || key === 'consumption' || key === 'material_adjustment' || key === 'stock_adjustment' || key === 'diesel_cut') {
      setCurrentView('material_adjustment');
    } else if (key === 'production') {
      setCurrentView('production');
    } else if (key === 'labour' || key === 'payroll') {
      setCurrentView('payroll');
    } else if (key === 'settlement') {
      setCurrentView('settlement');
    } else if (key === 'inventory') {
      setCurrentView('inventory');
    } else if (key === 'ledger' || key === 'milan') {
      setCurrentView('milan');
    } else if (key === 'journal' || key === '
