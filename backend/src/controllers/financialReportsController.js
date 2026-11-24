const db = require('../db');

exports.getFinancialSummary = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    const pnlQuery = `
      SELECT 
        a.group_type,
        a.name AS account_name,
        COALESCE(SUM(l.credit - l.debit), 0) AS amount
      FROM account_heads a
      LEFT JOIN journal_entry_lines l ON a.id = l.account_id
      LEFT JOIN journal_entries e ON l.journal_entry_id = e.id
      WHERE a.group_type IN ('INCOME', 'EXPENSE')
        AND ($1::date IS NULL OR e.entry_date >= $1::date OR e.entry_date IS NULL)
        AND ($2::date IS NULL OR e.entry_date <= $2::date OR e.entry_date IS NULL)
      GROUP BY a.id, a.group_type, a.name;
    `;

    const pnlResult = await db.query(pnlQuery, [from_date || null, to_date || null]);

    let totalIncome = 0;
    let totalExpense = 0;

    pnlResult.rows.forEach(row => {
      const amt = parseFloat(row.amount || 0);
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

exports.getProfitAndLoss = async (req, res) => {
  return exports.getFinancialSummary(req, res);
};

exports.getBalanceSheet = async (req, res) => {
  try {
    const organizationId = req.user?.organization_id || req.query?.organization_id;
    const query = `
      SELECT 
        a.id,
        a.name,
        a.group_type,
        COALESCE(a.opening_balance, 0) + COALESCE(SUM(l.debit - l.credit), 0) AS net_balance
      FROM account_heads a
      LEFT JOIN journal_entry_lines l ON a.id = l.account_id
      LEFT JOIN journal_entries e ON l.journal_entry_id = e.id
      WHERE ($1::uuid IS NULL OR a.organization_id = $1::uuid)
        AND a.group_type IN ('ASSET', 'LIABILITY', 'EQUITY')
      GROUP BY a.id, a.name, a.group_type, a.opening_balance;
    `;
    const result = await db.query(query, [organizationId || null]);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.autoReconcileBank = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Bank reconciliation endpoint active.'
  });
};
