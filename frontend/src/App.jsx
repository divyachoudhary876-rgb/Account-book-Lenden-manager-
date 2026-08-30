// frontend/src/App.jsx

import React, { useState } from 'react';
import BrickKilnProductionView from './components/BrickKilnProductionView.jsx';
import CreateInvoice from './components/CreateInvoice.jsx';
import PurchaseStockEntryForm from './components/PurchaseStockEntryForm.jsx';
import InventoryStockView from './components/InventoryStockView.jsx';
import VoucherEntryForm from './components/VoucherEntryForm.jsx';
import AccountStatementView from './components/AccountStatementView.jsx';
import JournalRegisterView from './components/JournalRegisterView.jsx';
import FinancialReportsView from './components/FinancialReportsView.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('inventory'); // Restored standard default tab
  const [activeFirm] = useState({ id: 'FIRM-001', legal_name: 'Aa (BRICK_KILN)', business_type: 'BRICK_KILN' });

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '12px' }}>
      
      {/* Top Main Navigation Bar */}
      <div style={{ backgroundColor: '#1e3a8a', color: '#fff', padding: '12px 16px', borderRadius: '8px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '16px' }}>📘 Account Book Smart Manager</h2>
        <span style={{ fontSize: '11px', backgroundColor: '#3b82f6', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
          {activeFirm.legal_name}
        </span>
      </div>

      {/* Horizontal Multi-Module Tab Bar */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '16px' }}>
        <button onClick={() => setActiveTab('inventory')} style={navBtnStyle(activeTab === 'inventory')}>📦 Inventory Master</button>
        <button onClick={() => setActiveTab('brick_production')} style={navBtnStyle(activeTab === 'brick_production')}>🧱 Brick Kiln Mud/Production</button>
        <button onClick={() => setActiveTab('create_invoice')} style={navBtnStyle(activeTab === 'create_invoice')}>🧾 Sales Bill</button>
        <button onClick={() => setActiveTab('purchase_entry')} style={navBtnStyle(activeTab === 'purchase_entry')}>🛍️ Purchase Inward</button>
        <button onClick={() => setActiveTab('vouchers')} style={navBtnStyle(activeTab === 'vouchers')}>📒 Voucher Posting</button>
        <button onClick={() => setActiveTab('daybook')} style={navBtnStyle(activeTab === 'daybook')}>📖 Day Book</button>
        <button onClick={() => setActiveTab('statement')} style={navBtnStyle(activeTab === 'statement')}>📊 Account Milan</button>
        <button onClick={() => setActiveTab('financials')} style={navBtnStyle(activeTab === 'financials')}>⚖️ Financial Reports</button>
      </div>

      {/* Active Module Container */}
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {activeTab === 'inventory' && <InventoryStockView firm={activeFirm} />}
        {activeTab === 'brick_production' && <BrickKilnProductionView firm={activeFirm} />}
        {activeTab === 'create_invoice' && <CreateInvoice firm={activeFirm} />}
        {activeTab === 'purchase_entry' && <PurchaseStockEntryForm firm={activeFirm} />}
        {activeTab === 'vouchers' && <VoucherEntryForm firm={activeFirm} />}
        {activeTab === 'daybook' && <JournalRegisterView firm={activeFirm} />}
        {activeTab === 'statement' && <AccountStatementView firm={activeFirm} />}
        {activeTab === 'financials' && <FinancialReportsView firm={activeFirm} />}
      </div>

    </div>
  );
}

const navBtnStyle = (isActive) => ({
  backgroundColor: isActive ? '#0f172a' : '#ffffff',
  color: isActive ? '#ffffff' : '#334155',
  border: '1px solid #cbd5e1',
  padding: '8px 14px',
  borderRadius: '6px',
  fontWeight: 'bold',
  fontSize: '11px',
  whiteSpace: 'nowrap',
  cursor: 'pointer'
});
