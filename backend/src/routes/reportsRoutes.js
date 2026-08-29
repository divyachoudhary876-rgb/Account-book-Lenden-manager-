const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { getProfitAndLoss, getBalanceSheet, autoReconcileBank } = require('../controllers/financialReportsController');

router.get('/reports/profit-and-loss', authenticateToken, getProfitAndLoss);
router.get('/reports/balance-sheet', authenticateToken, getBalanceSheet);
router.post('/bank/auto-reconcile', authenticateToken, autoReconcileBank);

module.exports = router;
