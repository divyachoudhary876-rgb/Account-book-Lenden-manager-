// frontend/src/components/EnterpriseDashboard.jsx

import React, { useState, useEffect } from 'react';
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
    <div style={{ padding: '4px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: '650px', margin: '0 auto', boxSizing: 'border-box', color: '#0f172a' }}>
      
      {/* Quick Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px', marginTop: '4px' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Production Qty</div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#0284c7', marginTop: '4px' }}>{summaryStats.totalProduction.toLocaleString('en-IN')} Units</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Consumption Batches</div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>{summaryStats.totalConsumption} Records</div>
        </div>
      </div>

      {/* Enterprise Welcome Banner */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', marginBottom: '6px' }}>
          Welcome to Enterprise Smart Manager
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
          Aapka manufacturing aur accounting system poori tarah active hai. Naye accounts banane, purchase/sales enter karne ya reports dekhne ke liye upar diye gaye <strong style={{ color: '#0284c7' }}>☰ Menu</strong> button ka use karein.
        </div>
      </div>

    </div>
  );
}
