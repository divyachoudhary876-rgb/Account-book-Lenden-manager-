import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';

export default function GeneralJournalView({ firm, onClose }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [journalEntries, setJournalEntries] = useState([]);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadJournal = () => {
    try {
      const vouchers = StorageService.getItem('account_book_vouchers') || [];
      const firmVouchers = vouchers.filter(v => v && v.firm_id === activeFirmId);

      // Also fetch material consumptions to display in Daybook
      const consumptions = StorageService.getItem('material_consumptions') || [];
      const firmConsumptions = consumptions
        .filter(c => c && c.firm_id === activeFirmId)
        .map(c => ({
          id: c.id || `CONS-${Date.now()}`,
          voucher_date: c.date || c.created_at?.split('T')[0],
          voucher_type: 'CONSUMPTION',
          reference_no: c.vehicle_ref || 'BATCH',
          dr_account: c.expense_account || 'Factory Production Expense',
          cr_account: 'Inventory Stock',
          amount: c.total_value || 0,
          narration: `Material Consumption: ${(c.items || []).map(i => `${i.qty} ${i.unit} ${i.itemName}`).join(', ')}`,
          created_at: c.created_at || new Date().toISOString()
        }));

      const combined = [...firmVouchers, ...firmConsumptions].sort((a, b) => {
        const dateA = new Date(a.voucher_date || a.created_at || 0);
        const dateB = new Date(b.voucher_date || b.created_at || 0);
        return dateB - dateA; // Newest first
      });

      setJournalEntries(combined);
    } catch (err) {
      console.error("Error loading journal:", err);
    }
  };

  useEffect(() => {
    loadJournal();
    window.addEventListener('app_storage_updated', loadJournal);
    return () => window.removeEventListener('app_storage_updated', loadJournal);
  }, [activeFirmId]);

  const filteredEntries = journalEntries.filter(entry => {
    if (!entry) return false;
    const typeMatch = filterType === 'ALL' || String(entry.voucher_type || '').toUpperCase() === filterType;
    const q = searchQuery.toLowerCase();
    const searchMatch = 
      (entry.reference_no && entry.reference_no.toLowerCase().includes(q)) ||
      (entry.dr_account && entry.dr_account.toLowerCase().includes(q)) ||
      (entry.cr_account && entry.cr_account.toLowerCase().includes(q)) ||
      (entry.narration && entry.narration.toLowerCase().includes(q));

    return typeMatch && searchMatch;
  });

  const totalTurnover = filteredEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      
      {/* Header Card */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '16px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>Chronological Audit Book</div>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>📖 General Journal / Daybook</h2>
          </div>
          {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Close</button>}
        </div>

        {/* Filters & Search */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value)} 
            style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '12px', fontWeight: '700', outline: 'none' }}
          >
            <option value="ALL">All Voucher Types</option>
            <option value="SALES">Sales Invoices</option>
            <option value="PURCHASE">Purchase Bills</option>
            <option value="PAYMENT">Payments</option>
            <option value="RECEIPT">Receipts</option>
            <option value="CONSUMPTION">Material Consumption</option>
          </select>

          <input 
            type="text" 
            placeholder="🔍 Search account, ref no..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            style={{ flex: 2, padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '10px', fontSize: '13px' }}>
          <span style={{ fontWeight: '700', color: '#166534' }}>Total Filtered Turnover:</span>
          <span style={{ fontWeight: '900', color: '#15803d' }}>₹{totalTurnover.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
