// frontend/src/components/AccountStatementView.jsx

import React, { useState, useEffect } from 'react';
import { getAccountHeadsByFirm } from '../utils/accountMasterEngine.js';

export default function AccountStatementView({ firm }) {
  const activeFirmId = firm?.id;

  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [fromDate, setFromDate] = useState('2026-08-01');
  const [toDate, setToDate] = useState('2026-08-31');
  const [statementEntries, setStatementEntries] = useState([]);

  useEffect(() => {
    loadAccounts();
    const handleStorage = () => loadAccounts();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [firm]);

  const loadAccounts = () => {
    const list = getAccountHeadsByFirm(activeFirmId);
    setAccounts(list);
    if (list.length > 0 && !selectedAccountId) {
      setSelectedAccountId(list[0].id);
    }
  };

  useEffect(() => {
    if (!selectedAccountId) return;

    const journalKey = `app_journal_entries_${activeFirmId || 'FIRM-001'}`;
    const allJournals = JSON.parse(localStorage.getItem(journalKey) || '[]');

    const filtered = allJournals.filter(entry => {
      const matchAccount = entry.debit_account_id === selectedAccountId || entry.credit_account_id === selectedAccountId;
      const entryDate = entry.date || '';
      const matchDate = entryDate >= fromDate && entryDate <= toDate;
      return matchAccount && matchDate;
    });

    setStatementEntries(filtered);
  }, [selectedAccountId, fromDate, toDate, activeFirmId]);

  const selectedAccObj = accounts.find(a => a.id === selectedAccountId);

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px' }}>📖 Account Milan & General Ledger Statement</h3>

      {/* Filter Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <div>
          <label style={labelStyle}>Select Party / Account Head *</label>
          <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} style={inputStyle}>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.group_type})</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>From Date</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>To Date</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Account Header */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h4 style={{ margin: 0, color: '#0f172a' }}>{firm?.legal_name || 'Aa'}</h4>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2563eb', marginTop: '4px' }}>
          STATEMENT OF ACCOUNT: {selectedAccObj?.name || 'Selected Head'}
        </div>
      </div>

      {/* Ledger Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Voucher Ref</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Particulars / Narration</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Debit (₹)</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Credit (₹)</th>
            </tr>
          </thead>
          <tbody>
            {statementEntries.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                  No transactions found for this account in the selected date range.
                </td>
              </tr>
            ) : (
              statementEntries.map((item, idx) => {
                const isDebit = item.debit_account_id === selectedAccountId;
                return (
                  <tr key={item.id || idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '10px' }}>{item.date}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.voucher_no || item.voucher_type}</td>
                    <td style={{ padding: '10px' }}>{item.narration || item.voucher_type}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: isDebit ? 'bold' : 'normal', color: isDebit ? '#2563eb' : '#475569' }}>
                      {isDebit ? `₹${parseFloat(item.amount).toFixed(2)}` : '-'}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: !isDebit ? 'bold' : 'normal', color: !isDebit ? '#059669' : '#475569' }}>
                      {!isDebit ? `₹${parseFloat(item.amount).toFixed(2)}` : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };
