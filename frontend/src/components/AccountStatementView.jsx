// frontend/src/components/AccountStatementView.jsx

import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import { getAccountStatement, downloadCSVStatement } from '../utils/statementEngine.js';
import { downloadAccountStatementPDF } from '../utils/pdfDownloadEngine.js';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export default function AccountStatementView({ firm, onClose }) {
  const activeFirmId = firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  const todayMaxDate = new Date().toISOString().split('T')[0];

  const [accountsList, setAccountsList] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [fromDate, setFromDate] = useState('2026-04-01');
  const [toDate, setToDate] = useState(todayMaxDate);
  
  const [statementData, setStatementData] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const loadAccounts = () => {
    try {
      const accs = getFirmMasterAccounts(activeFirmId) || [];
      setAccountsList(accs);
      if (accs.length > 0 && !selectedAccount) {
        setSelectedAccount(accs[0].account_name || accs[0].name || '');
      }
    } catch (err) {
      console.error("Error loading accounts for statement:", err);
    }
  };

  useEffect(() => {
    loadAccounts();
    window.addEventListener('app_storage_updated', loadAccounts);
    window.addEventListener('app_state_updated', loadAccounts);
    return () => {
      window.removeEventListener('app_storage_updated', loadAccounts);
      window.removeEventListener('app_state_updated', loadAccounts);
    };
  }, [activeFirmId]);

  useEffect(() => {
    if (selectedAccount) {
      const stmt = getAccountStatement(activeFirmId, selectedAccount);
      setStatementData(stmt);
    } else {
      setStatementData(null);
    }
  }, [selectedAccount, activeFirmId]);

  const handleExportPDF = async () => {
    if (!statementData || !statementData.entries || statementData.entries.length === 0) {
      return alert('Export ke liye koi transaction data uplabdh nahi hai.');
    }
    setIsExporting(true);
    try {
      await downloadAccountStatementPDF(statementData, selectedAccount, firm);
      alert('✓ PDF Statement Successfully Downloaded / Shared!');
    } catch (err) {
      alert('PDF export failed: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (!statementData || !statementData.entries || statementData.entries.length === 0) {
      return alert('Export ke liye koi transaction data uplabdh nahi hai.');
    }
    const firmName = firm?.legal_name || firm?.name || 'Firm';
    downloadCSVStatement(statementData, firmName);
  };

  const filteredEntries = (statementData?.entries || []).filter(e => {
    if (!e.date) return true;
    if (fromDate && e.date < fromDate) return false;
    if (toDate && e.date > toDate) return false;
    return true;
  });

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', color: '#0f172a', maxWidth: '850px', margin: '0 auto' }}>
      
      {/* Header Card */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
            📖 Khata Bahi & Account Statement
          </h2>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Double-Entry General Ledger & Real-Time Balance</span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            onClick={handleExportPDF} 
            disabled={isExporting}
            style={{ padding: '6px 12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {isExporting ? 'Generating PDF...' : '📥 Save PDF'}
          </button>
          
          <button 
            onClick={handleExportCSV} 
            style={{ padding: '6px 12px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            📊 Export CSV
          </button>

          {onClose && (
            <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
              Close
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls Card */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        
        <div>
          <SearchableAccountDropdown
            label="Select Party / Account *"
            accounts={accountsList}
            value={selectedAccount}
            onChange={val => setSelectedAccount(val)}
            placeholder="-- Search or Choose Account --"
            colorAccent="#0284c7"
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>From Date</label>
            <input 
              type="date" 
              value={fromDate} 
              onChange={e => setFromDate(e.target.value)} 
              style={inputStyle} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>To Date</label>
            <input 
              type="date" 
              value={toDate} 
              onChange={e => setToDate(e.target.value)} 
              style={inputStyle} 
            />
          </div>
        </div>

        {/* Summary Badges */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Opening Balance</div>
            <div style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
              ₹{statementData ? statementData.openingBalance.toFixed(2) : '0.00'} {statementData?.openingBalanceType || 'Dr'}
            </div>
          </div>

          <div style={{ backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase' }}>Net Closing Balance</div>
            <div style={{ fontSize: '14px', fontWeight: '900', color: '#15803d', marginTop: '2px' }}>
              ₹{statementData ? statementData.closingBalance.toFixed(2) : '0.00'} {statementData?.closingBalanceType || 'Dr'}
            </div>
          </div>
        </div>

      </div>

      {/* Transactions Register Table / List */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
          Ledger Transactions ({filteredEntries.length})
        </h3>

        {filteredEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '11px' }}>
            Is khate ke liye chayanit tarikh mein koi transaction darj nahi hai.
          </div>
        ) : (
          <div style={{ maxHeight: '450px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filteredEntries.map((entry, idx) => (
              <div 
                key={entry.id || idx} 
                style={{ 
                  backgroundColor: '#f8fafc', 
                  padding: '10px 12px', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ color: '#64748b', fontWeight: 'bold' }}>{entry.date}</span>
                    <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: '#e2e8f0', padding: '2px 5px', borderRadius: '4px', color: '#334155' }}>
                      {entry.voucher_type} #{entry.voucher_no}
                    </span>
                  </div>
                  <div style={{ fontWeight: '700', color: '#0284c7' }}>
                    {entry.particulars}
                  </div>
                  {entry.narration && (
                    <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
                      {entry.narration}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  {entry.debit > 0 && (
                    <div style={{ fontWeight: '800', color: '#dc2626' }}>
                      Dr: ₹{entry.debit.toFixed(2)}
                    </div>
                  )}
                  {entry.credit > 0 && (
                    <div style={{ fontWeight: '800', color: '#059669' }}>
                      Cr: ₹{entry.credit.toFixed(2)}
                    </div>
                  )}
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', fontWeight: 'bold' }}>
                    Bal: ₹{entry.running_balance.toFixed(2)} {entry.balance_type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '11px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  outline: 'none'
};
