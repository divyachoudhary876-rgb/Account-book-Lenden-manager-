import React, { useState, useEffect } from 'react';

export default function App() {
  // Multi-Tenant & Account Masters State
  const [firms, setFirms] = useState(() => JSON.parse(localStorage.getItem('erp_firms')) || [
    { id: 'FIRM-101', firm_name: 'Neelkanth Bricks & Biomass Unit', business_type: 'BRICK_KILN', gstin: '08AAAAA0000A1Z5', address: 'Plot 42, Industrial Area, Jaipur, Rajasthan' }
  ]);
  const [activeFirmId, setActiveFirmId] = useState(() => localStorage.getItem('erp_active_firm') || 'FIRM-101');
  const [activeTab, setActiveTab] = useState('account_statement');

  // Chart of Accounts Master
  const [ledgers, setLedgers] = useState(() => JSON.parse(localStorage.getItem('erp_ledgers')) || [
    { id: 'LED-1', name: 'Cash Account', group: 'CASH', openingBal: 5000 },
    { id: 'LED-2', name: 'SBI Bank Account', group: 'BANK', openingBal: 50000 },
    { id: 'LED-3', name: 'Shree Ram Traders', group: 'SUNDRY_DEBTORS', gstin: '08BBBBB1111B1Z2', openingBal: 12000 },
    { id: 'LED-4', name: 'Jaipur BioFuels', group: 'SUNDRY_DEBTORS', gstin: '08CCCCC2222C1Z3', openingBal: 0 },
    { id: 'LED-5', name: 'Sales Account', group: 'SALES', openingBal: 0 },
  ]);

  const [invoices, setInvoices] = useState(() => JSON.parse(localStorage.getItem('erp_invoices')) || []);
  const [vouchers, setVouchers] = useState(() => JSON.parse(localStorage.getItem('erp_vouchers')) || []);

  // Filter States for Specific Account Statement
  const [selectedAccountId, setSelectedAccountId] = useState('LED-3');
  const [fromDate, setFromDate] = useState('2026-08-01');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  // Sync Persistence
  useEffect(() => {
    localStorage.setItem('erp_firms', JSON.stringify(firms));
    localStorage.setItem('erp_active_firm', activeFirmId);
    localStorage.setItem('erp_ledgers', JSON.stringify(ledgers));
    localStorage.setItem('erp_invoices', JSON.stringify(invoices));
    localStorage.setItem('erp_vouchers', JSON.stringify(vouchers));
  }, [firms, activeFirmId, ledgers, invoices, vouchers]);

  const activeFirm = firms.find(f => f.id === activeFirmId);
  const selectedAccount = ledgers.find(l => l.id === selectedAccountId);

  // --- Statement Generation Logic ---
  // 1. Collect all raw debit & credit entries for selected account
  const rawTransactions = [];

  // Invoices (Debit for Debtors)
  invoices.filter(i => i.firmId === activeFirmId && i.partyId === selectedAccountId).forEach(i => {
    rawTransactions.push({
      date: i.date,
      voucherNo: i.id,
      particulars: `Sales Invoice - ${i.item || 'Goods'}`,
      voucherType: 'SALES',
      debit: i.total,
      credit: 0
    });
  });

  // Vouchers (Debit or Credit)
  vouchers.filter(v => v.firmId === activeFirmId && (v.drId === selectedAccountId || v.crId === selectedAccountId)).forEach(v => {
    rawTransactions.push({
      date: v.date,
      voucherNo: v.id,
      particulars: v.drId === selectedAccountId ? `Received / Adjusted from ${v.crName}` : `Paid / Transferred to ${v.drName}`,
      voucherType: v.type,
      debit: v.drId === selectedAccountId ? v.amount : 0,
      credit: v.crId === selectedAccountId ? v.amount : 0
    });
  });

  // Sort by Date
  rawTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  // 2. Filter Date Range and Calculate Opening & Running Balances
  let openingBal = selectedAccount?.openingBal || 0;
  const statementRows = [];

  rawTransactions.forEach(tx => {
    if (tx.date < fromDate) {
      openingBal += (tx.debit - tx.credit);
    } else if (tx.date >= fromDate && tx.date <= toDate) {
      statementRows.push(tx);
    }
  });

  // Calculate Running Balance for each row
  let runningBal = openingBal;
  const finalStatementRows = statementRows.map(row => {
    runningBal += (row.debit - row.credit);
    return {
      ...row,
      runningBalance: runningBal
    };
  });

  // Total Summary
  const totalDebits = statementRows.reduce((sum, r) => sum + r.debit, 0);
  const totalCredits = statementRows.reduce((sum, r) => sum + r.credit, 0);

  // PDF Trigger
  const handleDownloadPDF = () => {
    const element = document.getElementById('printable-account-statement');
    if (!element) return alert('Statement Element Nahi Mila!');

    const opt = {
      margin: 6,
      filename: `Statement_${selectedAccount?.name.replace(/\s+/g, '_')}_${fromDate}_to_${toDate}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    window.html2pdf().set(opt).from(element).save();
  };

  return (
    <div style={styles.appContainer}>
      {/* Header */}
      <header style={styles.header}>
        <div style={{ flex: 1, overflow: 'hidden', paddingRight: '8px' }}>
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
      </header>

      {/* Main Area */}
      <div style={styles.scrollableContent}>
        
        {/* VIEW: SPECIFIC ACCOUNT STATEMENT */}
        {activeTab === 'account_statement' && (
          <div style={styles.contentArea}>
            {/* Filter Controls Card */}
            <div style={styles.cardMain}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>📖 Account Statement & Milan</h3>
              
              <label style={styles.label}>Select Party / Particular Account *</label>
              <select 
                value={selectedAccountId} 
                onChange={(e) => setSelectedAccountId(e.target.value)} 
                style={styles.input}
              >
                {ledgers.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.group})</option>
                ))}
              </select>

              <div style={{ ...styles.grid2, marginTop: '10px' }}>
                <div>
                  <label style={styles.label}>From Date</label>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={styles.input} />
                </div>
                <div>
                  <label style={styles.label}>To Date</label>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={styles.input} />
                </div>
              </div>

              <button onClick={handleDownloadPDF} style={styles.btnSuccess}>
                📥 Download Particular Account Statement (PDF)
              </button>
            </div>

            {/* PRINTABLE STATEMENT SHEET */}
            <div id="printable-account-statement" style={styles.printSheet}>
              {/* Firm Header */}
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>{activeFirm?.firm_name}</div>
              <div style={{ textAlign: 'center', fontSize: '9px', color: '#64748b' }}>{activeFirm?.address} | GSTIN: {activeFirm?.gstin}</div>
              <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 'bold', marginTop: '6px', color: '#2563eb' }}>
                ACCOUNT STATEMENT: {selectedAccount?.name.toUpperCase()}
              </div>
              <div style={{ textAlign: 'center', fontSize: '9px', color: '#475569', marginBottom: '10px' }}>
                Period: {fromDate} to {toDate}
              </div>

              {/* Statement Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Voucher No</th>
                    <th style={styles.th}>Particulars</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Debit (₹)</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Credit (₹)</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Balance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Opening Balance Row */}
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                    <td style={styles.td}>{fromDate}</td>
                    <td style={styles.td}>-</td>
                    <td style={styles.td}>Opening Balance B/F</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{openingBal >= 0 ? `₹${openingBal.toFixed(2)}` : '-'}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{openingBal < 0 ? `₹${Math.abs(openingBal).toFixed(2)}` : '-'}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>₹{openingBal.toFixed(2)} {openingBal >= 0 ? 'Dr' : 'Cr'}</td>
                  </tr>

                  {/* Transactions Rows */}
                  {finalStatementRows.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ ...styles.td, textAlign: 'center', color: '#94a3b8', padding: '10px' }}>
                        Is period me koi transaction nahi mila.
                      </td>
                    </tr>
                  ) : (
                    finalStatementRows.map((row, idx) => (
                      <tr key={idx}>
                        <td style={styles.td}>{row.date}</td>
                        <td style={styles.td}>{row.voucherNo}</td>
                        <td style={styles.td}>{row.particulars}</td>
                        <td style={{ ...styles.td, textAlign: 'right' }}>{row.debit > 0 ? `₹${row.debit.toFixed(2)}` : '-'}</td>
                        <td style={{ ...styles.td, textAlign: 'right' }}>{row.credit > 0 ? `₹${row.credit.toFixed(2)}` : '-'}</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>
                          ₹{Math.abs(row.runningBalance).toFixed(2)} {row.runningBalance >= 0 ? 'Dr' : 'Cr'}
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Closing Balance & Total Summary */}
                  <tr style={{ backgroundColor: '#0f172a', color: '#fff', fontWeight: 'bold' }}>
                    <td colSpan="3" style={{ ...styles.td, color: '#fff' }}>Total Period Activity & Closing Balance</td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#fff' }}>₹{totalDebits.toFixed(2)}</td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#fff' }}>₹{totalCredits.toFixed(2)}</td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#10b981' }}>
                      ₹{Math.abs(runningBal).toFixed(2)} {runningBal >= 0 ? 'Dr' : 'Cr'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Footer Stamp Area */}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '8px' }}>
                <div>Computer Generated Account Statement</div>
                <div style={{ textAlign: 'center', fontWeight: 'bold', borderTop: '1px solid #94a3b8', paddingTop: '4px', width: '110px' }}>
                  Authorized Signatory
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Nav */}
      <nav style={styles.bottomNav}>
        <button onClick={() => setActiveTab('account_statement')} style={styles.activeBottomTab}>📖<br />Account Statement</button>
      </nav>
    </div>
  );
}

const styles = {
  appContainer: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f8fafc', height: '100vh', display: 'flex', flexDirection: 'column' },
  header: { backgroundColor: '#0f172a', color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  orgDropdown: { backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', width: '100%', textOverflow: 'ellipsis' },
  fyBadge: { display: 'block', fontSize: '10px', color: '#94a3b8', marginTop: '2px' },
  scrollableContent: { flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '80px' },
  contentArea: { display: 'flex', flexDirection: 'column', gap: '16px' },
  cardMain: { backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  label: { display: 'block', fontWeight: 'bold', fontSize: '12px', color: '#334155', marginBottom: '4px' },
  input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' },
  btnSuccess: { width: '100%', backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: '14px' },
  printSheet: { border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px', backgroundColor: '#fff' },
  th: { border: '1px solid #cbd5e1', padding: '6px', textAlign: 'left', fontSize: '9px' },
  td: { border: '1px solid #e2e8f0', padding: '5px', fontSize: '9px' },
  bottomNav: { position: 'fixed', bottom: 0, left: 0, right: 0, height: '60px', backgroundColor: '#fff', display: 'flex', borderTop: '1px solid #e2e8f0', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' },
  activeBottomTab: { flex: 1, border: 'none', backgroundColor: 'transparent', color: '#2563eb', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }
};
