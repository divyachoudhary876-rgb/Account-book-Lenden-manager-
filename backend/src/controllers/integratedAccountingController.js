const db = require('../config/db');
const PDFDocument = require('pdfkit'); // Ensure npm install pdfkit

// ==========================================
// MODULE 1: AUTOMATED DOUBLE-ENTRY ENGINE
// ==========================================
async function postJournalEntry(client, { entry_date, reference_id, narration, debit_acc_code, credit_acc_code, amount, sub_account_id = null }) {
  if (amount <= 0) throw new Error('Journal amount must be positive');

  const journalRes = await client.query(
    `INSERT INTO journal_entries (entry_date, reference_id, narration) VALUES ($1, $2, $3) RETURNING id`,
    [entry_date, reference_id, narration]
  );
  const journalId = journalRes.rows[0].id;

  const debitAcc = await client.query('SELECT id FROM accounts WHERE account_code = $1', [debit_acc_code]);
  const creditAcc = await client.query('SELECT id FROM accounts WHERE account_code = $1', [credit_acc_code]);

  if (!debitAcc.rows[0] || !creditAcc.rows[0]) {
    throw new Error(`Account code invalid: ${debit_acc_code} or ${credit_acc_code}`);
  }

  // Debit Entry
  await client.query(
    `INSERT INTO journal_items (journal_id, account_id, debit_amount, credit_amount) VALUES ($1, $2, $3, 0.00)`,
    [journalId, debitAcc.rows[0].id, amount]
  );

  // Credit Entry
  await client.query(
    `INSERT INTO journal_items (journal_id, account_id, debit_amount, credit_amount) VALUES ($1, $2, 0.00, $3)`,
    [journalId, creditAcc.rows[0].id, amount]
  );

  return journalId;
}

// ==========================================
// MODULE 2: PAYMENT RECEIPT & KNOCK-OFF
// ==========================================
exports.createPaymentReceipt = async (req, res) => {
  const client = await db.connect();
  try {
    const { customer_id, receipt_date, amount_received, payment_mode, reference_number, invoice_settlements } = req.body;
    await client.query('BEGIN');

    const receiptNum = `REC-${Date.now().toString().slice(-6)}`;
    const recRes = await client.query(
      `INSERT INTO payment_receipts (receipt_number, receipt_date, customer_id, amount_received, payment_mode, reference_number) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [receiptNum, receipt_date, customer_id, amount_received, payment_mode, reference_number]
    );
    const receiptId = recRes.rows[0].id;

    // Direct Invoice Settlement / Knock-off
    let totalSettled = 0;
    if (invoice_settlements && invoice_settlements.length > 0) {
      for (let item of invoice_settlements) {
        await client.query(
          `INSERT INTO receipt_invoice_settlements (receipt_id, invoice_id, settled_amount) VALUES ($1, $2, $3)`,
          [receiptId, item.invoice_id, item.settled_amount]
        );
        totalSettled += Number(item.settled_amount);
      }
    }

    if (totalSettled > amount_received) {
      throw new Error('Settlement amount cannot exceed total payment received');
    }

    // Ledger Engine Trigger: Debit Cash/Bank & Credit Customer (Accounts Receivable)
    const assetAccount = payment_mode === 'CASH' ? 'CASH_IN_HAND' : 'BANK_ACCOUNT';
    await postJournalEntry(client, {
      entry_date: receipt_date,
      reference_id: receiptId,
      narration: `Payment received via ${payment_mode} - Ref: ${receiptNum}`,
      debit_acc_code: assetAccount,
      credit_acc_code: 'ACCOUNTS_RECEIVABLE',
      amount: amount_received
    });

    await client.query('COMMIT');
    res.status(201).json({ success: true, receipt_id: receiptId, receipt_number: receiptNum });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

// ==========================================
// MODULE 3: PDF INVOICE GENERATOR API
// ==========================================
exports.generateInvoicePDF = async (req, res) => {
  try {
    const { invoice_id } = req.params;

    const invRes = await db.query(
      `SELECT i.*, c.name as customer_name, c.gstin as customer_gstin 
       FROM sales_invoices i 
       JOIN customers c ON i.customer_id = c.id 
       WHERE i.id = $1`, 
      [invoice_id]
    );
    
    if (invRes.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
    const inv = invRes.rows[0];

    const itemsRes = await db.query(
      `SELECT sii.*, item.name FROM sales_invoice_items sii JOIN items item ON sii.item_id = item.id WHERE sii.invoice_id = $1`,
      [invoice_id]
    );

    const doc = new PDFDocument({ margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=Invoice_${inv.invoice_number}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('TAX INVOICE', { align: 'center' }).moveDown();
    doc.fontSize(12).text(`Invoice No: ${inv.invoice_number}`);
    doc.text(`Date: ${inv.invoice_date}`);
    doc.text(`Customer Name: ${inv.customer_name}`);
    doc.text(`GSTIN: ${inv.customer_gstin || 'N/A'}`).moveDown();

    // Table Header
    doc.fontSize(10).text('Item Name | Qty | Unit Price | Taxable | Total Amount');
    doc.text('------------------------------------------------------------------');

    itemsRes.rows.forEach(item => {
      doc.text(`${item.name} | ${item.quantity} | ₹${item.unit_price} | ₹${item.taxable_value} | ₹${item.total_amount}`);
    });

    doc.moveDown();
    doc.fontSize(12).text(`Subtotal: ₹${inv.subtotal}`);
    doc.text(`CGST: ₹${inv.total_cgst} | SGST: ₹${inv.total_sgst} | IGST: ₹${inv.total_igst}`);
    doc.fontSize(14).text(`Grand Total: ₹${inv.grand_total}`, { bold: true });

    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
