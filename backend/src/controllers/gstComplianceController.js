const db = require('../config/db');

// GSTR-1 Data Extractor & Portal JSON Generator
exports.generateGSTR1JSON = async (req, res) => {
  try {
    const { organization_id } = req.user;
    const { period } = req.query; // Format: '082026' (MMYYYY)

    // Fetch Organization Info
    const orgRes = await db.query('SELECT gstin, state_code FROM organizations WHERE id = $1', [organization_id]);
    const org = orgRes.rows[0];

    // B2B Invoices (Customers with valid GSTIN)
    const b2bQuery = `
      SELECT 
        c.gstin as ctin,
        si.invoice_number as inum,
        TO_CHAR(si.invoice_date, 'DD-MM-YYYY') as idt,
        si.grand_total as val,
        org.state_code || '-' || 'State' as pos,
        'N' as rchrg,
        sii.gst_rate as rt,
        SUM(sii.taxable_value) as txval,
        SUM(sii.cgst_amount) as camt,
        SUM(sii.sgst_amount) as samt,
        SUM(sii.igst_amount) as iamt
      FROM sales_invoices si
      JOIN customers c ON si.customer_id = c.id
      JOIN sales_invoice_items sii ON si.id = sii.invoice_id
      JOIN organizations org ON si.organization_id = org.id
      WHERE si.organization_id = $1 AND c.gstin IS NOT NULL AND c.gstin != ''
      GROUP BY c.gstin, si.invoice_number, si.invoice_date, si.grand_total, org.state_code, sii.gst_rate
    `;

    const b2bRes = await db.query(b2bQuery, [organization_id]);

    // Format into Government Standard GSTR-1 Schema
    const gstr1Data = {
      gstin: org.gstin,
      fp: period,
      b2b: Object.values(b2bRes.rows.reduce((acc, row) => {
        if (!acc[row.ctin]) acc[row.ctin] = { ctin: row.ctin, inv: [] };
        acc[row.ctin].inv.push({
          inum: row.inum,
          idt: row.idt,
          val: Number(row.val),
          pos: row.pos,
          rchrg: row.rchrg,
          itms: [{
            num: 1,
            itm_det: {
              rt: Number(row.rt),
              txval: Number(row.txval),
              iamt: Number(row.iamt),
              camt: Number(row.camt),
              samt: Number(row.samt)
            }
          }]
        });
        return acc;
      }, {}))
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=GSTR1_${org.gstin}_${period}.json`);
    res.status(200).send(JSON.stringify(gstr1Data, null, 2));

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
