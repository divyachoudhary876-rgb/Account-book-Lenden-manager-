// In frontend/src/components/CreateInvoice.jsx (Item Selection Fragment)

<div>
  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Select Stock Item to Dispatch (-OUT) *</label>
  <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
    {stockItems.map(item => (
      <option key={item.id} value={item.id}>📦 {item.item_name} (Stock: {item.current_stock} {item.unit})</option>
    ))}
  </select>
</div>
