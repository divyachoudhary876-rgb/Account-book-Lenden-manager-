// frontend/src/components/BhattaCostAuditView.jsx

import React, { useState, useEffect } from 'react';
import { 
  getFirmBhattaRounds, 
  saveFirmBhattaRound, 
  auditBhattaRoundData, 
  lockBhattaRoundAudit 
} from '../utils/bhattaRoundAuditEngine.js';

export default function BhattaCostAuditView({ firm, onClose }) {
  const todayDate = new Date().toISOString().split('T')[0];

  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState('');

  // Date Windows
  const [bharaiStart, setBharaiStart] = useState('');
  const [bharaiEnd, setBharaiEnd] = useState('');
  const [nikasiStart, setNikasiStart] = useState('');
  const [nikasiEnd, setNikasiEnd] = useState('');
  const [salesStart, setSalesStart] = useState('');
  const [salesEnd, setSalesEnd] = useState('');

  // New Round Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [roundTitle, setRoundTitle] = useState('');
  const [targetCap, setTargetCap] = useState('800000');

  // Audit Results
  const [auditReport, setAuditReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const loadRounds = () => {
    const list = getFirmBhattaRounds(firm);
    setRounds(list);
    if (list.length > 0 && !selectedRoundId) {
      const active = list.find(r => r.status === 'ACTIVE') || list[0];
      setSelectedRoundId(active.id);
      applyRoundDates(active);
    }
  };

  const applyRoundDates = (r) => {
    if (!r) return;
    setBharaiStart(r.bharai_start_date || '');
    setBharaiEnd(r.bharai_end_date || '');
    setNikasiStart(r.nikasi_start_date || '');
    setNikasiEnd(r.nikasi_end_date || '');
    setSalesStart(r.sales_start_date || '');
    setSalesEnd(r.sales_end_date || '');
  };

  useEffect(() => {
    loadRounds();
  }, [firm]);

  const handleRoundChange = (e) => {
    const rId = e.target.value;
    setSelectedRoundId(rId);
    const r = rounds.find(item => item.id === rId);
    applyRoundDates(r);
    setAuditReport(null);
  };

  const handleCreateRound = (e) => {
    e.preventDefault();
    if (!roundTitle.trim()) return;

    const newR = saveFirmBhattaRound(firm, {
      title: roundTitle.trim(),
      target_capacity: Number(targetCap) || 0,
      bharai_start_date: bharaiStart,
      bharai_end_date: bharaiEnd,
      nikasi_start_date: nikasiStart,
      nikasi_end_date: nikasiEnd,
      sales_start_date: salesStart,
      sales_end_date: salesEnd
    });

    setRoundTitle('');
    setShowNewModal(false);
    loadRounds();
    setSelectedRoundId(newR.id);
  };

  // Run 100% Actual Audit Without Manual Typing
  const handleExecuteAudit = () => {
    setStatusMsg(null);
    setIsLoading(true);

    try {
      const result = auditBhattaRoundData(firm, {
        bharaiStartDate: bharaiStart,
        bharaiEndDate: bharaiEnd,
        nikasiStartDate: nikasiStart,
        nikasiEndDate: nikasiEnd,
        salesStartDate: salesStart,
        salesEndDate: salesEnd
      });

      setAuditReport(result);
      if (result.salesData.salesInvoicesCount === 0) {
        setStatusMsg({
          type: 'info',
          text: `ℹ️ Expenses fetch ho gaye hain (₹${result.totalCost.toLocaleString('en-IN')}), lekin is duration me koi Sales Invoice nahi mila. Sales hone par actual split live show hoga.`
        });
      } else {
        setStatusMsg({
          type: 'success',
          text: `✓ Audit complete! ${result.totalSold.toLocaleString('en-IN')} eent ki actual sales aur vouchers verified.`
        });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: `Audit error: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLockAudit = () => {
    if (!auditReport || !selectedRoundId) return;
    if (!window.confirm("Kya aap is Round ki Actual Costing aur Profit ko final lock karna chahte hain?")) return;

    lockBhattaRoundAudit(firm, selectedRoundId, auditReport);
    setStatusMsg({ type: 'success', text: '✓ Round audit successfully locked & posted to general ledger!' });
    loadRounds();
  };

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto', padding: '12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Header */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
              🎯 Bhatta Round Audit: 100% Actual Cost & Profit
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Zero manual typing — Actual sales & work vouchers se audit calculation</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              type="button" 
              onClick={() => setShowNewModal(true)}
              style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              + New Round
            </button>
            {onClose && (
              <button type="button" onClick={onClose} style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}>
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {statusMsg && (
        <div style={{ margin: '10px 0', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', backgroundColor: statusMsg.type === 'error' ? '#fef2f2' : statusMsg.type === 'info' ? '#f0f9ff' : '#ecfdf5', color: statusMsg.type === 'error' ? '#991b1b' : statusMsg.type === 'info' ? '#0369a1' : '#065f46', border: `1px solid ${statusMsg.type === 'error' ? '#fecaca' : statusMsg.type === 'info' ? '#bae6fd' : '#a7f3d0'}` }}>
          {statusMsg.text}
        </div>
      )}

      {/* Round Selector & Date Configuration Card */}
      <div style={{ ...cardStyle, marginTop: '12px' }}>
        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>ACTIVE BHATTA ROUND *</label>
          <select 
            value={selectedRoundId} 
            onChange={handleRoundChange} 
            style={{ ...inputStyle, fontWeight: 'bold', fontSize: '13px', backgroundColor: '#f8fafc' }}
          >
            {rounds.map(r => (
              <option key={r.id} value={r.id}>
                {r.title} ({r.status === 'AUDITED' ? '🔒 Audited' : '🔥 Active'}) — Target: {Number(r.target_capacity || 0).toLocaleString('en-IN')} Bricks
              </option>
            ))}
          </select>
        </div>

        {/* Date Ranges (Accrual Windows) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0369a1', display: 'block', marginBottom: '6px' }}>
              1. BHARAI & PAKAI AVADHI (Koyla + Bharai)
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="date" value={bharaiStart} onChange={e => setBharaiStart(e.target.value)} style={inputStyle} />
              <input type="date" value={bharaiEnd} onChange={e => setBharaiEnd(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#059669', display: 'block', marginBottom: '6px' }}>
              2. NIKASI AVADHI (Chamber Nikasi Labour)
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="date" value={nikasiStart} onChange={e => setNikasiStart(e.target.value)} style={inputStyle} />
              <input type="date" value={nikasiEnd} onChange={e => setNikasiEnd(e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Sales Window */}
        <div style={{ backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '8px', border: '1px solid #bbf7d0', marginTop: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#166534', display: 'block', marginBottom: '6px' }}>
            3. ACTUAL SALES & DISPATCH DURATION (Invoices Scan)
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="date" value={salesStart} onChange={e => setSalesStart(e.target.value)} style={inputStyle} />
            <input type="date" value={salesEnd} onChange={e => setSalesEnd(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <button 
          type="button" 
          onClick={handleExecuteAudit}
          disabled={isLoading}
          style={{ width: '100%', marginTop: '14px', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {isLoading ? '⏳ Scanning Vouchers & Invoices...' : '⚡ Scan Actual Vouchers & Calculate Real Cost'}
        </button>
      </div>

      {/* Live Audit Report Output Card */}
      {auditReport && (
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Key Metric Gauges */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div style={{ ...cardStyle, backgroundColor: '#f8fafc', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>KUL KHARCHA (ACTUAL)</span>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#dc2626', marginTop: '2px' }}>
                ₹{auditReport.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{ ...cardStyle, backgroundColor: '#f8fafc', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>ACTUAL SALES VAKRI</span>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#059669', marginTop: '2px' }}>
                ₹{auditReport.salesData.totalSalesRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{ ...cardStyle, backgroundColor: auditReport.netRealizedProfit >= 0 ? '#ecfdf5' : '#fef2f2', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: auditReport.netRealizedProfit >= 0 ? '#065f46' : '#991b1b', fontWeight: 'bold' }}>
                SHUDDH MUNAFA (NET)
              </span>
              <div style={{ fontSize: '16px', fontWeight: '900', color: auditReport.netRealizedProfit >= 0 ? '#059669' : '#dc2626', marginTop: '2px' }}>
                {auditReport.netRealizedProfit >= 0 ? '+' : ''}₹{auditReport.netRealizedProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Actual Sales Breakdown by Grade */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                📊 Actual Sales Invoices Dispatched ({auditReport.totalSold.toLocaleString('en-IN')} Bricks)
              </strong>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Avg Sale Rate: ₹{auditReport.averageSellingRatePerK} / 1000
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span><strong>Int 1 Number (A-Grade):</strong> {auditReport.salesData.int1No.qty.toLocaleString('en-IN')} Pcs</span>
                <span style={{ color: '#059669', fontWeight: 'bold' }}>₹{auditReport.salesData.int1No.revenue.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span><strong>Int 2 Number (B-Grade):</strong> {auditReport.salesData.int2No.qty.toLocaleString('en-IN')} Pcs</span>
                <span style={{ color: '#059669', fontWeight: 'bold' }}>₹{auditReport.salesData.int2No.revenue.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span><strong>Pila / 1.25 Number:</strong> {auditReport.salesData.intPila.qty.toLocaleString('en-IN')} Pcs</span>
                <span style={{ color: '#059669', fontWeight: 'bold' }}>₹{auditReport.salesData.intPila.revenue.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span><strong>Chatta / Tukda:</strong> {(auditReport.salesData.intChatta.qty + auditReport.salesData.tukda.qty).toLocaleString('en-IN')} Pcs</span>
                <span style={{ color: '#059669', fontWeight: 'bold' }}>₹{(auditReport.salesData.intChatta.revenue + auditReport.salesData.tukda.revenue).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* True Costing Per 1000 Result */}
          <div style={{ ...cardStyle, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <strong style={{ fontSize: '13px', color: '#1e40af', display: 'block', marginBottom: '8px' }}>
              🎯 AUDITED REAL COST PER 1000 BRICKS (हज़ार ईंट की वास्तविक लागत):
            </strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
              <div>• <strong>Int 1-No Cost:</strong> ₹{auditReport.costPerThousand.int1No} / 1000 (₹{auditReport.costPerPiece.int1No}/int)</div>
              <div>• <strong>Int 2-No Cost:</strong> ₹{auditReport.costPerThousand.int2No} / 1000 (₹{auditReport.costPerPiece.int2No}/int)</div>
              <div>• <strong>Pila Eent Cost:</strong> ₹{auditReport.costPerThousand.intPila} / 1000</div>
              <div>• <strong>Chatta / Tukda:</strong> ₹{auditReport.costPerThousand.tukda} / 1000</div>
            </div>

            <button 
              type="button" 
              onClick={handleLockAudit}
              style={{ marginTop: '12px', width: '100%', backgroundColor: '#059669', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              🔒 Lock & Finalize Audit into Ledger
            </button>
          </div>

        </div>
      )}

      {/* New Round Modal */}
      {showNewModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <form onSubmit={handleCreateRound} style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '20px', maxWidth: '400px', width: '100%', boxSizing: 'border-box' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#0f172a' }}>Add New Bhatta Round</h4>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>ROUND TITLE *</label>
              <input type="text" placeholder="e.g. Round-1 (2026-27)" value={roundTitle} onChange={e => setRoundTitle(e.target.value)} style={inputStyle} required />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>TARGET BRICKS CAPACITY</label>
              <input type="number" placeholder="800000" value={targetCap} onChange={e => setTargetCap(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" style={{ flex: 1, backgroundColor: '#059669', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Create Round</button>
              <button type="button" onClick={() => setShowNewModal(false)} style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '14px',
  border: '1px solid #cbd5e1',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
  boxSizing: 'border-box',
  width: '100%'
};

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#334155',
  marginBottom: '4px'
};

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '11px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  outline: 'none'
};
