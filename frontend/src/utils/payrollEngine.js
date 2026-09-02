// frontend/src/utils/payrollEngine.js

import { saveUniversalVoucher } from './voucherPostingEngine.js';
import { getAllUniversalVouchers } from './statementEngine.js';
import { saveMasterAccount, getFirmMasterAccounts } from './accountMasterEngine.js';

/**
 * 1. Fetch all payroll entities for active firm
 */
export const getPayrollEntities = (firmId = 'FIRM-001') => {
  try {
    const raw = localStorage.getItem(`app_payroll_entities_${firmId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }

    const defaultEntities = [
      { id: 'PR-001', entity_name: 'Munshi Ji (Accountant)', entity_type: 'MONTHLY_STAFF', rate_type: 'PER_MONTH', standard_rate: 18000, linked_ledger_account: 'Munshi Ji (Accountant)' },
      { id: 'PR-002', entity_name: 'Ram Dayal (Pathai Theka)', entity_type: 'PIECE_RATE_LABOUR', rate_type: 'PER_THOUSAND_PCS', standard_rate: 650, linked_ledger_account: 'Ram Dayal (Pathai Theka)' },
      { id: 'PR-003', entity_name: 'Tractor RJ-13 (Driver/Owner)', entity_type: 'TRACTOR_MACHINERY', rate_type: 'PER_DAY', standard_rate: 1500, linked_ledger_account: 'Tractor RJ-13 (Driver/Owner)' }
    ];
    localStorage.setItem(`app_payroll_entities_${firmId}`, JSON.stringify(defaultEntities));
    return defaultEntities;
  } catch {
    return [];
  }
};

/**
 * 2. Save / Edit Worker or Machinery Profile with Linked Ledger Sync
 */
export const savePayrollEntity = (firmId = 'FIRM-001', data = {}) => {
  const list = getPayrollEntities(firmId);
  const cleanName = (data.entity_name || '').trim();
  if (!cleanName) throw new Error('Worker / Tractor name cannot be empty.');

  const existingIdx = list.findIndex(e => e.id === data.id);
  let previousName = null;

  if (existingIdx !== -1) {
    previousName = list[existingIdx].entity_name;
  }

  // Synchronize or create ledger account in Chart of Accounts
  saveMasterAccount(firmId, {
    account_name: cleanName,
    primary_type: 'LIABILITIES',
    sub_group: 'Sundry Creditors (Suppliers / लेनदार)',
    opening_balance: 0,
    balance_type: 'Cr'
  });

  // If entity renamed, update vouchers linked to old name
  if (previousName && previousName !== cleanName) {
    const vouchersKey = `app_vouchers_${firmId}`;
    const vouchers = JSON.parse(localStorage.getItem(vouchersKey) || '[]');
    vouchers.forEach(v => {
      if (v.cr_account === previousName) v.cr_account = cleanName;
      if (v.dr_account === previousName) v.dr_account = cleanName;
      if (v.cr_party === previousName) v.cr_party = cleanName;
      if (v.dr_party === previousName) v.dr_party = cleanName;
    });
    localStorage.setItem(vouchersKey, JSON.stringify(vouchers));
  }

  const updatedEntity = {
    id: data.id || `PR-${Date.now()}`,
    entity_name: cleanName,
    entity_type: data.entity_type || 'PIECE_RATE_LABOUR',
    rate_type: data.rate_type || 'PER_THOUSAND_PCS',
    standard_rate: parseFloat(data.standard_rate || 0),
    phone: data.phone || '',
    linked_ledger_account: cleanName,
    updated_at: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    list[existingIdx] = updatedEntity;
  } else {
    list.push(updatedEntity);
  }

  localStorage.setItem(`app_payroll_entities_${firmId}`, JSON.stringify(list));
  window.dispatchEvent(new Event('app_state_updated'));
  return updatedEntity;
};

/**
 * 3. Delete Worker / Tractor Profile
 */
export const deletePayrollEntity = (firmId = 'FIRM-001', entityId = '') => {
  const list = getPayrollEntities(firmId);
  const updated = list.filter(e => e.id !== entityId);
  localStorage.setItem(`app_payroll_entities_${firmId}`, JSON.stringify(updated));
  window.dispatchEvent(new Event('app_state_updated'));
  return true;
};

/**
 * 4. Get Work Logs
 */
export const getPayrollWorkLogs = (firmId = 'FIRM-001') => {
  try {
    return JSON.parse(localStorage.getItem(`app_payroll_work_logs_${firmId}`) || '[]');
  } catch {
    return [];
  }
};

/**
 * 5. Record or Edit Work Log (Double-Entry Synchronized)
 */
export const recordWorkLog = (firmId = 'FIRM-001', payload = {}) => {
  const {
    id, // If present, it's an edit
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

  const logsKey = `app_payroll_work_logs_${firmId}`;
  const logs = getPayrollWorkLogs(firmId);
  const vouchersKey = `app_vouchers_${firmId}`;
  const vouchers = JSON.parse(localStorage.getItem(vouchersKey) || '[]');

  let vchRef = '';

  if (id) {
    // EDIT MODE: Update existing work log and sync existing voucher
    const logIdx = logs.findIndex(l => l.id === id);
    if (logIdx === -1) throw new Error('Work log not found for editing.');

    vchRef = logs[logIdx].voucher_ref;
    const vchIdx = vouchers.findIndex(v => v.reference_no === vchRef);

    if (vchIdx !== -1) {
      vouchers[vchIdx].voucher_date = work_date;
      vouchers[vchIdx].date = work_date;
      vouchers[vchIdx].dr_account = expense_head;
      vouchers[vchIdx].cr_account = entity.linked_ledger_account;
      vouchers[vchIdx].amount = grossAmount;
      vouchers[vchIdx].narration = `Work credit: ${work_description || `${units} units @ ₹${rate}`}`;
      localStorage.setItem(vouchersKey, JSON.stringify(vouchers));
    }

    logs[logIdx] = {
      ...logs[logIdx],
      entity_id,
      entity_name: entity.entity_name,
      work_date,
      work_units: units,
      applied_rate: rate,
      gross_amount: grossAmount,
      work_description,
      expense_head,
      updated_at: new Date().toISOString()
    };
  } else {
    // NEW ENTRY MODE
    vchRef = `WRK-${Date.now().toString().slice(-5)}`;
    saveUniversalVoucher(firmId, {
      voucher_type: 'JOURNAL',
      voucher_date: work_date,
      dr_account: expense_head,
      cr_account: entity.linked_ledger_account,
      amount: grossAmount,
      reference_no: vchRef,
      narration: `Work credit: ${work_description || `${units} units @ ₹${rate}`}`
    });

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
      voucher_ref: vchRef,
      created_at: new Date().toISOString()
    });
  }

  localStorage.setItem(logsKey, JSON.stringify(logs));
  window.dispatchEvent(new Event('app_state_updated'));
  return { grossAmount, vchRef };
};

/**
 * 6. Delete Work Log (Removes Corresponding Journal Voucher)
 */
export const deleteWorkLog = (firmId = 'FIRM-001', logId = '') => {
  const logsKey = `app_payroll_work_logs_${firmId}`;
  const logs = getPayrollWorkLogs(firmId);
  const target = logs.find(l => l.id === logId);

  if (!target) return false;

  // Remove corresponding Journal Voucher
  const vouchersKey = `app_vouchers_${firmId}`;
  const vouchers = JSON.parse(localStorage.getItem(vouchersKey) || '[]');
  const updatedVouchers = vouchers.filter(v => v.reference_no !== target.voucher_ref);
  localStorage.setItem(vouchersKey, JSON.stringify(updatedVouchers));

  // Remove work log
  const updatedLogs = logs.filter(l => l.id !== logId);
  localStorage.setItem(logsKey, JSON.stringify(updatedLogs));

  window.dispatchEvent(new Event('app_state_updated'));
  return true;
};

/**
 * 7. Get Summary & Editable Ledger Entries
 */
export const getWorkerPayrollSummary = (firmId = 'FIRM-001', entityName = '') => {
  const vouchers = getAllUniversalVouchers(firmId);
  const logs = getPayrollWorkLogs(firmId);
  const targetName = entityName.trim().toLowerCase();

  let totalEarned = 0;
  let totalPaid = 0;
  const transactionList = [];

  vouchers.forEach(v => {
    const dr = (v.dr_account || v.dr_party || '').trim().toLowerCase();
    const cr = (v.cr_account || v.cr_party || '').trim().toLowerCase();
    const amt = parseFloat(v.amount || 0);

    if (cr === targetName) {
      totalEarned += amt;
      const matchedLog = logs.find(l => l.voucher_ref === v.reference_no);

      transactionList.push({
        id: v.id,
        log_id: matchedLog?.id || null,
        reference_no: v.reference_no,
        date: v.voucher_date || v.date,
        type: v.voucher_type || 'JOURNAL',
        particulars: v.narration || 'Work Done / Salary Due',
        earned: amt,
        paid: 0,
        is_work_log: Boolean(matchedLog)
      });
    } else if (dr === targetName) {
      totalPaid += amt;
      transactionList.push({
        id: v.id,
        log_id: null,
        reference_no: v.reference_no,
        date: v.voucher_date || v.date,
        type: v.voucher_type || 'PAYMENT',
        particulars: v.narration || 'Payment Settlement',
        earned: 0,
        paid: amt,
        is_work_log: false
      });
    }
  });

  return {
    entity_name: entityName,
    total_earned: totalEarned,
    total_paid: totalPaid,
    net_payable: totalEarned - totalPaid,
    transactions: transactionList.reverse()
  };
};
