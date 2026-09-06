import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { useItemMaster } from '../hooks/useItemMaster';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';

export default function CreateInvoice({ firm, onClose }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const allItems = useItemMaster(); 
  const [accountsList, setAccountsList] = useState([]);

  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState(`INV-${Math.floor(Date.now() / 1000)}`);
  const [customerParty, setCustomerParty] = useState(''); 
  const [vehicleNo, setVehicleNo] = useState('');
  
  const [cart, setCart] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');

  // Invoice Print Preview Modal State
  const [completedInvoice, setCompletedInvoice] = useState(null);

  useEffect(() => {
    const loadAccs = () => {
      const accList = getFirmMasterAccounts(activeFirmId) || [];
      setAccountsList(accList);
    };
    loadAccs();
    window.addEventListener('app_state_updated', loadAccs);
    return () => window.removeEventListener('app_state_updated', loadAccs);
  }, [activeFirmId]);

  const handleAddToCart = () => {
    if (!selectedItemId || !quantity || !rate) return alert('कृपया आइटम, मात्रा और रेट दर्ज करें।');
    const itemObj = allItems.find(i => String(i.id) === String(selectedItemId));
    if (!itemObj) return;

    setCart([...cart, {
      id: Date.now(),
      itemId: selectedItemId,
      itemName: itemObj.item_name,
      unit: itemObj.unit || 'Pcs',
      qty: Number(quantity),
      rate: Number(rate),
      total: Number(quantity) * Number(rate),
      isService: itemObj.item_type === 'SERVICE' || String(itemObj.item_name).toLowerCase().includes('freight')
    }]);
    setSelectedItemId(''); setQuantity(''); setRate('');
  };

  const removeCartItem = (id) => setCart(cart.filter(c => c.id !== id));

  const taxableAmount = cart.reduce((sum, i) => sum + i.total, 0);
  const cgst = taxableAmount * 0.025; 
  const sgst = taxableAmount * 0.025; 
  const grandTotal = taxableAmount + cgst + sgst;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerParty) return alert('कृपया कस्टमर पार्टी चुनें!');
    if (cart.length === 0) return alert('कम से कम एक आइटम बिल में जोड़ें।');

    try {
      // 1. Update Inventory Stock Atomically
      const currentInventory = StorageService.getInventoryItems() || [];
      const updatedInventory = currentInventory.map(invItem => {
        const cartItem = cart.find(c => String(c.itemId) === String(invItem.id));
        if (cartItem && !cartItem.isService) {
          return { ...invItem, current_stock: Number(invItem.current_stock || 0) - cartItem.qty };
        }
        return invItem;
      });
      StorageService.setItem('inventory_items', updatedInventory);

      // 2. Save Voucher in Ledger
      const vouchers = StorageService.getVouchers() || [];
      const newVoucher = {
        id: `INV-${Date.now()}`,
        firm_id: activeFirmId,
        voucher_date: invoiceDate,
        voucher_type: 'SALES',
        dr_account: customerParty,
        cr_account: 'Sales & Revenue',
        amount: grandTotal,
        reference_no: invoiceNo,
        narration: `Sales Invoice ${invoiceNo} to ${customerParty} - Vehicle: ${vehicleNo}`,
        items: cart,
        created_at: new Date().toISOString()
      };
      StorageService.setItem('account_book_vouchers', [newVoucher, ...vouchers]);

      // 3. Trigger Professional Invoice Preview
      setCompletedInvoice({
        firmName: firm?.name || 'Neelkanth Udyog',
        invoiceNo,
        invoiceDate,
        customerParty,
        vehicleNo,
        cart,
        taxableAmount,
        cgst,
        sgst,
        grandTotal
      });

    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Print/Download Handler
  const handlePrintInvoice = () => {
    window.print();
  };

  // Reset for next invoice
  const handleNewInvoice = () => {
    setCompletedInvoice(null);
    setCart([]);
    setCustomerParty('');
    setVehicleNo('');
    setInvoiceNo(`INV-${Math.floor(Date.now() / 1000)}`);
  };

  // IF INVOICE GENERATED: SHOW PROFESSIONAL PRINT PREVIEW MODAL
  if (completedInvoice) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          
          {/* Action Header (Hidden during print) */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <button onClick={handleNewInvoice} style={{ padding: '8px 16px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>← Back / New Bill</button>
            <button onClick={handlePrintInvoice} style={{ padding: '8px 20px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>🖨️ Print / Save PDF</button>
          </div>

          {/* Tax Invoice Document Body */}
          <div id="printable-invoice">
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h1 style={{ margin: 0, fontSize: '22px', color: '#0f172a' }}>{completedInvoice.firmName}</h1>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>ORIGINAL FOR RECIPIENT | TAX INVOICE</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '13px', borderBottom: '2px solid #0f172a', paddingBottom: '12px' }}>
              <div>
                <strong>Billed To:</strong>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', marginTop: '2px' }}>{completedInvoice.customerParty}</div>
                {completedInvoice.vehicleNo && <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>Vehicle No: {completedInvoice.vehicleNo}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div><strong>Invoice No:</strong> {completedInvoice.invoiceNo}</div>
                <div style={{ marginTop: '2px' }}><strong>Date:</strong> {completedInvoice.invoiceDate}</div>
              </div>
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>#</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Item Description</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Qty</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Rate (₹)</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {completedInvoice.cart.map((c, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px' }}>{idx + 1}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{c.itemName}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>{c.qty} {c.unit}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>{c.rate.toFixed(2)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{c.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Section */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
              <div style={{ width: '260px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Taxable Amount:</span>
                  <span>₹{completedInvoice.taxableAmount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>CGST (2.5%):</span>
                  <span>₹{completedInvoice.cgst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px' }}>
                  <span>SGST (2.5%):</span>
                  <span>₹{completedInvoice.sgst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '900', color: '#047857', marginTop: '4px' }}>
                  <span>Grand Total:</span>
                  <span>₹{completedInvoice.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '50px', fontSize: '12px', borderTop: '1px solid #cbd5e1', paddingTop: '15px' }}>
              <div>Receiver's Signature</div>
              <div style={{ textAlign: 'right' }}>For {completedInvoice.firmName}<br/><br/>Authorised Signatory</div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // REGULAR INVOICE CREATION FORM
  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>📄 Multi-Item Sales Invoicing</h2>
          {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Close</button>}
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Invoice Date *</label>
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Invoice No *</label>
              <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <SearchableAccountDropdown
              label="Customer / Debtor Party **"
              accounts={accountsList}
              value={customerParty}
              onChange={val => setCustomerParty(val)}
              placeholder="Search customer account..."
              colorAccent="#0284c7"
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Vehicle / Tractor No (Optional)</label>
            <input type="text" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="e.g. RJ-31-GA-1234" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
          </div>

          <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Select Stock Item</label>
                <select value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #eab308', boxSizing: 'border-box', backgroundColor: '#fff', outline: 'none' }}>
                  <option value="">-- Choose Stock Item --</option>
                  {allItems.map(item => (
                    <option key={item.id} value={item.id}>{item.item_name} [Stock: {item.current_stock || 0} {item.unit}]</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Qty</label>
                  <input type="number" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} placeholder="0" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Rate</label>
                  <input type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} placeholder="0.00" />
                </div>
                <button type="button" onClick={handleAddToCart} style={{ padding: '0 16px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', height: '42px', whiteSpace: 'nowrap' }}>
                  + Add
                </button>
              </div>
            </div>

            {cart.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                {cart.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed #cbd5e1' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>{c.itemName}</span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Qty: {c.qty} {c.unit} @ ₹{c.rate}</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>
                      ₹{c.total.toFixed(2)} 
                      <button type="button" onClick={() => removeCartItem(c.id)} style={{ color: '#ef4444', border: 'none', background: 'none', marginLeft: '12px', cursor: 'pointer', fontWeight: 'bold', padding: '4px' }}>X</button>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '13px', backgroundColor: '#e2e8f0', padding: '10px', borderRadius: '6px' }}>
                  <div>
                    <div>Taxable: ₹{taxableAmount.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: '#475569' }}>CGST: ₹{cgst.toFixed(2)} | SGST: ₹{sgst.toFixed(2)}</div>
                  </div>
                  <div style={{ fontWeight: '900', fontSize: '16px', color: '#047857' }}>₹{grandTotal.toFixed(2)}</div>
                </div>
              </div>
            )}
          </div>

          <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 6px rgba(29, 78, 216, 0.2)' }}>
            📄 Post Multi-Item Sale & View Invoice
          </button>
        </form>
      </div>
    </div>
  );
}
