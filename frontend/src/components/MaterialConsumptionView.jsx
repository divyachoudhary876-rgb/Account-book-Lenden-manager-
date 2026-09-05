// frontend/src/components/MaterialConsumptionView.jsx
import React, { useState, useEffect, useMemo } from 'react';

export default function MaterialConsumptionView({ firm, inventoryItems = [], expenseAccounts = [], onSave, onClose }) {
  // Form State
  const [usageDate, setUsageDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [vehicleRef, setVehicleRef] = useState('');
  const [expenseLedger, setExpenseLedger] = useState('');
  const [remarks, setRemarks] = useState('');
  
  // Edit & List State
  const [editingId, setEditingId] = useState(null);
  const [consumptionList, setConsumptionList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Load saved consumptions on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('material_consumptions') || '[]');
      setConsumptionList(saved);
    } catch (e) {
      setConsumptionList([]);
    }
  }, []);

  // Safe item selection lookup
  const selectedItem = useMemo(() => {
    if (!Array.isArray(inventoryItems) || inventoryItems.length === 0) return null;
    return inventoryItems.find(i => String(i.id) === String(selectedItemId)) || null;
  }, [inventoryItems, selectedItemId]);

  const currentStock = Number(selectedItem?.current_stock || selectedItem?.stock || 4557.40);
  const unitRate = Number(selectedItem?.rate || selectedItem?.average_rate || 97.50);
  const parsedQty = Number(quantity || 0);
  const estimatedCost = parsedQty * unitRate;

  // Load entry into form for editing
  const handleStartEdit = (entry) => {
    setEditingId(entry.id);
    setUsageDate(entry.usage_date || new Date().toISOString().split('T')[0]);
    setSelectedItemId(entry.item_id || '');
    setQuantity(String(entry.quantity || ''));
    setVehicleRef(entry.vehicle_ref || '');
    setExpenseLedger(entry.expense_ledger || '');
    setRemarks(entry.remarks || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setUsageDate(new Date().toISOString().split('T')[0]);
    setSelectedItemId('');
    setQuantity('');
    setVehicleRef('');
    setExpenseLedger('');
    setRemarks('');
  };

  // Handle form submission (Create or Update)
  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedItemId) {
      setFeedback({ type: 'error', message: 'कृपया खपत के लिए स्टॉक आइटम चुनें।' });
      return;
    }
    if (parsedQty <= 0) {
      setFeedback({ type: 'error', message: 'कृपया वैध मात्रा (Quantity) दर्ज करें।' });
      return;
    }
    if (!expenseLedger) {
      setFeedback({ type: 'error', message: 'कृपया डेबिट खर्चे का खाता चुनें।' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: editingId || `CONSUME-${Date.now()}`,
        firm_id: firm?.id || 'default_firm',
        usage_date: usageDate,
        item_id: selectedItemId,
        item_name: selectedItem?.item_name || selectedItem?.name || 'Fuel / Diesel',
        quantity: parsedQty,
        unit_rate: unitRate,
        total_valuation: estimatedCost,
        vehicle_ref: vehicleRef || 'General Usage',
        expense_ledger: expenseLedger,
        remarks: remarks || '',
        updated_at: new Date().toISOString()
      };

      let updatedList = [];
      if (editingId) {
        updatedList = consumptionList.map(item => item.id === editingId ? payload : item);
        setFeedback({ type: 'success', message: '✓ खपत प्रविष्टि (Consumption Entry) सफलतापूर्वक अपडेट कर दी गई!' });
      } else {
        payload.created_at = new Date().toISOString();
        updatedList = [payload, ...consumptionList];
        setFeedback({ type: 'success', message: '✓ स्टॉक सफलतापूर्वक घटा दिया गया और खर्चे का वाउचर दर्ज हो गया!' });
      }

      setConsumptionList(updatedList);
      localStorage.setItem('material_consumptions', JSON.stringify(updatedList));

      if (typeof onSave === 'function') {
        onSave(payload);
      }

      handleCancelEdit();
    } catch (err) {
      console.error('Submission error:', err);
      setFeedback({ type: 'error', message: 'सहेजने में विफल: ' + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Entry
  const handleDelete = (id) => {
    if (!window.confirm('क्या आप वाकई इस प्रविष्टि को हटाना चाहते हैं?')) return;
    try {
      const filtered = consumptionList.filter(item => item.id !== id);
      setConsumptionList(filtered);
      localStorage.setItem('material_consumptions', JSON.stringify(filtered));
      setFeedback({ type: 'success', message: 'प्रविष्टि सफलतापूर्वक हटा दी गई।' });
    } catch (e) {
      setFeedback({ type: 'error', message: 'हटाने में विफल।' });
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-3 md:p-6 font-sans text-slate-900 pb-20">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200 mb-4">
        <div className="flex justify-between items-center mb-3">
          {onClose && (
            <button
              onClick={onClose}
              className="bg-slate-900 text-white px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center space-x-1 hover:bg-slate-800 transition-all shadow-sm"
            >
              <span>←</span>
              <span>Dashboard</span>
            </button>
          )}
          <div className={`text-xs font-bold px-3 py-1 rounded-lg border ${editingId ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
            {editingId ? '⚠️ Editing Mode Active' : 'Internal Ledger Mode'}
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
              <span>🚜</span>
              <span>Fuel & Material Internal Consumption</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Automatic Stock Deduction & Expense Voucher Generator
            </p>
          </div>
        </div>

        {/* Available Stock Indicator Badge */}
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-800">AVAILABLE FUEL / DIESEL:</span>
          <span className="text-sm font-black text-emerald-700">
            {currentStock.toFixed(2)} Liters
          </span>
        </div>
      </div>

      {/* Feedback Alert Toast */}
      {feedback && (
        <div className={`mb-4 p-3 rounded-xl text-xs font-bold border transition-all ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
            : 'bg-rose-50 text-rose-800 border-rose-300'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Main Form Card */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200 mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date of Usage *</label>
              <input
                type="date"
                value={usageDate}
                onChange={(e) => setUsageDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Stock Item to Consume *</label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none"
                required
              >
                <option value="">-- Choose Fuel / Material --</option>
                {inventoryItems.length > 0 ? (
                  inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.item_name || item.name} (Stock: {Number(item.current_stock || item.stock || 0).toFixed(2)})
                    </option>
                  ))
                ) : (
                  <option value="default_fuel">Fuel / Diesel (Available: 4557.40 Liters)</option>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Quantity Consumed (Liters) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 20"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Used In / Vehicle Ref *</label>
              <input
                type="text"
                placeholder="e.g. Mahindra 585 / Generator"
                value={vehicleRef}
                onChange={(e) => setVehicleRef(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none"
                required
              />
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex justify-between items-center">
            <span className="text-xs font-medium text-slate-600">
              Estimated Cost Valuation (@ ₹{unitRate.toFixed(2)}/Liters):
            </span>
            <span className="text-sm font-black text-slate-900">
              ₹{estimatedCost.toFixed(2)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Debit Expense Ledger (P&L Kharch Khata) *</label>
            <select
              value={expenseLedger}
              onChange={(e) => setExpenseLedger(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none"
              required
            >
              <option value="">-- Select Expense Ledger --</option>
              {expenseAccounts.length > 0 ? (
                expenseAccounts.map((acc) => (
                  <option key={acc.id || acc.name} value={acc.name || acc.account_name}>
                    {acc.name || acc.account_name} ({acc.category || 'Expenses'})
                  </option>
                ))
              ) : (
                <>
                  <option value="Diesel Expenses">Diesel Expenses (Direct Manufacturing Expense)</option>
                  <option value="Petrol expenses">Petrol expenses (Administrative & Office Expense)</option>
                  <option value="Machinery Maintenance">Machinery Maintenance</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Remarks / Operational Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Field plowing work session"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-3 rounded-xl font-bold text-xs text-white flex items-center justify-center space-x-2 shadow-sm transition-all ${
                isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 active:scale-95'
              }`}
            >
              <span>⚡</span>
              <span>{isSubmitting ? 'Processing...' : editingId ? 'Update Consumption Entry' : 'Deduct Stock & Post Expense'}</span>
            </button>
            
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-all"
              >
                Cancel
              </button>
            )}
          </div>

        </form>
      </div>

      {/* Live Consumption Log Table */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200">
        <h2 className="text-sm font-black text-slate-900 mb-3 flex items-center justify-between">
          <span>📋 Recorded Consumption Logs & Ledger Entries</span>
          <span className="text-xs font-normal text-slate-500">Total: {consumptionList.length} Entries</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-2.5 rounded-tl-xl font-bold">Date</th>
                <th className="p-2.5 font-bold">Item & Ref</th>
                <th className="p-2.5 text-right font-bold">Qty</th>
                <th className="p-2.5 text-right font-bold">Valuation (₹)</th>
                <th className="p-2.5 font-bold">Expense Ledger</th>
                <th className="p-2.5 rounded-tr-xl text-center font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {consumptionList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-6 text-slate-400 font-medium">
                    कोई खपत प्रविष्टि (Consumption Entry) दर्ज नहीं की गई है।
                  </td>
                </tr>
              ) : (
                consumptionList.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2.5 font-semibold text-slate-700 whitespace-nowrap">{entry.usage_date}</td>
                    <td className="p-2.5">
                      <div className="font-bold text-slate-900">{entry.item_name}</div>
                      <div className="text-[11px] text-slate-500 font-medium">Ref: {entry.vehicle_ref}</div>
                    </td>
                    <td className="p-2.5 text-right font-bold text-emerald-600 whitespace-nowrap">
                      {Number(entry.quantity).toFixed(2)}
                    </td>
                    <td className="p-2.5 text-right font-black text-slate-900 whitespace-nowrap">
                      ₹{Number(entry.total_valuation).toFixed(2)}
                    </td>
                    <td className="p-2.5 font-medium text-slate-700">{entry.expense_ledger}</td>
                    <td className="p-2.5 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleStartEdit(entry)}
                        className="bg-sky-50 hover:bg-sky-100 text-sky-700 px-2.5 py-1 rounded-lg font-bold text-[11px] mr-1.5 transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
