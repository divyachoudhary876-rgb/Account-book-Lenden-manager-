// frontend/src/components/JournalRegisterView.jsx

import React, { useState, useEffect } from 'react';
import { getSortedJournalRegister } from '../utils/journalEngine.js';
import { downloadJournalRegisterPDF } from '../utils/pdfDownloadEngine.js';

export default function JournalRegisterView({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const firmName = firm?.legal_name || firm?.name || 'Enterprise Profile';

  const [vouchers, setVouchers] = useState([]);
  const [sortOrder, setSortOrder] = useState('ASC');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const loadJournalData = () => {
    const sorted = getSortedJournalRegister(activeFirmId, sortOrder);
    setVouchers(sorted);
  };

  useEffect(() => {
    loadJournalData();
    window.addEventListener('app_state_updated', loadJournalData);
    return () => window.removeEventListener('app_state_updated', loadJournalData);
  }, [activeFirmId, sortOrder]);

  const filteredVouchers = vouchers.filter(v => {
    const vDate = v.voucher_date || v.date;
    if (fromDate && vDate < fromDate) return false;
    if (toDate && vDate > toDate) return false;

    const matchesType = typeFilter === 'ALL' || (v.voucher_type || v.type) === typeFilter;
    const q = search.toLowerCase();
    const matchesSearch = 
      (v.dr_account || v.dr_party || '').toLowerCase().includes(q) ||
      (v.cr_account || v.cr_party || '').toLowerCase().includes(q) ||
      (v.voucher_number || v.reference_no || '').toLowerCase().includes(q) ||
      (v.narration || '').toLowerCase().includes(q);

    return matchesType && matchesSearch;
  });

  const totalDebitAmount = filteredVouchers.reduce((sum, v) => sum + parseFloat(v.amount || 0), 0);

  const handleExportPDF = async () => {
    if (filteredVouchers.length === 0) {
      alert("⚠️ No journal records found to export.");
      return;
    }
    setIsExporting(true);
    try {
      await downloadJournalRegisterPDF(filteredVouchers, firm);
    } catch (e) {
      alert("PDF Export Error: " + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '30px' }}>
      
      {/* Header Banner */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📝</span> General Journal Register (रोज़नामचा / Daybook)
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Chronological Double-Entry Audit Book for <strong>{firmName}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
            style={{
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {sortOrder === 'ASC' ? '📅 Date: Oldest ➔ Newest (1 to 31)' : '📅 Date: Newest ➔ Oldest'}
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExporting || filteredVouchers.length === 0}
            style={{
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: filteredVouchers.length ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {isExporting ? '⏳ Saving...' : '📄 Save PDF to Phone'}
          </button>
        </div>
      </div>

      {/* Date Range & Search Filters */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '14px 18px', border: '1px solid #cbd5e1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>From Date (से)</label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>To Date (तक)</label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Voucher Type</label>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}
          >
            <option value="ALL">All Vouchers</option>
            <option value="PAYMENT">Payment (PV)</option>
            <option value="RECEIPT">Receipt (RV)</option>
            <option value="CONTRA">Contra</option>
            <option value="JOURNAL">Journal (JV)</option>
            <option value="SALES">Sales</option>
            <option value="PURCHASE">Purchase</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Search Particulars</label>
          <input
            type="text"
            placeholder="Search Account / Ref..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Date-Sorted Journal Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>
            📋 Total Entries: {filteredVouchers.length} | Sequence: {sortOrder === 'ASC' ? 'Chronological (01 ➔ 31)' : 'Reverse Chronological'}
          </span>
          <span style={{ fontSize: '13px', fontWeight: '800', color: '#059669' }}>
            Turnover: ₹{totalDebitAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '8px', textAlign: 'center' }}>#</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Date (तारीख)</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Voucher No</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Type</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Particulars (नाम व विवरण)</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Amount (रुपये)</th>
            </tr>
          </thead>
          <tbody>
            {filteredVouchers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  No journal vouchers found for the selected date range.
                </td>
              </tr>
            ) : (
              filteredVouchers.map((v, idx) => (
                <tr key={v.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                  <td style={{ padding: '8px', whiteSpace: 'nowrap', fontWeight: 'bold', color: '#0284c7' }}>
                    {v.voucher_date || v.date}
                  </td>
                  <td style={{ padding: '8px', fontWeight: '600' }}>
                    {v.voucher_number || v.reference_no}
                  </td>
                  <td style={{ padding: '8px' }}>
                    <span style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                      {v.voucher_type || v.type}
                    </span>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <div style={{ fontWeight: 'bold', color: '#059669' }}>Dr: {v.dr_account || v.dr_party}</div>
                    <div style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '11px' }}>Cr: {v.cr_account || v.cr_party}</div>
                    {v.narration && <div style={{ fontSize: '10px', color: '#64748b' }}>({v.narration})</div>}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: '800', color: '#0f172a' }}>
                    ₹{parseFloat(v.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
