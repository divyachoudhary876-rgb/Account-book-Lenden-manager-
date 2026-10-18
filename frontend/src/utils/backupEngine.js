/**
 * Frontend Utility: Universal Zero-Loss Backup & Restore Engine
 * Ensures 100% exact state preservation without extra recalculations or data loss.
 */

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

const resolveFirmNameString = (firmInput) => {
  if (typeof firmInput === 'string' && firmInput.trim() !== '') return firmInput.trim();
  if (firmInput && typeof firmInput === 'object') {
    return firmInput.legal_name || firmInput.trade_name || firmInput.name || firmInput.firm_name || 'AccountBook';
  }
  return 'AccountBook';
};

/**
 * Trigger UI re-render and event sync across all application components
 */
const broadcastAppEvents = () => {
  try {
    window.dispatchEvent(new Event('app_accounts_updated'));
    window.dispatchEvent(new Event('app_inventory_updated'));
    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {}
};

/**
 * 1. DOWNLOAD FULL BACKUP (Exports exact current localStorage state including all updates)
 */
export const downloadAppBackup = async
