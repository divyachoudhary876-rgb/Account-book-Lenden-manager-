// frontend/src/components/AccountStatementView.jsx

import React, { useState } from 'react';
import { downloadElementAsPDF } from '../utils/pdfDownloadEngine';

export default function AccountStatementView({ firm }) {
  const [selectedLedger, setSelectedLedger] = useState({ name: 'Krishan_Padgad', opening_balance: 0 });
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePDFDownload = async () => {
    setIsGenerating(true);
    await downloadElementAsPDF('printable-ledger-sheet', selectedLedger.name);
    setIsGenerating(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Dynamic PDF Trigger Button */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>📖 General Ledger Statement Milan</h3>
        
        <button 
          onClick={handlePDFDownload}
          disabled={isGenerating}
          style={{ 
            width: '100%', 
            backgroundColor: isGenerating ? '#94a3b8' : '#10b981', 
            color: '#ffffff', 
            border: 'none', 
            padding: '12px', 
            borderRadius: '8px', 
            fontWeight: 'bold', 
            fontSize: '14px', 
            cursor: isGenerating ? 'wait' : 'pointer'
          }}
        >
          {isGenerating ? '⏳ Generating PDF Document...' : '📲 Download & Share PDF (WhatsApp / Local Save)'}
        </button>
      </div>

      {/* Printable Ledger Element View */}
      <div id="printable-ledger-sheet" style={{ border: '1px solid #cbd5e1', padding: '20px', borderRadius: '8px', backgroundColor: '#ffffff' }}>
        <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '12px', textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#0f172a' }}>{firm?.legal_name || 'My Business Firm'}</div>
          <div style={{ fontSize: '11px', color: '#475569' }}>GSTIN: {firm?.gstin || 'Unregistered'}</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '6px', color: '#2563eb' }}>GENERAL LEDGER STATEMENT</div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ border: '1px solid #0f172a', padding: '7px', textAlign: 'left' }}>Date</th>
              <th style={{ border: '1px solid #0f172a', padding: '7px', textAlign: 'left' }}>Particulars</th>
              <th style={{ border: '1px solid #0f172a', padding: '7px', textAlign: 'right' }}>Debit (₹)</th>
              <th style={{ border: '1px solid #0f172a', padding: '7px', textAlign: 'right' }}>Credit (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #cbd5e1', padding: '7px' }}>2026-08-01</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '7px' }}>Opening Balance B/F</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '7px', textAlign: 'right' }}>₹0.00</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '7px', textAlign: 'right' }}>-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
