import React, { useState } from 'react';

export default function FinancialReportsView() {
  const [reportType, setReportType] = useState('pl');
  const [reportData, setReportData] = useState(null);
  const [dates, setDates] = useState({ start_date: '2026-04-01', end_date: '2026-08-31', as_of_date: '2026-08-31' });

  const fetchReport = async () => {
    let url = '';
    if (reportType === 'pl') {
      url = `/api/reports/profit-and-loss?start_date=${dates.start_date}&end_date=${dates.end_date}`;
    } else {
      url = `/api/reports/balance-sheet?as_of_date=${dates.as_of_date}`;
    }

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    if (data.success) setReportData(data);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <h2>Financial Statements & Reports</h2>
      
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button onClick={() => setReportType('pl')} style={{ padding: '8px 16px', background: reportType === 'pl' ? '#007bff' : '#eee', color: reportType === 'pl' ? '#fff' : '#000' }}>
          Profit & Loss Statement
        </button>
        <button onClick={() => setReportType('bs')} style={{ padding: '8px 16px', background: reportType === 'bs' ? '#007bff' : '#eee', color: reportType === 'bs' ? '#fff' : '#000' }}>
          Balance Sheet
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {reportType === 'pl' ? (
          <>
            <input type="date" value={dates.start_date} onChange={e => setDates({...dates, start_date: e.target.value})} />
            <input type="date" value={dates.end_date} onChange={e => setDates({...dates, end_date: e.target.value})} />
          </>
        ) : (
          <input type="date" value={dates.as_of_date} onChange={e => setDates({...dates, as_of_date: e.target.value})} />
        )}
        <button onClick={fetchReport} style={{ background: '#28a745', color: '#fff', border: 'none', padding: '8px 16px' }}>Generate Report</button>
      </div>

      {reportData && reportType === 'pl' && (
        <div style={{ border: '1px solid #ccc', padding: '16px', borderRadius: '4px' }}>
          <h3>Profit & Loss Summary</h3>
          <p>Total Revenue/Income: ₹{reportData.summary.total_income}</p>
          <p>Total Expenses: ₹{reportData.summary.total_expense}</p>
          <hr />
          <h4>Net Profit / Loss: ₹{reportData.summary.net_profit}</h4>
        </div>
      )}

      {reportData && reportType === 'bs' && (
        <div style={{ border: '1px solid #ccc', padding: '16px', borderRadius: '4px' }}>
          <h3>Balance Sheet (As of {reportData.as_of_date})</h3>
          <p>Status: {reportData.is_balanced ? ' Balanced (Assets = Liabilities + Equity)' : ' Unbalanced'}</p>
          <p>Total Assets: ₹{reportData.totals.total_assets}</p>
          <p>Total Liabilities: ₹{reportData.totals.total_liabilities}</p>
          <p>Total Equity: ₹{reportData.totals.total_equity}</p>
        </div>
      )}
    </div>
  );
}
