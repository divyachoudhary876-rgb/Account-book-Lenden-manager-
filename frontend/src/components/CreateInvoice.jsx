// frontend/src/components/CreateInvoice.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { useItemMaster } from '../hooks/useItemMaster';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';

export default function CreateInvoice({ firm, onClose }) {
  const activeFirmId = firm?.id || firm?.firm_id || 'FIRM-001';
  const todayMaxDate = new Date().toISOString().split('T')[0];
  
  let allItems = [];
  try {
    allItems = useItemMaster() || [];
  } catch (e) {
    allItems = [];
  }

  const [accountsList, setAccountsList] = useState([]);
  const [invoiceList, setInvoiceList] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [invoiceDate, setInvoiceDate] = useState(todayMaxDate);
  const [invoiceNo, setInvoiceNo] = useState(`INV-${Math.floor(Date.now() / 1000)}`);
  const [customerParty, setCustomerParty] = useState(''); 
  const [vehicleNo, setVehicleNo] = useState('');
  
  const [cart, setCart] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [gstRate, setGstRate] = useState('5');

  const [searchFilter, setSearchFilter] = useState('');
  const [feedback, setFeedback] = useState(null);

  const loadData = () => {
    try {
      const accList = getFirmMasterAccounts(activeFirmId) || [];
      setAccountsList(accList);

      const allVouchers = StorageService.getItem('account_book_vouchers') || [];
      const salesInvoices = allVouchers.filter(v => v && (v.firm_id === activeFirmId || v.firm_id === 'FIRM-001') && (v.voucher_type === 'SALES' || v.type === 'SALES'));
      setInvoiceList(salesInvoices);
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
  }, [activeFirmId]);

  const handleAddToCart = () => {
    if (!selectedItemId || !quantity || !rate) return alert('Kripya item, matra aur rate darj karein.');
    const itemObj = allItems.find(i => String(i.id) === String(selectedItemId));
    if (!itemObj) return alert('Chayanit item nahi mila.');

    const qty = Number(quantity);
    const rt = Number(rate);
    const baseAmount = qty * rt;
    const gRate = Number(gstRate);
    
    const taxAmount = baseAmount * (gRate / 100);
    const totalWithTax = baseAmount + taxAmount;

    setCart([...cart, {
      id: Date.now(),
      itemId: selectedItemId,
      itemName: itemObj.item_name || itemObj.name || 'Item',
      unit: itemObj.unit || 'Pcs',
      qty,
      rate: rt,
      gstRate: gRate,
      taxableAmount: baseAmount,
      cgst: taxAmount / 2,
      sgst: taxAmount / 2,
      total: totalWithTax,
      isService: itemObj.item_type === 'SERVICE' || String(itemObj.item_name || '').toLowerCase().includes('freight')
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
    if (!customerParty) return alert('Kripya customer party chunein!');
    if (cart.length === 0) return alert('Kam se kam ek item bill mein jodein.');

    try {
      const currentInventory = StorageService.getItem('inventory_items') || StorageService.getInventoryItems() || [];
      const vouchers = StorageService.getItem('account_book_vouchers') || [];

      let workingInventory = [...currentInventory];
      if (editingId) {
        const oldInv = vouchers.find(v => v && v.id === editingId);
        if (oldInv && oldInv.items) {
          workingInventory = workingInventory.map(invItem => {
            const matched = oldInv.items.find(c => c && String(c.itemId) === String(invItem.id));
            if (matched && !matched.isService) {
              return { ...invItem, current_stock: Number(invItem.current_stock || 0) + Number(matched.qty || 0) };
            }
            return invItem;
          });
        }
      }

      const updatedInventory = workingInventory.map(invItem => {
        const cartItem = cart.find(c => c && String(c.itemId) === String(invItem.id));
        if (cartItem && !cartItem.isService) {
          return { ...invItem, current_stock: Number(invItem.current_stock || 0) - Number(cartItem.qty || 0) };
        }
        return invItem;
      });
      StorageService.setItem('inventory_items', updatedInventory);

      const newVoucher = {
        id: editingId || `INV-${Date.now()}`,
        firm_id: activeFirmId,
        voucher_date: invoiceDate,
        voucher_type: 'SALES',
        dr_account: customerParty,
        cr_account: 'Sales & Revenue',
        amount: grandTotal,
        total_amount: grandTotal,
        reference_no: invoiceNo,
        narration: `Sales Invoice ${invoiceNo} to ${customerParty} - Vehicle: ${vehicleNo}`,
        vehicle_no: vehicleNo,
        items: cart,
        total_taxable: totalTaxable,
        total_cgst: totalCgst,
        total_sgst: totalSgst,
        entries: [
          { account_name: customerParty, type: 'DR', amount: grandTotal },
          { account_name: 'Sales & Revenue', type: 'CR', amount: totalTaxable },
          ...(totalCgst > 0 ? [{ account_name: 'CGST Output', type: 'CR', amount: totalCgst }] : []),
          ...(totalSgst > 0 ? [{ account_name: 'SGST Output', type: 'CR', amount: totalSgst }] : [])
        ],
        created_at: new Date().toISOString()
      };

      let updatedVouchers;
      if (editingId) {
        updatedVouchers = vouchers.map(v => v && v.id === editingId ? newVoucher : v);
        setFeedback({ type: 'success', message: '✓ Invoice Updated Successfully!' });
      } else {
        updatedVouchers = [newVoucher, ...vouchers];
        setFeedback({ type: 'success', message: '✓ Invoice Generated & Saved to Register!' });
      }

      StorageService.setItem('account_book_vouchers', updatedVouchers);
      window.dispatchEvent(new Event('app_storage_updated'));
      loadData();

      setEditingId(null);
      setCart([]);
      setCustomerParty('');
      setVehicleNo('');
      setInvoiceNo(`INV-${Math.floor(Date.now() / 1000)}`);

    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleEdit = (inv) => {
    if (!inv) return;
    setEditingId(inv.id);
    setInvoiceDate(inv.voucher_date || todayMaxDate);
    setInvoiceNo(inv.reference_no || '');
    setCustomerParty(inv.dr_account || '');
    setVehicleNo(inv.vehicle_no || '');
    setCart(inv.items || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (invId, invNo) => {
    if (!window.confirm(`Invoice #${invNo} ko delete karne se stock vapas jud jayega. Jari rakhein?`)) return;

    try {
      const vouchers = StorageService.getItem('account_book_vouchers') || [];
      const targetInv = vouchers.find(v => v && v.id === invId);

      if (targetInv && targetInv.items) {
        const currentInventory = StorageService.getItem('inventory_items') || StorageService.getInventoryItems() || [];
        const restoredInventory = currentInventory.map(invItem => {
          const matchedCartItem = targetInv.items.find(c => c && String(c.itemId) === String(invItem.id));
          if (matchedCartItem && !matchedCartItem.isService) {
            return { ...invItem, current_stock: Number(invItem.current_stock || 0) + Number(matchedCartItem.qty || 0) };
          }
          return invItem;
        });
        StorageService.setItem('inventory_items', restoredInventory);
      }

      const filteredVouchers = vouchers.filter(v => v && v.id !== invId);
      StorageService.setItem('account_book_vouchers', filteredVouchers);
      window.dispatchEvent(new Event('app_storage_updated'));
      loadData();
      if (editingId === invId) {
        setEditingId(null); setCart([]); setCustomerParty(''); setVehicleNo('');
      }
      alert('✓ Invoice deleted & stock restored.');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handlePrint = (inv) => {
    if (!inv) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('Popup blocked! Please allow popups for printing.');

    printWindow.document.write(`
      <html>
        <head><title>Invoice #${inv.reference_no || ''}</title></head>
        <body style="font-family:sans-serif; padding:20px;">
          <h2 style="text-align:center;">${firm?.name || 'Neelkanth Groups'}</h2>
          <p style="text-align:center; font-size:12px; color:#666;">TAX INVOICE (GST Compliant)</p>
          <hr/>
          <p><strong>Invoice No:</strong> ${inv.reference_no || ''} | <strong>Date:</strong> ${inv.voucher_date || ''}</p>
          <p><strong>Customer:</strong> ${inv.dr_account || ''}</p>
          <table border="1" cellspacing="0" cellpadding="8" style="width:100%; margin-top:15px; border-collapse:collapse;">
            <tr style="background:#f1f5f9;"><th>Item</th><th>Qty</th><th>Rate</th><th>GST Slab</th><th>Total</th></tr>
            ${(inv.items || []).map(i => `<tr><td>${i.itemName \vert{}\vert{} ''}</td><td>${i.qty || 0} ${i.unit \vert{}\vert{} ''}</td><td>${i.rate || 0}</td><td>${i.gstRate \vert{}\vert{} 0}\%</td><td>${(i.total || 0).toFixed(2)}</td></tr>`).join('')}
          </table>
          <p style="text-align:right; margin-top:15px;">
            Taxable: ₹${Number(inv.total_taxable || 0).toFixed(2)}<br/>
            CGST: ₹${Number(inv.total_cgst || 0).toFixed(2)} | SGST: ₹${Number(inv.total_sgst || 0).toFixed(2)}<br/>
            <strong>Grand Total: ₹${Number(inv.amount || 0).toFixed(2)}</strong>
          </p>
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
            {editingId ? '✏️ Edit GST Sales Invoice' : '📄 Multi-Item GST Invoicing'}
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
              label="Customer / Debtor Party *"
              accounts={accountsList}
              value={customerParty}
              onChange={val => setCustomerParty(val)}
              placeholder="Search customer account..."
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
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>Select Stock Item</label>
                <select value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} style={{ ...inputStyle, border: '2px solid #eab308' }}>
                  <option value="">-- Choose Stock Item --</option>
                  {allItems.map(item => (
                    <option key={item.id} value={item.id}>{item.item_name || item.name} [Stock: {item.current_stock || item.stock || 0} {item.unit}]</option>
                  ))}
                </select>
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
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }}>
                      ₹{(c.total || 0).toFixed(2)} 
                      <button type="button" onClick={() => removeCartItem(c.id)} style={{ color: '#ef4444', border: 'none', background: 'none', marginLeft: '10px', cursor: 'pointer', fontWeight: 'bold', padding: '2px' }}>✕</button>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '12px', backgroundColor: '#e2e8f0', padding: '10px', borderRadius: '8px' }}>
                  <div>
                    <div>Taxable: ₹{totalTaxable.toFixed(2)}</div>
                    <div style={{ fontSize: '10px', color: '#475569' }}>CGST: ₹{totalCgst.toFixed(2)} | SGST: ₹{totalSgst.toFixed(2)}</div>
                  </div>
                  <div style={{ fontWeight: '900', fontSize: '15px', color: '#047857' }}>₹{grandTotal.toFixed(2)}</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" style={{ flex: 1, padding: '11px', backgroundColor: editingId ? '#0284c7' : '#1d4ed8', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
              {editingId ? '✓ Update GST Invoice' : '📄 Post Multi-Item GST Sale'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setCart([]); setCustomerParty(''); setVehicleNo(''); }} style={{ padding: '11px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>Sales Invoices Register ({invoiceList.length})</h3>
          <input 
            type="text" 
            placeholder="Search invoices..." 
            value={searchFilter} 
            onChange={e => setSearchFilter(e.target.value)} 
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', outline: 'none', backgroundColor: '#fff', color: '#0f172a' }} 
          />
        </div>

        {filteredInvoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '11px' }}>No sales invoices found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>
                  <th style={{ padding: '8px' }}>Date / No</th>
                  <th style={{ padding: '8px' }}>Customer</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px' }}>{inv.voucher_date}<br /><strong>{inv.reference_no}</strong></td>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{inv.dr_account}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#047857' }}>₹{Number(inv.amount || inv.total_amount || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button onClick={() => handlePrint(inv)} style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', marginRight: '4px' }}>Print</button>
                      <button onClick={() => handleEdit(inv)} style={{ backgroundColor: '#fef3c7', color: '#b45309', border: 'none', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', marginRight: '4px' }}>Edit</button>
                      <button onClick={() => handleDelete(inv.id, inv.reference_no)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>Delete</button>
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
  fontSize: '11px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#0f172a'
};
