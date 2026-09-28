// frontend/src/utils/costingEngine.js
import { StorageService } from './storageSync';

/**
 * Automatically calculates the weighted average purchase rate of a raw material 
 * from past purchase vouchers and inventory master.
 */
export const getAutoMaterialRate = (firmId, materialName) => {
  try {
    const inventory = StorageService.getItem('inventory_items') || [];
    const item = inventory.find(i => 
      (i.item_name || i.name)?.toLowerCase() === materialName.toLowerCase() && 
      (!i.firm_id || i.firm_id === firmId)
    );
    if (item && (item.unit_purchase_price || item.purchase_price)) {
      return Number(item.unit_purchase_price || item.purchase_price);
    }

    const vouchers = StorageService.getItem(`app_vouchers_${firmId}`) || [];
    let totalQty = 0;
    let totalAmount = 0;

    vouchers.forEach(vch => {
      if (vch.voucher_type === 'PURCHASE' && Array.isArray(vch.entries)) {
        vch.entries.forEach(entry => {
          if ((entry.account_name || '').toLowerCase() === materialName.toLowerCase() && entry.debit > 0) {
            totalAmount += Number(entry.debit);
            totalQty += 1;
          }
        });
      }
    });

    if (totalQty > 0 && totalAmount > 0) {
      return totalAmount / totalQty;
    }
  } catch (e) {
    console.error('Error auto-fetching material rate:', e);
  }
  return 1;
};

/**
 * Automatically calculates total labor & overhead expenses incurred for a firm 
 * from past payroll or journal entries.
 */
export const getAutoLaborAndOverheads = (firmId) => {
  try {
    const vouchers = StorageService.getItem(`app_vouchers_${firmId}`) || [];
    let totalLabor = 0;
    let totalOverhead = 0;

    vouchers.forEach(vch => {
      if (Array.isArray(vch.entries)) {
        vch.entries.forEach(entry => {
          const name = (entry.account_name || '').toLowerCase();
          if (name.includes('labor') || name.includes('mazduri') || name.includes('pathai') || name.includes('wages')) {
            totalLabor += Number(entry.debit || 0);
          }
          if (name.includes('diesel') || name.includes('overhead') || name.includes('maintenance') || name.includes('machinery')) {
            totalOverhead += Number(entry.debit || 0);
          }
        });
      }
    });

    return { totalLabor, totalOverhead };
  } catch (e) {
    console.error('Error auto-fetching labor/overheads:', e);
  }
  return { totalLabor: 0, totalOverhead: 0 };
};
