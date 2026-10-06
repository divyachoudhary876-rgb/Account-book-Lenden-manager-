// frontend/src/components/VoucherEntryForm.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import { saveUniversalVoucher, deleteUniversalVoucher } from '../utils/voucherPostingEngine.js';
import { getAllUniversalVouchers } from '../utils/statementEngine.js';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export default function VoucherEntryForm({ firm, onClose }) {
  const activeFirmId = useMemo(() => {
    return firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  }, [firm]);

  const todayMaxDate = new Date().toISOString().split('T')[0];

  const [accountsList, setAccountsList] = useState([]);
  const [voucherType, setVoucherType] = useState('Payment');
  const [voucherDate, setVoucherDate] = useState(todayMaxDate);
  const [refNo, setRefNo] = useState('');
  const [narration, setNarration] = useState('');

  // Mode Switch: Simple (1 Dr, 1 Cr) vs Compound (Multiple Dr, Multiple Cr)
  const [isCompoundMode, setIsCompoundMode] = useState(false);

  // Dynamic Multi-Entry Rows
  const [drRows, setDrRows] = useState([{ id: 1, account: '', amount: '' }]);
  const [crRows, setCrRows] = useState([{ id: 2, account: '', amount: '' }]);

  // Simple Mode Fallback States
  const [simpleDrAccount, setSimpleDrAccount] = useState('');
  const [simpleCrAccount, setSimpleCrAccount] = useState('');
  const [simpleAmount, setSimpleAmount] = useState('');

  const [allVouchers, setAllVouchers] = useState([]);
  const [editingVoucherId, setEditingVoucherId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Load Accounts & Recent Vouchers
  const loadData = useCallback(() => {
    try {
      const allAccs = getFirmMasterAccounts(activeFirmId) || [];
      setAccountsList(allAccs);

      const vchs = getAllUniversalVouchers(activeFirmId) || [];
      vchs.sort((a, b) => new Date(b.date || b.voucher_date || 0) - new Date(a.date || a.voucher_date || 0));
      setAllVouchers(vchs);

      if (!editingVoucherId) {
        setRefNo(String(Math.floor(1000 + Math.random() * 9000)));
      }
    } catch (err) {
      console.error('Error loading voucher form data:', err);
    }
  }, [activeFirmId, editingVoucherId]);

  useEffect(() => {
    loadData();
    window.addEventListener('app_storage_updated', loadData);
    window.addEventListener('app_state_updated', loadData);
    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('app_storage_updated', loadData);
      window.removeEventListener('app_state_updated', loadData);
      window.removeEventListener('storage', loadData);
    };
  }, [loadData]);

  // Dynamic Row Handlers
  const handleAddDrRow = () => {
    setIsCompoundMode(true);
    setDrRows(prev => [...prev, { id: Date.now() + Math.random(), account: '', amount: '' }]);
  };

  const handleRemoveDrRow = (id) => {
    if (drRows.length <= 1) return;
    setDrRows(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateDrRow = (id, field, value) => {
    setDrRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleAddCrRow = () => {
    setIsCompoundMode(true);
    setCrRows(prev => [...prev, { id: Date.now() + Math.random(), account: '', amount: '' }]);
  };

  const handleRemoveCrRow = (id) => {
    if (crRows.length <= 1) return;
    setCrRows(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateCrRow = (id, field, value) => {
    setCrRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // Totals Calculation
  const totalDebitAmount = useMemo(() => {
    if (!isCompoundMode) return round2(Number(simpleAmount) || 0);
    return round2(drRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0));
  }, [isCompoundMode, simpleAmount, drRows]);

  const totalCreditAmount = useMemo(() => {
    if (!isCompoundMode) return round2(Number(simpleAmount) || 0);
    return round2(crRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0));
  }, [isCompoundMode, simpleAmount, crRows]);

  const differenceAmount = round2(Math.abs(totalDebitAmount - totalCreditAmount));
  const isBalanced = isCompoundMode ? (totalDebitAmount > 0 && totalDebitAmount === totalCreditAmount) : (Number(simpleAmount) > 0);

  // Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();
    setStatusMessage(null);

    const vchId = editingVoucherId || `VCH-${Date.now()}`;
    const vchNumber = refNo.trim() || String(Date.now().toString().slice(-4));

    let finalEntries = [];
    let primaryDr = '';
    let primaryCr = '';
    let voucherTotalAmount = 0;

    if (isCompoundMode) {
      if (totalDebitAmount <= 0 || totalCreditAmount <= 0) {
        setStatusMessage({ type: 'error', text: 'Kripya sabhi Dr aur Cr lines me valid amount darj karein!' });
        return;
      }
      if (totalDebitAmount !== totalCreditAmount) {
        setStatusMessage({ type: 'error', text: `Voucher unbalance hai! Debit: ₹${totalDebitAmount} | Credit: ₹${totalCreditAmount} (Farak: ₹${differenceAmount})` });
        return;
      }

      // Validate Dr Accounts
      for (const r of drRows) {
        const accName = typeof r.account === 'object' ? (r.account.account_name || r.account.name || '') : r.account;
        if (!accName.trim() || Number(r.amount) <= 0) {
          setStatusMessage({ type: 'error', text: 'Sabhi Debit lines me Account aur Amount darj karna anivarya hai.' });
          return;
        }
        finalEntries.push({
          account_name: accName.trim(),
          party: accName.trim(),
          type: 'DR',
          debit: round2(Number(r.amount)),
          credit: 0,
          amount: round2(Number(r.amount))
        });
      }

      // Validate Cr Accounts
      for (const r of crRows) {
        const accName = typeof r.account === 'object' ? (r.account.account_name || r.account.name || '') : r.account;
        if (!accName.trim() || Number(r.amount) <= 0) {
          setStatusMessage({ type: 'error', text: 'Sabhi Credit lines me Account aur Amount darj karna anivarya hai.' });
          return;
        }
        finalEntries.push({
          account_name: accName.trim(),
          party: accName.trim(),
          type: 'CR',
          debit: 0,
          credit: round2(Number(r.amount)),
          amount: round2(Number(r.amount))
        });
      }

      primaryDr = finalEntries.find(e => e.type === 'DR')?.account_name || '';
      primaryCr = finalEntries.find(e => e.type === 'CR')?.account_name || '';
      voucherTotalAmount = totalDebitAmount;
    } else {
      const drName = typeof simpleDrAccount === 'object' ? (simpleDrAccount.account_name || simpleDrAccount.name || '') : simpleDrAccount;
      const crName = typeof simpleCrAccount === 'object' ? (simpleCrAccount.account_name || simpleCrAccount.name || '') : simpleCrAccount;
      const amt = round2(Number(simpleAmount) || 0);

      if (!drName.trim() || !crName.trim()) {
        setStatusMessage({ type: 'error', text: 'Kripya Debit aur Credit dono accounts chunein!' });
        return;
      }
      if (amt <= 0) {
        setStatusMessage({ type: 'error', text: 'Kripya valid Transaction Amount (> 0) darj karein!' });
        return;
      }

      primaryDr = drName.trim();
      primaryCr = crName.trim();
      voucherTotalAmount = amt;

      finalEntries = [
        { account_name: primaryDr, party: primaryDr, type: 'DR', debit: amt, credit: 0, amount: amt },
        { account_name: primaryCr, party: primaryCr, type: 'CR', debit: 0, credit: amt, amount: amt }
      ];
    }

    try {
      const payload = {
        id: vchId,
        firm_id: activeFirmId,
        firmId: activeFirmId,
        voucher_type: voucherType.toUpperCase(),
        type: voucherType.toUpperCase(),
        voucher_number: vchNumber,
        reference_no: vchNumber,
        voucher_date: voucherDate,
        date: voucherDate,
        dr_account: primaryDr,
        cr_account: primaryCr,
        amount: voucherTotalAmount,
        total_amount: voucherTotalAmount,
        narration: narration.trim() || `${voucherType} Voucher #${vchNumber}`,
        is_compound: isCompoundMode,
        entries: finalEntries
      };

      saveUniversalVoucher(activeFirmId, payload);

      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('storage'));

      setStatusMessage({
        type: 'success',
        text: editingVoucherId 
          ? `✓ Voucher #${vchNumber} successfully update ho gaya!` 
          : `✓ Voucher #${vchNumber} (₹${voucherTotalAmount.toLocaleString('en-IN')}) successfully post ho gaya!`
      });

      // Reset
      setEditingVoucherId(null);
      setSimpleAmount('');
      setNarration('');
      setDrRows([{ id: 1, account: '', amount: '' }]);
      setCrRows([{ id: 2, account: '', amount: '' }]);
      setRefNo(String(Math.floor(1000 + Math.random() * 9000)));
      loadData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Error: ${err.message}` });
    }
  };

  const handleEditInit = (vch) => {
    if (!vch) return;
    setEditingVoucherId(vch.id);
    setVoucherType(vch.voucher_type || vch.type || 'Journal');
    setVoucherDate(vch.date || vch.voucher_date || todayMaxDate);
    setRefNo(vch.voucher_number || vch.reference_no || '');
    setNarration(vch.narration || '');

    if (Array.isArray(vch.entries) && vch.entries.length > 2) {
      setIsCompoundMode(true);
      const drs = vch.entries.filter(e => (e.type || '').toUpperCase() === 'DR' || Number(e.debit) > 0);
      const crs = vch.entries.filter(e => (e.type || '').toUpperCase() === 'CR' || Number(e.credit) > 0);

      setDrRows(drs.map((d, i) => ({ id: i + 1, account: d.account_name || d.party || '', amount: String(d.amount || d.debit || '') })));
      setCrRows(crs.map((c, i) => ({ id: i + 10, account: c.account_name || c.party || '', amount: String(c.amount || c.credit || '') })));
    } else {
      setIsCompoundMode(false);
      setSimpleDrAccount(vch.dr_account || vch.debit_account || '');
      setSimpleCrAccount(vch.cr_account || vch.credit_account || '');
      setSimpleAmount(String(vch.amount || vch.total_amount || ''));
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (vchId) => {
    if (!window.confirm('Is voucher ko delete karne se sabhi related accounts purani sthiti me aa jayenge. Jari rakhein?')) return;
    try {
      deleteUniversalVoucher(activeFirmId, vchId);
      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('storage'));
      loadData();
      alert('✓ Voucher successfully delete ho gaya.');
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const filteredVouchers = allVouchers.filter(v => {
    const q = (searchFilter || '').toLowerCase();
    const narr = (v.narration || '').toLowerCase();
    const dr = (v.dr_account || '').toLowerCase();
    const cr = (v.cr_account || '').toLowerCase();
    const num = String(v.voucher_number || v.reference_no || '').toLowerCase();
    return narr.includes(q) || dr.includes(q) || cr.includes(q) || num.includes(q);
  });

  return (
    <div style={{ width: '100%', maxWidth: '650px', margin: '0 auto', boxSizing: 'border-box', padding: '10px 10px 60px 10px', display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Header Banner */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
              Voucher Entry (रोज़नामचा प्रविष्टि)
            </h2>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Double-Entry General Ledger & Real-Time Postings</span>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
              Close
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div style={{
          backgroundColor: statusMessage.type === 'error' ? '#fef2f2' : '#ecfdf5',
          border: `1px solid ${statusMessage.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
          color: statusMessage.type === 'error' ? '#991b1b' : '#065f46',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: 'bold',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {statusMessage.text}
        </div>
      )}

      {/* Main Voucher Form */}
      <form onSubmit={handleSubmit} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Voucher Type Selector */}
        <div>
          <label style={labelStyle}>VOUCHER TYPE *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {['Payment', 'Receipt', 'Contra', 'Journal'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setVoucherType(t)}
                style={{
                  padding: '9px 4px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: voucherType.toLowerCase() === t.toLowerCase() ? '#0f172a' : '#cbd5e1',
                  backgroundColor: voucherType.toLowerCase() === t.toLowerCase() ? '#0f172a' : '#ffffff',
                  color: voucherType.toLowerCase() === t.toLowerCase() ? '#ffffff' : '#475569',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Date & Ref No */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>DATE *</label>
            <input type="date" max={todayMaxDate} value={voucherDate} onChange={e => setVoucherDate(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>REFERENCE NO / VOUCHER NO *</label>
            <input type="text" value={refNo} onChange={e => setRefNo(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold', color: '#0284c7' }} required />
          </div>
        </div>

        {/* MODE TOGGLE BAR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#334155' }}>
            {isCompoundMode ? '⚡ Multiple Accounts Mode (Compound Entry)' : '📋 Single Entry Mode'}
          </span>
          <button
            type="button"
            onClick={() => setIsCompoundMode(!isCompoundMode)}
            style={{
              backgroundColor: isCompoundMode ? '#0284c7' : '#f1f5f9',
              color: isCompoundMode ? '#ffffff' : '#0f172a',
              border: '1px solid #cbd5e1',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {isCompoundMode ? 'Switch to Simple Mode' : '+ Enable Multiple Dr / Cr'}
          </button>
        </div>

        {/* -------------------- SIMPLE MODE -------------------- */}
        {!isCompoundMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <SearchableAccountDropdown
                label="Debit Account (Dr - नामे) * *"
                accounts={accountsList}
                value={simpleDrAccount}
                onChange={val => setSimpleDrAccount(val)}
                placeholder="-- Select Debit Account --"
                colorAccent="#0284c7"
                required
              />
              <div style={{ textAlign: 'right', marginTop: '2px' }}>
                <button type="button" onClick={handleAddDrRow} style={linkAddStyle}>
                  + Add more Dr accounts
                </button>
              </div>
            </div>

            <div>
              <SearchableAccountDropdown
                label="Credit Account (Cr - जमा) * *"
                accounts={accountsList}
                value={simpleCrAccount}
                onChange={val => setSimpleCrAccount(val)}
                placeholder="-- Select Credit Account --"
                colorAccent="#dc2626"
                required
              />
              <div style={{ textAlign: 'right', marginTop: '2px' }}>
                <button type="button" onClick={handleAddCrRow} style={linkAddStyle}>
                  + Add more Cr accounts
                </button>
              </div>
            </div>

            <div>
              <label style={labelStyle}>TRANSACTION AMOUNT (₹) *</label>
              <input type="number" step="0.01" placeholder="0.00" value={simpleAmount} onChange={e => setSimpleAmount(e.target.value)} style={{ ...inputStyle, fontSize: '14px', fontWeight: 'bold', color: '#059669' }} required />
            </div>
          </div>
        ) : (
          /* -------------------- COMPOUND MULTI-ENTRY MODE -------------------- */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* DEBIT (DR) MULTIPLE ROWS SECTION */}
            <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#0369a1' }}>
                  DEBIT ACCOUNTS (Dr - नामे)
                </span>
                <span style={{ fontSize: '11px', fontWeight: '900', color: '#0369a1' }}>
                  Total Dr: ₹{totalDebitAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {drRows.map((row, idx) => (
                  <div key={row.id} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 2, minWidth: 0 }}>
                      <SearchableAccountDropdown
                        label={idx === 0 ? "Dr Account *" : ""}
                        accounts={accountsList}
                        value={row.account}
                        onChange={val => handleUpdateDrRow(row.id, 'account', val)}
                        placeholder="Select Dr Account..."
                        colorAccent="#0284c7"
                        required
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '90px' }}>
                      {idx === 0 && <label style={labelStyle}>Dr Amount (₹) *</label>}
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={row.amount}
                        onChange={e => handleUpdateDrRow(row.id, 'amount', e.target.value)}
                        style={{ ...inputStyle, padding: '8px', fontWeight: 'bold', color: '#0369a1' }}
                        required
                      />
                    </div>
                    {drRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDrRow(row.id)}
                        style={{ marginTop: idx === 0 ? '20px' : '4px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '8px 10px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddDrRow}
                style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#e0f2fe', color: '#0284c7', border: '1px dashed #0284c7', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
              >
                + Add Another Debit (Dr) Account
              </button>
            </div>

            {/* CREDIT (CR) MULTIPLE ROWS SECTION */}
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#991b1b' }}>
                  CREDIT ACCOUNTS (Cr - जमा)
                </span>
                <span style={{ fontSize: '11px', fontWeight: '900', color: '#991b1b' }}>
                  Total Cr: ₹{totalCreditAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {crRows.map((row, idx) => (
                  <div key={row.id} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 2, minWidth: 0 }}>
                      <SearchableAccountDropdown
                        label={idx === 0 ? "Cr Account *" : ""}
                        accounts={accountsList}
                        value={row.account}
                        onChange={val => handleUpdateCrRow(row.id, 'account', val)}
                        placeholder="Select Cr Account..."
                        colorAccent="#dc2626"
                        required
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '90px' }}>
                      {idx === 0 && <label style={labelStyle}>Cr Amount (₹) *</label>}
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={row.amount}
                        onChange={e => handleUpdateCrRow(row.id, 'amount', e.target.value)}
                        style={{ ...inputStyle, padding: '8px', fontWeight: 'bold', color: '#991b1b' }}
                        required
                      />
                    </div>
                    {crRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCrRow(row.id)}
                        style={{ marginTop: idx === 0 ? '20px' : '4px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '8px 10px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddCrRow}
                style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px dashed #b91c1c', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
              >
                + Add Another Credit (Cr) Account
              </button>
            </div>

            {/* LIVE DOUBLE-ENTRY BALANCE GAUGE */}
            <div style={{
              backgroundColor: isBalanced ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${isBalanced ? '#a7f3d0' : '#fecaca'}`,
              borderRadius: '8px',
              padding: '10px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: isBalanced ? '#065f46' : '#991b1b' }}>
                  {isBalanced ? '✓ DOUBLE-ENTRY BALANCED (DR = CR)' : '⚠️ UNBALANCED VOUCHER (DIFFERENCE)'}
                </span>
                <div style={{ fontSize: '12px', fontWeight: '800', color: isBalanced ? '#059669' : '#dc2626' }}>
                  Dr: ₹{totalDebitAmount.toFixed(2)} | Cr: ₹{totalCreditAmount.toFixed(2)}
                </div>
              </div>
              {!isBalanced && (
                <div style={{ fontSize: '12px', fontWeight: '900', color: '#dc2626' }}>
                  Farak: ₹{differenceAmount.toFixed(2)}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Narration */}
        <div>
          <label style={labelStyle}>NARRATION / REMARKS</label>
          <input
            type="text"
            placeholder="e.g. Paid cash for office expenses / tractor down payment"
            value={narration}
            onChange={e => setNarration(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button
            type="submit"
            disabled={!isBalanced}
            style={{
              flex: 1,
              backgroundColor: !isBalanced ? '#94a3b8' : '#059669',
              color: '#ffffff',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: !isBalanced ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            {editingVoucherId ? `✓ Update Voucher (#${refNo})` : `💾 Post Double-Entry Voucher (#${refNo})`}
          </button>

          {editingVoucherId && (
            <button
              type="button"
              onClick={() => {
                setEditingVoucherId(null);
                setSimpleAmount('');
                setNarration('');
                setDrRows([{ id: 1, account: '', amount: '' }]);
                setCrRows([{ id: 2, account: '', amount: '' }]);
                setRefNo(String(Math.floor(1000 + Math.random() * 9000)));
              }}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          )}
        </div>

      </form>

      {/* Recent Voucher Register */}
      <div style={cardStyle}>
        <div style={{ marginBottom: '8px' }}>
          <strong style={{ fontSize: '13px', color: '#0f172a' }}>
            📋 Recent Daybook & Voucher Register ({filteredVouchers.length})
          </strong>
        </div>

        <input
          type="text"
          placeholder="🔍 Search vouchers by party, account, narration..."
          value={searchFilter}
          onChange={e => setSearchFilter(e.target.value)}
          style={{ ...inputStyle, padding: '7px 10px', fontSize: '11px', marginBottom: '8px' }}
        />

        <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filteredVouchers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '11px' }}>
              Koi voucher record nahi mila.
            </div>
          ) : (
            filteredVouchers.map((v) => {
              const amt = Number(v.amount || v.total_amount || 0);
              const isSelected = editingVoucherId === v.id;

              return (
                <div
                  key={v.id}
                  style={{
                    backgroundColor: isSelected ? '#ecfdf5' : '#f8fafc',
                    border: `1px solid ${isSelected ? '#059669' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    padding: '8px 10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '9px', fontWeight: 'bold', backgroundColor: '#e2e8f0', padding: '2px 5px', borderRadius: '4px', color: '#475569' }}>
                        {v.voucher_type || v.type} #{v.voucher_number || v.reference_no}
                      </span>
                      <span style={{ color: '#64748b' }}>{v.date || v.voucher_date}</span>
                    </div>

                    <div style={{ marginTop: '2px' }}>
                      <strong style={{ color: '#0284c7' }}>Dr: {v.dr_account || 'Compound Dr'}</strong> ➔ <strong style={{ color: '#dc2626' }}>Cr: {v.cr_account || 'Compound Cr'}</strong>
                    </div>

                    {v.narration && (
                      <div style={{ color: '#64748b', fontSize: '10px', marginTop: '1px' }}>
                        {v.narration}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '900', color: '#059669' }}>
                      ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => handleEditInit(v)}
                        style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', padding: '3px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(v.id)}
                        style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '3px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '12px',
  border: '1px solid #cbd5e1',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
  boxSizing: 'border-box',
  width: '100%'
};

const labelStyle = {
  display: 'block',
  fontSize: '10px',
  fontWeight: 'bold',
  color: '#334155',
  marginBottom: '3px',
  textTransform: 'uppercase'
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

const linkAddStyle = {
  background: 'none',
  border: 'none',
  color: '#0284c7',
  fontSize: '10px',
  fontWeight: 'bold',
  cursor: 'pointer',
  padding: '0'
};
