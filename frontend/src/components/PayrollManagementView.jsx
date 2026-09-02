// frontend/src/components/PayrollManagementView.jsx

import React, { useState, useEffect } from 'react';
import { 
  getPayrollEntities, 
  recordWorkLog, 
  getWorkerPayrollSummary, 
  savePayrollEntity, 
  deletePayrollEntity,
  deleteWorkLog,
  getPayrollWorkLogs
} from '../utils/payrollEngine.js';
import { saveUniversalVoucher } from '../utils/voucherPostingEngine.js';
import { getExpenseAccountHeads, getFirmMasterAccounts } from '../utils/accountMasterEngine.js';

export default function PayrollManagementView({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';

  const [entities, setEntities] = useState([]);
  const [masterAccounts, setMasterAccounts] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('work'); // 'work', 'payment', 'profile'

  const [editingWorkLogId, setEditingWorkLogId] = useState(null);
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [units, setUnits] = useState('');
  const [rate, setRate] = useState('');
  const [desc, setDesc] = useState('');
  const [expenseHead, setExpenseHead] = useState('Labor & Pathai Expense (मजदूरी/पथाई)');
  const [expenseList, setExpenseList] = useState([]);

  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash in Hand (रोकड़)');
  const [payNarration, setPayNarration] = useState('');

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [isCustomProfileName, setIsCustomProfileName] = useState(false);
  const [profileType, setProfileType] = useState('PIECE_RATE_LABOUR');
  const [profileRateType, setProfileRateType] = useState('PER_THOUSAND_PCS');
  const [profileRate, setProfileRate] = useState('');
  const [profilePhone, setProfilePhone] = useState('');

  const [status, setStatus] = useState(null);

  const loadData = () => {
    const list = getPayrollEntities(activeFirmId);
    setEntities(list);

    const accounts = getFirmMasterAccounts(activeFirmId);
    setMasterAccounts(accounts);

    const expenses = getExpenseAccountHeads(activeFirmId);
    setExpenseList(expenses);

    if (list.length > 0) {
      const activeId = selectedEntityId || list[0].id;
      setSelectedEntityId(activeId);
      const activeEntity = list.find(e => e.id === activeId) || list[0];
      if (!editingWorkLogId) {
        setRate(activeEntity.standard_rate.toString());
      }
      setSummary(getWorkerPayrollSummary(activeFirmId, activeEntity.entity_name));
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_state_updated', loadData);
    return () => window.removeEventListener('app_state_updated', loadData);
  }, [activeFirmId, selectedEntityId]);

  const handleEntitySelectChange = (val) => {
    if (val === 'ADD_NEW_ENTITY') {
      startNewProfile();
      return;
    }
    
    setSelectedEntityId(val);
    setEditingWorkLogId(null);
    const ent = entities.find(e => e.id === val);
    if (ent) {
      setRate(ent.standard_rate.toString());
      setSummary(getWorkerPayrollSummary(activeFirmId, ent.entity_name));
      setExpenseHead(ent.entity_type === 'TRACTOR_MACHINERY' ? 'Tractor Fuel & Running Expense' : 'Labor & Pathai Expense (मजदूरी/पथाई)');
    }
  };

  const startEditProfile = () => {
    const ent = entities.find(e => e.id === selectedEntityId);
    if (!ent) return;
    setIsEditingProfile(true);
    setProfileId(ent.id);
    setProfileName(ent.entity_name);
    setIsCustomProfileName(false);
    setProfileType(ent.entity_type);
    setProfileRateType(ent.rate_type);
    setProfileRate(ent.standard_rate.toString());
    setProfilePhone(ent.phone || '');
    setActiveTab('profile');
  };

  const startNewProfile = () => {
    setIsEditingProfile(false);
    setProfileId(null);
    const candidate = masterAccounts.find(a => a.primary_type === 'LIABILITIES') || masterAccounts[0];
    setProfileName(candidate?.account_name || '');
    setIsCustomProfileName(false);
    setProfileType('PIECE_RATE_LABOUR');
    setProfileRateType('PER_THOUSAND_PCS');
    setProfileRate('');
    setProfilePhone('');
    setActiveTab('profile');
  };

  const startEditWorkEntry = (logId) => {
    const logs = getPayrollWorkLogs(activeFirmId);
    const target = logs.find(l => l.id === logId);
    if (!target) return;
    
    setEditingWorkLogId(target.id);
    setWorkDate(target.work_date);
    setUnits(target.work_units.toString());
    setRate(target.applied_rate.toString());
    setDesc(target.work_description || '');
    setExpenseHead(target.expense_head);
    setActiveTab('work');
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  const cancelEditWorkEntry = () => {
    setEditingWorkLogId(null);
    setUnits('');
    setDesc('');
    const ent = entities.find(e => e.id === selectedEntityId);
    if (ent) setRate(ent.standard_rate.toString());
  };

  const handleDeleteWorkEntry = (logId) => {
    if (!window.confirm('Kya aap is work entry ko delete karna chahte hain? Iska Journal Voucher bhi delete ho jayega.')) return;
    try {
      deleteWorkLog(activeFirmId, logId);
      setStatus({ type: 'success', text: '✓ Work entry successfully deleted.' });
      loadData();
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  const handleWorkSubmit = (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      const res = recordWorkLog(activeFirmId, {
        id: editingWorkLogId,
        entity_id: selectedEntityId,
        work_date: workDate,
        work_units: units,
        applied_rate: rate,
        work_description: desc,
        expense_head: expenseHead
      });

      setStatus({
        type: 'success',
        text: editingWorkLogId 
          ? `✓ Entry Updated! ₹${res.grossAmount.toLocaleString('en-IN')} recalculated successfully.`
          : `✓ Kaam Darj Hua! ₹${res.grossAmount.toLocaleString('en-IN')} worker ke khate me credit hua.`
      });

      cancelEditWorkEntry();
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
      if (amt <= 0) throw new Error('Payment amount zero se adhik hona chahiye.');

      saveUniversalVoucher(activeFirmId, {
        voucher_type: 'PAYMENT',
        voucher_date: workDate,
        dr_account: ent.linked_ledger_account,
        cr_account: payMode,
        amount: amt,
        reference_no: `PAY-${Date.now().toString().slice(-4)}`,
        narration: payNarration || `Wages / Tractor payment to ${ent.entity_name}`
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

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setStatus(null);
    const finalName = profileName.trim();
    if (!finalName) {
      setStatus({ type: 'error', text: 'Worker ya tractor ka naam chunein ya likhein.' });
      return;
    }

    try {
      const saved = savePayrollEntity(activeFirmId, {
        id: profileId,
        entity_name: finalName,
        entity_type: profileType,
        rate_type: profileRateType,
        standard_rate: profileRate,
        phone: profilePhone
      });

      setStatus({ 
        type: 'success', 
        text: isEditingProfile 
          ? `✓ Details updated for "${saved.entity_name}".` 
          : `✓ New profile "${saved.entity_name}" created.` 
      });

      loadData();
      setSelectedEntityId(saved.id);
      setActiveTab('work');
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  const handleDeleteProfile = () => {
    const ent = entities.find(e => e.id === selectedEntityId);
    if (!ent) return;

    if (!window.confirm(`⚠️ Are you sure you want to delete profile "${ent.entity_name}"?`)) return;

    deletePayrollEntity(activeFirmId, ent.id);
    setStatus({ type: 'success', text: `Profile "${ent.entity_name}" deleted.` });
    setSelectedEntityId('');
    loadData();
  };

  const pieceRateEntities = entities.filter(e => e.entity_type === 'PIECE_RATE_LABOUR');
  const tractorEntities = entities.filter(e => e.entity_type === 'TRACTOR_MACHINERY');
  const staffEntities = entities.filter(e => e.entity_type === 'MONTHLY_STAFF');
  const dailyWagerEntities = entities.filter(e => e.entity_type === 'DAILY_WAGER');

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '30px' }}>
      
      {/* Top Header Banner */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>👷</span> Labour, Employee & Tractor Wages
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Editable Work Logging & Payment Reconciliation</span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => { setActiveTab('work'); cancelEditWorkEntry(); }} style={{ ...tabBtn, backgroundColor: activeTab === 'work' ? '#0f172a' : '#f1f5f9', color: activeTab === 'work' ? '#ffffff' : '#334155' }}>
            📝 Work Entry
          </button>
          <button onClick={() => setActiveTab('payment')} style={{ ...tabBtn, backgroundColor: activeTab === 'payment' ? '#059669' : '#f1f5f9', color: activeTab === 'payment' ? '#ffffff' : '#334155' }}>
            💵 Payment Voucher
          </button>
          <button onClick={startNewProfile} style={{ ...tabBtn, backgroundColor: activeTab === 'profile' && !isEditingProfile ? '#0284c7' : '#f1f5f9', color: activeTab === 'profile' && !isEditingProfile ? '#ffffff' : '#334155' }}>
            ➕ Add Profile
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

      {/* Select Worker / Tractor Header Bar */}
      {activeTab !== 'profile' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '16px', border: '1px solid #cbd5e1', display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '16px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>
                Select Worker / Driver / Tractor (ड्रॉप-डाउन सूची) *
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={startEditProfile} style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}>
                  ✏️ Edit Profile
                </button>
                <button type="button" onClick={handleDeleteProfile} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}>
                  🗑️ Delete
                </button>
              </div>
            </div>

            <select
              value={selectedEntityId}
              onChange={e => handleEntitySelectChange(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#f8fafc', color: '#0f172a' }}
            >
              {pieceRateEntities.length > 0 && (
                <optgroup label="🧱 Theka / Piece-Rate Labour">
                  {pieceRateEntities.map(ent => (
                    <option key={ent.id} value={ent.id}>
                      {ent.entity_name} (₹{ent.standard_rate}/{ent.rate_type.replace('PER_', '')})
                    </option>
                  ))}
                </optgroup>
              )}

              {tractorEntities.length > 0 && (
                <optgroup label="🚜 Tractor & Machinery">
                  {tractorEntities.map(ent => (
                    <option key={ent.id} value={ent.id}>
                      {ent.entity_name} (₹{ent.standard_rate}/{ent.rate_type.replace('PER_', '')})
                    </option>
                  ))}
                </optgroup>
              )}

              {staffEntities.length > 0 && (
                <optgroup label="👔 Monthly Staff">
                  {staffEntities.map(ent => (
                    <option key={ent.id} value={ent.id}>
                      {ent.entity_name} (₹{ent.standard_rate}/Mo)
                    </option>
                  ))}
                </optgroup>
              )}

              {dailyWagerEntities.length > 0 && (
                <optgroup label="⏱️ Daily Wagers">
                  {dailyWagerEntities.map(ent => (
                    <option key={ent.id} value={ent.id}>
                      {ent.entity_name} (₹{ent.standard_rate}/{ent.rate_type.replace('PER_', '')})
                    </option>
                  ))}
                </optgroup>
              )}

              <option value="ADD_NEW_ENTITY">➕ + Add New Worker / Tractor Profile...</option>
            </select>
          </div>

          {summary && (
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>KUL BANE</span>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>₹{summary.total_earned.toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>CHUKAYE</span>
                <strong style={{ fontSize: '13px', color: '#059669' }}>₹{summary.total_paid.toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: summary.net_payable >= 0 ? '#dc2626' : '#0284c7', display: 'block', fontWeight: 'bold' }}>
                  {summary.net_payable >= 0 ? 'BAKI' : 'ADVANCE'}
                </span>
                <strong style={{ fontSize: '14px', color: summary.net_payable >= 0 ? '#dc2626' : '#0284c7' }}>
                  ₹{Math.abs(summary.net_payable).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1. WORK ENTRY / EDIT FORM */}
      {activeTab === 'work' && (
        <form onSubmit={handleWorkSubmit} style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: `1px solid ${editingWorkLogId ? '#0284c7' : '#cbd5e1'}`, display: 'grid', gap: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '14px', color: editingWorkLogId ? '#0284c7' : '#0f172a' }}>
              {editingWorkLogId ? '✏️ Edit Work / Attendance Entry' : '📋 Record Kaam / Attendance (मजदूरी की प्रविष्टि)'}
            </strong>
            {editingWorkLogId && (
              <button type="button" onClick={cancelEditWorkEntry} style={{ backgroundColor: '#e2e8f0', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>
                ✕ Cancel Edit
              </button>
            )}
          </div>
          
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
              <label style={labelStyle}>Quantity (Days/Hours/Units) *</label>
              <input type="number" step="0.01" placeholder="e.g. 5" value={units} onChange={e => setUnits(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold' }} required />
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
            <input type="text" placeholder="e.g. Chamber No. 3 pathai work / Mitti dhulai" value={desc} onChange={e => setDesc(e.target.value)} style={inputStyle} />
          </div>

          <button type="submit" style={{ backgroundColor: editingWorkLogId ? '#0284c7' : '#0f172a', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
            {editingWorkLogId ? '💾 Save Changes & Update Journal Voucher' : '⚡ Post Work Credit to Worker Ledger'}
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
                <option value="State Bank of India (बैंक)">State Bank of India (बैंक)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Amount Paid (रुपये) *</label>
            <input type="number" step="0.01" placeholder="e.g. 5000" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ ...inputStyle, fontSize: '15px', fontWeight: 'bold' }} required />
          </div>

          <div>
            <label style={labelStyle}>Narration / Notes</label>
            <input type="text" placeholder="e.g. Advance given for weekly expenses" value={payNarration} onChange={e => setPayNarration(e.target.value)} style={inputStyle} />
          </div>

          <button type="submit" style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
            ✓ Deduct Cash & Clear Liability
          </button>
        </form>
      )}

      {/* 3. PROFILE CREATION & EDIT TAB */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', display: 'grid', gap: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '14px', color: '#0284c7' }}>
              {isEditingProfile ? `✏️ Edit Profile: ${profileName}` : '➕ Register New Worker, Driver or Tractor'}
            </strong>
            <button type="button" onClick={() => setActiveTab('work')} style={{ backgroundColor: '#e2e8f0', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>
              ✕ Back
            </button>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={labelStyle}>Worker / Tractor Name *</label>
              <button
                type="button"
                onClick={() => setIsCustomProfileName(!isCustomProfileName)}
                style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
              >
                {isCustomProfileName ? '📋 Select from Existing Khata List' : '➕ Type New Custom Name'}
              </button>
            </div>

            {!isCustomProfileName ? (
              <select
                value={profileName}
                onChange={e => {
                  if (e.target.value === 'TYPE_NEW') {
                    setIsCustomProfileName(true);
                    setProfileName('');
                  } else {
                    setProfileName(e.target.value);
                  }
                }}
                style={{ ...inputStyle, fontWeight: 'bold', backgroundColor: '#ffffff' }}
                required
              >
                <option value="">-- Drop Down List se Naam Select Karein --</option>
                <optgroup label="🏢 Chart of Accounts / Existing Ledgers">
                  {masterAccounts.map(acc => (
                    <option key={acc.id} value={acc.account_name}>
                      {acc.account_name} ({acc.sub_group})
                    </option>
                  ))}
                </optgroup>
                <option value="TYPE_NEW">➕ + Type New Name...</option>
              </select>
            ) : (
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Thekedar ya Tractor RJ-13"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  style={{ ...inputStyle, fontWeight: 'bold' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsCustomProfileName(false)}
                  style={{ backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', padding: '0 12px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  List
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Engagement Type *</label>
              <select value={profileType} onChange={e => setProfileType(e.target.value)} style={inputStyle} required>
                <option value="PIECE_RATE_LABOUR">Piece-Rate Theka (काम के हिसाब से)</option>
                <option value="TRACTOR_MACHINERY">Tractor / Machinery Hire (किराया)</option>
                <option value="MONTHLY_STAFF">Monthly Staff (मासिक वेतन)</option>
                <option value="DAILY_WAGER">Daily Wager (दैनिक मजदूरी)</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Rate Calculation Unit *</label>
              <select value={profileRateType} onChange={e => setProfileRateType(e.target.value)} style={inputStyle} required>
                <option value="PER_THOUSAND_PCS">Per 1,000 Pcs (प्रति हज़ार ईंट)</option>
                <option value="PER_MONTH">Per Month (प्रति माह)</option>
                <option value="PER_DAY">Per Day (प्रति दिन)</option>
                <option value="PER_HOUR">Per Hour (प्रति घंटा)</option>
                <option value="PER_TON">Per Metric Ton (प्रति टन)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Standard Rate (₹) *</label>
              <input type="number" step="0.01" placeholder="e.g. 650" value={profileRate} onChange={e => setProfileRate(e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Phone Number (Optional)</label>
              <input type="tel" placeholder="e.g. 9876543210" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <button type="submit" style={{ backgroundColor: '#0284c7', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
            💾 {isEditingProfile ? 'Update Profile & Synchronize Ledger' : 'Save Profile & Create Ledger Account'}
          </button>
        </form>
      )}

      {/* Account Milan Transaction History Table with Action Buttons */}
      {summary && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px', border: '1px solid #cbd5e1', overflowX: 'auto' }}>
          <strong style={{ fontSize: '13px', display: 'block', marginBottom: '10px' }}>
            📖 Ledger Statement & Editable Work Entries: {summary.entity_name}
          </strong>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Particulars / Description</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Earned (हक ₹)</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Paid (भुगतान ₹)</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {summary.transactions.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>No work or payment entries recorded yet.</td></tr>
              ) : (
                summary.transactions.map((t, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>{t.date}</td>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{t.type}</td>
                    <td style={{ padding: '8px' }}>{t.particulars}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626', fontWeight: 'bold' }}>{t.earned > 0 ? `₹${t.earned.toFixed(2)}` : '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#059669', fontWeight: 'bold' }}>{t.paid > 0 ? `₹${t.paid.toFixed(2)}` : '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {t.is_work_log && t.log_id && (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => startEditWorkEntry(t.log_id)}
                            style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteWorkEntry(t.log_id)}
                            style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                      {!t.is_work_log && (
                        <span style={{ color: '#94a3b8', fontSize: '10px' }}>Voucher Mode</span>
                      )}
                    </td>
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
