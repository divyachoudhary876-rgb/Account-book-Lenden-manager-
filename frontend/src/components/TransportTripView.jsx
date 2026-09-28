// frontend/src/components/TransportTripView.jsx

import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';

export default function TransportTripView({ firm, selectedFY }) {
  const firmId = firm?.id || 'FIRM-001';
  const storageKey = `transport_trips_${firmId}_${selectedFY}`;

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

  useEffect(() => {
    try {
      const saved = StorageService.getItem ? StorageService.getItem(storageKey) : JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(saved)) setTrips(saved);
    } catch (e) {
      console.error("Error loading transport trips:", e);
    }
  }, [storageKey]);

  const handleSaveTrip = (e) => {
    e.preventDefault();
    if (!lrNo || !vehicleNo || !freightAmount) {
      alert("Kripya LR No, Vehicle No aur Freight Amount bharein!");
      return;
    }

    const newTrip = {
      id: 'TRIP-' + Date.now(),
      lrNo,
      vehicleNo: vehicleNo.toUpperCase(),
      driverName,
      fromLocation,
      toLocation,
      freightAmount: Number(freightAmount) || 0,
      advancePaid: Number(advancePaid) || 0,
      balanceDue: (Number(freightAmount) || 0) - (Number(advancePaid) || 0),
      tripDate,
      remarks,
      selectedFY
    };

    const updated = [newTrip, ...trips];
    setTrips(updated);
    StorageService.setItem(storageKey, updated);
    window.dispatchEvent(new Event('app_storage_updated'));

    // Reset Form
    setLrNo('');
    setVehicleNo('');
    setDriverName('');
    setFromLocation('');
    setToLocation('');
    setFreightAmount('');
    setAdvancePaid('');
    setRemarks('');
    alert("✓ Transport Trip & LR successfully recorded!");
  };

  const handleDelete = (id) => {
    if (window.confirm("Kya aap is trip record ko delete karna chahte hain?")) {
      const updated = trips.filter(t => t.id !== id);
      setTrips(updated);
      StorageService.setItem(storageKey, updated);
      window.dispatchEvent(new Event('app_storage_updated'));
    }
  };

  return (
    <div style={{ padding: '10px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🚚 Transport Trip Sheet & LR Management ({selectedFY})
        </h3>

        <form onSubmit={handleSaveTrip} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>LR Number *</label>
            <input type="text" value={lrNo} onChange={e => setLrNo(e.target.value)} placeholder="e.g. LR-101" style={inputStyle} required />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Vehicle Number *</label>
            <input type="text" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="e.g. RJ13GA1234" style={inputStyle} required />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Driver Name</label>
            <input type="text" value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Driver ka naam" style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Trip Date</label>
            <input type="date" value={tripDate} onChange={e => setTripDate(e.target.value)} style={inputStyle} required />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>From (Kahan se)</label>
            <input type="text" value={fromLocation} onChange={e => setFromLocation(e.target.value)} placeholder="Origin City" style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>To (Kahan tak)</label>
            <input type="text" value={toLocation} onChange={e => setToLocation(e.target.value)} placeholder="Destination City" style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Freight Amount (₹) *</label>
            <input type="number" value={freightAmount} onChange={e => setFreightAmount(e.target.value)} placeholder="Total Bhada" style={inputStyle} required />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Advance Paid (₹)</label>
            <input type="number" value={advancePaid} onChange={e => setAdvancePaid(e.target.value)} placeholder="Pesgi Rakam" style={inputStyle} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Remarks / Material Details</label>
            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Goods description or notes..." style={inputStyle} />
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '6px' }}>
            <button type="submit" style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
              💾 Save Transport Trip & LR
            </button>
          </div>
        </form>
      </div>

      {/* Trips Table List */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#334155' }}>Recorded Trips & Freight ({selectedFY})</h4>
        {trips.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', fontSize: '12px' }}>Koi trip record darj nahi hai.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '8px' }}>Date / LR</th>
                  <th style={{ padding: '8px' }}>Vehicle / Driver</th>
                  <th style={{ padding: '8px' }}>Route</th>
                  <th style={{ padding: '8px' }}>Freight</th>
                  <th style={{ padding: '8px' }}>Advance</th>
                  <th style={{ padding: '8px' }}>Balance</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {trips.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px' }}>{t.tripDate}<br /><strong>{t.lrNo}</strong></td>
                    <td style={{ padding: '8px' }}>{t.vehicleNo}<br /><span style={{ color: '#64748b' }}>{t.driverName}</span></td>
                    <td style={{ padding: '8px' }}>{t.fromLocation} → {t.toLocation}</td>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: '#0369a1' }}>₹{t.freightAmount}</td>
                    <td style={{ padding: '8px', color: '#166534' }}>₹{t.advancePaid}</td>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: '#b91c1c' }}>₹{t.balanceDue}</td>
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

const inputStyle = {
  width: '100%',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '12px',
  boxSizing: 'border-box',
  marginTop: '4px'
};
