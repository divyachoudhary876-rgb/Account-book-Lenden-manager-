const express = require('express');
const router = express.Router();
const { createPaymentReceipt, generateInvoicePDF } = require('../controllers/integratedAccountingController');

// Module 2 API: Add Receipt
router.post('/payment-receipt', createPaymentReceipt);

// Module 3 API: Stream PDF Invoice directly to browser
router.get('/sales-invoice/:invoice_id/pdf', generateInvoicePDF);

module.exports = router;
