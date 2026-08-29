// backend/src/routes/integratedRoutes.js

const express = require('express');
const router = express.Router();
const integratedController = require('../controllers/integratedAccountingController');

// Account Statement API
router.get('/accounting/account-statement', integratedController.getAccountStatement);

// Create Double-Entry Voucher API
router.post('/accounting/vouchers', integratedController.createDoubleEntryVoucher);

module.exports = router;
