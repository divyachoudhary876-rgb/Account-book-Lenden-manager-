// frontend/src/components/BillSettlementView.jsx

import React, { useState, useEffect } from 'react';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import { saveUniversalVoucher } from '../utils/voucherPostingEngine.js';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export default function BillSettlementView({ firm, selectedFY, onClose }) {
  const activeFirmId = firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  const todayMaxDate = new Date().toISOString().split('T')[0];

  const [allAccounts, setAllAccounts] = useState([]);
  const [partyAccounts, setPartyAccounts] = useState([]);
  const [bankCashAccounts, setBankCashAccounts] = useState([]);
  
  const [selectedParty, setSelectedParty] = useState('');
  const [receivingAccount, setReceivingAccount] = useState('Cash in Hand (à¤°à¥‹à¤•à¤¡à¤¼)');
  const [settlementType, setSettlementType] = useState('RECEIPT'); // RECEIPT (Inflow) or PAYMENT (Outflow)
  const [amountReceived, setAmountReceived] = useState('');
  const [settlementDate, setSettlementDate] = useState(todayMaxDate);
  const [narration, setNarration] = useState('');
  const [feedback, setFeedback] = useState(null);

  const loadAccounts = () => {
    try {
      const accounts = getFirmMasterAccounts(activeFirmId) || [];
      setAllAccounts(accounts);
      
      // Filter Debtors, Creditors, Parties
      const parties = accounts.filter(a => {
        const type = String(a.primary_type || a.type || '').toUpperCase();
        const grp = String(a.sub_group || a.group || '').toLowerCase();
        const n = String(a.account_name || a.name || '').toLowerCase();
        return (
          grp.includes('debtor') || 
          grp.includes('creditor') || 
          grp.includes('customer') || 
          grp.includes('supplier') || 
          grp.includes('driver') || 
          grp.includes('thekedar') ||
          type === 'LIABILITIES' ||
          (type === 'ASSETS' && !n.includes('cash') && !n.includes('bank') && !n.includes('stock'))
        );
      });
      setPartyAccounts(parties);
      if (parties.length > 0 && !selectedParty) {
        setSelectedParty(parties[0].account_name || parties[0].name || '');
      }

      // Filter Cash and Bank Accounts
      const cashBank = accounts.filter(a => {
        const grp = String(a.sub_group || a.group || '').toLowerCase();
        const n = String(a.account_name || a.name || '').toLowerCase();
        return grp.includes('cash') || grp.includes('bank') || n.includes('cash') || n.includes('bank') || n.includes('sbi') || n.includes('pnb');
      });
      setBankCashAccounts(cashBank);
      if (cashBank.length > 0 && !receivingAccount) {
        const defaultCash = cashBank.find(c => (c.account_name || c.name || '').toLowerCase().includes('cash')) || cashBank[0];
        setReceivingAccount(defaultCash.account_name || defaultCash.name || 'Cash in Hand (à¤°à¥‹à¤•à¤¡à¤¼)');
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
    setFeedback(null);
    const amt = round2(amountReceived);

    if (!selectedParty || amt <= 0) {
      setFeedback({ type: 'error', message: 'Kripya valid party aur amount (>0) darj karein!' });
      return;
    }
    if (!receivingAccount) {
      setFeedback({ type: 'error', message: 'Kripya Cash ya Bank account chunein!' });
      return;
    }

    try {
      const vNum = 'SETT-' + Math.floor(1000 + Math.random() * 9000);
      const isReceipt = settlementType === 'RECEIPT';

      // Ind AS Double-Entry:
      // RECEIPT: Dr Cash/Bank, Cr Party
      // PAYMENT: Dr Party, Cr Cash/Bank
      const drAccount = isReceipt ? receivingAccount : selectedParty;
      const crAccount = isReceipt ? selectedParty : receivingAccount;

      const voucherPayload = {
        id: (isReceipt ? 'REC-' : 'PAY-') + Date.now(),
        firm_id: activeFirmId,
        firmId: activeFirmId,
        voucher_type: isReceipt ? 'RECEIPT' : 'PAYMENT',
        type: isReceipt ? 'RECEIPT' : 'PAYMENT',
        voucher_date: settlementDate,
        date: settlementDate,
        reference_no: vNum,
        voucher_number: vNum,
        dr_account: drAccount,
        cr_account: crAccount,
        amount: amt,
        total_amount: amt,
        narration: narration.trim() || `Bill settlement ${isReceipt ? 'received from' : 'paid to'} ${selectedParty}`,
        is_compound: true,
        entries: [
          { account_name: drAccount, party: drAccount, type: 'DR', debit: amt, credit: 0, amount: amt },
          { account_name: crAccount, party: crAccount, type: 'CR', debit: 0, credit: amt, amount: amt }
        ]
      };

      // Save atomically through Universal Engine (syncs app_vouchers_ and account_book_vouchers_)
      saveUniversalVoucher(activeFirmId, voucherPayload);

      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('storage'));

      setFeedback({ 
        type: 'success', 
        message: `âœ“ â‚¹${amt.toLocaleString('en-IN')} settlement voucher (#${vNum}) successfully recorded for ${selectedParty}!` 
      });

      setAmountReceived('');
      setNarration('');
    } catch (err) {
      setFeedback({ type: 'error', message: `Error saving settlement: ${err.message}` });
    }
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', color: '#0f172a' }}>
      
      <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '14px', border: '1px solid #e2e8f0', maxWidth: '650px', margin: '0 auto', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#0284c7', fontWeight: '800', textTransform: 'uppercase' }}>TREASURY & SETTLEMENTS</div>
            <h3 style={{ margin: '2px 0 0 0', color: '#0f172a', fontSize: '16px', fontWeight: '800' }}>ðŸ’³ Bill Settlement & Party Knock-Off</h3>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
              Close
            </button>
          )}
        </div>

        {feedback && (
          <div style={{ padding: '10px 14px', marginBottom: '14px', borderRadius: '8px', backgroundColor: feedback.type === 'error' ? '#fef2f2' : '#f0fdf4', color: feedback.type === 'error' ? '#991b1b' : '#166534', fontWeight: '700', fontSize: '12px', border: `1px solid ${feedback.type === 'error' ? '#fecaca' : '#bbf7d0'}` }}>
            {feedback.message}
          </div>
        )}

        {/* Settlement Direction Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
          <button
            type="button"
            onClick={() => setSettlementType('RECEIPT')}
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: settlementType === 'RECEIPT' ? '#059669' : '#cbd5e1',
              backgroundColor: settlementType === 'RECEIPT' ? '#ecfdf5' : '#ffffff',
              color: settlementType === 'RECEIPT' ? '#065f46' : '#475569',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            ðŸ“¥ Receipt (à¤°à¥à¤ªà¤¯à¥‡ à¤®à¤¿à¤²à¥‡ - From Customer)
          </button>
          <button
            type="button"
            onClick={() => setSettlementType('PAYMENT')}
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: settlementType === 'PAYMENT' ? '#dc2626' : '#cbd5e1',
              backgroundColor: settlementType === 'PAYMENT' ? '#fef2f2' : '#ffffff',
              color: settlementType === 'PAYMENT' ? '#991b1b' : '#475569',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            ðŸ“¤ Payment (à¤°à¥à¤ªà¤¯à¥‡ à¤¦à¤¿à¤ - To Supplier/Worker)
          </button>
        </div>

        <form onSubmit={handleConfirmSettlement}>
          
          <div style={{ marginBottom: '12px' }}>
            <SearchableAccountDropdown
              label={settlementType === 'RECEIPT' ? "Customer / Debtor Party *" : "Supplier / Creditor / Worker Party *"}
              accounts={partyAccounts.length > 0 ? partyAccounts : allAccounts}
              value={selectedParty}
              onChange={(val) => setSelectedParty(val)}
              placeholder="Search party account..."
              colorAccent={settlementType === 'RECEIPT' ? "#059669" : "#dc2626"}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', fontSize: '11px', color: '#475569', marginBottom: '4px' }}>
                {settlementType === 'RECEIPT' ? "Deposit Into (Cash/Bank) *" : "Paid From (Cash/Bank) *"}
              </label>
              <select 
                value={receivingAccount} 
                onChange={(e) => setReceivingAccount(e.target.value)}
                style={inputStyle}
                required
              >
                {bankCashAccounts.length === 0 ? (
                  <option value="Cash in Hand (à¤°à¥‹à¤•à¤¡à¤¼)">Cash in Hand (à¤°à¥‹à¤•à¤¡à¤¼)</option>
                ) : (
                  bankCashAccounts.map((b, idx) => (
                    <option key={idx} value={b.account_name || b.name}>{b.account_name || b.name}</option>
                  ))
                )}
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
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '11px', color: '#475569', marginBottom: '4px' }}>Amount (â‚¹) *</label>
            <input 
              type="number" 
              step="0.01"
              placeholder="0.00" 
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              style={{ ...inputStyle, fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '11px', color: '#475569', marginBottom: '4px' }}>Narration / Remarks</label>
            <input 
              type="text" 
              placeholder="e.g. Cleared invoice via NEFT / UPI / Cash" 
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button 
            type="submit"
            style={{ 
              width: '100%', 
              backgroundColor: settlementType === 'RECEIPT' ? '#059669' : '#0f172a', 
              color: '#fff', 
              border: 'none', 
              padding: '12px', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              fontSize: '12px', 
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            ðŸ’¾ Post Double-Entry Settlement Voucher
          </button>
        </form>
      </div>

    </div>
  );
}

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
