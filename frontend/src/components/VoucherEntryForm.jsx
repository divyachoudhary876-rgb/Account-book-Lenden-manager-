// frontend/src/components/VoucherEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { getAccountHeads } from '../utils/statementEngine.js';
import { postUniversalVoucher, getAccountLiveBalance } from '../utils/voucherPostingEngine.js';

export default function VoucherEntryForm({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';

  const [accounts, setAccounts] = useState([]);
  const [voucherType, setVoucherType] = useState('PAYMENT');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [drAccount, setDrAccount] = useState('');
  const [crAccount, setCrAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [narration, setNarration] = useState('');
  
  const [cashBalance, setCashBalance] = useState(0);
  const [statusMessage, setStatusMessage] = useState(null);

  const loadAccounts = () => {
    const list = getAccountHeads(activeFirmId);
    setAccounts(list);

    const cashAcc = list.find(a => a.account_name.toLowerCase().includes('cash'))?.account_name || 'Cash-in-Hand';
    const liveStats = getAccountLiveBalance(activeFirmId, cashAcc);
    setCashBalance(liveStats.netValue);

    if (list.length >= 2) {
      if (!drAccount) setDrAccount(list[0].account_name);
      if (!crAccount) setCrAccount(cashAcc);
    }
  };

  useEffect(() => {
    loadAccounts();
    window.addEventListener('app_state_updated', loadAccounts);
    return () => window.removeEventListener('app_state_updated', loadAccounts);
  }, [activeFirmId]);

  const handleTypeSelect = (type) => {
    setVoucherType(type);
    const cashAcc = accounts.find(a => a.account_name.toLowerCase().includes('cash'))?.account_name || 'Cash-in-Hand';
    const bankAcc = accounts.find(a => a.account_name.toLowerCase().includes('bank'))?.account_name || 'Primary Bank Account';
    const partyAcc = accounts.find(a => !a.account_name.toLowerCase().includes('cash') && !a.account_name.toLowerCase().includes('bank'));

    if (type === 'PAYMENT') {
      setCrAccount(cashAcc);
      if (partyAcc) setDrAccount(partyAcc.account_name);
    } else if (type === 'RECEIPT') {
      setDrAccount(cashAcc);
      if (partyAcc) setCrAccount(partyAcc.account_name);
    } else if (type === 'CONTRA') {
      setDrAccount(bankAcc);
      setCrAccount(cashAcc);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatusMessage(null);

    try {
      const result = postUniversalVoucher(activeFirmId, {
        voucher_type: voucherType,
        voucher_date: voucherDate,
        dr_account: drAccount,
        cr_account: crAccount,
        amount: amount,
        reference_no: referenceNo,
        narration: narration
      });

      setStatusMessage({
        type: 'success',
        text: `✓ ${result.voucher_type} Voucher posted successfully!\n• Amount: ₹${result.amount.toFixed(2)}\n• Ref: ${result.voucher_number}\n• Posted to Ledger: ${result.dr_account} (Dr) & ${result.cr_account} (Cr)`
      });

      setAmount('');
      setReferenceNo('');
      setNarration('');
      loadAccounts();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* HUD Header */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
            📝 Voucher Entry (JV / PV / RV / Contra)
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Double-Entry Journal Posting Engine</span>
        </div>

        {/* Live Cash Indicator */}
        <div style={{ backgroundColor: cashBalance > 0 ? '#ecfdf5' : '#fef2f2', border: `1px solid ${cashBalance > 0 ? '#a7f3d0' : '#fecaca'}`, padding: '6px 12px', borderRadius: '8px', textAlign: 'right' }}>
          <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', display: 'block' }}>AVAILABLE CASH-IN-HAND</span>
          <strong style={{ fontSize: '14px', color: cashBalance > 0 ? '#065f46' : '#dc2626' }}>
            ₹{cashBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </strong>
        </div>
      </div>

      {statusMessage && (
        <div style={{
          backgroundColor: statusMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${statusMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: statusMessage.type === 'success' ? '#065f46' : '#b91c1c',
          padding: '12px 16px',
          borderRadius: '10px',
          fontSize: '12px',
          fontWeight: '600',
          whiteSpace: 'pre-line'
        }}>
          {statusMessage.text}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', display: 'grid', gap: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        
        {/* Voucher Type Tabs */}
        <div>
          <label style={labelStyle}>Voucher Type *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {['PAYMENT', 'RECEIPT', 'CONTRA', 'JOURNAL'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeSelect(t)}
                style={{
                  backgroundColor: voucherType === t ? '#0f172a' : '#f8fafc',
                  color: voucherType === t ? '#ffffff' : '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '9px 4px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {t === 'PAYMENT' && '💳 Payment'}
                {t === 'RECEIPT' && '📥 Receipt'}
                {t === 'CONTRA' && '🏛️ Contra'}
                {t === 'JOURNAL' && '📝 Journal'}
              </button>
            ))}
          </div>
        </div>

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
              placeholder="e.g. REC-104 / PV-09"
              value={referenceNo}
              onChange={e => setReferenceNo(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Double Entry Selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div>
            <label style={{ ...labelStyle, color: '#059669' }}>Debit Account (Dr - नामे) *</label>
            <select
              value={drAccount}
              onChange={e => setDrAccount(e.target.value)}
              style={{ ...inputStyle, fontWeight: 'bold' }}
              required
            >
              <option value="">-- Select Dr Head --</option>
              {accounts.map(a => (
                <option key={a.id} value={a.account_name}>{a.account_name} ({a.sub_group})</option>
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
              <option value="">-- Select Cr Head --</option>
              {accounts.map(a => (
                <option key={a.id} value={a.account_name}>{a.account_name} ({a.sub_group})</option>
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
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ ...inputStyle, fontSize: '15px', fontWeight: 'bold' }}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>Narration / Remarks</label>
          <input
            type="text"
            placeholder="e.g. Paid cash for office expenses / supplier advance"
            value={narration}
            onChange={e => setNarration(e.target.value)}
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          style={{
            backgroundColor: '#059669',
            color: '#ffffff',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          💾 Post Double-Entry Voucher
        </button>

      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#0f172a' };
