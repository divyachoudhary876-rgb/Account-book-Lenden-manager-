// frontend/src/components/AccountStatementView.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';

export default function AccountStatementView({ firm }) {
  const activeFirmId = firm?.id || firm?.firm_id || 'FIRM-001';
  const [accounts, setAccounts] = useState([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [statementData, setStatementData] = useState(null);

  const loadData = () => {
    try {
      const accList = getFirmMasterAccounts(activeFirmId) || [];
      setAccounts(accList);
      if (accList.length > 0 && !selectedParty) {
        setSelectedParty(accList[0].name || accList[0].account_name || '');
      }
    } catch (e) {
      console.error("Error loading accounts:", e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_storage_updated', loadData);
    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('app_storage_updated', loadData);
      window.removeEventListener('storage', loadData);
    };
  }, [activeFirmId]);

  useEffect(() => {
    if (!selectedParty) {
      setStatementData(null);
      return;
    }

    try {
      let rawTx = [];
      const keysToScan = [
        'account_book_vouchers',
        'app_vouchers',
        'vouchers',
        'transactions',
        'daybook',
        'app_payroll_entries',
        `account_book_vouchers_${activeFirmId}`,
        `app_vouchers_${activeFirmId}`,
        `app_payroll_entries_${activeFirmId}`
      ];

      keysToScan.forEach(k => {
        const val = StorageService.getItem ? StorageService.getItem(k) : JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(val)) rawTx.push(...val);
      });

      const targetClean = String(selectedParty).trim().toLowerCase();
      const matchedTransactions = [];

      rawTx.forEach(v => {
        if (!v) return;

        // यदि यह डायरेक्ट पेरोल एंट्री है
        if (v.worker && v.expense_ledger && v.total_amount) {
          if (String(v.worker).trim().toLowerCase() === targetClean) {
            matchedTransactions.push({
              date: v.date || '2026-09-13',
              voucher_type: 'PAY',
              voucher_number: v.id ? v.id.slice(-6) : '0000',
              narration: `Wages via ${v.expense_ledger} [Qty: ${v.quantity} x Rate: ${v.rate}] - ${v.description || ''}`,
              debit: 0,
              credit: Number(v.total_amount || 0)
            });
          }
          return;
        }

        // यदि यह वाउचर (entries array) है
        if (Array.isArray(v.entries) && v.entries.length > 0) {
          let partyDebit = 0;
          let partyCredit = 0;
          let isMatch = false;

          v.entries.forEach(e => {
            const accName = (e.account_name || e.party || '').trim();
            if (accName.toLowerCase() === targetClean) {
              isMatch = true;
              const amt = Number(e.amount || 0);
              const type = (e.type || '').toUpperCase();
              if (type === 'DR' || Number(e.debit || 0) > 0) partyDebit += amt;
              if (type === 'CR' || Number(e.credit || 0) > 0) partyCredit += amt;
            }
          });

          if (isMatch) {
            matchedTransactions.push({
              date: v.voucher_date || v.date || '2026-04-01',
              voucher_type: String(v.voucher_type || 'JV').toUpperCase(),
              voucher_number: v.reference_no || v.voucher_number || 'N/A',
              narration: v.narration || '',
              debit: partyDebit,
              credit: partyCredit
            });
          }
        }
      });

      matchedTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

      let runningBal = 0;
      const processedTransactions = matchedTransactions.map(t => {
        runningBal += (t.debit - t.credit);
        return {
          ...t,
          runningBalance: Math.abs(runningBal),
          balanceType: runningBal >= 0 ? 'Dr' : 'Cr'
        };
      });

      const lastClosing = processedTransactions.length > 0 
        ? processedTransactions[processedTransactions.length - 1] 
        : { runningBalance: 0, balanceType: 'Dr' };

      setStatementData({
        openingBalance: 0,
        openingType: 'Dr',
        closingBalance: lastClosing.runningBalance,
        closingType: lastClosing.balanceType,
        transactions: processedTransactions
      });

    } catch (e) {
      console.error("Error generating statement:", e);
    }
  }, [selectedParty, activeFirmId]);

  return (
    <div style={{ width: '100%', maxWidth: '750px', margin: '0 auto', padding: '12px', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '14px', border: '1px solid #cbd5e1', marginBottom: '14px' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '800' }}>📖 खाता मिलान (Account Statement)</h3>
        <SearchableAccountDropdown
          label="खाता चुनें (Select Party/Account) *"
          accounts={accounts}
          value={selectedParty}
          onChange={val => setSelectedParty(val)}
          placeholder="पार्टी का नाम खोजें..."
          required
        />
      </div>

      <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '14px', border: '1px solid #cbd5e1', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '10px' }}>तारीख</th>
              <th style={{ padding: '10px' }}>विवरण</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>नामे (Dr)</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>जमा (Cr)</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>बाकी (Balance)</th>
            </tr>
          </thead>
          <tbody>
            {!statementData || statementData.transactions.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  इस खाते में कोई लेन-देन दर्ज नहीं है।
                </td>
              </tr>
            ) : (
              statementData.transactions.map((t, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}>{t.date}</td>
                  <td style={{ padding: '10px' }}>{t.voucher_type} - {t.narration}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#059669', fontWeight: 'bold' }}>{t.debit > 0 ? t.debit.toFixed(2) : '-'}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#dc2626', fontWeight: 'bold' }}>{t.credit > 0 ? t.credit.toFixed(2) : '-'}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{t.runningBalance.toFixed(2)} {t.balanceType}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
