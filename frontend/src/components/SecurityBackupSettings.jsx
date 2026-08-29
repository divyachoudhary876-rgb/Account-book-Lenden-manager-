// frontend/src/components/SecurityBackupSettings.jsx

import React, { useState, useEffect } from 'react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export default function SecurityBackupSettings({ onFirmSwitched }) {
  const [firms, setFirms] = useState([]);
  const [activeFirmId, setActiveFirmId] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadFirms();
  }, []);

  const loadFirms = () => {
    const currentActive = JSON.parse(localStorage.getItem('active_firm_profile') || 'null');
    const allFirms = JSON.parse(localStorage.getItem('app_all_firms') || '[]');

    if (currentActive && !allFirms.some(f => f.id === currentActive.id)) {
      allFirms.push(currentActive);
      localStorage.setItem('app_all_firms', JSON.stringify(allFirms));
    }

    setFirms(allFirms);
    if (currentActive) setActiveFirmId(currentActive.id);
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const backupData = {
        version: "1.0.6",
        exported_at: new Date().toISOString(),
        active_firm_profile: JSON.parse(localStorage.getItem('active_firm_profile') || 'null'),
        app_all_firms: JSON.parse(localStorage.getItem('app_all_firms') || '[]'),
        app_account_heads: JSON.parse(localStorage.getItem('app_account_heads') || '[]'),
        app_inventory: JSON.parse(localStorage.getItem('app_inventory') || '[]'),
        app_vouchers: JSON.parse(localStorage.getItem('app_vouchers') || '[]')
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const fileName = `AccountBook_Backup_${new Date().toISOString().split('T')[0]}.json`;

      if (Capacitor.isNativePlatform()) {
        // Direct write to Documents directory for immediate file visibility
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });

        // Open Share sheet with explicit MIME-type
        await Share.share({
          title: 'Account Book Data Backup',
          text: 'Security JSON Data Backup File.',
          url: savedFile.uri,
          dialogTitle: 'Save Backup File (Choose "My Files" / "Save to Files")'
        });

        alert(`✓ Backup file generated!\n\nFile Path: Documents/${fileName}\n\nAgar aap Share sheet me "My Files" choose karenge to ye Documents me save ho jayegi.`);
      } else {
        // Desktop Browser Download Fallback
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        alert('✓ Complete Backup File downloaded to PC Downloads!');
      }
    } catch (e) {
      console.error('Backup Export Error:', e);
      alert('Backup Export Error: ' + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.readAsText(file, "UTF-8");

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);

        if (!parsed.active_firm_profile && !parsed.app_account_heads) {
          throw new Error("Invalid Backup File Format");
        }

        if (parsed.active_firm_profile) localStorage.setItem('active_firm_profile', JSON.stringify(parsed.active_firm_profile));
        if (parsed.app_all_firms) localStorage.setItem('app_all_firms', JSON.stringify(parsed.app_all_firms));
        if (parsed.app_account_heads) localStorage.setItem('app_account_heads', JSON.stringify(parsed.app_account_heads));
        if (parsed.app_inventory) localStorage.setItem('app_inventory', JSON.stringify(parsed.app_inventory));
        if (parsed.app_vouchers) localStorage.setItem('app_vouchers', JSON.stringify(parsed.app_vouchers));

        alert('✓ Data Successfully Restored! System Reloading Workspace...');
        window.location.reload();
      } catch (err) {
        alert('Restore Failed: Please select a valid JSON Backup file.');
      }
    };
  };

  return (
    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: '650px', margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>⚙️ Multi-Firm Switcher & Data Protection</h3>

      <div style={{ border: '1px solid #cbd5e1', padding: '16px', borderRadius: '8px', marginBottom: '20px', backgroundColor: '#f8fafc' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>🏢 Switch Business Firm</h4>
        <select 
          value={activeFirmId} 
          onChange={(e) => {
            const selected = firms.find(f => f.id === e.target.value);
            if (selected) {
              localStorage.setItem('active_firm_profile', JSON.stringify(selected));
              setActiveFirmId(selected.id);
              if (onFirmSwitched) onFirmSwitched(selected);
              window.location.reload();
            }
          }}
          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
        >
          {firms.map(f => (
            <option key={f.id} value={f.id}>{f.legal_name} (GSTIN: {f.gstin || 'N/A'})</option>
          ))}
        </select>
      </div>

      <div style={{ border: '1px solid #cbd5e1', padding: '16px', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>🔒 Zero-Data-Loss Backup Engine</h4>
        
        <button 
          onClick={handleExportBackup} 
          disabled={isExporting}
          style={{ width: '100%', backgroundColor: isExporting ? '#94a3b8' : '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: isExporting ? 'wait' : 'pointer', marginBottom: '16px' }}
        >
          {isExporting ? '⏳ Creating Backup File...' : '📥 Export Complete Backup File (JSON)'}
        </button>

        <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '8px', border: '1px dashed #94a3b8' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
            📤 Restore Saved Data Backup
          </label>
          <input 
            type="file" 
            accept=".json,application/json" 
            onChange={handleRestoreBackup} 
            style={{ fontSize: '12px', width: '100%' }} 
          />
        </div>
      </div>
    </div>
  );
}
