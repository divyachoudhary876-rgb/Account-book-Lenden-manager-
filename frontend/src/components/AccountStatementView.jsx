// frontend/src/components/AccountStatementView.jsx

import React, { useState, useEffect } from 'react';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import { getAccountStatement } from '../utils/financialReportEngine.js';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';

export default function AccountStatementView({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const firmName = firm?.legal_name || firm?.trade_name || 'Neelkanth Groups';

  const [accounts, setAccounts] = useState([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [statementData, setStatementData] = useState(null);

  const loadData = () => {
    const accList = getFirmMasterAccounts(activeFirmId);
    setAccounts(accList);
    if (accList.length > 0 && !selectedParty) {
      setSelectedParty(accList[0].account_name);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_state_updated', loadData);
    return () => window.removeEventListener('app_state_updated', loadData);
  }, [activeFirmId]);

  useEffect(() => {
    if (selectedParty) {
      const data = getAccountStatement(activeFirmId, selectedParty);
      setStatementData(data);
    }
  }, [selectedParty, activeFirmId]);

  // Direct WhatsApp Khata Statement Sender
  const handleShareWhatsApp = () => {
    if (!statementData) return;

    const accountMaster = accounts.find(a => a.account_name === selectedParty);
    const phone = (accountMaster?.contact_phone || '').replace(/\D/g, '');

    const balText = statementData.closingType === 'Dr'
      ? `₹${statementData.closingBalance.toLocaleString('en-IN')} (बाकी / लेना है)`
      : `₹${statementData.closingBalance.toLocaleString('en-IN')} (जमा / देना है)`;

    const message = 
      `*खाता विवरण (Account Statement)*\n` +
      `*फर्म:* ${firmName}\n` +
      `--------------------------------\n` +
      `*खातेदार:* ${selectedParty}\n` +
      `*तारीख:* ${new Date().toLocaleDateString('en-IN')}\n` +
      `*प्रारंभिक शेष (Opening):* ₹${statementData.openingBalance.toLocaleString('en-IN')} ${statementData.openingType}\n` +
      `*कुल लेन-देन संख्या:* ${statementData.transactions.length}\n` +
      `--------------------------------\n` +
      `*अंतिम शेष (Net Balance):* *${balText}*\n` +
      `--------------------------------\n` +
      `_कृपया अपने खाते का मिलान करें। धन्यवाद!_`;

    const targetUrl = phone.length >= 10
      ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(targetUrl, '_blank');
  };

  return (
    <div style={{ width: '100%', maxWidth: '750px', margin: '0 auto', boxSizing: 'border-box', padding: '0 8px 50px 8px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* Header Banner */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
              📖 खाता मिलान (Account Statement)
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Double-Entry General Ledger & Real-Time Balance</span>
          </div>
          {statementData && (
            <button
              type="button"
              onClick={handleShareWhatsApp}
              style={{
                backgroundColor: '#25D366',
                color: '#ffffff',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(37,211,102,0.3)'
              }}
            >
              <span>💬</span> WhatsApp पर भेजें
            </button>
          )}
        </div>
      </div>

      {/* Account Selector */}
      <div style={cardStyle}>
        <SearchableAccountDropdown
          label="खाता चुनें (Select Party/Account) *"
          accounts={accounts}
          value={selectedParty}
          onChange={val => setSelectedParty(val)}
          placeholder="पार्टी का नाम खोजें..."
          colorAccent="#0284c7"
          required
        />
      </div>

      {/* Summary KPI Bar */}
      {statementData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ ...cardStyle, backgroundColor: '#f8fafc' }}>
            <div style={labelStyle}>Opening Balance</div>
            <strong style={{ fontSize: '16px', color: '#0f172a' }}>
              ₹{statementData.openingBalance.toLocaleString('en-IN')} {statementData.openingType}
            </strong>
          </div>
          <div style={{ ...cardStyle, backgroundColor: statementData.closingType === 'Dr' ? '#eff6ff' : '#fef2f2' }}>
            <div style={labelStyle}>Net Closing Balance</div>
            <strong style={{ fontSize: '16px', color: statementData.closingType === 'Dr' ? '#1d4ed8' : '#b91c1c' }}>
              ₹{statementData.closingBalance.toLocaleString('en-IN')} {statementData.closingType}
            </strong>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div style={{ ...cardStyle, padding: '12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={thStyle}>तारीख</th>
              <th style={thStyle}>विवरण (Particulars)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>नामे (Dr ₹)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>जमा (Cr ₹)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>बाकी (Balance ₹)</th>
            </tr>
          </thead>
          <tbody>
            {!statementData || statementData.transactions.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  इस खाते में कोई लेन-देन दर्ज नहीं है।
                </td>
              </tr>
            ) : (
              statementData.transactions.map((t, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={tdStyle}>{t.date}</td>
                  <td style={tdStyle}>
                    <strong>{t.voucher_type}</strong> #{t.voucher_number}
                    {t.narration && <div style={{ color: '#64748b', fontSize: '10px' }}>{t.narration}</div>}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: t.debit > 0 ? '#059669' : '#94a3b8', fontWeight: t.debit > 0 ? 'bold' : 'normal' }}>
                    {t.debit > 0 ? t.debit.toFixed(2) : '-'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: t.credit > 0 ? '#dc2626' : '#94a3b8', fontWeight: t.credit > 0 ? 'bold' : 'normal' }}>
                    {t.credit > 0 ? t.credit.toFixed(2) : '-'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', color: t.balanceType === 'Dr' ? '#1d4ed8' : '#b91c1c' }}>
                    {t.runningBalance.toFixed(2)} {t.balanceType}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '14px',
  padding: '16px',
  border: '1px solid #cbd5e1',
  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
  boxSizing: 'border-box'
};

const labelStyle = { fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' };
const thStyle = { padding: '10px 8px', fontWeight: 'bold' };
const tdStyle = { padding: '10px 8px', verticalAlign: 'top' };
