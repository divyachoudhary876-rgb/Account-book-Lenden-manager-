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

  const handleSwitchFirm = (firmId) => {
    const selected = firms.find(f => f.id === firmId);
    if (selected) {
      localStorage.setItem('active_firm_profile', JSON.stringify(selected));
      setActiveFirmId(selected.id);
      alert(`Firm switched to "${selected.legal_name}"!`);
      if (onFirmSwitched) onFirmSwitched(selected);
      window.location.reload();
    }
  };

  // Universal Mobile & Web JSON Backup Exporter
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

      // 1. Mobile Android / iOS Capacitor Execution
      if (Capacitor.isNativePlatform()) {
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });

        await Share.share({
          title: 'Account Book Data Backup',
          text: 'Security JSON Data Backup File.',
          url: savedFile.uri,
          dialogTitle: 'Save Backup File (Local Storage / WhatsApp)'
        });

        alert('✓ Backup File Processed Successfully!');
      } else {
        // 2. PC / Laptop Browser Fallback Execution
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
        const anchor = document.createElement('a');
        anchor.setAttribute("href", dataStr);
        anchor.setAttribute("download", fileName);
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        alert('✓ Complete Backup File successfully downloaded to PC Downloads!');
      }
    } catch (e) {
      console.error('Backup Export Failed:', e);
      alert('Backup Export Error: ' + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  // JSON Backup Restore Engine
  const handleRestoreBackup = (e) => {
    const fileReader = new FileReader();
    if (e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.active_firm_profile) localStorage.setItem('active_firm_profile', JSON.stringify(parsed.active_firm_profile));
          if (parsed.app_all_firms) localStorage.setItem('app_all_firms', JSON.stringify(parsed.app_all_firms));
          if (parsed.app_account_heads) localStorage.setItem('app_account_heads', JSON.stringify(parsed.app_account_heads));
          if (parsed.app_inventory) localStorage.setItem('app_inventory', JSON.stringify(parsed.app_inventory));
          if (parsed.app_vouchers) localStorage.setItem('app_vouchers', JSON.stringify(parsed.app_vouchers));

          alert('✓ Data Successfully Restored! System Reloading Workspace...');
          window.location.reload();
        } catch (err) {
          alert('Restore Failed: Invalid Backup File Format');
        }
      };
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: '650px', margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>⚙️ Multi-Firm Switcher & Data Protection</h3>

      {/* Multi-Firm Switcher Card */}
      <div style={{ border: '1px solid #cbd5e1', padding: '16px', borderRadius: '8px', marginBottom: '20px', backgroundColor: '#f8fafc' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>🏢 Switch Business Firm</h4>
        <select 
          value={activeFirmId} 
          onChange={(e) => handleSwitchFirm(e.target.value)}
          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
        >
          {firms.map(f => (
            <option key={f.id} value={f.id}>{f.legal_name} (GSTIN: {f.gstin || 'N/A'})</option>
          ))}
        </select>
      </div>

      {/* Zero-Data-Loss Backup Card */}
      <div style={{ border: '1px solid #cbd5e1', padding: '16px', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>🔒 Zero-Data-Loss Backup Engine</h4>
        
        <button 
          onClick={handleExportBackup} 
          disabled={isExporting}
          style={{ 
            width: '100%', 
            backgroundColor: isExporting ? '#94a3b8' : '#10b981', 
            color: '#fff', 
            border: 'none', 
            padding: '12px', 
            borderRadius: '8px', 
            fontWeight: 'bold', 
            fontSize: '14px', 
            cursor: isExporting ? 'wait' : 'pointer', 
            marginBottom: '16px' 
          }}
        >
          {isExporting ? '⏳ Creating Backup File...' : '📥 Export Complete Backup File (JSON)'}
        </button>

        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>
          📤 Restore Data Backup File
        </label>
        <input type="file" accept=".json" onChange={handleRestoreBackup} style={{ fontSize: '12px' }} />
      </div>
    </div>
  );
}
