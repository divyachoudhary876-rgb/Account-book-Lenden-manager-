const db = require('../db');

// Post API to Create Account Head based on Strict Accounting Rules
exports.createAccountHead = async (req, res) => {
  try {
    const { organization_id, name, primary_type, sub_group, opening_balance, opening_balance_type } = req.body;

    if (!organization_id || !name || !primary_type || !sub_group) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing mandatory fields: organization_id, name, primary_type, sub_group" 
      });
    }

    // Enforce Accounting Group Equivalence
    const validGroups = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];
    if (!validGroups.includes(primary_type.toUpperCase())) {
      return res.status(422).json({ success: false, error: "Invalid Primary Account Type." });
    }

    const insertQuery = `
      INSERT INTO account_heads 
      (organization_id, name, primary_type, sub_group, opening_balance, opening_balance_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const values = [
      organization_id,
      name.trim(),
      primary_type.toUpperCase(),
      sub_group.toUpperCase(),
      parseFloat(opening_balance) || 0.00,
      opening_balance_type || 'Dr'
    ];

    const result = await db.query(insertQuery, values);
    return res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, error: "Isi naam se Account Head pehle se bani hui hai." });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
};
