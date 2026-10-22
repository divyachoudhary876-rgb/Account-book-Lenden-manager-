// frontend/src/utils/dashboardReportEngine.js

import jsPDF from 'jspdf';
import { IDBStorage } from './indexedDbStorage';
import { exportTruePDF } from './pdfDownloadEngine';
import { getDynamicDashboardMetrics, resolveFirmId } from './dashboardDataEngine';
import { getStockItemsByFirm, getFirmItemStock } from './stockInventoryEngine';

const getFirmName = (firmInput) => {
  if (firmInput && typeof firmInput === 'object') {
    return firmInput.firm_name || firmInput.name || firmInput.legal_name || 'Neelkanth Int Udyog';
  }
  return 'Neelkanth Int Udyog';
};

export const cleanTypographySpacing = (rawText) => {
  if (!rawText) return '';
  let str = String(rawText);
  str = str.replace(/\s*:\s*/g, ': ');
  str = str.replace(/\s*@\s*(?:rs\.?|₹)?\s*/gi, ' @ Rs ');
  str = str.replace(/\s*,\s*/g, ', ');
  str = str.replace(/\s*-\s*/g, ' - ');
  str = str.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  str = str.replace(/\s{2,}/g, ' ');
  return str.trim();
};

/**
 * 1. TOTAL PRODUCTION QUANTITY REPORT PDF (Bhatta Production & Cumulative Output)
 */
export const downloadDashboardProductionReportPDF = async (...args) => {
  try {
    const firmId = resolveFirmId(...args);
    const firmInput = args.find(a => typeof a === 'object') || {};
    const firmName = getFirmName(firmInput);

    const productionKeys = [`bhatta_production_records_${firmId}`, `production_records_${firmId}`, 'bhatta_production_records'];
    let prodRecords = [];
    productionKeys.forEach(k => {
      try {
        const val = IDBStorage.getItem(k, []) || JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(val) && val.length > 0) prodRecords.push(...val);
      } catch (e) {}
    });

    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(firmName.toUpperCase(), 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Brick Kiln Manufacturing: Total Production Qty Breakdown`, 14, y);
    y += 5;

    doc.setFontSize(8);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')}`, 14, y);
    y += 6;

    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('#', 16, y + 4.8);
    doc.text('Production Date & Batch', 28, y + 4.8);
    doc.text('Kiln Chamber / Location', 95, y + 4.8);
    doc.text('Output Qty (Pcs)', 193, y + 4.8, { align: 'right' });
    y += 9;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    let totalProdQty = 0;
    prodRecords.forEach((rec, idx) => {
      if (!rec) return;
      if (y > 275) { doc.addPage(); y = 18; }
      const date = rec.date || rec.production_date || '';
      const batch = rec.batch_no || rec.reference_no || `BATCH-${idx + 1}`;
      const location = rec.chamber || rec.location || 'Main Bhatta Kiln';
      const qty = parseFloat(rec.qty || rec.quantity || rec.total_units || 0);
      totalProdQty += qty;

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3, 182, 6, 'F');
      }

      doc.text(String(idx + 1), 16, y);
      doc.text(`${date} | ${batch}`.substring(0, 35), 28, y);
      doc.text(String(location).substring(0, 32), 95, y);
      doc.text(`${qty.toLocaleString('en-IN')} Pcs`, 193, y, { align: 'right' });
      y += 6;
    });

    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Cumulative Production Output: ${totalProdQty.toLocaleString('en-IN')} Units`, 193, y, { align: 'right' });

    await exportTruePDF(doc, `Total_Production_Report_${firmId}`);
  } catch (e) {
    console.error("Error generating Production PDF:", e);
    alert("PDF download failed: " + e.message);
  }
};

/**
 * 2. RAW BRICKS & FINISHED BRICKS INVENTORY REPORT PDF
 */
export const downloadDashboardBricksStockReportPDF = async (...args) => {
  try {
    const firmId = resolveFirmId(...args);
    const firmInput = args.find(a => typeof a === 'object') || {};
    const firmName = getFirmName(firmInput);
    const inventory = getStockItemsByFirm(firmId);

    const brickItems = inventory.filter(i => {
      const n = (i.item_name || i.name || '').toLowerCase();
      return n.includes('brick') || n.includes('int') || n.includes('ईंट') || n.includes('kacchi') || n.includes('pakki');
    });

    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(firmName.toUpperCase(), 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Brick Kiln Inventory: Raw & Finished Bricks Stock Statement`, 14, y);
    y += 5;

    doc.setFontSize(8);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')}`, 14, y);
    y += 6;

    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('#', 16, y + 4.8);
    doc.text('Brick Type & Specification', 28, y + 4.8);
    doc.text('Category', 95, y + 4.8);
    doc.text('Stock Qty', 135, y + 4.8, { align: 'right' });
    doc.text('Valuation (Rs)', 193, y + 4.8, { align: 'right' });
    y += 9;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    let totalBricksVal = 0;
    brickItems.forEach((item, idx) => {
      if (!item) return;
      if (y > 275) { doc.addPage(); y = 18; }
      const name = item.item_name || item.name || 'Bricks';
      const cat = item.category || item.sub_group || 'Brick Inventory';
      const qty = getFirmItemStock(firmId, name);
      const rate = parseFloat(item.unit_purchase_price || item.purchase_price || item.rate || 0);
      const val = qty * rate;
      totalBricksVal += val;

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3, 182, 6, 'F');
      }

      doc.text(String(idx + 1), 16, y);
      doc.text(String(name).substring(0, 35), 28, y);
      doc.text(String(cat).substring(0, 25), 95, y);
      doc.text(`${qty.toLocaleString('en-IN')} Pcs`, 135, y, { align: 'right' });
      doc.text(val.toFixed(2), 193, y, { align: 'right' });
      y += 6;
    });

    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Total Bricks Stock Valuation: Rs ${totalBricksVal.toFixed(2)}`, 193, y, { align: 'right' });

    await exportTruePDF(doc, `Bricks_Stock_Report_${firmId}`);
  } catch (e) {
    console.error("Error generating Bricks Stock PDF:", e);
    alert("PDF download failed: " + e.message);
  }
};

/**
 * 3. FUEL / COAL STOCK REPORT PDF
 */
export const downloadDashboardFuelStockReportPDF = async (...args) => {
  try {
    const firmId = resolveFirmId(...args);
    const firmInput = args.find(a => typeof a === 'object') || {};
    const firmName = getFirmName(firmInput);
    const inventory = getStockItemsByFirm(firmId);

    const fuelItems = inventory.filter(i => {
      const n = (i.item_name || i.name || '').toLowerCase();
      return n.includes('coal') || n.includes('diesel') || n.includes('fuel') || n.includes('husk') || n.includes('कोयला');
    });

    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(firmName.toUpperCase(), 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Brick Kiln Inventory: Fuel / Coal Stock Statement`, 14, y);
    y += 5;

    doc.setFontSize(8);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')}`, 14, y);
    y += 6;

    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('#', 16, y + 4.8);
    doc.text('Fuel / Energy Item Name', 28, y + 4.8);
    doc.text('Unit', 95, y + 4.8);
    doc.text('Stock Qty', 135, y + 4.8, { align: 'right' });
    doc.text('Valuation (Rs)', 193, y + 4.8, { align: 'right' });
    y += 9;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    let totalFuelVal = 0;
    fuelItems.forEach((item, idx) => {
      if (!item) return;
      if (y > 275) { doc.addPage(); y = 18; }
      const name = item.item_name || item.name || 'Fuel';
      const unit = item.unit || 'Units';
      const qty = getFirmItemStock(firmId, name);
      const rate = parseFloat(item.unit_purchase_price || item.purchase_price || item.rate || 0);
      const val = qty * rate;
      totalFuelVal += val;

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3, 182, 6, 'F');
      }

      doc.text(String(idx + 1), 16, y);
      doc.text(String(name).substring(0, 35), 28, y);
      doc.text(String(unit), 95, y);
      doc.text(qty.toFixed(2), 135, y, { align: 'right' });
      doc.text(val.toFixed(2), 193, y, { align: 'right' });
      y += 6;
    });

    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Total Fuel & Coal Stock Valuation: Rs ${totalFuelVal.toFixed(2)}`, 193, y, { align: 'right' });

    await exportTruePDF(doc, `Fuel_Stock_Report_${firmId}`);
  } catch (e) {
    console.error("Error generating Fuel Stock PDF:", e);
    alert("PDF download failed: " + e.message);
  }
};
