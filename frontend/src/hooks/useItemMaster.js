import { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';

export const useItemMaster = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const loadItems = () => {
      const globalItems = StorageService.getInventoryItems() || [];
      const sortedItems = globalItems.sort((a, b) => 
        (a.item_name || '').localeCompare(b.item_name || '')
      );
      setItems(sortedItems);
    };

    loadItems();

    window.addEventListener('app_storage_updated', loadItems);
    window.addEventListener('storage', loadItems);

    return () => {
      window.removeEventListener('app_storage_updated', loadItems);
      window.removeEventListener('storage', loadItems);
    };
  }, []);

  return items;
};
