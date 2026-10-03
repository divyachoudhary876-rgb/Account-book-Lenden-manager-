// frontend/src/components/PurchaseStockEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { loadFirmData, saveFirmData } from '../utils/firmIsolationEngine';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import { saveUniversalVoucher, deleteUniversalVoucher } from '../utils/voucherPostingEngine.js';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';
import SearchableStockDropdown from './SearchableStockDropdown.jsx';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export default function PurchaseStockEntryForm({ firm, selectedFY, onClose }) {
  const activeFirmId = firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  const todayMaxDate = new Date().toISOString().split('T')[0];

  const [supplierAccounts, setSupplierAccounts] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [purchaseBills, setPurchaseBills] = useState([]);

  const [editingBill, setEditingBill] = useState(null);
  const [purchaseDate, setPurchaseDate] = useState(todayMaxDate);
  const [billNumber, setBillNumber] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedStockId, setSelectedStockId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchaseRate, setPurchaseRate] = useState('');
  const [narration, setNarration] = useState('');

  const [searchFilter, setSearchFilter] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);

  const loadData = () => {
    try {
      // 1. Load Supplier / Creditor Accounts
      const allAccounts = getFirmMasterAccounts(activeFirmId) || [];
      const suppliers = allAccounts.filter(a => {
        const type = String(a.primary_type || a.type || '').toUpperCase();
        const grp = String(a.sub_group || a.group || '').toLowerCase();
        return (
          type === 'LIABILITIES' ||
          grp.includes('creditor') ||
          grp.includes('supplier') ||
          grp.includes('thekedar') ||
          grp.includes('vendor')
        );
      });
      setSupplierAccounts(suppliers.length > 0 ? suppliers : allAccounts);

      // 2. Load Inventory Items
      const stockList = loadFirmData('inventory_items', firm, []);
      setInventoryItems(stockList.filter(i => i && (i.name || i.item_name)));

      // 3. Robust Multi-Bucket Purchase Bills Load (Universal Compatibility)
      let savedBills = loadFirmData('purchase_bills', firm, []);

      // Deep scan fallbacks agar direct key me na mile
      if (!Array.isArray(savedBills) || savedBills.length === 0) {
        const candidateKeys = [
          `purchase_bills_${activeFirmId}`,
          `purchase_bills_FIRM-001`,
          `purchase_bills_default_firm_id`,
          'purchase_bills'
        ];

        for (const k of candidateKeys) {
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                savedBills = parsed;
                break;
              }
            }
          } catch (e) {}
        }
      }

      // Agar direct purchase_bills key empty ho to vouchers bucket se purchase entries scan karein
      if (!Array.isArray(savedBills) || savedBills.length === 0) {
        const vchKeys = [
          `app_vouchers_${activeFirmId}`,
          `account_book_vouchers_${activeFirmId}`,
          'app_vouchers_FIRM-001'
        ];

        for (const vk of vchKeys) {
          try {
            const rawVchs = JSON.parse(localStorage.getItem(vk) || '[]');
            const purOnly = rawVchs.filter(v => (v.voucher_type === 'PURCHASE' || v.type === 'PURCHASE'));
            if (purOnly.length > 0) {
              savedBills = purOnly.map(v => ({
                id: v.id || v.reference_no,
                date: v.voucher_date || v.date,
                purchase_date: v.voucher_date || v.date,
                bill_number: v.reference_no || v.voucher_number || '1',
                supplier: v.cr_account || v.supplier_name || 'Supplier',
                item_name: v.dr_account || 'Material',
                quantity: v.quantity || v.qty || 1,
                rate: v.rate || v.unit_rate || v.amount,
                purchase_rate: v.rate || v.unit_rate || v.amount,
                total_amount: v.amount || v.total_amount,
                narration: v.narration || ''
              }));
              break;
            }
          } catch (e) {}
        }
      }

      savedBills.sort((a, b) => new Date(b.date || b.purchase_date || 0) - new Date(a.date || a.purchase_date || 0));
      setPurchaseBills(savedBills);
    } catch (e) {
      console.error("Error loading purchase form data:", e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_state_updated', loadData);
    window.addEventListener('app_storage_updated', loadData);
    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('app_state_updated', loadData);
      window.removeEventListener('app_storage_updated', loadData);
      window.removeEventListener('storage', loadData);
    };
  }, [activeFirmId, firm]);

  const calculatedTotal = round2((Number(quantity) || 0) * (Number(purchaseRate) || 0));

  // Safe stock reversal logic
  const revertStockForBill = (billObj, currentStockList) => {
    if (!billObj) return currentStockList;
    const targetItemId = String(billObj.item_id || billObj.stock_id || '');
    const targetItemName = String(billObj.item_name || '').trim().toLowerCase();
    const qtyToRevert = parseFloat(billObj.quantity || billObj.qty || 0);

    return currentStockList.map(item => {
      const isIdMatch = targetItemId && String(item.id) === targetItemId;
      const isNameMatch = targetItemName && String(item.name || item.item_name || '').trim().toLowerCase() === targetItemName;

      if ((isIdMatch || isNameMatch) && !item.is_service && item.item_type !== 'SERVICE') {
        const curStock = parseFloat(item.current_stock || item.stock || item.qty || 0);
        const newStock = round2(Math.max(0, curStock - qtyToRevert));
        return {
          ...item,
          current_stock: newStock,
          stock: newStock,
          qty: newStock,
          updated_at: new Date().toISOString()
        };
      }
      return item;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatusMessage(null);

    const supplierName = (typeof selectedSupplier === 'object'
      ? (selectedSupplier.account_name || selectedSupplier.name || '')
      : selectedSupplier).trim();

    if (!supplierName) {
      setStatusMessage({ type: 'error', text: 'Kripya Supplier / Vendor party chunein!' });
      return;
    }
    if (!selectedStockId) {
      setStatusMessage({ type: 'error', text: 'Kripya Stock Item chunein!' });
      return;
    }

    const numQty = parseFloat(quantity);
    const numRate = parseFloat(purchaseRate);

    if (!numQty || numQty <= 0) {
      setStatusMessage({ type: 'error', text: 'Kripya valid Quantity (> 0) darj karein!' });
      return;
    }
    if (!numRate || numRate <= 0) {
      setStatusMessage({ type: 'error', text: 'Kripya valid Purchase Rate (> 0) darj karein!' });
      return;
    }

    try {
      const billId = editingBill ? editingBill.id : `PUR-${Date.now()}`;
      const finalBillNo = billNumber.trim() || `BILL-${Math.floor(1000 + Math.random() * 9000)}`;

      let currentStock = [...inventoryItems];

      // Revert old stock if editing
      if (editingBill) {
        currentStock = revertStockForBill(editingBill, currentStock);
      }

      // Add new stock
      const itemIdx = currentStock.findIndex(i =>
        String(i.id) === String(selectedStockId) ||
        String(i.name || i.item_name || '').trim().toLowerCase() === String(selectedStockId).trim().toLowerCase()
      );

      let cleanItemName = 'Purchase Item';
      let cleanUnit = 'Units';

      if (itemIdx !== -1) {
        cleanItemName = currentStock[itemIdx].name || currentStock[itemIdx].item_name || 'Item';
        cleanUnit = currentStock[itemIdx].unit || 'Units';
        const oldQty = parseFloat(currentStock[itemIdx].current_stock || currentStock[itemIdx].stock || 0);
        const newQty = round2(oldQty + numQty);

        currentStock[itemIdx] = {
          ...currentStock[itemIdx],
          current_stock: newQty,
          stock: newQty,
          qty: newQty,
          unit_purchase_price: numRate,
          purchase_price: numRate,
          rate: numRate,
          cost_price: numRate,
          updated_at: new Date().toISOString()
        };
      }

      saveFirmData('inventory_items', firm, currentStock);
      setInventoryItems(currentStock);

      const newBillRecord = {
        id: billId,
        firm_id: activeFirmId,
        date: purchaseDate,
        purchase_date: purchaseDate,
        bill_number: finalBillNo,
        reference_no: finalBillNo,
        supplier: supplierName,
        supplier_name: supplierName,
        item_id: selectedStockId,
        item_name: cleanItemName,
        unit: cleanUnit,
        quantity: numQty,
        rate: numRate,
        purchase_rate: numRate,
        total_amount: calculatedTotal,
        narration: narration.trim() || `Purchased ${numQty} ${cleanUnit} ${cleanItemName} from ${supplierName} (Bill #${finalBillNo})`,
        updated_at: new Date().toISOString()
      };

      const existingBills = loadFirmData('purchase_bills', firm, []);
      const filteredBills = existingBills.filter(b => b && b.id !== billId);
      const updatedBills = [newBillRecord, ...filteredBills];

      saveFirmData('purchase_bills', firm, updatedBills);
      localStorage.setItem(`purchase_bills_${activeFirmId}`, JSON.stringify(updatedBills));

      // Post Balanced Universal Voucher
      const voucherRefId = `JV-${billId}`;
      saveUniversalVoucher(activeFirmId, {
        id: voucherRefId,
        firm_id: activeFirmId,
        voucher_type: 'PURCHASE',
        type: 'PURCHASE',
        voucher_date: purchaseDate,
        date: purchaseDate,
        reference_no: finalBillNo,
        voucher_number: finalBillNo,
        dr_account: `${cleanItemName} Stock Account`,
        cr_account: supplierName,
        amount: calculatedTotal,
        total_amount: calculatedTotal,
        narration: newBillRecord.narration,
        is_compound: true,
        entries: [
          { account_name: `${cleanItemName} Stock Account`, party: `${cleanItemName} Stock Account`, type: 'DR', debit: calculatedTotal, credit: 0, amount: calculatedTotal },
          { account_name: supplierName, party: supplierName, type: 'CR', debit: 0, credit: calculatedTotal, amount: calculatedTotal }
        ]
      });

      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('storage'));

      setStatusMessage({
        type: 'success',
        text: editingBill
          ? `✓ Purchase Bill #${finalBillNo} updated & stock synchronized successfully!`
          : `✓ Purchase Bill #${finalBillNo} saved & stock added successfully!`
      });

      setEditingBill(null);
      setBillNumber('');
      setQuantity('');
      setPurchaseRate('');
      setNarration('');
      loadData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Error: ${err.message}` });
    }
  };

  const handleEditInit = (bill) => {
    if (!bill) return;
    setEditingBill(bill);
    setPurchaseDate(bill.purchase_date || bill.date || todayMaxDate);
    setBillNumber(bill.bill_number || bill.reference_no || '');
    setSelectedSupplier(bill.supplier || bill.supplier_name || '');
    setSelectedStockId(bill.item_id || bill.stock_id || '');
    setQuantity(bill.quantity ? String(bill.quantity) : '');
    setPurchaseRate(bill.rate || bill.purchase_rate ? String(bill.rate || bill.purchase_rate) : '');
    setNarration(bill.narration || '');
    setStatusMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingBill(null);
    setBillNumber('');
    setQuantity('');
    setPurchaseRate('');
    setNarration('');
    setStatusMessage(null);
  };

  const handleDeleteBill = (bill) => {
    if (!window.confirm(`Purchase Bill #${bill.bill_number || bill.reference_no} ko delete karne se stock vapas minus ho jayega. Jari rakhein?`)) return;

    try {
      let currentStock = [...inventoryItems];
      currentStock = revertStockForBill(bill, currentStock);
      saveFirmData('inventory_items', firm, currentStock);
      setInventoryItems(currentStock);

      const existingBills = loadFirmData('purchase_bills', firm, []);
      const filteredBills = existingBills.filter(b => b && b.id !== bill.id);
      saveFirmData('purchase_bills', firm, filteredBills);
      localStorage.setItem(`purchase_bills_${activeFirmId}`, JSON.stringify(filteredBills));

      try {
        deleteUniversalVoucher(activeFirmId, `JV-${bill.id}`);
        deleteUniversalVoucher(activeFirmId, bill.id);
      } catch (e) {}

      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('storage'));

      if (editingBill && editingBill.id === bill.id) {
        handleCancelEdit();
      }

      loadData();
      alert('✓ Purchase bill deleted & stock reverted successfully.');
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const filteredBills = purchaseBills.filter(b => {
    if (!b) return false;
    const q = (searchFilter || '').toLowerCase();
    return (
      (b.bill_number && String(b.bill_number).toLowerCase().includes(q)) ||
      (b.supplier && String(b.supplier).toLowerCase().includes(q)) ||
      (b.supplier_name && String(b.supplier_name).toLowerCase().includes(q)) ||
      (b.item_name && String(b.item_name).toLowerCase().includes(q)) ||
      (b.narration && String(b.narration).toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ width: '100%', maxWidth: '650px', margin: '0 auto', boxSizing: 'border-box', padding: '12px 12px 60px 12px', display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Header Banner */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
              {editingBill ? '✏️ Edit Purchase Bill' : '📦 Purchase & Inward Stock (+IN)'}
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Raw materials, fuel inward, and supplier ledger credit</span>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
              Close
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div style={{
          backgroundColor: statusMessage.type === 'error' ? '#fef2f2' : '#ecfdf5',
          border: `1px solid ${statusMessage.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
          color: statusMessage.type === 'error' ? '#991b1b' : '#065f46',
          padding: '10px 14px',
          borderRadius: '10px',
          fontSize: '12px',
          fontWeight: 'bold',
          boxSizing: 'border-box',
          width: '100%'
        }}>
          {statusMessage.text}
        </div>
      )}

      {/* Main Entry Form */}
      <form onSubmit={handleSubmit} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>PURCHASE DATE *</label>
            <input 
              type="date" 
              max={todayMaxDate}
              value={purchaseDate} 
              onChange={e => setPurchaseDate(e.target.value)} 
              style={inputStyle} 
              required 
            />
          </div>
          <div>
            <label style={labelStyle}>BILL / REF NO *</label>
            <input 
              type="text" 
              placeholder="e.g. 69" 
              value={billNumber} 
              onChange={e => setBillNumber(e.target.value)} 
              style={inputStyle} 
              required 
            />
          </div>
        </div>

        <div>
          <SearchableAccountDropdown
            label="Supplier / Vendor Party * *"
            accounts={supplierAccounts}
            value={selectedSupplier}
            onChange={val => setSelectedSupplier(val)}
            placeholder="Search supplier or vendor..."
            colorAccent="#dc2626"
            required
          />
        </div>

        <div>
          <SearchableStockDropdown
            firm={firm}
            label="STOCK ITEM (+IN) *"
            value={selectedStockId}
            onChange={val => setSelectedStockId(val)}
            placeholder="-- Choose Stock Item --"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>QUANTITY *</label>
            <input 
              type="number" 
              step="0.01" 
              placeholder="0.00" 
              value={quantity} 
              onChange={e => setQuantity(e.target.value)} 
              style={inputStyle} 
              required 
            />
          </div>
          <div>
            <label style={labelStyle}>PURCHASE RATE (₹) *</label>
            <input 
              type="number" 
              step="0.01" 
              placeholder="0.00" 
              value={purchaseRate} 
              onChange={e => setPurchaseRate(e.target.value)} 
              style={inputStyle} 
              required 
            />
          </div>
        </div>

        <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Total Purchase Amount:</span>
          <span style={{ fontSize: '15px', fontWeight: '900', color: '#059669' }}>₹{calculatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>

        <div>
          <label style={labelStyle}>Narration / Remarks</label>
          <input 
            type="text" 
            placeholder="e.g. Received at chamber / tractor freight" 
            value={narration} 
            onChange={e => setNarration(e.target.value)} 
            style={inputStyle} 
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button 
            type="submit" 
            style={{ 
              flex: 1, 
              backgroundColor: '#059669', 
              color: '#ffffff', 
              border: 'none', 
              padding: '12px', 
              borderRadius: '8px', 
              fontSize: '12px', 
              fontWeight: 'bold', 
              cursor: 'pointer' 
            }}
          >
            {editingBill ? '✓ Update Purchase & Adjust Stock' : '💾 Save Purchase & Add Stock'}
          </button>

          {editingBill && (
            <button 
              type="button" 
              onClick={handleCancelEdit} 
              style={{ 
                backgroundColor: '#f1f5f9', 
                color: '#475569', 
                border: '1px solid #cbd5e1', 
                padding: '12px 16px', 
                borderRadius: '8px', 
                fontSize: '12px', 
                fontWeight: 'bold', 
                cursor: 'pointer' 
              }}
            >
              Cancel
            </button>
          )}
        </div>

      </form>

      {/* Purchase Bills Register */}
      <div style={cardStyle}>
        <div style={{ marginBottom: '10px' }}>
          <strong style={{ fontSize: '13px', color: '#0f172a' }}>
            📋 Purchase Bills Register ({filteredBills.length})
          </strong>
        </div>

        <input 
          type="text" 
          placeholder="🔍 Search purchase bills by bill no, supplier, item..." 
          value={searchFilter} 
          onChange={e => setSearchFilter(e.target.value)} 
          style={{ ...inputStyle, padding: '8px 12px', fontSize: '11px', marginBottom: '10px' }} 
        />

        <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredBills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>
              No purchase bills found for this firm.
            </div>
          ) : (
            filteredBills.map((bill) => {
              const totalAmt = parseFloat(bill.total_amount || 0);
              const isSelected = editingBill && editingBill.id === bill.id;

              return (
                <div 
                  key={bill.id} 
                  style={{ 
                    backgroundColor: isSelected ? '#ecfdf5' : '#f8fafc', 
                    border: `1px solid ${isSelected ? '#059669' : '#e2e8f0'}`, 
                    borderRadius: '8px', 
                    padding: '10px 12px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    boxSizing: 'border-box'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                        {bill.purchase_date || bill.date}
                      </span>
                      <strong style={{ fontSize: '12px', color: '#0f172a' }}>
                        #{bill.bill_number || bill.reference_no}
                      </strong>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#dc2626', marginTop: '2px' }}>
                      {bill.supplier || bill.supplier_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569' }}>
                      📦 {bill.item_name} — Qty: <strong>{bill.quantity} {bill.unit || 'Units'}</strong> @ ₹{bill.rate || bill.purchase_rate}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: '#059669' }}>
                      ₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        type="button" 
                        onClick={() => handleEditInit(bill)} 
                        style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteBill(bill)} 
                        style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '14px',
  border: '1px solid #cbd5e1',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
  boxSizing: 'border-box',
  width: '100%'
};

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#334155',
  marginBottom: '4px'
};

const inputStyle = {
  width: '100%',
  padding: '9px 10px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '12px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  outline: 'none'
};
