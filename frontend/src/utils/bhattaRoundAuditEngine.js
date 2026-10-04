// frontend/src/utils/bhattaRoundAuditEngine.js

import { loadFirmData, saveFirmData } from './firmIsolationEngine';
import { saveUniversalVoucher } from './voucherPostingEngine.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

const resolveActiveFirmId = (firmInput) => {
  if (typeof firmInput === 'string' && firmInput.trim() !== '') return firmInput.trim();
  if (firmInput && typeof firmInput === 'object') {
    return firmInput.id || firmInput.firm_id || firmInput.firmId || 'FIRM-001';
  }
  return localStorage.getItem('app_active_firm_id') || 'FIRM-001';
};

/**
 * 1. Load All Bhatta Rounds for Firm
 */
export const getFirmBhattaRounds = (firmInput) => {
  const firmId = resolveActiveFirmId(firmInput);
  let rounds = loadFirmData('bhatta_production_rounds', firmInput, []);
  if (!Array.isArray(rounds) || rounds.length === 0) {
    try {
      const raw = localStorage.getItem(`bhatta_rounds_${firmId}`);
      if (raw) rounds = JSON.parse(raw);
    } catch (e) {
      rounds = [];
    }
  }
  return Array.isArray(rounds) ? rounds : [];
};

/**
 * 2. Save or Create Round Batch
 */
export const saveFirmBhattaRound = (firmInput, roundData) => {
  const firmId = resolveActiveFirmId(firmInput);
  const existing = getFirmBhattaRounds(firmInput);
  
  const roundId = roundData.id || `ROUND-${Date.now().toString().slice(-6)}`;
  const normalized = {
    id: roundId,
    firm_id: firmId,
    title: String(roundData.title || `Round #${existing.length + 1}`).trim(),
    target_capacity: Number(roundData.target_capacity || roundData.expected_capacity || 0),
    bharai_start_date: roundData.bharai_start_date || '',
    bharai_end_date: roundData.bharai_end_date || '',
    nikasi_start_date: roundData.nikasi_start_date || '',
    nikasi_end_date: roundData.nikasi_end_date || '',
    sales_start_date: roundData.sales_start_date || roundData.nikasi_start_date || '',
    sales_end_date: roundData.sales_end_date || '',
    status: roundData.status || 'ACTIVE', // 'ACTIVE', 'AUDITED', 'CLOSED'
    created_at: roundData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const idx = existing.findIndex(r => r.id === roundId);
  let updated;
  if (idx !== -1) {
    updated = [...existing];
    updated[idx] = { ...existing[idx], ...normalized };
  } else {
    updated = [normalized, ...existing];
  }

  saveFirmData('bhatta_production_rounds', firmInput, updated);
  localStorage.setItem(`bhatta_rounds_${firmId}`, JSON.stringify(updated));
  window.dispatchEvent(new Event('app_storage_updated'));
  return normalized;
};

/**
 * 3. 100% Actual Voucher Scanner: Expenses + Sales Realization
 */
export const auditBhattaRoundData = (firmInput, roundConfig = {}) => {
  const firmId = resolveActiveFirmId(firmInput);
  const {
    bharaiStartDate = '',
    bharaiEndDate = '',
    nikasiStartDate = '',
    nikasiEndDate = '',
    salesStartDate = '',
    salesEndDate = ''
  } = roundConfig;

  // Retrieve firm vouchers
  let vouchers = [];
  try {
    const raw = localStorage.getItem(`account_book_vouchers_${firmId}`) || localStorage.getItem(`app_vouchers_${firmId}`);
    if (raw) vouchers = JSON.parse(raw);
  } catch (e) {
    vouchers = [];
  }

  // 1. Incurred Cost Pool (Work Done & Issue Slips Only)
  const expenses = {
    pathaiCost: 0,
    bharaiCost: 0,
    jhonkaiCost: 0,
    nikasiCost: 0,
    fuelCost: 0,
    dieselCost: 0,
    otherOverheads: 0,
    totalExpenditure: 0,
    vouchersCount: 0
  };

  // 2. Actual Realized Sales Breakdown (Zero Manual Entry)
  const salesData = {
    int1No: { qty: 0, revenue: 0, count: 0 },
    int2No: { qty: 0, revenue: 0, count: 0 },
    intPila: { qty: 0, revenue: 0, count: 0 },
    intChatta: { qty: 0, revenue: 0, count: 0 },
    tukda: { qty: 0, revenue: 0, count: 0 },
    totalBricksSold: 0,
    totalSalesRevenue: 0,
    salesInvoicesCount: 0
  };

  vouchers.forEach(v => {
    if (!v) return;
    const vDate = String(v.voucher_date || v.date || '');
    const vType = String(v.voucher_type || v.type || '').toUpperCase();
    const narr = String(v.narration || '').toLowerCase();
    const drAcc = String(v.dr_account || '').toLowerCase();
    const amt = parseFloat(v.amount || v.total_amount || 0);

    // --- EXPENSES AUDIT ---
    // A. Bharai & Pakai Window (Mitti, Fuel, Pathai, Bharai, Jhonkai)
    const inBharaiWindow = (!bharaiStartDate || vDate >= bharaiStartDate) && (!bharaiEndDate || vDate <= bharaiEndDate);
    if (inBharaiWindow && vType !== 'SALES') {
      if (drAcc.includes('pathai') || narr.includes('pathai')) {
        expenses.pathaiCost += amt;
        expenses.vouchersCount++;
      } else if (drAcc.includes('bharai') || narr.includes('bharai')) {
        expenses.bharaiCost += amt;
        expenses.vouchersCount++;
      } else if (drAcc.includes('jhonkai') || narr.includes('jhonkai') || drAcc.includes('mistri')) {
        expenses.jhonkaiCost += amt;
        expenses.vouchersCount++;
      } else if (drAcc.includes('koyla') || drAcc.includes('fuel') || drAcc.includes('turi') || narr.includes('koyla')) {
        expenses.fuelCost += amt;
        expenses.vouchersCount++;
      } else if (drAcc.includes('diesel') || drAcc.includes('tractor') || narr.includes('diesel')) {
        expenses.dieselCost += amt;
        expenses.vouchersCount++;
      }
    }

    // B. Nikasi Window (Bhatti Nikasi Work Done)
    const inNikasiWindow = (!nikasiStartDate || vDate >= nikasiStartDate) && (!nikasiEndDate || vDate <= nikasiEndDate);
    if (inNikasiWindow && vType !== 'SALES') {
      if (drAcc.includes('nikasi') || narr.includes('nikasi')) {
        expenses.nikasiCost += amt;
        expenses.vouchersCount++;
      }
    }

    // --- ACTUAL SALES INVOICES AUDIT ---
    const inSalesWindow = (!salesStartDate || vDate >= salesStartDate) && (!salesEndDate || vDate <= salesEndDate);
    if (inSalesWindow && (vType === 'SALES' || vType === 'SALE')) {
      salesData.salesInvoicesCount++;
      const itemsList = Array.isArray(v.items) ? v.items : [];

      if (itemsList.length > 0) {
        itemsList.forEach(it => {
          const iName = String(it.itemName || it.item_name || it.name || '').toLowerCase();
          const iQty = parseFloat(it.qty || it.quantity || 0);
          const iRate = parseFloat(it.rate || it.unit_rate || 0);
          const iTot = parseFloat(it.total || (iQty * iRate) || 0);

          if (iName.includes('1') || iName.includes('one') || iName.includes('grade a')) {
            salesData.int1No.qty += iQty;
            salesData.int1No.revenue += iTot;
            salesData.int1No.count++;
          } else if (iName.includes('2') || iName.includes('two') || iName.includes('grade b')) {
            salesData.int2No.qty += iQty;
            salesData.int2No.revenue += iTot;
            salesData.int2No.count++;
          } else if (iName.includes('pila') || iName.includes('1.25')) {
            salesData.intPila.qty += iQty;
            salesData.intPila.revenue += iTot;
            salesData.intPila.count++;
          } else if (iName.includes('chatta')) {
            salesData.intChatta.qty += iQty;
            salesData.intChatta.revenue += iTot;
            salesData.intChatta.count++;
          } else if (iName.includes('tukda') || iName.includes('rodi') || iName.includes('kangar')) {
            salesData.tukda.qty += iQty;
            salesData.tukda.revenue += iTot;
            salesData.tukda.count++;
          } else {
            // Default fallback to 1-No if standard eent
            salesData.int1No.qty += iQty;
            salesData.int1No.revenue += iTot;
          }

          salesData.totalBricksSold += iQty;
          salesData.totalSalesRevenue += iTot;
        });
      } else {
        // Fallback if no item array present: Use narration or amount
        const fallbackQty = parseFloat(v.quantity || v.qty || 0);
        salesData.int1No.qty += fallbackQty;
        salesData.int1No.revenue += amt;
        salesData.totalBricksSold += fallbackQty;
        salesData.totalSalesRevenue += amt;
      }
    }
  });

  expenses.totalExpenditure = round2(
    expenses.pathaiCost +
    expenses.bharaiCost +
    expenses.jhonkaiCost +
    expenses.nikasiCost +
    expenses.fuelCost +
    expenses.dieselCost +
    expenses.otherOverheads
  );

  // 3. Mathematical True Cost Calculation (Ind AS 2 Relative Sales Value)
  const totalCost = expenses.totalExpenditure;
  const totalSold = salesData.totalBricksSold;

  // Weight Units based on relative standard market value
  const weightUnits = 
    (salesData.int1No.qty * 1.0) +
    (salesData.int2No.qty * 0.80) +
    (salesData.intPila.qty * 0.65) +
    (salesData.intChatta.qty * 0.50) +
    (salesData.tukda.qty * 0.25);

  const baseUnitCost = (weightUnits > 0 && totalCost > 0) ? (totalCost / weightUnits) : 0;

  const costPerPiece = {
    int1No: round2(baseUnitCost * 1.0),
    int2No: round2(baseUnitCost * 0.80),
    intPila: round2(baseUnitCost * 0.65),
    intChatta: round2(baseUnitCost * 0.50),
    tukda: round2(baseUnitCost * 0.25)
  };

  const costPerThousand = {
    int1No: round2(costPerPiece.int1No * 1000),
    int2No: round2(costPerPiece.int2No * 1000),
    intPila: round2(costPerPiece.intPila * 1000),
    intChatta: round2(costPerPiece.intChatta * 1000),
    tukda: round2(costPerPiece.tukda * 1000)
  };

  const netRealizedProfit = round2(salesData.totalSalesRevenue - totalCost);
  const averageSellingRatePerK = totalSold > 0 ? round2((salesData.totalSalesRevenue / totalSold) * 1000) : 0;
  const averageCostRatePerK = totalSold > 0 ? round2((totalCost / totalSold) * 1000) : 0;

  return {
    expenses,
    salesData,
    costPerPiece,
    costPerThousand,
    totalCost,
    totalSold,
    netRealizedProfit,
    averageSellingRatePerK,
    averageCostRatePerK
  };
};

/**
 * 4. Lock & Finalize Round Audit into Journal Ledger
 */
export const lockBhattaRoundAudit = (firmInput, roundId, auditResult) => {
  const firmId = resolveActiveFirmId(firmInput);
  const rounds = getFirmBhattaRounds(firmInput);
  const rIdx = rounds.findIndex(r => r.id === roundId);
  
  if (rIdx !== -1) {
    rounds[rIdx].status = 'AUDITED';
    rounds[rIdx].audit_summary = auditResult;
    rounds[rIdx].audited_at = new Date().toISOString();
    saveFirmData('bhatta_production_rounds', firmInput, rounds);
    localStorage.setItem(`bhatta_rounds_${firmId}`, JSON.stringify(rounds));
  }

  // Record balanced audit closing voucher
  saveUniversalVoucher(firmId, {
    id: `AUDIT-${roundId}`,
    firm_id: firmId,
    voucher_date: new Date().toISOString().split('T')[0],
    voucher_type: 'JOURNAL',
    reference_no: `AUDIT-${roundId}`,
    dr_account: 'Cost of Goods Sold (COGS - Eent Pakai)',
    cr_account: 'Production Costing Pool / WIP',
    amount: auditResult.totalCost,
    total_amount: auditResult.totalCost,
    narration: `Round Audit Finalized for ${roundId}: Sold ${auditResult.totalSold} Bricks | Cost ₹${auditResult.totalCost.toLocaleString('en-IN')} | Revenue ₹${auditResult.salesData.totalSalesRevenue.toLocaleString('en-IN')}`,
    entries: [
      { account_name: 'Cost of Goods Sold (COGS - Eent Pakai)', type: 'DR', debit: auditResult.totalCost, credit: 0, amount: auditResult.totalCost },
      { account_name: 'Production Costing Pool / WIP', type: 'CR', debit: 0, credit: auditResult.totalCost, amount: auditResult.totalCost }
    ]
  });

  window.dispatchEvent(new Event('app_storage_updated'));
  return { success: true };
};
