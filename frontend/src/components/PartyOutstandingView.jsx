// frontend/src/components/PartyOutstandingView.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';

export default function PartyOutstandingView({ firm, onClose }) {
  const activeFirmId = firm?.id || firm?.firm_id || 'FIRM-001';
  const [outstandingList, setOutstandingList] = useState([]);

  useEffect(() => {
    try {
      const accounts = getFirmMasterAccounts(activeFirmId) || [];
      const partyBalanceMap = {};

      // 1. Load Master Accounts & Opening Balances
      accounts.forEach(acc => {
        const name = (acc.name || acc.account_name || '').trim();
        if (name) {
          const openBal = Number(acc.openingBalance || acc.opening_balance || 0);
          const balanceSign = (acc.balanceType || acc.balance_type || 'Dr') === 'Cr' ? -openBal : openBal;
          partyBalanceMap[name.toLowerCase()] = {
            originalName: name,
            category: acc.group || acc.category || acc.primary_type || 'PARTY',
            balance: balanceSign
          };
        }
      });

      // 2. Scan all possible voucher keys
      let rawTx = [];
      const keys = [
        'account_book_vouchers',
        'app_vouchers',
        'app_payroll_entries',
        `account_book_vouchers_${activeFirmId}`,
        `app_vouchers_${activeFirmId}`
      ];
      keys.forEach(k => {
        try {
          const val = StorageService.getItem ? StorageService.getItem(k) : JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(val)) rawTx.push(...val);
        } catch (e) {}
      });

      // Deduplication
      const uniqueMap = new Map();
      rawTx.forEach(v => {
        if (!v) return;
        const vFirm = v.firm_id || activeFirmId;
        if (vFirm !== activeFirmId && vFirm !== 'FIRM-001' && activeFirmId !== 'FIRM-001') return;

        const uniqueId = v.id || v.reference_no || `${v.voucher_date || v.date}-${v.total_amount || v.amount || 0}`;
        if (!uniqueMap.has(uniqueId)) {
          uniqueMap.set(uniqueId, v);
        }
      });

      // 3. Process Vouchers & Transactions
      uniqueMap.forEach(v => {
        // Handle Direct Payroll/Wages Entry
        if (v.worker && v.total_amount) {
          const workerKey = String(v.worker).trim().toLowerCase();
          const amt = Number(v.total_amount || 0);
          if (amt > 0) {
            if (!partyBalanceMap[workerKey]) {
              partyBalanceMap[workerKey] = { originalName: v.worker.trim(), category: 'WAGES WORKER', balance: 0 };
            }
            partyBalanceMap[workerKey].balance -= amt; // Credit liability
          }
          return;
        }

        // Handle Structured Entries Array
        if (Array.isArray(v.entries) && v.entries.length > 0) {
          v.entries.forEach(e => {
            const accName = (e.account_name || e.party || '').trim();
            if (!accName) return;
            const key = accName.toLowerCase();
            const amt = Number(e.amount || e.debit || e.credit || 0);
            const isDr = (e.type || '').toUpperCase() === 'DR' || Number(e.debit || 0) > 0;
            const isCr = (e.type || '').toUpperCase() === 'CR' || Number(e.credit || 0) > 0;

            if (!partyBalanceMap[key]) {
              partyBalanceMap[key] = { originalName: accName, category: 'GENERAL PARTY', balance: 0 };
            }

            if (isDr) partyBalanceMap[key].balance += amt;
            if (isCr) partyBalanceMap[key].balance -= amt;
          });
        } 
        // Handle Flat Format
        else {
          const amt = Number(v.amount || v.total_amount || 0);
          if (amt <= 0) return;
          const dr = (v.dr_account || v.debit_account || '').trim();
          const cr = (v.cr_account || v.credit_account || '').trim();

          if (dr) {
            const dKey = dr.toLowerCase();
            if (!partyBalanceMap[dKey]) partyBalanceMap[dKey] = { originalName: dr, category: 'PARTY', balance: 0 };
            partyBalanceMap[dKey].balance += amt;
          }
          if (cr) {
            const cKey = cr.toLowerCase();
            if (!partyBalanceMap[cKey]) partyBalanceMap[cKey] = { originalName: cr, category: 'PARTY', balance: 0 };
            partyBalanceMap[cKey].balance -= amt;
          }
        }
      });

      const list = Object.values(partyBalanceMap)
        .filter(p => Math.abs(p.balance) > 0.01)
        .map(p => ({
          name: p.originalName,
          category: p.category,
          balance: p.balance
        }));

      setOutstandingList(list);
    } catch (e) {
      console.error("Error loading outstandings:", e);
    }
  }, [activeFirmId]);

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: '800px', margin: '0 auto', boxSizing: 'border-box', color: '#0f172a' }}>
      
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>â³ Party Ledger Outstanding & Due List</h2>
        {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Close</button>}
      </div>

      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#fff' }}>
                <th style={{ padding: '8px' }}>Party Name (à¤ªà¤¾à¤°à¥à¤Ÿà¥€ à¤•à¤¾ à¤¨à¤¾à¤®)</th>
                <th style={{ padding: '8px' }}>Type / Group</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Net Balance (à¤¬à¤¾à¤•à¥€ à¤°à¤¾à¤¶à¤¿)</th>
              </tr>
            </thead>
            <tbody>
              {outstandingList.length === 0 ? (
                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No outstandings found.</td></tr>
              ) : (
                outstandingList.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: '#0f172a' }}>{p.name}</td>
                    <td style={{ padding: '8px', color: '#64748b' }}>{p.category}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: p.balance >= 0 ? '#1d4ed8' : '#b91c1c' }}>
                      â‚¹{Math.abs(p.balance).toFixed(2)} {p.balance >= 0 ? 'Dr' : 'Cr'}
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
