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
    categorySpecifics: { cards: [], actions: [] }
  });
  const [summaryStats, setSummaryStats] = useState({ totalProduction: 0, totalConsumption: 0 });

  const firmId = firm?.id || firm?.firm_id || 'FIRM-001';
  const prodStorageKey = `bhatta_production_${firmId}_${selectedFY}`;
  const consStorageKey = `fuel_consumption_${firmId}_${selectedFY}`;

  const loadDashboardData = () => {
    try {
      const dynamicData = getDynamicDashboardMetrics(firm);
      if (dynamicData) setMetrics(dynamicData);

      const prodData = StorageService.getItem ? StorageService.getItem(prodStorageKey) : JSON.parse(localStorage.getItem(prodStorageKey) || '[]');
      const consData = StorageService.getItem ? StorageService.getItem(consStorageKey) : JSON.parse(localStorage.getItem(consStorageKey) || '[]');
      
      const totalProd = Array.isArray(prodData) ? prodData.reduce((sum, item) => sum + (Number(item.producedQty || item.produced_qty) || 0), 0) : 0;
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
    return () => {
      window.removeEventListener('app_state_updated', loadDashboardData);
      window.removeEventListener('app_storage_updated', loadDashboardData);
    };
  }, [firmId, selectedFY]);

  if (activeView === 'CASH_FLOW') {
    return <CashFlowStatementView firm={firm} selectedFY={selectedFY} onClose={() => setActiveView('DASHBOARD')} />;
  }
  if (activeView === 'FINANCIAL_REPORTS') {
    return <FinancialReportsView firm={firm} selectedFY={selectedFY} onClose={() => setActiveView('DASHBOARD')} />;
  }
  if (activeView === 'JOURNAL_REGISTER') {
    return <JournalRegisterView firm={firm} selectedFY={selectedFY} onClose={() => setActiveView('DASHBOARD')} />;
  }
  if (activeView === 'BACKUP_CENTER') {
    return <SecurityBackupSettings firm={firm} selectedFY={selectedFY} onClose={() => setActiveView('DASHBOARD')} />;
  }

  const specCards = metrics.categorySpecifics?.cards || [];
  const specActions = metrics.categorySpecifics?.actions || [];

  return (
    <div style={{ padding: '20px', backgroundColor: '#090d16', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: '800px', margin: '0 auto', boxSizing: 'border-box', color: '#f8fafc' }}>
      
      {/* Professional Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '18px 22px', borderRadius: '16px', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enterprise ERP Manager • {selectedFY}</div>
          <h2 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: '900', color: '#fff', letterSpacing: '-0.025em' }}>{firm?.legal_name || firm?.trade_name || firm?.name || 'Enterprise Firm'}</h2>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ backgroundColor: 'rgba(220, 38, 38, 0.2)', color: '#f87171', border: '1px solid rgba(220, 38, 38, 0.4)', padding: '8px 14px', borderRadius: '10px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
            ✕ Close
          </button>
        )}
      </div>

      {/* SECTION 1: FINANCIAL HEALTH & KPI CARDS */}
      <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>📈</span> Financial Health & Position
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '22px' }}>
        
        {/* Cash & Bank */}
        <div style={kpiCardStyle}>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>💵 Cash & Bank (रोकड़/बैंक)</div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#4ade80', marginTop: '6px', letterSpacing: '-0.02em' }}>
            ₹{metrics.cashAndBank.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Stock Valuation */}
        <div style={kpiCardStyle}>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>📦 Stock Valuation (स्टॉक)</div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#38bdf8', marginTop: '6px', letterSpacing: '-0.02em' }}>
            ₹{metrics.totalStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Receivables */}
        <div style={kpiCardStyle}>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>📥 Receivables (लेना बाकी)</div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#60a5fa', marginTop: '6px', letterSpacing: '-0.02em' }}>
            ₹{metrics.receivables.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Payables */}
        <div style={kpiCardStyle}>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>📤 Payables (देना बाकी)</div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#f87171', marginTop: '6px', letterSpacing: '-0.02em' }}>
            ₹{metrics.payables.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

      </div>

      {/* SECTION 2: INDUSTRY & INVENTORY SPECIFIC METRICS */}
      {specCards.length > 0 && (
        <>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🏭</span> Industry & Inventory Metrics ({metrics.categorySpecifics.category})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '22px' }}>
            {specCards.map((card, idx) => (
              <div key={idx} style={kpiCardStyle}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{card.icon}</span> {card.label}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: card.color || '#fff', marginTop: '6px' }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* SECTION 3: QUICK OPERATIONS SHORTCUTS */}
      {specActions.length > 0 && (
        <>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚡</span> Quick Operations
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '24px' }}>
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
                style={{ backgroundColor: act.bg || '#1e293b', color: '#fff', border: '1px solid #334155', padding: '12px 14px', borderRadius: '12px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', transition: 'transform 0.1s, background-color 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              >
                <span style={{ fontSize: '18px' }}>{act.icon}</span>
                <span style={{ lineHeight: '1.2' }}>{act.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* SECTION 4: COMPLETE ACCOUNTING & ERP MODULES */}
      <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>🗂️</span> Complete Accounting & ERP Modules
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

        <button onClick={() => onNavigate && onNavigate('FUEL')} style={{ ...menuButtonStyle, backgroundColor: '#064e3b', borderColor: '#059669' }}>
          <span style={{ fontSize: '16px' }}>🚜</span> Fuel & Material Consumption (खपत)
        </button>

        <button onClick={() => onNavigate && onNavigate('PRODUCTION')} style={{ ...menuButtonStyle, backgroundColor: '#0c4a6e', borderColor: '#0284c7' }}>
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

        <button onClick={() => setActiveView('CASH_FLOW')} style={{ ...menuButtonStyle, backgroundColor: '#0369a1', borderColor: '#38bdf8' }}>
          <span style={{ fontSize: '16px' }}>📊</span> Cash Flow Statement (नकदी प्रवाह)
        </button>

        <button onClick={() => onNavigate && onNavigate('SETTINGS')} style={menuButtonStyle}>
          <span style={{ fontSize: '16px' }}>⚙️</span> Firm Profile & Settings (फर्म विवरण)
        </button>

        <button onClick={() => setActiveView('BACKUP_CENTER')} style={menuButtonStyle}>
          <span style={{ fontSize: '16px' }}>🔒</span> Backup & Restore Center (डाटा बैकअप)
        </button>

        <button onClick={() => onNavigate && onNavigate('RESET')} style={{ ...menuButtonStyle, backgroundColor: 'rgba(127, 29, 29, 0.3)', borderColor: '#7f1d1d', color: '#fca5a5' }}>
          <span style={{ fontSize: '16px' }}>🗑️</span> Factory Reset / Clear Data (डेटा रीसेट)
        </button>

      </div>

    </div>
  );
}

const kpiCardStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  padding: '14px',
  borderRadius: '14px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  boxSizing: 'border-box',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
};

const menuButtonStyle = {
  width: '100%',
  padding: '14px 16px',
  backgroundColor: '#1e293b',
  color: '#ffffff',
  border: '1px solid #334155',
  borderRadius: '14px',
  fontWeight: '700',
  fontSize: '13px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  boxSizing: 'border-box',
  textAlign: 'left',
  transition: 'background-color 0.2s, border-color 0.2s',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};
