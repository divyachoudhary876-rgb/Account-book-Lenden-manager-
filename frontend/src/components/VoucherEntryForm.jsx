// frontend/src/components/VoucherEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import { StorageService } from '../utils/storageSync';
import { 
  saveUniversalVoucher, 
  getUniversalVouchersByFirm, 
  deleteUniversalVoucher 
} from '../utils/voucherPostingEngine.js';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';

export default function VoucherEntryForm({ firm }) {
  const activeFirmId = firm?.id || firm?.firm_id || 'FIRM-001';
  const todayMaxDate = new Date().toISOString().split('T')[0];

  const [accounts, setAccounts] = useState([]);
  const [voucherList, setVoucherList] = useState([]);
  
  const [editingId, setEditingId] = useState(null);

  const [voucherType, setVoucherType] = useState('PAYMENT');
  const [voucherDate, setVoucherDate] = useState(todayMaxDate);
  const [referenceNo, setReferenceNo] = useState('');
  const [drAccount, setDrAccount] = useState('');
  const [crAccount, setCrAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [status, setStatus] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');

  const loadData = () => {
    try {
      const accList = getFirmMasterAccounts(activeFirmId);
      setAccounts(accList);
      if (accList.length > 0 && !drAccount) {
        setDrAccount(accList[0].account_name);
        const cashAcc = accList.find(a => a.account_name.toLowerCase().includes('cash')) || accList[1] || accList[0];
        setCrAccount(cashAcc.account_name);
      }

      // Load using original robust method with fallbacks
      let vchs = getUniversalVouchersByFirm(activeFirmId);
      if (!Array.isArray(vchs) || vchs.length === 0) {
        vchs = [
          ...(StorageService.getItem('account_book_vouchers') || []),
          ...(StorageService.getItem(`account_book_vouchers_${activeFirmId}`) || []),
          ...(StorageService.getItem(`app_vouchers_${activeFirmId}`) || [])
        ];
      }

      // Sort newest first
      vchs.sort((a, b) => new Date(b.voucher_date || b.date || 0) - new Date(a.voucher_date || a.date || 0));
      setVoucherList(vchs);
    } catch (e) {
      console.error("Error loading vouchers:", e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_state_updated', loadData);
    window.addEventListener('app_storage_updated', loadData);
    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('app_state_updated', loadData);
      window.removeEventListener('app_storage_updated', loadData);
      window.removeEventListener('storage', loadData);
    };
  }, [activeFirmId]);

  const handleEditInit = (voucher) => {
    setEditingId(voucher.id);
    setVoucherType(voucher.voucher_type || voucher.type || 'PAYMENT');
    setVoucherDate(voucher.voucher_date || voucher.date || todayMaxDate);
    setReferenceNo(voucher.reference_no || voucher.voucher_number || '');
    setDrAccount(voucher.dr_account || voucher.dr_party || '');
    setCrAccount(voucher.cr_account || voucher.cr_party || '');
    setAmount(voucher.amount ? voucher.amount.toString() : '');
    setNarration(voucher.narration || '');
    setStatus({
      type: 'info',
      text: `✏️ Editing Voucher #${voucher.reference_no || voucher.voucher_number}. Modify details and click Update.`
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setAmount('');
    setNarration('');
    setReferenceNo('');
    setStatus(null);
  };

  const handleDeleteVoucher = (vchId, vchNum) => {
    const confirmed = window.confirm(`Voucher #${vchNum || ''} ko permanently delete karein? Yeh len-den khate se hat jayega.`);
    if (!confirmed) return;

    try {
      deleteUniversalVoucher(activeFirmId, vchId);
      if (editingId === vchId) handleCancelEdit();
      setStatus({ type: 'success', text: `✓ Voucher #${vchNum || ''} successfully deleted.` });
      loadData();
    } catch (err) {
      setStatus({ type: 'error', text: `Delete failed: ${err.message}` });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus(null);

    const cleanAmount = parseFloat(amount);
    if (!cleanAmount || cleanAmount <= 0) {
      setStatus({ type: 'error', text: 'Transaction amount zero se adhik hona chahiye.' });
      return;
    }

    try {
      saveUniversalVoucher(activeFirmId, {
        id: editingId,
        voucher_type: voucherType,
        voucher_date: voucherDate,
        reference_no: referenceNo,
        dr_account: drAccount,
        cr_account: crAccount,
        amount: cleanAmount,
        narration
      });

      setStatus({
        type: 'success',
        text: editingId
          ? `✓ Voucher Updated Successfully! Amount: ₹${cleanAmount.toLocaleString('en-IN')}`
          : `✓ ${voucherType} Voucher Saved! Amount: ₹${cleanAmount.toLocaleString('en-IN')}`
      });

      setEditingId(null);
      setAmount('');
      setNarration('');
      setReferenceNo('');
      loadData();
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  const filteredVouchers = voucherList.filter(v => {
    if (!v) return false;
    const q = searchFilter.toLowerCase();
    return (
      (v.reference_no && String(v.reference_no).toLowerCase().includes(q)) ||
      (v.voucher_number && String(v.voucher_number).toLowerCase().includes(q)) ||
      (v.dr_account && String(v.dr_account).toLowerCase().includes(q)) ||
      (v.cr_account && String(v.cr_account).toLowerCase().includes(q)) ||
      (v.narration && String(v.narration).toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ width: '100%', maxWidth: '650px', margin: '0 auto', boxSizing: 'border-box', padding: '12px 12px 60px 12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header Banner */}
      <div style={cardStyle}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
          Voucher Entry (रोज़नामचा प्रविष्टि)
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>
          Double-Entry General Ledger & Real-Time Postings
        </p>
      </div>

      {status && (
        <div style={{
          backgroundColor: status.type === 'success' ? '#ecfdf5' : status.type === 'info' ? '#eff6ff' : '#fef2f2',
          border: `1px solid ${status.type === 'success' ? '#a7f3d0' : status.type === 'info' ? '#bfdbfe' : '#fecaca'}`,
          color: status.type === 'success' ? '#065f46' : status.type === 'info' ? '#1e40af' : '#991b1b',
          padding: '10px 14px',
          borderRadius: '10px',
          fontSize: '12px',
          fontWeight: 'bold',
          boxSizing: 'border-box',
          width: '100%'
        }}>
          {status.text}
        </div>
      )}

      {/* Main Voucher Entry Form */}
      <form onSubmit={handleSubmit} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Voucher Type Selector */}
        <div>
          <label style={labelStyle}>Voucher Type *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
            {['PAYMENT', 'RECEIPT', 'CONTRA', 'JOURNAL'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setVoucherType(type)}
                style={{
                  padding: '9px 4px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: voucherType === type ? '#0f172a' : '#cbd5e1',
                  backgroundColor: voucherType === type ? '#0f172a' : '#ffffff',
                  color: voucherType === type ? '#ffffff' : '#334155',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textAlign: 'center',
                  boxSizing: 'border-box'
                }}
              >
                {type === 'PAYMENT' && '💳 Payment'}
                {type === 'RECEIPT' && '📥 Receipt'}
                {type === 'CONTRA' && '🏛️️ Contra'}
                {type === 'JOURNAL' && '📝 Journal'}
              </button>
            ))}
          </div>
        </div>

        {/* Date & Ref */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
          <div>
            <label style={labelStyle}>Date *</label>
            <input
              type="date"
              max={todayMaxDate}
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

        {/* Debit Account Selector */}
        <div style={{ width: '100%', boxSizing: 'border-box', position: 'relative', zIndex: 10 }}>
          <SearchableAccountDropdown
            label="Debit Account (Dr - नामे) *"
            accounts={accounts}
            value={drAccount}
            onChange={val => setDrAccount(val)}
            placeholder="Search debit account..."
            colorAccent="#059669"
            required
          />
        </div>

        {/* Credit Account Selector */}
        <div style={{ width: '100%', boxSizing: 'border-box', position: 'relative', zIndex: 9 }}>
          <SearchableAccountDropdown
            label="Credit Account (Cr - जमा) *"
            accounts={accounts}
            value={crAccount}
            onChange={val => setCrAccount(val)}
            placeholder="Search credit account..."
            colorAccent="#dc2626"
            required
          />
        </div>

        {/* Amount */}
        <div style={{ width: '100%', boxSizing: 'border-box' }}>
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
        <div style={{ width: '100%', boxSizing: 'border-box' }}>
          <label style={labelStyle}>Narration / Remarks</label>
          <input
            type="text"
            placeholder="e.g. Paid cash for office expenses / diesel"
            value={narration}
            onChange={e => setNarration(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Submit & Cancel Buttons */}
        <div style={{ display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box', marginTop: '4px' }}>
          <button
            type="submit"
            style={{
              flex: 1,
              backgroundColor: editingId ? '#0284c7' : '#059669',
              color: '#ffffff',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {editingId ? '✓ Update Modified Voucher' : '💾 Post Double-Entry Voucher'}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
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

      {/* Editable Voucher Register List */}
      <div style={cardStyle}>
        <div style={{ marginBottom: '10px' }}>
          <strong style={{ fontSize: '13px', color: '#0f172a' }}>
            📋 Recent Daybook & Voucher Register ({filteredVouchers.length})
          </strong>
          <div style={{ fontSize: '10px', color: '#64748b' }}>Click Edit to modify or Delete to reverse</div>
        </div>

        <input
          type="text"
          placeholder="🔍 Search vouchers by party, ref no, narration..."
          value={searchFilter}
          onChange={e => setSearchFilter(e.target.value)}
          style={{ ...inputStyle, padding: '8px 12px', fontSize: '11px', marginBottom: '12px' }}
        />

        {/* Scrollable Container with Non-Overlapping Card Layout */}
        <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
          {filteredVouchers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '12px' }}>
              No recorded vouchers found for this firm.
            </div>
          ) : (
            filteredVouchers.map((vch) => {
              const amt = parseFloat(vch.amount || 0);
              const isSelected = editingId === vch.id;

              return (
                <div
                  key={vch.id}
                  style={{
                    backgroundColor: isSelected ? '#f0f9ff' : '#f8fafc',
                    border: `1px solid ${isSelected ? '#0284c7' : '#e2e8f0'}`,
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxSizing: 'border-box',
                    width: '100%'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                        {vch.voucher_date || vch.date}
                      </span>
                      <strong style={{ fontSize: '12px', color: '#0f172a' }}>
                        {vch.reference_no || vch.voucher_number}
                      </strong>
                      <span style={{ fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#e0e7ff', color: '#3730a3' }}>
                        {vch.voucher_type || vch.type}
                      </span>
                    </div>
                    <strong style={{ fontSize: '13px', color: '#059669', whiteSpace: 'nowrap' }}>
                      ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <div style={{ fontSize: '11px', lineHeight: '1.5', wordBreak: 'break-word', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ color: '#059669', fontWeight: '700' }}>Dr: {vch.dr_account || vch.dr_party}</div>
                    <div style={{ color: '#dc2626', fontWeight: '700' }}>Cr: {vch.cr_account || vch.cr_party}</div>
                    {vch.narration && (
                      <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
                        Note: {vch.narration}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '2px' }}>
                    <button
                      type="button"
                      onClick={() => handleEditInit(vch)}
                      style={{
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVoucher(vch.id, vch.reference_no || vch.voucher_number)}
                      style={{
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #fecaca',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ Delete
                    </button>
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
  padding: '14px',
  border: '1px solid #cbd5e1',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
  boxSizing: 'border-box',
  width: '100%'
};

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#334155',
  marginBottom: '4px'
};

const inputStyle = {
  width: '100%',
  padding: '9px 10px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '12px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  outline: 'none'
};
