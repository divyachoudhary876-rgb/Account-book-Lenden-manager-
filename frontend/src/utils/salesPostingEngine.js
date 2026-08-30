// frontend/src/utils/salesPostingEngine.js

export const processSalesInvoicePosting = (invoicePayload) => {
  const { customerId, invoiceDate, taxableAmount, gstRate, narration } = invoicePayload;

  const numericTaxable = parseFloat(taxableAmount || 0);
  const numericGstRate = parseFloat(gstRate || 0);
  const gstAmount = (numericTaxable * numericGstRate) / 100;
  const grandTotal = numericTaxable + gstAmount;

  if (grandTotal <= 0) {
    throw new Error("Invalid Bill Amount: Bill Value zero se bada hona chahiye.");
  }

  // 1. Fetch Local Storage Buckets
  const accounts = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
  const journalEntries = JSON.parse(localStorage.getItem('app_journal_entries') || '[]');
  const vouchers = JSON.parse(localStorage.getItem('app_vouchers') || '[]');
  const invoices = JSON.parse(localStorage.getItem('app_invoices') || '[]');

  // 2. Find Customer Account
  const customerIndex = accounts.findIndex(a => a.id === customerId);
  if (customerIndex === -1) {
    throw new Error("Party Not Found: Kripya valid Customer Party select karein.");
  }

  const customerAcc = { ...accounts[customerIndex] };
  const currentBal = parseFloat(customerAcc.current_balance || customerAcc.opening_balance || 0);

  // Asset (Debtor) balance increases with Debit (+)
  customerAcc.current_balance = currentBal + grandTotal;
  accounts[customerIndex] = customerAcc;

  // 3. Generate Double-Entry Journal Lines
  const invoiceId = `INV-${Date.now()}`;
  
  // Debit Line: Customer
  const drCustomerLine = {
    id: `JL-${Date.now()}-DR`,
    voucher_id: invoiceId,
    account_id: customerAcc.id,
    account_name: customerAcc.name,
    date: invoiceDate,
    debit: grandTotal,
    credit: 0,
    narration: narration || `Sales Bill #${invoiceId}`
  };

  // Credit Line: Sales Revenue
  const crSalesLine = {
    id: `JL-${Date.now()}-CR1`,
    voucher_id: invoiceId,
    account_id: 'ACC-SALES-MASTER',
    account_name: 'Sales Revenue Account',
    date: invoiceDate,
    debit: 0,
    credit: numericTaxable,
    narration: `Sales Revenue for Bill #${invoiceId}`
  };

  const newJournalLines = [drCustomerLine, crSalesLine];

  // Credit Line: GST Output Tax (If applicable)
  if (gstAmount > 0) {
    newJournalLines.push({
      id: `JL-${Date.now()}-CR2`,
      voucher_id: invoiceId,
      account_id: 'ACC-GST-OUTPUT',
      account_name: 'GST Output Payable Account',
      date: invoiceDate,
      debit: 0,
      credit: gstAmount,
      narration: `GST Output @ ${numericGstRate}% for Bill #${invoiceId}`
    });
  }

  const invoiceRecord = {
    id: invoiceId,
    invoice_number: invoiceId,
    customer_id: customerAcc.id,
    customer_name: customerAcc.name,
    date: invoiceDate,
    taxable_amount: numericTaxable,
    gst_amount: gstAmount,
    total_amount: grandTotal,
    created_at: new Date().toISOString()
  };

  // 4. Atomic Local Storage Commit
  localStorage.setItem('app_account_heads', JSON.stringify(accounts));
  localStorage.setItem('app_journal_entries', JSON.stringify([...newJournalLines, ...journalEntries]));
  localStorage.setItem('app_vouchers', JSON.stringify([{ id: invoiceId, voucher_type: 'SALES', date: invoiceDate, dr_account_name: customerAcc.name, cr_account_name: 'Sales Revenue', amount: grandTotal }, ...vouchers]));
  localStorage.setItem('app_invoices', JSON.stringify([invoiceRecord, ...invoices]));

  // 5. Global Reactive Broadcast (Triggers instant updates across Ledger, Day Book & Dashboard)
  window.dispatchEvent(new CustomEvent('ACCOUNT_BOOK_VOUCHER_POSTED', { detail: invoiceRecord }));
  window.dispatchEvent(new Event('storage'));

  return invoiceRecord;
};
