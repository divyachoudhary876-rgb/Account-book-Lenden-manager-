const db = require('../config/db');

exports.settleCustomerInvoicesFIFO = async (req, res) => {
  const client = await db.connect();
  try {
    const { organization_id } = req.user;
    const { customer_id, receipt_id, total_received_amount } = req.body;

    await client.query('BEGIN');

    let remainingAmount = Number(total_received_amount);

    // Fetch Outstanding Invoices in FIFO order
    const invRes = await client.query(
      `SELECT id, invoice_number, grand_total, 
              COALESCE((SELECT SUM(settled_amount) FROM bill_wise_settlements WHERE invoice_id = sales_invoices.id), 0) as paid_amount
       FROM sales_invoices 
       WHERE organization_id = $1 AND customer_id = $2
       ORDER BY invoice_date ASC`,
      [organization_id, customer_id]
    );

    for (let inv of invRes.rows) {
      const dueAmount = Number(inv.grand_total) - Number(inv.paid_amount);
      
      if (dueAmount > 0 && remainingAmount > 0) {
        const settleAmount = Math.min(dueAmount, remainingAmount);

        await client.query(
          `INSERT INTO bill_wise_settlements (receipt_id, invoice_id, settled_amount) VALUES ($1, $2, $3)`,
          [receipt_id, inv.id, settleAmount]
        );

        remainingAmount -= settleAmount;
      }
    }

    await client.query('COMMIT');
    res.status(200).json({
      success: true,
      message: 'Payment auto-adjusted against pending invoices successfully.',
      unadjusted_balance: remainingAmount
    });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};
