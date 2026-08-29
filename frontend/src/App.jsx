// frontend/src/App.jsx

import React, { useState } from 'react';

// Import All Core Application Views
import AccountStatementView from './components/AccountStatementView.jsx';
import CreateInvoice from './components/CreateInvoice.jsx';
import VoucherEntryForm from './components/VoucherEntryForm.jsx';
import CreateFirmForm from './components/CreateFirmForm.jsx';
import BillSettlementView from './components/BillSettlementView.jsx';
import FinancialReportsView from './components/FinancialReportsView.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('statement');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  const [activeFirm, setActiveFirm] = useState(() => {
    try {
      const saved = localStorage.getItem('active_firm_profile');
      return saved ? JSON.parse(saved) : { legal_name: 'My Business Firm', gstin: '' };
    } catch (e) {
      return { legal_name: 'My Business Firm', gstin: '' };
    }
  });

  // Direct Tab Switcher with Instant Drawer Dismissal
  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setIsMenuOpen(false); // Force close drawer on touch
  };

  const handleFirmCreated = (firmData) => {
    localStorage.setItem('active_firm_profile', JSON.stringify(firmData));
    setActiveFirm(firmData);
    setActiveTab('statement');
    setIsMenuOpen(false);
  };

  const handlePurgeData = () => {
    if (confirmInput.trim() !== 'DELETE MY DATA') {
      return alert('Incorrect confirmation string! Type "DELETE MY DATA".');
    }
    localStorage.clear();
    setActiveFirm({ legal_name: 'My Business Firm', gstin: '' });
    setActiveTab('firm_setup');
    setIsResetModalOpen(false);
    setConfirmInput('');
    alert('System Reset Completed Successfully.');
  };

  const menuItems = [
    { id: 'statement', label: 'Account Milan', icon: '📖' },
    { id: 'billing', label: 'Sales Billing', icon: '🧾' },
    { id: 'voucher', label: 'Voucher Entry', icon: '📒' },
    { id: 'settlement', label: 'Bill Settlement', icon: '💳' },
    { id: 'reports', label: 'Financial Reports', icon: '📊' },
    { id: 'firm_setup', label: 'Firm Profile Setup', icon: '⚙️' }
  ];

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      
      {/* 1. Top Header */}
      <header style={{
        backgroundColor: '#0f172a',
        color: '#ffffff',
        height: '60px',
        padding: '0 16px',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>📘</span>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 'bold' }}>{activeFirm?.legal_name || 'My Business Firm'}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
              {activeFirm?.gstin ? `GSTIN: ${activeFirm.gstin}` : 'Active Workspace'}
            </div>
          </div>
        </div>

        {/* Mobile Hamburger Button */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{
            backgroundColor: '#1e293b',
            color: '#fff',
            border: '1px solid #334155',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          {isMenuOpen ? '✕ Close' : '☰ Menu'}
        </button>
      </header>

      {/* 2. Mobile Drawer Backdrop */}
      {isMenuOpen && (
        <div 
          onClick={() => setIsMenuOpen(false)}
          style={{
            position: 'fixed',
            top: '60px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            zIndex: 1100
          }}
        />
      )}

      {/* 3. Sliding Side Navigation Menu */}
      <div style={{
        position: 'fixed',
        top: '60px',
        left: isMenuOpen ? '0' : '-280px',
        bottom: 0,
        width: '270px',
        backgroundColor: '#0f172a',
        zIndex: 1200,
        transition: 'left 0.25s ease-in-out',
        padding: '16px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 12px rgba(0,0,0,0.3)'
      }}>
        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', marginBottom: '12px' }}>
          MAIN NAVIGATION
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === item.id ? '#2563eb' : '#1e293b',
                color: '#ffffff',
                fontWeight: activeTab === item.id ? 'bold' : 'normal',
                fontSize: '14px',
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #1e293b' }}>
          <button
            onClick={() => { setIsMenuOpen(false); setIsResetModalOpen(true); }}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#334155',
              color: '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🔒 Security & Data Reset Settings
          </button>
        </div>
      </div>

      {/* 4. Active Workspace Screen Area */}
      <main style={{ padding: '16px', maxWidth: '1000px', margin: '0 auto' }}>
        {activeTab === 'statement' && <AccountStatementView firm={activeFirm} />}
        {activeTab === 'billing' && <CreateInvoice firm={activeFirm} />}
        {activeTab === 'voucher' && <VoucherEntryForm firm={activeFirm} />}
        {activeTab === 'settlement' && <BillSettlementView firm={activeFirm} />}
        {activeTab === 'reports' && <FinancialReportsView firm={activeFirm} />}
        {activeTab === 'firm_setup' && <CreateFirmForm onFirmCreated={handleFirmCreated} />}
      </main>

      {/* 5. Data Reset Modal */}
      {isResetModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          justify: 'center',
          alignItems: 'center',
          zIndex: 2000
        }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ color: '#dc2626', margin: '0 0 10px 0' }}>⚠️ Data Reset Guard</h3>
            <p style={{ fontSize: '12px', color: '#475569' }}>
              Confirm karne ke liye "<strong>DELETE MY DATA</strong>" type karein:
            </p>
            <input 
              type="text" 
              value={confirmInput} 
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="DELETE MY DATA"
              style={{ width: '100%', padding: '10px', border: '2px solid #ef4444', borderRadius: '6px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button onClick={() => setIsResetModalOpen(false)} style={{ padding: '8px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f1f5f9' }}>Cancel</button>
              <button 
                onClick={handlePurgeData}
                disabled={confirmInput.trim() !== 'DELETE MY DATA'}
                style={{
                  padding: '8px 14px',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: confirmInput.trim() === 'DELETE MY DATA' ? '#dc2626' : '#cbd5e1'
                }}
              >
                Purge All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
