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
      // 1. Load Real-time Accounting & Inventory Metrics
      const dynamicData = getDynamicDashboardMetrics(firm);
      if (dynamicData) setMetrics(dynamicData);

      // 2. Load Production & Consumption stats
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

  // Render active view router for specialized modules
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
    <div style={{ padding: '16px', backgroundColor: '#0f172a', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: '650px', margin: '0 auto', boxSizing: 'border-box', color: '#fff' }}>
      
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', backgroundColor: '#1e293b', padding: '14px 16px', borderRadius: '12px', border: '1px solid #334155' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>Enterprise ERP Manager ({selectedFY})</div>
          <h3 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: '800', color: '#f8fafc' }}>{firm?.legal_name || firm?.trade_name || firm?.name || 'Enterprise Firm'}</h3>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
            ✕ Close
          </button>
        )}
      </div>

      {/* PROFESSIONAL FINANCIAL KPI CARDS (Tally/Busy Style) */}
      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
        Financial Health & Position
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '14px' }}>
        
        {/* Cash & Bank */}
        <div style={kpiCardStyle}>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>💵 Cash & Bank (रोकड़/बैंक)</div>
          <div style={{ fontSize: '15px', fontWeight: '900', color: '#4ade80', marginTop: '4px' }}>
            ₹{metrics.cashAndBank.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Total Stock Valuation */}
        <div style={kpiCardStyle}>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>📦 Stock Valuation (स्टॉक मूल्य)</div>
          <div style={{ fontSize: '15px', fontWeight: '900', color: '#38bdf8', marginTop: '4px' }}>
            ₹{metrics.totalStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Total Receivables (Sundry Debtors) */}
        <div style={kpiCardStyle}>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>📥 Receivables (लेना बाकी)</div>
          <div style={{ fontSize: '15px', fontWeight: '900', color: '#60a5fa', marginTop: '4px' }}>
            ₹{metrics.receivables.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Total Payables (Sundry Creditors) */}
        <div style={kpiCardStyle}>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>📤 Payables (देना बाकी)</div>
          <div style={{ fontSize: '15px', fontWeight: '900', color: '#f87171', marginTop: '4px' }}>
            ₹{metrics.payables.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

      </div>

      {/* CATEGORY SPECIFIC METRICS (Brick / Biomass / Trading) */}
      {specCards.length > 0 && (
        <>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
            Industry & Inventory Metrics ({metrics.categorySpecifics.category})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '14px' }}>
            {specCards.map((card, idx) => (
              <div key={idx} style={kpiCardStyle}>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {card.icon} {card.label}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '900', color: card.color || '#fff', marginTop: '4px' }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* QUICK ACTION BUTTONS */}
      {specActions.length > 0 && (
        <>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
            Quick Operations
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
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
                style={{ backgroundColor: act.bg || '#1e293b', color: '#fff', border: '1px solid #334155', padding: '10px 12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}
              >
                <span style={{ fontSize: '16px' }}>{act.icon}</span>
                <span>{act.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Accounting Workflow Menu List */}
      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>
        Complete Accounting & ERP Modules
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        <button onClick={() => onNavigate && onNavigate('ADD_ACCOUNT')} style={menuButtonStyle}>
          <span>➕</span> Add Account Head (नया खाता बनाएं)
        </button>

        <button onClick={() => onNavigate && onNavigate('SALES')} style={menuButtonStyle}>
          <span>📄</span> Sales / Tax Invoice (बिक्री बिल)
        </button>

        <button onClick={() => onNavigate && onNavigate('PURCHASE')} style={menuButtonStyle}>
          <span>📦</span> Purchase & Inward Stock (खरीद बिल)
        </button>

        <button onClick={() => onNavigate && onNavigate('VOUCHER')} style={menuButtonStyle}>
          <span>📝</span> Voucher Entry (Payment / Receipt / JV / Contra)
        </button>

        <button onClick={() => onNavigate && onNavigate('FUEL')} style={{ ...menuButtonStyle, backgroundColor: '#064e3b', borderColor: '#059669' }}>
          <span>🚜</span> Fuel & Material Consumption (डीजल व सामग्री खपत)
        </button>

        <button onClick={() => onNavigate && onNavigate('PRODUCTION')} style={{ ...menuButtonStyle, backgroundColor: '#0c4a6e', borderColor: '#0284c7' }}>
          <span>🧱</span> Production & Cost Valuation (उत्पादन लागत)
        </button>

        <button onClick={() => onNavigate && onNavigate('LABOUR')} style={menuButtonStyle}>
          <span>👷</span> Labour, Wages & Tractor (मजदूरी व वेतन)
        </button>

        <button onClick={() => onNavigate && onNavigate('SETTLEMENT')} style={menuButtonStyle}>
          <span>⚖️</span> Bill Settlement / Khata Milan
        </button>

        <button onClick={() => onNavigate && onNavigate('INVENTORY')} style={menuButtonStyle}>
          <span>📋</span> Inventory & Stock Count (स्टॉक रजिस्टर)
        </button>

        <button onClick={() => onNavigate && onNavigate('LEDGER')} style={menuButtonStyle}>
          <span>📖</span> Account Milan & Ledger (खाता बही स्टेटमेंट)
        </button>

        <button onClick={() => setActiveView('JOURNAL_REGISTER')} style={menuButtonStyle}>
          <span>📑</span> General Journal Register (रोज़नामचा प्रविष्टि)
        </button>

        <button onClick={() => setActiveView('FINANCIAL_REPORTS')} style={menuButtonStyle}>
          <span>📈</span> Financial Reports (Trial Balance / P&L / Balance Sheet)
        </button>

        <button onClick={() => setActiveView('CASH_FLOW')} style={{ ...menuButtonStyle, backgroundColor: '#0369a1', borderColor: '#38bdf8' }}>
          <span>📈</span> Cash Flow Statement (नकदी प्रवाह विवरण)
        </button>

        <button onClick={() => onNavigate && onNavigate('SETTINGS')} style={menuButtonStyle}>
          <span>⚙️</span> Firm Profile & Settings (फर्म विवरण)
        </button>

        <button onClick={() => setActiveView('BACKUP_CENTER')} style={menuButtonStyle}>
          <span>🔒</span> Backup & Restore Center (डाटा बैकअप)
        </button>

        <button onClick={() => onNavigate && onNavigate('RESET')} style={{ ...menuButtonStyle, borderColor: '#7f1d1d', color: '#fca5a5' }}>
          <span>🗑️</span> Factory Reset / Clear Data (डेटा रीसेट)
        </button>

      </div>

    </div>
  );
}

const kpiCardStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  padding: '12px',
  borderRadius: '10px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  boxSizing: 'border-box'
};

const menuButtonStyle = {
  width: '100%',
  padding: '13px 16px',
  backgroundColor: '#1e293b',
  color: '#ffffff',
  border: '1px solid #334155',
  borderRadius: '12px',
  fontWeight: '700',
  fontSize: '13px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  boxSizing: 'border-box',
  textAlign: 'left'
};
