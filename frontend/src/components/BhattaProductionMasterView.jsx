// frontend/src/components/BhattaProductionMasterView.jsx

import React, { useState, useEffect } from 'react';
import { loadFirmData, saveFirmData } from '../utils/firmIsolationEngine';
import { getCurrentActiveFY } from '../utils/financialYearLockEngine';
import { saveUniversalVoucher } from '../utils/voucherPostingEngine';
import { getFirmMasterAccounts, saveMasterAccount } from '../utils/accountMasterEngine';
import SearchableStockDropdown from './SearchableStockDropdown';
import BhattaCostAuditView from './BhattaCostAuditView';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

// Standard Brick Kiln Stock Grade Templates
const STANDARD_BRICK_GRADES = [
  { key: 'INT_1_NO', name: 'Int 1 Number (अव्वल)', unit: 'Pcs', costFactor: 1.05 },
  { key: 'INT_2_NO', name: 'Int 2 Number (दोयम)', unit: 'Pcs', costFactor: 0.90 },
  { key: 'INT_PILA', name: 'Int 1.25 Number (पीला / सवाया)', unit: 'Pcs', costFactor: 0.75 },
  { key: 'KHORA', name: 'Khora Eent (खोरा / खंगार)', unit: 'Pcs', costFactor: 0.55 },
  { key: 'CHATTA', name: 'Chatta Eent (चट्टा)', unit: 'Pcs', costFactor: 0.50 },
  { key: 'TUKDA', name: 'Tukda / Rodi (रोड़ा / खंडा)', unit: 'Trolley', costFactor: 0.35 }
];

export default function BhattaProductionMasterView({ firm, onClose }) {
  const activeFY = getCurrentActiveFY();
  const activeFirmId = firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';

  // Toggle Tab: Stage Production vs Full Round Cost Audit
  const [activeTab, setActiveTab] = useState('STAGE_PROD'); // 'STAGE_PROD' | 'ROUND_AUDIT'

  const [productionDate, setProductionDate] = useState(new Date().toISOString().slice(0, 10));
  const [useForLocation, setUseForLocation] = useState('');
  
  // Production Stage
  const [productionStage, setProductionStage] = useState('STAGE_3_NIKASI');
  const [labourStartDate, setLabourStartDate] = useState('');
  const [labourEndDate, setLabourEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Raw Materials Consumption
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [materialQty, setMaterialQty] = useState('');
  const [consumedMaterials, setConsumedMaterials] = useState([]);

  // Direct Overheads
  const [directLaborCost, setDirectLaborCost] = useState('');
  const [machineryOverheads, setMachineryOverheads] = useState('');

  // Output Mode: Multi-Grade Concurrent Split vs Single Item
  const [isMultiGradeOutput, setIsMultiGradeOutput] = useState(true);
  
  // Single Item Output State
  const [outputItem, setOutputItem] = useState('');
  const [producedQty, setProducedQty] = useState('');

  // Multi-Grade Output State
  const [multiGradeQuantities, setMultiGradeQuantities] = useState({
    INT_1_NO: '',
    INT_2_NO: '',
    INT_PILA: '',
    KHORA: '',
    CHATTA: '',
    TUKDA: ''
  });

  const [batchesList, setBatchesList] = useState([]);
  const [editingBatchId, setEditingBatchId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const loadData = () => {
    if (!firm) return;
    const rawItems = loadFirmData('inventory_items', firm, []);
    const validItems = (Array.isArray(rawItems) ? rawItems : []).filter(i => i && (i.name || i.item_name));
    setInventoryItems(validItems);

    const savedBatches = loadFirmData('production_batches', firm, []);
    const safeBatches = Array.isArray(savedBatches) ? savedBatches : [];
    safeBatches.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    setBatchesList(safeBatches);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_storage_updated', loadData);
    window.addEventListener('app_state_updated', loadData);
    return () => {
      window.removeEventListener('app_storage_updated', loadData);
      window.removeEventListener('app_state_updated', loadData);
    };
  }, [firm, activeFirmId]);

  // One-Click Helper: Ensure all Standard Bhatta Grades Exist in Inventory
  const handleSeedStandardItems = () => {
    let currentInventory = [...inventoryItems];
    let addedCount = 0;

    STANDARD_BRICK_GRADES.forEach(std => {
      const exists = currentInventory.some(i => 
        (i.name || i.item_name || '').toLowerCase().includes(std.name.split(' ')[0].toLowerCase())
      );

      if (!exists) {
        const newItem = {
          id: `ITEM-BRICK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: std.name,
          item_name: std.name,
          unit: std.unit,
          current_stock: 0,
          stock: 0,
          qty: 0,
          cost_price: 0,
          rate: 0,
          created_at: new Date().toISOString()
        };
        currentInventory.push(newItem);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      setInventoryItems(currentInventory);
      saveFirmData('inventory_items', firm, currentInventory);
      window.dispatchEvent(new Event('app_storage_updated'));
      setFeedback({ type: 'success', message: `✓ ${addedCount} standard brick items inventory me add kar diye gaye!` });
    } else {
      setFeedback({ type: 'info', message: 'ℹ Sabhi standard brick items pehle se inventory me maujood hain.' });
    }
  };

  // AUTO-FETCH ACCRUED LABOUR EXPENSES
  const handleAutoFetchLabour = () => {
    try {
      const payrollEntries = loadFirmData('app_payroll_entries', firm, []);
      let totalFetchedLabour = 0;
      let totalFetchedOverheads = 0;
      let matchedCount = 0;

      (Array.isArray(payrollEntries) ? payrollEntries : []).forEach(ent => {
        if (!ent) return;
        const eDate = ent.date || ent.timestamp?.slice(0, 10) || '';
        if (labourStartDate && eDate < labourStartDate) return;
        if (labourEndDate && eDate > labourEndDate) return;

        const ledger = (ent.expense_ledger || '').toLowerCase();
        const amt = Number(ent.total_amount || 0);

        if (productionStage === 'STAGE_1_PATHAI') {
          if (ledger.includes('pathai') || ledger.includes('labor') || ledger.includes('labour')) {
            totalFetchedLabour += amt;
            matchedCount++;
          }
        } else if (productionStage === 'STAGE_2_PAKAI') {
          if (ledger.includes('bharai') || ledger.includes('jhonkai') || ledger.includes('mistri') || ledger.includes('pakai')) {
            totalFetchedLabour += amt;
            matchedCount++;
          } else if (ledger.includes('diesel') || ledger.includes('tractor')) {
            totalFetchedOverheads += amt;
          }
        } else if (productionStage === 'STAGE_3_NIKASI') {
          if (ledger.includes('nikasi') || ledger.includes('loading')) {
            totalFetchedLabour += amt;
            matchedCount++;
          } else if (ledger.includes('diesel') || ledger.includes('tractor')) {
            totalFetchedOverheads += amt;
          }
        } else {
          totalFetchedLabour += amt;
          matchedCount++;
        }
      });

      setDirectLaborCost(String(round2(totalFetchedLabour)));
      if (totalFetchedOverheads > 0) {
        setMachineryOverheads(String(round2(totalFetchedOverheads)));
      }

      setFeedback({
        type: 'success',
        message: `✓ ${matchedCount} payroll entries se ₹${totalFetchedLabour.toLocaleString('en-IN')} Labour Cost auto-fetch ho gayi!`
      });
    } catch (err) {
      alert('Error fetching labour: ' + err.message);
    }
  };

  const handleAddMaterial = () => {
    if (!selectedMaterial || !materialQty || Number(materialQty) <= 0) {
      return alert('Kripya material chunein aur valid quantity darj karein.');
    }
    const itemObj = inventoryItems.find(i => String(i.id) === String(selectedMaterial));
    if (!itemObj) return alert('Selected inventory item not found.');

    const qty = Number(materialQty);
    const costPrice = Number(itemObj.unit_purchase_price || itemObj.purchase_price || itemObj.cost_price || itemObj.rate || 0);

    setConsumedMaterials([
      ...consumedMaterials,
      {
        id: Date.now(),
        itemId: itemObj.id,
        name: itemObj.name || itemObj.item_name,
        qty,
        unit: itemObj.unit || 'Units',
        estimatedCost: round2(qty * costPrice)
      }
    ]);

    setSelectedMaterial('');
    setMaterialQty('');
  };

  const removeConsumedItem = (id) => {
    setConsumedMaterials(consumedMaterials.filter(m => m.id !== id));
  };

  // Cost Calculations
  const totalMaterialCost = round2(consumedMaterials.reduce((sum, m) => sum + (m.estimatedCost || 0), 0));
  const totalProductionCost = round2(totalMaterialCost + (Number(directLaborCost) || 0) + (Number(machineryOverheads) || 0));

  // Multi-Grade Quantities Aggregate
  const totalMultiGradeQty = round2(
    Object.values(multiGradeQuantities).reduce((sum, v) => sum + (Number(v) || 0), 0)
  );

  const baseAverageUnitCost = isMultiGradeOutput
    ? (totalMultiGradeQty > 0 ? totalProductionCost / totalMultiGradeQty : 0)
    : (Number(producedQty) > 0 ? totalProductionCost / Number(producedQty) : 0);

  const handleSaveProduction = (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!useForLocation) return alert('Kripya use location / batch details darj karein.');
    if (consumedMaterials.length === 0) return alert('Kam se kam ek raw material ya fuel jodein.');

    // Validate Output
    if (isMultiGradeOutput) {
      if (totalMultiGradeQty <= 0) {
        return alert('Kripya kam se kam ek grade (1-No, 2-No, 1.25-No, Khora, Chatta) me quantity darj karein.');
      }
    } else {
      if (!outputItem) return alert('Kripya output finished item chunein.');
      if (!producedQty || Number(producedQty) <= 0) return alert('Kripya valid quantity darj karein.');
    }

    try {
      const batchId = editingBatchId || ('PROD-' + Date.now());
      let workingInventory = [...inventoryItems];

      // Revert stock of editing batch if any
      if (editingBatchId) {
        const oldBatch = batchesList.find(b => b.id === editingBatchId);
        if (oldBatch) {
          workingInventory = workingInventory.map(inv => {
            const invId = String(inv.id);
            const oldConsumed = (oldBatch.consumed_materials || []).find(m => String(m.itemId) === invId);
            let curStock = Number(inv.current_stock || inv.stock || inv.qty || 0);

            if (oldConsumed) curStock += Number(oldConsumed.qty);

            if (oldBatch.is_multi_grade && Array.isArray(oldBatch.output_grades)) {
              const matchedGrade = oldBatch.output_grades.find(g => String(g.itemId) === invId);
              if (matchedGrade) curStock = Math.max(0, curStock - Number(matchedGrade.qty));
            } else if (invId === String(oldBatch.output_item_id)) {
              curStock = Math.max(0, curStock - Number(oldBatch.produced_qty));
            }

            return { ...inv, current_stock: round2(curStock), stock: round2(curStock), qty: round2(curStock) };
          });
        }
      }

      // Deduct Consumed Materials
      workingInventory = workingInventory.map(inv => {
        const invId = String(inv.id);
        const consumedMatch = consumedMaterials.find(m => String(m.itemId) === invId);
        if (consumedMatch) {
          const cur = Number(inv.current_stock || inv.stock || inv.qty || 0);
          const newQty = round2(Math.max(0, cur - Number(consumedMatch.qty)));
          return { ...inv, current_stock: newQty, stock: newQty, qty: newQty };
        }
        return inv;
      });

      // Prepare Outputs & Accounts List
      let finalOutputsList = [];
      let totalAssignedBatchCost = totalProductionCost;

      if (isMultiGradeOutput) {
        STANDARD_BRICK_GRADES.forEach(std => {
          const gradeQty = Number(multiGradeQuantities[std.key] || 0);
          if (gradeQty > 0) {
            // Find or Auto-Create Stock Item
            let invIndex = workingInventory.findIndex(i => 
              (i.name || i.item_name || '').toLowerCase().includes(std.name.split(' ')[0].toLowerCase())
            );

            let targetItemId = '';
            let targetItemName = std.name;

            if (invIndex !== -1) {
              targetItemId = workingInventory[invIndex].id;
              targetItemName = workingInventory[invIndex].name || workingInventory[invIndex].item_name;
              const cur = Number(workingInventory[invIndex].current_stock || workingInventory[invIndex].stock || 0);
              const unitVal = round2(baseAverageUnitCost * std.costFactor);
              workingInventory[invIndex] = {
                ...workingInventory[invIndex],
                current_stock: round2(cur + gradeQty),
                stock: round2(cur + gradeQty),
                qty: round2(cur + gradeQty),
                cost_price: unitVal,
                unit_purchase_price: unitVal
              };
            } else {
              targetItemId = `ITEM-${std.key}-${Date.now()}`;
              const unitVal = round2(baseAverageUnitCost * std.costFactor);
              workingInventory.push({
                id: targetItemId,
                name: std.name,
                item_name: std.name,
                unit: std.unit,
                current_stock: gradeQty,
                stock: gradeQty,
                qty: gradeQty,
                cost_price: unitVal,
                unit_purchase_price: unitVal
              });
            }

            const gradeValuation = round2(baseAverageUnitCost * std.costFactor);
            finalOutputsList.push({
              gradeKey: std.key,
              itemId: targetItemId,
              name: targetItemName,
              qty: gradeQty,
              unit: std.unit,
              unitCost: gradeValuation,
              totalCost: round2(gradeQty * gradeValuation)
            });
          }
        });
      } else {
        const outItemObj = workingInventory.find(i => String(i.id) === String(outputItem));
        const outName = (outItemObj?.name || outItemObj?.item_name || 'Finished Goods').trim();
        const pQty = Number(producedQty);
        const unitVal = round2(baseAverageUnitCost);

        workingInventory = workingInventory.map(inv => {
          if (String(inv.id) === String(outputItem)) {
            const cur = Number(inv.current_stock || inv.stock || 0);
            return {
              ...inv,
              current_stock: round2(cur + pQty),
              stock: round2(cur + pQty),
              qty: round2(cur + pQty),
              cost_price: unitVal,
              unit_purchase_price: unitVal
            };
          }
          return inv;
        });

        finalOutputsList.push({
          gradeKey: 'SINGLE',
          itemId: outputItem,
          name: outName,
          qty: pQty,
          unit: outItemObj?.unit || 'Units',
          unitCost: unitVal,
          totalCost: totalAssignedBatchCost
        });
      }

      // Save Inventory Items
      setInventoryItems(workingInventory);
      saveFirmData('inventory_items', firm, workingInventory);

      // Save Production Batch
      const newBatch = {
        id: batchId,
        fiscal_year: activeFY,
        date: productionDate,
        stage: productionStage,
        location: useForLocation,
        consumed_materials: consumedMaterials,
        direct_labor: Number(directLaborCost) || 0,
        machinery_overheads: Number(machineryOverheads) || 0,
        total_cost: totalAssignedBatchCost,
        is_multi_grade: isMultiGradeOutput,
        output_grades: finalOutputsList,
        output_item_name: isMultiGradeOutput ? 'Multi-Grade Bricks' : finalOutputsList[0]?.name,
        produced_qty: isMultiGradeOutput ? totalMultiGradeQty : Number(producedQty),
        unit_valuation: round2(baseAverageUnitCost),
        created_at: new Date().toISOString()
      };

      const filteredBatches = batchesList.filter(b => b.id !== batchId);
      const updatedBatches = [newBatch, ...filteredBatches];
      setBatchesList(updatedBatches);
      saveFirmData('production_batches', firm, updatedBatches);

      // Post Balanced Double-Entry Journal Voucher (JV)
      const accounts = getFirmMasterAccounts(activeFirmId);
      const wipLedger = 'Manufacturing / Work-in-Progress (WIP)';

      if (!accounts.some(a => (a.account_name || a.name || '').toLowerCase() === wipLedger.toLowerCase())) {
        saveMasterAccount(activeFirmId, {
          account_name: wipLedger,
          primary_type: 'EXPENSES',
          type: 'Expenses',
          sub_group: 'Direct Production & Factory Expenses',
          balance_type: 'Cr'
        });
      }

      const jvEntries = [];
      let totalDebitCheck = 0;

      finalOutputsList.forEach(out => {
        const finishedLedger = `${out.name} Stock Account`;
        if (!accounts.some(a => (a.account_name || a.name || '').toLowerCase() === finishedLedger.toLowerCase())) {
          saveMasterAccount(activeFirmId, {
            account_name: finishedLedger,
            primary_type: 'ASSETS',
            type: 'Assets',
            sub_group: 'Finished Goods Inventory (तैयार माल)',
            balance_type: 'Dr'
          });
        }

        const outCostAmt = round2(out.totalCost || (out.qty * out.unitCost));
        totalDebitCheck += outCostAmt;
        jvEntries.push({
          account_name: finishedLedger,
          party: finishedLedger,
          type: 'DR',
          debit: outCostAmt,
          credit: 0,
          amount: outCostAmt
        });
      });

      // Credit WIP
      jvEntries.push({
        account_name: wipLedger,
        party: wipLedger,
        type: 'CR',
        debit: 0,
        credit: totalDebitCheck,
        amount: totalDebitCheck
      });

      saveUniversalVoucher(activeFirmId, {
        id: `JV-${batchId}`,
        firm_id: activeFirmId,
        voucher_type: 'JOURNAL',
        voucher_date: productionDate,
        date: productionDate,
        reference_no: batchId,
        dr_account: jvEntries[0]?.account_name || 'Finished Goods Stock',
        cr_account: wipLedger,
        amount: totalDebitCheck,
        total_amount: totalDebitCheck,
        narration: `Production Batch #${batchId} [${productionStage}]: Produced ${isMultiGradeOutput ? totalMultiGradeQty : producedQty} units at ${useForLocation}. Total cost: ₹${totalDebitCheck}`,
        is_compound: true,
        entries: jvEntries
      });

      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('storage'));

      setFeedback({ 
        type: 'success', 
        message: `✓ Production batch #${batchId} saved! ${finalOutputsList.length} grades stock me add ho gayi aur Journal Voucher balance ho gaya.` 
      });

      setEditingBatchId(null);
      setUseForLocation('');
      setConsumedMaterials([]);
      setDirectLaborCost('');
      setMachineryOverheads('');
      setOutputItem('');
      setProducedQty('');
      setMultiGradeQuantities({ INT_1_NO: '', INT_2_NO: '', INT_PILA: '', KHORA: '', CHATTA: '', TUKDA: '' });

    } catch (err) {
      alert('Error saving production: ' + err.message);
    }
  };

  const handleEditBatch = (batch) => {
    if (!batch) return;
    setEditingBatchId(batch.id);
    setProductionDate(batch.date || new Date().toISOString().slice(0, 10));
    setProductionStage(batch.stage || 'STAGE_3_NIKASI');
    setUseForLocation(batch.location || '');
    setConsumedMaterials(batch.consumed_materials || []);
    setDirectLaborCost(batch.direct_labor ? String(batch.direct_labor) : '');
    setMachineryOverheads(batch.machinery_overheads ? String(batch.machinery_overheads) : '');
    
    if (batch.is_multi_grade && Array.isArray(batch.output_grades)) {
      setIsMultiGradeOutput(true);
      const newQtys = { INT_1_NO: '', INT_2_NO: '', INT_PILA: '', KHORA: '', CHATTA: '', TUKDA: '' };
      batch.output_grades.forEach(g => {
        if (newQtys[g.gradeKey] !== undefined) newQtys[g.gradeKey] = String(g.qty);
      });
      setMultiGradeQuantities(newQtys);
    } else {
      setIsMultiGradeOutput(false);
      setOutputItem(batch.output_item_id || '');
      setProducedQty(batch.produced_qty ? String(batch.produced_qty) : '');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteBatch = (batchId) => {
    if (!window.confirm('Is production batch ko delete karne se stock aur journal voucher purani sthiti me vapas aa jayenge. Jari rakhein?')) return;

    try {
      const batchToDelete = batchesList.find(b => b.id === batchId);
      if (!batchToDelete) return;

      const revertedInventory = inventoryItems.map(inv => {
        const invId = String(inv.id);
        const oldConsumed = (batchToDelete.consumed_materials || []).find(m => String(m.itemId) === invId);
        let curStock = Number(inv.current_stock || inv.stock || inv.qty || 0);

        if (oldConsumed) curStock += Number(oldConsumed.qty);

        if (batchToDelete.is_multi_grade && Array.isArray(batchToDelete.output_grades)) {
          const matched = batchToDelete.output_grades.find(g => String(g.itemId) === invId);
          if (matched) curStock = Math.max(0, curStock - Number(matched.qty));
        } else if (invId === String(batchToDelete.output_item_id)) {
          curStock = Math.max(0, curStock - Number(batchToDelete.produced_qty));
        }

        return { ...inv, current_stock: round2(curStock), stock: round2(curStock), qty: round2(curStock) };
      });

      setInventoryItems(revertedInventory);
      saveFirmData('inventory_items', firm, revertedInventory);

      const filteredBatches = batchesList.filter(b => b.id !== batchId);
      setBatchesList(filteredBatches);
      saveFirmData('production_batches', firm, filteredBatches);

      const vKey1 = `app_vouchers_${activeFirmId}`;
      const vKey2 = `account_book_vouchers_${activeFirmId}`;
      const vList1 = JSON.parse(localStorage.getItem(vKey1) || '[]');
      const vList2 = JSON.parse(localStorage.getItem(vKey2) || '[]');
      
      const filterV = v => v && v.id !== `JV-${batchId}` && v.reference_no !== batchId;
      localStorage.setItem(vKey1, JSON.stringify(vList1.filter(filterV)));
      localStorage.setItem(vKey2, JSON.stringify(vList2.filter(filterV)));

      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('storage'));

      if (editingBatchId === batchId) {
        setEditingBatchId(null);
        setUseForLocation('');
        setConsumedMaterials([]);
        setDirectLaborCost('');
        setMachineryOverheads('');
        setOutputItem('');
        setProducedQty('');
        setMultiGradeQuantities({ INT_1_NO: '', INT_2_NO: '', INT_PILA: '', KHORA: '', CHATTA: '', TUKDA: '' });
      }

      alert('✓ Production batch deleted & stock/accounting JV restored.');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '8px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', color: '#0f172a' }}>
      
      {/* Top Touch-Friendly Segmented Control Bar */}
      <div style={{ backgroundColor: '#ffffff', padding: '6px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '10px', display: 'flex', gap: '6px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('STAGE_PROD')}
          style={{
            flex: 1,
            padding: '10px 8px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'STAGE_PROD' ? '#0f172a' : 'transparent',
            color: activeTab === 'STAGE_PROD' ? '#ffffff' : '#64748b',
            fontSize: '11px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <span>⚙️</span>
          <span>Daily Stage Production</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ROUND_AUDIT')}
          style={{
            flex: 1,
            padding: '10px 8px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'ROUND_AUDIT' ? '#0284c7' : 'transparent',
            color: activeTab === 'ROUND_AUDIT' ? '#ffffff' : '#64748b',
            fontSize: '11px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <span>🎯</span>
          <span>Round Audit & Real Cost</span>
        </button>
      </div>

      {activeTab === 'ROUND_AUDIT' ? (
        <BhattaCostAuditView firm={firm} onClose={onClose} />
      ) : (
        <div style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
            <h2 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
              {editingBatchId ? '✏️ Edit Production Batch' : `⚙️ Smart Production & Multi-Grade Nikasi (${activeFY})`}
            </h2>
            <button
              type="button"
              onClick={handleSeedStandardItems}
              style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0369a1', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ⚡ Add 5 Standard Bhatta Items
            </button>
          </div>

          {feedback && (
            <div style={{ padding: '8px 10px', marginBottom: '10px', borderRadius: '8px', backgroundColor: feedback.type === 'error' ? '#fef2f2' : '#f0fdf4', color: feedback.type === 'error' ? '#991b1b' : '#166534', fontWeight: 'bold', fontSize: '11px', border: `1px solid ${feedback.type === 'error' ? '#fecaca' : '#bbf7d0'}` }}>
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleSaveProduction}>
            
            {/* PRODUCTION STAGE SELECTOR */}
            <div style={{ marginBottom: '10px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', color: '#0f172a' }}>
                🏭 Production Stage (उत्पादन चरण) *
              </label>
              <select 
                value={productionStage} 
                onChange={e => setProductionStage(e.target.value)} 
                style={{ ...inputStyle, fontWeight: '700', backgroundColor: '#ffffff' }}
              >
                <option value="STAGE_3_NIKASI">Stage 3: Nikasi & Grading (पकाई ➔ पक्की ईंट 1-No, 2-No, 1.25-No, खोरा, चट्टा)</option>
                <option value="STAGE_2_PAKAI">Stage 2: Bharai & Pakai (कच्ची ईंट + कोयला ➔ भट्टी पकाई)</option>
                <option value="STAGE_1_PATHAI">Stage 1: Pathai (मिट्टी ➔ कच्ची ईंट निर्माण)</option>
                <option value="STAGE_GENERAL">General / Single-Stage Manufacturing</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', color: '#475569' }}>
                  Production Date *
                </label>
                <input 
                  type="date" 
                  value={productionDate} 
                  onChange={e => setProductionDate(e.target.value)} 
                  style={inputStyle} 
                  required 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', color: '#475569' }}>
                  Use For / Location *
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Chamber-1 / Batch-2" 
                  value={useForLocation} 
                  onChange={e => setUseForLocation(e.target.value)} 
                  style={inputStyle} 
                  required 
                />
              </div>
            </div>

            {/* STEP 1: Consumed Raw Materials */}
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '10px', borderRadius: '10px', marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#b45309', marginBottom: '6px' }}>
                🔥 Step 1: Consumed Raw Materials & Fuels (From Inventory)
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <SearchableStockDropdown 
                  firm={firm}
                  label=""
                  value={selectedMaterial}
                  onChange={val => setSelectedMaterial(val)}
                  placeholder="-- Select Raw Material / Fuel --"
                />

                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="Enter Qty" 
                      value={materialQty} 
                      onChange={e => setMaterialQty(e.target.value)} 
                      style={inputStyle} 
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={handleAddMaterial} 
                    style={{ padding: '8px 14px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    + Add Item
                  </button>
                </div>
              </div>

              {consumedMaterials.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                  {consumedMaterials.map(mat => (
                    <div key={mat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '5px 8px', borderRadius: '6px', border: '1px solid #fef3c7', fontSize: '11px' }}>
                      <span><strong>{mat.name}</strong> - {mat.qty} {mat.unit}</span>
                      <span>
                        Est: ₹{mat.estimatedCost.toFixed(2)}
                        <button type="button" onClick={() => removeConsumedItem(mat.id)} style={{ color: '#dc2626', border: 'none', background: 'none', marginLeft: '8px', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* STEP 2: Direct Labor & Overheads with Responsive Auto-Fetch Layout */}
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px', borderRadius: '10px', marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#166534', marginBottom: '6px' }}>
                👷 Step 2: Direct Labor & Overheads (Auto-Fetch by Dates)
              </div>

              <div style={{ backgroundColor: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                  <input 
                    type="date" 
                    value={labourStartDate} 
                    onChange={e => setLabourStartDate(e.target.value)} 
                    style={{ ...inputStyle, padding: '6px' }} 
                  />
                  <input 
                    type="date" 
                    value={labourEndDate} 
                    onChange={e => setLabourEndDate(e.target.value)} 
                    style={{ ...inputStyle, padding: '6px' }} 
                  />
                </div>
                <button 
                  type="button" 
                  onClick={handleAutoFetchLabour}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#166534', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  ⚡ Fetch Accrued Labour Wages
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '6px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px', color: '#166534' }}>Direct Labor (₹)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0" 
                    value={directLaborCost} 
                    onChange={e => setDirectLaborCost(e.target.value)} 
                    style={inputStyle} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px', color: '#166534' }}>Overheads / Diesel (₹)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0" 
                    value={machineryOverheads} 
                    onChange={e => setMachineryOverheads(e.target.value)} 
                    style={inputStyle} 
                  />
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '11px', fontWeight: '800', color: '#15803d' }}>
                Total Cost: ₹{totalProductionCost.toFixed(2)}
              </div>
            </div>

            {/* STEP 3: Multi-Grade Concurrent Output Split (Int 1-No, 2-No, 1.25-No, Khora, Chatta) */}
            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '10px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#1e40af' }}>
                  📦 Step 3: Finished Output Products
                </span>
                <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={isMultiGradeOutput} 
                    onChange={e => setIsMultiGradeOutput(e.target.checked)} 
                  />
                  <span>Multi-Grade Nikasi Split</span>
                </label>
              </div>

              {isMultiGradeOutput ? (
                <div>
                  <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '6px' }}>
                    Chamber se ek sath nikli hui sabhi grades ki maatra bharein (Cost auto-distribute ho jayegi):
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '6px' }}>
                    {STANDARD_BRICK_GRADES.map(std => (
                      <div key={std.key} style={{ backgroundColor: '#ffffff', padding: '6px 8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <span style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {std.name}
                        </span>
                        <input 
                          type="number" 
                          step="1" 
                          placeholder="e.g. 20000" 
                          value={multiGradeQuantities[std.key]} 
                          onChange={e => setMultiGradeQuantities({ ...multiGradeQuantities, [std.key]: e.target.value })} 
                          style={{ ...inputStyle, padding: '5px 6px', fontSize: '11px', marginTop: '4px' }} 
                        />
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 'bold', color: '#1e40af' }}>
                    <span>Kul Nikasi: {totalMultiGradeQty.toLocaleString('en-IN')} Pcs</span>
                    <span>Avg Base Rate: ₹{round2(baseAverageUnitCost)}/Unit (₹{round2(baseAverageUnitCost * 1000)}/1000)</span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <SearchableStockDropdown 
                    firm={firm}
                    label="Output Item (From Inventory) *"
                    value={outputItem}
                    onChange={val => setOutputItem(val)}
                    placeholder="-- Select Single Output Item --"
                  />
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '3px', color: '#1e40af' }}>Produced Qty *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="e.g. 30000" 
                      value={producedQty} 
                      onChange={e => setProducedQty(e.target.value)} 
                      style={inputStyle} 
                    />
                  </div>
                  {Number(producedQty) > 0 && (
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#1e40af', marginTop: '4px' }}>
                      Valued Rate: <strong>₹{round2(baseAverageUnitCost)} / Unit</strong> (₹{round2(baseAverageUnitCost * 1000)} / 1000 Pcs)
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="submit" 
                style={{ flex: 1, padding: '12px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
              >
                {editingBatchId ? '✓ Update Production Batch' : '⚡ Save Nikasi & Update Multi-Stock Valuation'}
              </button>
              {editingBatchId && (
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingBatchId(null);
                    setUseForLocation('');
                    setConsumedMaterials([]);
                    setDirectLaborCost('');
                    setMachineryOverheads('');
                    setOutputItem('');
                    setProducedQty('');
                    setMultiGradeQuantities({ INT_1_NO: '', INT_2_NO: '', INT_PILA: '', KHORA: '', CHATTA: '', TUKDA: '' });
                  }}
                  style={{ padding: '12px 14px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}
                >
                  Cancel
                </button>
              )}
            </div>

          </form>

          {/* Batches History List */}
          <div style={{ marginTop: '14px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>
              Production Batches Register ({activeFY}) - ({batchesList.length})
            </h3>

            {batchesList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '11px' }}>
                Koi production record darj nahi hai.
              </div>
            ) : (
              <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {batchesList.map(batch => (
                  <div key={batch.id} style={{ padding: '8px 10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '2px', color: '#0f172a' }}>
                        {batch.date} | Location: {batch.location} {batch.stage ? `[${batch.stage}]` : ''}
                      </div>
                      <div style={{ color: '#64748b' }}>
                        Qty: {batch.produced_qty} Units | {batch.is_multi_grade ? 'Multi-Grade Split' : batch.output_item_name} | <strong style={{ color: '#166534' }}>Cost: ₹{Number(batch.total_cost || 0).toFixed(2)}</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => handleEditBatch(batch)} style={{ padding: '4px 6px', backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '9px', fontWeight: '700' }}>Edit</button>
                      <button onClick={() => handleDeleteBatch(batch.id)} style={{ padding: '4px 6px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '9px', fontWeight: '700' }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '11px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#0f172a'
};
