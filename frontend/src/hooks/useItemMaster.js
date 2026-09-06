// frontend/src/hooks/useItemMaster.js
import { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';

export const useItemMaster = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const loadItems = () => {
      const globalItems = StorageService.getInventoryItems() || [];
      // Alphabetical sorting for better Dropdown UX
      const sortedItems = globalItems.sort((a, b) => 
        (a.item_name || '').localeCompare(b.item_name || '')
      );
      setItems(sortedItems);
    };

    loadItems();

    // Global Reactivity: Listen for any storage updates across the app
    window.addEventListener('app_storage_updated', loadItems);
    window.addEventListener('storage', loadItems);

    return () => {
      window.removeEventListener('app_storage_updated', loadItems);
      window.removeEventListener('storage', loadItems);
    };
  }, []);

  return items;
};
