import { useEffect, useState } from 'react';
import {
  DEFAULT_MIN_RANGE_CM,
  MIN_RANGE_CHOICES_CM,
  RANGE_CHOICES_CM,
  RECOGNIZERS,
  SIGNAL_MODES,
  STAFF_TOOLS_READY_EVENT,
  TOF_LOG_EXPORT_EVENT,
  describeExport,
  describeLiveFrame,
  describeSignal,
  liveGrid,
  readGestureSettings,
  readLiveFrame,
  readStaffTools,
  requestTofLogExport,
  writeGestureSettings,
} from '../../lib/environment/staffTools';

// 手勢設定 - part of 工作人員管理模式 and nowhere else (see StaffVersionPanel.jsx
// for why the staff mode is the only door to it).
//
// For the venue the depth sensor is fighting: a background wall the player
// stands at, an audience behind them, a classroom. Four things -
//
//   手勢最遠距離  50 / 40 / 35 cm. Whatever is beyond is never looked at.
//   訊號過濾      how weak a return may be before it is ignored.
//   即時感測畫面  the 8x8 frame as the sensor sees it, the hand's zones marked.
//   匯出紀錄檔    the frame log into the share sheet (LINE, Email).
//
// The settings live in the Shell (lib/environment/staffTools.js) and are kept
// on the phone; this file only shows them.

const LIVE_POLL_MS = 150;

export function StaffGesturePanel() {
  const [tools, setTools] = useState(() => readStaffTools());
  const [settings, setSettings] = useState(() => readGestureSettings());
  const [live, setLive] = useState(false);
  const [frame, setFrame] = useState(null);
  const [exportStatus, setExportStatus] = useState('');

  // The bridge is installed when the page finishes loading, which may be after this mounts.
  useEffect(() => {
    const onReady = () => {
      setTools(readStaffTools());
      setSettings(readGestureSettings());
    };
    window.addEventListener(STAFF_TOOLS_READY_EVENT, onReady);
    return () => window.removeEventListener(STAFF_TOOLS_READY_EVENT, onReady);
  }, []);

  useEffect(() => {
    const onExport = (event) => setExportStatus(describeExport(event.detail));
    window.addEventListener(TOF_LOG_EXPORT_EVENT, onExport);
    return () => window.removeEventListener(TOF_LOG_EXPORT_EVENT, onExport);
  }, []);

  useEffect(() => {
    if (!live) return undefined;
    const timer = setInterval(() => {
      const next = readLiveFrame();
      setFrame(next);
      if (next && typeof next.noise === 'number') {
        setSettings((current) => (current ? { ...current, noise: next.noise, floor: next.floor } : current));
      }
    }, LIVE_POLL_MS);
    return () => clearInterval(timer);
  }, [live]);

  function choose(change) {
    // Both settings travel together; one never read back must not become 0 cm on the way.
    const current = settings ?? readGestureSettings() ?? { maxRangeCm: RANGE_CHOICES_CM[0], signalMode: 'AUTO' };
    const next = writeGestureSettings({
      minRangeCm: current.minRangeCm ?? DEFAULT_MIN_RANGE_CM,
      maxRangeCm: current.maxRangeCm,
      signalMode: current.signalMode,
      ...(current.recognizer ? { recognizer: current.recognizer } : {}),
      ...change,
    });
    if (next) setSettings(next);
  }

  function exportLog() {
    setExportStatus(requestTofLogExport() ? '正在準備紀錄檔……' : '匯出失敗，請再試一次。');
  }

  if (!tools) {
    return (
      <div className="staff-card staff-gesture">
        <h2>手勢設定</h2>
        <p className="staff-env-intro">需要眼鏡 APP 外殼 1.2.4 以上才能調整手勢設定、看即時感測畫面和匯出紀錄檔。</p>
      </div>
    );
  }

  const rows = liveGrid(frame);

  return (
    <div className="staff-card staff-gesture">
      <h2>手勢設定</h2>
      <p className="staff-env-intro">
        手要比背後的東西（牆、桌子）近 10 公分以上才算，這一點系統會自動處理。現場有背景牆、玩家背後有觀眾或在教室宣導時，再用下面的設定調整。
      </p>

      {typeof settings?.recognizer === 'string' && (
        <>
          <h3 className="staff-gesture-label">辨識方式</h3>
          <div className="staff-btn-row staff-gesture-choices">
            {RECOGNIZERS.map((recognizer) => (
              <button
                key={recognizer.id}
                type="button"
                className={`btn${settings.recognizer === recognizer.id ? '' : ' secondary'}`}
                aria-pressed={settings.recognizer === recognizer.id}
                onClick={() => choose({ recognizer: recognizer.id })}
              >
                {recognizer.label}
              </button>
            ))}
          </div>
          <p className="staff-env-note">
            {RECOGNIZERS.find((recognizer) => recognizer.id === settings.recognizer)?.hint ?? ''}
          </p>
        </>
      )}

      {typeof settings?.minRangeCm === 'number' && (
        <>
          <h3 className="staff-gesture-label">手勢最近距離</h3>
          <div className="staff-btn-row staff-gesture-choices">
            {MIN_RANGE_CHOICES_CM.map((cm) => (
              <button
                key={cm}
                type="button"
                className={`btn${settings.minRangeCm === cm ? '' : ' secondary'}`}
                aria-pressed={settings.minRangeCm === cm}
                onClick={() => choose({ minRangeCm: cm })}
              >
                {cm} 公分
              </button>
            ))}
          </div>
          <p className="staff-env-note">比這個距離近的都不看：臉、鼻樑、眼鏡框，還有手碰眼鏡、調整眼鏡的動作。建議 10 公分。</p>
        </>
      )}

      <h3 className="staff-gesture-label">手勢最遠距離</h3>
      <div className="staff-btn-row staff-gesture-choices">
        {RANGE_CHOICES_CM.map((cm) => (
          <button
            key={cm}
            type="button"
            className={`btn${settings?.maxRangeCm === cm ? '' : ' secondary'}`}
            aria-pressed={settings?.maxRangeCm === cm}
            onClick={() => choose({ maxRangeCm: cm })}
          >
            {cm} 公分
          </button>
        ))}
      </div>
      <p className="staff-env-note">比這個距離遠的人和東西都不看。後面人多時調成 40 或 35 公分，並提醒玩家手靠近一點。</p>

      <h3 className="staff-gesture-label">訊號過濾</h3>
      <div className="staff-btn-row staff-gesture-choices">
        {SIGNAL_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`btn${settings?.signalMode === mode.id ? '' : ' secondary'}`}
            aria-pressed={settings?.signalMode === mode.id}
            onClick={() => choose({ signalMode: mode.id })}
          >
            {mode.label}
          </button>
        ))}
      </div>
      <p className="staff-env-note">
        {SIGNAL_MODES.find((mode) => mode.id === settings?.signalMode)?.hint ?? ''}
        {describeSignal(settings) ? `。${describeSignal(settings)}` : ''}
      </p>

      <h3 className="staff-gesture-label">即時感測畫面</h3>
      {live && (
        <div className="staff-gesture-live">
          <div className="staff-gesture-grid" role="img" aria-label="ToF 8x8 即時感測畫面">
            {rows.flat().map((cell) => (
              <span
                key={cell.zone}
                className={`staff-gesture-cell${cell.hand ? ' is-hand' : cell.masked ? ' is-masked' : cell.tooNear ? ' is-too-near' : cell.inRange ? ' is-near' : cell.cm > 0 ? ' is-far' : ''}`}
              >
                {cell.cm > 0 ? cell.cm : ''}
              </span>
            ))}
          </div>
          <p className="staff-env-note">{describeLiveFrame(frame)}</p>
          <p className="staff-env-note">數字是距離（公分）。黃色是被當成手的格子，藍色是範圍內但不算手，紫色是太近（臉、眼鏡框），斜線是自動遮蔽的雜訊格子，灰色是太遠。方向是配戴者看出去的方向。</p>
        </div>
      )}
      <div className="staff-btn-row">
        <button type="button" className="btn secondary" onClick={() => setLive((on) => !on)}>
          {live ? '停止即時畫面' : '開啟即時畫面'}
        </button>
      </div>

      <h3 className="staff-gesture-label">匯出紀錄檔</h3>
      <p className="staff-env-note">把最近約 20 分鐘的感測紀錄（tof-frames.txt）用 LINE 或 Email 傳出去，給開發人員調整辨識用。分享時眼鏡會暫停，回到 APP 後自動重新連線。</p>
      <div className="staff-btn-row">
        <button type="button" className="btn secondary" onClick={exportLog}>匯出紀錄檔</button>
      </div>
      {exportStatus && <p className="staff-env-note" aria-live="polite">{exportStatus}</p>}
    </div>
  );
}
