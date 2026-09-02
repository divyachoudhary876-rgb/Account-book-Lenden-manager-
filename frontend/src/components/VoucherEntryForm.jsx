// frontend/src/components/VoucherEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import { saveUniversalVoucher, deleteUniversalVoucher } from '../utils/voucherPostingEngine.js';
import { getAllUniversalVouchers } from '../utils/statementEngine.js';

export default function VoucherEntryForm({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';

  const [accounts, setAccounts] = useState([]);
  const [recentVouchers, setRecentVouchers] = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Editing Mode States
  const [editingVoucherId, setEditingVoucherId] = useState(null);

  // Voucher Header States
  const [voucherType, setVoucherType] = useState('PAYMENT'); // PAYMENT, RECEIPT, CONTRA, JOURNAL
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [refNo, setRefNo] = useState('');
  const [narration, setNarration] = useState('');
  const [isCompoundMode, setIsCompoundMode] = useState(false);

  // Simple Mode States
  const [drAccount, setDrAccount] = useState('');
  const [crAccount, setCrAccount] = useState('');
  const [simpleAmount, setSimpleAmount] = useState('');

  // Compound Mode States
  const [compoundLines, setCompoundLines] = useState([
    { id: 1, type: 'Dr', account_name: '', amount: '' },
    { id: 2, type: 'Cr', account_name: '', amount: '' }
  ]);

  const loadData = () => {
    const accs = getFirmMasterAccounts(activeFirmId);
    setAccounts(accs);

    const vchs = getAllUniversalVouchers(activeFirmId);
    setRecentVouchers([...vchs].reverse());

    if (accs.length > 0 && !editingVoucherId) {
      const cashAcc = accs.find(a => a.account_name.toLowerCase().includes('cash') || a.account_name.toLowerCase().includes('rokad')) || accs[0];
      const bankAcc = accs.find(a => a.account_name.toLowerCase().includes('bank')) || accs[1] || accs[0];
      
      if (!crAccount) setCrAccount(cashAcc.account_name);
      if (!drAccount) setDrAccount(bankAcc.account_name);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_state_updated', loadData);
    return () => window.removeEventListener('app_state_updated', loadData);
  }, [activeFirmId]);

  // Statutory Account Group Filtering
  const cashAndBankAccounts = accounts.filter(a => 
    a.sub_group?.toLowerCase().includes('cash') || 
    a.sub_group?.toLowerCase().includes('bank') ||
    a.account_name.toLowerCase().includes('cash') ||
    a.account_name.toLowerCase().includes('bank')
  );

  const getFilteredAccounts = (legType) => {
    if (voucherType === 'PAYMENT') {
      return legType === 'Cr' ? (cashAndBankAccounts.length > 0 ? cashAndBankAccounts : accounts) : accounts;
    }
    if (voucherType === 'RECEIPT') {
      return legType === 'Dr' ? (cashAndBankAccounts.length > 0 ? cashAndBankAccounts : accounts) : accounts;
    }
    if (voucherType === 'CONTRA') {
      return cashAndBankAccounts.length > 0 ? cashAndBankAccounts : accounts;
    }
    return accounts;
  };

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
      alert('Kam se kam 2 rows (Dr aur Cr) anivarya hain.');
      return;
    }
    setCompoundLines(prev => prev.filter(line => line.id !== id));
  };

  const totalDebit = compoundLines
    .filter(l => l.type === 'Dr')
    .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);

  const totalCredit = compoundLines
    .filter(l => l.type === 'Cr')
    .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);

  const difference = Math.abs(Math.round((totalDebit - totalCredit) * 100) / 100);
  const isBalanced = difference === 0 && totalDebit > 0;

  // Edit Voucher Trigger
  const handleStartEdit = (voucher) => {
    setEditingVoucherId(voucher.id);
    setVoucherType(voucher.voucher_type || voucher.type || 'PAYMENT');
    setVoucherDate(voucher.voucher_date || voucher.date);
    setRefNo(voucher.reference_no || voucher.voucher_number || '');
    setNarration(voucher.narration || '');

    if (voucher.is_compound && Array.isArray(voucher.entries)) {
      setIsCompoundMode(true);
      setCompoundLines(voucher.entries.map((e, idx) => ({
        id: Date.now() + idx,
        type: e.type,
        account_name: e.account_name,
        amount: e.amount.toString()
      })));
    } else {
      setIsCompoundMode(false);
      setDrAccount(voucher.dr_account || voucher.dr_party || '');
      setCrAccount(voucher.cr_account || voucher.cr_party || '');
      setSimpleAmount(voucher.amount.toString());
    }

    setStatusMessage({ type: 'info', text: `✏️ Editing Voucher: ${voucher.reference_no || voucher.voucher_number}` });
    window.scrollTo({ top: 40, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingVoucherId(null);
    setRefNo('');
    setNarration('');
    setSimpleAmount('');
    setStatusMessage(null);
    loadData();
  };

  // Delete Voucher Trigger
  const handleDeleteVoucher = (voucherId, ref) => {
    if (!window.confirm(`Kya aap is voucher (${ref}) ko permanently delete karna chahte hain?`)) return;
    deleteUniversalVoucher(activeFirmId, voucherId);
    setStatusMessage({ type: 'success', text: `✓ Voucher ${ref} delete kar diya gaya.` });
    if (editingVoucherId === voucherId) handleCancelEdit();
    loadData();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatusMessage(null);

    try {
      if (isCompoundMode) {
        if (!isBalanced) {
          throw new Error(`Debit aur Credit barabar nahi hain! Difference: ₹${difference.toFixed(2)}`);
        }

        saveUniversalVoucher(activeFirmId, {
          id: editingVoucherId,
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
          text: editingVoucherId 
            ? `✓ Compound Voucher Updated! Total: ₹${totalDebit.toLocaleString('en-IN')}`
            : `✓ Compound Voucher Posted! Total: ₹${totalDebit.toLocaleString('en-IN')}`
        });
      } else {
        saveUniversalVoucher(activeFirmId, {
          id: editingVoucherId,
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
          text: editingVoucherId 
            ? `✓ Voucher Updated! Amount: ₹${parseFloat(simpleAmount).toLocaleString('en-IN')}`
            : `✓ ${voucherType} Voucher Posted! Amount: ₹${parseFloat(simpleAmount).toLocaleString('en-IN')}`
        });
      }

      handleCancelEdit();
      loadData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const filteredVouchers = recentVouchers.filter(v => {
    const term = searchTerm.toLowerCase();
    return (
      (v.voucher_number || '').toLowerCase().includes(term) ||
      (v.reference_no || '').toLowerCase().includes(term) ||
      (v.dr_account || '').toLowerCase().includes(term) ||
      (v.cr_account || '').toLowerCase().includes(term) ||
      (v.narration || '').toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
      
      {/* 1. EDIT MODE FLOATING NOTICE */}
      {editingVoucherId && (
        <div style={{ backgroundColor: '#0284c7', color: '#ffffff', padding: '12px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(2,132,199,0.3)' }}>
          <div>
            <strong style={{ fontSize: '13px' }}>✏️ EDIT MODE CHALU HAI</strong>
            <div style={{ fontSize: '11px', opacity: 0.9 }}>Purane voucher me badlav karke save karein.</div>
          </div>
          <button
            type="button"
            onClick={handleCancelEdit}
            style={{ backgroundColor: '#ffffff', color: '#0284c7', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ✕ Cancel Edit
          </button>
        </div>
      )}

      {/* 2. MAIN VOUCHER ENTRY FORM */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: `1px solid ${editingVoucherId ? '#0284c7' : '#cbd5e1'}`, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        
        {/* Header with Mode Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: editingVoucherId ? '#0284c7' : '#0f172a' }}>
              {editingVoucherId ? '✏️ Modify Voucher Entry' : '📝 Voucher Entry (रोज़नामचा प्रविष्टि)'}
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Double-Entry General Ledger & Real-Time Postings
            </span>
          </div>

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
              📑 Multi-Row (Compound)
            </button>
          </div>
        </div>

        {statusMessage && (
          <div style={{
            backgroundColor: statusMessage.type === 'success' ? '#ecfdf5' : (statusMessage.type === 'info' ? '#eff6ff' : '#fef2f2'),
            border: `1px solid ${statusMessage.type === 'success' ? '#a7f3d0' : (statusMessage.type === 'info' ? '#bfdbfe' : '#fecaca')}`,
            color: statusMessage.type === 'success' ? '#065f46' : (statusMessage.type === 'info' ? '#1d4ed8' : '#b91c1c'),
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 'bold',
            marginBottom: '16px'
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
                    padding: '10px 4px',
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

          {/* Date & Ref No */}
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

          {/* 1. SIMPLE MODE: VERTICAL STACKED TO PREVENT TEXT TRUNCATION */}
          {!isCompoundMode ? (
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ ...labelStyle, color: '#059669', fontSize: '12px' }}>
                  Debit Account (Dr - नामे) *
                </label>
                <select
                  value={drAccount}
                  onChange={e => setDrAccount(e.target.value)}
                  style={{ ...inputStyle, fontWeight: 'bold', backgroundColor: '#ffffff' }}
                  required
                >
                  {getFilteredAccounts('Dr').map(a => (
                    <option key={a.id} value={a.account_name}>
                      {a.account_name} ({a.sub_group || a.primary_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ ...labelStyle, color: '#dc2626', fontSize: '12px' }}>
                  Credit Account (Cr - जमा) *
                </label>
                <select
                  value={crAccount}
                  onChange={e => setCrAccount(e.target.value)}
                  style={{ ...inputStyle, fontWeight: 'bold', backgroundColor: '#ffffff' }}
                  required
                >
                  {getFilteredAccounts('Cr').map(a => (
                    <option key={a.id} value={a.account_name}>
                      {a.account_name} ({a.sub_group || a.primary_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Transaction Amount (₹) *</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0.00"
                  value={simpleAmount}
                  onChange={e => setSimpleAmount(e.target.value)}
                  style={{ ...inputStyle, fontSize: '18px', fontWeight: 'bold', color: '#0f172a', backgroundColor: '#ffffff' }}
                  required
                />
              </div>
            </div>
          ) : (
            /* 2. COMPOUND MULTI-ROW MODE */
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

              <div style={{ display: 'grid', gap: '8px' }}>
                {compoundLines.map((line) => (
                  <div key={line.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 100px 32px', gap: '6px', alignItems: 'center', backgroundColor: line.type === 'Dr' ? '#f0fdf4' : '#fef2f2', padding: '8px', borderRadius: '8px', border: `1px solid ${line.type === 'Dr' ? '#bbf7d0' : '#fecaca'}` }}>
                    <select
                      value={line.type}
                      onChange={e => handleLineChange(line.id, 'type', e.target.value)}
                      style={{ ...inputStyle, padding: '7px', fontWeight: 'bold', color: line.type === 'Dr' ? '#059669' : '#dc2626' }}
                    >
                      <option value="Dr">Dr</option>
                      <option value="Cr">Cr</option>
                    </select>

                    <select
                      value={line.account_name}
                      onChange={e => handleLineChange(line.id, 'account_name', e.target.value)}
                      style={{ ...inputStyle, padding: '7px', fontWeight: 'bold' }}
                      required
                    >
                      <option value="">-- Select Account --</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.account_name}>
                          {a.account_name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="Amount ₹"
                      value={line.amount}
                      onChange={e => handleLineChange(line.id, 'amount', e.target.value)}
                      style={{ ...inputStyle, padding: '7px', fontWeight: 'bold' }}
                      required
                    />

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

              <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '14px', fontSize: '11px', fontWeight: 'bold' }}>
                  <span style={{ color: '#059669' }}>Total Dr: ₹{totalDebit.toFixed(2)}</span>
                  <span style={{ color: '#dc2626' }}>Total Cr: ₹{totalCredit.toFixed(2)}</span>
                </div>
                <div>
                  {isBalanced ? (
                    <span style={{ color: '#166534', backgroundColor: '#dcfce7', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>✓ Balanced</span>
                  ) : (
                    <span style={{ color: '#991b1b', backgroundColor: '#fee2e2', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>⚠️ Diff: ₹{difference.toFixed(2)}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Narration / Remarks</label>
            <input
              type="text"
              placeholder="e.g. Paid cash for office expenses / diesel advance"
              value={narration}
              onChange={e => setNarration(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={isCompoundMode && !isBalanced}
            style={{
              backgroundColor: isCompoundMode && !isBalanced ? '#94a3b8' : (editingVoucherId ? '#0284c7' : '#059669'),
              color: '#ffffff',
              border: 'none',
              padding: '14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: isCompoundMode && !isBalanced ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
            }}
          >
            {editingVoucherId ? '💾 Save Changes & Update Voucher' : '💾 Post Double-Entry Voucher'}
          </button>
        </form>
      </div>

      {/* 3. DAYBOOK REGISTER: RESPONSIVE CARDS (GUARANTEED EDIT & DELETE BUTTONS) */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <strong style={{ fontSize: '14px', color: '#0f172a' }}>
            📖 Recent Daybook & Voucher Register ({filteredVouchers.length})
          </strong>
          <input
            type="text"
            placeholder="🔍 Search vouchers..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', width: '180px' }}
          />
        </div>

        {/* Responsive Mobile Voucher List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredVouchers.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
              No vouchers recorded yet.
            </div>
          ) : (
            filteredVouchers.map((v) => (
              <div 
                key={v.id} 
                style={{ 
                  backgroundColor: '#f8fafc', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '10px', 
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                {/* Top Row: Date, Voucher Type & Amount */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>{v.voucher_date || v.date}</span>
                    <span style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                      {v.voucher_type || v.type}
                    </span>
                    {v.reference_no && <span style={{ fontSize: '10px', color: '#0284c7', fontWeight: '600' }}>#{v.reference_no}</span>}
                  </div>
                  <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                    ₹{parseFloat(v.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                {/* Middle Row: Accounts Breakdown */}
                <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                  <div style={{ color: '#059669', fontWeight: 'bold' }}>Dr: {v.dr_account || v.dr_party}</div>
                  <div style={{ color: '#dc2626', fontWeight: 'bold' }}>Cr: {v.cr_account || v.cr_party}</div>
                  {v.narration && <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>({v.narration})</div>}
                </div>

                {/* Bottom Row: Explicit Action Buttons (Visible on all screens) */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(v)}
                    style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    ✏️ Edit Voucher
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteVoucher(v.id, v.reference_no || v.voucher_number)}
                    style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    🗑️ Delete
                  </button>
                </div>

              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#0f172a' };
