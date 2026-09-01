// frontend/src/components/VoucherEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { getAccountHeads } from '../utils/statementEngine.js';
import { 
  saveUniversalVoucher, 
  deleteUniversalVoucher, 
  getAllFirmVouchers, 
  getAccountLiveBalance 
} from '../utils/voucherPostingEngine.js';

export default function VoucherEntryForm({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';

  const [accounts, setAccounts] = useState([]);
  const [recentVouchers, setRecentVouchers] = useState([]);

  // Form Field States
  const [editingId, setEditingId] = useState(null);
  const [voucherType, setVoucherType] = useState('PAYMENT');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [drAccount, setDrAccount] = useState('');
  const [crAccount, setCrAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [narration, setNarration] = useState('');

  const [cashBalance, setCashBalance] = useState(0);
  const [statusMessage, setStatusMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = () => {
    const list = getAccountHeads(activeFirmId);
    const vouchers = getAllFirmVouchers(activeFirmId);
    setAccounts(list);
    setRecentVouchers(vouchers);

    const cashAcc = list.find(a => a.account_name.toLowerCase().includes('cash'))?.account_name || 'Cash-in-Hand';
    const liveStats = getAccountLiveBalance(activeFirmId, cashAcc);
    setCashBalance(liveStats.netValue);

    if (list.length >= 2 && !editingId) {
      if (!drAccount) setDrAccount(list[0].account_name);
      if (!crAccount) setCrAccount(cashAcc);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_state_updated', loadData);
    return () => window.removeEventListener('app_state_updated', loadData);
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

  const handleEditClick = (vch) => {
    setEditingId(vch.id);
    setVoucherType(vch.voucher_type || vch.type || 'PAYMENT');
    setVoucherDate(vch.voucher_date || vch.date);
    setDrAccount(vch.dr_account || vch.dr_party);
    setCrAccount(vch.cr_account || vch.cr_party);
    setAmount(vch.amount.toString());
    setReferenceNo(vch.reference_no || '');
    setNarration(vch.narration || '');
    setStatusMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setAmount('');
    setReferenceNo('');
    setNarration('');
    setStatusMessage(null);
  };

  const handleDeleteClick = (vch) => {
    if (window.confirm(`⚠️ Delete voucher "${vch.voucher_number || vch.reference_no}" of ₹${vch.amount}?`)) {
      deleteUniversalVoucher(activeFirmId, vch.id);
      if (editingId === vch.id) handleCancelEdit();
      loadData();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatusMessage(null);

    try {
      const result = saveUniversalVoucher(activeFirmId, {
        id: editingId,
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
        text: `✓ Voucher "${result.voucher_number}" ${editingId ? 'Updated' : 'Created'} Successfully! Amount: ₹${result.amount.toFixed(2)}`
      });

      handleCancelEdit();
      loadData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const filteredVouchers = recentVouchers.filter(v => {
    const q = searchQuery.toLowerCase();
    return (
      (v.dr_account || '').toLowerCase().includes(q) ||
      (v.cr_account || '').toLowerCase().includes(q) ||
      (v.voucher_type || '').toLowerCase().includes(q) ||
      (v.voucher_number || '').toLowerCase().includes(q) ||
      (v.reference_no || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '30px' }}>
      
      {/* Header Banner */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
            {editingId ? '✏️ Edit Voucher Entry' : '📝 Voucher Entry (JV / PV / RV / Contra)'}
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Double-Entry Journal & Ledger Engine</span>
        </div>

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

      {/* 1. ENTRY / EDIT FORM */}
      <form onSubmit={handleSubmit} style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: editingId ? '2px solid #0284c7' : '1px solid #cbd5e1', display: 'grid', gap: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        
        {editingId && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e0f2fe', padding: '8px 12px', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0369a1' }}>Editing Voucher ID: {editingId}</span>
            <button type="button" onClick={handleCancelEdit} style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
              Cancel Edit
            </button>
          </div>
        )}

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

        {/* Accounts Selection */}
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

        <div style={{ display: 'flex', gap: '10px' }}>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              style={{ flex: 1, backgroundColor: '#94a3b8', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            style={{
              flex: 2,
              backgroundColor: editingId ? '#0284c7' : '#059669',
              color: '#ffffff',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            💾 {editingId ? 'Update Voucher' : 'Post Double-Entry Voucher'}
          </button>
        </div>

      </form>

      {/* 2. RECENT VOUCHERS LIST WITH EDIT BUTTONS */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <strong style={{ fontSize: '14px', color: '#0f172a' }}>📖 Daybook & Voucher Register ({filteredVouchers.length})</strong>
          <input
            type="text"
            placeholder="🔍 Search vouchers..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', width: '180px' }}
          />
        </div>

        <div style={{ overflowX: 'auto', maxHeight: '350px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', position: 'sticky', top: 0 }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Debit (Dr) / Credit (Cr)</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                    No voucher records found.
                  </td>
                </tr>
              ) : (
                filteredVouchers.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: editingId === v.id ? '#f0fdf4' : '#ffffff' }}>
                    <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>{v.voucher_date || v.date}</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                        {v.voucher_type || v.type}
                      </span>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <div style={{ fontWeight: 'bold', color: '#059669' }}>Dr: {v.dr_account || v.dr_party}</div>
                      <div style={{ color: '#dc2626', fontSize: '11px' }}>Cr: {v.cr_account || v.cr_party}</div>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                      ₹{parseFloat(v.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => handleEditClick(v)}
                        style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', marginRight: '4px' }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(v)}
                        style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', padding: '4px 6px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                      >
                        🗑️
                      </button>
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
