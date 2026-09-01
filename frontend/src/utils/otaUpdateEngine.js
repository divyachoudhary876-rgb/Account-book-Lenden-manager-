// frontend/src/utils/otaUpdateEngine.js

// Current compiled local app version
export const CURRENT_APP_VERSION = {
  versionCode: 104,
  versionName: '1.0.4',
  buildDate: '2026-09-01'
};

// Remote Version Check URL (GitHub Latest Release API ya custom manifest URL)
const GITHUB_REPO_API = 'https://api.github.com/repos/divyachoudhary876-rgb/Account-book-Lenden-manager-/releases/latest';

/**
 * Check for available application updates
 */
export const checkForAppUpdates = async () => {
  try {
    const response = await fetch(GITHUB_REPO_API, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      // Fallback if no GitHub release exists yet
      return { updateAvailable: false, currentVersion: CURRENT_APP_VERSION.versionName };
    }

    const data = await response.json();
    const remoteTag = (data.tag_name || '').replace('v', '');
    const remoteVersionCode = parseInt(data.name?.replace(/\D/g, '') || '0', 10);
    
    // Find APK download URL from assets
    const apkAsset = data.assets?.find(a => a.name.endsWith('.apk'));
    const downloadUrl = apkAsset ? apkAsset.browser_download_url : data.html_url;

    const hasNewerVersion = remoteVersionCode > CURRENT_APP_VERSION.versionCode || remoteTag > CURRENT_APP_VERSION.versionName;

    return {
      updateAvailable: hasNewerVersion,
      currentVersion: CURRENT_APP_VERSION.versionName,
      latestVersion: data.tag_name || remoteTag,
      releaseNotes: data.body || 'Performance improvements, Stock sync fixes, and PDF report updates.',
      downloadUrl: downloadUrl || 'https://github.com/divyachoudhary876-rgb/Account-book-Lenden-manager-/releases'
    };
  } catch (error) {
    console.error("Update check failed:", error);
    return { updateAvailable: false, currentVersion: CURRENT_APP_VERSION.versionName };
  }
};

/**
 * Trigger APK download or redirect to browser installer
 */
export const triggerAppDownload = (downloadUrl) => {
  if (!downloadUrl) return;
  window.open(downloadUrl, '_system');
};
