const db = require('../config/db');

exports.createProductionSalesInvoice = async (req, res) => {
  const client = await db.connect();
  try {
    const { organization_id, id: user_id } = req.user;
    const { customer_id, invoice_date, financial_year, items_list, company_state_code } = req.body;

    await client.query('BEGIN');

    // 1. Thread-Safe Atomic Invoice Sequence Generator
    await client.query(
      `INSERT INTO invoice_sequences (organization_id, financial_year, last_sequence)
       VALUES ($1, $2, 1)
       ON CONFLICT (organization_id, financial_year)
       DO UPDATE SET last_sequence = invoice_sequences.last_sequence + 1`,
      [organization_id, financial_year]
    );

    const seqRes = await client.query(
      `SELECT last_sequence FROM invoice_sequences WHERE organization_id = $1 AND financial_year = $2`,
      [organization_id, financial_year]
    );
    const seq = seqRes.rows[0].last_sequence;
    const invoiceNumber = `INV/${financial_year}/${seq.toString().padStart(5, '0')}`;

    // 2. Customer & Tax Validation
    const custRes = await client.query(
      `SELECT state_code, ledger_account_id FROM customers WHERE id = $1 AND organization_id = $2`,
      [customer_id, organization_id]
    );
    if (!custRes.rows[0]) throw new Error('Customer account invalid');
    
    const customer = custRes.rows[0];
    const isIntraState = customer.state_code === company_state_code;

    let subtotal = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0, totalCogs = 0;
    const processedItems = [];

    // 3. FIFO Stock Allocation & Calculation Loop
    for (let item of items_list) {
      const itemRes = await client.query(
        `SELECT * FROM items WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [item.item_id, organization_id]
      );
      const dbItem = itemRes.rows[0];

      if (!dbItem || Number(dbItem.current_stock) < Number(item.quantity)) {
        throw new Error(`Insufficient stock for item: ${dbItem ? dbItem.name : item.item_id}`);
      }

      // FIFO Cost Allocation for COGS
      let remainingQtyToDeduct = Number(item.quantity);
      let lineCogs = 0;

      const batches = await client.query(
        `SELECT * FROM inventory_batches 
         WHERE item_id = $1 AND organization_id = $2 AND quantity_remaining > 0 
         ORDER BY created_at ASC FOR UPDATE`,
        [item.item_id, organization_id]
      );

      for (let batch of batches.rows) {
        if (remainingQtyToDeduct <= 0) break;
        const takeQty = Math.min(remainingQtyToDeduct, Number(batch.quantity_remaining));
        lineCogs += takeQty * Number(batch.unit_cost);
        remainingQtyToDeduct -= takeQty;

        await client.query(
          `UPDATE inventory_batches SET quantity_remaining = quantity_remaining - $1 WHERE id = $2`,
          [takeQty, batch.id]
        );
      }

      totalCogs += lineCogs;

      // Tax Logic
      const taxable = Number(item.quantity) * Number(item.unit_price);
      let cgst = 0, sgst = 0, igst = 0;

      if (isIntraState) {
        cgst = Math.round((taxable * (dbItem.gst_rate / 2)) / 100 * 100) / 100;
        sgst = Math.round((taxable * (dbItem.gst_rate / 2)) / 100 * 100) / 100;
      } else {
        igst = Math.round((taxable * dbItem.gst_rate) / 100 * 100) / 100;
      }

      const lineTotal = taxable + cgst + sgst + igst;
      subtotal += taxable;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;

      processedItems.push({ ...item, taxable, cgst, sgst, igst, lineTotal });

      // Deduct Master Inventory
      await client.query(`UPDATE items SET current_stock = current_stock - $1 WHERE id = $2`, [item.quantity, item.item_id]);
    }

    const calculatedGrandTotal = subtotal + totalCgst + totalSgst + totalIgst;
    const roundedGrandTotal = Math.round(calculatedGrandTotal);
    const roundOffAmount = Math.round((roundedGrandTotal - calculatedGrandTotal) * 100) / 100;

    // 4. Save Invoice Record Header
    const invRes = await client.query(
      `INSERT INTO sales_invoices (organization_id, invoice_number, invoice_date, customer_id, subtotal, total_cgst, total_sgst, total_igst, grand_total) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [organization_id, invoiceNumber, invoice_date, customer_id, subtotal, totalCgst, totalSgst, totalIgst, roundedGrandTotal]
    );
    const invoiceId = invRes.rows[0].id;

    // 5. Automated Ledger Postings
    const journalRes = await client.query(
      `INSERT INTO journal_entries (organization_id, entry_date, reference_id, narration, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [organization_id, invoice_date, invoiceId, `Invoice Posting: ${invoiceNumber}`, user_id]
    );
    const journalId = journalRes.rows[0].id;

    const getAcc = async (code) => {
      const res = await client.query('SELECT id FROM accounts WHERE account_code = $1 AND organization_id = $2', [code, organization_id]);
      return res.rows[0]?.id;
    };

    // Debit Customer (Receivable) = Rounded Grand Total
    await client.query(`INSERT INTO journal_items (journal_id, account_id, debit_amount, credit_amount) VALUES ($1, $2, $3, 0)`, [journalId, customer.ledger_account_id, roundedGrandTotal]);
    // Credit Sales Account = Subtotal
    await client.query(`INSERT INTO journal_items (journal_id, account_id, debit_amount, credit_amount) VALUES ($1, $2, 0, $3)`, [journalId, await getAcc('SALES_INCOME'), subtotal]);
    // Taxes Credit
    if (isIntraState) {
      await client.query(`INSERT INTO journal_items (journal_id, account_id, debit_amount, credit_amount) VALUES ($1, $2, 0, $3)`, [journalId, await getAcc('DUTIES_CGST'), totalCgst]);
      await client.query(`INSERT INTO journal_items (journal_id, account_id, debit_amount, credit_amount) VALUES ($1, $2, 0, $3)`, [journalId, await getAcc('DUTIES_SGST'), totalSgst]);
    } else {
      await client.query(`INSERT INTO journal_items (journal_id, account_id, debit_amount, credit_amount) VALUES ($1, $2, 0, $3)`, [journalId, await getAcc('DUTIES_IGST'), totalIgst]);
    }

    // Auto Round-Off Ledger Entry
    if (Math.abs(roundOffAmount) > 0) {
      const roundAcc = await getAcc('ROUND_OFF');
      if (roundOffAmount > 0) {
        await client.query(`INSERT INTO journal_items (journal_id, account_id, debit_amount, credit_amount) VALUES ($1, $2, 0, $3)`, [journalId, roundAcc, roundOffAmount]);
      } else {
        await client.query(`INSERT INTO journal_items (journal_id, account_id, debit_amount, credit_amount) VALUES ($1, $2, $3, 0)`, [journalId, roundAcc, Math.abs(roundOffAmount)]);
      }
    }

    // COGS vs Inventory Ledger Entry
    if (totalCogs > 0) {
      const cogsJournal = await client.query(
        `INSERT INTO journal_entries (organization_id, entry_date, reference_id, narration, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [organization_id, invoice_date, invoiceId, `COGS Posting for ${invoiceNumber}`, user_id]
      );
      await client.query(`INSERT INTO journal_items (journal_id, account_id, debit_amount, credit_amount) VALUES ($1, $2, $3, 0)`, [cogsJournal.rows[0].id, await getAcc('COGS'), totalCogs]);
      await client.query(`INSERT INTO journal_items (journal_id, account_id, debit_amount, credit_amount) VALUES ($1, $2, 0, $3)`, [cogsJournal.rows[0].id, await getAcc('INVENTORY_ASSET'), totalCogs]);
    }

    // Refresh Materialized View
    await client.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_account_balances`);

    await client.query('COMMIT');
    res.status(201).json({ success: true, invoice_id: invoiceId, invoice_number: invoiceNumber });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};
