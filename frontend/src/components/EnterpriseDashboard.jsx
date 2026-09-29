// frontend/src/components/EnterpriseDashboard.jsx

import React, { useState, useEffect } from 'react';
import CashFlowStatementView from './CashFlowStatementView';
import FinancialReportsView from './FinancialReportsView';
import JournalRegisterView from './JournalRegisterView';
import SecurityBackupSettings from './SecurityBackupSettings';
import { StorageService } from '../utils/storageSync';

export default function EnterpriseDashboard({ firm, selectedFY, onNavigate, onClose }) {
  const [activeView, setActiveView] = useState('DASHBOARD');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  // Handle specific sub-views cleanly
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
    <div style={{ padding: '16px', backgroundColor: '#0f172a', minHeight: '100vh', fontFamily: 'sans-serif', maxWidth: '650px', margin: '0 auto', boxSizing: 'border-box', color: '#fff', position: 'relative' }}>
      
      {/* Top Header Bar with Menu Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', backgroundColor: '#1e293b', padding: '14px 16px', borderRadius: '12px', border: '1px solid #334155' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>Account Book Manager ({selectedFY})</div>
          <h3 style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: '800' }}>{firm?.legal_name || firm?.name || 'Enterprise Firm'}</h3>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ backgroundColor: '#0f766e', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>☰</span> Menu
          </button>
          {onClose && (
            <button onClick={onClose} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '7px 10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Slide-out Menu Drawer */}
      {isMenuOpen && (
        <div style={{ position: 'absolute', top: '75px', left: '16px', right: '16px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '12px', padding: '14px', zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', maxHeight: '75vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#38bdf8', textTransform: 'uppercase' }}>Accounting Workflow Menu</span>
            <button onClick={() => setIsMenuOpen(false)} style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}>✕ Close</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button onClick={() => { setActiveView('DASHBOARD'); setIsMenuOpen(false); }} style={menuButtonStyle}>
              <span>📊</span> Dashboard (डैशबोर्ड)
            </button>
            <button onClick={() => { if(onNavigate) onNavigate('ADD_ACCOUNT'); setIsMenuOpen(false); }} style={{ ...menuButtonStyle, backgroundColor: '#0f766e' }}>
              <span>➕</span> Add Account Head (नया खाता)
            </button>
            <button onClick={() => { if(onNavigate) onNavigate('SALES'); setIsMenuOpen(false); }} style={menuButtonStyle}>
              <span>📄</span> Sales / Tax Invoice (बिक्री बिल)
            </button>
            <button onClick={() => { if(onNavigate) onNavigate('PURCHASE'); setIsMenuOpen(false); }} style={menuButtonStyle}>
              <span>📦</span> Purchase & Inward Stock (खरीद बिल)
            </button>
            <button onClick={() => { if(onNavigate) onNavigate('VOUCHER'); setIsMenuOpen(false); }} style={menuButtonStyle}>
              <span>📝</span> Voucher Entry (JV / PV / RV / Contra)
            </button>
            <button onClick={() => { if(onNavigate) onNavigate('FUEL'); setIsMenuOpen(false); }} style={menuButtonStyle}>
              <span>🚜</span> Fuel & Material Consumption (डीजल/खपत)
            </button>
            <button onClick={() => { if(onNavigate) onNavigate('PRODUCTION'); setIsMenuOpen(false); }} style={menuButtonStyle}>
              <span>🧱</span> Production & Cost Valuation (उत्पादन लागत)
            </button>
            <button onClick={() => { if(onNavigate) onNavigate('LABOUR'); setIsMenuOpen(false); }} style={menuButtonStyle}>
              <span>👷</span> Labour, Wages & Tractor (मजदूरी/वेतन)
            </button>
            <button onClick={() => { if(onNavigate) onNavigate('SETTLEMENT'); setIsMenuOpen(false); }} style={menuButtonStyle}>
              <span>⚖️</span> Bill Settlement / Khata Milan
            </button>
            <button onClick={() => { if(onNavigate) onNavigate('INVENTORY'); setIsMenuOpen(false); }} style={menuButtonStyle}>
              <span>📋</span> Inventory & Stock Count (स्टॉक रजिस्टर)
            </button>
            <button onClick={() => { if(onNavigate) onNavigate('LEDGER'); setIsMenuOpen(false); }} style={menuButtonStyle}>
              <span>📖</span> Account Milan & Ledger (खाता बही)
            </button>
            <button onClick={() => { setActiveView('JOURNAL_REGISTER'); setIsMenuOpen(false); }} style={menuButtonStyle}>
              <span>📑</span> General Journal Register (रोज़नामचा)
            </button>
            <button onClick={() => { setActiveView('FINANCIAL_REPORTS'); setIsMenuOpen(false); }} style={menuButtonStyle}>
              <span>📈</span> Financial Reports (P&L / Balance Sheet)
            </button>
            <button onClick={() => { setActiveView('CASH_FLOW'); setIsMenuOpen(false); }} style={menuButtonStyle}>
              <span>📈</span> Cash Flow Statement (नकदी प्रवाह विवरण)
            </button>
            <button onClick={() => { if(onNavigate) onNavigate('SETTINGS'); setIsMenuOpen(false); }} style={menuButtonStyle}>
              <span>⚙️</span> Firm Profile & Settings (फर्म विवरण)
            </button>
            <button onClick={() => { setActiveView('BACKUP_CENTER'); setIsMenuOpen(false); }} style={menuButtonStyle}>
              <span>🔒</span> Backup & Restore Center (डाटा बैकअप)
            </button>
            <button onClick={() => { if(onNavigate) onNavigate('RESET'); setIsMenuOpen(false); }} style={{ ...menuButtonStyle, backgroundColor: '#7f1d1d' }}>
              <span>🗑️</span> Factory Reset / Clear Data (डेटा रीसेट)
            </button>
          </div>
        </div>
      )}

      {/* Main Dashboard Overview Page Content */}
      <div>
        {/* Quick Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>Total Production Qty</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#38bdf8', marginTop: '4px' }}>{summaryStats.totalProduction.toLocaleString('en-IN')} Units</div>
          </div>
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>Consumption Batches</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#4ade80', marginTop: '4px' }}>{summaryStats.totalConsumption} Records</div>
          </div>
        </div>

        {/* Enterprise Welcome & Status Banner */}
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '6px' }}>
            Welcome to Enterprise Smart Manager
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
            Aapka manufacturing aur accounting system poori tarah active hai. Naye accounts banane, purchase/sales enter karne ya reports dekhne ke liye upar diye gaye <strong style={{ color: '#38bdf8' }}>☰ Menu</strong> button ka use karein.
          </div>
        </div>
      </div>

    </div>
  );
}

const menuButtonStyle = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: '#0f172a',
  color: '#ffffff',
  border: '1px solid #334155',
  borderRadius: '8px',
  fontWeight: '700',
  fontSize: '12px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  boxSizing: 'border-box',
  textAlign: 'left'
};
