// frontend/src/utils/salesPostingEngine.js
import { StorageService } from './storageSync';

export const processSalesInvoicePosting = (invoicePayload, firmId = 'FIRM-001') => {
  const activeFirmId = invoicePayload?.firmId || firmId || 'FIRM-001';
  const { customerId, invoiceDate, taxableAmount, gstRate, narration } = invoicePayload;

  const numericTaxable = parseFloat(taxableAmount || 0);
  const numericGstRate = parseFloat(gstRate || 0);
  const gstAmount = (numericTaxable * numericGstRate) / 100;
  const grandTotal = numericTaxable + gstAmount;

  if (grandTotal <= 0) {
    throw new Error("Invalid Bill Amount: Bill Value zero se bada hona chahiye.");
  }

  // 1. Fetch Firm-Scoped Storage Buckets with Fallbacks
  const accountsKey = `app_accounts_${activeFirmId}`;
  const journalKey = `app_journal_entries_${activeFirmId}`;
  const vouchersKey = `account_book_vouchers_${activeFirmId}`;
  const invoicesKey = `app_invoices_${activeFirmId}`;

  const accounts = StorageService.getItem(accountsKey) || StorageService.getItem('app_account_heads') || [];
  const journalEntries = StorageService.getItem(journalKey) || StorageService.getItem('app_journal_entries') || [];
  const vouchers = StorageService.getItem(vouchersKey) || StorageService.getItem('account_book_vouchers') || [];
  const invoices = StorageService.getItem(invoicesKey) || StorageService.getItem('app_invoices') || [];

  // 2. Find Customer Account
  const customerIndex = accounts.findIndex(a => String(a.id) === String(customerId) || a.account_name === customerId);
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
    account_id: customerAcc.id || customerId,
    account_name: customerAcc.account_name || customerAcc.name,
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
    firm_id: activeFirmId,
    invoice_number: invoiceId,
    customer_id: customerAcc.id || customerId,
    customer_name: customerAcc.account_name || customerAcc.name,
    date: invoiceDate,
    taxable_amount: numericTaxable,
    gst_amount: gstAmount,
    total_amount: grandTotal,
    created_at: new Date().toISOString()
  };

  const newVoucher = {
    id: invoiceId,
    firm_id: activeFirmId,
    voucher_type: 'SALES',
    type: 'SALES',
    voucher_date: invoiceDate,
    date: invoiceDate,
    reference_no: invoiceId,
    dr_account: customerAcc.account_name || customerAcc.name,
    cr_account: 'Sales Revenue Account',
    amount: grandTotal,
    total_amount: grandTotal,
    narration: narration || `Sales Invoice #${invoiceId}`,
    entries: [
      { account_name: customerAcc.account_name || customerAcc.name, type: 'DR', debit: grandTotal, credit: 0, amount: grandTotal },
      { account_name: 'Sales Revenue Account', type: 'CR', debit: 0, credit: numericTaxable, amount: numericTaxable },
      ...(gstAmount > 0 ? [{ account_name: 'GST Output Payable Account', type: 'CR', debit: 0, credit: gstAmount, amount: gstAmount }] : [])
    ],
    created_at: new Date().toISOString()
  };

  // 4. Atomic Scoped Local Storage Commit
  StorageService.setItem(accountsKey, accounts);
  StorageService.setItem('app_account_heads', accounts); // Global mirror

  const updatedJournal = [...newJournalLines, ...journalEntries];
  StorageService.setItem(journalKey, updatedJournal);
  StorageService.setItem('app_journal_entries', updatedJournal);

  const updatedVouchers = [newVoucher, ...(Array.isArray(vouchers) ? vouchers : [])];
  StorageService.setItem(vouchersKey, updatedVouchers);
  StorageService.setItem('account_book_vouchers', updatedVouchers);

  const updatedInvoices = [invoiceRecord, ...(Array.isArray(invoices) ? invoices : [])];
  StorageService.setItem(invoicesKey, updatedInvoices);
  StorageService.setItem('app_invoices', updatedInvoices);

  // 5. Global Reactive Broadcast (Triggers instant updates across Ledger, Day Book & Dashboard)
  window.dispatchEvent(new CustomEvent('ACCOUNT_BOOK_VOUCHER_POSTED', { detail: invoiceRecord }));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('storage'));

  return invoiceRecord;
};
