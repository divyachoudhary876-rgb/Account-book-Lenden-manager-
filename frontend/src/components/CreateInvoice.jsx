// frontend/src/components/CreateInvoice.jsx

import React, { useState, useEffect } from 'react';
import { getStockItemsByFirm, recordMultiItemSale } from '../utils/stockInventoryEngine.js';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import { generateProfessionalInvoicePDF } from '../utils/pdfDownloadEngine.js';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';

export default function CreateInvoice({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';

  const [stockList, setStockList] = useState([]);
  const [partyAccounts, setPartyAccounts] = useState([]);
  const [invoiceHistory, setInvoiceHistory] = useState([]);

  // Invoice Header
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [selectedParty, setSelectedParty] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [status, setStatus] = useState(null);

  // Dynamic Multi-Item Rows
  const [invoiceLines, setInvoiceLines] = useState([
    { id: 1, item_name: '', quantity: '', rate: '', hsn: '6901' }
  ]);

  const loadData = () => {
    const items = getStockItemsByFirm(activeFirmId);
    setStockList(items);

    const accs = getFirmMasterAccounts(activeFirmId);
    setPartyAccounts(accs);

    if (accs.length > 0 && !selectedParty) {
      const defaultParty = accs.find(a => a.primary_type === 'ASSETS' && a.sub_group?.toLowerCase().includes('debtor')) || accs[0];
      setSelectedParty(defaultParty.account_name);
    }

    if (items.length > 0 && !invoiceLines[0].item_name) {
      setInvoiceLines([{
        id: 1,
        item_name: items[0].item_name,
        quantity: '1000',
        rate: (items[0].selling_price || 0).toString(),
        hsn: items[0].hsn || '6901'
      }]);
    }

    const historyKey = `app_sales_invoices_${activeFirmId}`;
    const raw = localStorage.getItem(historyKey);
    if (raw) {
      setInvoiceHistory(JSON.parse(raw).reverse());
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('stock_updated', loadData);
    window.addEventListener('app_state_updated', loadData);
    return () => {
      window.removeEventListener('stock_updated', loadData);
      window.removeEventListener('app_state_updated', loadData);
    };
  }, [activeFirmId]);

  // Handle Dynamic Rows
  const handleItemSelect = (lineId, itemName) => {
    const found = stockList.find(s => s.item_name === itemName);
    setInvoiceLines(prev => prev.map(line => {
      if (line.id === lineId) {
        return {
          ...line,
          item_name: itemName,
          rate: found?.selling_price ? found.selling_price.toString() : line.rate,
          hsn: found?.hsn || '6901'
        };
      }
      return line;
    }));
  };

  const handleLineValueChange = (lineId, field, value) => {
    setInvoiceLines(prev => prev.map(line => line.id === lineId ? { ...line, [field]: value } : line));
  };

  const addLine = () => {
    const fallbackItem = stockList[0]?.item_name || '';
    const fallbackRate = stockList[0]?.selling_price?.toString() || '0';
    setInvoiceLines(prev => [
      ...prev,
      { id: Date.now(), item_name: fallbackItem, quantity: '', rate: fallbackRate, hsn: stockList[0]?.hsn || '6901' }
    ]);
  };

  const removeLine = (lineId) => {
    if (invoiceLines.length <= 1) {
      alert('Kam se kam ek item line anivarya hai.');
      return;
    }
    setInvoiceLines(prev => prev.filter(line => line.id !== lineId));
  };

  // Calculations
  const subTotal = invoiceLines.reduce((sum, line) => {
    const q = parseFloat(line.quantity || 0);
    const r = parseFloat(line.rate || 0);
    return sum + (q * r);
  }, 0);

  const cgst = subTotal * 0.025;
  const sgst = subTotal * 0.025;
  const grandTotal = subTotal + cgst + sgst;

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus(null);

    try {
      const saved = recordMultiItemSale(activeFirmId, {
        invoice_no: invoiceNo,
        invoice_date: invoiceDate,
        customer_name: selectedParty,
        customer_phone: customerPhone,
        vehicle_no: vehicleNo,
        items: invoiceLines.map(l => ({
          item_name: l.item_name,
          quantity: parseFloat(l.quantity || 0),
          rate: parseFloat(l.rate || 0),
          hsn: l.hsn || '6901'
        }))
      });

      setStatus({
        type: 'success',
        text: `✓ Multi-Item Invoice ${invoiceNo} Generated! Total: ₹${grandTotal.toLocaleString('en-IN')}`
      });

      generateProfessionalInvoicePDF(saved, firm);

      // Reset form
      setInvoiceNo(`INV-${Date.now().toString().slice(-6)}`);
      setVehicleNo('');
      loadData();
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  // Direct WhatsApp Share Handler
  const handleShareWhatsApp = (inv) => {
    const phone = (inv.customer_phone || '').replace(/\D/g, '');
    const firmName = firm?.legal_name || 'Neelkanth Groups';
    
    let itemsText = '';
    if (Array.isArray(inv.items)) {
      itemsText = inv.items.map(it => `• ${it.item_name}: ${it.quantity} @ ₹${it.rate}`).join('\n');
    } else {
      itemsText = `• ${inv.item_name}: ${inv.quantity} @ ₹${inv.rate}`;
    }

    const message = 
      `*TAX INVOICE - ${firmName}*\n` +
      `--------------------------------\n` +
      `*Invoice No:* ${inv.invoice_no}\n` +
      `*Date:* ${inv.date}\n` +
      `*Billed To:* ${inv.party}\n` +
      (inv.vehicle_no ? `*Vehicle:* ${inv.vehicle_no}\n` : '') +
      `--------------------------------\n` +
      `*Items Dispatched:*\n${itemsText}\n` +
      `--------------------------------\n` +
      `*Total Amount:* ₹${parseFloat(inv.grand_total || inv.total || 0).toLocaleString('en-IN')}\n\n` +
      `_Dhanyawad! Kisi bhi jankari ke liye contact karein._`;

    const targetUrl = phone.length >= 10 
      ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(targetUrl, '_blank');
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
      
      {/* Header Banner */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🧾</span> Professional Multi-Item Sales Invoicing
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Negative Stock Prevention, Multi-Product Dispatch & WhatsApp Bill Sharing</span>
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
          fontWeight: 'bold',
          whiteSpace: 'pre-line'
        }}>
          {status.text}
        </div>
      )}

      {/* Main Entry Form */}
      <form onSubmit={handleSubmit} style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', display: 'grid', gap: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Invoice Date *</label>
            <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Invoice No *</label>
            <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} style={inputStyle} required />
          </div>
        </div>

        {/* Customer Dropdown with Search */}
        <SearchableAccountDropdown
          label="Customer / Debtor Party (ग्राहक) *"
          accounts={partyAccounts}
          value={selectedParty}
          onChange={val => setSelectedParty(val)}
          placeholder="Search customer name..."
          colorAccent="#0284c7"
          required
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Customer WhatsApp No (Optional)</label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Vehicle / Tractor No (गाड़ी नं.)</label>
            <input
              type="text"
              placeholder="e.g. RJ-31-GA-1234"
              value={vehicleNo}
              onChange={e => setVehicleNo(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Dynamic Multi-Item Table */}
        <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: '13px', color: '#0f172a' }}>📦 Items to Dispatch (माल की सूची)</strong>
            <button
              type="button"
              onClick={addLine}
              style={{ backgroundColor: '#0284c7', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              + Add Item Line
            </button>
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            {invoiceLines.map((line, idx) => {
              const stockInfo = stockList.find(s => s.item_name === line.item_name);
              const avail = stockInfo ? stockInfo.current_stock : 0;
              const isOverStock = stockInfo && !stockInfo.is_service && parseFloat(line.quantity || 0) > avail;

              return (
                <div 
                  key={line.id} 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1.5fr 1fr 1fr 32px', 
                    gap: '8px', 
                    alignItems: 'center',
                    backgroundColor: isOverStock ? '#fef2f2' : '#ffffff',
                    border: `1px solid ${isOverStock ? '#fca5a5' : '#cbd5e1'}`,
                    padding: '8px',
                    borderRadius: '8px'
                  }}
                >
                  <div>
                    <select
                      value={line.item_name}
                      onChange={e => handleItemSelect(line.id, e.target.value)}
                      style={{ ...inputStyle, padding: '7px', fontWeight: 'bold' }}
                      required
                    >
                      {stockList.map(s => (
                        <option key={s.id} value={s.item_name}>
                          {s.item_name} {s.is_service ? '(Service)' : `[Stock: ${s.current_stock} ${s.unit}]`}
                        </option>
                      ))}
                    </select>
                    {isOverStock && (
                      <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: 'bold', display: 'block', marginTop: '2px' }}>
                        ⚠️ Stock kam hai! Maujood: {avail} {stockInfo.unit}
                      </span>
                    )}
                  </div>

                  <input
                    type="number"
                    step="0.01"
                    placeholder="Qty"
                    value={line.quantity}
                    onChange={e => handleLineValueChange(line.id, 'quantity', e.target.value)}
                    style={{ ...inputStyle, padding: '7px', fontWeight: 'bold' }}
                    required
                  />

                  <input
                    type="number"
                    step="0.01"
                    placeholder="Rate ₹"
                    value={line.rate}
                    onChange={e => handleLineValueChange(line.id, 'rate', e.target.value)}
                    style={{ ...inputStyle, padding: '7px', fontWeight: 'bold' }}
                    required
                  />

                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    disabled={invoiceLines.length <= 1}
                    style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '6px', height: '34px', cursor: invoiceLines.length > 1 ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* Subtotals & Taxes Preview */}
          <div style={{ marginTop: '12px', borderTop: '1px dashed #cbd5e1', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Taxable: <strong>₹{subTotal.toFixed(2)}</strong> | CGST (2.5%): <strong>₹{cgst.toFixed(2)}</strong> | SGST (2.5%): <strong>₹{sgst.toFixed(2)}</strong>
            </div>
            <div>
              <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                Grand Total: ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>

        <button
          type="submit"
          style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' }}
        >
          📄 Post Multi-Item Sale & Print PDF
        </button>
      </form>

      {/* Created Invoices History with WhatsApp Button */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '12px' }}>
          📋 Invoices Register ({invoiceHistory.length})
        </strong>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {invoiceHistory.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
              No sales invoices generated yet.
            </div>
          ) : (
            invoiceHistory.map((inv) => (
              <div
                key={inv.id}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>{inv.invoice_no}</strong>
                    <span style={{ fontSize: '10px', color: '#64748b', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{inv.date}</span>
                    {inv.vehicle_no && <span style={{ fontSize: '10px', color: '#0284c7', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>🚛 {inv.vehicle_no}</span>}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }}>{inv.party}</div>
                  
                  {/* Items summary */}
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                    {Array.isArray(inv.items) ? (
                      inv.items.map(it => `${it.item_name} (${it.quantity})`).join(', ')
                    ) : (
                      `${inv.item_name} (${inv.quantity})`
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <strong style={{ fontSize: '15px', color: '#166534' }}>
                    ₹{parseFloat(inv.grand_total || inv.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </strong>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(inv)}
                      style={{ backgroundColor: '#25D366', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>💬</span> WhatsApp
                    </button>

                    <button
                      type="button"
                      onClick={() => generateProfessionalInvoicePDF(inv, firm)}
                      style={{ backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>🖨️</span> PDF
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#0f172a' };
