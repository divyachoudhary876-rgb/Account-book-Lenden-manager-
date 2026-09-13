// frontend/src/components/BankReconciliationView.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';

export default function BankReconciliationView({ firm, onClose }) {
  const activeFirmId = firm?.id || firm?.firm_id || 'FIRM-001';
  const todayMaxDate = new Date().toISOString().split('T')[0];

  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [bankTransactions, setBankTransactions] = useState([]);
  const [asOfDate, setAsOfDate] = useState(todayMaxDate);
  const [statementBalance, setStatementBalance] = useState('');
  const [feedback, setFeedback] = useState(null);

  const loadData = () => {
    try {
      const accounts = getFirmMasterAccounts(activeFirmId) || [];
      const banks = accounts.filter(a => 
        (a.name || a.account_name || '').toLowerCase().includes('bank') || 
        (a.sub_group || '').toLowerCase().includes('bank')
      );
      setBankAccounts(banks);
      if (banks.length > 0 && !selectedBank) {
        setSelectedBank(banks[0].name || banks[0].account_name);
      }

      let rawTx = [];
      const keys = ['account_book_vouchers', `account_book_vouchers_${activeFirmId}`];
      keys.forEach(k => {
        const val = StorageService.getItem(k);
        if (Array.isArray(val)) rawTx.push(...val);
      });

      const matched = rawTx.filter(v => {
        if (!v) return false;
        const dr = (v.dr_account || '').toLowerCase();
        const cr = (v.cr_account || '').toLowerCase();
        const bName = selectedBank.toLowerCase();
        return dr.includes(bName) || cr.includes(bName);
      });

      setBankTransactions(matched);
    } catch (e) {
      console.error("Error loading BRS data:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeFirmId, selectedBank]);

  // Ledger Book Balance Calculation
  const ledgerBookBalance = bankTransactions.reduce((sum, v) => {
    const amt = Number(v.amount || v.total_amount || 0);
    const dr = (v.dr_account || '').toLowerCase();
    const bName = selectedBank.toLowerCase();
    if (dr.includes(bName)) return sum + amt; // Debit increases bank asset
    return sum - amt; // Credit decreases bank asset
  }, 0);

  const diff = Number(statementBalance || 0) - ledgerBookBalance;

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', maxWidth: '850px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>BANK GOVERNANCE</div>
          <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>🏦 बैंक मिलान विवरण (Bank Reconciliation - BRS)</h2>
        </div>
        {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Close</button>}
      </div>

      {/* Control Panel */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Select Bank Account *</label>
          <select 
            value={selectedBank} 
            onChange={e => setSelectedBank(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}
          >
            {bankAccounts.map((b, idx) => (
              <option key={idx} value={b.name || b.account_name}>{b.name || b.account_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>As of Date *</label>
          <input 
            type="date" 
            max={todayMaxDate}
            value={asOfDate} 
            onChange={e => setAsOfDate(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Bank Statement Balance (₹) *</label>
          <input 
            type="number" 
            step="0.01" 
            placeholder="Enter passbook balance"
            value={statementBalance} 
            onChange={e => setStatementBalance(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', fontWeight: 'bold' }}
          />
        </div>
      </div>

      {/* Summary Valuation Box */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px', borderRadius: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase' }}>Ledger Book Balance</div>
          <div style={{ fontSize: '16px', fontWeight: '900', color: '#15803d', marginTop: '4px' }}>₹{ledgerBookBalance.toFixed(2)}</div>
        </div>
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '14px', borderRadius: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#1e40af', textTransform: 'uppercase' }}>Statement Balance</div>
          <div style={{ fontSize: '16px', fontWeight: '900', color: '#1d4ed8', marginTop: '4px' }}>₹{Number(statementBalance || 0).toFixed(2)}</div>
        </div>
        <div style={{ backgroundColor: Math.abs(diff) < 1 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${Math.abs(diff) < 1 ? '#bbf7d0' : '#fecaca'}`, padding: '14px', borderRadius: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: Math.abs(diff) < 1 ? '#166534' : '#991b1b', textTransform: 'uppercase' }}>Discrepancy / Diff</div>
          <div style={{ fontSize: '16px', fontWeight: '900', color: Math.abs(diff) < 1 ? '#15803d' : '#dc2626', marginTop: '4px' }}>₹{diff.toFixed(2)}</div>
        </div>
      </div>

      {/* Transactions Register */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>📋 Bank Ledger Transactions ({bankTransactions.length})</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#fff' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Ref / Particulars</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Narration</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {bankTransactions.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No bank transactions found.</td></tr>
            ) : (
              bankTransactions.map((tx, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}>{tx.voucher_date || tx.date}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{tx.reference_no || tx.voucher_number || 'N/A'}</td>
                  <td style={{ padding: '10px', color: '#64748b' }}>{tx.narration || 'Bank Entry'}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>₹{Number(tx.amount || 0).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
