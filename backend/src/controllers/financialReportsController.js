const db = require('../config/db');

// ==========================================
// 1. PROFIT & LOSS STATEMENT (INCOME STATEMENT)
// ==========================================
exports.getProfitAndLoss = async (req, res) => {
  try {
    const { organization_id } = req.user;
    const { start_date, end_date } = req.query;

    const query = `
      SELECT 
        a.account_type,
        a.account_code,
        a.account_name,
        COALESCE(SUM(ji.credit_amount - ji.debit_amount), 0.00) as net_amount
      FROM accounts a
      LEFT JOIN journal_items ji ON a.id = ji.account_id
      LEFT JOIN journal_entries je ON ji.journal_id = je.id
      WHERE a.organization_id = $1 
        AND a.account_type IN ('INCOME', 'EXPENSE')
        AND je.entry_date BETWEEN $2 AND $3
      GROUP BY a.id, a.account_type, a.account_code, a.account_name
      ORDER BY a.account_code ASC;
    `;

    const result = await db.query(query, [organization_id, start_date, end_date]);

    let totalIncome = 0;
    let totalExpense = 0;
    const incomeAccounts = [];
    const expenseAccounts = [];

    result.rows.forEach(row => {
      const amount = Number(row.net_amount);
      if (row.account_type === 'INCOME') {
        totalIncome += amount;
        incomeAccounts.push({ name: row.account_name, amount: amount });
      } else {
        // For Expenses, debit is positive cost
        const expenseVal = -amount;
        totalExpense += expenseVal;
        expenseAccounts.push({ name: row.account_name, amount: expenseVal });
      }
    });

    const netProfit = totalIncome - totalExpense;

    res.status(200).json({
      success: true,
      period: { start_date, end_date },
      summary: {
        total_income: totalIncome,
        total_expense: totalExpense,
        net_profit: netProfit
      },
      income_statement: { income_accounts: incomeAccounts, expense_accounts: expenseAccounts }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 2. BALANCE SHEET ENGINE
// ==========================================
exports.getBalanceSheet = async (req, res) => {
  try {
    const { organization_id } = req.user;
    const { as_of_date } = req.query;

    const query = `
      SELECT 
        a.account_type,
        a.account_code,
        a.account_name,
        COALESCE(SUM(ji.debit_amount - ji.credit_amount), 0.00) as balance
      FROM accounts a
      LEFT JOIN journal_items ji ON a.id = ji.account_id
      LEFT JOIN journal_entries je ON ji.journal_id = je.id
      WHERE a.organization_id = $1 
        AND a.account_type IN ('ASSET', 'LIABILITY', 'EQUITY')
        AND je.entry_date <= $2
      GROUP BY a.id, a.account_type, a.account_code, a.account_name
      ORDER BY a.account_code ASC;
    `;

    const result = await db.query(query, [organization_id, as_of_date]);

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    const assets = [];
    const liabilities = [];
    const equity = [];

    result.rows.forEach(row => {
      const balance = Number(row.balance);
      if (row.account_type === 'ASSET') {
        totalAssets += balance;
        assets.push({ account: row.account_name, balance: balance });
      } else if (row.account_type === 'LIABILITY') {
        const liabilityVal = -balance;
        totalLiabilities += liabilityVal;
        liabilities.push({ account: row.account_name, balance: liabilityVal });
      } else if (row.account_type === 'EQUITY') {
        const equityVal = -balance;
        totalEquity += equityVal;
        equity.push({ account: row.account_name, balance: equityVal });
      }
    });

    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

    res.status(200).json({
      success: true,
      as_of_date,
      is_balanced: isBalanced,
      totals: {
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        total_equity: totalEquity,
        total_liabilities_and_equity: totalLiabilities + totalEquity
      },
      balance_sheet: { assets, liabilities, equity }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 3. AUTOMATED BANK RECONCILIATION ENGINE
// ==========================================
exports.autoReconcileBank = async (req, res) => {
  const client = await db.connect();
  try {
    const { organization_id } = req.user;
    const { bank_account_id } = req.body;

    await client.query('BEGIN');

    // Fetch Unreconciled Bank Statements
    const stmtRes = await client.query(
      `SELECT * FROM bank_statement_transactions 
       WHERE organization_id = $1 AND bank_account_id = $2 AND is_reconciled = FALSE`,
      [organization_id, bank_account_id]
    );

    let reconciledCount = 0;

    for (let stmt of stmtRes.rows) {
      const matchAmount = stmt.deposit_amount > 0 ? stmt.deposit_amount : stmt.withdrawal_amount;
      const isDeposit = stmt.deposit_amount > 0;

      // Find matching Ledger Journal Entry
      const matchQuery = `
        SELECT je.id as journal_id 
        FROM journal_entries je
        JOIN journal_items ji ON je.id = ji.journal_id
        WHERE ji.account_id = $1 
          AND je.entry_date = $2
          AND ji.${isDeposit ? 'debit_amount' : 'credit_amount'} = $3
        LIMIT 1
      `;

      const matchRes = await client.query(matchQuery, [bank_account_id, stmt.transaction_date, matchAmount]);

      if (matchRes.rows.length > 0) {
        const journalId = matchRes.rows[0].journal_id;

        // Auto Match
        await client.query(
          `UPDATE bank_statement_transactions 
           SET is_reconciled = TRUE, matched_journal_id = $1 
           WHERE id = $2`,
          [journalId, stmt.id]
        );

        reconciledCount++;
      }
    }

    await client.query('COMMIT');
    res.status(200).json({
      success: true,
      message: `Bank Reconciliation Complete. Automatically matched ${reconciledCount} transactions.`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};
