const db = require('../config/db');

exports.createVoucherEntry = async (req, res) => {
  const client = await db.connect();
  try {
    const { organization_id, id: user_id } = req.user;
    const { voucher_type, voucher_date, financial_year, narration, line_items, attachment_url } = req.body;

    await client.query('BEGIN');

    // 1. Calculate and Validate Double-Entry Balance
    let totalDebit = 0;
    let totalCredit = 0;

    for (let item of line_items) {
      if (item.entry_type === 'DR') {
        totalDebit += Number(item.amount);
      } else if (item.entry_type === 'CR') {
        totalCredit += Number(item.amount);
      } else {
        throw new Error('Invalid Entry Type. Must be DR or CR.');
      }
    }

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new Error(`Accounting Rule Violation: Total Debit (₹${totalDebit}) does not match Total Credit (₹${totalCredit})`);
    }

    if (totalDebit <= 0) {
      throw new Error('Voucher amount must be greater than 0');
    }

    // 2. Auto-Generate Voucher Number Sequence (e.g., JV/2026-27/0001)
    const countRes = await client.query(
      `SELECT COUNT(*) FROM vouchers 
       WHERE organization_id = $1 AND voucher_type = $2 AND financial_year = $3`,
      [organization_id, voucher_type, financial_year]
    );
    const seq = Number(countRes.rows[0].count) + 1;
    const prefixMap = { JOURNAL: 'JV', PAYMENT: 'PAY', RECEIPT: 'REC', CONTRA: 'CNT', SALES: 'SL', PURCHASE: 'PUR' };
    const prefix = prefixMap[voucher_type] || 'VCH';
    const voucherNumber = `${prefix}/${financial_year}/${seq.toString().padStart(4, '0')}`;

    // 3. Save Voucher Header
    const vchRes = await client.query(
      `INSERT INTO vouchers (organization_id, voucher_type, voucher_number, voucher_date, financial_year, narration, total_amount, attachment_url, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [organization_id, voucher_type, voucherNumber, voucher_date, financial_year, narration, totalDebit, attachment_url || null, user_id]
    );
    const voucherId = vchRes.rows[0].id;

    // 4. Save Voucher Line Items & Update General Ledger
    for (let item of line_items) {
      await client.query(
        `INSERT INTO voucher_items (voucher_id, account_id, cost_center_id, entry_type, amount, particulars) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [voucherId, item.account_id, item.cost_center_id || null, item.entry_type, item.amount, item.particulars || narration]
      );
    }

    // 5. Immutable Audit Trail Entry
    await client.query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_name, entity_id) VALUES ($1, $2, $3, $4, $5)`,
      [organization_id, user_id, 'CREATE_VOUCHER', 'vouchers', voucherId]
    );

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      voucher_id: voucherId,
      voucher_number: voucherNumber,
      message: 'Voucher posted successfully and balanced in General Ledger.'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};
