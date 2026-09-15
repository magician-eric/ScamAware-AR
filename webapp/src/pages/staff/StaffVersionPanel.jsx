import { useCallback, useEffect, useState } from 'react';
import { getShellRelease, getWebBundleRelease } from '../../lib/releaseInfo';
import {
  CHECK_TIMEOUT_MS,
  PLATFORM,
  PLATFORM_LABELS,
  detectPlatform,
  faultKindOf,
  fetchPublishedRelease,
  isRemoteNewer,
  nativeOtaControls,
  readOtaDiagnostics,
  readOtaStatus,
  subscribeToShell,
} from '../../lib/ota/otaControls';
import {
  OTA_PHASE,
  deriveUpdateState,
  displayTimestamp,
  displayVersion,
} from '../../lib/ota/otaState';

// 系統版本與更新 - part of 工作人員管理模式 and nowhere else.
//
// Rendered inside StaffSetupScreen, which is reachable only from the staff entry on the language
// home (a gear a host is told about, and a 5s hold on the logo). Nothing player-facing links to
// it: not the language home, not intro, not AR scan, not a scenario, not an ending, not a quiz.
//
// WHAT THIS SCREEN IS FOR
// A venue about to run a session needs to answer three questions without a laptop, an adb cable
// or a phone call: which versions are on this device, is there a newer one, and can I take it now
// rather than in the middle of somebody's scenario. Until this existed the only update was the
// one that starts by itself at launch and finishes without telling anybody.
//
// WHAT IT MUST NOT DO
// Invent a version. Every value here comes from release/versions.json by one of four routes -
// the Shell descriptor, the OTA diagnostics, the live phase, or this bundle's own compiled-in
// identity - and there is deliberately no fifth. See src/lib/ota/otaState.js.
export function StaffVersionPanel() {
  // Read synchronously at first render rather than in an effect: the shell publishes these
  // globals when the page finishes loading, which on a phone is long before anybody navigates
  // here, and a panel that started empty and filled in later would flash 尚未檢查 every time.
  const [shell, setShell] = useState(() => getShellRelease());
  const [diagnostics, setDiagnostics] = useState(() => readOtaDiagnostics());
  const [nativeStatus, setNativeStatus] = useState(() => readOtaStatus());
  const [controls, setControls] = useState(() => nativeOtaControls());

  // The browser/PWA half keeps its own equivalent of the shell's status, because there is no
  // shell to publish one. Same shape, so the same deriveUpdateState() renders both.
  const [webStatus, setWebStatus] = useState(null);
  const [webCheckedAt, setWebCheckedAt] = useState(0);
  const [remoteRelease, setRemoteRelease] = useState(null);

  const platform = detectPlatform();
  const isShell = platform === PLATFORM.ANDROID_SHELL;
  const bundle = getWebBundleRelease();

  const refresh = useCallback(() => {
    setShell(getShellRelease());
    setDiagnostics(readOtaDiagnostics());
    setNativeStatus(readOtaStatus());
    setControls(nativeOtaControls());
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToShell(refresh);
    // Ask the shell to re-publish, so a panel opened an hour into a session shows the state as it
    // is now rather than as it was when the page loaded.
    nativeOtaControls()?.refresh();
    refresh();
    return unsubscribe;
  }, [refresh]);

  const state = deriveUpdateState({
    status: isShell ? nativeStatus : webStatus,
    diagnostics: isShell ? diagnostics : null,
    // Whether this device can do anything at all about an update: run the native OTA, or - in a
    // browser or PWA - re-check and re-load. Which of the two is decided by `isShell` below.
    controllable: isShell ? controls !== null : true,
  });

  const busy = state.busy;

  const handleNativeCheck = useCallback(() => {
    nativeOtaControls()?.checkForUpdate();
  }, []);

  const handleNativeDownload = useCallback(() => {
    nativeOtaControls()?.downloadUpdate();
  }, []);

  const handleNativeRestart = useCallback(() => {
    nativeOtaControls()?.restartToApplyUpdate();
  }, []);

  /**
   * The browser/PWA check: ask the published pointer file, compare, and say which it is.
   *
   * Deliberately the same file the APK Shell reads, so a venue comparing an iPhone against the
   * glasses is comparing like with like. It cannot stage anything - there is no native store to
   * stage into - so the answer is a version and, when there is a newer one, a reload.
   */
  const handleWebCheck = useCallback(async () => {
    setWebStatus({ phase: OTA_PHASE.CHECKING, detail: '正在向更新伺服器詢問最新版本', busy: true });
    try {
      const published = await fetchPublishedRelease({ timeoutMs: CHECK_TIMEOUT_MS });
      setRemoteRelease(published);
      setWebCheckedAt(Date.now());
      const newer = isRemoteNewer(published.releaseId, bundle.releaseId);
      setWebStatus({
        phase: newer ? OTA_PHASE.UPDATE_AVAILABLE : OTA_PHASE.UP_TO_DATE,
        version: published.releaseId,
        detail: `線上最新版本為 ${published.releaseId}`,
        busy: false,
      });
    } catch (error) {
      setWebCheckedAt(Date.now());
      const unreachable = faultKindOf(error) === 'unreachable';
      setWebStatus({
        phase: unreachable ? OTA_PHASE.OFFLINE : OTA_PHASE.FAILED,
        detail: String(error?.message ?? error),
        busy: false,
      });
    }
  }, [bundle.releaseId]);

  /** A browser/PWA has no staging step: the newest bundle arrives by loading the page again. */
  const handleWebReload = useCallback(() => {
    if (typeof window !== 'undefined') window.location.reload();
  }, []);

  const latestRemote = isShell
    ? diagnostics?.latestRemoteVersion
    : remoteRelease?.releaseId;
  const lastCheckAt = isShell ? diagnostics?.lastUpdateCheck : webCheckedAt;
  const lastSuccessAt = isShell ? diagnostics?.lastSuccessfulUpdate : 0;
  const lastError = isShell ? diagnostics?.lastUpdateError : '';

  return (
    <div className="staff-card">
      <h2>系統版本與更新</h2>

      <div className="staff-summary">
        <Row label="裝置類型" value={PLATFORM_LABELS[platform]} />
        {isShell
          // The two version lines are never merged. "1.0.0" on its own identifies nothing: the
          // APK Shell and the Web Bundle move independently, and only the pair says what is on a
          // device (docs/RELEASE_VERSIONING.md §1).
          ? <Row label="APK Shell Version" value={displayVersion(shell?.shellVersion)} />
          : null}
        <Row
          label={isShell ? '目前 Web Bundle Version' : 'Web／PWA Version'}
          value={displayVersion(isShell ? diagnostics?.activeVersion ?? bundle.releaseId
            : bundle.releaseId)}
        />
        {isShell && diagnostics?.previousVersion
          ? <Row label="Previous Version" value={displayVersion(diagnostics.previousVersion)} />
          : null}
        {state.pendingVersion
          ? <Row label="Pending Version" value={displayVersion(state.pendingVersion)} />
          : null}
        {latestRemote
          ? <Row label="Latest Remote Version" value={displayVersion(latestRemote)} />
          : null}
        <Row label="最後檢查更新時間" value={displayTimestamp(lastCheckAt)} />
        {isShell
          ? <Row label="最後成功更新時間" value={displayTimestamp(lastSuccessAt)} />
          : null}
      </div>

      <p className={`staff-ota-status staff-ota-${state.tone}`}>
        更新狀態：<strong>{state.label}</strong>
        {busy ? <span className="staff-ota-spinner" aria-hidden="true" /> : null}
      </p>

      {state.pendingVersion
        ? <p className="staff-ota-pending">下次啟動將更新至：{state.pendingVersion}</p>
        : null}

      {lastError
        // The reason, in the shell's own words, under a heading that says what it is. The big
        // line above is what a staff member acts on; this is what they read out on the phone.
        ? <p className="staff-ota-error">最近一次更新錯誤：{lastError}</p>
        : null}

      <div className="staff-btn-grid staff-ota-actions">
        <button
          type="button"
          className="btn"
          // On a Shell too old to expose the controls there is nothing to call, so the button is
          // disabled rather than absent - the note below says why, which is what a venue holding
          // an old APK needs told.
          disabled={isShell ? !state.canCheck : busy}
          onClick={isShell ? handleNativeCheck : handleWebCheck}
        >
          {isShell ? '檢查更新' : '重新檢查版本'}
        </button>

        {isShell && state.canDownload
          ? (
            <button type="button" className="btn" onClick={handleNativeDownload}>
              下載更新
            </button>
          )
          : null}

        {isShell && state.canRestart
          ? (
            <button type="button" className="btn danger" onClick={handleNativeRestart}>
              重新啟動並套用更新
            </button>
          )
          : null}

        {isShell
          ? null
          : (
            <button type="button" className="btn secondary" disabled={busy} onClick={handleWebReload}>
              重新載入最新版
            </button>
          )}
      </div>

      {isShell && controls === null
        ? (
          <p className="staff-ota-note">
            這支 APK Shell 尚未提供手動更新功能，仍會在每次啟動時自動於背景檢查更新。
          </p>
        )
        : null}

      <details className="staff-ota-diagnostics">
        <summary>技術診斷資訊</summary>
        <div className="staff-summary">
          <Row label="Web Bundle（本次載入）" value={displayVersion(bundle.releaseId)} />
          <Row label="需要的最低 Shell" value={displayVersion(bundle.minShellVersion)} />
          {bundle.gitCommit ? <Row label="Git commit" value={bundle.gitCommit} /> : null}
          {isShell ? <Row label="APK versionName" value={displayVersion(shell?.versionName)} /> : null}
          {isShell ? <Row label="APK 內建 Bundle" value={displayVersion(diagnostics?.bundledVersion)} /> : null}
          {isShell ? <Row label="Bundle 來源" value={displayVersion(diagnostics?.bundleSource)} /> : null}
          {isShell && diagnostics?.lastRollbackReason
            ? <Row label="最近一次回滾原因" value={diagnostics.lastRollbackReason} />
            : null}
          <Row label="更新流程狀態代碼" value={state.phase} />
          {state.detail ? <Row label="更新流程訊息" value={state.detail} /> : null}
        </div>
      </details>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="staff-summary-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
