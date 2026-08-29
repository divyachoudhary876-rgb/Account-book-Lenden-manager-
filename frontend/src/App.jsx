import React, { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [receiptAmount, setReceiptAmount] = useState(20000);
  
  // State for Bill-by-Bill Settlement
  const [pendingBills, setPendingBills] = useState([
    { id: 'INV-2026-001', party: 'Shree Ram Bricks', total: 50000, pending: 20000, allocated: 20000 },
    { id: 'INV-2026-002', party: 'Jaipur BioFuels', total: 35000, pending: 15000, allocated: 0 },
  ]);

  // State for Voucher Entry Form
  const [voucher, setVoucher] = useState({ type: 'RECEIPT', party: '', amount: '', narration: '' });

  const totalAllocated = pendingBills.reduce((sum, item) => sum + (parseFloat(item.allocated) || 0), 0);

  const handleAllocation = (id, value) => {
    const amt = parseFloat(value) || 0;
    setPendingBills(prev => prev.map(bill => bill.id === id ? { ...bill, allocated: amt } : bill));
  };

  return (
    <div style={styles.appContainer}>
      {/* Brand Header */}
      <header style={styles.header}>
        <div>
          <h2 style={styles.brand}>Neelkanth Groups ERP</h2>
          <span style={styles.subBrand}>Brick Kiln & Biomass Briquettes</span>
        </div>
        <div style={styles.liveTag}>System Online</div>
      </header>

      {/* Navigation Bar */}
      <div style={styles.tabBar}>
        <button 
          onClick={() => setActiveTab('dashboard')} 
          style={activeTab === 'dashboard' ? styles.activeTabBtn : styles.tabBtn}
        >
          📊 Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('settlement')} 
          style={activeTab === 'settlement' ? styles.activeTabBtn : styles.tabBtn}
        >
          💳 Settlement
        </button>
        <button 
          onClick={() => setActiveTab('voucher')} 
          style={activeTab === 'voucher' ? styles.activeTabBtn : styles.tabBtn}
        >
          📝 Voucher
        </button>
        <button 
          onClick={() => setActiveTab('reports')} 
          style={activeTab === 'reports' ? styles.activeTabBtn : styles.tabBtn}
        >
          📈 Reports
        </button>
      </div>

      {/* View 1: Dashboard */}
      {activeTab === 'dashboard' && (
        <div style={styles.contentArea}>
          <div style={styles.cardMain}>
            <span style={styles.cardTitle}>TOTAL OUTSTANDING RECEIVABLES</span>
            <h1 style={styles.amountText}>₹ 1,93,250.00</h1>
          </div>

          <div style={styles.grid2}>
            <div style={{ ...styles.cardMini, borderLeft: '4px solid #10b981' }}>
              <small style={{ color: '#64748b' }}>Cash/Bank Balance</small>
              <h3 style={{ margin: '4px 0 0 0', color: '#0f172a' }}>₹ 84,500</h3>
            </div>
            <div style={{ ...styles.cardMini, borderLeft: '4px solid #f59e0b' }}>
              <small style={{ color: '#64748b' }}>Pending Invoices</small>
              <h3 style={{ margin: '4px 0 0 0', color: '#0f172a' }}>2 Bills</h3>
            </div>
          </div>

          <div style={styles.cardMain}>
            <h3 style={{ margin: '0 0 12px 0' }}>Quick Accounting Tasks</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setActiveTab('settlement')} style={styles.btnPrimary}>
                + Record Settlement
              </button>
              <button onClick={() => setActiveTab('voucher')} style={styles.btnSecondary}>
                + Voucher Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Bill Settlement */}
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
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Invoice Knock-off Allocation</h3>
            {pendingBills.map(bill => (
              <div key={bill.id} style={styles.billBox}>
                <div style={styles.billFlex}>
                  <strong>{bill.id} - {bill.party}</strong>
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Pending: ₹{bill.pending}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', margin: '4px 0' }}>Total Bill: ₹{bill.total}</div>
                <input 
                  type="number" 
                  placeholder="Settlement Amount"
                  value={bill.allocated || ''}
                  onChange={(e) => handleAllocation(bill.id, e.target.value)}
                  style={styles.inputSmall}
                />
              </div>
            ))}

            <div style={styles.summaryRow}>
              <span>Total Allocated:</span>
              <span style={{ color: totalAllocated > receiptAmount ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                ₹{totalAllocated} / ₹{receiptAmount}
              </span>
            </div>

            <button 
              disabled={totalAllocated === 0 || totalAllocated > receiptAmount}
              onClick={() => alert('Receipt Voucher Posted & Ledgers Reconciled!')}
              style={totalAllocated === 0 || totalAllocated > receiptAmount ? styles.btnDisabled : styles.btnSuccess}
            >
              Post Receipt Voucher
            </button>
          </div>
        </div>
      )}

      {/* View 3: Voucher Entry */}
      {activeTab === 'voucher' && (
        <div style={styles.contentArea}>
          <div style={styles.cardMain}>
            <h3 style={{ margin: '0 0 12px 0' }}>New Journal / Payment Voucher</h3>
            
            <label style={styles.label}>Voucher Type</label>
            <select 
              value={voucher.type} 
              onChange={(e) => setVoucher({ ...voucher, type: e.target.value })}
              style={styles.input}
            >
              <option value="RECEIPT">Receipt Voucher</option>
              <option value="PAYMENT">Payment Voucher</option>
              <option value="SALES">Sales Invoice</option>
              <option value="JOURNAL">Journal Entry</option>
            </select>

            <label style={{ ...styles.label, marginTop: '12px' }}>Party / Account Head</label>
            <input 
              type="text" 
              placeholder="e.g. Shree Ram Bricks"
              value={voucher.party}
              onChange={(e) => setVoucher({ ...voucher, party: e.target.value })}
              style={styles.input}
            />

            <label style={{ ...styles.label, marginTop: '12px' }}>Amount (₹)</label>
            <input 
              type="number" 
              placeholder="0.00"
              value={voucher.amount}
              onChange={(e) => setVoucher({ ...voucher, amount: e.target.value })}
              style={styles.input}
            />

            <button 
              onClick={() => { alert('Voucher Created Successfully!'); setVoucher({ type: 'RECEIPT', party: '', amount: '', narration: '' }); }}
              style={styles.btnSuccess}
            >
              Save Voucher
            </button>
          </div>
        </div>
      )}

      {/* View 4: Financial Reports & Compliance */}
      {activeTab === 'reports' && (
        <div style={styles.contentArea}>
          <div style={styles.cardMain}>
            <h3 style={{ margin: '0 0 12px 0' }}>GST & Financial Statements</h3>
            <div style={styles.reportRow}>
              <span>GSTR-1 Sales Report</span>
              <button style={styles.btnSmall} onClick={() => alert('Generating GSTR-1 JSON...')}>Export</button>
            </div>
            <div style={styles.reportRow}>
              <span>Profit & Loss Statement</span>
              <button style={styles.btnSmall} onClick={() => alert('Opening P&L Statement...')}>View</button>
            </div>
            <div style={styles.reportRow}>
              <span>Balance Sheet (Double-Entry)</span>
              <button style={styles.btnSmall} onClick={() => alert('Opening Balance Sheet...')}>View</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  appContainer: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', padding: '16px', boxSizing: 'border-box' },
  header: { backgroundColor: '#0f172a', color: '#fff', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  brand: { margin: 0, fontSize: '18px' },
  subBrand: { fontSize: '12px', color: '#94a3b8' },
  liveTag: { backgroundColor: '#10b981', color: '#fff', fontSize: '10px', padding: '4px 8px', borderRadius: '10px', fontWeight: 'bold' },
  tabBar: { display: 'flex', gap: '4px', marginBottom: '16px', overflowX: 'auto' },
  tabBtn: { flex: 1, padding: '10px 8px', border: 'none', backgroundColor: '#e2e8f0', color: '#334155', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' },
  activeTabBtn: { flex: 1, padding: '10px 8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' },
  contentArea: { display: 'flex', flexDirection: 'column', gap: '16px' },
  cardMain: { backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  cardTitle: { color: '#64748b', fontSize: '11px', fontWeight: 'bold' },
  amountText: { margin: '8px 0 0 0', color: '#0f172a', fontSize: '26px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  cardMini: { backgroundColor: '#fff', padding: '12px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  btnPrimary: { flex: 1, backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  btnSecondary: { flex: 1, backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  btnSuccess: { width: '100%', backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '12px' },
  btnDisabled: { width: '100%', backgroundColor: '#cbd5e1', color: '#64748b', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', marginTop: '12px' },
  btnSmall: { backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' },
  label: { display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' },
  input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '16px', boxSizing: 'border-box' },
  inputSmall: { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '6px', boxSizing: 'border-box' },
  billBox: { borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '12px' },
  billFlex: { display: 'flex', justifyContent: 'space-between', fontSize: '14px' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', marginTop: '12px', borderTop: '2px solid #f1f5f9', paddingTop: '8px' },
  reportRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }
};
