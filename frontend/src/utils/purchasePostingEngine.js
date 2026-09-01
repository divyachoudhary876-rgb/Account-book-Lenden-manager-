// frontend/src/utils/purchasePostingEngine.js

export const recordUnifiedPurchase = (firmId, payload) => {
  const targetId = firmId || 'FIRM-001';
  const { supplier_account, item_name, quantity, unit_rate, invoice_number, voucher_date } = payload;

  const qty = parseFloat(quantity || 0);
  const rate = parseFloat(unit_rate || 0);
  const totalAmount = parseFloat((qty * rate).toFixed(2));
  const vDate = voucher_date || new Date().toISOString().split('T')[0];
  const voucherId = `PUR-${Date.now()}`;
  const cleanItem = (item_name || 'Diesel').trim();

  if (!supplier_account || qty <= 0 || rate <= 0) {
    throw new Error("⚠️ Supplier, Quantity (>0) aur Purchase Rate (>0) enter karna mandatory hai.");
  }

  // 1. INVENTORY STOCK UPDATE (+IN)
  const stockKey = `app_stock_items_${targetId}`;
  let stockItems = [];
  try {
    const raw = localStorage.getItem(stockKey) || localStorage.getItem('app_stock_items_global') || '[]';
    stockItems = JSON.parse(raw);
    if (!Array.isArray(stockItems)) stockItems = [];
  } catch (e) { stockItems = []; }

  let targetItem = stockItems.find(
    i => (i.id && i.id.toLowerCase() === cleanItem.toLowerCase()) || 
         (i.item_name && i.item_name.toLowerCase() === cleanItem.toLowerCase())
  );

  if (!targetItem) {
    targetItem = {
      id: `ITEM-${Date.now()}`,
      item_name: cleanItem,
      unit: cleanItem.toLowerCase().includes('diesel') ? 'Liters' : 'Units',
      current_stock: qty,
      unit_purchase_price: rate,
      last_updated: new Date().toISOString()
    };
    stockItems.push(targetItem);
  } else {
    const existingStock = parseFloat(targetItem.current_stock || 0);
    const existingValuation = existingStock * parseFloat(targetItem.unit_purchase_price || 0);
    const newStock = existingStock + qty;
    const newValuation = existingValuation + totalAmount;

    targetItem.current_stock = newStock;
    targetItem.unit_purchase_price = newStock > 0 ? parseFloat((newValuation / newStock).toFixed(2)) : rate;
    targetItem.last_updated = new Date().toISOString();
  }

  localStorage.setItem(stockKey, JSON.stringify(stockItems));
  localStorage.setItem('app_stock_items_global', JSON.stringify(stockItems));
  localStorage.setItem('app_stock_items', JSON.stringify(stockItems));

  // 2. DOUBLE-ENTRY JOURNAL VOUCHER (Daybook & P&L / Balance Sheet)
  const voucherKey = `app_vouchers_${targetId}`;
  let vouchers = [];
  try {
    const rawV = localStorage.getItem(voucherKey) || localStorage.getItem('app_vouchers_global') || '[]';
    vouchers = JSON.parse(rawV);
    if (!Array.isArray(vouchers)) vouchers = [];
  } catch (e) { vouchers = []; }

  const expenseHead = cleanItem.toLowerCase().includes('diesel') ? 'Diesel Expenses' : `${cleanItem} Purchases`;

  const newVoucher = {
    id: voucherId,
    voucher_date: vDate,
    date: vDate,
    voucher_type: 'PURCHASE',
    dr_account: expenseHead,       // Debit: Kharcha / Stock Asset
    cr_account: supplier_account,  // Credit: Vendor / Creditor
    amount: totalAmount,
    narration: `Purchase Inward Bill #${invoice_number || 'N/A'}: ${cleanItem} (${qty} ${targetItem.unit} @ ₹${rate})`,
    created_at: new Date().toISOString()
  };

  vouchers.unshift(newVoucher);
  localStorage.setItem(voucherKey, JSON.stringify(vouchers));
  localStorage.setItem('app_vouchers_global', JSON.stringify(vouchers));
  localStorage.setItem('app_vouchers', JSON.stringify(vouchers));

  // 3. MASTER ACCOUNT REGISTRY RECONCILIATION (Account Milan)
  const accKey = `app_accounts_${targetId}`;
  let accounts = [];
  try {
    const rawAcc = localStorage.getItem(accKey) || localStorage.getItem('app_accounts_global') || '[]';
    accounts = JSON.parse(rawAcc);
    if (!Array.isArray(accounts)) accounts = [];
  } catch (e) { accounts = []; }

  if (!accounts.some(a => a.account_name.toLowerCase() === supplier_account.toLowerCase())) {
    accounts.push({
      id: `ACC-${Date.now()}-1`,
      account_name: supplier_account,
      account_group: 'SUNDRY_CREDITORS',
      sub_group: 'SUNDRY_CREDITORS',
      opening_balance: 0,
      balance_type: 'Cr'
    });
  }

  if (!accounts.some(a => a.account_name.toLowerCase() === expenseHead.toLowerCase())) {
    accounts.push({
      id: `ACC-${Date.now()}-2`,
      account_name: expenseHead,
      account_group: 'DIRECT_EXPENSES',
      sub_group: 'DIRECT_EXPENSES',
      opening_balance: 0,
      balance_type: 'Dr'
    });
  }

  localStorage.setItem(accKey, JSON.stringify(accounts));
  localStorage.setItem('app_accounts_global', JSON.stringify(accounts));
  localStorage.setItem('app_accounts', JSON.stringify(accounts));

  // 4. ATOMIC EVENT BROADCAST
  window.dispatchEvent(new Event('accounts_master_updated'));
  window.dispatchEvent(new Event('vouchers_updated'));
  window.dispatchEvent(new Event('stock_updated'));
  window.dispatchEvent(new Event('storage'));

  return { voucherId, totalAmount, updatedStock: targetItem.current_stock, party: supplier_account };
};
