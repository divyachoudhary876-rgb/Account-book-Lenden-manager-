// frontend/src/components/AccountStatementView.jsx

import React, { useState, useEffect } from 'react';
import { getAccountHeads, getAccountLedgerStatement, downloadCSVStatement } from '../utils/statementEngine.js';
import { downloadAccountStatementPDF } from '../utils/pdfDownloadEngine.js';

export default function AccountStatementView({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const firmName = firm?.legal_name || 'Enterprise Profile';

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [statement, setStatement] = useState(null);

  const loadData = () => {
    const list = getAccountHeads(activeFirmId);
    setAccounts(list);
    if (list.length > 0) {
      const target = selectedAccount || list[0].account_name;
      setSelectedAccount(target);
      const st = getAccountLedgerStatement(activeFirmId, target);
      setStatement(st);
    } else {
      setStatement(null);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_state_updated', loadData);
    return () => window.removeEventListener('app_state_updated', loadData);
  }, [activeFirmId, selectedAccount]);

  const handleAccountChange = (accName) => {
    setSelectedAccount(accName);
    const st = getAccountLedgerStatement(activeFirmId, accName);
    setStatement(st);
  };

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '30px' }}>
      
      {/* Control Header */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📖</span> Account Milan & Ledger Statement
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Real-time Double-Entry Ledger Reconciliation</span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => downloadCSVStatement(statement, firmName)}
            disabled={!statement || statement.entries.length === 0}
            style={{ backgroundColor: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: statement?.entries.length ? 'pointer' : 'not-allowed' }}
          >
            📊 CSV Export
          </button>
          <button
            onClick={() => downloadAccountStatementPDF && downloadAccountStatementPDF(statement, firm)}
            disabled={!statement || statement.entries.length === 0}
            style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: statement?.entries.length ? 'pointer' : 'not-allowed' }}
          >
            📄 PDF Statement
          </button>
        </div>
      </div>

      {/* Account Selector */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '14px 18px', border: '1px solid #cbd5e1' }}>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
          Select Ledger Account (खाता चुनें)
        </label>
        <select
          value={selectedAccount}
          onChange={e => handleAccountChange(e.target.value)}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#f8fafc', color: '#0f172a' }}
        >
          {accounts.map(a => (
            <option key={a.id} value={a.account_name}>
              {a.account_name} ({a.sub_group})
            </option>
          ))}
        </select>
      </div>

      {/* Statement Table */}
      {statement && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            <div>
              <strong style={{ fontSize: '16px', color: '#0f172a' }}>{statement.accountName}</strong>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Group: {statement.subGroup}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Opening Balance: ₹{statement.openingBalance.toFixed(2)} {statement.openingBalanceType}</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: statement.closingBalanceType === 'Dr' ? '#059669' : '#dc2626' }}>
                Closing: ₹{statement.closingBalance.toFixed(2)} {statement.closingBalanceType}
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '8px', textAlign: 'center' }}>#</th>
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
                  <tr>
                    <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                      No voucher transactions recorded for this account head yet.
                    </td>
                  </tr>
                ) : (
                  statement.entries.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>{e.index}</td>
                      <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>{e.date}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                          {e.voucher_type}
                        </span>
                      </td>
                      <td style={{ padding: '8px', fontWeight: '600', color: '#1e293b' }}>
                        {e.particulars}
                        {e.narration && <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'normal' }}>{e.narration}</div>}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#059669', fontWeight: 'bold' }}>
                        {e.debit > 0 ? e.debit.toFixed(2) : '-'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626', fontWeight: 'bold' }}>
                        {e.credit > 0 ? e.credit.toFixed(2) : '-'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                        ₹{e.running_balance.toFixed(2)} <span style={{ fontSize: '10px', color: '#64748b' }}>{e.balance_type}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
