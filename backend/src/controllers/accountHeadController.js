const db = require('../db');

// 1. Fetch All Accounts for Dropdown Selection
exports.getAccountHeads = async (req, res) => {
  try {
    const { organization_id } = req.query;
    const query = `
      SELECT id, name, parent_group, sub_group 
      FROM account_heads 
      WHERE organization_id = $1 OR is_system_account = TRUE
      ORDER BY name ASC;
    `;
    const { rows } = await db.query(query, [organization_id || '00000000-0000-0000-0000-000000000000']);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 2. Create New Ledger Head According to Accounting Rules
exports.createAccountHead = async (req, res) => {
  try {
    const { organization_id, name, parent_group, sub_group, opening_balance, opening_balance_type } = req.body;

    if (!name || !parent_group || !sub_group) {
      return res.status(400).json({ success: false, error: "Name, Parent Group, and Sub Group are required." });
    }

    const query = `
      INSERT INTO account_heads (organization_id, name, parent_group, sub_group, opening_balance, opening_balance_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [
      organization_id,
      name.trim(),
      parent_group,
      sub_group,
      parseFloat(opening_balance) || 0,
      opening_balance_type || 'Dr'
    ];

    const { rows } = await db.query(query, values);
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

