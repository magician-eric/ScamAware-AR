// What the update mechanism is doing, in words a person at a venue can act on.
//
// The states are the APK Shell's (android/.../ota/OtaPhase.java) and the wording is this file's.
// That split is deliberate: the shell decides what is true, the web side decides how to say it,
// and neither has to be redeployed to change the other. Nothing here invents a version or a
// state - every value shown by the staff screen comes from one of:
//
//   window.__cibarShell        the APK Shell's identity          (ShellBridgeScript)
//   window.__cibarOta          the durable update record         (OtaDiagnostics)
//   window.__cibarOtaStatus    the live phase                    (OtaUpdateStatus)
//   __CIBAR_WEB_BUNDLE__       this build's own identity         (vite.config.js define)
//
// all four of which trace back to release/versions.json and to the OTA release CI writes. See
// docs/RELEASE_VERSIONING.md.

/** The phase names published by the shell. Must match android/.../ota/OtaPhase.java. */
export const OTA_PHASE = {
  IDLE: 'idle',
  CHECKING: 'checking',
  UP_TO_DATE: 'up-to-date',
  UPDATE_AVAILABLE: 'update-available',
  DOWNLOADING: 'downloading',
  VERIFYING: 'verifying',
  READY_FOR_RESTART: 'ready-for-restart',
  FAILED: 'failed',
  OFFLINE: 'offline',
  SHELL_TOO_OLD: 'shell-too-old',
};

/**
 * The one line the staff screen shows large.
 *
 * A raw error code is not one of the options. The technical text the shell produced is kept and
 * shown underneath, in the diagnostics block - a venue that has to phone somebody needs it, and a
 * venue that just wants to know whether to press 下載更新 must not have to read it.
 */
export const PHASE_LABELS = {
  [OTA_PHASE.IDLE]: '尚未檢查',
  [OTA_PHASE.CHECKING]: '正在檢查更新',
  [OTA_PHASE.UP_TO_DATE]: '已是最新版本',
  [OTA_PHASE.UPDATE_AVAILABLE]: '發現新版',
  [OTA_PHASE.DOWNLOADING]: '正在下載',
  [OTA_PHASE.VERIFYING]: '正在驗證',
  [OTA_PHASE.READY_FOR_RESTART]: '更新已準備完成，等待下次啟動',
  [OTA_PHASE.FAILED]: '更新失敗',
  [OTA_PHASE.OFFLINE]: '無網路',
  [OTA_PHASE.SHELL_TOO_OLD]: '目前 Shell Version 不支援此新版',
};

/** Colour of the status line. Nothing branches on this except the stylesheet. */
const PHASE_TONES = {
  [OTA_PHASE.UP_TO_DATE]: 'ok',
  [OTA_PHASE.READY_FOR_RESTART]: 'ok',
  [OTA_PHASE.UPDATE_AVAILABLE]: 'attention',
  [OTA_PHASE.FAILED]: 'error',
  [OTA_PHASE.OFFLINE]: 'error',
  [OTA_PHASE.SHELL_TOO_OLD]: 'error',
};

/** The phases during which a worker is still running and the buttons must stay out of the way. */
const IN_FLIGHT = new Set([OTA_PHASE.CHECKING, OTA_PHASE.DOWNLOADING, OTA_PHASE.VERIFYING]);

export function labelForPhase(phase) {
  return PHASE_LABELS[phase] ?? PHASE_LABELS[OTA_PHASE.IDLE];
}

/**
 * `MAJOR.MINOR.PATCH` out of a Release ID, a dev version or anything else.
 *
 * `1.1.3-20260825.004` -> `1.1.3`; `1.1.3+dev` -> `1.1.3`. Returns null for anything that is not
 * three numbers, which is how "unknown" travels - never as a made-up 0.0.0.
 */
export function semanticPartOf(version) {
  if (typeof version !== 'string') return null;
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
  return match ? `${match[1]}.${match[2]}.${match[3]}` : null;
}

/** Ordering on the semantic half only - the same comparison the shell's UpdateDecision makes. */
export function compareSemantic(left, right) {
  const a = semanticPartOf(left);
  const b = semanticPartOf(right);
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  const [al, am, ap] = a.split('.').map(Number);
  const [bl, bm, bp] = b.split('.').map(Number);
  return al - bl || am - bm || ap - bp;
}

/** A version for display, or a dash. Never a placeholder that could be mistaken for a version. */
export function displayVersion(version) {
  const text = typeof version === 'string' ? version.trim() : '';
  return text === '' || text === 'unknown' ? '—' : text;
}

/**
 * A timestamp for display, in the device's own time.
 *
 * Built from the parts rather than `toLocaleString` so it reads the same on every device: a
 * version report that a venue reads out over the phone should not change shape with the locale.
 */
export function displayTimestamp(millis) {
  const value = Number(millis);
  if (!Number.isFinite(value) || value <= 0) return '—';
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} `
    + `${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`;
}

/**
 * One state for the screen to render, out of the live phase and the durable record.
 *
 * The two disagree by design and the order below is what resolves them:
 *
 *   1. a worker that is running wins outright - "正在下載" is true right now and nothing in the
 *      record can contradict it;
 *   2. a staged bundle wins next, whatever the last attempt said. A phone holding a verified
 *      pending version is waiting for a restart, and that is what the operator needs told even if
 *      a later check then failed;
 *   3. otherwise the last phase this session reported;
 *   4. and with no phase at all - an APK Shell too old to publish one - the record decides:
 *      an error means the last attempt failed, a check with no error means up to date, and no
 *      check at all means exactly that.
 *
 * @param {object} input
 * @param {object|null} input.status      window.__cibarOtaStatus, or a web-mode equivalent
 * @param {object|null} input.diagnostics window.__cibarOta
 * @param {boolean} input.controllable    whether this device can actually run an update
 */
export function deriveUpdateState({ status, diagnostics, controllable = false } = {}) {
  const phase = typeof status?.phase === 'string' ? status.phase : null;
  const busy = status?.busy === true && IN_FLIGHT.has(phase);
  const pendingVersion = displayableOrNull(diagnostics?.pendingVersion)
    ?? (phase === OTA_PHASE.READY_FOR_RESTART ? displayableOrNull(status?.version) : null);

  let resolved;
  if (busy) resolved = phase;
  else if (pendingVersion) resolved = OTA_PHASE.READY_FOR_RESTART;
  else if (phase && phase !== OTA_PHASE.IDLE) resolved = phase;
  else if (diagnostics?.lastUpdateError) resolved = OTA_PHASE.FAILED;
  else if (Number(diagnostics?.lastUpdateCheck) > 0) resolved = OTA_PHASE.UP_TO_DATE;
  else resolved = OTA_PHASE.IDLE;

  // A phase the shell reported but this bundle has never heard of. Shown as its own text rather
  // than silently as 尚未檢查, which would be a newer Shell's state read as "nothing happened".
  const known = Object.prototype.hasOwnProperty.call(PHASE_LABELS, resolved);
  const availableVersion = resolved === OTA_PHASE.UPDATE_AVAILABLE
    ? displayableOrNull(status?.version)
    : null;

  return {
    phase: resolved,
    label: known ? PHASE_LABELS[resolved] : `更新狀態：${resolved}`,
    tone: PHASE_TONES[resolved] ?? 'neutral',
    // The shell's own sentence - kept for the diagnostics block, never used as the headline.
    detail: typeof status?.detail === 'string' ? status.detail : '',
    busy,
    pendingVersion,
    availableVersion,
    canCheck: controllable && !busy,
    // Only ever offered when a check actually found something. A download button that is always
    // there invites somebody to spend 80 MiB to arrive where they already are.
    canDownload: controllable && !busy && resolved === OTA_PHASE.UPDATE_AVAILABLE,
    // And a restart is offered only for a bundle that finished verification - which is the only
    // way a version reaches the pending slot at all (BundleInstaller.unpackAndVerify).
    canRestart: controllable && !busy && pendingVersion !== null,
  };
}

function displayableOrNull(version) {
  if (typeof version !== 'string') return null;
  const text = version.trim();
  return text === '' || text === 'unknown' ? null : text;
}
