// frontend/src/utils/salesInvoicingEngine.js

export const processSalesInvoiceSubmission = (firmId, payload) => {
  const targetId = firmId || 'FIRM-001';
  const { customer_account, item_name, quantity, unit_rate, invoice_number, voucher_date } = payload;

  const qty = parseFloat(quantity || 0);
  const rate = parseFloat(unit_rate || 0);
  const totalAmount = parseFloat((qty * rate).toFixed(2));
  const vDate = voucher_date || new Date().toISOString().split('T')[0];
  const voucherId = `INV-${Date.now()}`;
  const cleanItem = (item_name || 'Standard Item').trim();

  if (!customer_account || qty <= 0 || rate <= 0) {
    throw new Error("⚠️ Customer Account, Quantity (>0) aur Selling Rate (>0) enter karna mandatory hai.");
  }

  // 1. INVENTORY STOCK REDUCTION (-OUT)
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
    throw new Error(`⚠️ Item "${cleanItem}" inventory me maujood nahi hai.`);
  }

  const currentStock = parseFloat(targetItem.current_stock || 0);
  if (currentStock < qty) {
    throw new Error(`⚠️ Insufficient Stock! Stock me sirf ${currentStock} ${targetItem.unit || 'Units'} bache hain.`);
  }

  targetItem.current_stock = currentStock - qty;
  targetItem.selling_price = rate;
  targetItem.last_updated = new Date().toISOString();

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

  const newVoucher = {
    id: voucherId,
    voucher_date: vDate,
    date: vDate,
    voucher_type: 'SALES',
    dr_account: customer_account,  // Debit: Customer (Receivable Asset)
    cr_account: 'Sales & Revenue', // Credit: Sales Income
    amount: totalAmount,
    narration: `Sales Invoice #${invoice_number || 'N/A'}: ${cleanItem} (${qty} ${targetItem.unit || 'Units'} @ ₹${rate})`,
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

  if (!accounts.some(a => a.account_name.toLowerCase() === customer_account.toLowerCase())) {
    accounts.push({
      id: `ACC-${Date.now()}-1`,
      account_name: customer_account,
      account_group: 'SUNDRY_DEBTORS',
      sub_group: 'SUNDRY_DEBTORS',
      opening_balance: 0,
      balance_type: 'Dr'
    });
  }

  if (!accounts.some(a => a.account_name.toLowerCase() === 'sales & revenue')) {
    accounts.push({
      id: `ACC-${Date.now()}-2`,
      account_name: 'Sales & Revenue',
      account_group: 'INCOME',
      sub_group: 'INCOME',
      opening_balance: 0,
      balance_type: 'Cr'
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

  return { voucherId, totalAmount, updatedStock: targetItem.current_stock, party: customer_account };
};
