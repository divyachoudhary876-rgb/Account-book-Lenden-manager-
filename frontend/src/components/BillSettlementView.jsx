// frontend/src/components/BillSettlementView.jsx

import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { loadFirmData, saveFirmData } from '../utils/firmIsolationEngine';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import { saveUniversalVoucher } from '../utils/voucherPostingEngine.js';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export default function BillSettlementView({ firm, onClose }) {
  const activeFirmId = firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  const todayMaxDate = new Date().toISOString().split('T')[0];

  const [settlementType, setSettlementType] = useState('RECEIPT'); // 'RECEIPT' (From Customer) or 'PAYMENT' (To Supplier/Worker)
  const [partyAccount, setPartyAccount] = useState('');
  const [bankOrCashAccount, setBankOrCashAccount] = useState('Cash in Hand (रोकड़)');
  const [settlementDate, setSettlementDate] = useState(todayMaxDate);
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');

  const [accountsList, setAccountsList] = useState([]);
  const [cashBankList, setCashBankList] = useState([]);
  const [settlementHistory, setSettlementHistory] = useState([]);
  const [feedback, setFeedback] = useState(null);

  const loadData = () => {
    try {
      const allAccs = getFirmMasterAccounts(activeFirmId) || [];
      setAccountsList(allAccs);

      // Filter Cash and Bank accounts for deposit/payment source
      const cbAccs = allAccs.filter(a => {
        const name = (a.account_name || a.name || '').toLowerCase();
        const grp = (a.sub_group || a.group || '').toLowerCase();
        return name.includes('cash') || name.includes('bank') || name.includes('रोकड़') || name.includes('बैंक') || grp.includes('cash') || grp.includes('bank');
      });
      setCashBankList(cbAccs.length > 0 ? cbAccs : allAccs);

      const history = loadFirmData('bill_settlements', firm, []);
      history.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setSettlementHistory(history);
    } catch (err) {
      console.error("Error loading settlement data:", err);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_storage_updated', loadData);
    window.addEventListener('app_state_updated', loadData);
    return () => {
      window.removeEventListener('app_storage_updated', loadData);
      window.removeEventListener('app_state_updated', loadData);
    };
  }, [firm, activeFirmId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback(null);

    const partyName = (typeof partyAccount === 'object' ? (partyAccount.account_name || partyAccount.name || '') : partyAccount).trim();
    const sourceAccount = (typeof bankOrCashAccount === 'object' ? (bankOrCashAccount.account_name || bankOrCashAccount.name || '') : bankOrCashAccount).trim();
    const cleanAmount = Number(amount);

    if (!partyName) return alert('Kripya Party chunein!');
    if (!sourceAccount) return alert('Kripya Cash ya Bank account chunein!');
    if (!cleanAmount || cleanAmount <= 0) return alert('Kripya valid Settlement Amount (> 0) darj karein!');

    try {
      const recordId = 'SET-'; + Date.now();
      const isReceipt = settlementType === 'RECEIPT';

      // Double-Entry Posting:
      // Receipt: Dr. Cash/Bank | Cr. Customer (Party)
      // Payment: Dr. Supplier/Worker (Party) | Cr. Cash/Bank
      const drAcc = isReceipt ? sourceAccount : partyName;
      const crAcc = isReceipt ? partyName : sourceAccount;

      saveUniversalVoucher(activeFirmId, {
        id: `JV-${recordId}`,
        firm_id: activeFirmId,
        firmId: activeFirmId,
        voucher_type: isReceipt ? 'RECEIPT' : 'PAYMENT',
        type: isReceipt ? 'RECEIPT' : 'PAYMENT',
        voucher_date: settlementDate,
        date: settlementDate,
        reference_no: recordId,
        dr_account: drAcc,
        cr_account: crAcc,
        amount: cleanAmount,
        total_amount: cleanAmount,
        narration: narration || `${isReceipt ? 'Receipt from' : 'Payment to'} ${partyName} via ${sourceAccount} - ₹${cleanAmount}`,
        is_compound: true,
        entries: [
          { account_name: drAcc, party: drAcc, type: 'DR', debit: cleanAmount, credit: 0, amount: cleanAmount },
          { account_name: crAcc, party: crAcc, type: 'CR', debit: 0, credit: cleanAmount, amount: cleanAmount }
        ]
      });

      const newRecord = {
        id: recordId,
        type: settlementType,
        date: settlementDate,
        party: partyName,
        source_account: sourceAccount,
        amount: cleanAmount,
        narration,
        created_at: new Date().toISOString()
      };

      const updatedHistory = [newRecord, ...settlementHistory];
      setSettlementHistory(updatedHistory);
      saveFirmData('bill_settlements', firm, updatedHistory);

      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('storage'));

      setFeedback({ 
        type: 'success', 
        message: `✓ ₹${cleanAmount.toLocaleString('en-IN')} successfully settled with "${partyName}"!` 
      });

      setAmount('');
      setNarration('');
      loadData();
    } catch (err) {
      alert('Settlement failed: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', color: '#0f172a', maxWidth: '650px', margin: '0 auto' }}>
      
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', boxSizing: 'border-box', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>Treasury & Settlements</div>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
              ⚖️ Bill Settlement & Party Knock-Off
            </h2>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
              Close
            </button>
          )}
        </div>

        {feedback && (
          <div style={{ padding: '10px 14px', marginBottom: '14px', borderRadius: '8px', backgroundColor: '#f0fdf4', color: '#166534', fontWeight: '700', fontSize: '12px', border: '1px solid #bbf7d0' }}>
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          {/* Toggle Type: Receipt vs Payment */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            <button
              type="button"
              onClick={() => setSettlementType('RECEIPT')}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: '2px solid',
                borderColor: settlementType === 'RECEIPT' ? '#059669' : '#cbd5e1',
                backgroundColor: settlementType === 'RECEIPT' ? '#ecfdf5' : '#ffffff',
                color: settlementType === 'RECEIPT' ? '#065f46' : '#475569',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              📥 Receipt (पैसा मिला - From Customer)
            </button>

            <button
              type="button"
              onClick={() => setSettlementType('PAYMENT')}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: '2px solid',
                borderColor: settlementType === 'PAYMENT' ? '#dc2626' : '#cbd5e1',
                backgroundColor: settlementType === 'PAYMENT' ? '#fef2f2' : '#ffffff',
                color: settlementType === 'PAYMENT' ? '#991b1b' : '#475569',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              📤 Payment (पैसा दिया - To Supplier/Worker)
            </button>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <SearchableAccountDropdown
              label={settlementType === 'RECEIPT' ? "Customer / Debtor Party *" : "Supplier / Worker Party *"}
              accounts={accountsList}
              value={partyAccount}
              onChange={val => setPartyAccount(val)}
              placeholder="Search party account..."
              colorAccent={settlementType === 'RECEIPT' ? '#059669' : '#dc2626'}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <SearchableAccountDropdown
                label="Deposit Into / Paid From (Cash/Bank) *"
                accounts={cashBankList}
                value={bankOrCashAccount}
                onChange={val => setBankOrCashAccount(val)}
                placeholder="Select Cash or Bank..."
                colorAccent="#0284c7"
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>Settlement Date *</label>
              <input 
                type="date" 
                max={todayMaxDate}
                value={settlementDate} 
                onChange={e => setSettlementDate(e.target.value)} 
                style={inputStyle} 
                required 
              />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>Amount (₹) *</label>
            <input 
              type="number" 
              step="0.01" 
              placeholder="0.00" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              style={{ ...inputStyle, fontSize: '15px', fontWeight: '900', color: '#059669' }} 
              required 
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>Narration / Remarks</label>
            <input 
              type="text" 
              placeholder="e.g. Cleared invoice via NEFT / UPI / Cash" 
              value={narration} 
              onChange={e => setNarration(e.target.value)} 
              style={inputStyle} 
            />
          </div>

          <button 
            type="submit" 
            style={{ width: '100%', padding: '12px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}
          >
            💾 Post Double-Entry Settlement Voucher
          </button>

        </form>
      </div>

      {/* History Register */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
          📜 Settlement History Register ({settlementHistory.length})
        </h3>

        {settlementHistory.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', fontSize: '11px' }}>
            Abhi koi settlement record darj nahi hai.
          </div>
        ) : (
          <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {settlementHistory.map(item => (
              <div key={item.id} style={{ padding: '8px 10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#0f172a' }}>
                    {item.date} | <span style={{ color: item.type === 'RECEIPT' ? '#059669' : '#dc2626' }}>{item.type}</span>: <strong>{item.party}</strong>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
                    Via: {item.source_account} {item.narration ? `- ${item.narration}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontWeight: '900', color: '#059669', fontSize: '13px' }}>
                  ₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
  padding: '9px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '12px',
  boxSizing: 'border-box',
  outline: 'none',
  backgroundColor: '#fff',
  color: '#0f172a'
};
