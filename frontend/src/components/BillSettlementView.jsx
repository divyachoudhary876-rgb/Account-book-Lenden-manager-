// frontend/src/components/BillSettlementView.jsx

import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';

export default function BillSettlementView({ firm, selectedFY }) {
  const activeFirmId = firm?.id || firm?.firm_id || 'FIRM-001';
  const accountsStorageKey = `account_heads_${activeFirmId}`;
  const voucherStorageKey = `account_book_vouchers_${activeFirmId}`;
  const todayMaxDate = new Date().toISOString().split('T')[0];

  const [debtors, setDebtors] = useState([]);
  const [bankCashAccounts, setBankCashAccounts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [receivingAccount, setReceivingAccount] = useState('Cash-in-Hand');
  const [amountReceived, setAmountReceived] = useState('');
  const [settlementDate, setSettlementDate] = useState(todayMaxDate);
  const [narration, setNarration] = useState('');

  const loadAccounts = () => {
    try {
      const allAccounts = getFirmMasterAccounts(activeFirmId) || [];
      
      // Filter Debtors / Customers / Assets
      const customerList = allAccounts.filter(a => 
        String(a.type).toLowerCase() === 'assets' || 
        String(a.group).toLowerCase().includes('debtor') ||
        String(a.group).toLowerCase().includes('customer')
      );
      setDebtors(customerList);
      if (customerList.length > 0 && !selectedCustomer) {
        setSelectedCustomer(customerList[0].name || customerList[0].account_name);
      }

      // Filter Cash or Bank accounts for receiving money
      const cashBankList = allAccounts.filter(a => 
        String(a.group).toLowerCase().includes('cash') || 
        String(a.group).toLowerCase().includes('bank')
      );
      setBankCashAccounts(cashBankList);
      if (cashBankList.length > 0 && !receivingAccount) {
        setReceivingAccount(cashBankList[0].name || cashBankList[0].account_name);
      }
    } catch (e) {
      console.error('Failed loading accounts for settlement:', e);
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

  const handleConfirmSettlement = (e) => {
    e.preventDefault();
    const amt = Number(amountReceived) || 0;
    if (!selectedCustomer || amt <= 0) {
      alert('Kripya valid customer aur amount darj karein!');
      return;
    }

    try {
      // Create Professional Double-Entry Receipt Voucher (Dr. Cash/Bank, Cr. Customer)
      const newVoucher = {
        id: 'REC-' + Date.now(),
        voucher_type: 'RECEIPT',
        voucher_date: settlementDate,
        reference_no: 'SETT-' + Math.floor(1000 + Math.random() * 9000),
        firm_id: activeFirmId,
        selectedFY: selectedFY || 'FY 2026-27',
        narration: narration.trim() || `Bill settlement received from ${selectedCustomer}`,
        amount: amt,
        total_amount: amt,
        entries: [
          { account_name: receivingAccount, type: 'DR', amount: amt },
          { account_name: selectedCustomer, type: 'CR', amount: amt }
        ]
      };

      const existingVouchers = StorageService.getItem ? StorageService.getItem(voucherStorageKey) : JSON.parse(localStorage.getItem(voucherStorageKey) || '[]');
      const updatedVouchers = [newVoucher, ...(Array.isArray(existingVouchers) ? existingVouchers : [])];
      
      StorageService.setItem(voucherStorageKey, updatedVouchers);
      window.dispatchEvent(new Event('app_storage_updated'));

      alert(`✓ ₹${amt.toLocaleString('en-IN')} settlement successfully recorded for ${selectedCustomer}!`);
      setAmountReceived('');
      setNarration('');
    } catch (err) {
      alert(`Error saving settlement: ${err.message}`);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', maxWidth: '600px', margin: '0 auto', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', color: '#0f172a', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <h3 style={{ margin: '0 0 14px 0', color: '#0f172a', fontSize: '15px', fontWeight: 'bold' }}>💳 Customer Bill Settlement & Knock-Off</h3>

      <form onSubmit={handleConfirmSettlement}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '11px', color: '#475569', marginBottom: '4px' }}>Select Customer / Debtor *</label>
          <select 
            value={selectedCustomer} 
            onChange={(e) => setSelectedCustomer(e.target.value)}
            style={inputStyle}
            required
          >
            {debtors.length === 0 ? (
              <option value="">-- No Customer Accounts Found --</option>
            ) : (
              debtors.map((d, idx) => (
                <option key={idx} value={d.name || d.account_name}>{d.name || d.account_name} ({d.group || 'Customer'})</option>
              ))
            )}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '11px', color: '#475569', marginBottom: '4px' }}>Deposit Into (Cash/Bank) *</label>
            <select 
              value={receivingAccount} 
              onChange={(e) => setReceivingAccount(e.target.value)}
              style={inputStyle}
              required
            >
              <option value="Cash-in-Hand">Cash-in-Hand (नकद)</option>
              {bankCashAccounts.map((b, idx) => (
                <option key={idx} value={b.name || b.account_name}>{b.name || b.account_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '11px', color: '#475569', marginBottom: '4px' }}>Settlement Date *</label>
            <input 
              type="date"
              max={todayMaxDate}
              value={settlementDate}
              onChange={(e) => setSettlementDate(e.target.value)}
              style={inputStyle}
              required
            />
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '11px', color: '#475569', marginBottom: '4px' }}>Amount Received (₹) *</label>
          <input 
            type="number" 
            step="0.01"
            placeholder="0.00" 
            value={amountReceived}
            onChange={(e) => setAmountReceived(e.target.value)}
            style={{ ...inputStyle, fontWeight: 'bold' }}
            required
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '11px', color: '#475569', marginBottom: '4px' }}>Narration / Remarks</label>
          <input 
            type="text" 
            placeholder="e.g. Received via UPI / Cheque" 
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            style={inputStyle}
          />
        </div>

        <button 
          type="submit"
          style={{ width: '100%', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '11px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
        >
          💾 Confirm & Save Settlement
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '9px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '11px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#0f172a'
};
