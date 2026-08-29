// frontend/src/components/DataPurgeView.jsx

import React, { useState } from 'react';
import { purgeDemoData } from '../utils/systemResetEngine';

export default function DataPurgeView() {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClearDemoData = () => {
    const isConfirmed = window.confirm(
      "⚠️ Attention: Purge All Demo Data?\n\nIs action se pehle ke sabhi Sample Accounts, Demo Vouchers, aur Dummy Invoices permanent delete ho jayenge aur Dashboard reset ho jayega.\n\nKya aap aage badhna chahte hain?"
    );

    if (isConfirmed) {
      setIsProcessing(true);
      setTimeout(() => {
        const result = purgeDemoData();
        setIsProcessing(false);
        if (result.success) {
          alert("✓ Demo Data Clear Ho Gaya! Ab aap jo nayi entry karenge, sirf wahi Dashboard aur Ledgers me dikhegi.");
          window.location.reload();
        } else {
          alert(`❌ Reset Error: ${result.message}`);
        }
      }, 500);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: '36px', marginBottom: '8px' }}>🗑️</div>
      <h3 style={{ margin: '0 0 10px 0', color: '#dc2626' }}>Clear Demo Data & Reset Dashboard</h3>
      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
        Dashboard par purana sample test data clear karne ke liye niche button par click karein. Clearing ke baad aapki Firm Profile surakshit rahegi aur naye real entries real-time calculate honge.
      </p>

      <button
        onClick={handleClearDemoData}
        disabled={isProcessing}
        style={{
          backgroundColor: isProcessing ? '#94a3b8' : '#dc2626',
          color: '#ffffff',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          fontWeight: 'bold',
          fontSize: '14px',
          cursor: isProcessing ? 'wait' : 'pointer',
          transition: 'background-color 0.2s ease'
        }}
      >
        {isProcessing ? '⏳ Clearing System Data...' : '⚠️ Clear Demo Data Now'}
      </button>
    </div>
  );
}
