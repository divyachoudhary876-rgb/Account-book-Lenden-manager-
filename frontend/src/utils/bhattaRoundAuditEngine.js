// frontend/src/utils/bhattaRoundAuditEngine.js

import { loadFirmData, saveFirmData } from './firmIsolationEngine.js';
import { getCurrentActiveFY } from './financialYearLockEngine.js';
import { saveUniversalVoucher } from './voucherPostingEngine.js';
import { getFirmMasterAccounts, saveMasterAccount } from './accountMasterEngine.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

// Universal Standard Bhatta Items Directory
export const STANDARD_BHATTA_ITEMS = [
  { name: 'Int 1 Number (अव्वल)', category: '1_NO', unit: 'Pcs', hsn: '69010010' },
  { name: 'Int 2 Number (दोयम)', category: '2_NO', unit: 'Pcs', hsn: '69010010' },
  { name: 'Int 1.25 Number (पीला / सवाया)', category: 'PILA', unit: 'Pcs', hsn: '69010010' },
  { name: 'Khora Eent (खोरा / खंगार)', category: 'KHORA', unit: 'Pcs', hsn: '69010010' },
  { name: 'Chatta Eent (चट्टा)', category: 'CHATTA', unit: 'Pcs', hsn: '69010010' },
  { name: 'Tukda / Rodi (रोड़ा / खंडा)', category: 'TUKDA', unit: 'Trolley', hsn: '69010010' },
  { name: 'Kacchi Eent (कच्ची ईंट)', category: 'RAW', unit: 'Pcs', hsn: '69010010' },
  { name: 'Koyla / Coal (कोयला)', category: 'FUEL', unit: 'MT', hsn: '2701' },
  { name: 'Mitti (कच्ची मिट्टी)', category: 'RAW', unit: 'Trolley', hsn: '2505' },
  { name: 'Mustard Husk / Turi (तूड़ी)', category: 'FUEL', unit: 'MT', hsn: '1213' }
];

// Robust Multi-Dialect Brick Classifier (Zero-Mismatch)
export const classifyBrickName = (rawName = '') => {
  const name = String(rawName || '').toLowerCase().trim();

  // 1. Check Tukda / Rodi / Khanda first to avoid false number matches
  if (name.includes('tukda') || name.includes('tukada') || name.includes('rodi') || name.includes('roda') || name.includes('khanda')) {
    return 'TUKDA';
  }
  // 2. Khora / Khangar
  if (name.includes('khora') || name.includes('khanghar') || name.includes('khangar') || name.includes('vitrified')) {
    return 'KHORA';
  }
  // 3. Chatta
  if (name.includes('chatta') || name.includes('chatha')) {
    return 'CHATTA';
  }
  // 4. Pila / Sawaya / 1.25
  if (name.includes('pila') || name.includes('peela') || name.includes('sawaya') || name.includes('1.25') || name.includes('sawai')) {
    return 'PILA';
  }
  // 5. Int 2-Number / Doem
  if (
    name.includes(' 2') || 
    name.includes('2-') || 
    name.includes('2nd') || 
    name.includes('second') || 
    name.includes('doem') || 
    name.includes('doyam') || 
    name.includes('2 no') ||
    name.includes('2no')
  ) {
    return 'INT_2_NO';
  }
  // 6. Int 1-Number / Awval
  if (
    name.includes(' 1') || 
    name.includes('1-') || 
    name.includes('1st') || 
    name.includes('first') || 
    name.includes('awval') || 
    name.includes('avval') || 
    name.includes('1 no') || 
    name.includes('1no') ||
    name.includes('red brick') ||
    name.includes('lal eent')
  ) {
    return 'INT_1_NO';
  }

  return 'INT_1_NO'; // Safe default
};

export const getFirmBhattaRounds = (firm) => {
  const activeFY = getCurrentActiveFY();
  const allRounds = loadFirmData('bhatta_production_rounds', firm, []);
  return (Array.isArray(allRounds) ? allRounds : []).filter(r => !r.fiscal_year || r.fiscal_year === activeFY);
};

export const saveFirmBhattaRound = (firm, roundData) => {
  const activeFY = getCurrentActiveFY();
  const allRounds = loadFirmData('bhatta_production_rounds', firm, []);
  const safeRounds = Array.isArray(allRounds) ? allRounds : [];

  const roundId = roundData.id || `ROUND-${Date.now().toString().slice(-6)}`;
  const newRound = {
    ...roundData,
    id: roundId,
    fiscal_year: activeFY,
    status: roundData.status || 'ACTIVE',
    created_at: roundData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const filtered = safeRounds.filter(r => r.id !== roundId);
  const updated = [newRound, ...filtered];
  saveFirmData('bhatta_production_rounds', firm, updated);
  return newRound;
};

export const auditBhattaRoundData = (firm, config = {}) => {
  const {
    bharaiStartDate = '',
    bharaiEndDate = '',
    nikasiStartDate = '',
    nikasiEndDate = '',
    salesStartDate = '',
    salesEndDate = ''
  } = config;

  const payrollEntries = loadFirmData('app_payroll_entries', firm, []) || [];
  const consumptionRecords = loadFirmData('material_consumption_records', firm, []) || [];
  const salesInvoices = loadFirmData('invoices', firm, []) || [];

  let coalCost = 0;
  let biomassCost = 0;
  let dieselCost = 0;
  let otherFuelCost = 0;

  consumptionRecords.forEach(rec => {
    const d = rec.date || '';
    if (bharaiStartDate && d < bharaiStartDate) return;
    if (bharaiEndDate && d > bharaiEndDate) return;

    (rec.items || []).forEach(it => {
      const nm = (it.name || '').toLowerCase();
      const val = Number(it.totalCost || it.total_value || (Number(it.qty || 0) * Number(it.rate || 0)) || 0);

      if (nm.includes('koyla') || nm.includes('coal')) coalCost += val;
      else if (nm.includes('turi') || nm.includes('briquette') || nm.includes('husk')) biomassCost += val;
      else if (nm.includes('diesel')) dieselCost += val;
      else otherFuelCost += val;
    });
  });

  let pathaiLabour = 0;
  let bharaiLabour = 0;
  let jhonkaiLabour = 0;
  let nikasiLabour = 0;
  let tractorLabour = 0;
  let otherLabour = 0;

  payrollEntries.forEach(ent => {
    const d = ent.date || ent.timestamp?.slice(0, 10) || '';
    const ldg = (ent.expense_ledger || '').toLowerCase();
    const amt = Number(ent.total_amount || 0);

    if (bharaiStartDate && d >= bharaiStartDate && (!bharaiEndDate || d <= bharaiEndDate)) {
      if (ldg.includes('pathai')) pathaiLabour += amt;
      else if (ldg.includes('bharai')) bharaiLabour += amt;
      else if (ldg.includes('jhonkai') || ldg.includes('mistri')) jhonkaiLabour += amt;
    }

    if (nikasiStartDate && d >= nikasiStartDate && (!nikasiEndDate || d <= nikasiEndDate)) {
      if (ldg.includes('nikasi') || ldg.includes('loading')) nikasiLabour += amt;
      else if (ldg.includes('tractor') || ldg.includes('driver')) tractorLabour += amt;
      else otherLabour += amt;
    }
  });

  const totalFuelCost = round2(coalCost + biomassCost + dieselCost + otherFuelCost);
  const totalLabourCost = round2(pathaiLabour + bharaiLabour + jhonkaiLabour + nikasiLabour + tractorLabour + otherLabour);
  const totalBatchCost = round2(totalFuelCost + totalLabourCost);

  const salesBreakdown = {
    int1No: { qty: 0, revenue: 0 },
    int2No: { qty: 0, revenue: 0 },
    intPila: { qty: 0, revenue: 0 },
    khora: { qty: 0, revenue: 0 },
    intChatta: { qty: 0, revenue: 0 },
    tukda: { qty: 0, revenue: 0 },
    totalRevenue: 0,
    totalPcs: 0,
    salesInvoicesCount: 0
  };

  salesInvoices.forEach(inv => {
    const invDate = inv.date || inv.invoice_date || '';
    if (salesStartDate && invDate < salesStartDate) return;
    if (salesEndDate && invDate > salesEndDate) return;

    salesBreakdown.salesInvoicesCount++;

    (inv.items || []).forEach(item => {
      const q = Number(item.qty || item.quantity || 0);
      const r = Number(item.rate || item.price || 0);
      const itemRev = round2(q * r);
      const grade = classifyBrickName(item.name || item.item_name);

      if (grade === 'TUKDA') {
        salesBreakdown.tukda.qty += q;
        salesBreakdown.tukda.revenue += itemRev;
      } else if (grade === 'KHORA') {
        salesBreakdown.khora.qty += q;
        salesBreakdown.khora.revenue += itemRev;
      } else if (grade === 'CHATTA') {
        salesBreakdown.intChatta.qty += q;
        salesBreakdown.intChatta.revenue += itemRev;
      } else if (grade === 'PILA') {
        salesBreakdown.intPila.qty += q;
        salesBreakdown.intPila.revenue += itemRev;
      } else if (grade === 'INT_2_NO') {
        salesBreakdown.int2No.qty += q;
        salesBreakdown.int2No.revenue += itemRev;
      } else {
        salesBreakdown.int1No.qty += q;
        salesBreakdown.int1No.revenue += itemRev;
      }

      salesBreakdown.totalPcs += q;
      salesBreakdown.totalRevenue = round2(salesBreakdown.totalRevenue + itemRev);
    });
  });

  const soldPcs = salesBreakdown.totalPcs > 0 ? salesBreakdown.totalPcs : 800000;
  const baseCostPerUnit = soldPcs > 0 ? totalBatchCost / soldPcs : 0;

  const costPerK = {
    int1No: round2(baseCostPerUnit * 1000 * 1.05),
    int2No: round2(baseCostPerUnit * 1000 * 0.90),
    intPila: round2(baseCostPerUnit * 1000 * 0.75),
    khora: round2(baseCostPerUnit * 1000 * 0.55),
    chatta: round2(baseCostPerUnit * 1000 * 0.50),
    tukda: round2(baseCostPerUnit * 1000 * 0.35)
  };

  return {
    totalCost: totalBatchCost,
    totalSold: salesBreakdown.totalPcs,
    salesData: {
      ...salesBreakdown,
      totalSalesRevenue: salesBreakdown.totalRevenue
    },
    costPerThousand: costPerK,
    netRealizedProfit: round2(salesBreakdown.totalRevenue - totalBatchCost),
    averageSellingRatePerK: salesBreakdown.totalPcs > 0 ? round2((salesBreakdown.totalRevenue / salesBreakdown.totalPcs) * 1000) : 0
  };
};

export const lockBhattaRoundAudit = (firm, roundId, auditResult) => {
  const activeFirmId = firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  const lockDate = new Date().toISOString().slice(0, 10);
  
  const cogsLedger = 'Cost of Goods Sold (Bhatta Finished Goods)';
  const wipLedger = 'Manufacturing / Work-in-Progress (WIP)';

  const masterAccounts = getFirmMasterAccounts(activeFirmId);
  if (!masterAccounts.some(a => (a.account_name || a.name || '').toLowerCase() === cogsLedger.toLowerCase())) {
    saveMasterAccount(activeFirmId, {
      account_name: cogsLedger,
      primary_type: 'EXPENSES',
      type: 'Expenses',
      sub_group: 'Direct Cost of Sales',
      balance_type: 'Dr'
    });
  }

  saveUniversalVoucher(activeFirmId, {
    id: `JV-AUDIT-${roundId}`,
    firm_id: activeFirmId,
    voucher_type: 'JOURNAL',
    voucher_date: lockDate,
    date: lockDate,
    dr_account: cogsLedger,
    cr_account: wipLedger,
    amount: auditResult.totalCost,
    total_amount: auditResult.totalCost,
    narration: `Audited Round Cost Locked for #${roundId}: Real Cost ₹${auditResult.totalCost}. Sold: ${auditResult.totalSold} Pcs.`,
    is_compound: true,
    entries: [
      { account_name: cogsLedger, party: cogsLedger, type: 'DR', debit: auditResult.totalCost, credit: 0, amount: auditResult.totalCost },
      { account_name: wipLedger, party: wipLedger, type: 'CR', debit: 0, credit: auditResult.totalCost, amount: auditResult.totalCost }
    ]
  });

  const allRounds = loadFirmData('bhatta_production_rounds', firm, []);
  const updatedRounds = (Array.isArray(allRounds) ? allRounds : []).map(r => {
    if (r.id === roundId) {
      return { ...r, status: 'AUDITED', audited_summary: auditResult, audited_at: new Date().toISOString() };
    }
    return r;
  });
  saveFirmData('bhatta_production_rounds', firm, updatedRounds);

  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('storage'));
};
