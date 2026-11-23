// frontend/src/utils/otaUpdateEngine.js

// Current compiled local app version
export const CURRENT_APP_VERSION = {
  versionCode: 104,
  versionName: '1.0.4',
  buildDate: '2026-09-01'
};

// Remote Version Check URL (GitHub Latest Release API ya custom manifest URL)
const GITHUB_REPO_API =
  'https://api.github.com/repos/divyachoudhary876-rgb/Account-book-Lenden-manager-/releases/latest';

const CACHE_KEY = 'ota_update_check_cache_v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function isNativeCapacitorApp() {
  if (typeof window === 'undefined') return false;
  if (window.__ENABLE_OTA_CHECK__ === true) return true;
  const cap = window.Capacitor;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === 'function') {
    return Boolean(cap.isNativePlatform());
  }
  return Boolean(cap.platform && cap.platform !== 'web');
}

function readCachedResult() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.timestamp || !parsed.result) return null;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed.result;
  } catch {
    return null;
  }
}

function writeCachedResult(result) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        result,
      })
    );
  } catch {
    // Ignore storage quota or privacy mode errors
  }
}

/**
 * Check for available application updates
 */
export const checkForAppUpdates = async () => {
  const fallbackResult = {
    updateAvailable: false,
    currentVersion: CURRENT_APP_VERSION.versionName,
  };

  // Skip GitHub release API call on standard web deployments to avoid 403/404 noise
  if (!isNativeCapacitorApp()) {
    return fallbackResult;
  }

  const cached = readCachedResult();
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(GITHUB_REPO_API, {
      headers: { Accept: 'application/vnd.github.v3+json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      writeCachedResult(fallbackResult);
      return fallbackResult;
    }

    const data = await response.json();
    const remoteTag = (data.tag_name || '').replace(/^v/i, '').trim();
    const remoteVersionCode = parseInt((data.name || '').replace(/\D/g, '') || '0', 10);

    // Find APK download URL from assets
    const apkAsset = Array.isArray(data.assets)
      ? data.assets.find((a) => typeof a?.name === 'string' && a.name.toLowerCase().endsWith('.apk'))
      : null;
    const downloadUrl = apkAsset
      ? apkAsset.browser_download_url
      : data.html_url ||
        'https://github.com/divyachoudhary876-rgb/Account-book-Lenden-manager-/releases';

    const hasNewerVersion =
      remoteVersionCode > CURRENT_APP_VERSION.versionCode ||
      (remoteTag && remoteTag > CURRENT_APP_VERSION.versionName);

    const result = {
      updateAvailable: Boolean(hasNewerVersion),
      currentVersion: CURRENT_APP_VERSION.versionName,
      latestVersion: data.tag_name || remoteTag || CURRENT_APP_VERSION.versionName,
      releaseNotes:
        data.body || 'Performance improvements, Stock sync fixes, and PDF report updates.',
      downloadUrl,
    };

    writeCachedResult(result);
    return result;
  } catch (error) {
    console.warn('Update check skipped/failed:', error?.message || error);
    writeCachedResult(fallbackResult);
    return fallbackResult;
  }
};

/**
 * Trigger APK download or redirect to browser installer
 */
export const triggerAppDownload = (downloadUrl) => {
  if (!downloadUrl || typeof window === 'undefined') return;
  window.open(downloadUrl, '_system');
};
