// frontend/src/components/FinancialReportsView.jsx

import React, { useState } from 'react';

export default function FinancialReportsView() {
  const [reportType, setReportType] = useState('PNL'); // PNL, BALANCE_SHEET, DAYBOOK
  const [fromDate, setFromDate] = useState('2026-08-01');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  // Demo Live Aggregated Data
  const pnlData = {
    income: [
      { name: 'Sales Account', amount: 45000.00 },
      { name: 'Other Income', amount: 2500.00 }
    ],
    expenses: [
      { name: 'Raw Material Purchase', amount: 22000.00 },
      { name: 'Electricity & Utility Bills', amount: 3400.00 },
      { name: 'Transport & Freight', amount: 1800.00 }
    ]
  };

  const totalIncome = pnlData.income.reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = pnlData.expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalIncome - totalExpense;

  return (
    <div style={styles.cardMain}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>📊 Financial Statements & Reports</h3>

      {/* Report Switcher Tabs */}
      <div style={styles.tabContainer}>
        <button 
          onClick={() => setReportType('PNL')} 
          style={{ ...styles.tabBtn, backgroundColor: reportType === 'PNL' ? '#2563eb' : '#e2e8f0', color: reportType === 'PNL' ? '#fff' : '#334155' }}
        >
          📈 Profit & Loss Statement
        </button>
        <button 
          onClick={() => setReportType('BALANCE_SHEET')} 
          style={{ ...styles.tabBtn, backgroundColor: reportType === 'BALANCE_SHEET' ? '#2563eb' : '#e2e8f0', color: reportType === 'BALANCE_SHEET' ? '#fff' : '#334155' }}
        >
          ⚖️ Balance Sheet
        </button>
      </div>

      {/* Filter Options */}
      <div style={styles.grid2}>
        <div>
          <label style={styles.label}>From Date</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={styles.input} />
        </div>
        <div>
          <label style={styles.label}>To Date</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={styles.input} />
        </div>
      </div>

      {/* PNL REPORT VIEW */}
      {reportType === 'PNL' && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '6px' }}>Profit & Loss Account</h4>
          
          {/* Income Table */}
          <table style={styles.table}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={styles.th}>Revenue / Income Heads</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {pnlData.income.map((inc, i) => (
                <tr key={i}>
                  <td style={styles.td}>{inc.name}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>₹{inc.amount.toFixed(2)}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 'bold', backgroundColor: '#f1f5f9' }}>
                <td style={styles.td}>Total Revenue (A)</td>
                <td style={{ ...styles.td, textAlign: 'right', color: '#16a34a' }}>₹{totalIncome.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* Expense Table */}
          <table style={{ ...styles.table, marginTop: '16px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={styles.th}>Operating Expenses Heads</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {pnlData.expenses.map((exp, i) => (
                <tr key={i}>
                  <td style={styles.td}>{exp.name}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>₹{exp.amount.toFixed(2)}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 'bold', backgroundColor: '#f1f5f9' }}>
                <td style={styles.td}>Total Expenses (B)</td>
                <td style={{ ...styles.td, textAlign: 'right', color: '#dc2626' }}>₹{totalExpense.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* Summary Box */}
          <div style={{
            marginTop: '20px',
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: netProfit >= 0 ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${netProfit >= 0 ? '#10b981' : '#f87171'}`,
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: netProfit >= 0 ? '#065f46' : '#991b1b' }}>
              {netProfit >= 0 ? 'Net Operating Profit' : 'Net Operating Loss'}
            </span>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: netProfit >= 0 ? '#047857' : '#b91c1c' }}>
              ₹{Math.abs(netProfit).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  cardMain: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', maxWidth: '800px', margin: '0 auto' },
  tabContainer: { display: 'flex', gap: '8px', marginBottom: '16px' },
  tabBtn: { padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  label: { display: 'block', fontWeight: 'bold', fontSize: '12px', color: '#334155', marginBottom: '4px' },
  input: { width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left', fontSize: '12px' },
  td: { border: '1px solid #e2e8f0', padding: '7px', fontSize: '12px' }
};
