const express = require('express');
const router = express.Router();

const integratedController = require('../controllers/integratedAccountingController');
const financialReportsController = require('../controllers/financialReportsController');
const invoiceController = require('../controllers/invoiceController');
const gstComplianceController = require('../controllers/gstComplianceController');
const einvoiceController = require('../controllers/einvoiceController');

router.get('/accounting/account-statement', integratedController.getAccountStatement);
router.post('/accounting/vouchers', integratedController.createDoubleEntryVoucher);
router.get('/reports/summary', financialReportsController.getFinancialSummary);
router.post('/sales-invoice', invoiceController.createSalesInvoice);
router.get('/gst/gstr1/json', gstComplianceController.generateGSTR1JSON);
router.post('/gst/einvoice/generate', einvoiceController.generateEInvoiceAndWayBill);

module.exports = router;
