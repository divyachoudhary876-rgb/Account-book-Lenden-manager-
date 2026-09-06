import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';

export default function AccountStatementView({ firm, onClose }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const firmName = firm?.legal_name || firm?.name || 'Enterprise Profile';

  const [accountsList, setAccountsList] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [openingBalance, setOpeningBalance] = useState({ amount: 0, type: 'Dr' });
  const [closingBalance, setClosingBalance] = useState({ amount: 0, type: 'Cr' });
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = () => {
    try {
      // 1. Load Master Accounts
      const accs = getFirmMasterAccounts(activeFirmId) || [];
      setAccountsList(accs);
      if (accs.length > 0 && !selectedAccount) {
        setSelectedAccount(accs[0].name || accs[0].account_name);
      }
    } catch (err) {
      console.error("Error loading master accounts:", err);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_storage_updated', loadData);
    return () => window.removeEventListener('app_storage_updated', loadData);
  }, [activeFirmId]);

  // 2. Compute Ledger Entries for Selected Account
  useEffect(() => {
    if (!selectedAccount) return;

    try {
      const vouchers = StorageService.getItem('account_book_vouchers') || [];
      const firmVouchers = vouchers.filter(v => v && v.firm_id === activeFirmId);

      const matchedEntries = [];

      firmVouchers.forEach(v => {
        if (!v) return;
        const amt = Number(v.amount || 0);
        const dr = v.dr_account || '';
        const cr = v.cr_account || '';

        // Check if selected account is involved as Debit or Credit
        const isDr = dr.trim().toLowerCase() === selectedAccount.trim().toLowerCase();
        const isCr = cr.trim().toLowerCase() === selectedAccount.trim().toLowerCase();

        if (isDr || isCr) {
          matchedEntries.push({
            id: v.id || Math.random(),
            date: v.voucher_date || v.date || '2026-04-01',
            type: v.voucher_type || v.type || 'TX',
            refNo: v.reference_no || v.voucher_number || '',
            particulars: isDr ? `To ${cr || 'Account'}` : `By ${dr || 'Account'}`,
            narration: v.narration || '',
            debit: isDr ? amt : 0,
            credit: isCr ? amt : 0
          });
        }
      });

      // Sort chronologically by date
      matchedEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate Running Balances
      let runningBal = 0;
      let type = 'Dr';

      const processed = matchedEntries.map(entry => {
        runningBal += (entry.debit - entry.credit);
        return {
          ...entry,
          balance: Math.abs(runningBal),
          balanceType: runningBal >= 0 ? 'Dr' : 'Cr'
        };
      });

      setLedgerEntries(processed);

      if (processed.length > 0) {
        const last = processed[processed.length - 1];
        setClosingBalance({ amount: last.balance, type: last.balanceType });
      } else {
        setClosingBalance({ amount: 0, type: 'Dr' });
      }

    } catch (err) {
      console.error("Error computing ledger:", err);
    }
  }, [selectedAccount, activeFirmId]);

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      
      {/* Header Card */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '16px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>Double-Entry General Ledger</div>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>📖 खाता मिलान (Account Statement)</h2>
          </div>
          {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Close</button>}
        </div>

        {/* Account Selection Dropdown */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', display: 'block' }}>खाता चुनें (Select Party / Account) **</label>
          <select 
            value={selectedAccount} 
            onChange={e => setSelectedAccount(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #0284c7', backgroundColor: '#fff', fontSize: '13px', fontWeight: '700', outline: 'none' }}
          >
            <option value="">-- Choose Ledger Account --</option>
            {accountsList.map((acc, idx) => {
              const accName = acc.name || acc.account_name;
              return <option key={idx} value={accName}>{accName} ({acc.category || acc.type || 'General'})</option>;
            })}
          </select>
        </div>

        {/* Summary Balances */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Opening Balance</div>
            <div style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>₹0.00 Dr</div>
          </div>
          <div style={{ flex: 1, backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>Net Closing Balance</div>
            <div style={{ fontSize: '14px', fontWeight: '900', color: '#15803d', marginTop: '2px' }}>₹{closingBalance.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {closingBalance.type}</div>
          </div>
        </div>
      </div>

      {/* Ledger Register Table */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <div style={{ marginBottom: '14px' }}>
          <strong style={{ fontSize: '14px', color: '#0f172a', fontWeight: '800' }}>
            📋 Ledger Transactions for "{selectedAccount || 'Select Account'}" ({ledgerEntries.length})
          </strong>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {ledgerEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '13px' }}>
              No transactions found for this account.
            </div>
          ) : (
            ledgerEntries.map((entry, idx) => (
              <div key={entry.id || idx} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
                <div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>{entry.date}</span>
                    <span style={{ fontSize: '10px', backgroundColor: '#0284c7', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>{entry.type}</span>
                    <strong style={{ fontSize: '12px', color: '#0f172a' }}>{entry.refNo}</strong>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{entry.particulars}</div>
                  {entry.narration && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{entry.narration}</div>}
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  {entry.debit > 0 && <div style={{ fontSize: '13px', fontWeight: '800', color: '#059669' }}>Dr: ₹{entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>}
                  {entry.credit > 0 && <div style={{ fontSize: '13px', fontWeight: '800', color: '#dc2626' }}>Cr: ₹{entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>}
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginTop: '4px' }}>Bal: ₹{entry.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {entry.balanceType}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
