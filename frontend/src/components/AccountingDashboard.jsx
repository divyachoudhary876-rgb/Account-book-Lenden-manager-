// frontend/src/components/EnterpriseDashboard.jsx

import React, { useState, useEffect } from 'react';
import CashFlowStatementView from './CashFlowStatementView';
import FinancialReportsView from './FinancialReportsView';
import JournalRegisterView from './JournalRegisterView';
import SecurityBackupSettings from './SecurityBackupSettings';
import { StorageService } from '../utils/storageSync';
import { getDynamicDashboardMetrics } from '../utils/dashboardDataEngine';

export default function EnterpriseDashboard({ firm, selectedFY, onNavigate, onClose }) {
  const [activeView, setActiveView] = useState('DASHBOARD');
  const [metrics, setMetrics] = useState({
    receivables: 0,
    payables: 0,
    cashAndBank: 0,
    totalSales: 0,
    totalPurchases: 0,
    totalStockValuation: 0,
    categorySpecifics: { category: '', cards: [], actions: [] }
  });
  const [summaryStats, setSummaryStats] = useState({ totalProduction: 0, totalConsumption: 0 });

  const firmId = firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  const effectiveFY = selectedFY || '2026-27';
  const prodStorageKey = `bhatta_production_${firmId}_${effectiveFY}`;
  const consStorageKey = `fuel_consumption_${firmId}_${effectiveFY}`;

  const loadDashboardData = () => {
    try {
      // Pass both firm and selectedFY to ensure strict FY synchronization
      const dynamicData = getDynamicDashboardMetrics(firm, effectiveFY);
      if (dynamicData) setMetrics(dynamicData);

      const prodData = StorageService.getItem 
        ? StorageService.getItem(prodStorageKey) 
        : JSON.parse(localStorage.getItem(prodStorageKey) || '[]');
      const consData = StorageService.getItem 
        ? StorageService.getItem(consStorageKey) 
        : JSON.parse(localStorage.getItem(consStorageKey) || '[]');
      
      const totalProd = Array.isArray(prodData) 
        ? prodData.reduce((sum, item) => sum + (Number(item.producedQty || item.produced_qty || item.quantity || item.qty) || 0), 0) 
        : 0;
      const totalCons = Array.isArray(consData) ? consData.length : 0;

      setSummaryStats({ totalProduction: totalProd, totalConsumption: totalCons });
    } catch (e) {
      console.error("Error loading dashboard metrics:", e);
    }
  };

  useEffect(() => {
    loadDashboardData();
    window.addEventListener('app_state_updated', loadDashboardData);
    window.addEventListener('app_storage_updated', loadDashboardData);
    window.addEventListener('storage', loadDashboardData);
    return () => {
      window.removeEventListener('app_state_updated', loadDashboardData);
      window.removeEventListener('app_storage_updated', loadDashboardData);
      window.removeEventListener('storage', loadDashboardData);
    };
  }, [firmId, effectiveFY, firm]);

  if (activeView === 'CASH_FLOW') {
    return <CashFlowStatementView firm={firm} selectedFY={effectiveFY} onClose={() => setActiveView('DASHBOARD')} />;
  }
  if (activeView === 'FINANCIAL_REPORTS') {
    return <FinancialReportsView firm={firm} selectedFY={effectiveFY} onClose={() => setActiveView('DASHBOARD')} />;
  }
  if (activeView === 'JOURNAL_REGISTER') {
    return <JournalRegisterView firm={firm} selectedFY={effectiveFY} onClose={() => setActiveView('DASHBOARD')} />;
  }
  if (activeView === 'BACKUP_CENTER') {
    return <SecurityBackupSettings firm={firm} selectedFY={effectiveFY} onClose={() => setActiveView('DASHBOARD')} />;
  }

  const specCards = metrics.categorySpecifics?.cards || [];
  const specActions = metrics.categorySpecifics?.actions || [];

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: '850px', margin: '0 auto', boxSizing: 'border-box', color: '#0f172a' }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: '800', textTransform: 'uppercase' }}>Enterprise Smart Manager • {effectiveFY}</div>
          <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>{firm?.legal_name || firm?.trade_name || firm?.name || 'Neelkanth Groups'}</h2>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
            ✕ Close
          </button>
        )}
      </div>

      {/* SECTION 1: FINANCIAL HEALTH & KPI CARDS */}
      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>📈</span> Financial Position (वित्तीय स्थिति)
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '18px' }}>
        
        {/* Cash & Bank */}
        <div style={kpiCardStyle}>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>💵 Cash & Bank (रोकड़/बैंक)</div>
          <div style={{ fontSize: '17px', fontWeight: '900', color: '#059669', marginTop: '4px' }}>
            ₹{metrics.cashAndBank.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Stock Valuation */}
        <div style={kpiCardStyle}>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>📦 Stock Valuation (स्टॉक)</div>
          <div style={{ fontSize: '17px', fontWeight: '900', color: '#0284c7', marginTop: '4px' }}>
            ₹{metrics.totalStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Receivables */}
        <div style={kpiCardStyle}>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>📥 Receivables (लेना बाकी)</div>
          <div style={{ fontSize: '17px', fontWeight: '900', color: '#2563eb', marginTop: '4px' }}>
            ₹{metrics.receivables.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Payables */}
        <div style={kpiCardStyle}>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>📤 Payables (देना बाकी)</div>
          <div style={{ fontSize: '17px', fontWeight: '900', color: '#dc2626', marginTop: '4px' }}>
            ₹{metrics.payables.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

      </div>

      {/* SECTION 2: INDUSTRY & PRODUCTION SPECIFIC CARDS */}
      {specCards.length > 0 && (
        <>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🏭</span> Industry Metrics ({metrics.categorySpecifics.category})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '18px' }}>
            {specCards.map((card, idx) => (
              <div key={idx} style={kpiCardStyle}>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{card.icon}</span> {card.label}
                </div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: card.color || '#0f172a', marginTop: '4px' }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* SECTION 3: QUICK OPERATIONS */}
      {specActions.length > 0 && (
        <>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚡</span> Quick Operations
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            {specActions.map((act) => (
              <button 
                key={act.key} 
                onClick={() => {
                  if (act.key === 'sales') onNavigate && onNavigate('SALES');
                  else if (act.key === 'purchase') onNavigate && onNavigate('PURCHASE');
                  else if (act.key === 'production') onNavigate && onNavigate('PRODUCTION');
                  else if (act.key === 'inventory') onNavigate && onNavigate('INVENTORY');
                  else if (act.key === 'milan') onNavigate && onNavigate('LEDGER');
                }}
                style={{ backgroundColor: act.bg || '#0284c7', color: '#ffffff', border: 'none', padding: '12px 14px', borderRadius: '10px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
              >
                <span style={{ fontSize: '18px' }}>{act.icon}</span>
                <span style={{ lineHeight: '1.2' }}>{act.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* SECTION 4: ALL ACCOUNTING & ERP MODULES */}
      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>🗂️</span> All Accounting & ERP Modules
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
        
        <button onClick={() => onNavigate && onNavigate('ADD_ACCOUNT')} style={menuButtonStyle}>
          <span style={{ fontSize: '16px' }}>➕</span> Add Account Head (नया खाता बनाएं)
        </button>

        <button onClick={() => onNavigate && onNavigate('SALES')} style={menuButtonStyle}>
          <span style={{ fontSize: '16px' }}>📄</span> Sales / Tax Invoice (बिक्री बिल)
        </button>

        <button onClick={() => onNavigate && onNavigate('PURCHASE')} style={menuButtonStyle}>
          <span style={{ fontSize: '16px' }}>📦</span> Purchase & Inward Stock (खरीद बिल)
        </button>

        <button onClick={() => onNavigate && onNavigate('VOUCHER')} style={menuButtonStyle}>
          <span style={{ fontSize: '16px' }}>📝</span> Voucher Entry (Payment / Receipt / JV)
        </button>

        <button onClick={() => onNavigate && onNavigate('FUEL')} style={menuButtonStyle}>
          <span style={{ fontSize: '16px' }}>🚜</span> Fuel & Material Consumption (खपत)
        </button>

        <button onClick={() => onNavigate && onNavigate('PRODUCTION')} style={menuButtonStyle}>
          <span style={{ fontSize: '16px' }}>🧱</span> Production & Cost (उत्पादन लागत)
        </button>

        <button onClick={() => onNavigate && onNavigate('LABOUR')} style={menuButtonStyle}>
          <span style={{ fontSize: '16px' }}>👷</span> Labour, Wages & Tractor (मजदूरी)
        </button>

        <button onClick={() => onNavigate && onNavigate('SETTLEMENT')} style={menuButtonStyle}>
          <span style={{ fontSize: '16px' }}>⚖️</span> Bill Settlement / Khata Milan
        </button>

        <button onClick={() => onNavigate && onNavigate('INVENTORY')} style={menuButtonStyle}>
          <span style={{ fontSize: '16px' }}>📋</span> Inventory & Stock Register (स्टॉक)
        </button>

        <button onClick={() => onNavigate && onNavigate('LEDGER')} style={menuButtonStyle}>
          <span style={{ fontSize: '16px' }}>📖</span> Account Milan & Ledger (खाता बही)
        </button>

        <button onClick={() => setActiveView('JOURNAL_REGISTER')} style={menuButtonStyle}>
          <span style={{ fontSize: '16px' }}>📑</span> General Journal Register (रोज़नामचा)
        </button>

        <button onClick={() => setActiveView('FINANCIAL_REPORTS')} style={menuButtonStyle}>
          <span style={{ fontSize: '16px' }}>📈</span> Financial Reports (P&L / Balance Sheet)
        </button>

        <button onClick={() => setActiveView('CASH_FLOW')} style={menuButtonStyle}>
          <span style={{ fontSize: '16px' }}>📊</span> Cash Flow Statement (नकदी प्रवाह)
        </button>

        <button onClick={() => onNavigate && onNavigate('SETTINGS')} style={menuButtonStyle}>
          <span style={{ fontSize: '16px' }}>⚙️</span> Firm Profile & Settings (फर्म विवरण)
        </button>

        <button onClick={() => setActiveView('BACKUP_CENTER')} style={menuButtonStyle}>
          <span style={{ fontSize: '16px' }}>🔒</span> Backup & Restore Center (डाटा बैकअप)
        </button>

        <button onClick={() => onNavigate && onNavigate('RESET')} style={{ ...menuButtonStyle, backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }}>
          <span style={{ fontSize: '16px' }}>🗑️</span> Factory Reset / Clear Data (डेटा रीसेट)
        </button>

      </div>

    </div>
  );
}

const kpiCardStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  padding: '14px',
  borderRadius: '12px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  boxSizing: 'border-box',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
};

const menuButtonStyle = {
  width: '100%',
  padding: '12px 14px',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
  fontWeight: '700',
  fontSize: '12px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  boxSizing: 'border-box',
  textAlign: 'left',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
};
