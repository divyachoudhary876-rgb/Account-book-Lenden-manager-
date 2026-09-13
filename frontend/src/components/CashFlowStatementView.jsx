// frontend/src/components/CashFlowStatementView.jsx
import React, { useState, useEffect } from 'react';
import { computeCashFlowStatement } from '../utils/cashFlowEngine';

export default function CashFlowStatementView({ firm, onClose }) {
  const activeFirmId = firm?.id || firm?.firm_id || 'FIRM-001';
  const todayMaxDate = new Date().toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(todayMaxDate);
  const [cashFlowData, setCashFlowData] = useState(null);

  useEffect(() => {
    const data = computeCashFlowStatement(activeFirmId, fromDate, toDate);
    setCashFlowData(data);
  }, [activeFirmId, fromDate, toDate]);

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>FINANCIAL GOVERNANCE</div>
          <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>📈 कैश फ्लो स्टेटमेंट (Cash Flow Statement)</h2>
        </div>
        {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Close</button>}
      </div>

      {/* Date Filters */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>From Date (से)</label>
          <input 
            type="date" 
            max={todayMaxDate}
            value={fromDate} 
            onChange={e => setFromDate(e.target.value)} 
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} 
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>To Date (तक)</label>
          <input 
            type="date" 
            max={todayMaxDate}
            value={toDate} 
            onChange={e => setToDate(e.target.value)} 
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} 
          />
        </div>
      </div>

      {/* Report Summary Cards */}
      {cashFlowData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Operating */}
          <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '800', color: '#1d4ed8' }}>1. Operating Activities (ऑपरेटिंग गतिविधियाँ)</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
              <span>Cash Inflows (प्राप्तियाँ):</span>
              <span style={{ fontWeight: 'bold', color: '#059669' }}>+₹{cashFlowData.operating.inflow.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
              <span>Cash Outflows (भुगतान):</span>
              <span style={{ fontWeight: 'bold', color: '#dc2626' }}>-₹{cashFlowData.operating.outflow.toFixed(2)}</span>
            </div>
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px' }}>
              <span>Net Cash from Operations:</span>
              <span style={{ color: cashFlowData.operating.net >= 0 ? '#059669' : '#dc2626' }}>₹{cashFlowData.operating.net.toFixed(2)}</span>
            </div>
          </div>

          {/* Investing */}
          <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '800', color: '#7c3aed' }}>2. Investing Activities (निवेश गतिविधियाँ)</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
              <span>Asset Purchases / Outflows:</span>
              <span style={{ fontWeight: 'bold', color: '#dc2626' }}>-₹{cashFlowData.investing.outflow.toFixed(2)}</span>
            </div>
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px' }}>
              <span>Net Cash from Investing:</span>
              <span style={{ color: '#7c3aed' }}>₹{cashFlowData.investing.net.toFixed(2)}</span>
            </div>
          </div>

          {/* Financing */}
          <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '800', color: '#047857' }}>3. Financing Activities (वित्तीय गतिविधियाँ)</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
              <span>Loans / Capital Inflows:</span>
              <span style={{ fontWeight: 'bold', color: '#059669' }}>+₹{cashFlowData.financing.inflow.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
              <span>Repayments / Drawings:</span>
              <span style={{ fontWeight: 'bold', color: '#dc2626' }}>-₹{cashFlowData.financing.outflow.toFixed(2)}</span>
            </div>
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px' }}>
              <span>Net Cash from Financing:</span>
              <span style={{ color: cashFlowData.financing.net >= 0 ? '#059669' : '#dc2626' }}>₹{cashFlowData.financing.net.toFixed(2)}</span>
            </div>
          </div>

          {/* Net Change Grand Total */}
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#166534' }}>Net Increase/Decrease in Cash & Bank:</span>
            <span style={{ fontSize: '18px', fontWeight: '900', color: cashFlowData.netChangeInCash >= 0 ? '#15803d' : '#dc2626' }}>
              ₹{cashFlowData.netChangeInCash.toFixed(2)}
            </span>
          </div>

        </div>
      )}

    </div>
  );
}
