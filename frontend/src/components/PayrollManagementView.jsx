// frontend/src/components/PayrollManagementView.jsx

import React, { useState, useEffect } from 'react';
import { loadFirmData, saveFirmData } from '../utils/firmIsolationEngine';
import { getFirmMasterAccounts, saveMasterAccount } from '../utils/accountMasterEngine.js';
import { saveUniversalVoucher, deleteUniversalVoucher } from '../utils/voucherPostingEngine.js';
import { getAllUniversalVouchers } from '../utils/statementEngine.js';
import SearchableAccountDropdown from './SearchableAccountDropdown';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export default function PayrollManagementView({ firm, onClose }) {
  const activeFirmId = firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';

  const [workersList, setWorkersList] = useState([]);
  const [expenseAccountsList, setExpenseAccountsList] = useState([]);
  
  const [selectedWorker, setSelectedWorker] = useState('');
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseLedger, setExpenseLedger] = useState('Pathai & Labour Expenses (मजदूरी)');
  const [quantity, setQuantity] = useState('');
  const [ratePerUnit, setRatePerUnit] = useState('');
  const [workDescription, setWorkDescription] = useState('');

  const [payrollEntries, setPayrollEntries] = useState([]);
  const [editingEntryId, setEditingEntryId] = useState(null);

  const [workerVouchers, setWorkerVouchers] = useState([]);

  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadData = () => {
    if (!firm) return;
    
    const allAccounts = getFirmMasterAccounts(activeFirmId) || [];
    setWorkersList(allAccounts);

    const expenseAccs = allAccounts.filter(acc => {
      const type = (acc.primary_type || acc.type || '').toLowerCase();
      const group = (acc.sub_group || acc.group || '').toLowerCase();
      return type.includes('expense') || group.includes('expense') || group.includes('direct') || group.includes('labor') || group.includes('wage');
    });
    setExpenseAccountsList(expenseAccs.length > 0 ? expenseAccs : allAccounts);
    
    const entries = loadFirmData('app_payroll_entries', firm, []);
    entries.sort((a, b) => new Date(b.date || b.timestamp || 0) - new Date(a.date || a.timestamp || 0));
    setPayrollEntries(entries);

    // Fetch firm vouchers to accurately resolve paid vs earned balances
    const allVchs = getAllUniversalVouchers(activeFirmId) || [];
    setWorkerVouchers(allVchs);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('focus', loadData);
    window.addEventListener('app_storage_updated', loadData);
    window.addEventListener('app_state_updated', loadData);
    return () => {
      window.removeEventListener('focus', loadData);
      window.removeEventListener('app_storage_updated', loadData);
      window.removeEventListener('app_state_updated', loadData);
    };
  }, [firm, activeFirmId]);

  const calculatedTotalAmount = round2((Number(quantity) || 0) * (Number(ratePerUnit) || 0));

  const handlePostWorkCredit = (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const workerName = (typeof selectedWorker === 'object' 
      ? (selectedWorker.account_name || selectedWorker.name || '') 
      : selectedWorker).trim();
    
    const expenseName = (typeof expenseLedger === 'object' 
      ? (expenseLedger.account_name || expenseLedger.name || '') 
      : expenseLedger).trim();

    if (!workerName) {
      setErrorMsg('Please select a worker, driver, or contractor.');
      return;
    }
    if (!expenseName) {
      setErrorMsg('Please select an expense account.');
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      setErrorMsg('Please enter a valid quantity/units (> 0).');
      return;
    }
    if (!ratePerUnit || Number(ratePerUnit) <= 0) {
      setErrorMsg('Please enter a valid rate per unit (> 0).');
      return;
    }

    const entryId = editingEntryId || ('PAY-' + Date.now());

    // 1. Ensure Worker & Expense Ledgers Exist in Master
    const currentAccounts = getFirmMasterAccounts(activeFirmId);
    if (!currentAccounts.some(a => (a.account_name || a.name || '').trim().toLowerCase() === workerName.toLowerCase())) {
      saveMasterAccount(activeFirmId, {
        account_name: workerName,
        primary_type: 'LIABILITIES',
        type: 'Liabilities',
        sub_group: 'Sundry Creditors (Suppliers / Vendors)',
        balance_type: 'Cr'
      });
    }

    // 2. Save / Update Payroll Entry
    const newEntry = {
      id: entryId,
      firm_id: activeFirmId,
      worker: workerName,
      date: workDate,
      expense_ledger: expenseName,
      quantity: Number(quantity),
      rate: Number(ratePerUnit),
      total_amount: calculatedTotalAmount,
      description: workDescription || 'Work Attendance Entry',
      timestamp: new Date().toISOString()
    };

    const filteredEntries = payrollEntries.filter(e => e.id !== entryId);
    const updatedEntries = [newEntry, ...filteredEntries];
    setPayrollEntries(updatedEntries);
    saveFirmData('app_payroll_entries', firm, updatedEntries);

    // 3. Post Dual-Key Synchronized Double-Entry Journal Voucher
    try {
      const voucherId = 'JV-' + entryId;
      saveUniversalVoucher(activeFirmId, {
        id: voucherId,
        firm_id: activeFirmId,
        firmId: activeFirmId,
        voucher_type: 'JOURNAL',
        type: 'JOURNAL',
        voucher_number: entryId,
        reference_no: entryId,
        voucher_date: workDate,
        date: workDate,
        dr_account: expenseName,
        cr_account: workerName,
        amount: calculatedTotalAmount,
        total_amount: calculatedTotalAmount,
        narration: `Wages credited to ${workerName} via ${expenseName} [Qty: ${quantity} x Rate: ₹${ratePerUnit}] - ${workDescription || 'Attendance'}`,
        is_compound: true,
        entries: [
          { account_name: expenseName, party: expenseName, type: 'DR', debit: calculatedTotalAmount, credit: 0, amount: calculatedTotalAmount },
          { account_name: workerName, party: workerName, type: 'CR', debit: 0, credit: calculatedTotalAmount, amount: calculatedTotalAmount }
        ]
      });
    } catch (err) {
      console.error('Error posting auto-voucher for payroll:', err);
    }

    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('storage'));

    setSuccessMsg(editingEntryId 
      ? `✓ Successfully updated wage entry for ${workerName}!` 
      : `✓ Successfully posted ₹${calculatedTotalAmount.toLocaleString('en-IN')} credit to ${workerName}'s ledger!`
    );
    
    setEditingEntryId(null);
    setQuantity('');
    setRatePerUnit('');
    setWorkDescription('');
    loadData();
  };

  const handleEditEntry = (ent) => {
    if (!ent) return;
    setEditingEntryId(ent.id);
    setSelectedWorker(ent.worker || '');
    setWorkDate(ent.date || new Date().toISOString().slice(0, 10));
    setExpenseLedger(ent.expense_ledger || 'Pathai & Labour Expenses (मजदूरी)');
    setQuantity(ent.quantity ? String(ent.quantity) : '');
    setRatePerUnit(ent.rate ? String(ent.rate) : '');
    setWorkDescription(ent.description || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteEntry = (entryId) => {
    if (!window.confirm('Is attendance/wage entry ko delete karne se khate se credit hat jayega. Jari rakhein?')) return;

    try {
      const filteredEntries = payrollEntries.filter(e => e.id !== entryId);
      setPayrollEntries(filteredEntries);
      saveFirmData('app_payroll_entries', firm, filteredEntries);

      // Delete corresponding JV voucher
      try {
        deleteUniversalVoucher(activeFirmId, 'JV-' + entryId);
      } catch (e) {}

      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('storage'));

      if (editingEntryId === entryId) {
        setEditingEntryId(null);
        setQuantity('');
        setRatePerUnit('');
        setWorkDescription('');
      }

      loadData();
      alert('✓ Wage entry & accounting voucher deleted successfully.');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const resolvedActiveWorker = typeof selectedWorker === 'object' ? (selectedWorker.account_name || '') : selectedWorker;
  const workerEntries = payrollEntries.filter(e => !resolvedActiveWorker || e.worker === resolvedActiveWorker);
  
  // Real-Time Calculation of Earned vs Paid (from actual payments/vouchers)
  const totalEarned = round2(workerEntries.reduce((sum, e) => sum + (e.total_amount || 0), 0));
  
  let totalPaid = 0;
  if (resolvedActiveWorker) {
    const targetClean = resolvedActiveWorker.trim().toLowerCase();
    workerVouchers.forEach(v => {
      if (!v) return;
      const vType = String(v.voucher_type || v.type || '').toUpperCase();
      const dr = (v.dr_account || v.debit_account || v.dr_party || '').trim().toLowerCase();
      
      // Payment made to worker (Worker A/c Dr To Cash/Bank Cr)
      if (vType === 'PAYMENT' || vType === 'PAY') {
        if (dr === targetClean) {
          totalPaid += parseFloat(v.amount || v.total_amount || 0);
        } else if (Array.isArray(v.entries)) {
          v.entries.forEach(e => {
            if ((e.account_name || e.party || '').trim().toLowerCase() === targetClean && (e.type === 'DR' || e.type === 'Dr')) {
              totalPaid += parseFloat(e.amount || e.debit || 0);
            }
          });
        }
      }
    });
  }
  totalPaid = round2(totalPaid);
  const totalBaki = round2(totalEarned - totalPaid);

  return (
    <div style={{ width: '100%', maxWidth: '100vw', minHeight: '100vh', backgroundColor: '#f8fafc', padding: '10px', fontFamily: 'sans-serif', boxSizing: 'border-box', overflowX: 'hidden', color: '#0f172a' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0', marginBottom: '12px', boxSizing: 'border-box', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          {onClose && (
            <button onClick={onClose} style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '6px 12px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
              ← Dashboard
            </button>
          )}
          <div style={{ fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
            🏢 Firm: {firm?.legal_name || firm?.name || 'Active Firm'}
          </div>
        </div>
        <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>👷 Labour, Employee & Tractor Wages</h1>
      </div>

      {errorMsg && <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', boxSizing: 'border-box', width: '100%' }}>{errorMsg}</div>}
      {successMsg && <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', boxSizing: 'border-box', width: '100%' }}>{successMsg}</div>}

      {/* Worker Selection & Summary */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box', width: '100%' }}>
        <div>
          <SearchableAccountDropdown 
            firm={firm}
            firmId={activeFirmId}
            label="Select Worker / Driver / Staff (Optional filter)"
            accounts={workersList}
            value={selectedWorker}
            onChange={(val) => setSelectedWorker(val)}
            placeholder="-- Search Worker or Staff --"
            required={false}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
          <div>
            <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold' }}>KUL EARNED (कुल काम)</div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>₹{totalEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div style={{ fontSize: '9px', color: '#166534', fontWeight: 'bold' }}>PAID (चुकाए/भुगतान)</div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#166534' }}>₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div style={{ fontSize: '9px', color: '#991b1b', fontWeight: 'bold' }}>BAKI (देना बाकी)</div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: totalBaki > 0 ? '#991b1b' : '#059669' }}>₹{totalBaki.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>

      {/* Entry Form */}
      <form onSubmit={handlePostWorkCredit} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box', width: '100%' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800 }}>
          {editingEntryId ? '✏️ Edit Kaam / Attendance Entry' : '📋 Record Kaam / Attendance (मजदूरी की प्रविष्टि)'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>Date of Work *</label>
            <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <SearchableAccountDropdown 
              firm={firm}
              firmId={activeFirmId}
              label="Expense Account *"
              accounts={expenseAccountsList}
              value={expenseLedger}
              onChange={(val) => setExpenseLedger(val)}
              placeholder="-- Search Expense Ledger --"
              required={true}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>Quantity *</label>
            <input type="number" step="0.01" placeholder="e.g. 5" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>Rate/Unit (₹) *</label>
            <input type="number" step="0.01" placeholder="e.g. 100" value={ratePerUnit} onChange={(e) => setRatePerUnit(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>Kul Amount (₹)</label>
            <div style={{ padding: '10px', backgroundColor: '#f1f5f9', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 'bold', color: '#166534', boxSizing: 'border-box' }}>
              ₹{calculatedTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>Work Description (विवरण)</label>
          <input type="text" placeholder="e.g. Chamber No. 3 pathai work" value={workDescription} onChange={(e) => setWorkDescription(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', boxSizing: 'border-box' }}>
            {editingEntryId ? '✓ Update Payroll Entry' : '⚡ Post Work Credit to Worker Ledger'}
          </button>
          {editingEntryId && (
            <button type="button" onClick={() => { setEditingEntryId(null); setQuantity(''); setRatePerUnit(''); setWorkDescription(''); }} style={{ padding: '12px 14px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Scrollable Ledger Statement Register */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0', boxSizing: 'border-box', width: '100%' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800 }}>
          📖 Ledger Statement Register ({workerEntries.length})
        </h3>
        {workerEntries.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '11px', padding: '12px' }}>No work or attendance entries recorded yet.</div>
        ) : (
          <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
            {workerEntries.map((ent) => (
              <div key={ent.id} style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', boxSizing: 'border-box', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '2px', color: '#0f172a' }}>
                    {ent.date} | <strong>{ent.worker}</strong> ({ent.expense_ledger})
                  </div>
                  <div style={{ color: '#64748b', wordBreak: 'break-word', marginBottom: '2px' }}>
                    {ent.description} [Qty: {ent.quantity} × Rate: ₹{ent.rate}]
                  </div>
                  <div style={{ color: '#166534', fontWeight: 'bold' }}>
                    Earned: +₹{Number(ent.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => handleEditEntry(ent)} style={{ padding: '5px 10px', backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
                    Edit
                  </button>
                  <button onClick={() => handleDeleteEntry(ent.id)} style={{ padding: '5px 10px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
