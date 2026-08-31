// frontend/src/components/AccountStatementView.jsx

import React, { useState, useEffect } from 'react';
import { 
  getAccountHeads, 
  getAccountLedgerStatement, 
  downloadCSVStatement 
} from '../utils/statementEngine.js';

export default function AccountStatementView({ firm, defaultAccount }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const firmName = firm?.legal_name || 'Aa (TRADING)';

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(defaultAccount || 'Diesel Account');
  const [fromDate, setFromDate] = useState('2026-08-01');
  const [toDate, setToDate] = useState('2026-08-31');
  const [statementData, setStatementData] = useState([]);

  useEffect(() => {
    const list = getAccountHeads(activeFirmId);
    setAccounts(list);
    if (!selectedAccount && list.length > 0) {
      setSelectedAccount(list[0].account_name);
    }
  }, [firm]);

  useEffect(() => {
    if (selectedAccount) {
      const logs = getAccountLedgerStatement(activeFirmId, selectedAccount, fromDate, toDate);
      setStatementData(logs);
    }
  }, [selectedAccount, fromDate, toDate, firm]);

  const handlePrintPDF = () => {
    window.print();
  };

  const handleDownloadExcel = () => {
    downloadCSVStatement(firmName, selectedAccount, statementData);
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>📖 Account Milan & General Ledger Statement</h3>
      </div>

      {/* Filter Options Panel - Full Width Fix */}
      <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Account Dropdown Container Fix */}
          <div style={{ width: '100%' }}>
            <label style={labelStyle}>Select Party / Account Head *</label>
            <select 
              value={selectedAccount} 
              onChange={e => setSelectedAccount(e.target.value)}
              style={dropdownStyle}
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.account_name}>
                  {acc.account_name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>From Date</label>
              <input 
                type="date" 
                value={fromDate} 
                onChange={e => setFromDate(e.target.value)} 
                style={inputStyle} 
              />
            </div>
            <div>
              <label style={labelStyle}>To Date</label>
              <input 
                type="date" 
                value={toDate} 
                onChange={e => setToDate(e.target.value)} 
                style={inputStyle} 
              />
            </div>
          </div>

        </div>
      </div>

      {/* Statement Header & Report Action Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>{firmName}</div>
          <h4 style={{ margin: '2px 0 0 0', color: '#1e40af', fontSize: '16px' }}>
            STATEMENT OF ACCOUNT: {selectedAccount}
          </h4>
        </div>

        {/* Download & Print Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={handleDownloadExcel}
            style={{ backgroundColor: '#10b981', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            📊 Export Excel/CSV
          </button>
          <button 
            onClick={handlePrintPDF}
            style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>

      {/* Statement Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Voucher Ref</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Particulars / Narration</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Debit (₹)</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Credit (₹)</th>
            </tr>
          </thead>
          <tbody>
            {statementData.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                  No transactions found for this account in the selected date range.
                </td>
              </tr>
            ) : (
              statementData.map((row, idx) => {
                const isDebit = row.dr_account === selectedAccount;
                return (
                  <tr key={row.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px' }}>{row.date || '2026-08-31'}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{row.id}</td>
                    <td style={{ padding: '10px' }}>{isDebit ? `To ${row.cr_account}` : `By ${row.dr_account}`}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: isDebit ? '#059669' : '#64748b' }}>
                      {isDebit ? `₹${parseFloat(row.amount).toFixed(2)}` : '-'}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: !isDebit ? '#dc2626' : '#64748b' }}>
                      {!isDebit ? `₹${parseFloat(row.amount).toFixed(2)}` : '-'}
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
const dropdownStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#ffffff', color: '#0f172a', boxSizing: 'border-box' };
const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };
