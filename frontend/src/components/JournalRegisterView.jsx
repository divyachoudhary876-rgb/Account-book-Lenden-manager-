// frontend/src/components/JournalRegisterView.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { downloadJournalRegisterPDF } from '../utils/pdfDownloadEngine.js';

export default function JournalRegisterView({ firm, onClose }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const firmName = firm?.legal_name || firm?.trade_name || firm?.name || 'Neelkanth Groups';

  const [journalEntries, setJournalEntries] = useState([]);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortOrder, setSortOrder] = useState('ASC');
  const [isExporting, setIsExporting] = useState(false);
  const [statusNotification, setStatusNotification] = useState(null);

  const loadJournal = () => {
    try {
      let rawTx = [];
      const primaryKeys = ['account_book_vouchers', 'vouchers', 'transactions', 'daybook'];
      
      primaryKeys.forEach(k => {
        const val = StorageService.getItem(k);
        if (Array.isArray(val)) rawTx.push(...val);
      });

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('voucher') || key.includes('transaction') || key.includes('entry'))) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) rawTx.push(...parsed);
              else if (parsed && typeof parsed === 'object') {
                if (Array.isArray(parsed.vouchers)) rawTx.push(...parsed.vouchers);
                if (Array.isArray(parsed.transactions)) rawTx.push(...parsed.transactions);
              }
            } catch (err) {}
          }
        }
      }

      const uniqueMap = new Map();
      rawTx.forEach(tx => {
        if (!tx) return;
        if (tx.firm_id && tx.firm_id !== activeFirmId) return;

        const uId = tx.id || tx.voucher_number || tx.reference_no || `${tx.voucher_date || tx.date}-${tx.amount}-${tx.dr_account || tx.dr_party}-${tx.cr_account || tx.cr_party}`;
        if (!uniqueMap.has(uId)) {
          uniqueMap.set(uId, {
            ...tx,
            voucher_date: tx.voucher_date || tx.date || new Date().toISOString().split('T')[0],
            voucher_type: String(tx.voucher_type || tx.type || 'TX').toUpperCase(),
            reference_no: tx.reference_no || tx.voucher_number || 'N/A',
            dr_account: tx.dr_account || tx.dr_party || tx.debit_account || 'Account',
            cr_account: tx.cr_account || tx.cr_party || tx.credit_account || 'Account',
            amount: parseFloat(tx.amount || tx.total_amount || 0)
          });
        }
      });

      const firmVouchers = Array.from(uniqueMap.values());

      const consumptions = StorageService.getItem('material_consumptions') || [];
      const firmConsumptions = consumptions
        .filter(c => c && c.firm_id === activeFirmId)
        .map(c => ({
          id: c.id || `CONS-${Date.now()}`,
          voucher_date: c.date || c.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          voucher_type: 'CONSUMPTION',
          reference_no: c.vehicle_ref || 'BATCH',
          dr_account: c.expense_account || 'Factory Production Expense',
          cr_account: 'Inventory Stock',
          amount: Number(c.total_value || 0),
          narration: `Material Consumption: ${(c.items || []).map(i => `${i.qty} ${i.unit} ${i.itemName}`).join(', ')}`,
          created_at: c.created_at || new Date().toISOString()
        }));

      const combined = [...firmVouchers, ...firmConsumptions].sort((a, b) => {
        const dateA = new Date(a.voucher_date || a.created_at || 0);
        const dateB = new Date(b.voucher_date || b.created_at || 0);
        return sortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
      });

      setJournalEntries(combined);
    } catch (err) {
      console.error("Error loading journal:", err);
    }
  };

  useEffect(() => {
    loadJournal();
    window.addEventListener('app_storage_updated', loadJournal);
    window.addEventListener('app_state_updated', loadJournal);
    return () => {
      window.removeEventListener('app_storage_updated', loadJournal);
      window.removeEventListener('app_state_updated', loadJournal);
    };
  }, [activeFirmId, sortOrder]);

  // Filtering by Date Range, Type, and Search query
  const filteredEntries = journalEntries.filter(entry => {
    if (!entry) return false;
    const vDate = entry.voucher_date || '';
    if (fromDate && vDate < fromDate) return false;
    if (toDate && vDate > toDate) return false;

    const typeMatch = filterType === 'ALL' || String(entry.voucher_type || '').toUpperCase() === filterType;
    const q = searchQuery.toLowerCase();
    const searchMatch = 
      (entry.reference_no && entry.reference_no.toLowerCase().includes(q)) ||
      (entry.dr_account && entry.dr_account.toLowerCase().includes(q)) ||
      (entry.cr_account && entry.cr_account.toLowerCase().includes(q)) ||
      (entry.narration && entry.narration.toLowerCase().includes(q));

    return typeMatch && searchMatch;
  });

  // Calculate separate Debit and Credit totals
  const totalDebit = filteredEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalCredit = totalDebit; // Double entry balance rule

  const handleExportPDF = async () => {
    if (filteredEntries.length === 0) {
      alert("⚠️ No journal records found to export.");
      return;
    }

    setIsExporting(true);
    setStatusNotification({ type: 'info', message: '⏳ Generating Journal PDF...' });

    try {
      const res = await downloadJournalRegisterPDF(firm, filteredEntries);
      if (res?.success) {
        setStatusNotification({ type: 'success', message: '✓ Journal PDF downloaded successfully!' });
      } else {
        setStatusNotification(null);
      }
    } catch (e) {
      setStatusNotification({ type: 'error', message: `❌ Export Failed: ${e.message}` });
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatusNotification(null), 5000);
    }
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', boxSizing: 'border-box', maxWidth: '950px', margin: '0 auto' }}>
      
      {/* Header Card */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '16px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>Chronological Audit Book</div>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>📖 General Journal / Daybook</h2>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
              style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {sortOrder === 'ASC' ? '📅 Oldest ➔ Newest' : '📅 Newest ➔ Oldest'}
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isExporting || filteredEntries.length === 0}
              style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', opacity: isExporting ? 0.7 : 1 }}
            >
              <span>📄</span> {isExporting ? 'Saving...' : 'Save PDF'}
            </button>

            {onClose && <button onClick={onClose} style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Close</button>}
          </div>
        </div>

        {statusNotification && (
          <div style={{ backgroundColor: statusNotification.type === 'error' ? '#fef2f2' : '#ecfdf5', color: statusNotification.type === 'error' ? '#991b1b' : '#065f46', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', marginBottom: '12px' }}>
            {statusNotification.message}
          </div>
        )}

        {/* Date Range & Search Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>From Date (से)</label>
            <input 
              type="date" 
              value={fromDate} 
              onChange={e => setFromDate(e.target.value)}
              style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>To Date (तक)</label>
            <input 
              type="date" 
              value={toDate} 
              onChange={e => setToDate(e.target.value)}
              style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Voucher Type</label>
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)} 
              style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '12px', fontWeight: '700', outline: 'none' }}
            >
              <option value="ALL">All Types</option>
              <option value="SALES">Sales</option>
              <option value="PURCHASE">Purchase</option>
              <option value="PAYMENT">Payment</option>
              <option value="RECEIPT">Receipt</option>
              <option value="CONSUMPTION">Consumption</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <input 
            type="text" 
            placeholder="🔍 Search account, ref no, narration..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Separate Debit & Credit Totals KPI Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '10px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase' }}>Total Debit (नामे)</div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: '#059669', marginTop: '2px' }}>₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase' }}>Total Credit (जमा)</div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: '#dc2626', marginTop: '2px' }}>₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>

      {/* Journal List Register */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredEntries.length === 0 ? (
          <div style={{ backgroundColor: '#fff', textAlign: 'center', padding: '40px', borderRadius: '16px', color: '#94a3b8', fontSize: '13px', border: '1px solid #e2e8f0' }}>
            No journal entries found matching criteria.
          </div>
        ) : (
          filteredEntries.map((entry, idx) => {
            const amt = Number(entry.amount || 0);
            const vType = String(entry.voucher_type || 'TX').toUpperCase();
            const badgeColor = vType === 'SALES' ? '#0284c7' : vType === 'PURCHASE' ? '#dc2626' : vType === 'CONSUMPTION' ? '#d97706' : '#059669';

            return (
              <div key={entry.id || idx} style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxSizing: 'border-box' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', color: '#475569' }}>{entry.voucher_date || ''}</span>
                    <span style={{ fontSize: '10px', backgroundColor: badgeColor, color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: '800' }}>{vType}</span>
                    <strong style={{ fontSize: '12px', color: '#0f172a' }}>{entry.reference_no || ''}</strong>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>
                    Dr: <span style={{ color: '#059669' }}>{entry.dr_account || 'Account'}</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                    Cr: <span style={{ color: '#dc2626' }}>{entry.cr_account || 'Account'}</span>
                  </div>

                  {entry.narration && (
                    <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>{entry.narration}</div>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a' }}>₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
