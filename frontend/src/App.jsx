import React, { useState } from 'react';
import InventoryStockView from './components/InventoryStockView.jsx';
import CreateInvoice from './components/CreateInvoice.jsx';
import PurchaseStockEntryForm from './components/PurchaseStockEntryForm.jsx';
import VoucherEntryForm from './components/VoucherEntryForm.jsx';
import AccountStatementView from './components/AccountStatementView.jsx';
import JournalRegisterView from './components/JournalRegisterView.jsx';
import FinancialReportsView from './components/FinancialReportsView.jsx';

export default function App() {
  const [activeModule, setActiveModule] = useState(null);
  const [activeFirm] = useState({ 
    id: 'FIRM-001', 
    legal_name: 'Aa (BRICK_KILN)', 
    business_type: 'BRICK_KILN' 
  });

  const menuItems = [
    { id: 'dashboard', label: '📊 1. Firm Dashboard & Overview' },
    { id: 'profile', label: '⚙️ 2. Firm Profile Settings' },
    { id: 'account_head', label: '➕ 3. Create Account Head' },
    { id: 'inventory', label: '📦 4. Inventory & Stock Master' },
    { id: 'sales', label: '🧾 5. Sales Billing & Invoicing' },
    { id: 'purchase', label: '🛍️ 6. Purchase Entry & Inward Stock' },
    { id: 'vouchers', label: '📒 7. Voucher Entry (JV/PV/RV)' },
    { id: 'brick_production', label: '🧱 8. Brick Production / Nikasi' },
    { id: 'settlement', label: '💳 9. Bill Settlement (FIFO)' },
    { id: 'statement', label: '📖 10. Account Milan & Ledger' },
    { id: 'journal', label: '📝 11. General Journal Register' },
    { id: 'financials', label: '📈 12. Financial Reports (P&L / BS)' },
    { id: 'backup', label: '🔒 13. Data Backup & Protection' },
    { id: 'clear_data', label: '🗑️ 14. Clear Demo Data' }
  ];

  return (
    <div style={{ backgroundColor: '#0b132b', minHeight: '100vh', padding: '16px', color: '#ffffff', fontFamily: 'sans-serif' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #1c2541', paddingBottom: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#ffffff' }}>📘 Account Book Smart Manager</h3>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Firm: {activeFirm.legal_name}</span>
        </div>
        {activeModule && (
          <button 
            onClick={() => setActiveModule(null)} 
            style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
          >
            ⬅️ Back to Menu
          </button>
        )}
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        {!activeModule ? (
          /* Dark Vertical Workflow Menu */
          <div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.5px', color: '#94a3b8', marginBottom: '14px', textAlign: 'left' }}>
              ACCOUNTING WORKFLOW MENU
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id)}
                  style={{
                    backgroundColor: '#1c2541',
                    color: '#ffffff',
                    border: '1px solid #3a506b',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between'
                  }}
                >
                  <span>{item.label}</span>
                  <span style={{ fontSize: '14px', color: '#64748b' }}>➔</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Module Render Container */
          <div style={{ backgroundColor: '#ffffff', color: '#0f172a', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            {activeModule === 'inventory' && <InventoryStockView firm={activeFirm} />}
            {activeModule === 'sales' && <CreateInvoice firm={activeFirm} />}
            {activeModule === 'purchase' && <PurchaseStockEntryForm firm={activeFirm} />}
            {activeModule === 'vouchers' && <VoucherEntryForm firm={activeFirm} />}
            {activeModule === 'statement' && <AccountStatementView firm={activeFirm} />}
            {activeModule === 'journal' && <JournalRegisterView firm={activeFirm} />}
            {activeModule === 'financials' && <FinancialReportsView firm={activeFirm} />}
            {['dashboard', 'profile', 'account_head', 'brick_production', 'settlement', 'backup', 'clear_data'].includes(activeModule) && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                <h4>Module Active</h4>
                <p style={{ fontSize: '12px' }}>This section is operational under {activeFirm.legal_name}.</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
