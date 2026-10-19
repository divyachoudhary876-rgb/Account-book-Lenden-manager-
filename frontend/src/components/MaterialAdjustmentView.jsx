/**
 * Material Adjustment / Material Issue Submit Handler Snippet
 * Place this inside MaterialAdjustmentView.jsx where the form submission is handled.
 */

import { saveUniversalVoucher } from '../utils/voucherPostingEngine.js';
import { StorageService } from '../utils/storageSync.js';

const handleMaterialIssueSubmit = (e) => {
  if (e) e.preventDefault();
  
  const activeFirmId = firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  
  // Form state variables (e.g., date, party, selectedItem, quantity, rate, narration)
  const numericQty = parseFloat(quantity || 0);
  const numericRate = parseFloat(rate || 0);
  const totalAmount = Math.round((numericQty * numericRate + Number.EPSILON) * 100) / 100;

  if (numericQty <= 0) {
    return alert("⚠️ Kripya valid quantity darj karein.");
  }
  if (!selectedItem) {
    return alert("⚠️ Kripya Stock Item select karein.");
  }
  if (!selectedParty) {
    return alert("⚠️ Kripya Party / Expense Khata select karein.");
  }

  try {
    const itemNameDisplay = String(selectedItem.item_name || selectedItem.name || 'Item').trim();
    const stockLedgerName = `${itemNameDisplay} Stock Account`;
    const partyName = String(selectedParty.account_name || selectedParty.name || selectedParty).trim();
    const refNo = `MAT-ADJ-${Date.now().toString().slice(-6)}`;

    // 1. Post Double-Entry Voucher (Dr: Party/Expense, Cr: Stock Account)
    // Isse stock account ke statement mein entry automatic reflect hone lagegi!
    saveUniversalVoucher(activeFirmId, {
      voucher_type: 'JOURNAL',
      voucher_date: issueDate || new Date().toISOString().split('T')[0],
      date: issueDate || new Date().toISOString().split('T')[0],
      dr_account: partyName,
      cr_account: stockLedgerName,
      amount: totalAmount,
      total_amount: totalAmount,
      reference_no: refNo,
      narration: narration || `Material Issue: ${numericQty} ${selectedItem.unit || 'Units'} of ${itemNameDisplay} issued to ${partyName} @ ₹${numericRate}`,
      is_compound: false,
      entries: [
        { account_name: partyName, party: partyName, type: 'DR', debit: totalAmount, credit: 0, amount: totalAmount },
        { account_name: stockLedgerName, party: stockLedgerName, type: 'CR', debit: 0, credit: totalAmount, amount: totalAmount }
      ],
      items: [
        {
          itemId: String(selectedItem.id || ''),
          itemName: itemNameDisplay,
          item_name: itemNameDisplay,
          qty: numericQty,
          quantity: numericQty,
          rate: numericRate,
          unit: selectedItem.unit || 'Units',
          total: totalAmount
        }
      ]
    });

    // 2. Update Physical Inventory Stock (Deducting Qty)
    const inventoryKey = `inventory_items_${activeFirmId}`;
    let inventory = StorageService.getItem(inventoryKey, []) || [];
    
    const idx = inventory.findIndex(i => i && (String(i.id) === String(selectedItem.id) || String(i.item_name || i.name || '').trim().toLowerCase() === itemNameDisplay.toLowerCase()));
    if (idx !== -1) {
      const curStock = parseFloat(inventory[idx].current_stock || inventory[idx].stock || 0);
      const newStock = Math.round((curStock - numericQty + Number.EPSILON) * 100) / 100;
      inventory[idx].current_stock = newStock;
      inventory[idx].stock = newStock;
      inventory[idx].updated_at = new Date().toISOString();
      StorageService.setItem(inventoryKey, inventory);
      localStorage.setItem(inventoryKey, JSON.stringify(inventory));
    }

    // 3. Global Sync Broadcast
    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('app_inventory_updated'));
    window.dispatchEvent(new Event('storage'));

    alert("✓ Material Issue successfully posted & Stock Account updated!");
    // Reset form states here...

  } catch (err) {
    console.error("Material issue posting error:", err);
    alert("⚠️ Error posting material issue: " + err.message);
  }
};
