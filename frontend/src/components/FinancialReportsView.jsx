// frontend/src/components/FinancialReportsView.jsx

import React, { useState, useEffect } from 'react';
import { generateFinancialStatements } from '../utils/financialReportEngine.js';

export default function FinancialReportsView({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const firmName = firm?.legal_name || firm?.name || 'Enterprise Profile';

  const [activeTab, setActiveTab] = useState('pl'); // 'pl', 'bs', 'tb'
  const [reportData, setReportData] = useState(null);

  const loadData = () => {
    const data = generateFinancialStatements(activeFirmId);
    setReportData(data);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_state_updated', loadData);
    window.addEventListener('stock_updated', loadData);
    return () => {
      window.removeEventListener('app_state_updated', loadData);
      window.removeEventListener('stock_updated', loadData);
    };
  }, [activeFirmId]);

  if (!reportData) return <div style={{ padding: '20px', textAlign: 'center' }}>Generating Financial Statements...</div>;

  const { trialBalance, profitAndLoss, balanceSheet } = reportData;

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '30px' }}>
      
      {/* Header Banner */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📈</span> Financial Reports & Statutory Statements
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Active Firm: <strong>{firmName}</strong></span>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setActiveTab('pl')}
            style={{
              backgroundColor: activeTab === 'pl' ? '#0f172a' : '#f1f5f9',
              color: activeTab === 'pl' ? '#ffffff' : '#334155',
              border: '1px solid #cbd5e1',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            📊 Profit & Loss (P&L)
          </button>
          <button
            onClick={() => setActiveTab('bs')}
            style={{
              backgroundColor: activeTab === 'bs' ? '#0f172a' : '#f1f5f9',
              color: activeTab === 'bs' ? '#ffffff' : '#334155',
              border: '1px solid #cbd5e1',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ⚖️ Balance Sheet
          </button>
          <button
            onClick={() => setActiveTab('tb')}
            style={{
              backgroundColor: activeTab === 'tb' ? '#0f172a' : '#f1f5f9',
              color: activeTab === 'tb' ? '#ffffff' : '#334155',
              border: '1px solid #cbd5e1',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            📋 Trial Balance
          </button>
        </div>
      </div>

      {/* 1. PROFIT & LOSS STATEMENT TAB */}
      {activeTab === 'pl' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '16px' }}>
            <strong style={{ fontSize: '16px', color: '#0f172a' }}>PROFIT & LOSS STATEMENT</strong>
            <strong style={{ fontSize: '15px', color: profitAndLoss.netProfit >= 0 ? '#059669' : '#dc2626' }}>
              {profitAndLoss.netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS'}: ₹{Math.abs(profitAndLoss.netProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </strong>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Debit Side (Expenses) */}
            <div>
              <div style={{ backgroundColor: '#fee2e2', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', color: '#991b1b', marginBottom: '10px' }}>
                EXPENDITURE (खर्च व लागत)
              </div>
              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: 'bold', color: '#475569' }}>Direct Costs:</div>
                {profitAndLoss.directExpenses.map((e, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                    <span>{e.name}</span>
                    <span style={{ fontWeight: '600' }}>₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}

                <div style={{ fontWeight: 'bold', color: '#475569', marginTop: '10px' }}>Indirect Expenses:</div>
                {profitAndLoss.indirectExpenses.map((e, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                    <span>{e.name}</span>
                    <span style={{ fontWeight: '600' }}>₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Credit Side (Income) */}
            <div>
              <div style={{ backgroundColor: '#dcfce7', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', color: '#166534', marginBottom: '10px' }}>
                INCOME & REVENUE (बिक्री व आय)
              </div>
              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: 'bold', color: '#475569' }}>Sales & Direct Income:</div>
                {profitAndLoss.directIncomes.map((inc, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                    <span>{inc.name}</span>
                    <span style={{ fontWeight: '600' }}>₹{inc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px', color: '#0284c7', fontWeight: 'bold' }}>
                  <span>Closing Stock Valuation</span>
                  <span>₹{profitAndLoss.closingStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                {profitAndLoss.indirectIncomes.length > 0 && (
                  <>
                    <div style={{ fontWeight: 'bold', color: '#475569', marginTop: '10px' }}>Other / Indirect Income:</div>
                    {profitAndLoss.indirectIncomes.map((inc, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                        <span>{inc.name}</span>
                        <span style={{ fontWeight: '600' }}>₹{inc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. BALANCE SHEET TAB */}
      {activeTab === 'bs' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '16px' }}>
            <strong style={{ fontSize: '16px', color: '#0f172a' }}>BALANCE SHEET (आर्थिक चिट्ठा)</strong>
            <span style={{
              backgroundColor: balanceSheet.isTally ? '#dcfce7' : '#fee2e2',
              color: balanceSheet.isTally ? '#166534' : '#991b1b',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 'bold'
            }}>
              {balanceSheet.isTally ? '✓ Balance Sheet Tallied' : `⚠️ Difference: ₹${balanceSheet.difference.toFixed(2)}`}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Liabilities & Equity */}
            <div>
              <div style={{ backgroundColor: '#f1f5f9', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', color: '#0f172a', marginBottom: '10px' }}>
                LIABILITIES & CAPITAL (देनदारियां व पूंजी)
              </div>
              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: 'bold', color: '#475569' }}>Capital / Partner Equity:</div>
                {balanceSheet.capital.map((c, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                    <span>{c.name}</span>
                    <span style={{ fontWeight: '600' }}>₹{c.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px', color: profitAndLoss.netProfit >= 0 ? '#059669' : '#dc2626', fontWeight: 'bold' }}>
                  <span>Net Profit (Transferred from P&L)</span>
                  <span>₹{profitAndLoss.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div style={{ fontWeight: 'bold', color: '#475569', marginTop: '10px' }}>Current & Non-Current Liabilities:</div>
                {balanceSheet.liabilities.map((l, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                    <span>{l.name}</span>
                    <span style={{ fontWeight: '600' }}>₹{l.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}

                <div style={{ marginTop: '16px', borderTop: '2px solid #0f172a', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '13px' }}>
                  <span>TOTAL LIABILITIES & EQUITY:</span>
                  <span>₹{balanceSheet.totalLiabilitiesAndEquity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Assets */}
            <div>
              <div style={{ backgroundColor: '#f1f5f9', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', color: '#0f172a', marginBottom: '10px' }}>
                ASSETS (परिसंपत्तियां)
              </div>
              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {balanceSheet.assets.map((a, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                    <span>{a.name}</span>
                    <span style={{ fontWeight: '600' }}>₹{a.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}

                <div style={{ marginTop: 'auto', borderTop: '2px solid #0f172a', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '13px' }}>
                  <span>TOTAL ASSETS:</span>
                  <span>₹{balanceSheet.totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TRIAL BALANCE TAB */}
      {activeTab === 'tb' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '14px' }}>
            <strong style={{ fontSize: '16px', color: '#0f172a' }}>TRIAL BALANCE (तलपट)</strong>
            <span style={{
              backgroundColor: trialBalance.isMatched ? '#dcfce7' : '#fee2e2',
              color: trialBalance.isMatched ? '#166534' : '#991b1b',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 'bold'
            }}>
              {trialBalance.isMatched ? '✓ Trial Balance Balanced' : '⚠️ Dr/Cr Mismatch'}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Account Head</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Group Type</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Debit Balance (₹)</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Credit Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.entries.map((e, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: '600', color: '#1e293b' }}>{e.name}</td>
                    <td style={{ padding: '8px', color: '#64748b' }}>{e.sub_group}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#059669', fontWeight: 'bold' }}>
                      {e.debit > 0 ? e.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626', fontWeight: 'bold' }}>
                      {e.credit > 0 ? e.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #0f172a', fontWeight: '800' }}>
                  <td colSpan={2} style={{ padding: '10px', textAlign: 'right' }}>GRAND TOTAL:</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#059669' }}>
                    ₹{trialBalance.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#dc2626' }}>
                    ₹{trialBalance.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
