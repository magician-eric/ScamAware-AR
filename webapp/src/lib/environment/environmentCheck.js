// 現場環境檢測 - the staff management mode's check of whether the venue's
// lighting will get in the way of gesture recognition.
//
// Four readings, one question - does the light here stop a swipe being
// recognised?
//
//   Swipes (measured) Ten real swipes on prompt - five with the palm open
//                    toward the glasses, five edge-on - counted the way the
//                    experience counts them. This is the percentage the
//                    answer rests on.
//
//   ToF (gestures)   The 8x8 depth sensor cannot report ambient light - JJSDK
//                    only hands over distance and return strength - but light
//                    rich in infrared (sun, halogen, the "yellow" bulbs at the
//                    acceptance site) shows in what it measures: zones that
//                    flicker or wander with nothing moving, and a hand held
//                    still that comes and goes or jitters. The Shell
//                    summarises its last 2.5 s of frames on request
//                    (window.__cibarEnvironment.tofSnapshot(), Shell 1.2.3+,
//                    android/.../TofEnvironmentMeter.java).
//
//   Camera (colour)  A strongly warm cast hints at an incandescent or halogen
//                    lamp - and so at infrared that hurts the ToF - though
//                    the camera's own white balance hides much of it, so it is
//                    a hint and never a verdict. Image recognition itself is
//                    not checked: it holds up in every venue tried so far.
//
//   False triggers   Ten seconds of NOT swiping - standing at the wall,
//   (誤觸測試)       turning the head, people walking behind - counting every
//                    gesture the experience would have acted on. The
//                    background wall and an audience behind the player are
//                    what this catches; the cure is the staff mode's 手勢最遠
//                    距離 and 訊號過濾 (StaffGesturePanel.jsx).
//
// The swipe rate says whether recognition works here; the ToF readings and
// the colour say whether the light is what is in the way. Together:
//
//   swipes good, light clean      燈光不影響辨識
//   swipes good, light noisy      燈光有干擾，但目前還能辨識
//   swipes poor, light noisy      燈光影響辨識
//   swipes poor, light clean      不是燈光的問題 - the way of swiping, or the distance
//
// The thresholds are a first calibration from simulation and the sensors'
// data sheets, written down here so the next one, from frames recorded on
// site (tof-frames.txt), changes numbers and not code.

export const LEVEL = Object.freeze({
  GOOD: 'good',
  WARN: 'warn',
  BAD: 'bad',
  UNKNOWN: 'unknown',
});

export const THRESHOLDS = Object.freeze({
  // Share of zones flickering or wandering with nothing in front.
  noise: { warn: 0.10, bad: 0.25 },
  // Share of frames a hand held still at ~30 cm was seen in.
  handSeen: { warn: 0.9, bad: 0.6 },
  // How much that still hand's distance wandered, mm.
  handJitterMm: { warn: 12, bad: 25 },
  // Too few frames means the ToF is not running at all.
  minFrames: 10,
  // Mean red over mean blue.
  warmCast: 1.5,
  // Share of the measured swipes recognised: at or above this is "works here".
  swipesGood: 0.8,
  // Gestures recognised in the false-trigger window, nobody swiping.
  falseTriggers: { warn: 1, bad: 2 },
});

// How long the false-trigger test watches for gestures nobody made.
export const FALSE_TRIGGER_MS = 10000;

export const SWIPE_HAND = Object.freeze({ PALM: 'palm', EDGE: 'edge' });

// The ten prompts: all with the palm toward the glasses (the tutorial teaches
// the palm; it reads better than an edge-on hand), directions alternating so
// each one starts where the last ended.
export const SWIPE_PLAN = Object.freeze([
  ...['left', 'right', 'left', 'right', 'left'].map((gesture) => ({ hand: SWIPE_HAND.PALM, gesture })),
  ...['right', 'left', 'right', 'left', 'right'].map((gesture) => ({ hand: SWIPE_HAND.PALM, gesture })),
]);

export const SWIPE_HAND_LABELS = Object.freeze({
  [SWIPE_HAND.PALM]: '手掌張開朝向眼鏡',
  [SWIPE_HAND.EDGE]: '手刀（手掌與臉垂直）',
});

const rate = (hits, total) => (total > 0 ? hits / total : 0);

/**
 * @param {Array<{hand: string, gesture: string, got: string|null}>} results
 *   one per prompt: what was asked for, and what was recognised in its window
 *   (null for nothing).
 */
export function judgeSwipes(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return { level: LEVEL.UNKNOWN, rate: null, detail: '沒有實測揮手（未接上眼鏡）。', advice: [] };
  }
  const count = (hand) => {
    const mine = results.filter((r) => hand === null || r.hand === hand);
    return { hits: mine.filter((r) => r.got === r.gesture).length, total: mine.length };
  };
  const all = count(null);
  const palm = count(SWIPE_HAND.PALM);
  const edge = count(SWIPE_HAND.EDGE);
  const overall = rate(all.hits, all.total);
  const advice = [];
  if (edge.total > 0 && palm.total > 0 && rate(edge.hits, edge.total) < rate(palm.hits, palm.total)) {
    advice.push('手刀比手掌朝前更容易漏掉：請提醒玩家手掌張開、朝向眼鏡揮動。');
  }
  return {
    level: overall >= THRESHOLDS.swipesGood ? LEVEL.GOOD : LEVEL.BAD,
    rate: overall,
    detail: `實測 ${all.hits}/${all.total}（${percent(overall)}）`
      + (edge.total > 0 ? `｜手掌朝前 ${palm.hits}/${palm.total}｜手刀 ${edge.hits}/${edge.total}` : ''),
    advice,
  };
}

/**
 * @param {{count: number, ms: number}|null} measured gestures recognised while
 *   nobody swiped, over how long; null when the test was not run.
 */
export function judgeFalseTriggers(measured) {
  if (!measured || !(measured.ms > 0)) {
    return { level: LEVEL.UNKNOWN, count: null, detail: '沒有做誤觸測試（未接上眼鏡）。', advice: [] };
  }
  const { count } = measured;
  const seconds = Math.round(measured.ms / 1000);
  const level = count >= THRESHOLDS.falseTriggers.bad
    ? LEVEL.BAD
    : count >= THRESHOLDS.falseTriggers.warn ? LEVEL.WARN : LEVEL.GOOD;
  return {
    level,
    count,
    detail: `${seconds} 秒內沒有人揮手，誤觸 ${count} 次`,
    advice: count > 0
      ? ['背景牆或後方的人造成誤觸：請在「手勢設定」把「手勢最遠距離」調近（40 或 35 公分），或把「訊號過濾」調成嚴格，再檢測一次。']
      : [],
  };
}

const RANK = { [LEVEL.GOOD]: 0, [LEVEL.UNKNOWN]: 1, [LEVEL.WARN]: 2, [LEVEL.BAD]: 3 };

export function worst(...levels) {
  return levels.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), LEVEL.GOOD);
}

function above(value, { warn, bad }) {
  if (value >= bad) return LEVEL.BAD;
  if (value >= warn) return LEVEL.WARN;
  return LEVEL.GOOD;
}

function below(value, { warn, bad }) {
  if (value < bad) return LEVEL.BAD;
  if (value < warn) return LEVEL.WARN;
  return LEVEL.GOOD;
}

const percent = (value) => `${Math.round(value * 100)}%`;

/** The Shell's ToF summary, or null outside the glasses app (or on an older Shell). */
export function readTofSnapshot(scope = globalThis) {
  const bridge = scope?.__cibarEnvironment;
  if (!bridge || typeof bridge.tofSnapshot !== 'function') return null;
  try {
    const snapshot = bridge.tofSnapshot();
    return snapshot && typeof snapshot === 'object' ? snapshot : null;
  } catch {
    return null;
  }
}

/**
 * Judges the two ToF windows: `clear` with nothing in front of the glasses,
 * `hand` with a hand held still about 30 cm away.
 */
export function judgeTof(clear, hand) {
  if (!clear || !hand) {
    return { level: LEVEL.UNKNOWN, detail: '這台裝置沒有提供 ToF 資料（不在眼鏡 App 內，或 App 版本太舊）。', advice: [] };
  }
  if (clear.frames < THRESHOLDS.minFrames || hand.frames < THRESHOLDS.minFrames) {
    return {
      level: LEVEL.BAD,
      detail: 'ToF 沒有收到畫面：眼鏡可能沒接好，或 ToF 尚未啟動。',
      advice: ['確認眼鏡 USB 線接好，重新開啟 App 後再檢測一次。'],
    };
  }
  const noise = above(clear.noisyZoneRatio, THRESHOLDS.noise);
  const seen = below(hand.handSeenRatio, THRESHOLDS.handSeen);
  const jitter = hand.handSeenRatio > 0 ? above(hand.handJitterMm, THRESHOLDS.handJitterMm) : LEVEL.BAD;
  const level = worst(noise, seen, jitter);
  const advice = [];
  if (noise !== LEVEL.GOOD) advice.push('畫面前沒有東西時仍有雜訊：現場可能有日光、鹵素燈或黃光燈泡直射，建議遮光、換成 LED 燈或換個方向。');
  if (seen !== LEVEL.GOOD) advice.push('放在 30 公分的手時有時無：請玩家揮手時靠近一點（15～30 公分），並避開燈光直射眼鏡。');
  if (jitter !== LEVEL.GOOD && seen === LEVEL.GOOD) advice.push('手的距離讀值不穩：光線干擾偏強，揮手可能時好時壞。');
  return {
    level,
    detail: `雜訊 ${percent(clear.noisyZoneRatio)}｜手的偵測 ${percent(hand.handSeenRatio)}｜距離抖動 ${Math.round(hand.handJitterMm)} mm`,
    advice,
  };
}

/** Luma, glare and colour cast of RGBA pixels (a canvas ImageData's `data`). */
export function summarizePixels(data) {
  let pixels = 0;
  let lumaSum = 0;
  let blown = 0;
  let red = 0;
  let blue = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    lumaSum += luma;
    if (luma >= 245) blown += 1;
    red += r;
    blue += b;
    pixels += 1;
  }
  if (pixels === 0) return null;
  return {
    luma: lumaSum / pixels,
    glare: blown / pixels,
    warmth: red / Math.max(1, blue),
  };
}

/** Averages several {@link summarizePixels} results into one. */
export function averageSummaries(summaries) {
  const usable = summaries.filter(Boolean);
  if (usable.length === 0) return null;
  const mean = (key) => usable.reduce((sum, s) => sum + s[key], 0) / usable.length;
  return { luma: mean('luma'), glare: mean('glare'), warmth: mean('warmth'), samples: usable.length };
}

export function judgeLightColour(summary) {
  if (!summary) return { level: LEVEL.UNKNOWN, detail: '未檢測。', advice: [] };
  const warm = summary.warmth >= THRESHOLDS.warmCast;
  return {
    level: warm ? LEVEL.WARN : LEVEL.GOOD,
    detail: `紅藍比 ${summary.warmth.toFixed(2)}${warm ? '（偏黃）' : ''}`,
    advice: warm ? ['光源偏黃，可能是鹵素燈或傳統燈泡，紅外線較強，可能影響揮手辨識；可以的話改用 LED 白光。'] : [],
  };
}

export const LEVEL_LABELS = Object.freeze({
  [LEVEL.GOOD]: '良好',
  [LEVEL.WARN]: '可能受影響',
  [LEVEL.BAD]: '會影響辨識',
  [LEVEL.UNKNOWN]: '無法檢測',
});

/**
 * The answer to "does the light here get in the way of recognition", from the
 * measured swipes, the ToF readings and the light's colour.
 */
export function judgeEnvironment({ tofClear, tofHand, camera, swipes, falseTriggers = null }) {
  const tof = judgeTof(tofClear, tofHand);
  const light = judgeLightColour(camera);
  const swipe = judgeSwipes(swipes);
  const falseTrigger = judgeFalseTriggers(falseTriggers);
  const lightInterferes = tof.level === LEVEL.WARN || tof.level === LEVEL.BAD || light.level === LEVEL.WARN;
  const advice = [...swipe.advice, ...falseTrigger.advice, ...tof.advice, ...light.advice];

  let overall;
  let summary;
  if (swipe.level === LEVEL.UNKNOWN) {
    overall = worst(tof.level, light.level);
    summary = lightInterferes
      ? '燈光可能影響辨識（未實測揮手，僅依環境數據判斷）。'
      : '環境數據良好（未實測揮手）。';
  } else if (swipe.level === LEVEL.GOOD) {
    overall = lightInterferes ? LEVEL.WARN : LEVEL.GOOD;
    summary = lightInterferes ? '燈光有干擾，但目前還能辨識。' : '燈光不影響辨識。';
  } else if (lightInterferes) {
    overall = LEVEL.BAD;
    summary = '燈光影響辨識，請依下方建議調整後再檢測一次。';
  } else {
    overall = LEVEL.WARN;
    summary = '不是燈光的問題：可能是揮手方式或距離。';
    advice.push('請在右眼正前方（感測器在眼鏡右側）約 20～30 公分處，手掌張開朝向眼鏡，慢慢左右揮動。');
  }
  // Recognising swipes nobody made is its own problem, whatever the light: a wrong answer
  // chosen for the player is worse than a swipe that has to be made twice.
  if (falseTrigger.level === LEVEL.WARN || falseTrigger.level === LEVEL.BAD) {
    overall = worst(overall, falseTrigger.level);
    summary = `${summary}另外，沒有揮手時誤觸了 ${falseTrigger.count} 次。`;
  }
  return { overall, summary, swipe, falseTrigger, tof, light, advice };
}

const SIGNAL_MODE_LABELS = Object.freeze({ AUTO: '自動', LOOSE: '寬鬆', STANDARD: '標準', STRICT: '嚴格' });
const RECOGNIZER_LABELS = Object.freeze({ LOOSE: '寬鬆', STANDARD: '標準' });

/**
 * What 手勢設定 the host should choose after a check, and why - so nobody has to
 * know what each setting does. `current` is the Shell's settings
 * (lib/environment/staffTools.js), or null outside the glasses app; a Shell
 * without 辨識方式 (before 1.2.11) gets no recognizer in the advice.
 *
 *   light in the way      -> 寬鬆辨識, 最近 5 cm (under lamp light a hand only
 *                            shows close to the glasses)
 *   1 false trigger       -> 最遠 40 cm;  2 or more -> 35 cm
 *   3 or more             -> 標準辨識 and 訊號過濾 嚴格 as well
 *
 * @returns {{settings: object, lines: string[], reasons: string[], same: boolean}|null}
 */
export function recommendGestureSettings(result, current = null) {
  if (!result) return null;
  const lightInterferes = result.tof?.level === LEVEL.WARN || result.tof?.level === LEVEL.BAD
    || result.light?.level === LEVEL.WARN;
  const falseCount = typeof result.falseTrigger?.count === 'number' ? result.falseTrigger.count : 0;
  const withRecognizer = typeof current?.recognizer === 'string';
  const settings = { minRangeCm: 10, maxRangeCm: 50, signalMode: 'AUTO' };
  if (withRecognizer) settings.recognizer = 'LOOSE';
  const reasons = [];

  if (lightInterferes) {
    settings.minRangeCm = 5;
    reasons.push('現場有強光干擾：強光下手要靠近眼鏡才看得到，最近距離放寬到 5 公分。');
  }
  if (withRecognizer) {
    reasons.push('寬鬆辨識：5 公分到最遠距離之內往左或往右移動就算，斜著揮也算。');
  }
  if (falseCount >= 1) {
    settings.maxRangeCm = falseCount >= 2 ? 35 : 40;
    reasons.push(`沒有人揮手時誤觸了 ${falseCount} 次：最遠距離調成 ${settings.maxRangeCm} 公分，背後的人和牆就不會被看到。`);
  }
  if (falseCount >= 3) {
    if (withRecognizer) settings.recognizer = 'STANDARD';
    settings.signalMode = 'STRICT';
    reasons.push('誤觸還是偏多：改成要完整橫揮才算（標準辨識），訊號過濾調成嚴格。');
  }
  if (result.swipe?.level === LEVEL.BAD && falseCount === 0 && !lightInterferes) {
    reasons.push('揮手漏掉偏多但沒有燈光干擾：請玩家在右眼正前方約 20 公分、手掌朝向眼鏡揮動。');
  }

  const lines = [
    ...(withRecognizer ? [`辨識方式：${RECOGNIZER_LABELS[settings.recognizer]}`] : []),
    `手勢最近距離：${settings.minRangeCm} 公分`,
    `手勢最遠距離：${settings.maxRangeCm} 公分`,
    `訊號過濾：${SIGNAL_MODE_LABELS[settings.signalMode]}`,
  ];
  const same = Boolean(current) && Object.entries(settings).every(([key, value]) => current[key] === value);
  return { settings, lines, reasons, same };
}
