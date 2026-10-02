// frontend/src/components/CreateInvoice.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { loadFirmData } from '../utils/firmIsolationEngine';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';
import SearchableStockDropdown from './SearchableStockDropdown.jsx';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import { processSalesInvoicePosting, revertSalesStockOnDeletion } from '../utils/salesPostingEngine.js';

export default function CreateInvoice({ firm, onClose }) {
  const activeFirmId = firm?.id || firm?.firm_id || 'FIRM-001';
  const todayMaxDate = new Date().toISOString().split('T')[0];
  
  const [allItems, setAllItems] = useState([]);
  const [accountsList, setAccountsList] = useState([]);
  const [invoiceList, setInvoiceList] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [invoiceDate, setInvoiceDate] = useState(todayMaxDate);
  const [invoiceNo, setInvoiceNo] = useState('1');
  const [customerParty, setCustomerParty] = useState(''); 
  const [vehicleNo, setVehicleNo] = useState('');
  
  const [cart, setCart] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [gstRate, setGstRate] = useState('0');

  const [searchFilter, setSearchFilter] = useState('');
  const [feedback, setFeedback] = useState(null);

  const loadData = () => {
    try {
      const rawInventory = loadFirmData('inventory_items', firm, []);
      const validInventory = rawInventory.filter(i => i && (i.name || i.item_name));
      setAllItems(validInventory);

      const accList = getFirmMasterAccounts(activeFirmId) || [];
      setAccountsList(accList);

      const allVouchers = StorageService.getItem('account_book_vouchers') || [];
      const salesInvoices = allVouchers.filter(v => v && (v.firm_id === activeFirmId || v.firm_id === 'FIRM-001') && (v.voucher_type === 'SALES' || v.type === 'SALES'));
      
      salesInvoices.sort((a, b) => new Date(b.voucher_date || b.date || 0) - new Date(a.voucher_date || a.date || 0));
      setInvoiceList(salesInvoices);

      if (!editingId) {
        const nextNum = salesInvoices.length + 1;
        setInvoiceNo(String(nextNum));
      }
    } catch (err) {
      console.error("Error loading invoice data:", err);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_state_updated', loadData);
    window.addEventListener('app_storage_updated', loadData);
    return () => {
      window.removeEventListener('app_state_updated', loadData);
      window.removeEventListener('app_storage_updated', loadData);
    };
  }, [firm, activeFirmId]);

  const handleAddToCart = () => {
    if (!selectedItemId || !quantity || !rate) return alert('Kripya item, matra aur rate darj karein.');
    
    const itemObj = allItems.find(i => 
      String(i.id || i.item_id) === String(selectedItemId) || 
      String(i.item_name || i.name || '').trim().toLowerCase() === String(selectedItemId).trim().toLowerCase()
    );
    
    if (!itemObj) return alert('Chayanit item nahi mila.');

    const qty = Number(quantity);
    const rt = Number(rate);
    const baseAmount = qty * rt;
    const gRate = Number(gstRate);
    
    const taxAmount = baseAmount * (gRate / 100);
    const totalWithTax = baseAmount + taxAmount;
    const cleanItemName = itemObj.item_name || itemObj.name || 'Stock Item';
    const cleanUnit = itemObj.unit || 'Pcs';

    setCart([...cart, {
      id: Date.now(),
      itemId: selectedItemId,
      itemName: cleanItemName,
      unit: cleanUnit,
      qty,
      rate: rt,
      gstRate: gRate,
      taxableAmount: baseAmount,
      cgst: taxAmount / 2,
      sgst: taxAmount / 2,
      total: totalWithTax,
      isService: itemObj.item_type === 'SERVICE' || String(cleanItemName).toLowerCase().includes('freight')
    }]);

    setSelectedItemId(''); setQuantity(''); setRate('');
  };

  const removeCartItem = (id) => setCart(cart.filter(c => c.id !== id));

  const totalTaxable = cart.reduce((sum, i) => sum + (i.taxableAmount || 0), 0);
  const totalCgst = cart.reduce((sum, i) => sum + (i.cgst || 0), 0);
  const totalSgst = cart.reduce((sum, i) => sum + (i.sgst || 0), 0);
  const grandTotal = totalTaxable + totalCgst + totalSgst;

  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback(null);
    if (!customerParty) return alert('Kripya customer ya supplier party chunein!');
    if (cart.length === 0) return alert('Kam se kam ek item bill mein jodein.');

    try {
      if (editingId) {
        revertSalesStockOnDeletion(editingId, activeFirmId);
      }

      const invoicePayload = {
        id: editingId || `INV-${Date.now()}`,
        firmId: activeFirmId,
        customer_id: customerParty,
        invoiceDate: invoiceDate,
        taxable_amount: totalTaxable,
        gstRate: Number(gstRate),
        gst_amount: totalCgst + totalSgst,
        reference_no: invoiceNo,
        vehicle_no: vehicleNo,
        narration: `Sales Invoice ${invoiceNo} to ${customerParty} - Vehicle: ${vehicleNo}`,
        items: cart.map(c => ({
          itemId: c.itemId,
          itemName: c.itemName,
          unit: c.unit,
          quantity: c.qty,
          rate: c.rate,
          gstRate: c.gstRate,
          taxableAmount: c.taxableAmount,
          cgst: c.cgst,
          sgst: c.sgst,
          total: c.total
        }))
      };

      processSalesInvoicePosting(invoicePayload, activeFirmId);

      setFeedback({ type: 'success', message: editingId ? '✓ Invoice Updated Successfully & Stock Adjusted!' : '✓ Invoice Generated, Saved & Stock Deducted!' });
      loadData();

      setEditingId(null);
      setCart([]);
      setCustomerParty('');
      setVehicleNo('');
      setInvoiceNo(String(invoiceList.length + 2));

    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleEdit = (inv) => {
    if (!inv) return;
    setEditingId(inv.id);
    setInvoiceDate(inv.voucher_date || inv.date || todayMaxDate);
    setInvoiceNo(inv.reference_no || '');
    setCustomerParty(inv.dr_account || '');
    setVehicleNo(inv.vehicle_no || '');
    
    const safeCart = (inv.items || []).map((ci, index) => ({
      id: ci.id || (Date.now() + index),
      itemId: ci.itemId || ci.item_id || ci.product_id || '',
      itemName: ci.itemName || ci.name || ci.item_name || 'Item',
      unit: ci.unit || 'Pcs',
      qty: Number(ci.quantity || ci.qty || 0),
      rate: Number(ci.rate || 0),
      gstRate: Number(ci.gstRate || 0),
      taxableAmount: Number(ci.taxableAmount || (Number(ci.quantity || ci.qty || 0) * Number(ci.rate || 0))),
      cgst: Number(ci.cgst || 0),
      sgst: Number(ci.sgst || 0),
      total: Number(ci.total || (Number(ci.quantity || ci.qty || 0) * Number(ci.rate || 0)))
    }));

    setCart(safeCart);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (invId, invNo) => {
    if (!window.confirm(`Invoice #${invNo} ko delete karne se stock vapas jud jayega. Jari rakhein?`)) return;

    try {
      revertSalesStockOnDeletion(invId, activeFirmId);

      const vouchers = StorageService.getItem('account_book_vouchers') || [];
      const filteredVouchers = vouchers.filter(v => v && v.id !== invId && v.reference_no !== invId);
      StorageService.setItem('account_book_vouchers', filteredVouchers);
      StorageService.setItem(`account_book_vouchers_${activeFirmId}`, filteredVouchers);

      const invoices = StorageService.getItem(`app_invoices_${activeFirmId}`) || StorageService.getItem('app_invoices') || [];
      const filteredInvoices = invoices.filter(i => i && i.id !== invId && i.invoice_number !== invId);
      StorageService.setItem(`app_invoices_${activeFirmId}`, filteredInvoices);
      StorageService.setItem('app_invoices', filteredInvoices);

      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      loadData();

      if (editingId === invId) {
        setEditingId(null); setCart([]); setCustomerParty(''); setVehicleNo('');
      }
      alert('✓ Invoice deleted & stock successfully restored.');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handlePrint = (inv) => {
    if (!inv) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('Popup blocked! Please allow popups for printing.');

    const firmName = (firm && (firm.name || firm.legal_name)) ? (firm.name || firm.legal_name) : 'Neelkanth Groups';
    const refNo = inv.reference_no ? inv.reference_no : '';
    const vDate = inv.voucher_date ? inv.voucher_date : '';
    const customer = inv.dr_account ? inv.dr_account : '';
    const vehicle = inv.vehicle_no ? inv.vehicle_no : '';
    const totalTaxableVal = Number(inv.total_taxable ? inv.total_taxable : 0).toFixed(2);
    const grandAmount = Number(inv.amount ? inv.amount : 0).toFixed(2);

    const itemsHtml = (inv.items ? inv.items : []).map(i => {
      const name = i.itemName ? i.itemName : 'Item';
      const qty = i.qty || i.quantity || 0;
      const unit = i.unit ? i.unit : 'Pcs';
      const rate = Number(i.rate ? i.rate : 0).toFixed(2);
      const gst = i.gstRate ? i.gstRate : 0;
      const total = Number(i.total ? i.total : 0).toFixed(2);
      return `<tr>
        <td><strong>${name}</strong></td>
        <td class="text-right">${qty} ${unit}</td>
        <td class="text-right">${rate}</td>
        <td class="text-right">${gst}%</td>
        <td class="text-right"><strong>${total}</strong></td>
      </tr>`;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice #${refNo}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #0f172a; background: #fff; }
            .invoice-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; }
            .invoice-header h2 { margin: 0; font-size: 22px; font-weight: 800; }
            .invoice-header p { margin: 4px 0 0 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; }
            .meta-box { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 12px; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            th { background: #f1f5f9; color: #334155; font-weight: 700; text-align: left; padding: 10px; border: 1px solid #cbd5e1; }
            td { padding: 10px; border: 1px solid #cbd5e1; }
            .text-right { text-align: right; }
            .totals { margin-top: 20px; text-align: right; font-size: 13px; line-height: 1.6; }
            .grand-total { font-size: 16px; font-weight: 800; color: #047857; border-top: 2px solid #0f172a; padding-top: 6px; display: inline-block; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <h2>${firmName}</h2>
            <p>TAX INVOICE (GST Compliant)</p>
          </div>
          
          <div class="meta-box">
            <div>
              <strong>Invoice No:</strong> ${refNo}<br/>
              <strong>Date:</strong> ${vDate}
              ${vehicle ? `<br/><strong>Vehicle:</strong> ${vehicle}` : ''}
            </div>
            <div style="text-align: right;">
              <strong>Customer / Party:</strong><br/>
              <span style="font-size: 14px; font-weight: bold;">${customer}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item Description</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Rate (₹)</th>
                <th class="text-right">GST Slab</th>
                <th class="text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div>Taxable Amount: ₹${totalTaxableVal}</div>
            <div>
              <span class="grand-total">Grand Total: ₹${grandAmount}</span>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const filteredInvoices = invoiceList.filter(v => {
    if (!v) return false;
    const q = (searchFilter || '').toLowerCase();
    return (
      (v.reference_no && v.reference_no.toLowerCase().includes(q)) ||
      (v.dr_account && v.dr_account.toLowerCase().includes(q)) ||
      (v.narration && v.narration.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', color: '#0f172a' }}>
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', boxSizing: 'border-box', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
            {editingId ? '✏ Edit GST Sales Invoice' : '📄 Multi-Item GST Invoicing'}
          </h2>
          {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Close</button>}
        </div>
        
        {feedback && <div style={{ padding: '10px 14px', marginBottom: '14px', borderRadius: '8px', backgroundColor: '#f0fdf4', color: '#166534', fontWeight: '700', fontSize: '12px', border: '1px solid #bbf7d0' }}>{feedback.message}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>Invoice Date *</label>
              <input 
                type="date" 
                max={todayMaxDate}
                value={invoiceDate} 
                onChange={e => setInvoiceDate(e.target.value)} 
                style={inputStyle} 
                required 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>Invoice No *</label>
              <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} style={inputStyle} required />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <SearchableAccountDropdown
              label="Customer / Supplier Party *"
              accounts={accountsList}
              value={customerParty}
              onChange={val => setCustomerParty(val)}
              placeholder="Search customer or supplier account..."
              colorAccent="#0284c7"
              required
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>Vehicle / Tractor No (Optional)</label>
            <input type="text" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="e.g. RJ-31-GA-1234" style={inputStyle} />
          </div>

          <div style={{ backgroundColor: '#f1f5f9', padding: '14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <SearchableStockDropdown 
                  firm={firm}
                  label="Select Stock Item *"
                  value={selectedItemId}
                  onChange={val => setSelectedItemId(val)}
                  placeholder="-- Choose Stock Item --"
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>Qty</label>
                  <input type="number" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} style={inputStyle} placeholder="0" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>Rate (₹)</label>
                  <input type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} style={inputStyle} placeholder="0.00" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>GST Slab</label>
                  <select value={gstRate} onChange={e => setGstRate(e.target.value)} style={inputStyle}>
                    <option value="0">0% (Nil)</option>
                    <option value="5">5% (Bricks/Coal)</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              <button type="button" onClick={handleAddToCart} style={{ padding: '10px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>
                + Add Item to Cart
              </button>
            </div>

            {cart.length > 0 && (
              <div style={{ marginTop: '14px' }}>
                {cart.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed #cbd5e1' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }}>{c.itemName} ({c.gstRate}% GST)</span>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>Qty: {c.qty} {c.unit} @ ₹{c.rate}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }}>₹{c.total.toFixed(2)}</span>
                      <button type="button" onClick={() => removeCartItem(c.id)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '14px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#475569' }}>Grand Total (Inc. Tax):</span>
            <span style={{ fontSize: '16px', fontWeight: '900', color: '#059669' }}>₹{grandTotal.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '12px' }}>
              {editingId ? '✓ Update Invoice & Stock' : '💾 Save Invoice & Deduct Stock'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setCart([]); setCustomerParty(''); setVehicleNo(''); }} style={{ padding: '12px 14px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Saved Invoices Register with Scrollable Container */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>📜 Recent Sales Invoices ({filteredInvoices.length})</h3>
          <input 
            type="text" 
            placeholder="Search invoice or party..." 
            value={searchFilter} 
            onChange={e => setSearchFilter(e.target.value)} 
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', outline: 'none', width: '180px' }} 
          />
        </div>

        {filteredInvoices.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', fontSize: '11px' }}>No sales invoices found.</div>
        ) : (
          <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredInvoices.map(inv => {
              const itemsList = inv.items || [];
              return (
                <div key={inv.id} style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>#{inv.reference_no} — {inv.dr_account}</div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Date: {inv.voucher_date}</div>
                    
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#334155' }}>
                      {itemsList.map((it, idx) => (
                        <div key={idx} style={{ fontWeight: '600' }}>
                          • {it.itemName || it.name || it.item_name || 'Item'} — Qty: <span style={{ color: '#0284c7' }}>{it.qty || it.quantity} {it.unit || 'Pcs'}</span> @ ₹{Number(it.rate || 0).toFixed(2)}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: '#059669' }}>₹{(inv.amount || 0).toFixed(2)}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => handlePrint(inv)} style={{ padding: '4px 8px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>Print</button>
                      <button onClick={() => handleEdit(inv)} style={{ padding: '4px 8px', backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>Edit</button>
                      <button onClick={() => handleDelete(inv.id, inv.reference_no)} style={{ padding: '4px 8px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '9px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '12px',
  boxSizing: 'border-box',
  outline: 'none',
  backgroundColor: '#fff',
  color: '#0f172a'
};
