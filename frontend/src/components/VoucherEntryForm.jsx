// frontend/src/components/VoucherEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import { saveUniversalVoucher } from '../utils/voucherPostingEngine.js';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';

export default function VoucherEntryForm({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';

  const [accounts, setAccounts] = useState([]);
  const [voucherType, setVoucherType] = useState('PAYMENT');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNo, setReferenceNo] = useState('');
  const [drAccount, setDrAccount] = useState('');
  const [crAccount, setCrAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [status, setStatus] = useState(null);

  const loadAccounts = () => {
    const list = getFirmMasterAccounts(activeFirmId);
    setAccounts(list);
    if (list.length > 0) {
      if (!drAccount) setDrAccount(list[0].account_name);
      if (!crAccount) {
        const cashAcc = list.find(a => a.account_name.toLowerCase().includes('cash')) || list[1] || list[0];
        setCrAccount(cashAcc.account_name);
      }
    }
  };

  useEffect(() => {
    loadAccounts();
    window.addEventListener('app_state_updated', loadAccounts);
    return () => window.removeEventListener('app_state_updated', loadAccounts);
  }, [activeFirmId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus(null);

    try {
      saveUniversalVoucher(activeFirmId, {
        voucher_type: voucherType,
        voucher_date: voucherDate,
        reference_no: referenceNo,
        dr_account: drAccount,
        cr_account: crAccount,
        amount: parseFloat(amount),
        narration
      });

      setStatus({
        type: 'success',
        text: `✓ ${voucherType} Voucher Saved! Amount: ₹${parseFloat(amount).toLocaleString('en-IN')}`
      });

      setAmount('');
      setNarration('');
      setReferenceNo('');
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '650px', margin: '0 auto', boxSizing: 'border-box', padding: '0 8px 40px 8px' }}>
      
      {/* Header Banner */}
      <div style={cardStyle}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
          Voucher Entry (रोज़नामचा प्रविष्टि)
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>
          Double-Entry General Ledger & Real-Time Postings
        </p>
      </div>

      {status && (
        <div style={{
          marginTop: '12px',
          backgroundColor: status.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${status.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: status.type === 'success' ? '#065f46' : '#991b1b',
          padding: '10px 14px',
          borderRadius: '10px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {status.text}
        </div>
      )}

      {/* Main Voucher Entry Form */}
      <form onSubmit={handleSubmit} style={{ ...cardStyle, marginTop: '12px', display: 'grid', gap: '14px' }}>
        
        {/* Voucher Type Selector with horizontal wrap */}
        <div>
          <label style={labelStyle}>Voucher Type *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '6px', width: '100%' }}>
            {['PAYMENT', 'RECEIPT', 'CONTRA', 'JOURNAL'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setVoucherType(type)}
                style={{
                  padding: '8px 4px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: voucherType === type ? '#0f172a' : '#cbd5e1',
                  backgroundColor: voucherType === type ? '#0f172a' : '#ffffff',
                  color: voucherType === type ? '#ffffff' : '#334155',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textAlign: 'center',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}
              >
                {type === 'PAYMENT' && '💳 Payment'}
                {type === 'RECEIPT' && '📥 Receipt'}
                {type === 'CONTRA' && '🏛️ Contra'}
                {type === 'JOURNAL' && '📝 Journal'}
              </button>
            ))}
          </div>
        </div>

        {/* Date and Reference Inputs (Responsive 2-column or stacked) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Date *</label>
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
              placeholder="e.g. PV-104"
              value={referenceNo}
              onChange={e => setReferenceNo(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Debit (Dr) Account Selector */}
        <SearchableAccountDropdown
          label="Debit Account (Dr - नामे) *"
          accounts={accounts}
          value={drAccount}
          onChange={val => setDrAccount(val)}
          placeholder="Search debit account..."
          colorAccent="#059669"
          required
        />

        {/* Credit (Cr) Account Selector */}
        <SearchableAccountDropdown
          label="Credit Account (Cr - जमा) *"
          accounts={accounts}
          value={crAccount}
          onChange={val => setCrAccount(val)}
          placeholder="Search credit account..."
          colorAccent="#dc2626"
          required
        />

        {/* Transaction Amount */}
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

        {/* Narration */}
        <div>
          <label style={labelStyle}>Narration / Remarks</label>
          <input
            type="text"
            placeholder="e.g. Paid cash for office expenses / diesel"
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
            padding: '13px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)',
            width: '100%',
            boxSizing: 'border-box',
            marginTop: '4px'
          }}
        >
          💾 Post Double-Entry Voucher
        </button>

      </form>

    </div>
  );
}

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '16px',
  border: '1px solid #cbd5e1',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  boxSizing: 'border-box',
  width: '100%',
  overflow: 'hidden'
};

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#334155',
  marginBottom: '5px'
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '12px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#0f172a'
};
