// frontend/src/components/PartyOutstandingView.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import { normalizeLedgerAccountMatch } from '../utils/voucherPostingEngine.js';

const getBaseName = (str = '') => {
  return String(str || '')
    .replace(/\s*\([\u0900-\u097F\s]+\)/g, '')
    .trim()
    .toLowerCase();
};

export default function PartyOutstandingView({ firm, onClose }) {
  const activeFirmId = firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  const [outstandingList, setOutstandingList] = useState([]);

  useEffect(() => {
    try {
      const accounts = getFirmMasterAccounts(activeFirmId) || [];
      const partyBalanceMap = new Map();

      // Helper to find or initialize party entry using resilient bilingual matching
      const resolvePartyEntry = (rawName, defaultCategory = 'PARTY') => {
        const cleanName = String(rawName || '').trim();
        if (!cleanName) return null;

        for (const [key, entry] of partyBalanceMap.entries()) {
          if (normalizeLedgerAccountMatch(cleanName, entry.originalName) || key === getBaseName(cleanName)) {
            return entry;
          }
        }

        const baseKey = getBaseName(cleanName) || cleanName.toLowerCase();
        const newEntry = {
          originalName: cleanName,
          category: defaultCategory,
          balance: 0
        };
        partyBalanceMap.set(baseKey, newEntry);
        return newEntry;
      };

      // 1. Load Master Accounts & Opening Balances
      accounts.forEach(acc => {
        const name = (acc.account_name || acc.name || '').trim();
        if (name) {
          const openBal = Number(acc.openingBalance || acc.opening_balance || 0);
          const isDebit = (acc.balanceType || acc.balance_type || 'Dr') === 'Dr';
          const balanceSign = isDebit ? openBal : -openBal;

          const entry = resolvePartyEntry(name, acc.sub_group || acc.group || acc.primary_type || 'PARTY');
          if (entry) {
            entry.originalName = name; // Prefer official bilingual master name
            entry.category = acc.sub_group || acc.group || acc.primary_type || 'PARTY';
            entry.balance = balanceSign;
          }
        }
      });

      // 2. Scan vouchers strictly scoped to activeFirmId
      let rawTx = [];
      const keys = [
        `app_vouchers_${activeFirmId}`,
        `account_book_vouchers_${activeFirmId}`,
        `sales_invoices_${activeFirmId}`,
        `purchase_bills_${activeFirmId}`,
        `app_payroll_entries_${activeFirmId}`
      ];

      keys.forEach(k => {
        try {
          const val = StorageService.getItem ? StorageService.getItem(k) : JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(val)) rawTx.push(...val);
        } catch (e) {}
      });

      // Deduplicate by voucher identity
      const uniqueMap = new Map();
      rawTx.forEach(v => {
        if (!v) return;
        const vFirm = String(v.firm_id || v.firmId || '').trim();
        if (vFirm && vFirm !== activeFirmId && vFirm !== 'FIRM-001' && activeFirmId !== 'FIRM-001') return;

        const uniqueId = v.id || v.reference_no || v.voucher_number || `${v.voucher_date || v.date}-${v.total_amount || v.amount || 0}`;
        if (!uniqueMap.has(uniqueId)) {
          uniqueMap.set(uniqueId, v);
        }
      });

      // 3. Process Transactions with Bilingual Mapping
      uniqueMap.forEach(v => {
        // Direct Payroll/Wages Entry
        if (v.worker && (v.total_amount || v.amount)) {
          const amt = Number(v.total_amount || v.amount || 0);
          if (amt > 0) {
            const entry = resolvePartyEntry(v.worker, 'WAGES WORKER');
            if (entry) entry.balance -= amt; // Credit liability
          }
          return;
        }

        // Structured Entries Array (Compound / Simple)
        if (Array.isArray(v.entries) && v.entries.length > 0) {
          v.entries.forEach(e => {
            const accName = (e.account_name || e.party || '').trim();
            if (!accName) return;

            const amt = Number(e.amount || e.debit || e.credit || 0);
            const isDr = (e.type || '').toUpperCase() === 'DR' || Number(e.debit || 0) > 0;
            const isCr = (e.type || '').toUpperCase() === 'CR' || Number(e.credit || 0) > 0;

            const entry = resolvePartyEntry(accName, 'GENERAL PARTY');
            if (entry) {
              if (isDr) entry.balance += amt;
              if (isCr) entry.balance -= amt;
            }
          });
        } 
        // Flat Dr/Cr Format
        else {
          const amt = Number(v.amount || v.total_amount || 0);
          if (amt <= 0) return;
          const dr = (v.dr_account || v.debit_account || '').trim();
          const cr = (v.cr_account || v.credit_account || '').trim();

          if (dr) {
            const entryDr = resolvePartyEntry(dr, 'PARTY');
            if (entryDr) entryDr.balance += amt;
          }
          if (cr) {
            const entryCr = resolvePartyEntry(cr, 'PARTY');
            if (entryCr) entryCr.balance -= amt;
          }
        }
      });

      const list = Array.from(partyBalanceMap.values())
        .filter(p => Math.abs(p.balance) > 0.01)
        .map(p => ({
          name: p.originalName,
          category: p.category,
          balance: p.balance
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setOutstandingList(list);
    } catch (e) {
      console.error("Error loading outstandings:", e);
    }
  }, [activeFirmId]);

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: '800px', margin: '0 auto', boxSizing: 'border-box', color: '#0f172a' }}>
      
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>⏳ Party Ledger Outstanding & Due List</h2>
          <span style={{ fontSize: '11px', color: '#64748b' }}>बकाया लेनदारी (Dr) व देनदारी (Cr) का समेकित विवरण</span>
        </div>
        {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Close</button>}
      </div>

      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#fff' }}>
                <th style={{ padding: '8px' }}>Party Name (पार्टी का नाम)</th>
                <th style={{ padding: '8px' }}>Type / Group</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Net Balance (बाकी राशि)</th>
              </tr>
            </thead>
            <tbody>
              {outstandingList.length === 0 ? (
                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>कोई बकाया खाता नहीं मिला (No Outstandings).</td></tr>
              ) : (
                outstandingList.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: '#0f172a' }}>{p.name}</td>
                    <td style={{ padding: '8px', color: '#64748b' }}>{p.category}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: p.balance >= 0 ? '#1d4ed8' : '#b91c1c' }}>
                      ₹{Math.abs(p.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {p.balance >= 0 ? 'Dr (लेना है)' : 'Cr (देना है)'}
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
