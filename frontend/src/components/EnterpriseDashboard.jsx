// frontend/src/components/EnterpriseDashboard.jsx

import React, { useState, useEffect } from 'react';
import AccountingDashboard from './AccountingDashboard';
import CashFlowStatementView from './CashFlowStatementView';
import FinancialReportsView from './FinancialReportsView';
import JournalRegisterView from './JournalRegisterView';
import SecurityBackupSettings from './SecurityBackupSettings';
import { StorageService } from '../utils/storageSync';

export default function EnterpriseDashboard({ firm, selectedFY, onNavigate, onClose }) {
  const [activeView, setActiveView] = useState('DASHBOARD');
  const [summaryStats, setSummaryStats] = useState({ totalProduction: 0, totalConsumption: 0 });

  const firmId = firm?.id || 'FIRM-001';
  const prodStorageKey = `bhatta_production_${firmId}_${selectedFY}`;
  const consStorageKey = `fuel_consumption_${firmId}_${selectedFY}`;

  useEffect(() => {
    try {
      const prodData = StorageService.getItem ? StorageService.getItem(prodStorageKey) : JSON.parse(localStorage.getItem(prodStorageKey) || '[]');
      const consData = StorageService.getItem ? StorageService.getItem(consStorageKey) : JSON.parse(localStorage.getItem(consStorageKey) || '[]');
      
      const totalProd = Array.isArray(prodData) ? prodData.reduce((sum, item) => sum + (Number(item.producedQty) || 0), 0) : 0;
      const totalCons = Array.isArray(consData) ? consData.length : 0;

      setSummaryStats({ totalProduction: totalProd, totalConsumption: totalCons });
    } catch (e) {
      console.error("Error loading dashboard stats:", e);
    }
  }, [firmId, selectedFY, prodStorageKey, consStorageKey]);

  // Render active view router for specialized modules handled inside dashboard
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

  return (
    <div style={{ padding: '16px', backgroundColor: '#0f172a', minHeight: '100vh', fontFamily: 'sans-serif', maxWidth: '650px', margin: '0 auto', boxSizing: 'border-box', color: '#fff' }}>
      
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', backgroundColor: '#1e293b', padding: '14px 16px', borderRadius: '12px', border: '1px solid #334155' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>Account Book Smart Manager ({selectedFY})</div>
          <h3 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: '800' }}>{firm?.legal_name || firm?.name || 'Enterprise Firm'}</h3>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
            ✕ Close
          </button>
        )}
      </div>

      {/* Quick Summary Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>Total Production Qty</div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#38bdf8', marginTop: '4px' }}>{summaryStats.totalProduction.toLocaleString('en-IN')} Units</div>
        </div>
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>Consumption Batches</div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#4ade80', marginTop: '4px' }}>{summaryStats.totalConsumption} Records</div>
        </div>
      </div>

      {/* Accounting Workflow Menu List */}
      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>
        Accounting Workflow Menu
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        <button onClick={() => setActiveView('DASHBOARD')} style={menuButtonStyle}>
          <span>📊</span> Dashboard (डैशबोर्ड)
        </button>

        <button onClick={() => onNavigate && onNavigate('ADD_ACCOUNT')} style={{ ...menuButtonStyle, backgroundColor: '#0f766e', borderColor: '#14b8a6' }}>
          <span>➕</span> Add Account Head (नया खाता)
        </button>

        <button onClick={() => onNavigate && onNavigate('SALES')} style={menuButtonStyle}>
          <span>📄</span> Sales / Tax Invoice (बिक्री बिल)
        </button>

        <button onClick={() => onNavigate && onNavigate('PURCHASE')} style={menuButtonStyle}>
          <span>📦</span> Purchase & Inward Stock (खरीद बिल)
        </button>

        <button onClick={() => onNavigate && onNavigate('VOUCHER')} style={menuButtonStyle}>
          <span>📝</span> Voucher Entry (JV / PV / RV / Contra)
        </button>

        <button onClick={() => onNavigate && onNavigate('FUEL')} style={{ ...menuButtonStyle, backgroundColor: '#064e3b', borderColor: '#059669' }}>
          <span>🚜</span> Fuel & Material Consumption (डीजल/खपत)
        </button>

        <button onClick={() => onNavigate && onNavigate('PRODUCTION')} style={{ ...menuButtonStyle, backgroundColor: '#0c4a6e', borderColor: '#0284c7' }}>
          <span>🧱</span> Production & Cost Valuation (उत्पादन लागत)
        </button>

        <button onClick={() => onNavigate && onNavigate('LABOUR')} style={menuButtonStyle}>
          <span>👷</span> Labour, Wages & Tractor (मजदूरी/वेतन)
        </button>

        <button onClick={() => onNavigate && onNavigate('SETTLEMENT')} style={menuButtonStyle}>
          <span>⚖️</span> Bill Settlement / Khata Milan
        </button>

        <button onClick={() => onNavigate && onNavigate('INVENTORY')} style={menuButtonStyle}>
          <span>📋</span> Inventory & Stock Count (स्टॉक रजिस्टर)
        </button>

        <button onClick={() => onNavigate && onNavigate('LEDGER')} style={menuButtonStyle}>
          <span>📖</span> Account Milan & Ledger (खाता बही)
        </button>

        <button onClick={() => setActiveView('JOURNAL_REGISTER')} style={menuButtonStyle}>
          <span>📑</span> General Journal Register (रोज़नामचा)
        </button>

        <button onClick={() => setActiveView('FINANCIAL_REPORTS')} style={menuButtonStyle}>
          <span>📈</span> Financial Reports (P&L / Balance Sheet)
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

const menuButtonStyle = {
  width: '100%',
  padding: '14px 16px',
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
