// frontend/src/components/VoucherEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import { saveUniversalVoucher } from '../utils/voucherPostingEngine.js';
import { getAllUniversalVouchers } from '../utils/statementEngine.js';

export default function VoucherEntryForm({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';

  // Master Data
  const [accounts, setAccounts] = useState([]);
  const [recentVouchers, setRecentVouchers] = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);

  // Common Header State
  const [voucherType, setVoucherType] = useState('PAYMENT'); // PAYMENT, RECEIPT, CONTRA, JOURNAL
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [refNo, setRefNo] = useState('');
  const [narration, setNarration] = useState('');

  // Mode Toggle: Simple vs Compound
  const [isCompoundMode, setIsCompoundMode] = useState(false);

  // 1. Simple Mode State
  const [drAccount, setDrAccount] = useState('');
  const [crAccount, setCrAccount] = useState('');
  const [simpleAmount, setSimpleAmount] = useState('');

  // 2. Compound Mode Rows State (Default 2 Dr & 1 Cr or vice versa)
  const [compoundLines, setCompoundLines] = useState([
    { id: 1, type: 'Dr', account_name: '', amount: '' },
    { id: 2, type: 'Cr', account_name: '', amount: '' }
  ]);

  const loadData = () => {
    const accs = getFirmMasterAccounts(activeFirmId);
    setAccounts(accs);

    if (accs.length >= 2) {
      if (!drAccount) setDrAccount(accs[0].account_name);
      if (!crAccount) setCrAccount(accs[1].account_name);
    }

    const vchs = getAllUniversalVouchers(activeFirmId);
    setRecentVouchers([...vchs].reverse().slice(0, 15));
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_state_updated', loadData);
    return () => window.removeEventListener('app_state_updated', loadData);
  }, [activeFirmId]);

  // Handle Multi-Line Changes
  const handleLineChange = (id, field, value) => {
    setCompoundLines(prev => prev.map(line => line.id === id ? { ...line, [field]: value } : line));
  };

  const addLine = (defaultType = 'Dr') => {
    setCompoundLines(prev => [
      ...prev,
      { id: Date.now(), type: defaultType, account_name: accounts[0]?.account_name || '', amount: '' }
    ]);
  };

  const removeLine = (id) => {
    if (compoundLines.length <= 2) {
      alert('Kam se kam 2 lines (Dr aur Cr) honi chahiye.');
      return;
    }
    setCompoundLines(prev => prev.filter(line => line.id !== id));
  };

  // Live Calculations for Compound Mode
  const totalDebit = compoundLines
    .filter(l => l.type === 'Dr')
    .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);

  const totalCredit = compoundLines
    .filter(l => l.type === 'Cr')
    .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);

  const difference = Math.abs(Math.round((totalDebit - totalCredit) * 100) / 100);
  const isBalanced = difference === 0 && totalDebit > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatusMessage(null);

    try {
      if (isCompoundMode) {
        if (!isBalanced) {
          throw new Error(`Debit aur Credit barabar nahi hain! Difference: ₹${difference.toFixed(2)}`);
        }

        saveUniversalVoucher(activeFirmId, {
          voucher_type: voucherType,
          voucher_date: voucherDate,
          reference_no: refNo,
          narration: narration,
          is_compound: true,
          entries: compoundLines.map(l => ({
            type: l.type,
            account_name: l.account_name,
            amount: parseFloat(l.amount || 0)
          }))
        });

        setStatusMessage({
          type: 'success',
          text: `✓ Multi-Entry (Compound) ${voucherType} Voucher Posted! Total: ₹${totalDebit.toLocaleString('en-IN')}`
        });

        // Reset rows
        setCompoundLines([
          { id: Date.now(), type: 'Dr', account_name: accounts[0]?.account_name || '', amount: '' },
          { id: Date.now() + 1, type: 'Cr', account_name: accounts[1]?.account_name || '', amount: '' }
        ]);
      } else {
        saveUniversalVoucher(activeFirmId, {
          voucher_type: voucherType,
          voucher_date: voucherDate,
          dr_account: drAccount,
          cr_account: crAccount,
          amount: parseFloat(simpleAmount),
          reference_no: refNo,
          narration: narration,
          is_compound: false
        });

        setStatusMessage({
          type: 'success',
          text: `✓ ${voucherType} Voucher Posted Successfully! Amount: ₹${parseFloat(simpleAmount).toLocaleString('en-IN')}`
        });

        setSimpleAmount('');
      }

      setRefNo('');
      setNarration('');
      loadData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '30px' }}>
      
      {/* Main Voucher Entry Card */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        
        {/* Header Bar & Mode Switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
              📝 Voucher Entry (रोज़नामचा प्रविष्टि)
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Double-Entry Journal & Financial Vouchers</span>
          </div>

          {/* Simple vs Compound Toggle */}
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setIsCompoundMode(false)}
              style={{
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                backgroundColor: !isCompoundMode ? '#0f172a' : 'transparent',
                color: !isCompoundMode ? '#ffffff' : '#64748b'
              }}
            >
              ⚡ Simple (1 Dr : 1 Cr)
            </button>
            <button
              type="button"
              onClick={() => setIsCompoundMode(true)}
              style={{
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                backgroundColor: isCompoundMode ? '#0284c7' : 'transparent',
                color: isCompoundMode ? '#ffffff' : '#64748b'
              }}
            >
              📑 Multi-Row (Multiple Dr / Cr)
            </button>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div style={{
            backgroundColor: statusMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${statusMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: statusMessage.type === 'success' ? '#065f46' : '#b91c1c',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 'bold',
            marginBottom: '16px',
            whiteSpace: 'pre-line'
          }}>
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
          
          {/* Voucher Type Tabs */}
          <div>
            <label style={labelStyle}>Voucher Type *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[
                { type: 'PAYMENT', icon: '💳', label: 'Payment' },
                { type: 'RECEIPT', icon: '📥', label: 'Receipt' },
                { type: 'CONTRA', icon: '🏛️', label: 'Contra' },
                { type: 'JOURNAL', icon: '📝', label: 'Journal' }
              ].map(v => (
                <button
                  key={v.type}
                  type="button"
                  onClick={() => setVoucherType(v.type)}
                  style={{
                    backgroundColor: voucherType === v.type ? '#0f172a' : '#f8fafc',
                    color: voucherType === v.type ? '#ffffff' : '#334155',
                    border: `1px solid ${voucherType === v.type ? '#0f172a' : '#cbd5e1'}`,
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <span>{v.icon}</span> {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Reference */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Voucher Date *</label>
              <input
                type="date"
                value={voucherDate}
                onChange={e => setVoucherDate(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Reference No / Bill Ref</label>
              <input
                type="text"
                placeholder="e.g. PV-104 / REC-09"
                value={refNo}
                onChange={e => setRefNo(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* 1. SIMPLE MODE FORM (1 Dr : 1 Cr) */}
          {!isCompoundMode ? (
            <>
              <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ ...labelStyle, color: '#059669' }}>Debit Account (Dr - नामे) *</label>
                  <select
                    value={drAccount}
                    onChange={e => setDrAccount(e.target.value)}
                    style={{ ...inputStyle, fontWeight: 'bold' }}
                    required
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.account_name}>
                        {a.account_name} ({a.sub_group})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ ...labelStyle, color: '#dc2626' }}>Credit Account (Cr - जमा) *</label>
                  <select
                    value={crAccount}
                    onChange={e => setCrAccount(e.target.value)}
                    style={{ ...inputStyle, fontWeight: 'bold' }}
                    required
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.account_name}>
                        {a.account_name} ({a.sub_group})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Transaction Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={simpleAmount}
                  onChange={e => setSimpleAmount(e.target.value)}
                  style={{ ...inputStyle, fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}
                  required
                />
              </div>
            </>
          ) : (
            /* 2. COMPOUND MULTI-ROW FORM (Multiple Dr / Cr) */
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }}>
                  Compound Lines (बहु-खाता प्रविष्टि)
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => addLine('Dr')}
                    style={{ backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    + Add Dr Row
                  </button>
                  <button
                    type="button"
                    onClick={() => addLine('Cr')}
                    style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    + Add Cr Row
                  </button>
                </div>
              </div>

              {/* Rows List */}
              <div style={{ display: 'grid', gap: '8px' }}>
                {compoundLines.map((line, index) => (
                  <div key={line.id} style={{ display: 'grid', gridTemplateColumns: '80px 1.8fr 1.2fr 36px', gap: '8px', alignItems: 'center', backgroundColor: line.type === 'Dr' ? '#f0fdf4' : '#fef2f2', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${line.type === 'Dr' ? '#bbf7d0' : '#fecaca'}` }}>
                    
                    {/* Dr / Cr Selector */}
                    <select
                      value={line.type}
                      onChange={e => handleLineChange(line.id, 'type', e.target.value)}
                      style={{ ...inputStyle, padding: '7px', fontWeight: 'bold', color: line.type === 'Dr' ? '#059669' : '#dc2626' }}
                    >
                      <option value="Dr">Dr</option>
                      <option value="Cr">Cr</option>
                    </select>

                    {/* Account Head Dropdown */}
                    <select
                      value={line.account_name}
                      onChange={e => handleLineChange(line.id, 'account_name', e.target.value)}
                      style={{ ...inputStyle, padding: '7px', fontWeight: 'bold' }}
                      required
                    >
                      <option value="">-- Select Account Head --</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.account_name}>
                          {a.account_name}
                        </option>
                      ))}
                    </select>

                    {/* Amount Input */}
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount ₹"
                      value={line.amount}
                      onChange={e => handleLineChange(line.id, 'amount', e.target.value)}
                      style={{ ...inputStyle, padding: '7px', fontWeight: 'bold' }}
                      required
                    />

                    {/* Delete Line Button */}
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      disabled={compoundLines.length <= 2}
                      style={{ backgroundColor: '#ffffff', color: '#991b1b', border: '1px solid #cbd5e1', borderRadius: '6px', width: '32px', height: '32px', cursor: compoundLines.length > 2 ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Real-time Balancing Box */}
              <div style={{ backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <div style={{ display: 'flex', gap: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                  <span style={{ color: '#059669' }}>Total Dr: ₹{totalDebit.toFixed(2)}</span>
                  <span style={{ color: '#dc2626' }}>Total Cr: ₹{totalCredit.toFixed(2)}</span>
                </div>

                <div style={{ fontSize: '12px', fontWeight: '800' }}>
                  {isBalanced ? (
                    <span style={{ color: '#166534', backgroundColor: '#dcfce7', padding: '4px 8px', borderRadius: '6px' }}>
                      ✓ Balanced
                    </span>
                  ) : (
                    <span style={{ color: '#991b1b', backgroundColor: '#fee2e2', padding: '4px 8px', borderRadius: '6px' }}>
                      ⚠️ Difference: ₹{difference.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Narration */}
          <div>
            <label style={labelStyle}>Narration / Remarks</label>
            <input
              type="text"
              placeholder="e.g. Split payment for diesel and tractor driver advance"
              value={narration}
              onChange={e => setNarration(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isCompoundMode && !isBalanced}
            style={{
              backgroundColor: isCompoundMode && !isBalanced ? '#94a3b8' : '#059669',
              color: '#ffffff',
              border: 'none',
              padding: '13px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: isCompoundMode && !isBalanced ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)'
            }}
          >
            💾 Post Double-Entry Voucher
          </button>

        </form>
      </div>

      {/* Recent Daybook / Vouchers Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <strong style={{ fontSize: '14px', color: '#0f172a' }}>
            📖 Recent Daybook & Voucher Register ({recentVouchers.length})
          </strong>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Debit (Dr) / Credit (Cr)</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentVouchers.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>No vouchers recorded yet.</td></tr>
              ) : (
                recentVouchers.map((v, idx) => (
                  <tr key={v.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>{v.voucher_date || v.date}</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        {v.voucher_type || v.type}
                      </span>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <div style={{ color: '#059669', fontWeight: 'bold' }}>Dr: {v.dr_account || v.dr_party}</div>
                      <div style={{ color: '#dc2626', fontWeight: 'bold' }}>Cr: {v.cr_account || v.cr_party}</div>
                      {v.narration && <small style={{ color: '#64748b' }}>({v.narration})</small>}
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

    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#0f172a' };
