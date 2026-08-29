const db = require('../config/db');

exports.checkPeriodLock = async (req, res, next) => {
  try {
    const { organization_id } = req.user;
    const transactionDate = req.body.invoice_date || req.body.voucher_date || req.body.receipt_date;

    if (!transactionDate) return next();

    const lockRes = await db.query(
      `SELECT MAX(lock_date) as max_lock_date FROM accounting_period_locks WHERE organization_id = $1`,
      [organization_id]
    );

    const maxLockDate = lockRes.rows[0]?.max_lock_date;

    if (maxLockDate && new Date(transactionDate) <= new Date(maxLockDate)) {
      return res.status(403).json({
        success: false,
        message: `Accounting Period Locked: Transactions on or before ${maxLockDate} are frozen for audit safety.`
      });
    }

    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
