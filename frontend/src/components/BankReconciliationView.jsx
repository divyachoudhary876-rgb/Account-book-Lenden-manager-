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
  const [ledgerBookBalance, setLedgerBookBalance] = useState(0);

  const loadData = () => {
    try {
      const accounts = getFirmMasterAccounts(activeFirmId) || [];
      const banks = accounts.filter(a => 
        (a.name || a.account_name || '').toLowerCase().includes('bank') || 
        (a.sub_group || '').toLowerCase().includes('bank') ||
        (a.type || '').toLowerCase().includes('asset')
      );
      setBankAccounts(banks);
      if (banks.length > 0 && !selectedBank) {
        setSelectedBank(banks[0].name || banks[0].account_name);
      }
    } catch (e) {
      console.error("Error loading bank accounts:", e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_state_updated', loadData);
    window.addEventListener('app_storage_updated', loadData);
    return () => {
      window.removeEventListener('app_state_updated', loadData);
      window.removeEventListener('app_storage_updated', loadData);
    };
  }, [activeFirmId]);

  useEffect(() => {
    if (!selectedBank) {
      setBankTransactions([]);
      setLedgerBookBalance(0);
      return;
    }

    try {
      const targetClean = String(selectedBank).trim().toLowerCase();

      // 1. Fetch Master Opening Balance of the Bank Account
      let masterOpeningAmt = 0;
      let masterOpeningSign = 'Dr';
      try {
        const accHeadsKey = `account_heads_${activeFirmId}`;
        const savedHeads = JSON.parse(localStorage.getItem(accHeadsKey) || '[]');
        const foundHead = savedHeads.find(a => String(a.name).trim().toLowerCase() === targetClean);
        if (foundHead) {
          masterOpeningAmt = Number(foundHead.openingBalance || 0);
          masterOpeningSign = foundHead.balanceType || 'Dr';
        }
      } catch (err) {
        console.error("Error reading bank opening balance:", err);
      }

      let runningBal = masterOpeningSign === 'Cr' ? -masterOpeningAmt : masterOpeningAmt;

      // 2. Fetch all vouchers
      let rawTx = [];
      const keysToScan = [
        'account_book_vouchers',
        'app_vouchers',
        'transactions',
        `account_book_vouchers_${activeFirmId}`,
        `app_vouchers_${activeFirmId}`
      ];

      keysToScan.forEach(k => {
        try {
          const val = StorageService.getItem ? StorageService.getItem(k) : JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(val)) rawTx.push(...val);
        } catch (e) {}
      });

      // Deduplication
      const uniqueVoucherMap = new Map();
      rawTx.forEach(v => {
        if (!v) return;
        const vFirm = v.firm_id || activeFirmId;
        if (vFirm !== activeFirmId && vFirm !== 'FIRM-001' && activeFirmId !== 'FIRM-001') return;

        const uniqueId = v.id || v.reference_no || `${v.voucher_date || v.date}-${v.total_amount || v.amount || 0}`;
        if (!uniqueVoucherMap.has(uniqueId)) {
          uniqueVoucherMap.set(uniqueId, v);
        }
      });

      const matchedTransactions = [];

      uniqueVoucherMap.forEach(v => {
        const vDate = v.voucher_date || v.date || '2026-04-01';
        if (asOfDate && vDate > asOfDate) return; // Ignore future transactions beyond asOfDate

        const vType = String(v.voucher_type || v.type || 'JV').toUpperCase();
        const vNum = v.reference_no || v.voucher_number || (v.id ? v.id.slice(-6) : 'N/A');
        const narration = v.narration || v.notes || v.description || '';

        // Structured entries array format
        if (Array.isArray(v.entries) && v.entries.length > 0) {
          let bDebit = 0;
          let bCredit = 0;
          let isMatch = false;

          v.entries.forEach(e => {
            const accName = (e.account_name || e.party || '').trim();
            if (accName.toLowerCase() === targetClean) {
              isMatch = true;
              const amt = Number(e.amount || e.debit || e.credit || 0);
              const type = (e.type || '').toUpperCase();
              if (type === 'DR' || Number(e.debit || 0) > 0) bDebit += amt;
              if (type === 'CR' || Number(e.credit || 0) > 0) bCredit += amt;
            }
          });

          if (isMatch) {
            runningBal += (bDebit - bCredit);
            matchedTransactions.push({
              date: vDate,
              voucher_type: vType,
              reference_no: vNum,
              narration: narration,
              debit: bDebit,
              credit: bCredit,
              netAmount: bDebit > 0 ? bDebit : -bCredit
            });
          }
        } 
        // Flat format
        else {
          const amt = Number(v.amount || v.total_amount || 0);
          if (amt <= 0) return;
          const dr = (v.dr_account || v.dr_party || v.debit_account || '').trim();
          const cr = (v.cr_account || v.cr_party || v.credit_account || '').trim();

          if (dr.toLowerCase() === targetClean || cr.toLowerCase() === targetClean) {
            const isDr = dr.toLowerCase() === targetClean;
            const bDebit = isDr ? amt : 0;
            const bCredit = !isDr ? amt : 0;

            runningBal += (bDebit - bCredit);
            matchedTransactions.push({
              date: vDate,
              voucher_type: vType,
              reference_no: vNum,
              narration: narration,
              debit: bDebit,
              credit: bCredit,
              netAmount: isDr ? amt : -amt
            });
          }
        }
      });

      matchedTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
      setBankTransactions(matchedTransactions);
      setLedgerBookBalance(runningBal);

    } catch (e) {
      console.error("Error calculating BRS balance:", e);
    }
  }, [selectedBank, asOfDate, activeFirmId]);

  const diff = Number(statementBalance || 0) - ledgerBookBalance;

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: '850px', margin: '0 auto', boxSizing: 'border-box', color: '#0f172a' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>BANK GOVERNANCE</div>
          <h2 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>🏦 बैंक मिलान विवरण (Bank Reconciliation - BRS)</h2>
        </div>
        {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Close</button>}
      </div>

      {/* Control Panel */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Select Bank Account *</label>
          <select 
            value={selectedBank} 
            onChange={e => setSelectedBank(e.target.value)}
            style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', color: '#0f172a' }}
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
            style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#fff', color: '#0f172a' }}
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
            style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', fontWeight: 'bold', backgroundColor: '#fff', color: '#0f172a' }}
          />
        </div>
      </div>

      {/* Summary Valuation Box */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px', borderRadius: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase' }}>Ledger Book Balance</div>
          <div style={{ fontSize: '15px', fontWeight: '900', color: '#15803d', marginTop: '4px' }}>₹{Math.abs(ledgerBookBalance).toFixed(2)} {ledgerBookBalance >= 0 ? 'Dr' : 'Cr'}</div>
        </div>
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '14px', borderRadius: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#1e40af', textTransform: 'uppercase' }}>Statement Balance</div>
          <div style={{ fontSize: '15px', fontWeight: '900', color: '#1d4ed8', marginTop: '4px' }}>₹{Number(statementBalance || 0).toFixed(2)}</div>
        </div>
        <div style={{ backgroundColor: Math.abs(diff) < 1 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${Math.abs(diff) < 1 ? '#bbf7d0' : '#fecaca'}`, padding: '14px', borderRadius: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: Math.abs(diff) < 1 ? '#166534' : '#991b1b', textTransform: 'uppercase' }}>Discrepancy / Diff</div>
          <div style={{ fontSize: '15px', fontWeight: '900', color: Math.abs(diff) < 1 ? '#15803d' : '#dc2626', marginTop: '4px' }}>₹{diff.toFixed(2)}</div>
        </div>
      </div>

      {/* Transactions Register */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>📋 Bank Ledger Transactions ({bankTransactions.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#fff' }}>
                <th style={{ padding: '8px' }}>Date</th>
                <th style={{ padding: '8px' }}>Ref / Particulars</th>
                <th style={{ padding: '8px' }}>Narration</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Debit (₹)</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Credit (₹)</th>
              </tr>
            </thead>
            <tbody>
              {bankTransactions.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No bank transactions found.</td></tr>
              ) : (
                bankTransactions.map((tx, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '8px' }}>{tx.date}</td>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}><strong>{tx.voucher_type}</strong> #{tx.reference_no}</td>
                    <td style={{ padding: '8px', color: '#64748b' }}>{tx.narration || '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: tx.debit > 0 ? '#059669' : '#94a3b8', fontWeight: tx.debit > 0 ? 'bold' : 'normal' }}>
                      {tx.debit > 0 ? tx.debit.toFixed(2) : '-'}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: tx.credit > 0 ? '#dc2626' : '#94a3b8', fontWeight: tx.credit > 0 ? 'bold' : 'normal' }}>
                      {tx.credit > 0 ? tx.credit.toFixed(2) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
