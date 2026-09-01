// frontend/src/components/AccountStatementView.jsx

import React, { useState, useEffect } from 'react';
import { getAccountHeads, getAccountLedgerStatement, downloadCSVStatement } from '../utils/statementEngine.js';

export default function AccountStatementView({ firm, initialAccountName }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const firmName = firm?.legal_name || 'Neelkanth Enterprise';

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(initialAccountName || '');
  const [statement, setStatement] = useState({ transactions: [], netBalance: 0, balanceType: 'Dr', totalDebit: 0, totalCredit: 0 });

  const loadStatement = () => {
    const list = getAccountHeads(activeFirmId);
    setAccounts(list);
    const target = selectedAccount || (list.length > 0 ? list[0].account_name : '');
    if (!selectedAccount && target) setSelectedAccount(target);
    if (target) {
      const data = getAccountLedgerStatement(activeFirmId, target);
      setStatement(data);
    }
  };

  useEffect(() => {
    loadStatement();
    window.addEventListener('app_state_updated', loadStatement);
    return () => window.removeEventListener('app_state_updated', loadStatement);
  }, [firm, activeFirmId, selectedAccount]);

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>📑 Account Milan / Party Ledger</h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Firm: {firmName}</span>
        </div>
        <button onClick={() => downloadCSVStatement(firmName, selectedAccount, statement)} style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
          📊 Export Statement CSV
        </button>
      </div>

      <div style={{ marginBottom: '14px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Select Party / Account Head *</label>
        <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#ffffff', fontWeight: 'bold' }}>
          {accounts.map(acc => <option key={acc.id} value={acc.account_name}>{acc.account_name} ({acc.sub_group || acc.primary_type})</option>)}
        </select>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '550px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Particulars</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Debit (Dr)</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Credit (Cr)</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Running Balance</th>
            </tr>
          </thead>
          <tbody>
            {statement.transactions.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>No entries found for this party.</td></tr>
            ) : (
              statement.transactions.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>{t.date}</td>
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
