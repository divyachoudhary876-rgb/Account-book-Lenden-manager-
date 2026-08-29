const db = require('../config/db');

exports.createSalesInvoice = async (req, res) => {
  const client = await db.connect();
  try {
    const { customer_id, invoice_date, items_list, company_state_code } = req.body;
    await client.query('BEGIN');

    const custRes = await client.query('SELECT state_code FROM customers WHERE id = $1', [customer_id]);
    if (custRes.rows.length === 0) throw new Error('Customer not found');

    const isIntraState = custRes.rows[0].state_code === company_state_code;
    let subtotal = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0, grandTotal = 0;
    const processedItems = [];

    for (let item of items_list) {
      const itemRes = await client.query('SELECT * FROM items WHERE id = $1 FOR UPDATE', [item.item_id]);
      const dbItem = itemRes.rows[0];

      if (!dbItem || dbItem.current_stock < item.quantity) {
        throw new Error(`Insufficient stock for item: ${dbItem ? dbItem.name : item.item_id}`);
      }

      const taxable = item.quantity * item.unit_price;
      let cgst = 0, sgst = 0, igst = 0;

      if (isIntraState) {
        cgst = (taxable * (dbItem.gst_rate / 2)) / 100;
        sgst = (taxable * (dbItem.gst_rate / 2)) / 100;
      } else {
        igst = (taxable * dbItem.gst_rate) / 100;
      }

      const lineTotal = taxable + cgst + sgst + igst;
      subtotal += taxable;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;
      grandTotal += lineTotal;

      processedItems.push({ ...item, taxable, cgst, sgst, igst, lineTotal, gst_rate: dbItem.gst_rate });

      await client.query('UPDATE items SET current_stock = current_stock - $1 WHERE id = $2', [item.quantity, item.item_id]);
    }

    const invNum = `INV-${Date.now().toString().slice(-6)}`;
    const invRes = await client.query(
      `INSERT INTO sales_invoices (invoice_number, invoice_date, customer_id, subtotal, total_cgst, total_sgst, total_igst, grand_total) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [invNum, invoice_date, customer_id, subtotal, totalCgst, totalSgst, totalIgst, grandTotal]
    );
    const invoiceId = invRes.rows[0].id;

    for (let p of processedItems) {
      await client.query(
        `INSERT INTO sales_invoice_items (invoice_id, item_id, quantity, unit_price, taxable_value, cgst_amount, sgst_amount, igst_amount, total_amount) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [invoiceId, p.item_id, p.quantity, p.unit_price, p.taxable, p.cgst, p.sgst, p.igst, p.lineTotal]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, invoice_id: invoiceId, invoice_number: invNum });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};
