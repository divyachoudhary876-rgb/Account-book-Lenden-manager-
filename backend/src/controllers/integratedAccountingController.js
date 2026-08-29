// backend/src/controllers/integratedAccountingController.js

const db = require('../db'); // Your PostgreSQL connection pool

/**
 * 1. Calculate & Generate Account Statement with Opening & Running Balances
 * GET /api/v1/accounting/account-statement?organization_id=...&account_id=...&from_date=...&to_date=...
 */
exports.getAccountStatement = async (req, res) => {
  try {
    const { organization_id, account_id, from_date, to_date } = req.query;

    if (!organization_id || !account_id || !from_date || !to_date) {
      return res.status(400).json({
        success: false,
        error: "Missing parameters. Required: organization_id, account_id, from_date, to_date"
      });
    }

    // A. Fetch Account Head Details
    const accountQuery = `SELECT id, name, group_type, opening_balance FROM account_heads WHERE id = $1 AND organization_id = $2`;
    const accountRes = await db.query(accountQuery, [account_id, organization_id]);
    
    if (accountRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Selected Account Head not found." });
    }
    const account = accountRes.rows[0];

    // B. Calculate Opening Balance Brought Forward (B/F) prior to from_date
    const bfQuery = `
      SELECT 
        COALESCE(SUM(l.debit), 0) AS total_debit,
        COALESCE(SUM(l.credit), 0) AS total_credit
      FROM journal_entry_lines l
      JOIN journal_entries e ON l.journal_entry_id = e.id
      WHERE e.organization_id = $1 
        AND l.account_id = $2 
        AND e.entry_date < $3;
    `;
    const bfRes = await db.query(bfQuery, [organization_id, account_id, from_date]);
    
    let initialMasterBal = parseFloat(account.opening_balance || 0);
    let priorDebits = parseFloat(bfRes.rows[0].total_debit);
    let priorCredits = parseFloat(bfRes.rows[0].total_credit);

    // B/F Calculation: (Initial Bal + Prior Debits) - Prior Credits
    let openingBalBF = initialMasterBal + (priorDebits - priorCredits);

    // C. Fetch Period Transactions
    const periodQuery = `
      SELECT 
        e.entry_date AS date,
        e.voucher_no AS "voucherNo",
        e.narration AS particulars,
        e.voucher_type AS "voucherType",
        l.debit,
        l.credit
      FROM journal_entry_lines l
      JOIN journal_entries e ON l.journal_entry_id = e.id
      WHERE e.organization_id = $1 
        AND l.account_id = $2 
        AND e.entry_date >= $3 
        AND e.entry_date <= $4
      ORDER BY e.entry_date ASC, e.created_at ASC;
    `;
    const periodRes = await db.query(periodQuery, [organization_id, account_id, from_date, to_date]);

    // D. Compute Running Balance Row by Row
    let runningBal = openingBalBF;
    const finalStatementRows = periodRes.rows.map(row => {
      const debitVal = parseFloat(row.debit);
      const creditVal = parseFloat(row.credit);
      runningBal += (debitVal - creditVal);
      
      return {
        date: row.date.toISOString().split('T')[0],
        voucherNo: row.voucherNo,
        particulars: row.particulars || `${row.voucherType} Entry`,
        voucherType: row.voucherType,
        debit: debitVal,
        credit: creditVal,
        runningBalance: runningBal
      };
    });

    const totalPeriodDebits = finalStatementRows.reduce((sum, r) => sum + r.debit, 0);
    const totalPeriodCredits = finalStatementRows.reduce((sum, r) => sum + r.credit, 0);

    return res.status(200).json({
      success: true,
      data: {
        accountName: account.name,
        accountGroup: account.group_type,
        period: { fromDate: from_date, toDate: to_date },
        openingBalanceBF: openingBalBF,
        rows: finalStatementRows,
        totalDebits: totalPeriodDebits,
        totalCredits: totalPeriodCredits,
        closingBalance: runningBal
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 2. Create Double-Entry Voucher (Atomic Transaction with Sum(Debit) = Sum(Credit) Guard)
 * POST /api/v1/accounting/vouchers
 */
exports.createDoubleEntryVoucher = async (req, res) => {
  const client = await db.getClient(); // Transactional DB client
  try {
    const { organization_id, voucher_no, voucher_type, entry_date, narration, lines } = req.body;

    if (!lines || lines.length < 2) {
      return res.status(400).json({ success: false, error: "A double-entry voucher must contain at least 2 line items." });
    }

    // Mathematical Guard: Sum(Debit) === Sum(Credit)
    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of lines) {
      totalDebit += parseFloat(line.debit || 0);
      totalCredit += parseFloat(line.credit || 0);
    }

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      return res.status(400).json({
        success: false,
        error: `Unbalanced Entry Rejected! Total Debit (₹${totalDebit}) must equal Total Credit (₹${totalCredit}).`
      });
    }

    await client.query('BEGIN');

    // Insert Header
    const headerQuery = `
      INSERT INTO journal_entries (organization_id, voucher_no, voucher_type, entry_date, narration)
      VALUES ($1, $2, $3, $4, $5) RETURNING id;
    `;
    const headerRes = await client.query(headerQuery, [organization_id, voucher_no, voucher_type, entry_date, narration]);
    const voucherId = headerRes.rows[0].id;

    // Insert Lines
    const lineQuery = `
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
      VALUES ($1, $2, $3, $4);
    `;
    for (const line of lines) {
      await client.query(lineQuery, [voucherId, line.account_id, line.debit || 0, line.credit || 0]);
    }

    await client.query('COMMIT');
    return res.status(201).json({ success: true, message: "Voucher posted successfully", voucherId });

  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
};
