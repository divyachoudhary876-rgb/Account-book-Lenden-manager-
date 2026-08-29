import React, { useState, useEffect } from 'react';

export default function App() {
  // Multi-Tenant State
  const [firms, setFirms] = useState(() => JSON.parse(localStorage.getItem('erp_firms')) || [
    { id: 'FIRM-101', firm_name: 'Neelkanth Bricks & Biomass Unit', business_type: 'BRICK_KILN', gstin: '08AAAAA0000A1Z5', address: 'Plot 42, Industrial Area, Jaipur, Rajasthan' }
  ]);
  const [activeFirmId, setActiveFirmId] = useState(() => localStorage.getItem('erp_active_firm') || 'FIRM-101');
  const [activeTab, setActiveTab] = useState('add_bill');

  // Chart of Accounts Master
  const [ledgers, setLedgers] = useState(() => JSON.parse(localStorage.getItem('erp_ledgers')) || [
    { id: 'LED-1', name: 'Cash Account', group: 'CASH' },
    { id: 'LED-2', name: 'SBI Bank Account', group: 'BANK' },
    { id: 'LED-3', name: 'Shree Ram Traders', group: 'SUNDRY_DEBTORS', gstin: '08BBBBB1111B1Z2' },
    { id: 'LED-4', name: 'Sales Account', group: 'SALES' },
  ]);

  const [invoices, setInvoices] = useState(() => JSON.parse(localStorage.getItem('erp_invoices')) || []);
  const [lastInvoice, setLastInvoice] = useState(null);

  // Bill Input Form State
  const [billInput, setBillInput] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    partyId: 'LED-3', 
    item: 'First Class Red Bricks', 
    hsn: '6901',
    qty: 10000, 
    rate: 6.5, 
    gstRate: 5 
  });

  useEffect(() => {
    localStorage.setItem('erp_firms', JSON.stringify(firms));
    localStorage.setItem('erp_active_firm', activeFirmId);
    localStorage.setItem('erp_ledgers', JSON.stringify(ledgers));
    localStorage.setItem('erp_invoices', JSON.stringify(invoices));
  }, [firms, activeFirmId, ledgers, invoices]);

  const activeFirm = firms.find(f => f.id === activeFirmId);
  const selectedParty = ledgers.find(l => l.id === billInput.partyId);

  // Calculations
  const taxableVal = (parseFloat(billInput.qty) || 0) * (parseFloat(billInput.rate) || 0);
  const cgstVal = (taxableVal * ((parseFloat(billInput.gstRate) || 0) / 100)) / 2;
  const sgstVal = cgstVal;
  const grandTotal = taxableVal + (cgstVal * 2);

  // Generate & Save Bill
  const handlePostBill = (e) => {
    e.preventDefault();
    if (!billInput.partyId) return alert('Customer Ledger select karein!');
    if (grandTotal <= 0) return alert('Invalid Quantity or Rate!');

    const invObj = {
      id: `TAX-2026-0${invoices.length + 1}`,
      firm: activeFirm,
      party: selectedParty,
      date: billInput.date,
      item: billInput.item,
      hsn: billInput.hsn,
      qty: billInput.qty,
      rate: billInput.rate,
      taxable: taxableVal,
      cgst: cgstVal,
      sgst: sgstVal,
      total: grandTotal,
      pending: grandTotal
    };

    setInvoices([invObj, ...invoices]);
    setLastInvoice(invObj);
    alert('Invoice Generate Ho Gaya! Ab Aap Niche PDF Download Kar Sakte Hain.');
  };

  // PDF Download Engine Trigger
  const handleDownloadPDF = () => {
    const element = document.getElementById('printable-invoice');
    if (!element) return alert('Invoice Element Nahi Mila!');

    const opt = {
      margin: 5,
      filename: `${lastInvoice ? lastInvoice.id : 'Tax_Invoice'}.pdf`,
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

      {/* Body Area */}
      <div style={styles.scrollableContent}>
        
        {/* ADD BILL FORM */}
        {activeTab === 'add_bill' && (
          <div style={styles.contentArea}>
            <div style={styles.cardMain}>
              <h3 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>📄 Create Professional Tax Invoice</h3>
              <form onSubmit={handlePostBill}>
                <label style={styles.label}>Invoice Date</label>
                <input type="date" value={billInput.date} onChange={(e) => setBillInput({ ...billInput, date: e.target.value })} style={styles.input} />

                <label style={{ ...styles.label, marginTop: '10px' }}>Customer Ledger *</label>
                <select value={billInput.partyId} onChange={(e) => setBillInput({ ...billInput, partyId: e.target.value })} style={styles.input}>
                  {ledgers.filter(l => l.group === 'SUNDRY_DEBTORS').map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>

                <label style={{ ...styles.label, marginTop: '10px' }}>Item Description</label>
                <input type="text" value={billInput.item} onChange={(e) => setBillInput({ ...billInput, item: e.target.value })} style={styles.input} />

                <div style={{ ...styles.grid2, marginTop: '10px' }}>
                  <div>
                    <label style={styles.label}>Quantity</label>
                    <input type="number" value={billInput.qty} onChange={(e) => setBillInput({ ...billInput, qty: e.target.value })} style={styles.input} />
                  </div>
                  <div>
                    <label style={styles.label}>Rate per Unit (₹)</label>
                    <input type="number" step="0.01" value={billInput.rate} onChange={(e) => setBillInput({ ...billInput, rate: e.target.value })} style={styles.input} />
                  </div>
                </div>

                <div style={styles.summaryCard}>
                  <div style={styles.summaryRow}><span>Taxable Amount:</span><strong>₹ {taxableVal.toFixed(2)}</strong></div>
                  <div style={styles.summaryRow}><span>CGST (2.5%):</span><strong>+ ₹ {cgstVal.toFixed(2)}</strong></div>
                  <div style={styles.summaryRow}><span>SGST (2.5%):</span><strong>+ ₹ {sgstVal.toFixed(2)}</strong></div>
                  <div style={{ ...styles.summaryRow, borderTop: '1px solid #cbd5e1', paddingTop: '6px', marginTop: '6px' }}>
                    <strong>Grand Total:</strong><strong style={{ color: '#10b981', fontSize: '18px' }}>₹ {grandTotal.toFixed(2)}</strong>
                  </div>
                </div>

                <button type="submit" style={styles.btnSuccess}>Generate Tax Invoice</button>
              </form>
            </div>

            {/* LIVE PREVIEW & DOWNLOAD SECTION */}
            {lastInvoice && (
              <div style={styles.cardMain}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, color: '#0f172a' }}>🖨️ PDF Invoice Preview</h3>
                  <button onClick={handleDownloadPDF} style={styles.btnDownload}>
                    📥 Download PDF Invoice
                  </button>
                </div>

                {/* Standard Printable Tax Invoice Sheet */}
                <div id="printable-invoice" style={styles.invoiceSheet}>
                  <div style={{ textTransform: 'uppercase', fontSize: '10px', textAlign: 'center', fontWeight: 'bold', color: '#64748b' }}>TAX INVOICE</div>
                  
                  {/* Firm Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '8px', marginTop: '4px' }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>{lastInvoice.firm.firm_name}</h2>
                      <div style={{ fontSize: '10px', color: '#475569' }}>{lastInvoice.firm.address}</div>
                      <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '2px' }}>GSTIN: {lastInvoice.firm.gstin}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb' }}>{lastInvoice.id}</div>
                      <div style={{ fontSize: '10px' }}>Date: {lastInvoice.date}</div>
                    </div>
                  </div>

                  {/* Billed To */}
                  <div style={{ padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <small style={{ color: '#64748b', fontSize: '9px', fontWeight: 'bold' }}>BILLED TO:</small>
                    <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{lastInvoice.party.name}</div>
                    <div style={{ fontSize: '10px' }}>GSTIN: {lastInvoice.party.gstin || 'URP (Unregistered)'}</div>
                  </div>

                  {/* Itemized Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px', fontSize: '10px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                        <th style={{ padding: '4px', border: '1px solid #cbd5e1' }}>Item Description</th>
                        <th style={{ padding: '4px', border: '1px solid #cbd5e1' }}>HSN</th>
                        <th style={{ padding: '4px', border: '1px solid #cbd5e1' }}>Qty</th>
                        <th style={{ padding: '4px', border: '1px solid #cbd5e1' }}>Rate</th>
                        <th style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Taxable</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>{lastInvoice.item}</td>
                        <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>{lastInvoice.hsn}</td>
                        <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>{lastInvoice.qty}</td>
                        <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>₹{lastInvoice.rate}</td>
                        <td style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }}>₹{lastInvoice.taxable.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Taxes & Grand Total */}
                  <div style={{ marginTop: '8px', fontSize: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: '180px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span>CGST (2.5%):</span><span>₹{lastInvoice.cgst.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span>SGST (2.5%):</span><span>₹{lastInvoice.sgst.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #0f172a', paddingTop: '4px', fontWeight: 'bold', fontSize: '11px' }}>
                        <span>Grand Total:</span><span>₹{lastInvoice.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Signatory Footer */}
                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ fontSize: '8px', color: '#94a3b8' }}>Computer Generated Statutory Invoice</div>
                    <div style={{ textAlign: 'center', fontSize: '9px', fontWeight: 'bold', borderTop: '1px solid #94a3b8', paddingTop: '4px', width: '100px' }}>
                      Authorized Signatory
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav style={styles.bottomNav}>
        <button onClick={() => setActiveTab('add_bill')} style={styles.activeBottomTab}>📄<br />Add Bill</button>
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
  summaryCard: { backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '8px', marginTop: '12px' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#334155', marginBottom: '4px' },
  btnSuccess: { width: '100%', backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: '14px' },
  btnDownload: { backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' },
  invoiceSheet: { border: '1px solid #cbd5e1', padding: '12px', borderRadius: '6px', backgroundColor: '#fff' },
  bottomNav: { position: 'fixed', bottom: 0, left: 0, right: 0, height: '60px', backgroundColor: '#fff', display: 'flex', borderTop: '1px solid #e2e8f0', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' },
  activeBottomTab: { flex: 1, border: 'none', backgroundColor: 'transparent', color: '#2563eb', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }
};
