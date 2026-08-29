const db = require('../config/db');

exports.getTrialBalance = async (req, res) => {
  try {
    const { organization_id } = req.user;

    const query = `
      SELECT 
        a.account_code,
        a.account_name,
        a.account_type,
        COALESCE(SUM(ji.debit_amount), 0.00) AS total_debit,
        COALESCE(SUM(ji.credit_amount), 0.00) AS total_credit,
        (COALESCE(SUM(ji.debit_amount), 0.00) - COALESCE(SUM(ji.credit_amount), 0.00)) AS net_balance
      FROM accounts a
      LEFT JOIN journal_items ji ON a.id = ji.account_id
      LEFT JOIN journal_entries je ON ji.journal_id = je.id
      WHERE a.organization_id = $1
      GROUP BY a.id, a.account_code, a.account_name, a.account_type
      ORDER BY a.account_code ASC;
    `;

    const result = await db.query(query, [organization_id]);
    
    let sumDebit = 0;
    let sumCredit = 0;

    result.rows.forEach(row => {
      sumDebit += Number(row.total_debit);
      sumCredit += Number(row.total_credit);
    });

    const isBalanced = Math.abs(sumDebit - sumCredit) < 0.01;

    res.status(200).json({
      success: true,
      is_balanced: isBalanced,
      total_debit: sumDebit,
      total_credit: sumCredit,
      accounts: result.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
