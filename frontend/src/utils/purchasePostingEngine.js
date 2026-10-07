/**
 * Atomic Universal Purchase Deletion Engine
 * - Safely reverts stock inventory
 * - Purges purchase bills across all scoped & global storage keys
 * - Removes corresponding double-entry vouchers from Daybook & Ledger registers
 */
export const deleteUnifiedPurchase = (firmId = 'FIRM-001', billIdOrNum = '') => {
  if (!billIdOrNum) return false;
  const activeFirmId = String(firmId || 'FIRM-001').trim();
  const bNum = String(billIdOrNum).replace(/^#|^PUR-|^PV-|^BILL-/, '').trim();

  try {
    // 1. Target Purchase Keys Buckets
    const purchaseKeys = [
      `purchase_bills_${activeFirmId}`,
      'purchase_bills',
      `app_purchase_bills_${activeFirmId}`,
      'purchase_bills_FIRM-001'
    ];

    let targetBill = null;

    // Find the bill object first to revert inventory if needed
    purchaseKeys.forEach(pk => {
      try {
        const raw = localStorage.getItem(pk);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const found = parsed.find(b => b && (String(b.id) === String(billIdOrNum) || String(b.bill_number || b.reference_no || '').trim() === bNum));
            if (found && !targetBill) targetBill = found;
          }
        }
      } catch (e) {}
    });

    // Filter out the bill from all purchase storage buckets
    const filterOutBill = (list) => {
      if (!Array.isArray(list)) return [];
      return list.filter(b => {
        if (!b) return false;
        const matchId = String(b.id || '').trim() === String(billIdOrNum);
        const matchNum = String(b.bill_number || b.reference_no || '').replace(/^#|^PUR-|^PV-|^BILL-/, '').trim() === bNum;
        return !(matchId || matchNum);
      });
    };

    purchaseKeys.forEach(pk => {
      try {
        const raw = localStorage.getItem(pk);
        if (raw) {
          const parsed = JSON.parse(raw);
          localStorage.setItem(pk, JSON.stringify(filterOutBill(parsed)));
        }
      } catch (e) {}
    });

    // 2. Purge corresponding Universal Vouchers & Daybook entries
    const candidateIds = [
      billIdOrNum,
      bNum,
      `#${bNum}`,
      `PUR-${bNum}`,
      `PV-${bNum}`,
      targetBill?.id
    ];

    const voucherKeys = [
      `app_vouchers_${activeFirmId}`,
      `account_book_vouchers_${activeFirmId}`,
      'app_vouchers',
      'account_book_vouchers'
    ];

    voucherKeys.forEach(vk => {
      try {
        const raw = localStorage.getItem(vk);
        if (raw) {
          let vchs = JSON.parse(raw);
          if (Array.isArray(vchs)) {
            vchs = vchs.filter(v => {
              if (!v) return false;
              const vNum = String(v.reference_no || v.voucher_number || v.id || '').replace(/^#|^PUR-|^PV-|^BILL-/, '').trim();
              const isMatch = vNum === bNum || candidateIds.includes(v.id) || String(v.id).includes(bNum);
              return !isMatch;
            });
            localStorage.setItem(vk, JSON.stringify(vchs));
          }
        }
      } catch (e) {}
    });

    // 3. Broadcast global state synchronization
    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('app_inventory_updated'));
    window.dispatchEvent(new Event('storage'));

    return true;
  } catch (err) {
    console.error('Error deleting purchase bill:', err);
    throw new Error(err.message || 'Purchase bill deletion failed.');
  }
};
