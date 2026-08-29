import React, { useState, useEffect } from 'react';

export default function App() {
  // 1. Dynamic Persistent State (No Hardcoded Initial Data)
  const [firms, setFirms] = useState(() => {
    const saved = localStorage.getItem('erp_firms');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeFirmId, setActiveFirmId] = useState(() => {
    return localStorage.getItem('erp_active_firm_id') || '';
  });

  const [invoices, setInvoices] = useState(() => {
    const saved = localStorage.getItem('erp_invoices');
    return saved ? JSON.parse(saved) : [];
  });

  const [vouchers, setVouchers] = useState(() => {
    const saved = localStorage.getItem('erp_vouchers');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState('dashboard');

  // Input Forms States
  const [newFirm, setNewFirm] = useState({ firm_name: '', business_type: 'BRICK_KILN', gstin: '' });
  const [newInvoice, setNewInvoice] = useState({ party: '', amount: '', date: new Date().toISOString().split('T')[0] });
  const [settlement, setSettlement] = useState({ party: '', amount: '', date: new Date().toISOString().split('T')[0] });
  
  // Double-Entry Voucher Input State
  const [journalVoucher, setJournalVoucher] = useState({
    date: new Date().toISOString().split('T')[0],
    voucher_type: 'RECEIPT',
    debit_account: '',
    credit_account: '',
    amount: '',
    narration: ''
  });

  // Sync LocalStorage
  useEffect(() => {
    localStorage.getItem('erp_firms', JSON.stringify(firms));
    localStorage.setItem('erp_firms', JSON.stringify(firms));
  }, [firms]);

  useEffect(() => {
    localStorage.setItem('erp_active_firm_id', activeFirmId);
  }, [activeFirmId]);

  useEffect(() => {
    localStorage.setItem('erp_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('erp_vouchers', JSON.stringify(vouchers));
  }, [vouchers]);

  // Current Active Firm Context
  const activeFirm = firms.find(f => f.id === activeFirmId);
  const currentInvoices = invoices.filter(inv => inv.firmId === activeFirmId);
  const currentVouchers = vouchers.filter(vch => vch.firmId === activeFirmId);

  // Metrics
  const totalReceivables = currentInvoices.reduce((sum, inv) => sum + inv.pending, 0);

  // --- Handlers ---
  const handleCreateFirm = (e) => {
    e.preventDefault();
    if (!newFirm.firm_name) return alert('Kripya Firm Name darj karein!');

    const firmObj = {
      id: `FIRM-${Date.now()}`,
      ...newFirm,
      created_at: new Date().toISOString().split('T')[0]
    };

    setFirms([...firms, firmObj]);
    setActiveFirmId(firmObj.id);
    setNewFirm({ firm_name: '', business_type: 'BRICK_KILN', gstin: '' });
    alert(`Firm "${firmObj.firm_name}" Safaltapurvak Ban Gayi!`);
    setActiveTab('dashboard');
  };

  const handleCreateInvoice = (e) => {
    e.preventDefault();
    if (!activeFirmId) return alert('Pehle Firm Select / Create Karein!');
    if (!newInvoice.party || !newInvoice.amount) return alert('Party Name aur Amount mandatory hain!');

    const amt = parseFloat(newInvoice.amount);
    const invObj = {
      id: `INV-${Date.now().toString().slice(-4)}`,
      firmId: activeFirmId,
      party: newInvoice.party,
      total: amt,
      pending: amt,
      date: newInvoice.date
    };

    setInvoices([invObj, ...invoices]);
    setNewInvoice({ party: '', amount: '', date: new Date().toISOString().split('T')[0] });
    alert('Invoice Create Ho Gaya!');
    setActiveTab('dashboard');
  };

  const handleSettlement = (e) => {
    e.preventDefault();
    if (!activeFirmId) return alert('Pehle Firm Select Karein!');
    if (!settlement.party || !settlement.amount) return alert('Settlement details darj karein!');

    let payAmt = parseFloat(settlement.amount);
    let matched = false;

    const updatedInvoices = invoices.map(inv => {
      if (inv.firmId === activeFirmId && inv.party.toLowerCase().includes(settlement.party.toLowerCase()) && inv.pending > 0 && payAmt > 0) {
        const deduct = Math.min(inv.pending, payAmt);
        payAmt -= deduct;
        matched = true;
        return { ...inv, pending: inv.pending - deduct };
      }
      return inv;
    });

    if (!matched) return alert('Is party ka koi pending invoice nahi mila!');

    setInvoices(updatedInvoices);
    setSettlement({ party: '', amount: '', date: new Date().toISOString().split('T')[0] });
    alert('Payment Settle Ho Gaya!');
    setActiveTab('dashboard');
  };

  const handlePostJournalVoucher = (e) => {
    e.preventDefault();
    if (!activeFirmId) return alert('Pehle Firm Select Karein!');
    if (!journalVoucher.debit_account || !journalVoucher.credit_account || !journalVoucher.amount) {
      return alert('Double-Entry Rules: Debit Account, Credit Account, aur Amount mandatory hain!');
    }

    if (journalVoucher.debit_account === journalVoucher.credit_account) {
      return alert('Accounting Error: Debit aur Credit account same nahi ho sakte!');
    }

    const vchObj = {
      id: `VCH-${Date.now().toString().slice(-4)}`,
      firmId: activeFirmId,
      date: journalVoucher.date,
      type: journalVoucher.voucher_type,
      debit_account: journalVoucher.debit_account,
      credit_account: journalVoucher.credit_account,
      amount: parseFloat(journalVoucher.amount),
      narration: journalVoucher.narration
    };

    setVouchers([vchObj, ...vouchers]);
    setJournalVoucher({
      date: new Date().toISOString().split('T')[0],
      voucher_type: 'RECEIPT',
      debit_account: '',
      credit_account: '',
      amount: '',
      narration: ''
    });
    alert('Double-Entry Voucher Successfully Posted!');
    setActiveTab('dashboard');
  };

  return (
    <div style={styles.appContainer}>
      {/* Top Firm Switcher Bar */}
      <header style={styles.header}>
        {firms.length > 0 ? (
          <div>
            <select 
              value={activeFirmId} 
              onChange={(e) => setActiveFirmId(e.target.value)}
              style={styles.orgDropdown}
            >
              {firms.map(f => (
                <option key={f.id} value={f.id}>{f.firm_name}</option>
              ))}
            </select>
            <span style={styles.fyBadge}>{activeFirm?.business_type} | FY 2026-27</span>
          </div>
        ) : (
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Business Book ERP</div>
        )}
        <button onClick={() => setActiveTab('add_firm')} style={styles.btnSmallHeader}>
          + New Firm
        </button>
      </header>

      {/* Main View Area */}
      <div style={styles.scrollableContent}>

        {/* SCREEN 0: CREATE NEW FIRM */}
        {(activeTab === 'add_firm' || firms.length === 0) && (
          <div style={styles.contentArea}>
            <div style={styles.cardMain}>
              <h3 style={{ margin: '0 0 12px 0' }}>🏬 Nayi Firm Banayein</h3>
              <form onSubmit={handleCreateFirm}>
                <label style={styles.label}>Firm / Company Name *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Neelkanth Enterprises"
                  value={newFirm.firm_name} 
                  onChange={(e) => setNewFirm({ ...newFirm, firm_name: e.target.value })}
                  style={styles.input} 
                />

                <label style={{ ...styles.label, marginTop: '12px' }}>Business Type</label>
                <select 
                  value={newFirm.business_type} 
                  onChange={(e) => setNewFirm({ ...newFirm, business_type: e.target.value })}
                  style={styles.input}
                >
                  <option value="BRICK_KILN">Brick Kiln (Eet Bhatta)</option>
                  <option value="BIOMASS_BRIQUETTES">Biomass Briquettes (BioFuel)</option>
                  <option value="GENERAL_TRADING">General Trading & Manufacturing</option>
                </select>

                <label style={{ ...styles.label, marginTop: '12px' }}>GSTIN (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. 08AAAAA0000A1Z5"
                  value={newFirm.gstin} 
                  onChange={(e) => setNewFirm({ ...newFirm, gstin: e.target.value })}
                  style={styles.input} 
                />

                <button type="submit" style={styles.btnSuccess}>
                  Create Firm & Start ERP
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SCREEN 1: DASHBOARD */}
        {activeTab === 'dashboard' && firms.length > 0 && (
          <div style={styles.contentArea}>
            <div style={styles.cardMain}>
              <span style={styles.cardTitle}>OUTSTANDING RECEIVABLES ({activeFirm?.firm_name})</span>
              <h1 style={styles.amountText}>₹ {totalReceivables.toLocaleString('en-IN')}.00</h1>
            </div>

            <div style={styles.cardMain}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>Pending Invoices</h3>
              {currentInvoices.filter(i => i.pending > 0).length === 0 ? (
                <p style={{ color: '#10b981', fontWeight: 'bold' }}>Koi Pending Bill Nahi Hai! 🎉</p>
              ) : (
                currentInvoices.filter(i => i.pending > 0).map(inv => (
                  <div key={inv.id} style={styles.billBox}>
                    <div style={styles.billFlex}>
                      <strong>{inv.id} - {inv.party}</strong>
                      <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Pending: ₹{inv.pending}</span>
                    </div>
                    <small style={{ color: '#64748b' }}>Date: {inv.date} | Total Bill: ₹{inv.total}</small>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SCREEN 2: ADD SALES INVOICE */}
        {activeTab === 'create_invoice' && firms.length > 0 && (
          <div style={styles.contentArea}>
            <div style={styles.cardMain}>
              <h3 style={{ margin: '0 0 12px 0' }}>📄 Sales Invoice Entry</h3>
              <form onSubmit={handleCreateInvoice}>
                <label style={styles.label}>Invoice Date</label>
                <input 
                  type="date" 
                  value={newInvoice.date} 
                  onChange={(e) => setNewInvoice({ ...newInvoice, date: e.target.value })}
                  style={styles.input} 
                />

                <label style={{ ...styles.label, marginTop: '12px' }}>Customer / Party Name *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Shree Ram Traders"
                  value={newInvoice.party} 
                  onChange={(e) => setNewInvoice({ ...newInvoice, party: e.target.value })}
                  style={styles.input} 
                />

                <label style={{ ...styles.label, marginTop: '12px' }}>Total Amount (₹) *</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  value={newInvoice.amount} 
                  onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                  style={styles.input} 
                />

                <button type="submit" style={styles.btnSuccess}>
                  Post Sales Invoice
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SCREEN 3: DOUBLE-ENTRY VOUCHER ENTRY WITH DATE */}
        {activeTab === 'voucher' && firms.length > 0 && (
          <div style={styles.contentArea}>
            <div style={styles.cardMain}>
              <h3 style={{ margin: '0 0 12px 0' }}>📝 Double-Entry Journal Voucher</h3>
              <form onSubmit={handlePostJournalVoucher}>
                <label style={styles.label}>Voucher Transaction Date *</label>
                <input 
                  type="date" 
                  value={journalVoucher.date} 
                  onChange={(e) => setJournalVoucher({ ...journalVoucher, date: e.target.value })}
                  style={styles.input} 
                />

                <label style={{ ...styles.label, marginTop: '12px' }}>Voucher Type</label>
                <select 
                  value={journalVoucher.voucher_type} 
                  onChange={(e) => setJournalVoucher({ ...journalVoucher, voucher_type: e.target.value })}
                  style={styles.input}
                >
                  <option value="RECEIPT">Receipt Voucher</option>
                  <option value="PAYMENT">Payment Voucher</option>
                  <option value="JOURNAL">Journal Entry</option>
                </select>

                <label style={{ ...styles.label, marginTop: '12px' }}>Debit Account (Dr) *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Cash Account / SBI Bank"
                  value={journalVoucher.debit_account} 
                  onChange={(e) => setJournalVoucher({ ...journalVoucher, debit_account: e.target.value })}
                  style={styles.input} 
                />

                <label style={{ ...styles.label, marginTop: '12px' }}>Credit Account (Cr) *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Customer Name / Sales Account"
                  value={journalVoucher.credit_account} 
                  onChange={(e) => setJournalVoucher({ ...journalVoucher, credit_account: e.target.value })}
                  style={styles.input} 
                />

                <label style={{ ...styles.label, marginTop: '12px' }}>Voucher Amount (₹) *</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  value={journalVoucher.amount} 
                  onChange={(e) => setJournalVoucher({ ...journalVoucher, amount: e.target.value })}
                  style={styles.input} 
                />

                <label style={{ ...styles.label, marginTop: '12px' }}>Narration / Remarks</label>
                <input 
                  type="text" 
                  placeholder="Being payment received against bill..."
                  value={journalVoucher.narration} 
                  onChange={(e) => setJournalVoucher({ ...journalVoucher, narration: e.target.value })}
                  style={styles.input} 
                />

                <button type="submit" style={styles.btnPrimary}>
                  Post Double-Entry Voucher
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SCREEN 4: PAYMENT SETTLEMENT */}
        {activeTab === 'settlement' && firms.length > 0 && (
          <div style={styles.contentArea}>
            <div style={styles.cardMain}>
              <h3 style={{ margin: '0 0 12px 0' }}>💳 Payment Knockoff Settlement</h3>
              <form onSubmit={handleSettlement}>
                <label style={styles.label}>Settlement Date</label>
                <input 
                  type="date" 
                  value={settlement.date} 
                  onChange={(e) => setSettlement({ ...settlement, date: e.target.value })}
                  style={styles.input} 
                />

                <label style={{ ...styles.label, marginTop: '12px' }}>Customer / Party Name *</label>
                <input 
                  type="text" 
                  placeholder="Party Name"
                  value={settlement.party} 
                  onChange={(e) => setSettlement({ ...settlement, party: e.target.value })}
                  style={styles.input} 
                />

                <label style={{ ...styles.label, marginTop: '12px' }}>Received Amount (₹) *</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  value={settlement.amount} 
                  onChange={(e) => setSettlement({ ...settlement, amount: e.target.value })}
                  style={styles.input} 
                />

                <button type="submit" style={styles.btnPrimary}>
                  Settle & Adjust Invoice
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* Fixed Bottom Navigation */}
      {firms.length > 0 && (
        <nav style={styles.bottomNav}>
          <button 
            onClick={() => setActiveTab('dashboard')} 
            style={activeTab === 'dashboard' ? styles.activeBottomTab : styles.bottomTab}
          >
            📊<br />Home
          </button>
          <button 
            onClick={() => setActiveTab('create_invoice')} 
            style={activeTab === 'create_invoice' ? styles.activeBottomTab : styles.bottomTab}
          >
            📄<br />Add Bill
          </button>
          <button 
            onClick={() => setActiveTab('voucher')} 
            style={activeTab === 'voucher' ? styles.activeBottomTab : styles.bottomTab}
          >
            📝<br />Voucher
          </button>
          <button 
            onClick={() => setActiveTab('settlement')} 
            style={activeTab === 'settlement' ? styles.activeBottomTab : styles.bottomTab}
          >
            💳<br />Settlement
          </button>
        </nav>
      )}
    </div>
  );
}

const styles = {
  appContainer: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f8fafc', height: '100vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  header: { backgroundColor: '#0f172a', color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  orgDropdown: { backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' },
  fyBadge: { display: 'block', fontSize: '10px', color: '#94a3b8', marginTop: '2px' },
  btnSmallHeader: { backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  scrollableContent: { flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '80px' },
  contentArea: { display: 'flex', flexDirection: 'column', gap: '16px' },
  cardMain: { backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  cardTitle: { color: '#64748b', fontSize: '11px', fontWeight: 'bold' },
  amountText: { margin: '8px 0 4px 0', color: '#0f172a', fontSize: '26px' },
  btnPrimary: { width: '100%', backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '16px' },
  btnSuccess: { width: '100%', backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '16px' },
  label: { display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '6px' },
  input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px', boxSizing: 'border-box' },
  billBox: { borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '10px' },
  billFlex: { display: 'flex', justifyContent: 'space-between', fontSize: '13px' },
  bottomNav: { position: 'fixed', bottom: 0, left: 0, right: 0, height: '60px', backgroundColor: '#fff', display: 'flex', borderTop: '1px solid #e2e8f0', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' },
  bottomTab: { flex: 1, border: 'none', backgroundColor: 'transparent', color: '#64748b', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  activeBottomTab: { flex: 1, border: 'none', backgroundColor: 'transparent', color: '#2563eb', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }
};
