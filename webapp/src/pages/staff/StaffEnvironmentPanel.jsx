import { useEffect, useRef, useState } from 'react';
import { acquireCameraSource, mountCameraPreview, unmountCameraPreview } from '../../lib/ar/cameraSource';
import { subscribeNativeGestures } from '../../lib/arInteraction/native/jorjinGestureAdapter';
import { areGlassesAbsent } from '../../lib/glasses/glassesPresence';
import {
  FALSE_TRIGGER_MS,
  LEVEL_LABELS,
  SWIPE_HAND_LABELS,
  SWIPE_PLAN,
  averageSummaries,
  judgeEnvironment,
  readTofSnapshot,
  summarizePixels,
} from '../../lib/environment/environmentCheck';

// 現場環境檢測 - part of 工作人員管理模式 and nowhere else (see StaffVersionPanel.jsx for why
// the staff mode is the only door to it).
//
// One button, and one question answered: does the light here get in the way of recognising a
// swipe? The check walks the host through four parts -
//
//   1. nothing in front of the glasses, then a hand held still at about 30 cm (about 6 s): the
//      ToF's noise and how steadily it sees a hand, and the camera's colour cast;
//   2. ten swipes on prompt, all with the palm toward the glasses - what the tutorial teaches (about
//      30 s): how many the experience would actually have recognised, counted exactly as it
//      counts them - the module's keys and the depth recogniser, through the same stream;
//   3. ten seconds of not swiping at all (誤觸測試): every gesture recognised then is one the
//      background wall or the people behind the player made;
//   4. the verdict, with the percentage it rests on and what to change.
//
// The judging lives in lib/environment/environmentCheck.js; this file only runs the steps and
// shows the answer.

const CLEAR_MS = 2600;
const HAND_MS = 3000;
const SAMPLE_MS = 250;
const SAMPLE_W = 80;
const SAMPLE_H = 60;
// Between two prompts: long enough that the depth recogniser does not take the next swipe for
// the arm coming back from the last one (it ignores those for 1.2 s).
const SWIPE_GAP_MS = 1500;
// How long a prompt waits for its swipe.
const SWIPE_WAIT_MS = 4000;

const STEP = Object.freeze({
  IDLE: 'idle', CLEAR: 'clear', HAND: 'hand', SWIPE: 'swipe', QUIET: 'quiet', DONE: 'done',
});
const QUIET_TICK_MS = 500;

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

const DIRECTION_LABELS = Object.freeze({ left: '往左揮 ←', right: '往右揮 →' });

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
  const [prompt, setPrompt] = useState(null);
  const [quiet, setQuiet] = useState(null);
  const [result, setResult] = useState(null);
  const previewRef = useRef(null);
  const cancelledRef = useRef(false);

  useEffect(() => () => { cancelledRef.current = true; }, []);

  async function measureEnvironment() {
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
      setStep(STEP.CLEAR);
      for (let t = 0; t < CLEAR_MS; t += SAMPLE_MS) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(SAMPLE_MS);
        if (cancelledRef.current) return null;
        samples.push(sampleFrame(context, camera));
      }
      const tofClear = readTofSnapshot();

      setStep(STEP.HAND);
      for (let t = 0; t < HAND_MS; t += SAMPLE_MS) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(SAMPLE_MS);
        if (cancelledRef.current) return null;
        samples.push(sampleFrame(context, camera));
      }
      return { tofClear, tofHand: readTofSnapshot(), camera: averageSummaries(samples) };
    } finally {
      if (camera) unmountCameraPreview(camera);
      release?.();
    }
  }

  async function measureSwipes() {
    // With no glasses there is nothing to swipe at; the verdict then rests on the readings alone.
    if (areGlassesAbsent()) return [];
    let waiting = null;
    const stop = subscribeNativeGestures(({ gesture }) => {
      if (waiting) waiting(gesture);
    });
    const results = [];
    try {
      setStep(STEP.SWIPE);
      for (let i = 0; i < SWIPE_PLAN.length; i += 1) {
        const planned = SWIPE_PLAN[i];
        setPrompt({ index: i, planned, ready: false });
        // eslint-disable-next-line no-await-in-loop
        await sleep(SWIPE_GAP_MS);
        if (cancelledRef.current) return null;
        setPrompt({ index: i, planned, ready: true });
        // eslint-disable-next-line no-await-in-loop
        const got = await new Promise((resolve) => {
          const timer = setTimeout(() => { waiting = null; resolve(null); }, SWIPE_WAIT_MS);
          waiting = (gesture) => { clearTimeout(timer); waiting = null; resolve(gesture); };
        });
        if (cancelledRef.current) return null;
        results.push({ ...planned, got });
      }
      return results;
    } finally {
      waiting = null;
      stop();
      setPrompt(null);
    }
  }

  // @returns null when there are no glasses to test, false when cancelled.
  async function measureFalseTriggers() {
    if (areGlassesAbsent()) return null;
    let count = 0;
    let counting = false;
    const stop = subscribeNativeGestures(() => {
      if (!counting) return;
      count += 1;
      setQuiet((current) => (current ? { ...current, count } : current));
    });
    try {
      setStep(STEP.QUIET);
      setQuiet({ leftMs: FALSE_TRIGGER_MS, count: 0, ready: false });
      // The arm coming down from the last prompted swipe is not a false trigger.
      await sleep(SWIPE_GAP_MS);
      if (cancelledRef.current) return false;
      counting = true;
      for (let t = 0; t < FALSE_TRIGGER_MS; t += QUIET_TICK_MS) {
        setQuiet({ leftMs: FALSE_TRIGGER_MS - t, count, ready: true });
        // eslint-disable-next-line no-await-in-loop
        await sleep(QUIET_TICK_MS);
        if (cancelledRef.current) return false;
      }
      return { count, ms: FALSE_TRIGGER_MS };
    } finally {
      counting = false;
      stop();
      setQuiet(null);
    }
  }

  async function run() {
    cancelledRef.current = false;
    setResult(null);
    const environment = await measureEnvironment();
    if (!environment) return;
    const swipes = await measureSwipes();
    if (!swipes) return;
    const falseTriggers = await measureFalseTriggers();
    if (falseTriggers === false) return;
    setResult(judgeEnvironment({ ...environment, swipes, falseTriggers }));
    setStep(STEP.DONE);
  }

  const running = step === STEP.CLEAR || step === STEP.HAND || step === STEP.SWIPE || step === STEP.QUIET;

  return (
    <div className="staff-card staff-env">
      <h2>現場環境檢測（燈光）</h2>
      <p className="staff-env-intro">
        檢查現場燈光和背景是否會影響揮手辨識。請戴上眼鏡，站在玩家體驗的位置，按下開始後依照指示操作，約 55 秒：先量環境，再用手掌實際揮手 10 下，最後 10 秒不揮手，測會不會誤觸。
      </p>

      <div className="staff-env-preview" ref={previewRef} aria-hidden="true" />

      {step === STEP.CLEAR && <p className="staff-env-step">① 請把手移開，讓眼鏡前方淨空……</p>}
      {step === STEP.HAND && <p className="staff-env-step">② 請把手掌放在右眼正前方約 20～30 公分，保持不動……</p>}
      {step === STEP.SWIPE && prompt && (
        <div className="staff-env-swipe" aria-live="polite">
          <p className="staff-env-swipe-count">③ 實測揮手 {prompt.index + 1}／{SWIPE_PLAN.length}</p>
          <p className="staff-env-swipe-hand">{SWIPE_HAND_LABELS[prompt.planned.hand]}・右眼前方約 20～30 公分</p>
          <p className={`staff-env-swipe-direction${prompt.ready ? ' is-ready' : ''}`}>
            {prompt.ready ? DIRECTION_LABELS[prompt.planned.gesture] : '準備……'}
          </p>
        </div>
      )}

      {step === STEP.QUIET && quiet && (
        <div className="staff-env-swipe" aria-live="polite">
          <p className="staff-env-swipe-count">④ 誤觸測試</p>
          <p className="staff-env-swipe-hand">請不要揮手：照平常站在牆前、轉頭、說話，也可以請旁人在背後走動</p>
          <p className={`staff-env-swipe-direction${quiet.ready ? ' is-ready' : ''}`}>
            {quiet.ready ? `剩 ${Math.ceil(quiet.leftMs / 1000)} 秒｜誤觸 ${quiet.count} 次` : '把手放下……'}
          </p>
        </div>
      )}

      {result && (
        <div className={`staff-env-result staff-env-${result.overall}`}>
          <p className="staff-env-summary"><strong>{LEVEL_LABELS[result.overall]}</strong>　{result.summary}</p>
          {[
            ['揮手實測', result.swipe],
            ['誤觸測試', result.falseTrigger],
            ['環境干擾（ToF）', result.tof],
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
          <p className="staff-env-note">環境數據的門檻為初版，之後會用現場紀錄檔（tof-frames.txt）再校正。</p>
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
