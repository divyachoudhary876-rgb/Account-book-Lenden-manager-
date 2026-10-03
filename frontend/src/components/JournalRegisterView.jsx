// frontend/src/components/JournalRegisterView.jsx

import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { loadFirmData } from '../utils/firmIsolationEngine';
import { downloadJournalRegisterPDF } from '../utils/pdfDownloadEngine.js';

export default function JournalRegisterView({ firm, onClose }) {
  const activeFirmId = firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  const todayMaxDate = new Date().toISOString().split('T')[0];

  const [journalEntries, setJournalEntries] = useState([]);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [isExporting, setIsExporting] = useState(false);
  const [statusNotification, setStatusNotification] = useState(null);

  const loadJournal = () => {
    try {
      const rawInventory = loadFirmData('inventory_items', firm, []);
      const inventoryMap = new Map();
      rawInventory.forEach(inv => {
        if (!inv) return;
        const id = String(inv.id || '').trim();
        const name = String(inv.item_name || inv.itemName || inv.name || '').trim().toLowerCase();
        const unit = inv.unit || 'Pcs';
        if (id) inventoryMap.set(id, unit);
        if (name) inventoryMap.set(name, unit);
      });

      let rawTx = [];
      // STRICT FIRM ISOLATION: No global keys scanned
      const keysToScan = [
        `account_book_vouchers_${activeFirmId}`,
        `app_vouchers_${activeFirmId}`,
        `app_payroll_entries_${activeFirmId}`
      ];

      keysToScan.forEach(k => {
        try {
          const val = StorageService.getItem ? StorageService.getItem(k) : JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(val)) rawTx.push(...val);
        } catch (e) {}
      });

      const uniqueMap = new Map();
      rawTx.forEach(tx => {
        if (!tx) return;
        const vFirm = String(tx.firm_id || tx.firmId || '').trim();
        if (vFirm && vFirm !== String(activeFirmId).trim()) return;

        const uId = tx.id || tx.reference_no || `${tx.voucher_date || tx.date}-${Math.random()}`;
        if (!uniqueMap.has(uId)) {
          let drAcc = 'Account';
          let crAcc = 'Account';
          let totalAmt = Number(tx.amount || tx.total_amount || 0);

          if (Array.isArray(tx.entries) && tx.entries.length >= 2) {
            const dr = tx.entries.find(e => (e.type || '').toUpperCase() === 'DR' || Number(e.debit || 0) > 0);
            const cr = tx.entries.find(e => (e.type || '').toUpperCase() === 'CR' || Number(e.credit || 0) > 0);
            if (dr) drAcc = (dr.account_name || dr.party || 'Account').trim();
            if (cr) crAcc = (cr.account_name || cr.party || 'Account').trim();
            if (totalAmt <= 0) totalAmt = Number(dr?.amount || dr?.debit || 0);
          } else {
            drAcc = (tx.dr_account || tx.debit_account || tx.expense_ledger || 'Account').trim();
            crAcc = (tx.cr_account || tx.credit_account || tx.worker || 'Account').trim();
          }

          let itemDetailsList = [];
          if (Array.isArray(tx.items) && tx.items.length > 0) {
            itemDetailsList = tx.items.map(it => {
              const itName = it.itemName || it.name || it.item_name || 'Item';
              const itId = String(it.itemId || it.item_id || it.id || '').trim();
              
              let resolvedUnit = it.unit || 'Pcs';
              if (itId && inventoryMap.has(itId)) {
                resolvedUnit = inventoryMap.get(itId);
              } else if (itName && inventoryMap.has(itName.trim().toLowerCase())) {
                resolvedUnit = inventoryMap.get(itName.trim().toLowerCase());
              }

              return {
                itemName: itName,
                qty: Number(it.qty || it.quantity || 0),
                rate: Number(it.rate || it.unit_rate || 0),
                unit: resolvedUnit,
                total: Number(it.total || (Number(it.qty || it.quantity || 0) * Number(it.rate || it.unit_rate || 0)))
              };
            });
          } else if (tx.itemName || tx.item_name || tx.qty || tx.quantity) {
            const itName = tx.itemName || tx.item_name || 'Item';
            const itId = String(tx.itemId || tx.item_id || '').trim();
            
            let resolvedUnit = tx.unit || 'Pcs';
            if (itId && inventoryMap.has(itId)) {
              resolvedUnit = inventoryMap.get(itId);
            } else if (itName && inventoryMap.has(itName.trim().toLowerCase())) {
              resolvedUnit = inventoryMap.get(itName.trim().toLowerCase());
            }

            itemDetailsList = [{
              itemName: itName,
              qty: Number(tx.qty || tx.quantity || 0),
              rate: Number(tx.rate || tx.unit_rate || 0),
              unit: resolvedUnit,
              total: totalAmt
            }];
          }

          uniqueMap.set(uId, {
            ...tx,
            voucher_date: tx.voucher_date || tx.date || todayMaxDate,
            voucher_type: String(tx.voucher_type || tx.type || 'JV').toUpperCase(),
            reference_no: tx.reference_no || tx.voucher_number || (tx.id ? tx.id.slice(-6) : '1001'),
            dr_account: drAcc,
            cr_account: crAcc,
            amount: totalAmt,
            items: itemDetailsList
          });
        }
      });

      const sorted = Array.from(uniqueMap.values()).sort((a, b) => {
        const dateA = new Date(a.voucher_date || 0);
        const dateB = new Date(b.voucher_date || 0);
        return sortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
      });

      setJournalEntries(sorted);
    } catch (err) {
      console.error("Error loading journal:", err);
    }
  };

  useEffect(() => {
    loadJournal();
    window.addEventListener('app_storage_updated', loadJournal);
    window.addEventListener('storage', loadJournal);
    return () => {
      window.removeEventListener('app_storage_updated', loadJournal);
      window.removeEventListener('storage', loadJournal);
    };
  }, [activeFirmId, sortOrder, firm]);

  const filteredEntries = journalEntries.filter(entry => {
    if (!entry) return false;
    const vDate = entry.voucher_date || '';
    
    if (fromDate && vDate && vDate < fromDate) return false;
    if (toDate && vDate && vDate > toDate) return false;

    const entryType = String(entry.voucher_type || 'JV').toUpperCase();
    let typeMatch = true;
    if (filterType && filterType !== 'ALL') {
      const f = filterType.toUpperCase();
      if (f === 'PAY' || f === 'PAYMENT') {
        typeMatch = entryType.includes('PAY');
      } else if (f === 'REC' || f === 'RECEIPT') {
        typeMatch = entryType.includes('REC');
      } else if (f === 'JV' || f === 'JOURNAL') {
        typeMatch = entryType.includes('JV') || entryType.includes('JOURNAL');
      } else if (f === 'CONTRA') {
        typeMatch = entryType.includes('CONTRA');
      } else {
        typeMatch = entryType === f;
      }
    }
    
    const q = (searchQuery || '').toLowerCase();
    const searchMatch = !q || 
      (entry.reference_no && String(entry.reference_no).toLowerCase().includes(q)) ||
      (entry.dr_account && entry.dr_account.toLowerCase().includes(q)) ||
      (entry.cr_account && entry.cr_account.toLowerCase().includes(q)) ||
      (entry.narration && entry.narration.toLowerCase().includes(q)) ||
      (entry.items && entry.items.some(i => i.itemName.toLowerCase().includes(q)));

    return typeMatch && searchMatch;
  });

  const totalDebit = filteredEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalCredit = totalDebit;

  const handleExportPDF = async () => {
    if (filteredEntries.length === 0) {
      alert("⚠️ No records found to export.");
      return;
    }

    setIsExporting(true);
    setStatusNotification({ type: 'info', message: '⏳ Generating PDF...' });

    try {
      await downloadJournalRegisterPDF(firm, filteredEntries);
      setStatusNotification({ type: 'success', message: '✓ PDF downloaded successfully!' });
    } catch (e) {
      setStatusNotification({ type: 'error', message: `❌ Export Failed: ${e.message}` });
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatusNotification(null), 4000);
    }
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '16px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
        <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800', marginBottom: '2px' }}>CHRONOLOGICAL AUDIT BOOK</div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>📖 General Journal / Daybook</h2>

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
              style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              <span>📄</span> {isExporting ? 'Saving...' : 'Save PDF'}
            </button>
            {onClose && <button onClick={onClose} style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Close</button>}
          </div>
        </div>

        {statusNotification && (
          <div style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', marginBottom: '12px', backgroundColor: statusNotification.type === 'error' ? '#fef2f2' : statusNotification.type === 'success' ? '#ecfdf5' : '#f0f9ff', color: statusNotification.type === 'error' ? '#991b1b' : statusNotification.type === 'success' ? '#065f46' : '#0369a1', border: `1px solid ${statusNotification.type === 'error' ? '#fecaca' : statusNotification.type === 'success' ? '#a7f3d0' : '#bae6fd'}` }}>
            {statusNotification.message}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px', boxSizing: 'border-box' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>From Date (से)</label>
              <input 
                type="date" 
                max={todayMaxDate}
                value={fromDate} 
                onChange={e => setFromDate(e.target.value)} 
                style={{ width: '100%', padding: '10px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box', backgroundColor: '#f8fafc', fontWeight: '600' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>To Date (तक)</label>
              <input 
                type="date" 
                max={todayMaxDate}
                value={toDate} 
                onChange={e => setToDate(e.target.value)} 
                style={{ width: '100%', padding: '10px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box', backgroundColor: '#f8fafc', fontWeight: '600' }} 
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Voucher Type</label>
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)} 
              style={{ width: '100%', padding: '11px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '700', boxSizing: 'border-box' }}
            >
              <option value="ALL">All Types (सभी वाउचर)</option>
              <option value="JV">JV - Journal (रोज़नामचा)</option>
              <option value="PAY">PAY - Payment (भुगतान)</option>
              <option value="REC">REC - Receipt (प्राप्ति)</option>
              <option value="CONTRA">CONTRA - Contra (कोंट्रा)</option>
              <option value="PURCHASE">PURCHASE (खरीद)</option>
              <option value="SALES">SALES (बिक्री)</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <input 
            type="text" 
            placeholder="🔍 Search account, ref no, narration, item..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '11px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '10px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase' }}>TOTAL DEBIT (नामे)</div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: '#059669', marginTop: '2px' }}>₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase' }}>TOTAL CREDIT (जमा)</div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: '#dc2626', marginTop: '2px' }}>₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>

      {/* Scrollable Journal Entries Container */}
      <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box' }}>
        {filteredEntries.length === 0 ? (
          <div style={{ backgroundColor: '#fff', textAlign: 'center', padding: '40px', borderRadius: '16px', color: '#94a3b8', fontSize: '13px', border: '1px solid #e2e8f0' }}>
            No journal entries found for this firm.
          </div>
        ) : (
          filteredEntries.map((entry, idx) => {
            const amt = Number(entry.amount || 0);
            const vType = String(entry.voucher_type || 'JV').toUpperCase();
            const itemsList = Array.isArray(entry.items) ? entry.items : [];

            return (
              <div key={entry.id || idx} style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxSizing: 'border-box' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', color: '#475569' }}>{entry.voucher_date}</span>
                    <span style={{ fontSize: '10px', backgroundColor: '#059669', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: '800' }}>{vType}</span>
                    <strong style={{ fontSize: '12px', color: '#0f172a' }}>#{entry.reference_no}</strong>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>
                    Dr: <span style={{ color: '#059669' }}>{entry.dr_account}</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                    Cr: <span style={{ color: '#dc2626' }}>{entry.cr_account}</span>
                  </div>

                  {itemsList.length > 0 && (
                    <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', marginBottom: '6px', fontSize: '11px' }}>
                      {itemsList.map((it, iIdx) => (
                        <div key={iIdx} style={{ fontWeight: '700', color: '#0284c7' }}>
                          📦 {it.itemName} — Qty: <strong style={{ color: '#0f172a' }}>{it.qty} {it.unit}</strong> @ ₹{Number(it.rate || 0).toFixed(2)}
                        </div>
                      ))}
                    </div>
                  )}

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
