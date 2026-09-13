// frontend/src/components/PayrollManagementView.jsx
import React, { useState, useEffect } from 'react';
import { loadFirmData, saveFirmData } from '../utils/firmIsolationEngine';
import SearchableAccountDropdown from './SearchableAccountDropdown';

export default function PayrollManagementView({ firm, onClose }) {
  const activeFirmId = firm?.id || firm?.firm_id || 'FIRM-001';
  const [workersList, setWorkersList] = useState([]);
  const [expenseAccountsList, setExpenseAccountsList] = useState([]);
  
  const [selectedWorker, setSelectedWorker] = useState('');
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseLedger, setExpenseLedger] = useState('Pathai & Labour Expenses');
  const [quantity, setQuantity] = useState('');
  const [ratePerUnit, setRatePerUnit] = useState('');
  const [workDescription, setWorkDescription] = useState('');

  const [payrollEntries, setPayrollEntries] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadData = () => {
    if (!firm) return;
    
    const allAccounts = loadFirmData('app_accounts', firm, [
      { id: 'w_1', account_name: 'Munshi Ji (Accountant)', sub_group: 'Employee', primary_type: 'LIABILITIES' },
      { id: 'w_2', account_name: 'Tractor Driver 1', sub_group: 'Driver', primary_type: 'LIABILITIES' },
      { id: 'w_3', account_name: 'Pathai & Labour Expenses', sub_group: 'Direct Labor & Pathai Expenses (मजदूरी)', primary_type: 'EXPENSES' },
      { id: 'w_4', account_name: 'Tractor Diesel & Maintenance', sub_group: 'Operating Fuel Costs (Tractor / Generator Diesel)', primary_type: 'EXPENSES' },
      { id: 'w_5', account_name: 'General Factory Wages', sub_group: 'Direct Production Expenses', primary_type: 'EXPENSES' }
    ]);

    setWorkersList(allAccounts);

    const expenseAccs = allAccounts.filter(acc => 
      (acc.primary_type || '').toUpperCase() === 'EXPENSES' ||
      (acc.sub_group || '').toLowerCase().includes('expense') ||
      (acc.sub_group || '').toLowerCase().includes('direct')
    );
    setExpenseAccountsList(expenseAccs.length > 0 ? expenseAccs : allAccounts);
    
    const entries = loadFirmData('app_payroll_entries', firm, []);
    setPayrollEntries(entries);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('focus', loadData);
    window.addEventListener('app_storage_updated', loadData);
    return () => {
      window.removeEventListener('focus', loadData);
      window.removeEventListener('app_storage_updated', loadData);
    };
  }, [firm]);

  const calculatedTotalAmount = (Number(quantity) || 0) * (Number(ratePerUnit) || 0);

  const resolveName = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'object') {
      return (val.account_name || val.name || val.label || '').trim();
    }
    return String(val).trim();
  };

  const ensureAccountExists = (accountName, subGroup, primaryType) => {
    if (!accountName) return;
    const accounts = loadFirmData('app_accounts', firm, []);
    const exists = accounts.some(acc => resolveName(acc.account_name).toLowerCase() === accountName.toLowerCase());
    
    if (!exists) {
      const newAcc = {
        id: 'ACC-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        account_name: accountName,
        sub_group: subGroup || 'Direct Labor & Pathai Expenses (मजदूरी)',
        primary_type: primaryType || 'EXPENSES',
        opening_balance: 0,
        balance_type: primaryType === 'LIABILITIES' ? 'Cr' : 'Dr',
        timestamp: new Date().toISOString()
      };
      saveFirmData('app_accounts', firm, [newAcc, ...accounts]);
    }
  };

  const handlePostWorkCredit = (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const workerName = resolveName(selectedWorker);
    const expenseName = resolveName(expenseLedger);

    if (!workerName) {
      setErrorMsg('Please select a valid worker, driver, or employee.');
      return;
    }
    if (!expenseName) {
      setErrorMsg('Please select a valid expense account.');
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      setErrorMsg('Please enter a valid quantity/days/units.');
      return;
    }
    if (!ratePerUnit || Number(ratePerUnit) <= 0) {
      setErrorMsg('Please enter a valid rate per unit.');
      return;
    }

    ensureAccountExists(workerName, 'Sundry Creditors (Suppliers / लेनदार)', 'LIABILITIES');
    ensureAccountExists(expenseName, 'Direct Labor & Pathai Expenses (मजदूरी)', 'EXPENSES');

    const timestamp = new Date().toISOString();
    const uniqueId = 'PAY-' + Date.now();

    const newEntry = {
      id: uniqueId,
      firm_id: activeFirmId,
      worker: workerName,
      date: workDate,
      expense_ledger: expenseName,
      quantity: Number(quantity),
      rate: Number(ratePerUnit),
      total_amount: calculatedTotalAmount,
      description: workDescription || 'Work Attendance Entry',
      timestamp
    };

    // 1. Save locally in payroll records
    const updatedEntries = [newEntry, ...payrollEntries];
    setPayrollEntries(updatedEntries);
    saveFirmData('app_payroll_entries', firm, updatedEntries);

    // 2. CRITICAL: Push directly as a standard double-entry voucher to financial report storage keys
    try {
      const vchPayload = {
        id: uniqueId,
        firm_id: activeFirmId,
        voucher_date: workDate,
        date: workDate,
        voucher_type: 'JV',
        type: 'JV',
        voucher_number: uniqueId.slice(-6),
        reference_no: uniqueId.slice(-6),
        narration: `Wages credited to ${workerName} via ${expenseName} [Qty: ${quantity} x Rate: ${ratePerUnit}] - ${workDescription}`,
        entries: [
          { account_name: expenseName, type: 'Dr', amount: calculatedTotalAmount },
          { account_name: workerName, type: 'Cr', amount: calculatedTotalAmount }
        ],
        created_at: timestamp
      };

      // Target keys scanned by ledgerEngine and financialReportEngine
      const keysToUpdate = [
        `account_book_vouchers_${activeFirmId}`,
        `app_vouchers_${activeFirmId}`,
        'account_book_vouchers',
        'app_vouchers'
      ];

      keysToUpdate.forEach(key => {
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        localStorage.setItem(key, JSON.stringify([vchPayload, ...existing]));
      });
    } catch (err) {
      console.error('Error posting auto-voucher for payroll:', err);
    }

    // 3. Broadcast sync events
    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('storage'));

    setSuccessMsg(`✓ Successfully posted ₹${calculatedTotalAmount} credit to ${workerName}'s ledger & financial statements!`);
    setQuantity('');
    setRatePerUnit('');
    setWorkDescription('');
    loadData();
  };

  const resolvedActiveWorker = resolveName(selectedWorker);
  const workerEntries = payrollEntries.filter(e => resolveName(e.worker).toLowerCase() === resolvedActiveWorker.toLowerCase());
  const totalEarned = workerEntries.reduce((sum, e) => sum + (e.total_amount || 0), 0);
  const totalPaid = 0; 
  const totalBaki = totalEarned - totalPaid;

  return (
    <div style={{ width: '100%', maxWidth: '100vw', minHeight: '100vh', backgroundColor: '#f8fafc', padding: '8px', fontFamily: 'sans-serif', boxSizing: 'border-box', overflowX: 'hidden', color: '#0f172a' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', marginBottom: '10px', boxSizing: 'border-box', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          {onClose && (
            <button onClick={onClose} style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
              ← Dashboard
            </button>
          )}
          <div style={{ fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
            Firm: {firm?.legal_name || firm?.name || 'Active Firm'}
          </div>
        </div>
        <h1 style={{ margin: 0, fontSize: '14px', fontWeight: 800 }}>👷 Labour, Employee & Tractor Wages</h1>
      </div>

      {errorMsg && <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', boxSizing: 'border-box', width: '100%' }}>{errorMsg}</div>}
      {successMsg && <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', boxSizing: 'border-box', width: '100%' }}>{successMsg}</div>}

      {/* Worker Selector & Summary */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box', width: '100%' }}>
        <div>
          <SearchableAccountDropdown 
            firm={firm}
            label="Select Worker / Driver / Staff *"
            accounts={workersList}
            value={selectedWorker}
            onChange={(val) => setSelectedWorker(val)}
            placeholder="-- Search Worker or Staff --"
            required={true}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center', backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
          <div>
            <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold' }}>KUL (कुल)</div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a' }}>₹{totalEarned}</div>
          </div>
          <div>
            <div style={{ fontSize: '9px', color: '#166534', fontWeight: 'bold' }}>CHUKAYE (चुकाए)</div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#166534' }}>₹{totalPaid}</div>
          </div>
          <div>
            <div style={{ fontSize: '9px', color: '#991b1b', fontWeight: 'bold' }}>BAKI (बाकी)</div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#991b1b' }}>₹{totalBaki}</div>
          </div>
        </div>
      </div>

      {/* Wage Entry Form */}
      <form onSubmit={handlePostWorkCredit} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box', width: '100%' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 800 }}>📋 Record Kaam / Attendance (मजदूरी की प्रविष्टि)</h3>

        <div style={{ display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>Date of Work *</label>
            <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <SearchableAccountDropdown 
              firm={firm}
              label="Expense Account *"
              accounts={expenseAccountsList}
              value={expenseLedger}
              onChange={(val) => setExpenseLedger(val)}
              placeholder="-- Search Expense Ledger --"
              required={true}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', width: '100%', boxSizing: 'border-box', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>Quantity *</label>
            <input type="number" placeholder="e.g. 5" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>Rate/Unit (₹) *</label>
            <input type="number" placeholder="e.g. 100" value={ratePerUnit} onChange={(e) => setRatePerUnit(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>Kul Amount (₹)</label>
            <div style={{ padding: '9px', backgroundColor: '#f1f5f9', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 'bold', color: '#166534', boxSizing: 'border-box' }}>
              ₹{calculatedTotalAmount}
            </div>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>Work Description (विवरण)</label>
          <input type="text" placeholder="e.g. Chamber No. 3 pathai work" value={workDescription} onChange={(e) => setWorkDescription(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
        </div>

        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', marginTop: '4px', boxSizing: 'border-box' }}>
          ⚡ Post Work Credit to Worker Ledger
        </button>
      </form>

      {/* Ledger Statement */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', boxSizing: 'border-box', width: '100%' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800 }}>📖 Ledger Statement ({resolvedActiveWorker || 'Select Worker'})</h3>
        {workerEntries.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '11px', padding: '10px' }}>No work or attendance entries recorded for this worker yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
            {workerEntries.map((ent, idx) => (
              <div key={idx} style={{ padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px', boxSizing: 'border-box', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '3px' }}>
                  <span>{ent.date} ({ent.expense_ledger})</span>
                  <span style={{ color: '#166534' }}>Earned: +₹{ent.total_amount}</span>
                </div>
                <div style={{ color: '#64748b', wordBreak: 'break-word' }}>
                  {ent.description} [Qty: {ent.quantity} × Rate: ₹{ent.rate}]
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
