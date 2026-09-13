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
      let vouchers = [];
      const keys = ['account_book_vouchers', `account_book_vouchers_${activeFirmId}`];
      keys.forEach(k => {
        const val = StorageService.getItem(k);
        if (Array.isArray(val)) vouchers.push(...val);
      });

      const partyBalanceMap = {};
      accounts.forEach(acc => {
        const name = (acc.name || acc.account_name || '').trim();
        if (name) {
          partyBalanceMap[name] = { name, category: acc.category || acc.primary_type || 'PARTY', balance: 0 };
        }
      });

      vouchers.forEach(v => {
        if (!v) return;
        const amt = Number(v.amount || v.total_amount || 0);
        const dr = (v.dr_account || '').trim();
        const cr = (v.cr_account || '').trim();

        if (dr && partyBalanceMap[dr]) partyBalanceMap[dr].balance += amt;
        if (cr && partyBalanceMap[cr]) partyBalanceMap[cr].balance -= amt;
      });

      const list = Object.values(partyBalanceMap).filter(p => Math.abs(p.balance) > 0);
      setOutstandingList(list);
    } catch (e) {
      console.error("Error loading outstandings:", e);
    }
  }, [activeFirmId]);

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>⏳ Party Ledger Outstanding & Due List</h2>
        {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Close</button>}
      </div>

      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#fff' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Party Name (पार्टी का नाम)</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Type</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Net Balance (बाकी राशि)</th>
            </tr>
          </thead>
          <tbody>
            {outstandingList.length === 0 ? (
              <tr><td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No outstandings found.</td></tr>
            ) : (
              outstandingList.map((p, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#0f172a' }}>{p.name}</td>
                  <td style={{ padding: '10px', color: '#64748b' }}>{p.category}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: p.balance >= 0 ? '#1d4ed8' : '#b91c1c' }}>
                    ₹{Math.abs(p.balance).toFixed(2)} {p.balance >= 0 ? 'Dr' : 'Cr'}
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
