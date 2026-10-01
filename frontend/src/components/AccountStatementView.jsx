// frontend/src/components/AccountStatementView.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';
import { downloadAccountStatementPDF } from '../utils/pdfDownloadEngine.js';

export default function AccountStatementView({ firm }) {
  const activeFirmId = firm?.id || firm?.firm_id || 'FIRM-001';
  const firmName = firm?.legal_name || firm?.trade_name || firm?.name || 'Neelkanth Groups';
  const todayMaxDate = new Date().toISOString().split('T')[0];

  const [accounts, setAccounts] = useState([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statementData, setStatementData] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [statusNotification, setStatusNotification] = useState(null);

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
    window.addEventListener('app_state_updated', loadData);
    window.addEventListener('app_storage_updated', loadData);
    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('app_state_updated', loadData);
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
      const targetClean = String(selectedParty).trim().toLowerCase();

      // 1. Fetch Master Opening Balance with deep backup scan
      let masterOpeningAmt = 0;
      let masterOpeningSign = 'Dr';
      try {
        const possibleAccountKeys = [
          `account_heads_${activeFirmId}`,
          'app_accounts',
          'account_heads',
          'accounts_list',
          `app_accounts_${activeFirmId}`
        ];
        
        let savedHeads = [];
        possibleAccountKeys.forEach(pk => {
          const val = localStorage.getItem(pk);
          if (val) {
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) savedHeads.push(...parsed);
            } catch (e) {}
          }
        });

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('account') || key.includes('ledger') || key.includes('party') || key.includes('backup'))) {
            const raw = localStorage.getItem(key);
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) savedHeads.push(...parsed);
                else if (parsed && typeof parsed === 'object') {
                  Object.values(parsed).forEach(sub => {
                    if (Array.isArray(sub)) savedHeads.push(...sub);
                  });
                }
              } catch (e) {}
            }
          }
        }

        const foundHead = savedHeads.find(a => String(a.name || a.account_name || '').trim().toLowerCase() === targetClean);
        if (foundHead) {
          masterOpeningAmt = Number(foundHead.openingBalance || foundHead.opening_balance || 0);
          masterOpeningSign = foundHead.balanceType || foundHead.balance_type || 'Dr';
        }
      } catch (err) {
        console.error("Error reading master opening balance:", err);
      }

      let initialOpeningSum = masterOpeningSign === 'Cr' ? -masterOpeningAmt : masterOpeningAmt;

      // 2. Fetch all transactions with robust backup scan & scoped keys support
      let rawTx = [];
      const keysToScan = [
        'account_book_vouchers',
        'app_vouchers',
        'transactions',
        'app_payroll_entries',
        'daybook',
        'journal_entries',
        `account_book_vouchers_${activeFirmId}`,
        `app_vouchers_${activeFirmId}`,
        `app_payroll_entries_${activeFirmId}`,
        'account_book_vouchers_default_firm_id'
      ];

      keysToScan.forEach(k => {
        try {
          const val = StorageService.getItem ? StorageService.getItem(k) : JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(val)) rawTx.push(...val);
        } catch (e) {}
      });

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('voucher') || key.includes('transaction') || key.includes('daybook') || key.includes('backup') || key.includes('journal') || key.includes('book') || key.includes('payroll'))) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                rawTx.push(...parsed);
              } else if (parsed && typeof parsed === 'object') {
                if (Array.isArray(parsed.vouchers)) rawTx.push(...parsed.vouchers);
                if (Array.isArray(parsed.transactions)) rawTx.push(...parsed.transactions);
                if (parsed.data && typeof parsed.data === 'object') {
                  Object.values(parsed.data).forEach(sub => {
                    if (Array.isArray(sub)) rawTx.push(...sub);
                  });
                }
                Object.values(parsed).forEach(sub => {
                  if (Array.isArray(sub)) rawTx.push(...sub);
                });
              }
            } catch (err) {}
          }
        }
      }

      const uniqueVoucherMap = new Map();
      rawTx.forEach(v => {
        if (!v) return;
        const vFirm = v.firm_id || activeFirmId;
        if (vFirm !== activeFirmId && vFirm !== 'FIRM-001' && activeFirmId !== 'FIRM-001') return;

        const uniqueId = v.id || v.reference_no || `${v.voucher_date || v.date}-${v.total_amount || v.amount || 0}-${v.dr_account || ''}-${v.cr_account || ''}`;
        if (!uniqueVoucherMap.has(uniqueId)) {
          uniqueVoucherMap.set(uniqueId, v);
        }
      });

      const uniqueVouchers = Array.from(uniqueVoucherMap.values());
      const allParsedTransactions = [];

      uniqueVouchers.forEach(v => {
        const vDate = v.voucher_date || v.date || '2026-04-01';
        const vType = String(v.voucher_type || v.type || 'JV').toUpperCase();
        const vNum = v.reference_no || v.voucher_number || (v.id ? String(v.id).slice(-6) : 'N/A');
        const narration = v.narration || v.notes || v.description || '';

        // A. Handle Worker / Payroll / Attendance Entries
        const workerName = (v.worker || v.worker_name || '').trim();
        const expenseLedger = (v.expense_ledger || '').trim();
        const wageAmount = Number(v.total_amount || v.amount || 0);

        if (workerName && wageAmount > 0) {
          const isWorkerMatch = workerName.toLowerCase() === targetClean;
          const isExpenseMatch = expenseLedger.toLowerCase() === targetClean;
          const workInfo = `[Qty: ${v.quantity || 0} x Rate: ${v.rate || 0}]`;

          if (isWorkerMatch) {
            allParsedTransactions.push({
              date: vDate,
              voucher_type: vType === 'PAY' ? 'PAY' : 'JV',
              voucher_number: vNum,
              narration: `Work/Wages via ${expenseLedger || 'Expense'} ${workInfo}${narration ? ' - ' + narration : ''}`,
              debit: 0,
              credit: wageAmount
            });
          } else if (isExpenseMatch) {
            allParsedTransactions.push({
              date: vDate,
              voucher_type: vType,
              voucher_number: vNum,
              narration: `Wages credited to worker ${workerName} ${workInfo}${narration ? ' - ' + narration : ''}`,
              debit: wageAmount,
              credit: 0
            });
          }
          return;
        }

        // B. Handle Structured Double-Entry Vouchers (entries array)
        if (Array.isArray(v.entries) && v.entries.length > 0) {
          let partyDebit = 0;
          let partyCredit = 0;
          let isMatch = false;
          let otherParties = [];

          v.entries.forEach(e => {
            const accName = (e.account_name || e.party || '').trim();
            const amt = Number(e.amount || e.debit || e.credit || 0);
            const type = (e.type || '').toUpperCase();
            
            if (accName.toLowerCase() === targetClean) {
              isMatch = true;
              if (type === 'DR' || Number(e.debit || 0) > 0) partyDebit += amt;
              if (type === 'CR' || Number(e.credit || 0) > 0) partyCredit += amt;
            } else if (accName) {
              otherParties.push(accName);
            }
          });

          if (isMatch) {
            let itemDisplayInfo = '';
            if (Array.isArray(v.items) && v.items.length > 0) {
              itemDisplayInfo = v.items.map(it => `${it.itemName || it.name || 'Item'} (Qty: ${it.qty || it.quantity || 0} ${it.unit || 'Pcs'} @ ₹${it.rate || 0})`).join(', ');
            }

            const contraName = otherParties.length > 0 ? `Contra: ${otherParties.join(', ')}` : '';
            const finalNarr = [contraName, itemDisplayInfo, narration].filter(Boolean).join(' | ');

            allParsedTransactions.push({
              date: vDate,
              voucher_type: vType,
              voucher_number: vNum,
              narration: finalNarr,
              debit: partyDebit,
              credit: partyCredit
            });
          }
          return;
        }

        // C. Handle Standard Dr/Cr Vouchers (Purchase, Sales, Payment, Receipt)
        const drAcc = (v.dr_account || v.debit_account || '').trim();
        const crAcc = (v.cr_account || v.credit_account || '').trim();
        const amt = Number(v.amount || v.total_amount || 0);
        if (amt <= 0) return;

        const isDrMatch = drAcc.toLowerCase() === targetClean;
        const isCrMatch = crAcc.toLowerCase() === targetClean;

        if (isDrMatch || isCrMatch) {
          let opposingParty = isDrMatch ? (crAcc ? `To ${crAcc}` : '') : (drAcc ? `By ${drAcc}` : '');
          
          let itemDisplayInfo = '';
          if (Array.isArray(v.items) && v.items.length > 0) {
            itemDisplayInfo = v.items.map(it => `${it.itemName || it.name || 'Item'} (Qty: ${it.qty || it.quantity || 0} ${it.unit || 'Pcs'} @ ₹${it.rate || 0})`).join(', ');
          } else if (v.itemName || v.item_name || v.qty || v.quantity) {
            const itName = v.itemName || v.item_name || 'Item';
            const itQty = v.qty || v.quantity || 0;
            const itUnit = v.unit || 'Pcs';
            const itRate = v.rate || v.unit_rate || 0;
            itemDisplayInfo = `${itName} (Qty: ${itQty} ${itUnit} @ ₹${itRate})`;
          }

          let descParts = [];
          if (opposingParty) descParts.push(opposingParty);
          if (itemDisplayInfo) descParts.push(itemDisplayInfo);
          if (narration && !narration.toLowerCase().includes(opposingParty.toLowerCase())) {
            descParts.push(narration);
          }

          allParsedTransactions.push({
            date: vDate,
            voucher_type: vType,
            voucher_number: vNum,
            narration: descParts.join(' | '),
            debit: isDrMatch ? amt : 0,
            credit: isCrMatch ? amt : 0
          });
        }
      });

      allParsedTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

      let runningBal = initialOpeningSum;
      const filteredTransactions = [];

      allParsedTransactions.forEach(t => {
        if (fromDate && t.date < fromDate) {
          runningBal += (t.debit - t.credit);
        } else if (toDate && t.date > toDate) {
          // Skip
        } else {
          filteredTransactions.push(t);
        }
      });

      const finalOpeningBalance = Math.abs(runningBal);
      const finalOpeningType = runningBal >= 0 ? 'Dr' : 'Cr';

      const processedTransactions = filteredTransactions.map(t => {
        runningBal += (t.debit - t.credit);
        return {
          ...t,
          runningBalance: Math.abs(runningBal),
          balanceType: runningBal >= 0 ? 'Dr' : 'Cr'
        };
      });

      const lastClosing = processedTransactions.length > 0 
        ? processedTransactions[processedTransactions.length - 1] 
        : { runningBalance: finalOpeningBalance, balanceType: finalOpeningType };

      setStatementData({
        openingBalance: finalOpeningBalance,
        openingType: finalOpeningType,
        closingBalance: lastClosing.runningBalance,
        closingType: lastClosing.balanceType,
        transactions: processedTransactions
      });

    } catch (e) {
      console.error("Error generating account statement:", e);
    }
  }, [selectedParty, fromDate, toDate, activeFirmId]);

  const handleExportPDF = async () => {
    if (!statementData || statementData.transactions.length === 0) {
      alert("⚠ No transactions found to export.");
      return;
    }

    setIsExporting(true);
    setStatusNotification({ type: 'info', message: '⏳ Generating PDF document...' });

    try {
      const res = await downloadAccountStatementPDF(statementData, selectedParty, firm);
      if (res?.success) {
        setStatusNotification({ type: 'success', message: '✓ PDF downloaded successfully!' });
      }
    } catch (e) {
      setStatusNotification({ type: 'error', message: `❌ Export Failed: ${e.message}` });
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatusNotification(null), 4000);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '650px', margin: '0 auto', boxSizing: 'border-box', padding: '0 4px 50px 4px', display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
              📖 खाता मिलान (Account Statement)
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Double-Entry General Ledger & Real-Time Balance</span>
          </div>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExporting || !statementData || statementData.transactions.length === 0}
            style={{ backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '7px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            <span>📄</span> {isExporting ? 'Saving...' : 'Save PDF'}
          </button>
        </div>
      </div>

      {statusNotification && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold' }}>
          {statusNotification.message}
        </div>
      )}

      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <SearchableAccountDropdown
          label="खाता चुनें (Select Party/Account) *"
          accounts={accounts}
          value={selectedParty}
          onChange={val => setSelectedParty(val)}
          placeholder="पार्टी का नाम खोजें..."
          colorAccent="#0284c7"
          required
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>From Date (से)</label>
            <input 
              type="date" 
              max={todayMaxDate}
              value={fromDate} 
              onChange={e => setFromDate(e.target.value)} 
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box', backgroundColor: '#fff', color: '#0f172a' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>To Date (तक)</label>
            <input 
              type="date" 
              max={todayMaxDate}
              value={toDate} 
              onChange={e => setToDate(e.target.value)} 
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box', backgroundColor: '#fff', color: '#0f172a' }} 
            />
          </div>
        </div>
      </div>

      {statementData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ ...cardStyle, backgroundColor: '#f8fafc' }}>
            <div style={labelStyle}>OPENING BALANCE</div>
            <strong style={{ fontSize: '15px', color: '#0f172a' }}>
              ₹{statementData.openingBalance.toLocaleString('en-IN')} {statementData.openingType}
            </strong>
          </div>
          <div style={{ ...cardStyle, backgroundColor: statementData.closingType === 'Dr' ? '#eff6ff' : '#fef2f2' }}>
            <div style={labelStyle}>NET CLOSING BALANCE</div>
            <strong style={{ fontSize: '15px', color: statementData.closingType === 'Dr' ? '#1d4ed8' : '#b91c1c' }}>
              ₹{statementData.closingBalance.toLocaleString('en-IN')} {statementData.closingType}
            </strong>
          </div>
        </div>
      )}

      <div style={{ ...cardStyle, padding: '12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={thStyle}>तारीख</th>
              <th style={thStyle}>विवरण (Particulars)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>नामे (Dr ₹)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>जमा (Cr ₹)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>बाकी (Balance ₹)</th>
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
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={tdStyle}>{t.date}</td>
                  <td style={tdStyle}>
                    <strong>{t.voucher_type}</strong> #{t.voucher_number}
                    {t.narration && <div style={{ color: '#0284c7', fontSize: '11px', fontWeight: '600', marginTop: '2px' }}>{t.narration}</div>}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: t.debit > 0 ? '#059669' : '#94a3b8', fontWeight: t.debit > 0 ? 'bold' : 'normal' }}>
                    {t.debit > 0 ? t.debit.toFixed(2) : '-'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: t.credit > 0 ? '#dc2626' : '#94a3b8', fontWeight: t.credit > 0 ? 'bold' : 'normal' }}>
                    {t.credit > 0 ? t.credit.toFixed(2) : '-'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', color: t.balanceType === 'Dr' ? '#1d4ed8' : '#b91c1c' }}>
                    {t.runningBalance.toFixed(2)} {t.balanceType}
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

const cardStyle = { backgroundColor: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' };
const labelStyle = { fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' };
const thStyle = { padding: '8px', fontWeight: 'bold' };
const tdStyle = { padding: '8px', verticalAlign: 'top' };
