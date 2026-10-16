// 手勢設定 - the staff management mode's gesture tools, read through the APK
// Shell (Shell 1.2.4 and later, android/.../StaffToolsBridge.java):
//
//   window.__cibarStaffTools = {
//     version: 1, available: true,
//     getGestureSettings() -> { minRangeCm, maxRangeCm, signalMode, noise, floor } | null,
//     setGestureSettings({ minRangeCm, maxRangeCm, signalMode }) -> the same | null,
//                         (Shell 1.2.4 has no minRangeCm and ignores it)
//     liveFrame() -> one 8x8 frame (TofLiveFrame.java) | null,
//     shareTofLog() -> boolean,
//   }
//   'cibarStaffToolsReady'  when it has been installed
//   'cibarTofLogExport'     how 匯出紀錄檔 went: { ok, name?, bytes?, reason? }
//
// Everything here reads or writes through that one object and never throws: on
// an older Shell or in a browser there is no object, and the panel says so.

export const STAFF_TOOLS_GLOBAL = '__cibarStaffTools';
export const STAFF_TOOLS_READY_EVENT = 'cibarStaffToolsReady';
export const TOF_LOG_EXPORT_EVENT = 'cibarTofLogExport';

// The choices on the panel's buttons - the Shell accepts only these
// (GestureSettings.java), anything else falls back to the nearest.
export const RANGE_CHOICES_CM = Object.freeze([50, 40, 35]);
// 手勢最近距離 (Shell 1.2.5+): nearer is the wearer's face, the frame, or a
// hand at the glasses - all noise to a swipe.
export const MIN_RANGE_CHOICES_CM = Object.freeze([5, 10, 15]);
export const DEFAULT_MIN_RANGE_CM = 10;

export const SIGNAL_MODES = Object.freeze([
  { id: 'AUTO', label: '自動', hint: '依現場雜訊自動調整（建議）' },
  { id: 'LOOSE', label: '寬鬆', hint: '手比較遠、燈光很乾淨時使用' },
  { id: 'STANDARD', label: '標準', hint: '固定忽略低於最強訊號 12% 的回波' },
  { id: 'STRICT', label: '嚴格', hint: '雜訊多、後面人多時使用；手要離眼鏡近一點' },
]);

export const GRID = 8;

export function readStaffTools(scope = globalThis) {
  const tools = scope?.[STAFF_TOOLS_GLOBAL];
  return tools && typeof tools.getGestureSettings === 'function' ? tools : null;
}

function call(scope, method, ...args) {
  const tools = readStaffTools(scope);
  if (!tools || typeof tools[method] !== 'function') return null;
  try {
    return tools[method](...args) ?? null;
  } catch {
    return null;
  }
}

export function readGestureSettings(scope = globalThis) {
  return call(scope, 'getGestureSettings');
}

export function writeGestureSettings(settings, scope = globalThis) {
  return call(scope, 'setGestureSettings', settings);
}

export function readLiveFrame(scope = globalThis) {
  const frame = call(scope, 'liveFrame');
  return frame && Array.isArray(frame.range) && frame.range.length === GRID * GRID ? frame : null;
}

export function requestTofLogExport(scope = globalThis) {
  return call(scope, 'shareTofLog') === true;
}

const percent = (value) => `${Math.round(value * 100)}%`;

/** One line under the 訊號過濾 buttons: what the sensor measures and what is in force. */
export function describeSignal(settings) {
  if (!settings || typeof settings.noise !== 'number' || typeof settings.floor !== 'number') return '';
  return `目前雜訊 ${percent(settings.noise)}，忽略低於最強訊號 ${percent(settings.floor)} 的回波`;
}

/** What to tell the host after 匯出紀錄檔. */
export function describeExport(detail) {
  if (!detail) return '';
  if (detail.ok) {
    const size = typeof detail.bytes === 'number' ? `（${(detail.bytes / (1024 * 1024)).toFixed(1)} MB）` : '';
    return `已開啟分享選單：${detail.name ?? '紀錄檔'}${size}。選 LINE 或 Email 傳出去即可。`;
  }
  if (detail.reason === 'empty') return '目前還沒有紀錄：請先接上眼鏡、揮幾下手，再匯出。';
  if (detail.reason === 'no-app') return '這支手機找不到可以分享檔案的 APP。';
  return '匯出失敗，請再試一次。';
}

/**
 * The frame as eight rows of eight cells, drawn the wearer's way round: with
 * `columnIncreasesRight` false the sensor's columns run right to left for the
 * wearer, so they are mirrored.
 */
export function liveGrid(frame) {
  if (!frame || !Array.isArray(frame.range)) return [];
  const mirrored = frame.columnIncreasesRight === false;
  const rows = [];
  for (let row = 0; row < GRID; row += 1) {
    const cells = [];
    for (let col = 0; col < GRID; col += 1) {
      const zone = row * GRID + (mirrored ? GRID - 1 - col : col);
      const cm = Number(frame.range[zone]) || 0;
      cells.push({
        zone,
        cm,
        hand: Array.isArray(frame.hand) && frame.hand[zone] === 1,
        masked: Array.isArray(frame.masked) && frame.masked[zone] === 1,
        tooNear: cm > 0 && cm < (frame.minRangeCm || 0),
        inRange: cm >= (frame.minRangeCm || 0) && cm > 0 && cm <= (frame.maxRangeCm || 50),
      });
    }
    rows.push(cells);
  }
  return rows;
}

/** One line under the grid: where the hand is, or why there is none. */
export function describeLiveFrame(frame) {
  if (!frame) return '沒有感測畫面（請接上眼鏡）。';
  if (frame.ageMs < 0) return '還沒收到感測器畫面。';
  if (frame.ageMs > 1000) return '感測器沒有送畫面過來。';
  if (frame.sceneMoving) return '整個畫面在動（頭在轉），這時不判斷手勢。';
  if (frame.handPresent) return `看到手：約 ${frame.handCm} 公分`;
  const from = frame.minRangeCm ? `${frame.minRangeCm}–` : '';
  return `沒有看到手（只找 ${from}${frame.maxRangeCm} 公分、比背景近 10 公分以上的東西）`;
}
