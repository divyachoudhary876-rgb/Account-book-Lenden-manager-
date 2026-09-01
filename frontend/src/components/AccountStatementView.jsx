// frontend/src/components/AccountStatementView.jsx

import React, { useState, useEffect } from 'react';
import { getAccountHeads, getAccountLedgerStatement, downloadCSVStatement } from '../utils/statementEngine.js';
import { downloadAccountStatementPDF } from '../utils/pdfDownloadEngine.js';

export default function AccountStatementView({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [statement, setStatement] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const loadData = () => {
    const list = getAccountHeads(activeFirmId);
    setAccounts(list);
    if (list.length > 0) {
      const target = selectedAccount || list[0].account_name;
      setSelectedAccount(target);
      setStatement(getAccountLedgerStatement(activeFirmId, target));
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_state_updated', loadData);
    return () => window.removeEventListener('app_state_updated', loadData);
  }, [activeFirmId, selectedAccount]);

  const handleExportPDF = async () => {
    if (!statement || statement.entries.length === 0) {
      alert("⚠️ No transactions to export.");
      return;
    }
    setIsExporting(true);
    try {
      await downloadAccountStatementPDF(statement, firm);
    } catch (err) {
      alert("Export Error: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '30px' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>📖 Account Milan & Ledger Statement</h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Double-Entry Ledger Reconciliation</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => downloadCSVStatement(statement, firm?.legal_name)} disabled={!statement || statement.entries.length === 0} style={{ backgroundColor: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
            📊 CSV
          </button>
          <button onClick={handleExportPDF} disabled={isExporting || !statement || statement.entries.length === 0} style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
            {isExporting ? '⏳ Saving...' : '📄 Download / Save PDF'}
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '14px 18px', border: '1px solid #cbd5e1' }}>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>Select Ledger Account</label>
        <select value={selectedAccount} onChange={e => { setSelectedAccount(e.target.value); setStatement(getAccountLedgerStatement(activeFirmId, e.target.value)); }} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
          {accounts.map(a => <option key={a.id} value={a.account_name}>{a.account_name} ({a.sub_group})</option>)}
        </select>
      </div>

      {statement && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px', border: '1px solid #cbd5e1', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '14px' }}>
            <div><strong style={{ fontSize: '16px' }}>{statement.accountName}</strong></div>
            <div style={{ textAlign: 'right', fontWeight: 'bold', color: statement.closingBalanceType === 'Dr' ? '#059669' : '#dc2626' }}>
              Closing: ₹{statement.closingBalance.toFixed(2)} {statement.closingBalanceType}
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                <th style={{ padding: '8px' }}>#</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Particulars</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Debit (₹)</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Credit (₹)</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              {statement.entries.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No entries found.</td></tr>
              ) : (
                statement.entries.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{e.index}</td>
                    <td style={{ padding: '8px' }}>{e.date}</td>
                    <td style={{ padding: '8px' }}>{e.voucher_type}</td>
                    <td style={{ padding: '8px' }}>{e.particulars}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#059669', fontWeight: 'bold' }}>{e.debit > 0 ? e.debit.toFixed(2) : '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626', fontWeight: 'bold' }}>{e.credit > 0 ? e.credit.toFixed(2) : '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>₹{e.running_balance.toFixed(2)} {e.balance_type}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
