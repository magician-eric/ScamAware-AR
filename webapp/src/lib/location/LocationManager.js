// Wraps the browser Geolocation API for the staff-only location-init flow
// (section 5 of the spec). Never called from player-facing scenario code -
// only StaffSetupScreen uses this, and only before the device is handed
// over (section 4's rationale: once a player has the device, nothing can
// re-run this).

export const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 20000, // spec allows 15000-30000ms; 20s is the middle of that range
  maximumAge: 0, // always a fresh fix, never a cached one from the OS
};

export function isGeolocationSupported() {
  return 'geolocation' in navigator;
}

// Resolves { latitude, longitude, accuracy } or rejects with a normalized
// { code, message } - code is one of 'unsupported' | 'permission-denied' |
// 'position-unavailable' | 'timeout', matching the six offline/failure
// cases in spec section 6 so the UI can pick the right message without
// re-deriving it from the raw GeolocationPositionError.
export function requestCurrentPosition(options = GEOLOCATION_OPTIONS) {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject({ code: 'unsupported', message: '此瀏覽器不支援定位功能。' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject({ code: 'permission-denied', message: '定位權限遭拒絕。' });
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          reject({
            code: 'position-unavailable',
            message: '目前無法取得精確位置，請移至靠近窗戶的位置後重試，或使用手動設定。',
          });
        } else {
          reject({ code: 'timeout', message: '定位逾時，請重試或使用手動設定。' });
        }
      },
      options,
    );
  });
}

export function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}
