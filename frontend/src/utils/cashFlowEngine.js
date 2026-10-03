// frontend/src/utils/cashFlowEngine.js

import { StorageService } from './storageSync';
import { getFirmMasterAccounts } from './accountMasterEngine';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

/**
 * Computes Cash Flow Statement strictly isolated for the active firm,
 * conforming to Ind AS 7 / AS 3 (Operating, Investing, Financing Activities).
 */
export function computeCashFlowStatement(activeFirmIdInput, fromDate, toDate) {
  try {
    const activeFirmId = String(
      activeFirmIdInput || localStorage.getItem('app_active_firm_id') || 'FIRM-001'
    ).trim();

    // 1. Fetch strictly firm-scoped accounts to identify Cash & Bank heads accurately
    const masterAccounts = getFirmMasterAccounts(activeFirmId) || [];
    const cashBankHeadNames = new Set();
    const accountGroupMap = new Map();

    masterAccounts.forEach(acc => {
      const name = (acc.account_name || acc.name || '').trim();
      if (!name) return;
      const lowerName = name.toLowerCase();
      const group = (acc.sub_group || acc.group || '').toLowerCase();
      const primaryType = (acc.primary_type || acc.type || '').toUpperCase();

      accountGroupMap.set(lowerName, { group, primaryType });

      if (
        group.includes('cash') ||
        group.includes('bank') ||
        lowerName.includes('cash') ||
        lowerName.includes('bank') ||
        lowerName.includes('sbi') ||
        lowerName.includes('pnb')
      ) {
        cashBankHeadNames.add(lowerName);
      }
    });

    // Default safety heads
    cashBankHeadNames.add('cash in hand');
    cashBankHeadNames.add('cash-in-hand');
    cashBankHeadNames.add('cash in hand (रोकड़)');
    cashBankHeadNames.add('bank account');

    // 2. Fetch vouchers strictly from firm-scoped buckets with zero-loss deduplication
    const scopedKeys = [
      `app_vouchers_${activeFirmId}`,
      `account_book_vouchers_${activeFirmId}`
    ];

    const uniqueVoucherMap = new Map();
    scopedKeys.forEach(k => {
      const list = StorageService.getItem(k, []);
      if (Array.isArray(list)) {
        list.forEach(v => {
          if (!v) return;
          const vFirm = String(v.firm_id || v.firmId || '').trim();
          if (vFirm && vFirm !== activeFirmId) return; // Strict boundary

          const uId =
            v.id ||
            v.voucher_number ||
            v.reference_no ||
            `${v.voucher_date || v.date}-${v.amount || v.total_amount || 0}`;

          if (!uniqueVoucherMap.has(uId)) {
            uniqueVoucherMap.set(uId, v);
          }
        });
      }
    });

    const vouchers = Array.from(uniqueVoucherMap.values());

    let operatingCashIn = 0;
    let operatingCashOut = 0;
    let investingCashOut = 0;
    let financingCashIn = 0;
    let financingCashOut = 0;

    vouchers.forEach(v => {
      const vDate = v.voucher_date || v.date || '';
      if (fromDate && vDate && vDate < fromDate) return;
      if (toDate && vDate && vDate > toDate) return;

      const vType = String(v.voucher_type || v.type || '').toUpperCase();
      const narration = String(v.narration || v.notes || '').toLowerCase();

      // Normalize transaction entries into uniform double-entry legs
      let legs = [];
      if (Array.isArray(v.entries) && v.entries.length > 0) {
        legs = v.entries.map(e => ({
          account: String(e.account_name || e.party || '').trim(),
          type: String(e.type || (Number(e.debit) > 0 ? 'DR' : 'CR')).toUpperCase(),
          amount: Number(e.amount || e.debit || e.credit || 0)
        }));
      } else {
        const amt = Number(v.amount || v.total_amount || 0);
        if (v.dr_account) {
          legs.push({ account: String(v.dr_account).trim(), type: 'DR', amount: amt });
        }
        if (v.cr_account) {
          legs.push({ account: String(v.cr_account).trim(), type: 'CR', amount: amt });
        }
      }

      if (legs.length === 0) return;

      // Identify Cash/Bank legs vs Counterparty legs
      const cashLegs = legs.filter(l => cashBankHeadNames.has(l.account.toLowerCase()));
      const nonCashLegs = legs.filter(l => !cashBankHeadNames.has(l.account.toLowerCase()));

      // Case A: Pure Contra Entry (e.g., Cash deposited to Bank or Bank withdrawal)
      // Both sides are Cash/Bank -> Net impact on overall Cash & Bank pool is ZERO
      if (vType === 'CONTRA' || (cashLegs.length > 0 && nonCashLegs.length === 0)) {
        return;
      }

      // If no Cash/Bank head is touched, it's a non-cash JV -> Skip
      if (cashLegs.length === 0) {
        return;
      }

      // Process Cash Inflows (Cash/Bank Debited)
      const cashDebits = cashLegs.filter(l => l.type === 'DR');
      const cashCredits = cashLegs.filter(l => l.type === 'CR');

      // 1. CASH INFLOWS
      cashDebits.forEach(cLeg => {
        const inflowAmt = cLeg.amount;
        if (inflowAmt <= 0) return;

        // Classify counter-leg or narration
        const isFinancing = nonCashLegs.some(n => {
          const accInfo = accountGroupMap.get(n.account.toLowerCase());
          const grp = accInfo?.group || '';
          const pType = accInfo?.primaryType || '';
          return (
            pType === 'EQUITY' ||
            grp.includes('capital') ||
            grp.includes('loan') ||
            grp.includes('borrowing')
          );
        }) || narration.includes('capital') || narration.includes('loan taken');

        if (isFinancing) {
          financingCashIn += inflowAmt;
        } else {
          // Normal Sales, Customer Receipts, and Operating Inflow
          operatingCashIn += inflowAmt;
        }
      });

      // 2. CASH OUTFLOWS
      cashCredits.forEach(cLeg => {
        const outflowAmt = cLeg.amount;
        if (outflowAmt <= 0) return;

        // Classify counter-leg or narration
        let isInvesting = false;
        let isFinancing = false;

        nonCashLegs.forEach(n => {
          const accInfo = accountGroupMap.get(n.account.toLowerCase());
          const grp = accInfo?.group || '';
          const pType = accInfo?.primaryType || '';
          const aName = n.account.toLowerCase();

          if (
            grp.includes('fixed asset') ||
            aName.includes('machinery') ||
            aName.includes('land') ||
            aName.includes('vehicle') ||
            aName.includes('plant')
          ) {
            isInvesting = true;
          } else if (
            pType === 'EQUITY' ||
            grp.includes('drawing') ||
            grp.includes('capital') ||
            grp.includes('loan repayment')
          ) {
            isFinancing = true;
          }
        });

        if (narration.includes('machinery') || narration.includes('fixed asset') || narration.includes('property')) {
          isInvesting = true;
        }
        if (narration.includes('drawing') || narration.includes('loan repayment') || narration.includes('interest paid')) {
          isFinancing = true;
        }

        if (isInvesting) {
          investingCashOut += outflowAmt;
        } else if (isFinancing) {
          financingCashOut += outflowAmt;
        } else {
          // Purchases, Supplier Payments, Wages, Diesel/Fuel, Expenses
          operatingCashOut += outflowAmt;
        }
      });
    });

    const netOperating = round2(operatingCashIn - operatingCashOut);
    const netInvesting = round2(-investingCashOut);
    const netFinancing = round2(financingCashIn - financingCashOut);
    const netChangeInCash = round2(netOperating + netInvesting + netFinancing);

    return {
      success: true,
      operating: {
        inflow: round2(operatingCashIn),
        outflow: round2(operatingCashOut),
        net: netOperating
      },
      investing: {
        inflow: 0,
        outflow: round2(investingCashOut),
        net: netInvesting
      },
      financing: {
        inflow: round2(financingCashIn),
        outflow: round2(financingCashOut),
        net: netFinancing
      },
      netChangeInCash
    };
  } catch (err) {
    console.error("Cash flow calculation error:", err);
    return {
      success: false,
      operating: { inflow: 0, outflow: 0, net: 0 },
      investing: { inflow: 0, outflow: 0, net: 0 },
      financing: { inflow: 0, outflow: 0, net: 0 },
      netChangeInCash: 0
    };
  }
}
