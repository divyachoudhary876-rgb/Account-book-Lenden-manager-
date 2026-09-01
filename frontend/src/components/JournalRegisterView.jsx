// frontend/src/components/JournalRegisterView.jsx

import React, { useState, useEffect } from 'react';
import { getAllUniversalVouchers } from '../utils/statementEngine.js';
import { downloadJournalRegisterPDF } from '../utils/pdfDownloadEngine.js';

export default function JournalRegisterView({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [vouchers, setVouchers] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);

  const loadVouchers = () => {
    const list = getAllUniversalVouchers(activeFirmId);
    setVouchers(list);
  };

  useEffect(() => {
    loadVouchers();
    window.addEventListener('app_state_updated', loadVouchers);
    return () => window.removeEventListener('app_state_updated', loadVouchers);
  }, [activeFirmId]);

  const filtered = vouchers.filter(v => {
    const matchesSearch = 
      (v.dr_account || '').toLowerCase().includes(search.toLowerCase()) ||
      (v.cr_account || '').toLowerCase().includes(search.toLowerCase()) ||
      (v.voucher_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (v.narration || '').toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === 'ALL' || (v.voucher_type || v.type) === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleExportPDF = async () => {
    if (filtered.length === 0) {
      alert("⚠️ No vouchers to export.");
      return;
    }
    setIsExporting(true);
    try {
      await downloadJournalRegisterPDF(filtered, firm);
    } catch (e) {
      alert("PDF Export Failed: " + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '30px' }}>
      
      {/* Control Header */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📝</span> General Journal Register (रोज़नामचा / Daybook)
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Complete Chronological Double-Entry Journal Audit</span>
        </div>

        <button
          onClick={handleExportPDF}
          disabled={isExporting || filtered.length === 0}
          style={{
            backgroundColor: '#059669',
            color: '#ffffff',
            border: 'none',
            padding: '9px 16px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: filtered.length ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {isExporting ? '⏳ Saving...' : '📄 Download / Save PDF'}
        </button>
      </div>

      {/* Filter Row */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '12px 16px', border: '1px solid #cbd5e1', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="🔍 Search by Account, Voucher No, Narration..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 'bold' }}
        >
          <option value="ALL">All Voucher Types</option>
          <option value="PAYMENT">Payment (PV)</option>
          <option value="RECEIPT">Receipt (RV)</option>
          <option value="CONTRA">Contra</option>
          <option value="JOURNAL">Journal (JV)</option>
          <option value="SALES">Sales</option>
          <option value="PURCHASE">Purchase</option>
        </select>
      </div>

      {/* Register Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '8px', textAlign: 'center' }}>#</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Voucher No</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Type</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Debit (Dr) / Credit (Cr)</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  No journal records found matching the filters.
                </td>
              </tr>
            ) : (
              filtered.map((v, idx) => (
                <tr key={v.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                  <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>{v.voucher_date || v.date}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{v.voucher_number || v.reference_no}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                      {v.voucher_type || v.type}
                    </span>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <div style={{ fontWeight: 'bold', color: '#059669' }}>Dr: {v.dr_account || v.dr_party}</div>
                    <div style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '11px' }}>Cr: {v.cr_account || v.cr_party}</div>
                    {v.narration && <div style={{ fontSize: '10px', color: '#64748b' }}>{v.narration}</div>}
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
