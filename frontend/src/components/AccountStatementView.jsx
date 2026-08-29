// frontend/src/components/AccountStatementView.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { calculateAccountStatement } from '../utils/statementEngine';
import { downloadElementAsPDF } from '../utils/pdfDownloadEngine';

export default function AccountStatementView({ firm }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [fromDate, setFromDate] = useState('2026-08-01');
  const [toDate, setToDate] = useState('2026-08-29');
  const [statementData, setStatementData] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Re-fetch fresh state from LocalStorage on mount or event trigger
  const syncAccountData = useCallback(() => {
    const saved = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
    setAccounts(saved);
    if (saved.length > 0 && !selectedAccountId) {
      setSelectedAccountId(saved[0].id);
    }
  }, [selectedAccountId]);

  // Mount/Unmount Reactive Event Subscriptions
  useEffect(() => {
    syncAccountData();

    const handlePostingUpdate = () => {
      syncAccountData();
    };

    window.addEventListener('ACCOUNT_BOOK_VOUCHER_POSTED', handlePostingUpdate);
    window.addEventListener('storage', handlePostingUpdate);

    return () => {
      window.removeEventListener('ACCOUNT_BOOK_VOUCHER_POSTED', handlePostingUpdate);
      window.removeEventListener('storage', handlePostingUpdate);
    };
  }, [syncAccountData]);

  // Recalculate Statement on Account or Date Range selection change
  useEffect(() => {
    if (selectedAccountId) {
      const result = calculateAccountStatement(selectedAccountId, fromDate, toDate);
      setStatementData(result);
    }
  }, [selectedAccountId, fromDate, toDate, accounts]);

  const handleSharePDF = async () => {
    if (!statementData?.account) return;
    setIsExporting(true);
    await downloadElementAsPDF('printable-statement-sheet', statementData.account.name);
    setIsExporting(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Search & Filter Header */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>📖 Account Milan & General Ledger Statement</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          <div>
            <label style={labelStyle}>Select Party / Account Head *</label>
            <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} style={inputStyle}>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.sub_group || 'LEDGER'})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>To Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <button 
          onClick={handleSharePDF}
          disabled={isExporting}
          style={{ width: '100%', backgroundColor: isExporting ? '#94a3b8' : '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: isExporting ? 'wait' : 'pointer' }}
        >
          {isExporting ? '⏳ Render Ho Raha Hai...' : '📲 Share & Download Statement PDF (WhatsApp / Local Save)'}
        </button>
      </div>

      {/* Dynamic Ledger Sheet */}
      <div id="printable-statement-sheet" style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
        <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '14px', textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#0f172a' }}>{firm?.legal_name || 'My Business Firm'}</div>
          <div style={{ fontSize: '11px', color: '#475569' }}>GSTIN: {firm?.gstin || 'Unregistered'}</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '6px', color: '#2563eb' }}>STATEMENT OF ACCOUNT / LEDGER MILAN</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', marginBottom: '14px', fontSize: '11px' }}>
          <div><strong>Account Name:</strong> {statementData?.account?.name || 'N/A'}</div>
          <div><strong>Period:</strong> {fromDate} to {toDate}</div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Voucher Ref</th>
              <th style={thStyle}>Particulars / Narration</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Debit (₹)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Credit (₹)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
              <td style={tdStyle}>{fromDate}</td>
              <td style={tdStyle}>OPENING</td>
              <td style={tdStyle}>Opening Balance B/F</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>-</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>-</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>₹{statementData?.summary?.openingBalance.toFixed(2)}</td>
            </tr>

            {statementData?.statementLines?.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>Selected period me koi naye transaction post nahi huye hain.</td></tr>
            ) : (
              statementData?.statementLines?.map(line => (
                <tr key={line.id}>
                  <td style={tdStyle}>{line.date}</td>
                  <td style={tdStyle}>{line.voucher_id}</td>
                  <td style={tdStyle}>{line.narration || 'General Ledger Entry'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: line.debit > 0 ? '#16a34a' : '#475569' }}>
                    {line.debit > 0 ? `₹${line.debit.toFixed(2)}` : '-'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: line.credit > 0 ? '#dc2626' : '#475569' }}>
                    {line.credit > 0 ? `₹${line.credit.toFixed(2)}` : '-'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                    ₹{line.runningBalance.toFixed(2)} {line.balanceType}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' };
const thStyle = { border: '1px solid #0f172a', padding: '7px', textAlign: 'left' };
const tdStyle = { border: '1px solid #cbd5e1', padding: '7px' };
