// backend/src/controllers/financialReportsController.js

const db = require('../db');

exports.getFinancialSummary = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    // Fetch Income & Expenses for P&L
    const pnlQuery = `
      SELECT 
        a.group_type,
        a.name AS account_name,
        COALESCE(SUM(l.credit - l.debit), 0) AS amount
      FROM account_heads a
      LEFT JOIN journal_entry_lines l ON a.id = l.account_id
      LEFT JOIN journal_entries e ON l.journal_entry_id = e.id
      WHERE a.group_type IN ('INCOME', 'EXPENSE')
        AND (e.entry_date BETWEEN $1 AND $2 OR e.entry_date IS NULL)
      GROUP BY a.id, a.group_type, a.name;
    `;

    const pnlResult = await db.query(pnlQuery, [from_date, to_date]);

    let totalIncome = 0;
    let totalExpense = 0;

    pnlResult.rows.forEach(row => {
      const amt = parseFloat(row.amount);
      if (row.group_type === 'INCOME') totalIncome += amt;
      if (row.group_type === 'EXPENSE') totalExpense += Math.abs(amt);
    });

    const netProfit = totalIncome - totalExpense;

    return res.status(200).json({
      success: true,
      data: {
        pnl: {
          totalIncome,
          totalExpense,
          netProfit
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
