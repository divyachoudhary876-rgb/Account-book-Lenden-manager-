// frontend/src/components/EnterpriseDashboard.jsx

import React, { useState, useEffect } from 'react';
import CashFlowStatementView from './CashFlowStatementView.jsx';
import FinancialReportsView from './FinancialReportsView.jsx';
import JournalRegisterView from './JournalRegisterView.jsx';
import SecurityBackupSettings from './SecurityBackupSettings.jsx';
import { getDynamicDashboardMetrics } from '../utils/dashboardDataEngine.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export default function EnterpriseDashboard({ firm, selectedFY, onNavigate, onClose }) {
  const [activeView, setActiveView] = useState('DASHBOARD');

  const firmId = firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  const cleanFY = String(selectedFY || localStorage.getItem(`app_active_fy_${firmId}`) || '2026-27').replace(/FY\s*/i, '').trim();
  const effectiveFY = cleanFY || '2026-27';

  const [metrics, setMetrics] = useState({
    receivables: 0,
    payables: 0,
    cashAndBank: 0,
    totalSales: 0,
    totalPurchases: 0,
    totalStockValuation: 0,
    categorySpecifics: {
      category: 'ईंट भट्ठा (Brick Kiln)',
      cards: [],
      actions: []
    }
  });

  const [summaryStats, setSummaryStats] = useState({
    totalProduction: 0,
    totalConsumption: 0
  });

  const loadDashboardData = () => {
    try {
      let dynamicData = null;
      try {
        if (typeof getDynamicDashboardMetrics === 'function') {
          dynamicData = getDynamicDashboardMetrics(firm || firmId, effectiveFY);
        }
      } catch (err) {
        console.warn("dashboardDataEngine fallback triggered:", err);
      }

      // Always perform real-time stock valuation check to prevent stale metrics
      const stockRaw = localStorage.getItem(`inventory_items_${firmId}`) || localStorage.getItem(`app_stock_${firmId}`) || '[]';
      const stockItems = JSON.parse(stockRaw);

      let stockVal = 0;
      let rawBricks = 0;
      let pakkiBricks = 0;
      let fuelQty = 0;

      stockItems.forEach(item => {
        const qty = parseFloat(item.current_stock || item.stock || 0);
        const rate = parseFloat(
          item.unit_purchase_price || 
          item.purchase_price || 
          item.cost_price || 
          item.unit_valuation || 
          item.rate || 
          0
        );
        const iName = String(item.name || item.item_name || '').toLowerCase();

        if (qty > 0 && rate > 0) stockVal += (qty * rate);
        if (iName.includes('kacchi') || iName.includes('raw') || iName.includes('कच्ची')) rawBricks += qty;
        if (iName.includes('pakki') || iName.includes('red') || iName.includes('पक्की')) pakkiBricks += qty;
        if (iName.includes('coal') || iName.includes('fuel') || iName.includes('diesel')) fuelQty += qty;
      });

      if (dynamicData && (dynamicData.cashAndBank !== 0 || dynamicData.receivables !== 0)) {
        setMetrics({
          ...dynamicData,
          totalStockValuation: round2(stockVal > 0 ? stockVal : dynamicData.totalStockValuation)
        });
      } else {
        const accountsRaw = localStorage.getItem(`app_accounts_${firmId}`) || localStorage.getItem(`account_heads_${firmId}`) || '[]';
        const vouchersRaw = localStorage.getItem(`app_vouchers_${firmId}`) || localStorage.getItem(`account_book_vouchers_${firmId}`) || '[]';

        const accounts = JSON.parse(accountsRaw);
        const vouchers = JSON.parse(vouchersRaw);

        let cashBank = 0;
        let recv = 0;
        let pay = 0;

        accounts.forEach(acc => {
          const name = String(acc.account_name || acc.name || '').toLowerCase();
          const op = parseFloat(acc.opening_balance || acc.openingBalance || 0);
          const type = String(acc.primary_type || acc.type || '').toUpperCase();
          const grp = String(acc.sub_group || acc.group || '').toLowerCase();

          if (name.includes('cash') || name.includes('bank') || grp.includes('bank') || grp.includes('cash')) {
            cashBank += (acc.balance_type === 'Cr' ? -op : op);
          } else if (type === 'ASSETS' || grp.includes('debtor') || grp.includes('customer')) {
            recv += Math.max(0, op);
          } else if (type === 'LIABILITIES' || grp.includes('creditor') || grp.includes('supplier')) {
            pay += Math.max(0, op);
          }
        });

        vouchers.forEach(v => {
          if (!v) return;
          const amt = parseFloat(v.amount || v.total_amount || 0);
          const dr = String(v.dr_account || '').toLowerCase();
          const cr = String(v.cr_account || '').toLowerCase();

          if (dr.includes('cash') || dr.includes('bank')) cashBank += amt;
          if (cr.includes('cash') || cr.includes('bank')) cashBank -= amt;
        });

        setMetrics({
          receivables: round2(recv),
          payables: round2(pay),
          cashAndBank: round2(cashBank),
          totalSales: 0,
          totalPurchases: 0,
          totalStockValuation: round2(stockVal),
          categorySpecifics: {
            category: 'ईंट भट्ठा (Brick Kiln)',
            cards: [
              { label: 'Raw Bricks (कच्ची ईंटें)', value: `${rawBricks.toLocaleString('en-IN')} Pcs`, color: '#0284c7', icon: '🧱' },
              { label: 'Finished Bricks (पक्की ईंटें)', value: `${pakkiBricks.toLocaleString('en-IN')} Pcs`, color: '#d97706', icon: '🏗️️' },
              { label: 'Fuel / Coal Stock', value: `${fuelQty.toFixed(2)} Units`, color: '#475569', icon: '⚡' },
              { label: 'Live Stock Value', value: `₹${round2(stockVal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#059669', icon: '📊' }
            ],
            actions: [
              { key: 'sales', label: 'Brick Dispatch / Sales', icon: '🧾', bg: '#0284c7' },
              { key: 'production', label: 'Bhatta Production Entry', icon: '🧱', bg: '#d97706' },
              { key: 'purchase', label: 'Fuel & Raw Purchases', icon: '🛍️', bg: '#059669' },
              { key: 'milan', label: 'Customer/Labour Milan', icon: '📑', bg: '#7c3aed' }
            ]
          }
        });
      }

      // Summary stats
      const prodKeys = [
        `production_batches_${firmId}`,
        `bhatta_production_${firmId}_${effectiveFY}`,
        `bhatta_production_${firmId}`
      ];
      let prodData = [];
      for (const k of prodKeys) {
        try {
          const parsed = JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(parsed) && parsed.length > 0) {
            prodData = parsed;
            break;
          }
        } catch (e) {}
      }

      const totalProd = prodData.reduce((sum, item) => 
        sum + (Number(item.produced_qty || item.producedQty || item.quantity || item.qty) || 0), 0
      );

      const consKeys = [
        `material_consumption_records_${firmId}`,
        `universal_material_adjustments_${firmId}`,
        `fuel_consumption_${firmId}_${effectiveFY}`
      ];
      let consCount = 0;
      for (const k of consKeys) {
        try {
          const parsed = JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(parsed)) consCount += parsed.length;
        } catch (e) {}
      }

      setSummaryStats({
        totalProduction: totalProd,
        totalConsumption: consCount
      });

    } catch (e) {
      console.error("Dashboard metrics calculation error:", e);
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
    <div style={{ padding: '12px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: '850px', margin: '0 auto', boxSizing: 'border-box', color: '#0f172a' }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', backgroundColor: '#ffffff', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#0284c7', fontWeight: '800', textTransform: 'uppercase' }}>
            Enterprise Smart Manager • FY {effectiveFY}
          </div>
          <h2 style={{ margin: '2px 0 0 0', fontSize: '17px', fontWeight: '900', color: '#0f172a' }}>
            {firm?.legal_name || firm?.trade_name || firm?.name || 'Neelkanth Int Udy'}
          </h2>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>
            ✕ Close
          </button>
        )}
      </div>

      {/* SECTION 1: FINANCIAL HEALTH & KPI CARDS */}
      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>📈</span> Financial Position (वित्तीय स्थिति)
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginBottom: '14px' }}>
        
        {/* Cash & Bank */}
        <div style={kpiCardStyle}>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>💵 Cash & Bank (रोकड़/बैंक)</div>
          <div style={{ fontSize: '16px', fontWeight: '900', color: '#059669', marginTop: '4px' }}>
            ₹{metrics.cashAndBank.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Stock Valuation */}
        <div style={kpiCardStyle}>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>📦 Stock Valuation (स्टॉक)</div>
          <div style={{ fontSize: '16px', fontWeight: '900', color: '#0284c7', marginTop: '4px' }}>
            ₹{metrics.totalStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Receivables */}
        <div style={kpiCardStyle}>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>📥 Receivables (लेना बाकी)</div>
          <div style={{ fontSize: '16px', fontWeight: '900', color: '#2563eb', marginTop: '4px' }}>
            ₹{metrics.receivables.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Payables */}
        <div style={kpiCardStyle}>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>📤 Payables (देना बाकी)</div>
          <div style={{ fontSize: '16px', fontWeight: '900', color: '#dc2626', marginTop: '4px' }}>
            ₹{metrics.payables.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

      </div>

      {/* SECTION 2: PRODUCTION & CONSUMPTION STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px', marginBottom: '14px' }}>
        <div style={{ ...kpiCardStyle, backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }}>
          <div style={{ fontSize: '10px', color: '#0369a1', fontWeight: '700', textTransform: 'uppercase' }}>🧱 Total Production Qty</div>
          <div style={{ fontSize: '16px', fontWeight: '900', color: '#0284c7', marginTop: '4px' }}>
            {summaryStats.totalProduction.toLocaleString('en-IN')} Units
          </div>
        </div>

        <div style={{ ...kpiCardStyle, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <div style={{ fontSize: '10px', color: '#15803d', fontWeight: '700', textTransform: 'uppercase' }}>🚜 Consumption / Issue Records</div>
          <div style={{ fontSize: '16px', fontWeight: '900', color: '#16a34a', marginTop: '4px' }}>
            {summaryStats.totalConsumption} Records
          </div>
        </div>
      </div>

      {/* SECTION 3: INDUSTRY SPECIFIC CARDS */}
      {specCards.length > 0 && (
        <>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🏭</span> {metrics.categorySpecifics.category || 'Industry Metrics'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginBottom: '16px' }}>
            {specCards.map((card, idx) => (
              <div key={idx} style={kpiCardStyle}>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{card.icon}</span> {card.label}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '900', color: card.color || '#0f172a', marginTop: '4px' }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* SECTION 4: QUICK OPERATIONS */}
      {specActions.length > 0 && (
        <>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚡</span> Quick Operations
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '16px' }}>
            {specActions.map((act) => (
              <button 
                key={act.key} 
                onClick={() => {
                  if (act.key === 'sales') onNavigate && onNavigate('sales');
                  else if (act.key === 'purchase') onNavigate && onNavigate('purchase');
                  else if (act.key === 'production') onNavigate && onNavigate('production');
                  else if (act.key === 'inventory') onNavigate && onNavigate('inventory');
                  else if (act.key === 'milan') onNavigate && onNavigate('milan');
                }}
                style={{ backgroundColor: act.bg || '#0284c7', color: '#ffffff', border: 'none', padding: '10px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
              >
                <span style={{ fontSize: '16px' }}>{act.icon}</span>
                <span style={{ lineHeight: '1.2' }}>{act.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* SECTION 5: ALL ACCOUNTING & ERP MODULES */}
      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>🗂️</span> All Accounting & ERP Modules
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
        
        <button onClick={() => onNavigate && onNavigate('add_account')} style={menuButtonStyle}>
          <span style={{ fontSize: '15px' }}>➕</span> Add Account Head (नया खाता बनाएं)
        </button>

        <button onClick={() => onNavigate && onNavigate('sales')} style={menuButtonStyle}>
          <span style={{ fontSize: '15px' }}>📄</span> Sales / Tax Invoice (बिक्री बिल)
        </button>

        <button onClick={() => onNavigate && onNavigate('purchase')} style={menuButtonStyle}>
          <span style={{ fontSize: '15px' }}>📦</span> Purchase & Inward Stock (खरीद बिल)
        </button>

        <button onClick={() => onNavigate && onNavigate('vouchers')} style={menuButtonStyle}>
          <span style={{ fontSize: '15px' }}>📝</span> Voucher Entry (Payment / Receipt / JV)
        </button>

        <button onClick={() => onNavigate && onNavigate('material_adjustment')} style={menuButtonStyle}>
          <span style={{ fontSize: '15px' }}>📦</span> Material Issue & Adjustment (सामग्री निकासी व कटौती)
        </button>

        <button onClick={() => onNavigate && onNavigate('production')} style={menuButtonStyle}>
          <span style={{ fontSize: '15px' }}>🧱</span> Production & Pakai (ईंट पकाई व लागत)
        </button>

        <button onClick={() => onNavigate && onNavigate('payroll')} style={menuButtonStyle}>
          <span style={{ fontSize: '15px' }}>👷</span> Labour, Wages & Tractor (मजदूरी)
        </button>

        <button onClick={() => onNavigate && onNavigate('settlement')} style={menuButtonStyle}>
          <span style={{ fontSize: '15px' }}>⚖️</span> Bill Settlement / Khata Milan
        </button>

        <button onClick={() => onNavigate && onNavigate('inventory')} style={menuButtonStyle}>
          <span style={{ fontSize: '15px' }}>📋</span> Inventory & Stock Register (स्टॉक)
        </button>

        <button onClick={() => onNavigate && onNavigate('milan')} style={menuButtonStyle}>
          <span style={{ fontSize: '15px' }}>📖</span> Account Milan & Ledger (खाता बही)
        </button>

        <button onClick={() => setActiveView('JOURNAL_REGISTER')} style={menuButtonStyle}>
          <span style={{ fontSize: '15px' }}>📑</span> General Journal Register (रोज़नामचा)
        </button>

        <button onClick={() => setActiveView('FINANCIAL_REPORTS')} style={menuButtonStyle}>
          <span style={{ fontSize: '15px' }}>📈</span> Financial Reports (P&L / Balance Sheet)
        </button>

        <button onClick={() => setActiveView('CASH_FLOW')} style={menuButtonStyle}>
          <span style={{ fontSize: '15px' }}>📊</span> Cash Flow Statement (नकदी प्रवाह विवरण)
        </button>

        <button onClick={() => onNavigate && onNavigate('firm_settings')} style={menuButtonStyle}>
          <span style={{ fontSize: '15px' }}>⚙️</span> Firm Profile & Settings (फर्म विवरण)
        </button>

        <button onClick={() => setActiveView('BACKUP_CENTER')} style={menuButtonStyle}>
          <span style={{ fontSize: '15px' }}>🔒</span> Backup & Restore Center (डाटा बैकअप)
        </button>

        <button onClick={() => onNavigate && onNavigate('purge')} style={{ ...menuButtonStyle, backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }}>
          <span style={{ fontSize: '15px' }}>🗑️</span> Factory Reset / Clear Data (डेटा रीसेट)
        </button>

      </div>

    </div>
  );
}

const kpiCardStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  padding: '12px',
  borderRadius: '10px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  boxSizing: 'border-box',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
};

const menuButtonStyle = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  fontWeight: '700',
  fontSize: '11px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  boxSizing: 'border-box',
  textAlign: 'left',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
};
