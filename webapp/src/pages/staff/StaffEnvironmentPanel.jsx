import { useEffect, useRef, useState } from 'react';
import { acquireCameraSource, mountCameraPreview, unmountCameraPreview } from '../../lib/ar/cameraSource';
import {
  LEVEL,
  LEVEL_LABELS,
  averageSummaries,
  judgeEnvironment,
  readTofSnapshot,
  summarizePixels,
} from '../../lib/environment/environmentCheck';

// 現場環境檢測 - part of 工作人員管理模式 and nowhere else (see StaffVersionPanel.jsx for why
// the staff mode is the only door to it).
//
// One button. The check walks the host through two short windows - nothing in front of the
// glasses, then a hand held still about 30 cm away - while the glasses read the ToF sensor and
// the camera samples brightness and colour, and then says, in one line per sensor, whether this
// venue's lighting will get in the way, with what to change if it will. The judging lives in
// lib/environment/environmentCheck.js; this file only runs the steps and shows the answer.

const CLEAR_MS = 2600;
const HAND_MS = 3000;
const SAMPLE_MS = 250;
const SAMPLE_W = 80;
const SAMPLE_H = 60;

const STEP = Object.freeze({ IDLE: 'idle', CLEAR: 'clear', HAND: 'hand', DONE: 'done' });

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

function sampleFrame(context, frameSource) {
  if (!context || !frameSource || !(frameSource.frameWidth > 0)) return null;
  try {
    context.drawImage(frameSource.element, 0, 0, SAMPLE_W, SAMPLE_H);
    return summarizePixels(context.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data);
  } catch {
    return null;
  }
}

export function StaffEnvironmentPanel() {
  const [step, setStep] = useState(STEP.IDLE);
  const [result, setResult] = useState(null);
  const previewRef = useRef(null);
  const cancelledRef = useRef(false);

  useEffect(() => () => { cancelledRef.current = true; }, []);

  async function run() {
    cancelledRef.current = false;
    setResult(null);
    setStep(STEP.CLEAR);

    let camera = null;
    let release = null;
    try {
      const acquired = await acquireCameraSource('staff-environment-check');
      camera = acquired.source;
      release = acquired.release;
      mountCameraPreview(previewRef.current, camera);
    } catch {
      camera = null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_W;
    canvas.height = SAMPLE_H;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const samples = [];

    try {
      for (let t = 0; t < CLEAR_MS; t += SAMPLE_MS) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(SAMPLE_MS);
        if (cancelledRef.current) return;
        samples.push(sampleFrame(context, camera));
      }
      const tofClear = readTofSnapshot();

      setStep(STEP.HAND);
      for (let t = 0; t < HAND_MS; t += SAMPLE_MS) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(SAMPLE_MS);
        if (cancelledRef.current) return;
        samples.push(sampleFrame(context, camera));
      }
      const tofHand = readTofSnapshot();

      setResult(judgeEnvironment({ tofClear, tofHand, camera: averageSummaries(samples) }));
      setStep(STEP.DONE);
    } finally {
      if (camera) unmountCameraPreview(camera);
      release?.();
    }
  }

  const running = step === STEP.CLEAR || step === STEP.HAND;

  return (
    <div className="staff-card staff-env">
      <h2>現場環境檢測（燈光）</h2>
      <p className="staff-env-intro">
        檢查現場燈光是否會影響揮手（ToF）與圖片辨識（鏡頭）。請戴上或拿好眼鏡，對著玩家揮手和掃描的位置，按下開始後依照指示操作，約 6 秒。
      </p>

      <div className="staff-env-preview" ref={previewRef} aria-hidden="true" />

      {step === STEP.CLEAR && <p className="staff-env-step">① 請把手移開，讓眼鏡前方淨空……</p>}
      {step === STEP.HAND && <p className="staff-env-step">② 請把手掌放在眼鏡正前方約 30 公分，保持不動……</p>}

      {result && (
        <div className={`staff-env-result staff-env-${result.overall}`}>
          <p className="staff-env-summary"><strong>{LEVEL_LABELS[result.overall]}</strong>　{result.summary}</p>
          {[
            ['揮手辨識（ToF）', result.tof],
            ['圖片辨識（鏡頭亮度）', result.image],
            ['光源顏色', result.light],
          ].map(([name, item]) => (
            <div key={name} className={`staff-summary-row staff-env-row staff-env-${item.level}`}>
              <span>{name}</span>
              <strong>{LEVEL_LABELS[item.level]}</strong>
              <em>{item.detail}</em>
            </div>
          ))}
          {result.advice.length > 0 && (
            <ul className="staff-env-advice">
              {result.advice.map((line) => <li key={line}>{line}</li>)}
            </ul>
          )}
          {result.overall !== LEVEL.GOOD && (
            <p className="staff-env-note">門檻為初版，之後會用現場紀錄檔（tof-frames.txt）再校正。</p>
          )}
        </div>
      )}

      <div className="staff-btn-row staff-env-actions">
        <button type="button" className="btn" disabled={running} onClick={run}>
          {running ? '檢測中……' : result ? '再檢測一次' : '開始檢測'}
        </button>
      </div>
    </div>
  );
}
