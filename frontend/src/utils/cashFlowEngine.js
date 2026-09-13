// frontend/src/utils/cashFlowEngine.js
import { StorageService } from './storageSync';

export function computeCashFlowStatement(activeFirmId, fromDate, toDate) {
  try {
    let vouchers = [];
    const keys = ['account_book_vouchers', `account_book_vouchers_${activeFirmId}`];
    keys.forEach(k => {
      const val = StorageService.getItem(k);
      if (Array.isArray(val)) vouchers.push(...val);
    });

    let operatingCashIn = 0;
    let operatingCashOut = 0;
    let investingCashOut = 0;
    let financingCashIn = 0;
    let financingCashOut = 0;

    vouchers.forEach(v => {
      if (!v) return;
      const vDate = v.voucher_date || v.date || '';
      if (fromDate && vDate && vDate < fromDate) return;
      if (toDate && vDate && vDate > toDate) return;

      const amt = Number(v.amount || v.total_amount || 0);
      const dr = (v.dr_account || '').toLowerCase();
      const cr = (v.cr_account || '').toLowerCase();
      const vType = String(v.voucher_type || v.type || '').toUpperCase();
      const narration = (v.narration || '').toLowerCase();

      // Check if it involves Cash or Bank
      const isCashOrBank = dr.includes('cash') || dr.includes('bank') || cr.includes('cash') || cr.includes('bank');
      if (!isCashOrBank && vType !== 'RECEIPT' && vType !== 'PAYMENT') return;

      if (vType === 'RECEIPT' || dr.includes('cash') || dr.includes('bank')) {
        if (narration.includes('loan') || narration.includes('capital')) {
          financingCashIn += amt;
        } else {
          operatingCashIn += amt;
        }
      } else if (vType === 'PAYMENT' || cr.includes('cash') || cr.includes('bank')) {
        if (narration.includes('asset') || narration.includes('machinery') || narration.includes('building')) {
          investingCashOut += amt;
        } else if (narration.includes('loan') || narration.includes('drawing')) {
          financingCashOut += amt;
        } else {
          operatingCashOut += amt;
        }
      }
    });

    const netOperating = operatingCashIn - operatingCashOut;
    const netInvesting = -investingCashOut;
    const netFinancing = financingCashIn - financingCashOut;
    const netChangeInCash = netOperating + netInvesting + netFinancing;

    return {
      success: true,
      operating: { inflow: operatingCashIn, outflow: operatingCashOut, net: netOperating },
      investing: { outflow: investingCashOut, net: netInvesting },
      financing: { inflow: financingCashIn, outflow: financingCashOut, net: netFinancing },
      netChangeInCash
    };
  } catch (err) {
    console.error("Cash flow calculation error:", err);
    return { success: false, netChangeInCash: 0 };
  }
}
