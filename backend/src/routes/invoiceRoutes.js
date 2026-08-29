const express = require('express');
const router = express.Router();
const { createSalesInvoice } = require('../controllers/invoiceController');

router.post('/sales-invoice', createSalesInvoice);

module.exports = router;
