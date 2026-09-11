// frontend/src/components/PayrollManagementView.jsx
import React, { useState, useEffect } from 'react';
import { loadFirmData, saveFirmData } from '../utils/firmIsolationEngine';

export default function PayrollManagementView({ firm, onClose }) {
  const [workersList, setWorkersList] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseLedger, setExpenseLedger] = useState('Pathai & Labour Expense');
  const [quantity, setQuantity] = useState('');
  const [ratePerUnit, setRatePerUnit] = useState('');
  const [workDescription, setWorkDescription] = useState('');

  const [payrollEntries, setPayrollEntries] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // फर्म-वाइज डेटा लोड करना
  useEffect(() => {
    if (!firm) return;
    const workers = loadFirmData('app_workers', firm, [
      { id: 'w_1', name: 'Munshi Ji (Accountant)', type: 'Employee' },
      { id: 'w_2', name: 'Tractor Driver 1', type: 'Driver' }
    ]);
    const entries = loadFirmData('app_payroll_entries', firm, []);
    
    setWorkersList(workers);
    setPayrollEntries(entries);
  }, [firm]);

  // ऑटो-कैलकुलेशन: Quantity * Rate per Unit
  const calculatedTotalAmount = (Number(quantity) || 0) * (Number(ratePerUnit) || 0);

  // वर्कर के हिसाब से एंट्री पोस्ट करना
  const handlePostWorkCredit = (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedWorker) {
      setErrorMsg('Please select a worker, driver, or employee.');
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

    const newEntry = {
      id: 'PAY-' + Date.now(),
      worker: selectedWorker,
      date: workDate,
      expense_ledger: expenseLedger,
      quantity: Number(quantity),
      rate: Number(ratePerUnit),
      total_amount: calculatedTotalAmount,
      description: workDescription || 'Work Attendance Entry',
      timestamp: new Date().toISOString()
    };

    const updatedEntries = [newEntry, ...payrollEntries];
    setPayrollEntries(updatedEntries);
    saveFirmData('app_payroll_entries', firm, updatedEntries);

    setSuccessMsg(`✓ Successfully posted ₹${calculatedTotalAmount} credit to ${selectedWorker}'s ledger!`);
    setQuantity('');
    setRatePerUnit('');
    setWorkDescription('');
  };

  // चुनी गई फर्म और वर्कर के हिसाब से कुल राशि गणना
  const workerEntries = payrollEntries.filter(e => e.worker === selectedWorker);
  const totalEarned = workerEntries.reduce((sum, e) => sum + (e.total_amount || 0), 0);
  const totalPaid = 0; // भुगतान वाउचर से सिंक किया जा सकता है
  const totalBaki = totalEarned - totalPaid;

  return (
    <div style={{ width: '100%', maxWidth: '100vw', minHeight: '100vh', backgroundColor: '#f8fafc', padding: '10px', fontFamily: 'sans-serif', boxSizing: 'border-box', overflowX: 'hidden', color: '#0f172a' }}>
      
      {/* हेडर */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '14px', border: '1px solid #e2e8f0', marginBottom: '12px', boxSizing: 'border-box', width: '100%' }}>
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
        <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>👷 Labour, Employee & Tractor Wages</h1>
      </div>

      {errorMsg && <div style={{ marginBottom: '12px', padding: '10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', boxSizing: 'border-box', width: '100%' }}>{errorMsg}</div>}
      {successMsg && <div style={{ marginBottom: '12px', padding: '10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', boxSizing: 'border-box', width: '100%' }}>{successMsg}</div>}

      {/* वर्कर चयन और समरी बॉक्स */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '14px', border: '1px solid #e2e8f0', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box', width: '100%' }}>
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>Select Worker / Driver / Tractor *</label>
          <select 
            value={selectedWorker} 
            onChange={(e) => setSelectedWorker(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}
          >
            <option value="">-- Choose Worker / Staff --</option>
            {workersList.map((w, idx) => (
              <option key={idx} value={w.name}>{w.name} ({w.type})</option>
            ))}
          </select>
        </div>

        {/* फिक्सड समरी ग्रिड (बिना टेक्स्ट ओवरलैप के) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
          <div>
            <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold' }}>KUL (कुल)</div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>₹{totalEarned}</div>
          </div>
          <div>
            <div style={{ fontSize: '9px', color: '#166534', fontWeight: 'bold' }}>CHUKAYE (चुकाए)</div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#166534' }}>₹{totalPaid}</div>
          </div>
          <div>
            <div style={{ fontSize: '9px', color: '#991b1b', fontWeight: 'bold' }}>BAKI (बाकी)</div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#991b1b' }}>₹{totalBaki}</div>
          </div>
        </div>
      </div>

      {/* मजदूरी प्रविष्टि फॉर्म */}
      <form onSubmit={handlePostWorkCredit} style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '14px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box', width: '100%' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800 }}>📋 Record Kaam / Attendance (मजदूरी की प्रविष्टि)</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
          <div>
            <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>Date of Work *</label>
            <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>Expense Account *</label>
            <select value={expenseLedger} onChange={(e) => setExpenseLedger(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
              <option value="Pathai & Labour Expense">Pathai & Labour Expense</option>
              <option value="Tractor Diesel & Maintenance">Tractor Diesel & Maintenance</option>
              <option value="General Factory Wages">General Factory Wages</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', width: '100%', boxSizing: 'border-box', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>Quantity *</label>
            <input type="number" placeholder="e.g. 5" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>Rate/Unit (₹) *</label>
            <input type="number" placeholder="e.g. 18000" value={ratePerUnit} onChange={(e) => setRatePerUnit(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>
          <div>
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

      {/* लेजर रजिस्टर */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '14px', border: '1px solid #e2e8f0', boxSizing: 'border-box', width: '100%' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800 }}>📖 Ledger Statement ({selectedWorker || 'Select Worker'})</h3>
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
