// 系統版本與更新 - the staff-only version and update section, checked as behaviour.
//
// The panel is rendered for real (scripts/jsx-test-loader.mjs, the same harness the App-module
// boundary tests use) against injected shell globals, so what is asserted is what a staff member
// would see on a device in that state - not a grep over the source.
//
// The lettered tests map to the acceptance list this section was built against:
//
//   A  already up to date          F  SHA-256 mismatch
//   B  a newer version exists      G  a finished download becomes pending
//   C  no network                  H  pending offers the restart button
//   D  latest.json fails           I  after the restart, pending has become active
//   E  the download fails          J  iPhone/PWA is never offered APK Shell controls
//                                  K  no player-facing screen can reach any of it
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import React from 'react';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

// --- harness -----------------------------------------------------------------

const REACT_INTERNALS = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

/**
 * Renders a component tree, expanding the function components inside it.
 *
 * State is read at first render (the panel reads the shell's globals in its useState
 * initialisers, deliberately - see StaffVersionPanel.jsx), so a single render with no effects is
 * exactly the state a staff member arrives at.
 */
function render(Component, props = {}) {
  const previous = REACT_INTERNALS.H;
  REACT_INTERNALS.H = {
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: (initial) => ({ current: initial }),
    useEffect: () => {},
    useInsertionEffect: () => {},
    useLayoutEffect: () => {},
    useMemo: (factory) => factory(),
    useCallback: (fn) => fn,
    useContext: () => null,
  };
  try {
    return expand(Component(props));
  } finally {
    REACT_INTERNALS.H = previous;
  }
}

function expand(node) {
  if (Array.isArray(node)) return node.map(expand);
  if (!node || typeof node !== 'object') return node;
  if (typeof node.type === 'function') return expand(render(node.type, node.props));
  const children = node.props?.children;
  if (children === undefined) return node;
  return { ...node, props: { ...node.props, children: expand(children) } };
}

function walk(node, found = []) {
  if (Array.isArray(node)) { node.forEach((child) => walk(child, found)); return found; }
  if (!node || typeof node !== 'object') return found;
  found.push(node);
  walk(node.props?.children, found);
  return found;
}

function textOf(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return textOf(node.props?.children);
}

const buttons = (tree) => walk(tree).filter((n) => n.type === 'button');
const buttonLabelled = (tree, label) => buttons(tree).find((n) => textOf(n).trim() === label);
const screenText = (tree) => textOf(tree);

/** The rows are label/value pairs; this reads a value back by its label. */
function rowValue(tree, label) {
  const row = walk(tree).find((n) => n.props?.className === 'staff-summary-row'
    && textOf(walk(n).find((c) => c.type === 'span')) === label);
  return row ? textOf(walk(row).find((c) => c.type === 'strong')) : null;
}

const BUNDLE = '1.2.0-20260825.006';
const NEWER = '1.3.0-20260826.001';

/** A device with the APK Shell under it, in whatever update state the test needs. */
function androidShell({ status = null, diagnostics = {}, controls = true } = {}) {
  const calls = [];
  const record = (name) => () => calls.push(name);
  globalThis.window = {
    __cibarShell: {
      version: 1, shellVersion: '1.1.0', versionName: '1.1.0+9.abc1234',
      versionCode: 10100, webBundleSource: 'OTA', bundledWebContent: true,
    },
    __cibarOta: {
      shellVersion: '1.1.0', bundledVersion: '1.1.2-20260825.005', activeVersion: BUNDLE,
      previousVersion: null, pendingVersion: null, latestRemoteVersion: '',
      lastUpdateCheck: 0, lastSuccessfulUpdate: 0, lastUpdateError: '',
      lastRollbackReason: '', bundleSource: 'OTA', activeLaunchConfirmed: true,
      ...diagnostics,
    },
    __cibarOtaStatus: status,
    __cibarOtaControl: controls
      ? {
        version: 1,
        available: true,
        checkForUpdate: record('checkForUpdate'),
        downloadUpdate: record('downloadUpdate'),
        restartToApplyUpdate: record('restartToApplyUpdate'),
        refresh: record('refresh'),
      }
      : undefined,
    location: { pathname: '/ScamAware-AR/', reload: record('reload') },
    addEventListener() {}, removeEventListener() {},
    navigator: {},
    matchMedia: () => ({ matches: false }),
  };
  return calls;
}

/** A browser or an iPhone home-screen PWA: no shell, no OTA globals of any kind. */
function webOnly({ standalone = true } = {}) {
  const calls = [];
  globalThis.window = {
    location: { pathname: '/ScamAware-AR/', reload: () => calls.push('reload') },
    addEventListener() {}, removeEventListener() {},
    navigator: { standalone },
    matchMedia: () => ({ matches: standalone }),
  };
  return calls;
}

async function panel() {
  const { StaffVersionPanel } = await import('../src/pages/staff/StaffVersionPanel.jsx');
  return render(StaffVersionPanel);
}

// --- A. already up to date ---------------------------------------------------

test('A. an up-to-date device says so, and offers nothing to download', async () => {
  androidShell({
    status: { phase: 'up-to-date', detail: '目前的 1.2.0 已經是最新', version: BUNDLE, busy: false },
    diagnostics: { lastUpdateCheck: 1_760_000_000_000, latestRemoteVersion: BUNDLE },
  });
  const tree = await panel();

  assert.match(screenText(tree), /更新狀態：已是最新版本/);
  assert.equal(buttonLabelled(tree, '下載更新'), undefined, '沒有新版時不得出現下載按鈕');
  assert.equal(buttonLabelled(tree, '重新啟動並套用更新'), undefined);
  assert.ok(buttonLabelled(tree, '檢查更新'), '檢查更新永遠在');
});

test('A2. the two version lines are separate, and both are shown', async () => {
  androidShell();
  const tree = await panel();

  assert.equal(rowValue(tree, 'APK Shell Version'), '1.1.0');
  assert.equal(rowValue(tree, '目前 Web Bundle Version'), BUNDLE);
});

test('A3. a device that has never checked says so rather than claiming to be current', async () => {
  androidShell();
  const tree = await panel();

  assert.match(screenText(tree), /更新狀態：尚未檢查/);
  assert.equal(rowValue(tree, '最後檢查更新時間'), '—');
});

// --- B. a newer version exists -----------------------------------------------

test('B. a newer version offers 下載更新, and pressing it runs the native download', async () => {
  const calls = androidShell({
    status: { phase: 'update-available', detail: `線上有新版 ${NEWER}`, version: NEWER, busy: false },
    diagnostics: { lastUpdateCheck: 1_760_000_000_000, latestRemoteVersion: NEWER },
  });
  const tree = await panel();

  assert.match(screenText(tree), /更新狀態：發現新版/);
  assert.equal(rowValue(tree, 'Latest Remote Version'), NEWER);
  const download = buttonLabelled(tree, '下載更新');
  assert.ok(download, '有新版時必須出現下載更新');
  download.props.onClick();
  assert.deepEqual(calls, ['downloadUpdate']);
});

test('B2. 檢查更新 asks the native side and nothing else', async () => {
  const calls = androidShell();
  const tree = await panel();

  buttonLabelled(tree, '檢查更新').props.onClick();
  assert.deepEqual(calls, ['checkForUpdate'], '手動檢查只呼叫原生 OTA，不重新載入頁面');
});

test('B3. while a check or a download is running the buttons stay out of the way', async () => {
  androidShell({
    status: { phase: 'downloading', detail: `正在下載 ${NEWER}`, version: NEWER, busy: true },
    diagnostics: { lastUpdateCheck: 1_760_000_000_000, latestRemoteVersion: NEWER },
  });
  const tree = await panel();

  assert.match(screenText(tree), /更新狀態：正在下載/);
  assert.equal(buttonLabelled(tree, '檢查更新').props.disabled, true);
  assert.equal(buttonLabelled(tree, '下載更新'), undefined, '下載中不再提供另一次下載');
  assert.ok(walk(tree).some((n) => n.props?.className === 'staff-ota-spinner'),
    '下載中要有轉圈，因為沒有可靠的進度百分比可以顯示');
});

test('B4. verifying is its own state, not "still downloading"', async () => {
  androidShell({
    status: { phase: 'verifying', detail: `正在驗證 ${NEWER}`, version: NEWER, busy: true },
  });
  assert.match(screenText(await panel()), /更新狀態：正在驗證/);
});

// --- C / D. the network, and the update server -------------------------------

test('C. no network reads as 無網路, and the section still works', async () => {
  androidShell({
    status: { phase: 'offline', detail: '連不到更新伺服器（timeout）；繼續使用目前版本', busy: false },
    diagnostics: {
      lastUpdateCheck: 1_760_000_000_000,
      lastUpdateError: '連不到更新伺服器（timeout）；繼續使用目前版本',
    },
  });
  const tree = await panel();

  assert.match(screenText(tree), /更新狀態：無網路/);
  assert.equal(rowValue(tree, '目前 Web Bundle Version'), BUNDLE, '版本不變');
  assert.equal(buttonLabelled(tree, '檢查更新').props.disabled, false, '可以再按一次檢查更新');
});

test('D. a latest.json that fails is reported as an update failure, not as no network', async () => {
  const { fetchPublishedRelease, faultKindOf } = await import('../src/lib/ota/otaControls.js');

  const notFound = await fetchPublishedRelease({
    url: 'https://example.test/ota/latest.json',
    fetchImpl: async () => ({ ok: false, status: 404 }),
  }).then(() => null, (error) => error);
  assert.equal(faultKindOf(notFound), 'served');
  assert.match(notFound.message, /404/);

  const unreachable = await fetchPublishedRelease({
    url: 'https://example.test/ota/latest.json',
    fetchImpl: async () => { throw new TypeError('Failed to fetch'); },
  }).then(() => null, (error) => error);
  assert.equal(faultKindOf(unreachable), 'unreachable', '連不上就是連不上，不是伺服器的錯');
});

test('D2. the check asks the network rather than navigator.onLine, and it is bounded', async () => {
  const source = await read('src/lib/ota/otaControls.js');
  assert.ok(!/navigator\??\.?\s*\.onLine/.test(source),
    '不得用瀏覽器的 online 旗標判斷「連不連得到更新伺服器」');
  assert.ok(source.includes('AbortController'), '手動檢查一定要有 timeout');
  assert.ok(source.includes("cache: 'no-store'"), '指標檔每次發布都會變，不能讀到快取');
});

// --- E / F. a download that fails --------------------------------------------

test('E. a failed download leaves the running version alone and says why', async () => {
  androidShell({
    status: { phase: 'failed', detail: '下載中斷：只收到 512 / 91766562 bytes', version: NEWER, busy: false },
    diagnostics: {
      lastUpdateCheck: 1_760_000_000_000,
      lastUpdateError: '下載中斷：只收到 512 / 91766562 bytes',
    },
  });
  const tree = await panel();

  assert.match(screenText(tree), /更新狀態：更新失敗/);
  assert.equal(rowValue(tree, '目前 Web Bundle Version'), BUNDLE);
  assert.equal(buttonLabelled(tree, '重新啟動並套用更新'), undefined, '失敗不得留下重啟按鈕');
  assert.equal(buttonLabelled(tree, '檢查更新').props.disabled, false);
});

test('F. a SHA-256 mismatch is a plain 更新失敗 with the technical reason kept underneath', async () => {
  const reason = `${NEWER} 驗證失敗，已丟棄：SHA-256 不符`;
  androidShell({
    status: { phase: 'failed', detail: reason, version: NEWER, busy: false },
    diagnostics: { lastUpdateCheck: 1_760_000_000_000, lastUpdateError: reason },
  });
  const tree = await panel();

  const headline = walk(tree).find((n) => n.props?.className?.startsWith('staff-ota-status'));
  assert.match(textOf(headline), /更新狀態：更新失敗/);
  assert.ok(!textOf(headline).includes('SHA-256'),
    '主要 UI 不得只丟一句技術錯誤給工作人員');
  assert.match(screenText(tree), /最近一次更新錯誤：.*SHA-256/,
    '技術原因仍要留著，讓工作人員能回報');
  assert.equal(rowValue(tree, '目前 Web Bundle Version'), BUNDLE, 'active version 不變');
});

// --- G / H / I. staged, restart, and after the restart ------------------------

test('G. a finished download is pending, and says what the next launch will become', async () => {
  androidShell({
    status: { phase: 'ready-for-restart', detail: `${NEWER} 已就緒，下次啟動生效`, version: NEWER, busy: false },
    diagnostics: {
      pendingVersion: NEWER, lastUpdateCheck: 1_760_000_000_000,
      lastSuccessfulUpdate: 1_760_000_100_000, latestRemoteVersion: NEWER,
    },
  });
  const tree = await panel();

  assert.match(screenText(tree), /更新狀態：更新已準備完成，等待下次啟動/);
  assert.match(screenText(tree), new RegExp(`下次啟動將更新至：${NEWER}`));
  assert.equal(rowValue(tree, 'Pending Version'), NEWER);
  assert.equal(rowValue(tree, '目前 Web Bundle Version'), BUNDLE,
    '這次 session 仍然使用目前的 active version');
  assert.notEqual(rowValue(tree, '最後成功更新時間'), '—');
});

test('H. and only then is 重新啟動並套用更新 offered - and it restarts, it does not reload', async () => {
  const calls = androidShell({
    status: { phase: 'ready-for-restart', detail: '', version: NEWER, busy: false },
    diagnostics: { pendingVersion: NEWER, lastUpdateCheck: 1_760_000_000_000 },
  });
  const tree = await panel();

  const restart = buttonLabelled(tree, '重新啟動並套用更新');
  assert.ok(restart, 'pending 驗證完成才會出現重新啟動按鈕');
  restart.props.onClick();
  assert.deepEqual(calls, ['restartToApplyUpdate'],
    '重新啟動走原生流程，不是 location.reload，也不是換 React route');

  const source = await read('src/pages/staff/StaffVersionPanel.jsx');
  assert.ok(!/setBundle|hot[- ]?swap/i.test(source));
});

test('I. after the restart the staged version is the active one, and the button is gone', async () => {
  // What openForLaunch() leaves behind: pending promoted, previous recorded, nothing staged.
  androidShell({
    status: { phase: 'up-to-date', detail: '', version: NEWER, busy: false },
    diagnostics: {
      activeVersion: NEWER, previousVersion: BUNDLE, pendingVersion: null,
      lastUpdateCheck: 1_760_000_000_000, lastSuccessfulUpdate: 1_760_000_100_000,
    },
  });
  const tree = await panel();

  assert.equal(rowValue(tree, '目前 Web Bundle Version'), NEWER);
  assert.equal(rowValue(tree, 'Previous Version'), BUNDLE);
  assert.equal(rowValue(tree, 'Pending Version'), null, '已經生效就不再是 pending');
  assert.equal(buttonLabelled(tree, '重新啟動並套用更新'), undefined);
  assert.match(screenText(tree), /更新狀態：已是最新版本/);
});

// --- J. iPhone / PWA ---------------------------------------------------------

test('J. an iPhone/PWA is never offered an APK Shell operation', async () => {
  webOnly({ standalone: true });
  const tree = await panel();

  assert.equal(rowValue(tree, 'APK Shell Version'), null, 'PWA 沒有 APK Shell，就不要假裝有');
  assert.equal(buttonLabelled(tree, '下載更新'), undefined);
  assert.equal(buttonLabelled(tree, '重新啟動並套用更新'), undefined);
  assert.ok(buttonLabelled(tree, '重新檢查版本'));
  assert.ok(buttonLabelled(tree, '重新載入最新版'));
  assert.match(screenText(tree), /iPhone／PWA/);
});

test('J2. the PWA reuses the Web Bundle version rather than inventing a second scheme', async () => {
  webOnly();
  const { getWebBundleRelease } = await import('../src/lib/releaseInfo.js');
  const { displayVersion } = await import('../src/lib/ota/otaState.js');
  const tree = await panel();

  // Whatever this build's own identity is - a real Release ID from CI, or the honest "unknown"
  // of a bare test import - it is that, and never a version this screen made up.
  assert.equal(rowValue(tree, 'Web／PWA Version'),
    displayVersion(getWebBundleRelease().releaseId));
  const source = await read('src/pages/staff/StaffVersionPanel.jsx');
  assert.ok(source.includes('getWebBundleRelease'),
    '版本只有一個來源：release/versions.json 經由 vite define 進到 releaseInfo');
});

test('J3. 重新載入最新版 reloads, which is all a browser can do', async () => {
  const calls = webOnly();
  const tree = await panel();

  buttonLabelled(tree, '重新載入最新版').props.onClick();
  assert.deepEqual(calls, ['reload']);
});

test('J4. an ordinary browser tab is named as one', async () => {
  webOnly({ standalone: false });
  assert.match(screenText(await panel()), /瀏覽器/);
});

test('J5. a Shell too old to have the manual controls still shows its versions', async () => {
  androidShell({ controls: false });
  const tree = await panel();

  assert.equal(rowValue(tree, 'APK Shell Version'), '1.1.0');
  assert.equal(buttonLabelled(tree, '檢查更新').props.disabled, true);
  assert.match(screenText(tree), /尚未提供手動更新功能/);
});

// --- K. never in front of a player -------------------------------------------

test('K. the section exists only inside 工作人員管理模式', async () => {
  const files = [];
  const collect = async (dir) => {
    for (const entry of await readdir(new URL(`../src/${dir}`, import.meta.url), { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) await collect(path);
      else if (/\.(jsx?|tsx?)$/.test(entry.name)) files.push(path);
    }
  };
  await collect('.');

  const importers = [];
  for (const path of files) {
    const source = await read(`src/${path.replace('./', '')}`);
    if (/from '.*(StaffVersionPanel|lib\/ota\/)/.test(source)) importers.push(path.replace('./', ''));
  }

  for (const importer of importers) {
    assert.ok(importer.startsWith('pages/staff/') || importer.startsWith('lib/ota/'),
      `${importer} 不得引用工作人員版本區塊`);
  }
  assert.ok(importers.includes('pages/staff/StaffSetupScreen.jsx'),
    '這個區塊必須整合在既有的工作人員管理模式裡');

  // And the route it lives behind is the existing staff one - no new page was added.
  const routes = await read('src/routes.jsx');
  assert.ok(!routes.includes('StaffVersionPanel'), '不得建立新的獨立管理頁');
  assert.ok(routes.includes("path: 'staff-setup'"), '仍然掛在既有的 /staff-setup 底下');
});

test('K2. the player-facing screens are untouched by it', async () => {
  for (const page of [
    'pages/LanguageSelect.jsx', 'pages/opening/OpeningSequence.jsx', 'pages/arScan/ArScanHome.jsx',
    'pages/ScenarioMenu.jsx', 'pages/scenario01/Quiz.jsx', 'pages/scenario03/Ending.jsx',
  ]) {
    const source = await read(`src/${page}`);
    for (const forbidden of ['StaffVersionPanel', '__cibarOtaControl', '系統版本與更新']) {
      assert.ok(!source.includes(forbidden), `${page} 不得出現 ${forbidden}`);
    }
  }
});
