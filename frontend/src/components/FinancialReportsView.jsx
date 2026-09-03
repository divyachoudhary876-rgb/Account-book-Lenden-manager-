// frontend/src/components/FinancialReportsView.jsx

import React, { useState, useEffect } from 'react';
import { generateFinancialStatements } from '../utils/financialReportEngine.js';

export default function FinancialReportsView({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const firmName = firm?.legal_name || firm?.trade_name || 'Neelkanth Groups';

  const [activeTab, setActiveTab] = useState('TB'); // 'TB', 'TRADING', 'PL', 'BS'
  const [statements, setStatements] = useState(null);
  const [loading, setLoading] = useState(true);
  const [renderError, setRenderError] = useState(null);

  const loadReportData = () => {
    try {
      setLoading(true);
      setRenderError(null);
      const data = generateFinancialStatements(activeFirmId);
      
      // Defensive fallback object structure to prevent runtime crashes
      const safeData = {
        trialBalance: {
          rows: data?.trialBalance?.rows || [],
          totalDebit: data?.trialBalance?.totalDebit || 0,
          totalCredit: data?.trialBalance?.totalCredit || 0,
          isBalanced: Boolean(data?.trialBalance?.isBalanced)
        },
        tradingAccount: {
          sales: data?.tradingAccount?.sales || 0,
          purchases: data?.tradingAccount?.purchases || 0,
          directExpenses: data?.tradingAccount?.directExpenses || 0,
          closingStock: data?.tradingAccount?.closingStock || 0,
          grossProfit: data?.tradingAccount?.grossProfit || 0
        },
        profitAndLoss: {
          grossProfit: data?.profitAndLoss?.grossProfit || 0,
          indirectIncomes: data?.profitAndLoss?.indirectIncomes || 0,
          indirectExpenses: data?.profitAndLoss?.indirectExpenses || 0,
          netProfit: data?.profitAndLoss?.netProfit || 0
        },
        balanceSheet: {
          netProfit: data?.balanceSheet?.netProfit || 0,
          closingStock: data?.balanceSheet?.closingStock || 0
        }
      };

      setStatements(safeData);
    } catch (err) {
      console.error('Error generating financial reports:', err);
      setRenderError(err.message || 'Report generation error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
    window.addEventListener('app_state_updated', loadReportData);
    window.addEventListener('stock_updated', loadReportData);
    return () => {
      window.removeEventListener('app_state_updated', loadReportData);
      window.removeEventListener('stock_updated', loadReportData);
    };
  }, [activeFirmId]);

  if (loading) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
        <strong>🔄 वित्तीय विवरण तैयार किए जा रहे हैं...</strong>
      </div>
    );
  }

  if (renderError) {
    return (
      <div style={{ padding: '20px', maxWidth: '600px', margin: '20px auto', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b' }}>
        <h4 style={{ margin: '0 0 8px 0' }}>⚠️ रिपोर्ट लोड करने में त्रुटि</h4>
        <p style={{ margin: 0, fontSize: '12px' }}>{renderError}</p>
        <button onClick={loadReportData} style={{ marginTop: '12px', padding: '6px 14px', backgroundColor: '#991b1b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          पुनः प्रयास करें
        </button>
      </div>
    );
  }

  const { trialBalance, tradingAccount, profitAndLoss } = statements;

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', boxSizing: 'border-box', padding: '0 8px 50px 8px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* Header Banner */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
              📊 वित्तीय विवरण (Financial Statements)
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {firmName} | FY 2026-27 | Double-Entry General Ledger
            </span>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🖨️ Print Report
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', width: '100%' }}>
        <button
          type="button"
          onClick={() => setActiveTab('TB')}
          style={{
            ...tabButtonStyle,
            backgroundColor: activeTab === 'TB' ? '#0284c7' : '#ffffff',
            color: activeTab === 'TB' ? '#ffffff' : '#334155',
            borderColor: activeTab === 'TB' ? '#0284c7' : '#cbd5e1'
          }}
        >
          1. Trial Balance (तलपट)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TRADING')}
          style={{
            ...tabButtonStyle,
            backgroundColor: activeTab === 'TRADING' ? '#0284c7' : '#ffffff',
            color: activeTab === 'TRADING' ? '#ffffff' : '#334155',
            borderColor: activeTab === 'TRADING' ? '#0284c7' : '#cbd5e1'
          }}
        >
          2. Trading (व्यापार खाता)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PL')}
          style={{
            ...tabButtonStyle,
            backgroundColor: activeTab === 'PL' ? '#0284c7' : '#ffffff',
            color: activeTab === 'PL' ? '#ffffff' : '#334155',
            borderColor: activeTab === 'PL' ? '#0284c7' : '#cbd5e1'
          }}
        >
          3. Profit & Loss (लाभ-हानि)
        </button>
      </div>

      {/* TAB 1: TRIAL BALANCE */}
      {activeTab === 'TB' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: '14px', color: '#0f172a' }}>तलपट विवरण (Trial Balance)</strong>
            <span style={{
              fontSize: '11px',
              fontWeight: 'bold',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: trialBalance.isBalanced ? '#ecfdf5' : '#fef2f2',
              color: trialBalance.isBalanced ? '#065f46' : '#991b1b'
            }}>
              {trialBalance.isBalanced ? '✓ Balanced (तलपट संतुलित)' : '⚠️ Unbalanced'}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                  <th style={thStyle}>खाते का नाम (Ledger Account)</th>
                  <th style={thStyle}>प्रकार (Category)</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>नामे (Debit ₹)</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>जमा (Credit ₹)</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.rows.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                      कोई लेजर खाता नहीं मिला।
                    </td>
                  </tr>
                ) : (
                  trialBalance.rows.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={tdStyle}><strong>{row.account_name}</strong></td>
                      <td style={{ ...tdStyle, color: '#64748b' }}>{row.primary_type}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: row.debit > 0 ? '#059669' : '#94a3b8', fontWeight: row.debit > 0 ? 'bold' : 'normal' }}>
                        {row.debit > 0 ? row.debit.toFixed(2) : '-'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: row.credit > 0 ? '#dc2626' : '#94a3b8', fontWeight: row.credit > 0 ? 'bold' : 'normal' }}>
                        {row.credit > 0 ? row.credit.toFixed(2) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                  <td colSpan="2" style={{ padding: '10px 8px' }}>कुल योग (Total):</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#059669', fontSize: '13px' }}>
                    ₹{trialBalance.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#dc2626', fontSize: '13px' }}>
                    ₹{trialBalance.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TRADING ACCOUNT */}
      {activeTab === 'TRADING' && (
        <div style={cardStyle}>
          <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '12px' }}>
            व्यापार खाता (Trading Account)
          </strong>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Debit Side */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', backgroundColor: '#f8fafc' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#991b1b', marginBottom: '8px' }}>व्यय (Debit / Cost)</div>
              <div style={summaryRowStyle}>
                <span>कुल खरीद (Purchases):</span>
                <strong>₹{tradingAccount.purchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={summaryRowStyle}>
                <span>प्रत्यक्ष खर्चे (Direct Expenses):</span>
                <strong>₹{tradingAccount.directExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
            </div>

            {/* Credit Side */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', backgroundColor: '#f8fafc' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#065f46', marginBottom: '8px' }}>आय व स्टॉक (Credit / Revenue)</div>
              <div style={summaryRowStyle}>
                <span>कुल बिक्री (Sales Revenue):</span>
                <strong>₹{tradingAccount.sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={summaryRowStyle}>
                <span>अंतिम स्टॉक (Closing Stock):</span>
                <strong>₹{tradingAccount.closingStock.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '14px', padding: '12px', borderRadius: '8px', backgroundColor: tradingAccount.grossProfit >= 0 ? '#ecfdf5' : '#fef2f2', border: `1px solid ${tradingAccount.grossProfit >= 0 ? '#a7f3d0' : '#fecaca'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', fontSize: '13px', color: tradingAccount.grossProfit >= 0 ? '#065f46' : '#991b1b' }}>
              सकल लाभ / Gross Profit:
            </span>
            <strong style={{ fontSize: '16px', color: tradingAccount.grossProfit >= 0 ? '#065f46' : '#991b1b' }}>
              ₹{tradingAccount.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>
      )}

      {/* TAB 3: PROFIT & LOSS */}
      {activeTab === 'PL' && (
        <div style={cardStyle}>
          <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '12px' }}>
            लाभ-हानि खाता (Profit & Loss Statement)
          </strong>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={summaryRowStyle}>
              <span>सकल लाभ (Gross Profit brought down):</span>
              <strong>₹{profitAndLoss.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div style={summaryRowStyle}>
              <span>अन्य आय (Indirect Incomes):</span>
              <strong>₹{profitAndLoss.indirectIncomes.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div style={{ ...summaryRowStyle, color: '#dc2626' }}>
              <span>कार्यालय व अन्य खर्चे (Indirect Expenses):</span>
              <strong>- ₹{profitAndLoss.indirectExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>

            <div style={{ marginTop: '10px', borderTop: '2px solid #0f172a', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>
                शुद्ध लाभ / Net Profit:
              </span>
              <strong style={{ fontSize: '18px', color: profitAndLoss.netProfit >= 0 ? '#059669' : '#dc2626' }}>
                ₹{profitAndLoss.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '14px',
  padding: '16px',
  border: '1px solid #cbd5e1',
  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
  boxSizing: 'border-box'
};

const tabButtonStyle = {
  padding: '10px 6px',
  borderRadius: '8px',
  border: '1px solid',
  fontSize: '11px',
  fontWeight: '700',
  cursor: 'pointer',
  textAlign: 'center'
};

const summaryRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '12px',
  padding: '6px 0',
  borderBottom: '1px dashed #e2e8f0'
};

const thStyle = { padding: '10px 8px', fontWeight: 'bold' };
const tdStyle = { padding: '9px 8px', verticalAlign: 'top' };
