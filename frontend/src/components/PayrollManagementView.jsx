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
      { id: 'w_2', account_name: 'Pathai & Labour Expenses', sub_group: 'Direct Labor', primary_type: 'EXPENSES' }
    ]);
    setWorkersList(allAccounts);
    setExpenseAccountsList(allAccounts.filter(a => a.primary_type === 'EXPENSES'));
    setPayrollEntries(loadFirmData('app_payroll_entries', firm, []));
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_storage_updated', loadData);
    return () => window.removeEventListener('app_storage_updated', loadData);
  }, [firm]);

  const calculatedTotalAmount = (Number(quantity) || 0) * (Number(ratePerUnit) || 0);

  const resolveName = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'object') return (val.account_name || val.name || val.label || '').trim();
    return String(val).trim();
  };

  const handlePostWorkCredit = (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const workerName = resolveName(selectedWorker);
    const expenseName = resolveName(expenseLedger);

    if (!workerName || !expenseName || calculatedTotalAmount <= 0) {
      setErrorMsg('कृपया सभी आवश्यक फील्ड सही भरें।');
      return;
    }

    const uniqueId = 'PAY-' + Date.now();
    const timestamp = new Date().toISOString();

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

    // Save to payroll list
    const updatedEntries = [newEntry, ...payrollEntries];
    setPayrollEntries(updatedEntries);
    saveFirmData('app_payroll_entries', firm, updatedEntries);

    // Save as Dual-Compatible Voucher (Flat + Array) in account_book_vouchers
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
        dr_account: expenseName,
        cr_account: workerName,
        amount: calculatedTotalAmount,
        total_amount: calculatedTotalAmount,
        narration: `Wages credited to ${workerName} via ${expenseName} [Qty: ${quantity} x Rate: ${ratePerUnit}] - ${workDescription}`,
        entries: [
          { account_name: expenseName, type: 'Dr', amount: calculatedTotalAmount },
          { account_name: workerName, type: 'Cr', amount: calculatedTotalAmount }
        ],
        created_at: timestamp
      };

      const storageKey = `account_book_vouchers_${activeFirmId}`;
      const existingVouchers = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Strict Deduplication check by ID
      const filtered = existingVouchers.filter(v => v.id !== uniqueId);
      localStorage.setItem(storageKey, JSON.stringify([vchPayload, ...filtered]));
      
      // Also update generic key for backup
      localStorage.setItem('account_book_vouchers', JSON.stringify([vchPayload, ...filtered]));
    } catch (err) {
      console.error('Voucher save error:', err);
    }

    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('storage'));

    setSuccessMsg(`✓ सफलतापूर्वक ₹${calculatedTotalAmount} की प्रविष्टि दर्ज हो गई!`);
    setQuantity('');
    setRatePerUnit('');
    setWorkDescription('');
    loadData();
  };

  const resolvedActiveWorker = resolveName(selectedWorker);
  const workerEntries = payrollEntries.filter(e => resolveName(e.worker).toLowerCase() === resolvedActiveWorker.toLowerCase());
  const totalEarned = workerEntries.reduce((sum, e) => sum + (e.total_amount || 0), 0);

  return (
    <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto', padding: '12px', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>👷 Labour & Wages Entry</h2>
      </div>

      {errorMsg && <div style={{ padding: '10px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', marginBottom: '10px', fontSize: '12px' }}>{errorMsg}</div>}
      {successMsg && <div style={{ padding: '10px', background: '#ecfdf5', color: '#065f46', borderRadius: '8px', marginBottom: '10px', fontSize: '12px' }}>{successMsg}</div>}

      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
        <SearchableAccountDropdown 
          firm={firm}
          label="Select Worker / Staff *"
          accounts={workersList}
          value={selectedWorker}
          onChange={(val) => setSelectedWorker(val)}
          placeholder="-- Select Worker --"
          required={true}
        />
        <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: 'bold' }}>कुल अर्जित (KUL): ₹{totalEarned}</div>
      </div>

      <form onSubmit={handlePostWorkCredit} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 style={{ margin: '0', fontSize: '13px', fontWeight: 800 }}>📋 मजदूरी विवरण</h3>
        
        <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
        
        <SearchableAccountDropdown 
          firm={firm}
          label="Expense Account *"
          accounts={expenseAccountsList}
          value={expenseLedger}
          onChange={(val) => setExpenseLedger(val)}
          placeholder="-- Select Expense --"
          required={true}
        />

        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="number" placeholder="Quantity e.g. 1000" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
          <input type="number" placeholder="Rate e.g. 50" value={ratePerUnit} onChange={(e) => setRatePerUnit(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
        </div>

        <div style={{ padding: '10px', background: '#f1f5f9', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', color: '#166534' }}>
          Kul Amount: ₹{calculatedTotalAmount}
        </div>

        <input type="text" placeholder="Description e.g. pathai work" value={workDescription} onChange={(e) => setWorkDescription(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />

        <button type="submit" style={{ padding: '12px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
          ⚡ Post Work Credit
        </button>
      </form>
    </div>
  );
}
