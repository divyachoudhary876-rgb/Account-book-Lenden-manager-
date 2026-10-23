const handleSubmit = (e) => {
  e.preventDefault();
  setStatusMessage(null);

  const cleanName = itemName.trim();
  if (!cleanName) {
    setStatusMessage({ type: 'error', text: 'Kripya Item Name darj karein!' });
    return;
  }

  try {
    const activeFirmId = resolveActiveFirmId(firm);
    const inventoryKey = `inventory_items_${activeFirmId}`;
    
    // 1. Load existing items from storage
    let itemsList = StorageService.getItem(inventoryKey, []) || JSON.parse(localStorage.getItem(inventoryKey) || '[]');
    if (!Array.isArray(itemsList)) itemsList = [];

    const itemId = editingItem ? String(editingItem.id || '').trim() : null;
    const existingIndex = itemId ? itemsList.findIndex(i => i && String(i.id || '').trim() === itemId) : -1;

    const parsedRate = parseFloat(purchasePrice) || 0;

    if (existingIndex !== -1) {
      // 2. Update existing item atomically
      itemsList[existingIndex] = {
        ...itemsList[existingIndex],
        name: cleanName,
        item_name: cleanName,
        unit: unit.trim() || 'Pcs',
        item_type: itemType,
        is_service: itemType === 'SERVICE',
        unit_purchase_price: parsedRate,
        purchase_price: parsedRate,
        rate: parsedRate,
        updated_at: new Date().toISOString()
      };
    } else {
      // 3. Create brand new item
      const newItem = {
        id: `ITEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        firm_id: activeFirmId,
        name: cleanName,
        item_name: cleanName,
        unit: unit.trim() || 'Pcs',
        item_type: itemType,
        is_service: itemType === 'SERVICE',
        unit_purchase_price: parsedRate,
        purchase_price: parsedRate,
        rate: parsedRate,
        current_stock: 0,
        stock: 0,
        qty: 0,
        created_at: new Date().toISOString()
      };
      itemsList.unshift(newItem);
    }

    // 4. Save back to all storage fallbacks to ensure sync
    StorageService.setItem(inventoryKey, itemsList);
    localStorage.setItem(inventoryKey, JSON.stringify(itemsList));
    localStorage.setItem('inventory_items', JSON.stringify(itemsList));

    // 5. Trigger UI re-rendering events
    window.dispatchEvent(new Event('app_inventory_updated'));
    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('storage'));

    setStatusMessage({
      type: 'success',
      text: editingItem 
        ? `✓ "${cleanName}" successfully update ho gaya!` 
        : `✓ "${cleanName}" inventory mein save ho gaya!`
    });

    // Reset Form State
    setEditingItem(null);
    setItemName('');
    setUnit('Pcs');
    setItemType('GOODS');
    setOpeningStock('');
    setPurchasePrice('');
    setSellingPrice('');
    setHsnSac('');
    
    // Reload list view
    loadStockItems();
  } catch (err) {
    setStatusMessage({ type: 'error', text: `Failed: ${err.message}` });
  }
};
