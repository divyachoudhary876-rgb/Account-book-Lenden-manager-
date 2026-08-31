// frontend/src/utils/otaUpdateEngine.js

const CURRENT_APP_VERSION = 102; // Increment on every production update
const VERSION_MANIFEST_URL = 'https://raw.githubusercontent.com/divyachoudhary876-rgb/Account-book-Lenden-manager-/main/version_manifest.json';

export const checkForSilentAppUpdates = async () => {
  try {
    const response = await fetch(`${VERSION_MANIFEST_URL}?t=${Date.now()}`);
    if (!response.ok) return { hasUpdate: false };

    const remoteManifest = await response.json();

    if (remoteManifest.latest_version_code > CURRENT_APP_VERSION) {
      return {
        hasUpdate: true,
        versionName: remoteManifest.version_name,
        isMandatory: remoteManifest.is_mandatory,
        releaseNotes: remoteManifest.release_notes
      };
    }
  } catch (e) {
    console.warn("OTA Update Check Bypass (Offline / Network drop):", e);
  }

  return { hasUpdate: false };
};

export const applySilentAppUpdate = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (let registration of registrations) {
        registration.update();
      }
    });
  }
  // Hard reload to swap cached web assets with new production bundle
  window.location.reload(true);
};
