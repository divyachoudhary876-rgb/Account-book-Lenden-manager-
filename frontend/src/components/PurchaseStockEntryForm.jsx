// frontend/src/components/PurchaseStockEntryForm.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { loadFirmData, saveFirmData } from '../utils/firmIsolationEngine';
import { getFirmMasterAccounts, saveMasterAccount } from '../utils/accountMasterEngine.js';
import { saveUniversalVoucher, deleteUniversalVoucher } from '../utils/voucherPostingEngine.js';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';
import SearchableStockDropdown from './SearchableStockDropdown.jsx';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

const getBillSupplierName = (bill) => {
  if (!bill) return 'Supplier Party';
  if (bill.supplier && String(bill.supplier).trim() !== '') return String(bill.supplier).trim();
  if (bill.supplier_name && String(bill.supplier_name).trim() !== '') return String(bill.supplier_name).trim();
  if (bill.party && String(bill.party).trim() !== '') return String(bill.party).trim();
  if (bill.party_name && String(bill.party_name).trim() !== '') return String(bill.party_name).trim();
  if (bill.vendor && String(bill.vendor).trim() !== '') return String(bill.vendor).trim();
  if (bill.cr_account && String(bill.cr_account).trim() !== '') return String(bill.cr_account).trim();

  if (Array.isArray(bill.entries) && bill.entries.length > 0) {
    const crEntry = bill.entries.find(e => (e.type || '').toUpperCase() === 'CR' || Number(e.credit) > 0);
    if (crEntry && (crEntry.account_name || crEntry.party)) {
      return (crEntry.account_name || crEntry.party).trim();
    }
  }

  const narr = String(bill.narration || '');
  const matchFrom = narr.match(/from\s+([^(\n]+)/i);
  if (matchFrom && matchFrom[1]) {
    return matchFrom[1].trim();
  }

  return 'Supplier Party';
};

const getCleanPurchaseItemName = (bill) => {
  if (!bill) return 'Stock Item';

  const isGeneric = (str) => {
    if (!str) return true;
    const s = String(str).toLowerCase().trim();
    return s === 'purchase a/c' || 
           s === 'purchase account' || 
           s.startsWith('purchase raw material') ||
           s === 'material' ||
           s === 'general purchase' ||
           s === 'purchase';
  };

  if (bill.item_name && !isGeneric(bill.item_name)) {
    return String(bill.item_name).replace(/\s*Stock\s*Account/i, '').trim();
  }
  if (bill.itemName && !isGeneric(bill.itemName)) {
    return String(bill.itemName).replace(/\s*Stock\s*Account/i, '').trim();
  }
  if (bill.stock_item_name && !isGeneric(bill.stock_item_name)) {
    return String(bill.stock_item_name).replace(/\s*Stock\s*Account/i, '').trim();
  }

  if (Array.isArray(bill.items) && bill.items.length > 0) {
    for (const it of bill.items) {
      const itName = it?.itemName || it?.item_name || it?.name;
      if (itName && !isGeneric(itName)) {
        return String(itName).replace(/\s*Stock\s*Account/i, '').trim();
      }
    }
  }

  const narr = String(bill.narration || '');
  if (narr) {
    const colonMatch = narr.match(/(?:bill\s*#?\d*|purchase|item|inward)\s*:\s*([^–\-(@\n]+)/i);
    if (colonMatch && colonMatch[1] && !isGeneric(colonMatch[1])) {
      return colonMatch[1].trim();
    }
  }

  const dr = String(bill.dr_account || bill.debit_account || '');
  if (dr && !isGeneric(dr)) {
    return dr.replace(/\s*Stock\s*Account/i, '').trim();
  }

  return 'Stock Item';
};

export default function PurchaseStockEntryForm({ firm, selectedFY, onClose }) {
  const activeFirmId = useMemo(() => {
    return firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  }, [firm]);

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

  const getNextBillNumber = useCallback((bills) => {
    let maxNum = 0;
    (bills || []).forEach(b => {
      const raw = String(b.bill_number || b.reference_no || '').trim();
      const numMatch = raw.match(/\d+/g);
      if (numMatch) {
        const val = parseInt(numMatch[numMatch.length - 1], 10);
        if (!isNaN(val) && val > maxNum && val < 1000000) {
          maxNum = val;
        }
      }
    });
    return String(maxNum + 1);
  }, []);

  const revertStockForBill = useCallback((billObj, currentStockList) => {
    if (!billObj || !Array.isArray(currentStockList)) return currentStockList || [];
    const targetItemId = String(billObj.item_id || billObj.stock_id || '');
    const targetItemName = String(getCleanPurchaseItemName(billObj)).trim().toLowerCase();
    const qtyToRevert = parseFloat(billObj.quantity || billObj.qty || 0);

    return currentStockList.map(item => {
      if (!item) return item;
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
  }, []);

  const loadData = useCallback(() => {
    try {
      const allAccounts = getFirmMasterAccounts(activeFirmId) || [];
      const suppliers = allAccounts.filter(a => {
        if (!a) return false;
        const type = String(a.primary_type || a.type || '').toUpperCase();
        const grp = String(a.sub_group || a.group || '').toLowerCase();
        const name = String(a.account_name || a.name || '').toLowerCase();

        const isCreditorOrSupplier = (
          type === 'LIABILITIES' ||
          grp.includes('creditor') ||
          grp.includes('supplier') ||
          grp.includes('thekedar') ||
          grp.includes('capital') ||
          grp.includes('vendor')
        );

        const isCashOrBank = (
          name.includes('cash') ||
          name.includes('bank') ||
          name.includes('रोकड़') ||
          name.includes('बैंक') ||
          grp.includes('cash') ||
          grp.includes('bank')
        );

        return isCreditorOrSupplier || isCashOrBank;
      });
      setSupplierAccounts(suppliers.length > 0 ? suppliers : allAccounts);

      let stockList = loadFirmData('inventory_items', firm, []);
      if (!Array.isArray(stockList) || stockList.length === 0) {
        try {
          const raw = localStorage.getItem(`inventory_items_${activeFirmId}`) || localStorage.getItem('inventory_items');
          if (raw) stockList = JSON.parse(raw);
        } catch (e) {}
      }
      const cleanStock = Array.isArray(stockList) ? stockList.filter(i => i && (i.name || i.item_name)) : [];
      setInventoryItems(cleanStock);

      const purchaseKey = `purchase_bills_${activeFirmId}`;
      let rawBills = [];
      try {
        const stored = localStorage.getItem(purchaseKey);
        if (stored) rawBills = JSON.parse(stored);
      } catch (e) {}

      const billsMap = new Map();
      if (Array.isArray(rawBills)) {
        rawBills.forEach(b => {
          if (!b) return;
          const bNum = String(b.bill_number || b.reference_no || b.id || '').trim();
          if (bNum) {
            billsMap.set(bNum, {
              ...b,
              bill_number: bNum,
              reference_no: bNum,
              supplier: getBillSupplierName(b),
              item_name: getCleanPurchaseItemName(b)
            });
          }
        });
      }

      const completeBills = Array.from(billsMap.values());
      completeBills.sort((a, b) => {
        const numA = parseInt(String(a.bill_number).replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(String(b.bill_number).replace(/\D/g, ''), 10) || 0;
        if (numA && numB && numA !== numB) {
          return numB - numA;
        }
        return new Date(b.date || b.purchase_date || 0) - new Date(a.date || a.purchase_date || 0);
      });

      setPurchaseBills(completeBills);

      if (!editingBill) {
        setBillNumber(getNextBillNumber(completeBills));
      }
    } catch (e) {
      console.error("Error loading purchase data:", e);
    }
  }, [activeFirmId, firm, editingBill, getNextBillNumber]);

  useEffect(() => {
    loadData();
    window.addEventListener('app_state_updated', loadData);
    window.addEventListener('app_storage_updated', loadData);
    window.addEventListener('app_inventory_updated', loadData);
    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('app_state_updated', loadData);
      window.removeEventListener('app_storage_updated', loadData);
      window.removeEventListener('app_inventory_updated', loadData);
      window.removeEventListener('storage', loadData);
    };
  }, [loadData]);

  const calculatedTotal = useMemo(() => {
    return round2((Number(quantity) || 0) * (Number(purchaseRate) || 0));
  }, [quantity, purchaseRate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatusMessage(null);

    const supplierName = (typeof selectedSupplier === 'object'
      ? (selectedSupplier.account_name || selectedSupplier.name || '')
      : selectedSupplier).trim();

    if (!supplierName) {
      setStatusMessage({ type: 'error', text: 'Kripya Supplier / Cash / Bank Account chunein!' });
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
      const finalBillNo = billNumber.trim() || getNextBillNumber(purchaseBills);
      const billId = editingBill ? editingBill.id : `PUR-${finalBillNo}`;

      let currentStock = [...inventoryItems];
      if (editingBill) {
        currentStock = revertStockForBill(editingBill, currentStock);
      }

      const itemIdx = currentStock.findIndex(i =>
        String(i.id) === String(selectedStockId) ||
        String(i.name || i.item_name || '').trim().toLowerCase() === String(selectedStockId).trim().toLowerCase()
      );

      let cleanItemName = 'Purchase Item';
      let cleanUnit = 'Pcs';

      if (itemIdx !== -1) {
        cleanItemName = currentStock[itemIdx].name || currentStock[itemIdx].item_name || 'Item';
        cleanUnit = currentStock[itemIdx].unit || 'Pcs';
        const baseQty = parseFloat(currentStock[itemIdx].current_stock || currentStock[itemIdx].stock || 0);
        const newQty = round2(baseQty + numQty);

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
      localStorage.setItem(`inventory_items_${activeFirmId}`, JSON.stringify(currentStock));
      setInventoryItems(currentStock);

      const stockAssetAccount = `${cleanItemName} Stock Account`;
      const masterAccounts = getFirmMasterAccounts(activeFirmId) || [];
      if (!masterAccounts.some(a => (a.account_name || a.name || '').trim().toLowerCase() === stockAssetAccount.toLowerCase())) {
        saveMasterAccount(activeFirmId, {
          account_name: stockAssetAccount,
          primary_type: 'ASSETS',
          type: 'Assets',
          sub_group: 'Raw Material Inventory (कच्चा माल)',
          group: 'Current Assets',
          balance_type: 'Dr'
        });
      }

      const newBillRecord = {
        id: billId,
        firm_id: activeFirmId,
        date: purchaseDate,
        purchase_date: purchaseDate,
        bill_number: finalBillNo,
        reference_no: finalBillNo,
        supplier: supplierName,
        supplier_name: supplierName,
        party: supplierName,
        item_id: selectedStockId,
        item_name: cleanItemName,
        unit: cleanUnit,
        quantity: numQty,
        rate: numRate,
        purchase_rate: numRate,
        total_amount: calculatedTotal,
        narration: narration.trim() || `Purchase Bill #${finalBillNo}: ${cleanItemName} (${numQty} ${cleanUnit} @ ₹${numRate}) from ${supplierName}`,
        updated_at: new Date().toISOString()
      };

      const existingBills = purchaseBills.filter(b => b && b.id !== billId && String(b.bill_number) !== finalBillNo);
      const updatedBills = [newBillRecord, ...existingBills];

      localStorage.setItem(`purchase_bills_${activeFirmId}`, JSON.stringify(updatedBills));
      setPurchaseBills(updatedBills);

      if (editingBill) {
        const oldCandidateIds = [
          editingBill.id,
          `JV-${editingBill.id}`,
          editingBill.bill_number,
          `#${editingBill.bill_number}`,
          `PUR-${editingBill.bill_number}`
        ];
        oldCandidateIds.forEach(id => {
          try { deleteUniversalVoucher(activeFirmId, id); } catch (e) {}
        });
      }

      const voucherFinalId = `#${finalBillNo}`;
      saveUniversalVoucher(activeFirmId, {
        id: voucherFinalId,
        firm_id: activeFirmId,
        voucher_type: 'PURCHASE',
        type: 'PURCHASE',
        voucher_date: purchaseDate,
        date: purchaseDate,
        reference_no: finalBillNo,
        voucher_number: finalBillNo,
        dr_account: stockAssetAccount,
        cr_account: supplierName,
        amount: calculatedTotal,
        total_amount: calculatedTotal,
        narration: newBillRecord.narration,
        is_compound: true,
        items: [
          { itemName: cleanItemName, name: cleanItemName, qty: numQty, quantity: numQty, unit: cleanUnit, rate: numRate }
        ],
        entries: [
          { account_name: stockAssetAccount, party: stockAssetAccount, type: 'DR', debit: calculatedTotal, credit: 0, amount: calculatedTotal },
          { account_name: supplierName, party: supplierName, type: 'CR', debit: 0, credit: calculatedTotal, amount: calculatedTotal }
        ]
      });

      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('app_inventory_updated'));
      window.dispatchEvent(new Event('storage'));

      setStatusMessage({
        type: 'success',
        text: editingBill
          ? `✓ Purchase Bill #${finalBillNo} updated & stock synchronized successfully!`
          : `✓ Purchase Bill #${finalBillNo} saved & stock added successfully!`
      });

      setEditingBill(null);
      setQuantity('');
      setPurchaseRate('');
      setNarration('');
      setBillNumber(getNextBillNumber(updatedBills));
      loadData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Error: ${err.message}` });
    }
  };

  const handleEditInit = (e, bill) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!bill) return;

    setEditingBill(bill);
    setPurchaseDate(bill.purchase_date || bill.date || todayMaxDate);
    setBillNumber(bill.bill_number || bill.reference_no || '');
    setSelectedSupplier(getBillSupplierName(bill));
    setSelectedStockId(bill.item_id || bill.stock_id || '');
    setQuantity(bill.quantity ? String(bill.quantity) : '');
    setPurchaseRate(bill.rate || bill.purchase_rate ? String(bill.rate || bill.purchase_rate) : '');
    setNarration(bill.narration || '');
    setStatusMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingBill(null);
    setQuantity('');
    setPurchaseRate('');
    setNarration('');
    setBillNumber(getNextBillNumber(purchaseBills));
    setStatusMessage(null);
  };

  const handleDeleteBill = (e, bill) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!bill) return;

    const bNum = String(bill.bill_number || bill.reference_no || '').trim();
    const supName = getBillSupplierName(bill);

    if (!window.confirm(`Purchase Bill #${bNum} (${supName}) ko delete karna chahte hain?\n\n- Inventory se ${bill.quantity || 1} ${bill.unit || 'Pcs'} stock minus ho jayega.\n- Party ke khate aur Daybook se ₹${parseFloat(bill.total_amount || 0).toFixed(2)} ka voucher hat jayega.\n\nJari rakhein?`)) {
      return;
    }

    try {
      // 1. Revert Stock in Inventory Safely
      let currentStock = [...inventoryItems];
      currentStock = revertStockForBill(bill, currentStock);
      saveFirmData('inventory_items', firm, currentStock);
      localStorage.setItem(`inventory_items_${activeFirmId}`, JSON.stringify(currentStock));
      setInventoryItems(currentStock);

      // 2. Remove Bill from all Purchase Registers (Scoped & Global Buckets)
      const filterOutBill = (list) => {
        if (!Array.isArray(list)) return [];
        return list.filter(b => {
          if (!b) return false;
          const matchId = String(b.id || '').trim() === String(bill.id || '').trim();
          const matchNum = String(b.bill_number || b.reference_no || '').trim() === bNum;
          return !(matchId || matchNum);
        });
      };

      const remainingBills = filterOutBill(purchaseBills);
      setPurchaseBills(remainingBills);

      const purchaseKeysToClean = [
        `purchase_bills_${activeFirmId}`,
        'purchase_bills',
        `app_purchase_bills_${activeFirmId}`,
        'purchase_bills_FIRM-001'
      ];
      purchaseKeysToClean.forEach(pk => {
        try {
          const raw = localStorage.getItem(pk);
          if (raw) {
            localStorage.setItem(pk, JSON.stringify(filterOutBill(JSON.parse(raw))));
          }
        } catch (e) {}
      });

      // 3. Purge corresponding Universal Vouchers & Daybook entries
      const candidateKeys = [
        bill.id,
        `JV-${bill.id}`,
        bNum,
        `#${bNum}`,
        `PUR-${bNum}`,
        `PV-${bNum}`,
        `JV-PUR-${bNum}`
      ];

      candidateKeys.forEach(vId => {
        if (vId) {
          try { deleteUniversalVoucher(activeFirmId, vId); } catch (e) {}
        }
      });

      const voucherKeys = [
        `app_vouchers_${activeFirmId}`,
        `account_book_vouchers_${activeFirmId}`,
        'app_vouchers',
        'account_book_vouchers'
      ];

      voucherKeys.forEach(vk => {
        try {
          const raw = localStorage.getItem(vk);
          if (raw) {
            let vchs = JSON.parse(raw);
            if (Array.isArray(vchs)) {
              vchs = vchs.filter(v => {
                if (!v) return false;
                const vNum = String(v.reference_no || v.voucher_number || v.id || '').replace(/^#|^PUR-|^PV-/, '').trim();
                const isMatch = vNum === bNum || candidateKeys.includes(v.id) || String(v.id).includes(bNum);
                return !isMatch;
              });
              localStorage.setItem(vk, JSON.stringify(vchs));
            }
          }
        } catch (e) {}
      });

      // 4. Trigger Global State Sync
      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('app_inventory_updated'));
      window.dispatchEvent(new Event('storage'));

      if (editingBill && (editingBill.id === bill.id || String(editingBill.bill_number) === bNum)) {
        handleCancelEdit();
      } else {
        setBillNumber(getNextBillNumber(remainingBills));
      }

      loadData();
      alert(`✓ Purchase Bill #${bNum} successfully deleted and purged from all registers.`);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const filteredBills = purchaseBills.filter(b => {
    if (!b) return false;
    const q = (searchFilter || '').toLowerCase();
    const supName = getBillSupplierName(b).toLowerCase();
    const itemNameStr = getCleanPurchaseItemName(b).toLowerCase();
    return (
      (b.bill_number && String(b.bill_number).toLowerCase().includes(q)) ||
      supName.includes(q) ||
      itemNameStr.includes(q) ||
      (b.narration && String(b.narration).toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ width: '100%', maxWidth: '650px', margin: '0 auto', boxSizing: 'border-box', padding: '12px 12px 60px 12px', display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
              {editingBill ? '✏️ Edit Purchase Bill' : '📦 Purchase & Inward Stock (+IN)'}
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Raw materials, fuel inward, and supplier ledger credit</span>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
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
              placeholder="e.g. 73" 
              value={billNumber} 
              onChange={e => setBillNumber(e.target.value)} 
              style={{ ...inputStyle, fontWeight: 'bold', backgroundColor: '#f8fafc', color: '#0284c7' }} 
              required 
            />
          </div>
        </div>

        <div>
          <SearchableAccountDropdown
            label="Supplier / Vendor / Cash / Bank Party *"
            accounts={supplierAccounts}
            value={selectedSupplier}
            onChange={val => setSelectedSupplier(val)}
            placeholder="Search supplier, cash or bank account..."
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
            {editingBill ? `✓ Update Purchase #${billNumber}` : `💾 Save Purchase & Add Stock (#${billNumber})`}
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
              const isSelected = editingBill && (editingBill.id === bill.id || String(bill.bill_number) === String(bill.bill_number));
              const displayName = getBillSupplierName(bill);
              const displayItemName = getCleanPurchaseItemName(bill);

              return (
                <div 
                  key={bill.id || bill.bill_number} 
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
                      {displayName}
                    </div>

                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                      📦 <strong style={{ color: '#0f172a' }}>{displayItemName}</strong> — Qty: <strong>{bill.quantity} {bill.unit || 'Pcs'}</strong> @ ₹{bill.rate || bill.purchase_rate}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: '#059669' }}>
                      ₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        type="button" 
                        onClick={(e) => handleEditInit(e, bill)} 
                        style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                      <button 
                        type="button" 
                        onClick={(e) => handleDeleteBill(e, bill)} 
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
