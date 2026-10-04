// frontend/src/components/BhattaCostAuditView.jsx

import React, { useState, useEffect } from 'react';
import { 
  getFirmBhattaRounds, 
  saveFirmBhattaRound, 
  auditBhattaRoundData, 
  lockBhattaRoundAudit 
} from '../utils/bhattaRoundAuditEngine.js';

export default function BhattaCostAuditView({ firm, onClose }) {
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
    const list = getFirmBhattaRounds(firm) || [];
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
    setStatusMsg({ type: 'success', text: `✓ Naya Round "${newR.title}" successfully add ho gaya!` });
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
          text: `ℹ️️ Expenses fetch ho gaye hain (₹${result.totalCost.toLocaleString('en-IN')}), lekin is Sales duration me koi Invoice nahi mila. Sales hone par grade-wise split live calculate ho jayega.`
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
    if (!window.confirm("Kya aap is Round ki Actual Costing aur Profit ko final lock karke Journal Ledger me post karna chahte hain?")) return;

    lockBhattaRoundAudit(firm, selectedRoundId, auditReport);
    setStatusMsg({ type: 'success', text: '✓ Round audit successfully locked & posted to general ledger!' });
    loadRounds();
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Header Banner */}
      <div style={{ ...cardStyle, borderLeft: '4px solid #0284c7', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '15px' }}>🎯</span>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                Bhatta Round Audit & Costing
              </h3>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px' }}>
              Zero manual typing — Actual sales & work slips se verified costing
            </span>
          </div>
          <button 
            type="button" 
            onClick={() => setShowNewModal(true)}
            style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <span>+</span> New Round
          </button>
        </div>
      </div>

      {statusMsg && (
        <div style={{ margin: '8px 0 12px 0', padding: '10px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: statusMsg.type === 'error' ? '#fef2f2' : statusMsg.type === 'info' ? '#f0f9ff' : '#ecfdf5', color: statusMsg.type === 'error' ? '#991b1b' : statusMsg.type === 'info' ? '#0369a1' : '#065f46', border: `1px solid ${statusMsg.type === 'error' ? '#fecaca' : statusMsg.type === 'info' ? '#bae6fd' : '#a7f3d0'}` }}>
          {statusMsg.text}
        </div>
      )}

      {/* Main Configuration Card */}
      <div style={cardStyle}>
        
        {/* Active Round Selector */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>ACTIVE BHATTA ROUND *</label>
          {rounds.length === 0 ? (
            <div style={{ padding: '10px', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '11px', color: '#b45309' }}>
              ⚠️ Koi round nahi mila. Kripya upar <strong>"+ New Round"</strong> dabakar pehla round banayein.
            </div>
          ) : (
            <select 
              value={selectedRoundId} 
              onChange={handleRoundChange} 
              style={{ ...inputStyle, fontWeight: '700', fontSize: '12px', backgroundColor: '#f8fafc', padding: '10px' }}
            >
              {rounds.map(r => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.status === 'AUDITED' ? '🔒 Audited' : '🔥 Active'}) — Target: {Number(r.target_capacity || 0).toLocaleString('en-IN')} Bricks
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 1. BHARAI & PAKAI AVADHI */}
        <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px' }}>🔥</span>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#0369a1' }}>
              1. BHARAI & PAKAI AVADHI (Koyla + Bharai + Pathai)
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <span style={subLabelStyle}>Start Date</span>
              <input type="date" value={bharaiStart} onChange={e => setBharaiStart(e.target.value)} style={dateInputStyle} />
            </div>
            <div>
              <span style={subLabelStyle}>End Date</span>
              <input type="date" value={bharaiEnd} onChange={e => setBharaiEnd(e.target.value)} style={dateInputStyle} />
            </div>
          </div>
        </div>

        {/* 2. NIKASI AVADHI */}
        <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px' }}>🧱</span>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#059669' }}>
              2. NIKASI AVADHI (Chamber Nikasi Labour)
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <span style={subLabelStyle}>Start Date</span>
              <input type="date" value={nikasiStart} onChange={e => setNikasiStart(e.target.value)} style={dateInputStyle} />
            </div>
            <div>
              <span style={subLabelStyle}>End Date</span>
              <input type="date" value={nikasiEnd} onChange={e => setNikasiEnd(e.target.value)} style={dateInputStyle} />
            </div>
          </div>
        </div>

        {/* 3. ACTUAL SALES & DISPATCH DURATION */}
        <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '10px', border: '1px solid #bbf7d0', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px' }}>🚚</span>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#166534' }}>
              3. ACTUAL SALES & DISPATCH DURATION (Invoices Scan)
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <span style={subLabelStyle}>Sales Start</span>
              <input type="date" value={salesStart} onChange={e => setSalesStart(e.target.value)} style={dateInputStyle} />
            </div>
            <div>
              <span style={subLabelStyle}>Sales End</span>
              <input type="date" value={salesEnd} onChange={e => setSalesEnd(e.target.value)} style={dateInputStyle} />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button 
          type="button" 
          onClick={handleExecuteAudit}
          disabled={isLoading || rounds.length === 0}
          style={{ 
            width: '100%', 
            backgroundColor: isLoading ? '#94a3b8' : '#0284c7', 
            color: '#fff', 
            border: 'none', 
            padding: '13px', 
            borderRadius: '10px', 
            fontSize: '13px', 
            fontWeight: '800', 
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
          }}
        >
          <span>⚡</span>
          <span>{isLoading ? 'Scanning Vouchers & Invoices...' : 'Scan Actual Vouchers & Calculate Real Cost'}</span>
        </button>

      </div>

      {/* Live Audit Report Output */}
      {auditReport && (
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Key Metric Gauges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
            
            <div style={{ ...cardStyle, backgroundColor: '#fef2f2', border: '1px solid #fecaca', textAlign: 'center', padding: '10px 8px' }}>
              <span style={{ fontSize: '9px', color: '#991b1b', fontWeight: 'bold' }}>KUL KHARCHA</span>
              <div style={{ fontSize: '14px', fontWeight: '900', color: '#dc2626', marginTop: '2px' }}>
                ₹{auditReport.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div style={{ ...cardStyle, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'center', padding: '10px 8px' }}>
              <span style={{ fontSize: '9px', color: '#166534', fontWeight: 'bold' }}>ACTUAL BIKRI</span>
              <div style={{ fontSize: '14px', fontWeight: '900', color: '#059669', marginTop: '2px' }}>
                ₹{auditReport.salesData.totalSalesRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div style={{ ...cardStyle, backgroundColor: auditReport.netRealizedProfit >= 0 ? '#ecfdf5' : '#fef2f2', border: `1px solid ${auditReport.netRealizedProfit >= 0 ? '#a7f3d0' : '#fecaca'}`, textAlign: 'center', padding: '10px 8px' }}>
              <span style={{ fontSize: '9px', color: auditReport.netRealizedProfit >= 0 ? '#065f46' : '#991b1b', fontWeight: 'bold' }}>
                SHUDDH MUNAFA
              </span>
              <div style={{ fontSize: '14px', fontWeight: '900', color: auditReport.netRealizedProfit >= 0 ? '#059669' : '#dc2626', marginTop: '2px' }}>
                {auditReport.netRealizedProfit >= 0 ? '+' : ''}₹{auditReport.netRealizedProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>

          </div>

          {/* Actual Sales Breakdown */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <strong style={{ fontSize: '12px', color: '#0f172a' }}>
                📊 Dispatched Bricks ({auditReport.totalSold.toLocaleString('en-IN')} Pcs)
              </strong>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', backgroundColor: '#f1f5f9', padding: '3px 6px', borderRadius: '4px' }}>
                Avg: ₹{auditReport.averageSellingRatePerK}/1000
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span><strong>Int 1-Number:</strong> {auditReport.salesData.int1No.qty.toLocaleString('en-IN')} Pcs</span>
                <span style={{ color: '#059669', fontWeight: 'bold' }}>₹{auditReport.salesData.int1No.revenue.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span><strong>Int 2-Number:</strong> {auditReport.salesData.int2No.qty.toLocaleString('en-IN')} Pcs</span>
                <span style={{ color: '#059669', fontWeight: 'bold' }}>₹{auditReport.salesData.int2No.revenue.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span><strong>Pila / 1.25 No:</strong> {auditReport.salesData.intPila.qty.toLocaleString('en-IN')} Pcs</span>
                <span style={{ color: '#059669', fontWeight: 'bold' }}>₹{auditReport.salesData.intPila.revenue.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span><strong>Chatta & Tukda:</strong> {(auditReport.salesData.intChatta.qty + auditReport.salesData.tukda.qty).toLocaleString('en-IN')} Pcs</span>
                <span style={{ color: '#059669', fontWeight: 'bold' }}>₹{(auditReport.salesData.intChatta.revenue + auditReport.salesData.tukda.revenue).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Real Cost Per 1000 Card */}
          <div style={{ ...cardStyle, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <strong style={{ fontSize: '12px', color: '#1e40af', display: 'block', marginBottom: '8px' }}>
              🎯 AUDITED REAL COST PER 1000 BRICKS (हज़ार ईंट की वास्तविक लागत):
            </strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
              <div style={{ backgroundColor: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                • <strong>1-No Cost:</strong> ₹{auditReport.costPerThousand.int1No} / 1000
              </div>
              <div style={{ backgroundColor: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                • <strong>2-No Cost:</strong> ₹{auditReport.costPerThousand.int2No} / 1000
              </div>
              <div style={{ backgroundColor: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                • <strong>Pila Cost:</strong> ₹{auditReport.costPerThousand.intPila} / 1000
              </div>
              <div style={{ backgroundColor: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                • <strong>Tukda:</strong> ₹{auditReport.costPerThousand.tukda} / 1000
              </div>
            </div>

            <button 
              type="button" 
              onClick={handleLockAudit}
              style={{ marginTop: '12px', width: '100%', backgroundColor: '#059669', color: '#fff', border: 'none', padding: '11px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              🔒 Lock & Finalize Audit into Ledger
            </button>
          </div>

        </div>
      )}

      {/* New Round Modal */}
      {showNewModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '14px' }}>
          <form onSubmit={handleCreateRound} style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '18px', maxWidth: '380px', width: '100%', boxSizing: 'border-box', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
              Add New Bhatta Round
            </h4>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>ROUND TITLE *</label>
              <input type="text" placeholder="e.g. Round-1 (2026-27)" value={roundTitle} onChange={e => setRoundTitle(e.target.value)} style={inputStyle} required />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>TARGET CAPACITY (BRICKS)</label>
              <input type="number" placeholder="800000" value={targetCap} onChange={e => setTargetCap(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" style={{ flex: 1, backgroundColor: '#059669', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                Create Round
              </button>
              <button type="button" onClick={() => setShowNewModal(false)} style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                Cancel
              </button>
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
  padding: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
  boxSizing: 'border-box',
  width: '100%'
};

const labelStyle = {
  display: 'block',
  fontSize: '10px',
  fontWeight: 'bold',
  color: '#475569',
  marginBottom: '4px',
  textTransform: 'uppercase'
};

const subLabelStyle = {
  display: 'block',
  fontSize: '9px',
  fontWeight: 'bold',
  color: '#64748b',
  marginBottom: '3px'
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

const dateInputStyle = {
  width: '100%',
  minWidth: '0',
  padding: '7px 8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '11px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  outline: 'none'
};
