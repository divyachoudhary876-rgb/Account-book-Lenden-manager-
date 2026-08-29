const express = require('express');
const router = express.Router();

const integratedController = require('../controllers/integratedAccountingController');
const orgController = require('../controllers/organizationController');
const financialReportsController = require('../controllers/financialReportsController');

// 1. Account Statement & Milan API
router.get('/accounting/account-statement', integratedController.getAccountStatement);

// 2. Double Entry Voucher Posting API
router.post('/accounting/vouchers', integratedController.createDoubleEntryVoucher);

// 3. Organization Setup API
router.post('/organizations', orgController.createOrganization);

// 4. Reports API
router.get('/reports/summary', financialReportsController.getFinancialSummary);

module.exports = router;
