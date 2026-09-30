// frontend/src/components/TransportTripView.jsx

import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';

export default function TransportTripView({ firm, selectedFY }) {
  const firmId = firm?.id || firm?.firm_id || 'FIRM-001';
  const storageKey = `transport_trips_${firmId}_${selectedFY}`;
  const voucherStorageKey = `account_book_vouchers_${firmId}`;

  const [trips, setTrips] = useState([]);
  const [lrNo, setLrNo] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [freightAmount, setFreightAmount] = useState('');
  const [advancePaid, setAdvancePaid] = useState('');
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');

  const loadTrips = () => {
    try {
      const saved = StorageService.getItem ? StorageService.getItem(storageKey) : JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(saved)) setTrips(saved);
    } catch (e) {
      console.error("Error loading transport trips:", e);
    }
  };

  useEffect(() => {
    loadTrips();
    window.addEventListener('app_storage_updated', loadTrips);
    window.addEventListener('app_state_updated', loadTrips);
    return () => {
      window.removeEventListener('app_storage_updated', loadTrips);
      window.removeEventListener('app_state_updated', loadTrips);
    };
  }, [storageKey]);

  const handleSaveTrip = (e) => {
    e.preventDefault();
    const freight = Number(freightAmount) || 0;
    const advance = Number(advancePaid) || 0;

    if (!lrNo || !vehicleNo || freight <= 0) {
      alert("Kripya LR No, Vehicle No aur valid Freight Amount bharein!");
      return;
    }

    try {
      const tripId = 'TRIP-' + Date.now();
      const newTrip = {
        id: tripId,
        lrNo: lrNo.trim(),
        vehicleNo: vehicleNo.trim().toUpperCase(),
        driverName: driverName.trim(),
        fromLocation: fromLocation.trim(),
        toLocation: toLocation.trim(),
        freightAmount: freight,
        advancePaid: advance,
        balanceDue: freight - advance,
        tripDate,
        remarks: remarks.trim(),
        selectedFY
      };

      // 1. Post Double-Entry Journal Voucher for Freight Expense
      const voucherEntries = [
        { account_name: 'Freight & Cartage Inward', type: 'DR', amount: freight }
      ];
      if (advance > 0) {
        voucherEntries.push({ account_name: 'Cash-in-Hand', type: 'CR', amount: advance });
      }
      if ((freight - advance) > 0) {
        voucherEntries.push({ account_name: driverName ? `Driver - ${driverName}` : `Vehicle ${vehicleNo} Transport`, type: 'CR', amount: freight - advance });
      }

      const newVoucher = {
        id: 'JV-TRIP-' + Date.now(),
        voucher_type: 'JOURNAL',
        voucher_date: tripDate,
        reference_no: `LR-${lrNo}`,
        firm_id: firmId,
        selectedFY,
        narration: `Transport LR #${lrNo} | ${fromLocation || 'Origin'} to ${toLocation || 'Destination'} | Vehicle: ${vehicleNo}`,
        amount: freight,
        total_amount: freight,
        entries: voucherEntries
      };

      const existingVouchers = StorageService.getItem(voucherStorageKey) || StorageService.getItem('account_book_vouchers') || [];
      const updatedVouchers = [newVoucher, ...(Array.isArray(existingVouchers) ? existingVouchers : [])];
      StorageService.setItem(voucherStorageKey, updatedVouchers);
      StorageService.setItem('account_book_vouchers', updatedVouchers);

      // 2. Save Trip Record
      const updatedTrips = [newTrip, ...trips];
      setTrips(updatedTrips);
      StorageService.setItem(storageKey, updatedTrips);

      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));

      // Reset Form
      setLrNo('');
      setVehicleNo('');
      setDriverName('');
      setFromLocation('');
      setToLocation('');
      setFreightAmount('');
      setAdvancePaid('');
      setRemarks('');
      alert("✓ Transport Trip, LR & Accounting Voucher successfully recorded!");
    } catch (err) {
      alert("Error saving trip: " + err.message);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Kya aap is trip record ko delete karna chahte hain?")) {
      try {
        const updated = trips.filter(t => t.id !== id);
        setTrips(updated);
        StorageService.setItem(storageKey, updated);
        window.dispatchEvent(new Event('app_storage_updated'));
      } catch (err) {
        alert("Delete failed: " + err.message);
      }
    }
  };

  return (
    <div style={{ padding: '4px', maxWidth: '750px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', color: '#0f172a' }}>
      
      {/* Header & Form Card */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🚚 Transport Trip Sheet & LR Management ({selectedFY})
        </h3>

        <form onSubmit={handleSaveTrip} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>LR Number *</label>
            <input type="text" value={lrNo} onChange={e => setLrNo(e.target.value)} placeholder="e.g. LR-101" style={inputStyle} required />
          </div>

          <div>
            <label style={labelStyle}>Vehicle Number *</label>
            <input type="text" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="e.g. RJ13GA1234" style={inputStyle} required />
          </div>

          <div>
            <label style={labelStyle}>Driver Name</label>
            <input type="text" value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Driver ka naam" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Trip Date *</label>
            <input type="date" value={tripDate} onChange={e => setTripDate(e.target.value)} style={inputStyle} required />
          </div>

          <div>
            <label style={labelStyle}>From (Kahan se)</label>
            <input type="text" value={fromLocation} onChange={e => setFromLocation(e.target.value)} placeholder="Origin City" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>To (Kahan tak)</label>
            <input type="text" value={toLocation} onChange={e => setToLocation(e.target.value)} placeholder="Destination City" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Freight Amount (₹) *</label>
            <input type="number" step="0.01" value={freightAmount} onChange={e => setFreightAmount(e.target.value)} placeholder="Total Bhada" style={inputStyle} required />
          </div>

          <div>
            <label style={labelStyle}>Advance Paid (₹)</label>
            <input type="number" step="0.01" value={advancePaid} onChange={e => setAdvancePaid(e.target.value)} placeholder="Pesgi Rakam" style={inputStyle} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Remarks / Material Details</label>
            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Goods description or notes..." style={inputStyle} />
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
            <button type="submit" style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '11px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '12px' }}>
              💾 Save Transport Trip & LR
            </button>
          </div>
        </form>
      </div>

      {/* Trips Table List */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#0f172a', fontWeight: 'bold' }}>Recorded Trips & Freight ({selectedFY})</h4>
        {trips.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', fontSize: '11px' }}>Koi trip record darj nahi hai.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>
                  <th style={{ padding: '8px' }}>Date / LR</th>
                  <th style={{ padding: '8px' }}>Vehicle / Driver</th>
                  <th style={{ padding: '8px' }}>Route</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Freight</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Advance</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Balance</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {trips.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px' }}>{t.tripDate}<br /><strong>{t.lrNo}</strong></td>
                    <td style={{ padding: '8px' }}>{t.vehicleNo}<br /><span style={{ color: '#64748b' }}>{t.driverName}</span></td>
                    <td style={{ padding: '8px' }}>{t.fromLocation} → {t.toLocation}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#0369a1' }}>₹{Number(t.freightAmount || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#166534' }}>₹{Number(t.advancePaid || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#b91c1c' }}>₹{Number(t.balanceDue || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button onClick={() => handleDelete(t.id)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = {
  width: '100%',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '11px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#0f172a'
};
