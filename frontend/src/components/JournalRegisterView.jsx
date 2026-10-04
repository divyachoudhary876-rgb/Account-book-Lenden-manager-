// frontend/src/components/JournalRegisterView.jsx

import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { loadFirmData } from '../utils/firmIsolationEngine';
import { downloadJournalRegisterPDF, cleanTypographySpacing } from '../utils/pdfDownloadEngine.js';

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
      // STRICT FIRM ISOLATION: Scoped keys only
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

          const rawRef = String(tx.reference_no || tx.voucher_number || (tx.id ? tx.id.slice(-6) : '1001')).replace(/^#/, '');

          uniqueMap.set(uId, {
            ...tx,
            voucher_date: tx.voucher_date || tx.date || todayMaxDate,
            voucher_type: String(tx.voucher_type || tx.type || 'JV').toUpperCase(),
            reference_no: rawRef,
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

  // Color helper for badges
  const getTypeBadgeStyle = (vType) => {
    switch (vType) {
      case 'PURCHASE':
        return { backgroundColor: '#059669', color: '#ffffff' };
      case 'SALES':
        return { backgroundColor: '#2563eb', color: '#ffffff' };
      case 'PAYMENT':
      case 'PAY':
        return { backgroundColor: '#dc2626', color: '#ffffff' };
      case 'RECEIPT':
      case 'REC':
        return { backgroundColor: '#16a34a', color: '#ffffff' };
      case 'CONTRA':
        return { backgroundColor: '#9333ea', color: '#ffffff' };
      default:
        return { backgroundColor: '#0284c7', color: '#ffffff' };
    }
  };

  return (
    <div style={{ padding: '12px 10px 40px 10px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: '650px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* Top Filter Card */}
      <div style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: '12px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
        <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px', marginBottom: '4px' }}>
          CHRONOLOGICAL AUDIT BOOK
        </div>
        
        <h2 style={{ margin: '0 0 12px 0', fontSize: '17px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📖</span> General Journal / Daybook
        </h2>

        {/* Action Buttons Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr auto', gap: '8px', marginBottom: '12px' }}>
          <button
            onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
            style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '10px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'center' }}
          >
            {sortOrder === 'ASC' ? '📅 Oldest ➔ Newest' : '📅 Newest ➔ Oldest'}
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExporting || filteredEntries.length === 0}
            style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '10px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
          >
            <span>📄</span> {isExporting ? 'Saving...' : 'Save PDF'}
          </button>

          {onClose && (
            <button 
              onClick={onClose} 
              style={{ padding: '10px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', color: '#334155' }}
            >
              Close
            </button>
          )}
        </div>

        {statusNotification && (
          <div style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', marginBottom: '10px', backgroundColor: statusNotification.type === 'error' ? '#fef2f2' : statusNotification.type === 'success' ? '#ecfdf5' : '#f0f9ff', color: statusNotification.type === 'error' ? '#991b1b' : statusNotification.type === 'success' ? '#065f46' : '#0369a1', border: `1px solid ${statusNotification.type === 'error' ? '#fecaca' : statusNotification.type === 'success' ? '#a7f3d0' : '#bae6fd'}` }}>
            {statusNotification.message}
          </div>
        )}

        {/* Date Filter Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '3px', textTransform: 'uppercase' }}>From Date (से)</label>
            <input 
              type="date" 
              max={todayMaxDate}
              value={fromDate} 
              onChange={e => setFromDate(e.target.value)} 
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box', backgroundColor: '#f8fafc', fontWeight: '600' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '3px', textTransform: 'uppercase' }}>To Date (तक)</label>
            <input 
              type="date" 
              max={todayMaxDate}
              value={toDate} 
              onChange={e => setToDate(e.target.value)} 
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box', backgroundColor: '#f8fafc', fontWeight: '600' }} 
            />
          </div>
        </div>

        {/* Voucher Type Dropdown */}
        <div style={{ marginBottom: '8px' }}>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '3px', textTransform: 'uppercase' }}>Voucher Type</label>
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value)} 
            style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '700', boxSizing: 'border-box', outline: 'none' }}
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

        {/* Search Bar */}
        <div style={{ marginBottom: '10px' }}>
          <input 
            type="text" 
            placeholder="🔍 Search account, ref no, narration, item..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}
          />
        </div>

        {/* Total Debit / Credit Summary Box */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 12px', borderRadius: '8px' }}>
          <div>
            <div style={{ fontSize: '9px', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>TOTAL DEBIT (नामे)</div>
            <div style={{ fontSize: '14px', fontWeight: '900', color: '#059669', marginTop: '2px' }}>
              ₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9px', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>TOTAL CREDIT (जमा)</div>
            <div style={{ fontSize: '14px', fontWeight: '900', color: '#dc2626', marginTop: '2px' }}>
              ₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Clean Journal Entries List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box' }}>
        {filteredEntries.length === 0 ? (
          <div style={{ backgroundColor: '#fff', textAlign: 'center', padding: '36px 16px', borderRadius: '12px', color: '#94a3b8', fontSize: '12px', border: '1px solid #e2e8f0' }}>
            No journal entries found for this firm.
          </div>
        ) : (
          filteredEntries.map((entry, idx) => {
            const amt = Number(entry.amount || 0);
            const vType = String(entry.voucher_type || 'JV').toUpperCase();
            const badgeStyle = getTypeBadgeStyle(vType);
            const itemsList = Array.isArray(entry.items) ? entry.items : [];
            const cleanNarrationText = cleanTypographySpacing ? cleanTypographySpacing(entry.narration) : (entry.narration || '');

            return (
              <div 
                key={entry.id || idx} 
                style={{ 
                  backgroundColor: '#ffffff', 
                  padding: '12px 14px', 
                  borderRadius: '12px', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)', 
                  border: '1px solid #e2e8f0', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '6px', 
                  boxSizing: 'border-box' 
                }}
              >
                {/* Top Row: Meta Tags on Left | Standalone Bold Amount on Right */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'nowrap', overflow: 'hidden' }}>
                    <span style={{ fontSize: '10px', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                      {entry.voucher_date}
                    </span>
                    <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', fontWeight: '800', letterSpacing: '0.4px', whiteSpace: 'nowrap', ...badgeStyle }}>
                      {vType}
                    </span>
                    <strong style={{ fontSize: '11px', color: '#0f172a', whiteSpace: 'nowrap' }}>
                      #{entry.reference_no}
                    </strong>
                  </div>

                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>
                      ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Account Details Row */}
                <div style={{ marginTop: '2px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', lineHeight: '1.4' }}>
                    Dr: <span style={{ color: '#059669' }}>{entry.dr_account}</span>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', lineHeight: '1.4', marginTop: '1px' }}>
                    Cr: <span style={{ color: '#dc2626' }}>{entry.cr_account}</span>
                  </div>
                </div>

                {/* Items Row (If Any) */}
                {itemsList.length > 0 && (
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px', marginTop: '2px', fontSize: '11px' }}>
                    {itemsList.map((it, iIdx) => (
                      <div key={iIdx} style={{ fontWeight: '600', color: '#0369a1', lineHeight: '1.4' }}>
                        📦 {it.itemName} — Qty: <strong style={{ color: '#0f172a' }}>{it.qty} {it.unit}</strong> @ ₹{Number(it.rate || 0).toFixed(2)}
                      </div>
                    ))}
                  </div>
                )}

                {/* Clean Narration Row */}
                {cleanNarrationText && (
                  <div style={{ fontSize: '10.5px', color: '#64748b', fontStyle: 'italic', lineHeight: '1.3', marginTop: '2px' }}>
                    {cleanNarrationText}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
