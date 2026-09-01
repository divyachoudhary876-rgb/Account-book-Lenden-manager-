// frontend/src/components/AccountStatementView.jsx

import React, { useState, useEffect } from 'react';
import { 
  getAccountHeads, 
  getAccountLedgerStatement, 
  downloadCSVStatement 
} from '../utils/statementEngine.js';

export default function AccountStatementView({ firm, initialAccountName }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const firmName = firm?.legal_name || 'Neelkanth Int Udyog';

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(initialAccountName || '');
  const [statement, setStatement] = useState({
    transactions: [],
    netBalance: 0,
    balanceType: 'Cr',
    totalDebit: 0,
    totalCredit: 0
  });

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    window.addEventListener('accounts_master_updated', loadData);
    window.addEventListener('vouchers_updated', loadData);
    return () => {
      window.removeEventListener('storage', loadData);
      window.removeEventListener('accounts_master_updated', loadData);
      window.removeEventListener('vouchers_updated', loadData);
    };
  }, [firm, selectedAccount]);

  const loadData = () => {
    const list = getAccountHeads(activeFirmId);
    setAccounts(list);
    const target = selectedAccount || (list.length > 0 ? list[0].account_name : '');
    if (!selectedAccount && target) setSelectedAccount(target);
    if (target) {
      const data = getAccountLedgerStatement(activeFirmId, target);
      setStatement(data);
    }
  };

  const handleExport = () => {
    downloadCSVStatement(firmName, selectedAccount, statement);
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>📑 Account Milan / Party Ledger</h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Firm: {firmName}</span>
        </div>
        <button onClick={handleExport} style={{ backgroundColor: '#10b981', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
          📊 Export Statement CSV
        </button>
      </div>

      <div style={{ marginBottom: '14px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Select Account Head / Party *</label>
        <select 
          value={selectedAccount} 
          onChange={(e) => setSelectedAccount(e.target.value)} 
          style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#ffffff' }}
        >
          {accounts.map(acc => (
            <option key={acc.id} value={acc.account_name}>
              {acc.account_name} ({acc.account_group || 'GENERAL'})
            </option>
          ))}
        </select>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '500px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Particulars</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Debit (₹)</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Credit (₹)</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            {statement.transactions.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>No transactions recorded for this account.</td></tr>
            ) : (
              statement.transactions.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px' }}>{t.date}</td>
                  <td style={{ padding: '8px' }}>
                    <strong>{t.particulars}</strong>
                    {t.narration && <div style={{ fontSize: '10px', color: '#64748b' }}>{t.narration}</div>}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626' }}>{t.debit > 0 ? `₹${t.debit.toFixed(2)}` : '-'}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#059669' }}>{t.credit > 0 ? `₹${t.credit.toFixed(2)}` : '-'}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>₹{t.balance.toFixed(2)} {t.balanceType}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
