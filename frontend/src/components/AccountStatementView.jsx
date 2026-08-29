import React, { useState, useEffect } from 'react';

export default function AccountStatementView({ organizationId = "ORG-101" }) {
  const [ledgers] = useState([
    { id: 'LED-3', name: 'Shree Ram Traders', group_type: 'SUNDRY_DEBTOR' },
    { id: 'LED-4', name: 'Jaipur BioFuels', group_type: 'SUNDRY_DEBTOR' }
  ]);
  const [selectedAccountId, setSelectedAccountId] = useState('LED-3');
  const [fromDate, setFromDate] = useState('2026-08-01');
  const [toDate, setToDate] = useState('2026-08-29');
  
  const [statementData, setStatementData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStatement = async () => {
    if (!selectedAccountId) return;
    setLoading(true);
    try {
      const url = `/api/v1/accounting/account-statement?organization_id=${organizationId}&account_id=${selectedAccountId}&from_date=${fromDate}&to_date=${toDate}`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setStatementData(result.data);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement();
  }, [selectedAccountId, fromDate, toDate]);

  const handleDownloadPDF = () => {
    const element = document.getElementById('printable-account-statement');
    if (!element) return alert('Statement Element Not Found!');

    const opt = {
      margin: 6,
      filename: `Statement_${statementData?.accountName || 'Account'}_${fromDate}_to_${toDate}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (window.html2pdf) {
      window.html2pdf().set(opt).from(element).save();
    } else {
      alert('PDF generation engine not loaded. Please print directly.');
      window.print();
    }
  };

  return (
    <div style={styles.contentArea}>
      <div style={styles.cardMain}>
        <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>📖 Account Statement & Milan</h3>
        
        <label style={styles.label}>Select Party / Particular Account *</label>
        <select 
          value={selectedAccountId} 
          onChange={(e) => setSelectedAccountId(e.target.value)} 
          style={styles.input}
        >
          {ledgers.map(l => (
            <option key={l.id} value={l.id}>{l.name} ({l.group_type})</option>
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

        <button onClick={handleDownloadPDF} style={styles.btnSuccess} disabled={loading}>
          {loading ? 'Fetching Statement...' : '📥 Download Particular Account Statement (PDF)'}
        </button>
      </div>

      <div id="printable-account-statement" style={styles.printSheet}>
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>
          Neelkanth Enterprise Workspace
        </div>
        <div style={{ textAlign: 'center', fontSize: '9px', color: '#64748b' }}>
          Plot 42, Industrial Area, Jaipur, Rajasthan | GSTIN: 08AAAAA0000A1Z5
        </div>
        <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 'bold', marginTop: '6px', color: '#2563eb' }}>
          ACCOUNT STATEMENT: {statementData?.accountName?.toUpperCase() || 'SHREE RAM TRADERS'}
        </div>
        <div style={{ textAlign: 'center', fontSize: '9px', color: '#475569', marginBottom: '10px' }}>
          Period: {fromDate} to {toDate}
        </div>

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
            <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
              <td style={styles.td}>{fromDate}</td>
              <td style={styles.td}>-</td>
              <td style={styles.td}>Opening Balance B/F</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{(statementData?.openingBalanceBF || 12000) >= 0 ? `₹${Number(statementData?.openingBalanceBF || 12000).toFixed(2)}` : '-'}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{(statementData?.openingBalanceBF || 12000) < 0 ? `₹${Math.abs(statementData?.openingBalanceBF || 12000).toFixed(2)}` : '-'}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>
                ₹{Math.abs(statementData?.openingBalanceBF || 12000).toFixed(2)} {(statementData?.openingBalanceBF || 12000) >= 0 ? 'Dr' : 'Cr'}
              </td>
            </tr>

            {(!statementData?.rows || statementData.rows.length === 0) ? (
              <tr>
                <td colSpan="6" style={{ ...styles.td, textAlign: 'center', color: '#94a3b8', padding: '10px' }}>
                  Is period me koi transaction nahi mila.
                </td>
              </tr>
            ) : (
              statementData.rows.map((row, idx) => (
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

            <tr style={{ backgroundColor: '#0f172a', color: '#fff', fontWeight: 'bold' }}>
              <td colSpan="3" style={{ ...styles.td, color: '#fff' }}>Total Period Activity & Closing Balance</td>
              <td style={{ ...styles.td, textAlign: 'right', color: '#fff' }}>₹{(statementData?.totalDebits || 0).toFixed(2)}</td>
              <td style={{ ...styles.td, textAlign: 'right', color: '#fff' }}>₹{(statementData?.totalCredits || 0).toFixed(2)}</td>
              <td style={{ ...styles.td, textAlign: 'right', color: '#10b981' }}>
                ₹{Math.abs(statementData?.closingBalance || 12000).toFixed(2)} {(statementData?.closingBalance || 12000) >= 0 ? 'Dr' : 'Cr'}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '8px' }}>
          <div>Computer Generated Account Statement</div>
          <div style={{ textAlign: 'center', fontWeight: 'bold', borderTop: '1px solid #94a3b8', paddingTop: '4px', width: '110px' }}>
            Authorized Signatory
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  contentArea: { display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' },
  cardMain: { backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  label: { display: 'block', fontWeight: 'bold', fontSize: '12px', color: '#334155', marginBottom: '4px' },
  input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' },
  btnSuccess: { width: '100%', backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: '14px' },
  printSheet: { border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px', backgroundColor: '#fff' },
  th: { border: '1px solid #cbd5e1', padding: '6px', textAlign: 'left', fontSize: '9px' },
  td: { border: '1px solid #e2e8f0', padding: '5px', fontSize: '9px' }
};
