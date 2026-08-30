// frontend/src/utils/salesPostingEngine.js

export const processSalesInvoicePosting = (invoicePayload) => {
  const { customerId, customerName, invoiceDate, taxableAmount, gstRate, items, narration } = invoicePayload;

  const numericTaxable = parseFloat(taxableAmount || 0);
  const numericGstRate = parseFloat(gstRate || 0);
  const gstAmount = (numericTaxable * numericGstRate) / 100;
  const grandTotal = numericTaxable + gstAmount;

  if (grandTotal <= 0) {
    throw new Error("Invalid Invoice: Invoice Total must be greater than zero.");
  }

  // 1. Fetch State
  const accounts = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
  const journalEntries = JSON.parse(localStorage.getItem('app_journal_entries') || '[]');
  const vouchers = JSON.parse(localStorage.getItem('app_vouchers') || '[]');
  const invoices = JSON.parse(localStorage.getItem('app_invoices') || '[]');

  // 2. Find or Create Customer Account Head
  let customerAccIndex = accounts.findIndex(a => a.id === customerId || a.name === customerName);
  let customerAcc;

  if (customerAccIndex === -1) {
    customerAcc = {
      id: customerId || `ACC-CUST-${Date.now()}`,
      name: customerName,
      sub_group: 'SUNDRY_DEBTORS',
      primary_type: 'ASSET',
      opening_balance: 0,
      current_balance: grandTotal
    };
    accounts.push(customerAcc);
  } else {
    customerAcc = accounts[customerAccIndex];
    const curBal = parseFloat(customerAcc.current_balance || customerAcc.opening_balance || 0);
    customerAcc.current_balance = curBal + grandTotal; // Asset Increases with Debit
    accounts[customerAccIndex] = customerAcc;
  }

  // 3. Generate Double-Entry Lines
  const voucherId = `INV-${Date.now()}`;
  
  // Debit Customer
  const drCustomerLine = {
    id: `JL-${Date.now()}-1`,
    voucher_id: voucherId,
    account_id: customerAcc.id,
    account_name: customerAcc.name,
    date: invoiceDate,
    debit: grandTotal,
    credit: 0,
    narration: narration || `Sales Invoice #${voucherId}`
  };

  // Credit Sales Revenue
  const crSalesLine = {
    id: `JL-${Date.now()}-2`,
    voucher_id: voucherId,
    account_id: 'ACC-SALES-MASTER',
    account_name: 'Sales Revenue Account',
    date: invoiceDate,
    debit: 0,
    credit: numericTaxable,
    narration: `Sales Revenue for Invoice #${voucherId}`
  };

  const newJournalLines = [drCustomerLine, crSalesLine];

  // Credit GST Output if applicable
  if (gstAmount > 0) {
    newJournalLines.push({
      id: `JL-${Date.now()}-3`,
      voucher_id: voucherId,
      account_id: 'ACC-GST-OUTPUT',
      account_name: 'GST Output Payable Account',
      date: invoiceDate,
      debit: 0,
      credit: gstAmount,
      narration: `GST Output @ ${numericGstRate}% for Invoice #${voucherId}`
    });
  }

  const invoiceRecord = {
    id: voucherId,
    invoice_number: voucherId,
    customer_id: customerAcc.id,
    customer_name: customerAcc.name,
    date: invoiceDate,
    taxable_amount: numericTaxable,
    gst_amount: gstAmount,
    total_amount: grandTotal,
    created_at: new Date().toISOString()
  };

  // 4. Commit State & Broadcast
  localStorage.setItem('app_account_heads', JSON.stringify(accounts));
  localStorage.setItem('app_journal_entries', JSON.stringify([...newJournalLines, ...journalEntries]));
  localStorage.setItem('app_vouchers', JSON.stringify([{ id: voucherId, voucher_type: 'SALES', date: invoiceDate, dr_account_name: customerAcc.name, cr_account_name: 'Sales Revenue', amount: grandTotal }, ...vouchers]));
  localStorage.setItem('app_invoices', JSON.stringify([invoiceRecord, ...invoices]));

  // Fire Reactive Event
  window.dispatchEvent(new CustomEvent('ACCOUNT_BOOK_VOUCHER_POSTED', { detail: invoiceRecord }));
  window.dispatchEvent(new Event('storage'));

  return invoiceRecord;
};
