const db = require('../config/db');
const axios = require('axios'); // For Portal Gateway Communication

exports.generateEInvoiceAndWayBill = async (req, res) => {
  const client = await db.connect();
  try {
    const { invoice_id, transport_details } = req.body;

    // Fetch Invoice Details
    const invRes = await client.query(
      `SELECT si.*, c.name as c_name, c.gstin as c_gstin, c.state_code as c_state 
       FROM sales_invoices si JOIN customers c ON si.customer_id = c.id WHERE si.id = $1`,
      [invoice_id]
    );
    const inv = invRes.rows[0];

    if (Number(inv.grand_total) < 50000) {
      throw new Error('E-Way Bill generation is required only for amounts above ₹50,000');
    }

    // Mock Payload for NIC GST Sandbox Gateway API
    const nicPayload = {
      Version: "1.1",
      TranDtls: { TaxSch: "GST", SupTyp: "B2B" },
      DocDtls: { Typ: "INV", No: inv.invoice_number, Dt: inv.invoice_date },
      SellerDtls: { Gstin: "08AAAAA0000A1Z5", LglName: "Neelkanth Groups", Stcd: "08" },
      BuyerDtls: { Gstin: inv.c_gstin, LglName: inv.c_name, Pos: inv.c_state },
      ValDtls: { AssVal: Number(inv.subtotal), TotalInvVal: Number(inv.grand_total) },
      ExpDtls: transport_details // { TransId, TransName, Distance, VehicleNo }
    };

    // Simulated API Call to NIC Portal (In Production: replace with NIC API Auth Token & Endpoint)
    // const response = await axios.post('https://einv-apisandbox.nic.in/einvg/api/Invoice', nicPayload);
    const mockNICResponse = {
      Irn: `IRN-${Date.now()}-${inv.invoice_number}`,
      EwbNo: `EWB-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      QrCodeData: `https://einvoice.gst.gov.in/qr/${inv.invoice_number}`
    };

    // Save IRN & E-Way Bill Number in Database
    await client.query(
      `UPDATE sales_invoices SET irn_number = $1, eway_bill_number = $2, qr_code_url = $3 WHERE id = $4`,
      [mockNICResponse.Irn, mockNICResponse.EwbNo, mockNICResponse.QrCodeData, invoice_id]
    );

    res.status(200).json({
      success: true,
      irn: mockNICResponse.Irn,
      eway_bill_number: mockNICResponse.EwbNo,
      qr_code: mockNICResponse.QrCodeData
    });

  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};
