// frontend/src/components/PayrollManagementView.jsx

import React, { useState, useEffect } from 'react';
import { getPayrollEntities, recordWorkLog, getWorkerPayrollSummary, savePayrollEntity } from '../utils/payrollEngine.js';
import { saveUniversalVoucher } from '../utils/voucherPostingEngine.js';
import { getExpenseAccountHeads } from '../utils/accountMasterEngine.js';

export default function PayrollManagementView({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';

  const [entities, setEntities] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('work'); // 'work', 'payment', 'new_profile'

  // Work entry fields
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [units, setUnits] = useState('');
  const [rate, setRate] = useState('');
  const [desc, setDesc] = useState('');
  const [expenseHead, setExpenseHead] = useState('Labor & Pathai Expense (मजदूरी/पथाई)');
  const [expenseList, setExpenseList] = useState([]);

  // Direct Quick Payment fields
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash in Hand (रोकड़)');
  const [payNarration, setPayNarration] = useState('');

  // New Profile fields
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('PIECE_RATE_LABOUR');
  const [newRateType, setNewRateType] = useState('PER_THOUSAND_PCS');
  const [newRate, setNewRate] = useState('');

  const [status, setStatus] = useState(null);

  const loadData = () => {
    const list = getPayrollEntities(activeFirmId);
    setEntities(list);
    const expenses = getExpenseAccountHeads(activeFirmId);
    setExpenseList(expenses);

    if (list.length > 0) {
      const activeId = selectedEntityId || list[0].id;
      setSelectedEntityId(activeId);
      const activeEntity = list.find(e => e.id === activeId) || list[0];
      setRate(activeEntity.standard_rate.toString());
      setSummary(getWorkerPayrollSummary(activeFirmId, activeEntity.entity_name));
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_state_updated', loadData);
    return () => window.removeEventListener('app_state_updated', loadData);
  }, [activeFirmId, selectedEntityId]);

  const handleEntityChange = (id) => {
    setSelectedEntityId(id);
    const ent = entities.find(e => e.id === id);
    if (ent) {
      setRate(ent.standard_rate.toString());
      setSummary(getWorkerPayrollSummary(activeFirmId, ent.entity_name));
      if (ent.entity_type === 'TRACTOR_MACHINERY') {
        setExpenseHead('Tractor Fuel & Running Expense');
      } else {
        setExpenseHead('Labor & Pathai Expense (मजदूरी/पथाई)');
      }
    }
  };

  const handleWorkSubmit = (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      const res = recordWorkLog(activeFirmId, {
        entity_id: selectedEntityId,
        work_date: workDate,
        work_units: units,
        applied_rate: rate,
        work_description: desc,
        expense_head: expenseHead
      });

      setStatus({
        type: 'success',
        text: `✓ Kaam Darj Hua! ₹${res.grossAmount.toLocaleString('en-IN')} worker ke khate me credit kar diye gaye.`
      });
      setUnits('');
      setDesc('');
      loadData();
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    setStatus(null);
    const ent = entities.find(e => e.id === selectedEntityId);
    if (!ent) return;

    try {
      const amt = parseFloat(payAmount || 0);
      if (amt <= 0) throw new Error('Payment amount must be greater than zero.');

      saveUniversalVoucher(activeFirmId, {
        voucher_type: 'PAYMENT',
        voucher_date: workDate,
        dr_account: ent.linked_ledger_account,
        cr_account: payMode,
        amount: amt,
        reference_no: `PAY-${Date.now().toString().slice(-4)}`,
        narration: payNarration || `Wages / Tractor rental payment to ${ent.entity_name}`
      });

      setStatus({
        type: 'success',
        text: `✓ Payment Entry Successful! ₹${amt.toLocaleString('en-IN')} paid to ${ent.entity_name}.`
      });
      setPayAmount('');
      setPayNarration('');
      loadData();
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  const handleCreateProfile = (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      const created = savePayrollEntity(activeFirmId, {
        entity_name: newName,
        entity_type: newType,
        rate_type: newRateType,
        standard_rate: newRate
      });

      setStatus({ type: 'success', text: `✓ New Profile "${created.entity_name}" created.` });
      setNewName('');
      setNewRate('');
      loadData();
      setSelectedEntityId(created.id);
      setActiveTab('work');
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '30px' }}>
      
      {/* Top Banner */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>👷</span> Labour, Employee & Tractor Wages
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Accrual Work Logging & Instant Payment Reconciliation</span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setActiveTab('work')} style={{ ...tabBtn, backgroundColor: activeTab === 'work' ? '#0f172a' : '#f1f5f9', color: activeTab === 'work' ? '#ffffff' : '#334155' }}>
            📝 Work Entry
          </button>
          <button onClick={() => setActiveTab('payment')} style={{ ...tabBtn, backgroundColor: activeTab === 'payment' ? '#059669' : '#f1f5f9', color: activeTab === 'payment' ? '#ffffff' : '#334155' }}>
            💵 Payment Voucher
          </button>
          <button onClick={() => setActiveTab('new_profile')} style={{ ...tabBtn, backgroundColor: activeTab === 'new_profile' ? '#0284c7' : '#f1f5f9', color: activeTab === 'new_profile' ? '#ffffff' : '#334155' }}>
            ➕ Add Worker/Tractor
          </button>
        </div>
      </div>

      {status && (
        <div style={{
          backgroundColor: status.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${status.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: status.type === 'success' ? '#065f46' : '#b91c1c',
          padding: '12px 16px',
          borderRadius: '10px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {status.text}
        </div>
      )}

      {/* Select Active Worker / Tractor & Live Balance Card */}
      {activeTab !== 'new_profile' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '16px', border: '1px solid #cbd5e1', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Select Worker / Driver / Tractor</label>
            <select
              value={selectedEntityId}
              onChange={e => handleEntityChange(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}
            >
              {entities.map(ent => (
                <option key={ent.id} value={ent.id}>
                  {ent.entity_name} ({ent.entity_type} - ₹{ent.standard_rate}/{ent.rate_type.replace('PER_', '')})
                </option>
              ))}
            </select>
          </div>

          {summary && (
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>KUL BANE (EARNED)</span>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>₹{summary.total_earned.toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>CHUKAYE (PAID)</span>
                <strong style={{ fontSize: '13px', color: '#059669' }}>₹{summary.total_paid.toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: summary.net_payable >= 0 ? '#dc2626' : '#0284c7', display: 'block', fontWeight: 'bold' }}>
                  {summary.net_payable >= 0 ? 'BAKI (PAYABLE)' : 'ADVANCE'}
                </span>
                <strong style={{ fontSize: '14px', color: summary.net_payable >= 0 ? '#dc2626' : '#0284c7' }}>
                  ₹{Math.abs(summary.net_payable).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1. WORK LOG ENTRY TAB */}
      {activeTab === 'work' && (
        <form onSubmit={handleWorkSubmit} style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', display: 'grid', gap: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <strong style={{ fontSize: '14px', color: '#0f172a' }}>📋 Record Kaam / Attendance (मजदूरी की प्रविष्टि)</strong>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Date of Work *</label>
              <input type="date" value={workDate} onChange={e => setWorkDate(e.target.value)} style={inputStyle} required />
            </div>

            <div>
              <label style={labelStyle}>Expense Khata (P&L Account) *</label>
              <select value={expenseHead} onChange={e => setExpenseHead(e.target.value)} style={inputStyle} required>
                {expenseList.map(exp => <option key={exp.id} value={exp.account_name}>{exp.account_name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Kaam Quantity (Days/Hours/Units) *</label>
              <input type="number" step="0.01" placeholder="e.g. 5 (5000 bricks) or 8 (hrs)" value={units} onChange={e => setUnits(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold' }} required />
            </div>

            <div>
              <label style={labelStyle}>Rate per Unit (₹) *</label>
              <input type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold' }} required />
            </div>

            <div>
              <label style={labelStyle}>Kul Amount (रुपये)</label>
              <div style={{ padding: '10px', backgroundColor: '#f1f5f9', borderRadius: '8px', fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>
                ₹{((parseFloat(units || 0) * parseFloat(rate || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Work Description (विवरण)</label>
            <input type="text" placeholder="e.g. Chamber No. 3 pathai work / Mitti dhulai with tractor" value={desc} onChange={e => setDesc(e.target.value)} style={inputStyle} />
          </div>

          <button type="submit" style={{ backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
            ⚡ Post Work Credit to Worker Ledger
          </button>
        </form>
      )}

      {/* 2. DIRECT PAYMENT VOUCHER TAB */}
      {activeTab === 'payment' && (
        <form onSubmit={handlePaymentSubmit} style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', display: 'grid', gap: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <strong style={{ fontSize: '14px', color: '#059669' }}>💵 Payment Settlement Voucher (भुगतान प्रविष्टि)</strong>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Payment Date *</label>
              <input type="date" value={workDate} onChange={e => setWorkDate(e.target.value)} style={inputStyle} required />
            </div>

            <div>
              <label style={labelStyle}>Paid From (भुगतान माध्यम) *</label>
              <select value={payMode} onChange={e => setPayMode(e.target.value)} style={inputStyle} required>
                <option value="Cash in Hand (रोकड़)">Cash in Hand (रोकड़)</option>
                <option value="State Bank of India (बैंक खाता)">State Bank of India (बैंक)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Amount Paid (रुपये) *</label>
            <input type="number" step="0.01" placeholder="e.g. 5000" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ ...inputStyle, fontSize: '15px', fontWeight: 'bold' }} required />
          </div>

          <div>
            <label style={labelStyle}>Narration / Notes</label>
            <input type="text" placeholder="e.g. Advance given for weekly expenses / Final settlement" value={payNarration} onChange={e => setPayNarration(e.target.value)} style={inputStyle} />
          </div>

          <button type="submit" style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
            ✓ Deduct Cash & Clear Liability
          </button>
        </form>
      )}

      {/* 3. NEW WORKER PROFILE REGISTRATION TAB */}
      {activeTab === 'new_profile' && (
        <form onSubmit={handleCreateProfile} style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', display: 'grid', gap: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <strong style={{ fontSize: '14px', color: '#0284c7' }}>➕ Register New Worker, Driver or Tractor</strong>

          <div>
            <label style={labelStyle}>Worker / Tractor Full Name *</label>
            <input type="text" placeholder="e.g. Ramesh Thekedar / Tractor RJ-13-4512" value={newName} onChange={e => setNewName(e.target.value)} style={inputStyle} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Engagement Type *</label>
              <select value={newType} onChange={e => setNewType(e.target.value)} style={inputStyle} required>
                <option value="PIECE_RATE_LABOUR">Piece-Rate Theka (काम के हिसाब से)</option>
                <option value="MONTHLY_STAFF">Monthly Staff (मासिक वेतन)</option>
                <option value="DAILY_WAGER">Daily Wager (दैनिक मजदूरी)</option>
                <option value="TRACTOR_MACHINERY">Tractor / Machinery Hire (किराया)</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Rate Calculation Unit *</label>
              <select value={newRateType} onChange={e => setNewRateType(e.target.value)} style={inputStyle} required>
                <option value="PER_THOUSAND_PCS">Per 1,000 Pcs (प्रति हज़ार ईंट)</option>
                <option value="PER_MONTH">Per Month (प्रति माह)</option>
                <option value="PER_DAY">Per Day (प्रति दिन)</option>
                <option value="PER_HOUR">Per Hour (प्रति घंटा)</option>
                <option value="PER_TON">Per Metric Ton (प्रति टन)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Standard Rate (₹) *</label>
            <input type="number" step="0.01" placeholder="e.g. 650 per 1000 bricks or 1500 per day" value={newRate} onChange={e => setNewRate(e.target.value)} style={inputStyle} required />
          </div>

          <button type="submit" style={{ backgroundColor: '#0284c7', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
            💾 Save Profile & Create Ledger Account
          </button>
        </form>
      )}

      {/* Account Milan Transaction History Table */}
      {summary && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px', border: '1px solid #cbd5e1', overflowX: 'auto' }}>
          <strong style={{ fontSize: '13px', display: 'block', marginBottom: '10px' }}>
            📖 Ledger Statement (खाता मिलान): {summary.entity_name}
          </strong>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Particulars</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Earned (हक ₹)</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Paid (भुगतान ₹)</th>
              </tr>
            </thead>
            <tbody>
              {summary.transactions.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>No work or payment entries recorded yet.</td></tr>
              ) : (
                summary.transactions.map((t, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px' }}>{t.date}</td>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{t.type}</td>
                    <td style={{ padding: '8px' }}>{t.particulars}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626', fontWeight: 'bold' }}>{t.earned > 0 ? `₹${t.earned.toFixed(2)}` : '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#059669', fontWeight: 'bold' }}>{t.paid > 0 ? `₹${t.paid.toFixed(2)}` : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

const tabBtn = { border: 'none', padding: '7px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' };
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#0f172a' };
