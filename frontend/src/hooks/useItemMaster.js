import { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';

export const useItemMaster = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const loadItems = () => {
      const globalItems = StorageService.getInventoryItems();
      // अल्फाबेटिकल ऑर्डर में सॉर्ट करें ताकि ड्रॉपडाउन में ढूँढना आसान हो
      const sortedItems = globalItems.sort((a, b) => 
        (a.item_name || '').localeCompare(b.item_name || '')
      );
      setItems(sortedItems);
    };

    // पहली बार लोड करें
    loadItems();

    // जब भी कोई नया आइटम बने, यह पूरे ऐप को अपडेट कर देगा
    window.addEventListener('app_storage_updated', loadItems);
    window.addEventListener('storage', loadItems);

    return () => {
      window.removeEventListener('app_storage_updated', loadItems);
      window.removeEventListener('storage', loadItems);
    };
  }, []);

  return items;
};
