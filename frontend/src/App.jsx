import React, { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedOrg, setSelectedOrg] = useState('Neelkanth Bricks');
  const [receiptAmount, setReceiptAmount] = useState(20000);
  
  const [pendingBills, setPendingBills] = useState([
    { id: 'INV-2026-001', party: 'Shree Ram Bricks', total: 50000, pending: 20000, allocated: 20000 },
    { id: 'INV-2026-002', party: 'Jaipur BioFuels', total: 35000, pending: 15000, allocated: 0 },
  ]);

  const totalAllocated = pendingBills.reduce((sum, item) => sum + (parseFloat(item.allocated) || 0), 0);

  const handleAllocation = (id, value) => {
    const amt = parseFloat(value) || 0;
    setPendingBills(prev => prev.map(bill => bill.id === id ? { ...bill, allocated: amt } : bill));
  };

  return (
    <div style={styles.appContainer}>
      {/* Top Fixed Header with Business Context */}
      <header style={styles.header}>
        <div>
          <select 
            value={selectedOrg} 
            onChange={(e) => setSelectedOrg(e.target.value)}
            style={styles.orgDropdown}
          >
            <option value="Neelkanth Bricks">Neelkanth Bricks (Kiln)</option>
            <option value="Neelkanth Briquettes">Neelkanth Biomass</option>
          </select>
          <span style={styles.fyBadge}>FY 2026-27</span>
        </div>
        <div style={styles.liveTag}>Live ERP</div>
      </header>

      {/* Main Content Area */}
      <div style={styles.scrollableContent}>
        {activeTab === 'dashboard' && (
          <div style={styles.contentArea}>
            <div style={styles.cardMain}>
              <span style={styles.cardTitle}>TOTAL OUTSTANDING RECEIVABLES</span>
              <h1 style={styles.amountText}>₹ 1,93,250.00</h1>
              <small style={{ color: '#2563eb', fontWeight: 'bold', cursor: 'pointer' }}>View Aging Breakdown →</small>
            </div>

            <div style={styles.grid2}>
              <div style={{ ...styles.cardMini, borderLeft: '4px solid #10b981' }}>
                <small style={{ color: '#64748b' }}>Cash/Bank Balance</small>
                <h3 style={{ margin: '4px 0 0 0', color: '#0f172a' }}>₹ 84,500</h3>
              </div>
              <div 
                style={{ ...styles.cardMini, borderLeft: '4px solid #f59e0b', cursor: 'pointer' }}
                onClick={() => setActiveTab('settlement')}
              >
                <small style={{ color: '#64748b' }}>Pending Invoices</small>
                <h3 style={{ margin: '4px 0 0 0', color: '#0f172a' }}>2 Bills (Unpaid)</h3>
              </div>
            </div>

            <div style={styles.cardMain}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>Quick Actions</h3>
              <div style={styles.actionGrid}>
                <button onClick={() => setActiveTab('settlement')} style={styles.btnPrimary}>
                  + Record Settlement
                </button>
                <button onClick={() => setActiveTab('voucher')} style={styles.btnDark}>
                  + Voucher Entry
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settlement' && (
          <div style={styles.contentArea}>
            <div style={styles.cardMain}>
              <label style={styles.label}>Received Payment Amount (₹)</label>
              <input 
                type="number" 
                value={receiptAmount} 
                onChange={(e) => setReceiptAmount(parseFloat(e.target.value) || 0)}
                style={styles.input}
              />
            </div>

            <div style={styles.cardMain}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>Bill Knock-off Allocation</h3>
              {pendingBills.map(bill => (
                <div key={bill.id} style={styles.billBox}>
                  <div style={styles.billFlex}>
                    <strong>{bill.id} - {bill.party}</strong>
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>₹{bill.pending}</span>
                  </div>
                  <input 
                    type="number" 
                    placeholder="Allocate Amount"
                    value={bill.allocated || ''}
                    onChange={(e) => handleAllocation(bill.id, e.target.value)}
                    style={styles.inputSmall}
                  />
                </div>
              ))}

              <div style={styles.summaryRow}>
                <span>Allocated:</span>
                <span style={{ color: totalAllocated > receiptAmount ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                  ₹{totalAllocated} / ₹{receiptAmount}
                </span>
              </div>

              <button 
                disabled={totalAllocated === 0 || totalAllocated > receiptAmount}
                onClick={() => alert('Voucher Reconciled & Posted!')}
                style={totalAllocated === 0 || totalAllocated > receiptAmount ? styles.btnDisabled : styles.btnSuccess}
              >
                Post Receipt Voucher
              </button>
            </div>
          </div>
        )}

        {activeTab === 'voucher' && (
          <div style={styles.contentArea}>
            <div style={styles.cardMain}>
              <h3 style={{ margin: '0 0 12px 0' }}>New Journal Voucher</h3>
              <input type="text" placeholder="Party Name" style={styles.input} />
              <input type="number" placeholder="Amount (₹)" style={{ ...styles.input, marginTop: '10px' }} />
              <button style={{ ...styles.btnSuccess, marginTop: '12px' }}>Save Voucher</button>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div style={styles.contentArea}>
            <div style={styles.cardMain}>
              <h3 style={{ margin: '0 0 12px 0' }}>Financial Reports</h3>
              <p style={{ fontSize: '14px', color: '#64748b' }}>GSTR-1, P&L, Balance Sheet modules linked.</p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Navigation (Fixes Top Overflow Issue) */}
      <nav style={styles.bottomNav}>
        <button 
          onClick={() => setActiveTab('dashboard')} 
          style={activeTab === 'dashboard' ? styles.activeBottomTab : styles.bottomTab}
        >
          📊<br />Home
        </button>
        <button 
          onClick={() => setActiveTab('settlement')} 
          style={activeTab === 'settlement' ? styles.activeBottomTab : styles.bottomTab}
        >
          💳<br />Settlement
        </button>
        <button 
          onClick={() => setActiveTab('voucher')} 
          style={activeTab === 'voucher' ? styles.activeBottomTab : styles.bottomTab}
        >
          📝<br />Voucher
        </button>
        <button 
          onClick={() => setActiveTab('reports')} 
          style={activeTab === 'reports' ? styles.activeBottomTab : styles.bottomTab}
        >
          📈<br />Reports
        </button>
      </nav>
    </div>
  );
}

const styles = {
  appContainer: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f8fafc', height: '100vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  header: { backgroundColor: '#0f172a', color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  orgDropdown: { backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '6px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold' },
  fyBadge: { display: 'block', fontSize: '10px', color: '#94a3b8', marginTop: '2px' },
  liveTag: { backgroundColor: '#10b981', color: '#fff', fontSize: '10px', padding: '4px 8px', borderRadius: '10px', fontWeight: 'bold' },
  scrollableContent: { flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '80px' },
  contentArea: { display: 'flex', flexDirection: 'column', gap: '16px' },
  cardMain: { backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  cardTitle: { color: '#64748b', fontSize: '11px', fontWeight: 'bold' },
  amountText: { margin: '8px 0 4px 0', color: '#0f172a', fontSize: '26px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  cardMini: { backgroundColor: '#fff', padding: '12px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  actionGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  btnPrimary: { backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  btnDark: { backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  btnSuccess: { width: '100%', backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '12px' },
  btnDisabled: { width: '100%', backgroundColor: '#cbd5e1', color: '#64748b', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', marginTop: '12px' },
  label: { display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '6px' },
  input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px', boxSizing: 'border-box' },
  inputSmall: { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '6px', boxSizing: 'border-box' },
  billBox: { borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '10px' },
  billFlex: { display: 'flex', justifyContent: 'space-between', fontSize: '13px' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', marginTop: '10px', borderTop: '2px solid #f1f5f9', paddingTop: '8px' },
  bottomNav: { position: 'fixed', bottom: 0, left: 0, right: 0, height: '60px', backgroundColor: '#fff', display: 'flex', borderTop: '1px solid #e2e8f0', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' },
  bottomTab: { flex: 1, border: 'none', backgroundColor: 'transparent', color: '#64748b', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  activeBottomTab: { flex: 1, border: 'none', backgroundColor: 'transparent', color: '#2563eb', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }
};
