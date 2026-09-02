// frontend/src/utils/payrollEngine.js

import { saveUniversalVoucher } from './voucherPostingEngine.js';
import { getAllUniversalVouchers } from './statementEngine.js';
import { saveMasterAccount } from './accountMasterEngine.js';

/**
 * 1. Fetch all payroll entities for firm
 */
export const getPayrollEntities = (firmId = 'FIRM-001') => {
  try {
    const raw = localStorage.getItem(`app_payroll_entities_${firmId}`);
    if (raw) return JSON.parse(raw);
    
    // Baseline sample entities
    const defaultEntities = [
      { id: 'PR-001', entity_name: 'Munshi Ji (Accountant)', entity_type: 'MONTHLY_STAFF', rate_type: 'PER_MONTH', standard_rate: 18000, linked_ledger_account: 'Munshi Ji (Salaries Payable)' },
      { id: 'PR-002', entity_name: 'Ram Dayal (Pathai Theka)', entity_type: 'PIECE_RATE_LABOUR', rate_type: 'PER_THOUSAND_PCS', standard_rate: 650, linked_ledger_account: 'Ram Dayal Thekedar' },
      { id: 'PR-003', entity_name: 'Tractor RJ-13-EA-4512 (Driver/Owner)', entity_type: 'TRACTOR_MACHINERY', rate_type: 'PER_DAY', standard_rate: 1500, linked_ledger_account: 'Tractor RJ-13 Owner Khata' }
    ];
    localStorage.setItem(`app_payroll_entities_${firmId}`, JSON.stringify(defaultEntities));
    return defaultEntities;
  } catch {
    return [];
  }
};

/**
 * 2. Add New Worker / Machinery Profile
 */
export const savePayrollEntity = (firmId = 'FIRM-001', data = {}) => {
  const list = getPayrollEntities(firmId);
  const cleanName = data.entity_name.trim();

  // Create corresponding ledger account in Sundry Creditors / Payables
  saveMasterAccount(firmId, {
    account_name: cleanName,
    primary_type: 'LIABILITIES',
    sub_group: 'Sundry Creditors (Suppliers / लेनदार)',
    opening_balance: 0,
    balance_type: 'Cr'
  });

  const newEntity = {
    id: data.id || `PR-${Date.now()}`,
    entity_name: cleanName,
    entity_type: data.entity_type || 'PIECE_RATE_LABOUR',
    rate_type: data.rate_type || 'PER_THOUSAND_PCS',
    standard_rate: parseFloat(data.standard_rate || 0),
    phone: data.phone || '',
    linked_ledger_account: cleanName
  };

  const existingIdx = list.findIndex(e => e.id === newEntity.id);
  if (existingIdx !== -1) list[existingIdx] = newEntity;
  else list.push(newEntity);

  localStorage.setItem(`app_payroll_entities_${firmId}`, JSON.stringify(list));
  window.dispatchEvent(new Event('app_state_updated'));
  return newEntity;
};

/**
 * 3. Log Work Done & Post Accrual Journal Entry
 */
export const recordWorkLog = (firmId = 'FIRM-001', payload = {}) => {
  const {
    entity_id,
    work_date = new Date().toISOString().split('T')[0],
    work_units = 0,
    applied_rate = 0,
    work_description = '',
    expense_head = 'Labor & Pathai Expense (मजदूरी/पथाई)'
  } = payload;

  const entities = getPayrollEntities(firmId);
  const entity = entities.find(e => e.id === entity_id);
  if (!entity) throw new Error('Worker/Machine profile not found.');

  const units = parseFloat(work_units || 0);
  const rate = parseFloat(applied_rate || 0);
  const grossAmount = units * rate;

  if (grossAmount <= 0) throw new Error('Units and rate must be greater than zero.');

  // Automatic Journal Entry: Dr Expense, Cr Worker Khata
  const vchRef = `WRK-${Date.now().toString().slice(-5)}`;
  saveUniversalVoucher(firmId, {
    voucher_type: 'JOURNAL',
    voucher_date: work_date,
    dr_account: expense_head,
    cr_account: entity.linked_ledger_account,
    amount: grossAmount,
    reference_no: vchRef,
    narration: `Work credit: ${work_description || `${units} units @ ₹${rate}`}`
  });

  const logsKey = `app_payroll_work_logs_${firmId}`;
  const logs = JSON.parse(localStorage.getItem(logsKey) || '[]');
  logs.push({
    id: `WLOG-${Date.now()}`,
    entity_id,
    entity_name: entity.entity_name,
    work_date,
    work_units: units,
    applied_rate: rate,
    gross_amount: grossAmount,
    work_description,
    expense_head,
    voucher_ref: vchRef
  });
  localStorage.setItem(logsKey, JSON.stringify(logs));

  window.dispatchEvent(new Event('app_state_updated'));
  return { grossAmount, vchRef };
};

/**
 * 4. Get Worker Account Milan & Settlement Balance Summary
 */
export const getWorkerPayrollSummary = (firmId = 'FIRM-001', entityName = '') => {
  const vouchers = getAllUniversalVouchers(firmId);
  const targetName = entityName.trim().toLowerCase();

  let totalEarned = 0; // Credit in Worker Account (Kam ke paise bane)
  let totalPaid = 0;   // Debit in Worker Account (Payment voucher se diye gaye)

  const transactionList = [];

  vouchers.forEach(v => {
    const dr = (v.dr_account || v.dr_party || '').trim().toLowerCase();
    const cr = (v.cr_account || v.cr_party || '').trim().toLowerCase();
    const amt = parseFloat(v.amount || 0);

    if (cr === targetName) {
      // Work credit or liability created
      totalEarned += amt;
      transactionList.push({
        date: v.voucher_date || v.date,
        type: v.voucher_type || 'JOURNAL',
        particulars: v.narration || 'Work Done / Salary Due',
        earned: amt,
        paid: 0
      });
    } else if (dr === targetName) {
      // Payment given to worker
      totalPaid += amt;
      transactionList.push({
        date: v.voucher_date || v.date,
        type: v.voucher_type || 'PAYMENT',
        particulars: v.narration || 'Payment Settlement',
        earned: 0,
        paid: amt
      });
    }
  });

  return {
    entity_name: entityName,
    total_earned: totalEarned,
    total_paid: totalPaid,
    net_payable: totalEarned - totalPaid, // Positive = Dena baki hai, Negative = Advance diya hua hai
    transactions: transactionList
  };
};
