# CIBAR 版本編號、OTA 發布與交付紀錄規範

> **這份文件是專案規則，不是說明文。**
> 任何人或 AI Agent 在進行 build / release / OTA publish / 交付之前，都必須以這份文件為準。
> 與本文件衝突的舊文件、舊 commit 訊息、舊 release note 一律以本文件為準。

相關檔案：

| 檔案 | 內容 | 誰維護 |
| --- | --- | --- |
| [`release/versions.json`](../release/versions.json) | 目前的 Shell Version 與 Web Bundle Version | **人／AI 在 PR 內手動修改** |
| [`docs/RELEASE_HISTORY.md`](RELEASE_HISTORY.md) | 每一次**正式發布**的紀錄 | CI 自動附加 |
| [`docs/DELIVERY_HISTORY.md`](DELIVERY_HISTORY.md) | 每一次**實際交付**的紀錄 | 交付當下由人填寫 |
| `release/ota/latest.json` | 目前 production 指向的正式 OTA Release | CI 自動產生 |
| `release/ota/releases/<Release ID>.json` | 每一次正式發布的 manifest | CI 自動產生 |
| [`.github/workflows/ota-release.yml`](../.github/workflows/ota-release.yml) | PR 版本檢查 ＋ merge 後自動發布 OTA | — |

---

## 1. 兩條版本線，永遠分開

CIBAR 交付的是**兩個東西**，它們用不同的速度前進：

| | APK Shell | Web Bundle |
| --- | --- | --- |
| 是什麼 | Android 原生外殼（`android/`）：WebView、JJSDK、相機、ToF 手勢、Native Bridge | CIBAR 網頁體驗（`webapp/`）：React、劇情、UI、i18n、圖片、影片、Web AR |
| 版本欄位 | `SHELL_VERSION` | `WEB_BUNDLE_VERSION` |
| 更新方式 | **重新安裝 APK** | **OTA 更新，不必重裝** |
| 什麼時候增加 | 只有 Native 層改動 | 每一次網頁內容改動 |

例：

```
APK Shell     1.0.0
Web Bundle    1.3.8-20260825.004
```

> **改一句劇情文字不會讓 APK Shell 版本增加。**
> 純 Web／UI／劇情／圖片／影片更新不應要求使用者重新安裝 APK，這是把兩條版本線分開的唯一理由。

反過來也一樣：只改 Native（例如相機串流修正）時，Web Bundle 版本不動。

---

## 2. Semantic Versioning

兩條版本線都採 `MAJOR.MINOR.PATCH`（主版本.次版本.修訂版本），例如 `1.0.0`。

### MAJOR — `X.0.0`

只有**重大、不相容或產品架構級**改版才增加。例：`1.8.4 → 2.0.0`。

適用：

- Android Shell 大改
- AR 核心架構重大變更
- Native Bridge 不相容變更
- Gesture SDK / Camera SDK 架構更換
- 整體產品世代改版
- 舊版無法直接相容的新架構

**MAJOR +1 時，MINOR 與 PATCH 歸零。**

### MINOR — `1.X.0`

新增明確的新功能，且仍與目前產品架構相容。例：`1.3.8 → 1.4.0`。

適用：

- 新增新的使用者功能
- 新增新的工作人員功能
- 新增新的 AR 能力
- 新增新的辨識能力
- 新增新的 OTA 功能
- 新增新的 diagnostics 功能
- 新增新的正式產品模組

**MINOR +1 時，PATCH 歸零。**

### PATCH — `1.0.X`

既有功能的修正與小幅調整。例：`1.0.7 → 1.0.8`。

適用：

- Bug fix、UI 修正、按鈕位置調整、捲動問題
- 文案修改、翻譯修正
- 圖片替換、影片替換
- 情境流程小修、CSS 修正
- 既有 Gesture 行為修正
- 不增加新產品能力的程式修正

### 快速判斷

| 這次改了什麼 | 版本 |
| --- | --- |
| Bug／UI／文案／圖片／影片／情境小修 | **PATCH** |
| 新增相容的新功能 | **MINOR** |
| 不相容／重大架構改版 | **MAJOR** |
| 只改 `webapp/`（React／JS／CSS／劇情／i18n／素材／Web AR） | **只動 Web Bundle** |
| 改到 `android/` Native 層 | **動 Shell**；若同時改網頁內容則兩者都動 |

判斷不出來時的預設是 **PATCH**：把修正誤標成新功能，會讓「1.4.0 到底多了什麼」永遠答不出來。

---

## 3. 正式 Release ID

每一次正式 OTA 發布，除了 Semantic Version 之外，必須附加發布日期與當日序號：

```
MAJOR.MINOR.PATCH-YYYYMMDD.NNN
```

例：

```
1.0.0-20260825.001
 │       │      └── 當日第 1 個正式發布
 │       └───────── 正式發布日期（Asia/Taipei）
 └───────────────── 產品 Semantic Version
```

- 每日序號從 `001` 開始，當天每多一個正式發布就 +1。
- 換日重新從 `001` 開始。

同一天：

```
1.0.1-20260825.001
1.0.2-20260825.002
1.0.3-20260825.003
```

隔天：

```
1.0.4-20260826.001
```

**日期與序號一律由 CI 在正式發布當下產生**（`ota-release.yml` 的 `Decide the Release ID`），
序號是數當天已經存在的 `web-*` git tag 得來的。任何人都不要在 PR 裡先寫死日期或序號 ——
PR 只決定 Semantic Version，Release ID 只在 merge 之後才存在。

---

## 4. APK Shell 與 Web Bundle 的版本不互相對齊

兩者是**獨立的版本序列**，數字相同純屬巧合：

```
APK Shell      1.0.0        ← 從第一支正式 Offline-first OTA APK 起算
Web Bundle     1.3.8-20260825.004
```

只有 Native Android Shell 發生變更才增加 APK Shell version。

---

## 5. APK Shell Version：`SHELL_VERSION` / `versionName` / `versionCode`

`SHELL_VERSION` 定義在 [`release/versions.json`](../release/versions.json)：

```json
{
  "shellVersion": "1.0.0",
  "shellVersionCode": 10000,
  "webBundleVersion": "1.0.0",
  "minShellVersion": "1.0.0"
}
```

`android/app/build.gradle` 讀這個檔，Android 自己需要的兩個欄位由它推導出來：

| 欄位 | 值 | 誰決定 | 用途 |
| --- | --- | --- | --- |
| `SHELL_VERSION` | `1.0.0` | `release/versions.json` | **產品版本。**人看的、記在交付紀錄裡的、OTA `minShellVersion` 比對的就是它。編進 `BuildConfig.SHELL_VERSION` |
| `versionName` | `1.0.0-offline+42.abc1234` | `SHELL_VERSION` ＋ flavor ＋ CI build metadata | 手機「應用程式資訊」顯示的字串。開頭一定是 `SHELL_VERSION` |
| `versionCode` | `10042` | `shellVersionCode` ＋ CI run number | **只給 Android 判斷升級用的整數**，必須單調遞增，不代表產品版本 |

`shellVersionCode = MAJOR × 10000 + MINOR × 100 + PATCH`，所以 `1.0.0 → 10000`、`1.4.2 → 10402`、
`2.0.0 → 20000`。實際 `versionCode = shellVersionCode + CI run number`：基底只會往上、run number 永遠遞增，
兩者相加必定嚴格遞增，手機因此永遠不會把新版當成降級。

這三者的關係由三道檢查釘住，改壞了在建置時就會失敗，不會流到手機上：

- `android/app/build.gradle` 建置時驗 `shellVersionCode` 與 `shellVersion` 相符；
- `ShellVersionTest`（單元測試）驗 `BuildConfig.SHELL_VERSION`、`versionName`、`versionCode` 與檔案一致；
- `ota-release.yml` 的 `version-bump-check` 在每個 PR 上重驗一次。

> **不要因為修改一句劇情文字就增加 APK Shell version。**

---

## 6. Web Bundle Version：`WEB_BUNDLE_VERSION`

Semantic Version 寫在 `release/versions.json` 的 `webBundleVersion`，**每一個改到 Web Bundle 內容的 PR 都必須遞增**
（`webapp/src/`、`webapp/public/`、`webapp/index.html`、`webapp/vite.config.js`、`webapp/package.json`、
`webapp/package-lock.json`）。忘了改的話 PR 會被 `version-bump-check` 擋下來。

正式發布時，完整的 `WEB_BUNDLE_VERSION`（＝ Release ID，例如 `1.0.3-20260825.002`）由 CI 寫進：

| 寫到哪 | 由誰 |
| --- | --- |
| `release/ota/latest.json` | `ota-release.yml` |
| `release/ota/releases/<Release ID>.json`（OTA manifest） | `ota-release.yml` |
| GitHub Release（`web-<Release ID>` tag，含 zip 與 manifest） | `ota-release.yml` |
| Bundle 自己 —— 編進 JS 的 `__CIBAR_WEB_BUNDLE__`（`webapp/vite.config.js`） | build 時的 `CIBAR_RELEASE_ID` |
| Bundle 自己 —— zip 內的 `ota-manifest.json`（不含 `sha256`，檔案裝不下包住自己的壓縮檔的雜湊） | `ota-release.yml` |
| `docs/RELEASE_HISTORY.md` | `ota-release.yml` |
| 完成報告／交付紀錄 | 人 |

### Diagnostics 看得到目前是哪一組

App 內的版本資訊來自兩邊，`webapp/src/lib/releaseInfo.js` 把它們合在一起：

- **Web Bundle**：build 時就編進 bundle（`webBundleVersion`、`releaseId`、`gitCommit`、`minShellVersion`）。
- **Shell Version**：APK 在頁面載入完成時注入 `window.__cibarShell`（`ShellBridgeScript` →
  `WebLayerController.onPageFinished`），內容為 `shellVersion` / `versionName` / `versionCode` /
  `flavor` / `bundledWebContent`。在一般瀏覽器裡沒有這個物件，就誠實回報「沒有 Shell」。

看得到的地方：

- `/ar-scan` 的**掃描診斷 overlay** 最上面一行：`Shell 1.0.0 · Bundle 1.0.3-20260825.002`。
  三種開啟方式，沒有一種會發生在玩家身上：`npm run dev`、進入網址帶 `?diag=1`、
  或在 WebView inspector 設 `__CIBAR_AR_SCAN_DIAGNOSTICS__ = true`（見
  `webapp/src/lib/ar/scanDiagnostics.js` 的 `isScanDiagnosticsEnabled()`）
- 每次啟動時寫進 console 的一行 `[CIBAR] web bundle …`，眼鏡上用 `adb logcat` 讀得到
- `window.__cibarRelease`（remote debugging 用）

正式產品畫面不顯示任何版本字串 —— 正式 APK 不得出現工程 UI（見 `android/CLAUDE.md` §11）。

---

## 7. 版本號不得由 AI 或任何人「猜」

**在建立新版本之前，必須先讀取目前最新的正式版本。**

讀哪裡（依序）：

1. `release/versions.json` —— 目前 `main` 上的 Shell 與 Web Bundle Semantic Version。
2. `docs/RELEASE_HISTORY.md` **最上面**那一列（新的在上面）—— 最近一次正式發布的 Release ID。
3. `release/ota/latest.json` —— production 目前指向的 Release。

例：目前最新正式版本是 `1.4.7-20260825.003`，

| 這次是 | 下一版 |
| --- | --- |
| UI 修正 | `1.4.8-YYYYMMDD.NNN` |
| 新增正式功能 | `1.5.0-YYYYMMDD.NNN` |
| 不相容重大改版 | `2.0.0-YYYYMMDD.NNN` |

**禁止因為不知道目前版本就自行從 `1.0.0` 開始。**
`version-bump-check` 會擋下退版與跳版（從 `1.4.7` 只能走到 `1.4.8`、`1.5.0` 或 `2.0.0`）。

---

## 8. PR 不等於正式 Release

建立 PR、commit、push 時可以決定「預計版本」（也就是改 `release/versions.json`）。

但是：

> **PR 尚未 merge 時，不得把 production `latest.json` 指向該版本。**

正式 OTA Release 必須完整走完這條路：

```
PR approved / merged
  → tests（webapp 的 prebuild validators、Android 單元測試）
  → build（npm run build）
  → offline audit（audit-offline-web-assets.mjs）
  → bundle（zip）
  → SHA-256
  → publish release（GitHub Release，tag web-<Release ID>）
  → latest.json
```

只有走完上述流程才算正式 Release。這條路由 `.github/workflows/ota-release.yml` 的 `release` job 執行，
而它只在 `main` 上跑 —— **分支上不可能產生 Release ID**。

---

## 9. 每次 merge 後的 OTA 規則

如果修改涉及：React／JS／CSS／UI／劇情／i18n／圖片／影片／音效／Web AR／Web gesture logic／
image recognition web assets，而**不需要重新打 APK**：

**merge 到 `main` 後由 CI 自動產生新的 OTA Web Bundle。**

不要求任何人記得手動產 bundle —— `ota-release.yml` 在 `main` 收到這些路徑的變更時自動：

1. 決定 Release ID（今天日期 ＋ 當日序號）
2. `npm ci` → `npm run build`（含 webapp 自己的 prebuild validators）
3. 跑離線稽核，確認 bundle 不會在執行時對外連線
4. 打包 zip、算 SHA-256
5. 建立 GitHub Release `web-<Release ID>`
6. 寫 `release/ota/releases/<Release ID>.json` 與 `release/ota/latest.json`
7. 在 `docs/RELEASE_HISTORY.md` 附加一列
8. 把 6、7 推回 `main`（commit 訊息帶 `[skip ci]`，不會再觸發自己）

Android APK 由 `.github/workflows/build-android.yml` 另外建置；**只改網頁內容不會、也不需要產生新的 APK。**

---

## 10. Release Manifest 必須留下來源

每個正式 OTA manifest（`release/ota/releases/<Release ID>.json`）至少記錄：

```json
{
  "releaseId": "1.0.3-20260825.002",
  "version": "1.0.3",
  "releaseDate": "2026-08-25",
  "sequence": 2,
  "gitCommit": "<commit SHA>",
  "sourcePR": 370,
  "sha256": "<SHA-256>",
  "sizeBytes": 12345678,
  "minShellVersion": "1.0.0",
  "url": "https://github.com/magician-eric/ScamAware-AR/releases/download/web-1.0.3-20260825.002/cibar-web-1.0.3-20260825.002.zip"
}
```

`version`、`releaseDate`、`sequence`、`gitCommit`、`sourcePR`、`sha256`、`minShellVersion`
這七項是**追蹤資訊，不得省略**；schema 可以再加欄位，但不能少這些。
`sourcePR` 在直接 push 到 `main`（沒有 PR）時為 `null`，這是誠實的答案，不是遺漏。

`release/ota/latest.json` 是最後一次正式發布的同一份 manifest 的副本，也是 production 的指標。
它同時被複製到發布站台的 `ota/latest.json`，所以線上版 Shell 可以直接讀
`https://magician-eric.github.io/ScamAware-AR/ota/latest.json`。

---

## 11. Release History

[`docs/RELEASE_HISTORY.md`](RELEASE_HISTORY.md) **只記實際正式發布的版本**，不是 commit 紀錄。

欄位：`Release | Shell | Web Bundle | Date | PR | Commit | Type | Notes`

由 `ota-release.yml` 在發布成功之後自動附加一列，`Type` 欄（PATCH／MINOR／MAJOR）是拿前一次的
`latest.json` 與這次的版本比出來的，不是人填的，所以不可能與版本號互相矛盾。

`1.4.0-20260901.001` 以前的記錄產生於舊帳號 `ericingptt/CIBAR`。該帳號已無法存取，那批
manifest 的 `url` 與 History 表 `Notes` 欄的分支名都保持原值不改寫，理由與作法見
[`release/ota/README.md`](../release/ota/README.md)。

---

## 12. Delivery History：交付紀錄

[`docs/DELIVERY_HISTORY.md`](DELIVERY_HISTORY.md) 記錄**實際交付出去的版本**。

欄位：`Delivery Date | Recipient / Project | APK Shell | Web Bundle | Release ID | APK SHA-256 | Notes`

例：

```
2026-09-01 | CIB 反詐騙教育館 | 1.0.0 | 1.4.2 | 1.4.2-20260901.001 | a3f1… | 正式展示版
```

這份**由人在交付當下填寫**，因為只有現場的人知道那台設備裝的是哪一支 APK。

---

## 13. Release ≠ Delivery

| | 意義 |
| --- | --- |
| **Release** | 系統正式發布了一個版本 |
| **Delivery** | 某個特定版本實際交付給客戶／現場／設備 |

`1.4.0` 可能發布了但從來沒有交付；真正交到刑事警察局手上的是 `1.4.2`。
所以 **Release History 與 Delivery History 不能混在一起**，也不能互相取代。

要回答「2026/09/01 到底交出去的是哪一版？」，看的是 Delivery History；
要回答「1.4.2 改了什麼、來源 PR 是哪一個？」，看的是 Release History 與該版的 manifest。

---

## 14. APK 交付必須留下 SHA-256

每次正式交付 APK 時計算並記錄在 Delivery History：

```bash
sha256sum offline.apk
```

`build-android.yml` 也會在每次建置時印出四支 APK 的 SHA-256，並寫進該次 GitHub Release 的說明，
所以交付時可以直接複製，不必自己算（但**拿到手的檔案自己再算一次**才是驗證）。

有了它，日後任何人拿著一支 APK 都能確認「這是不是 2026/09/01 交出去的那一支」。

---

## 15. OTA Bundle 也必須留下 SHA-256

每個正式 OTA Bundle 在 manifest 與 GitHub Release 說明中都保留：

- Release ID
- SHA-256
- Commit
- PR
- minShellVersion

確保 OTA bundle 可追溯。任何裝置上的 bundle 都能反查回產生它的那一個 commit。

---

## 16. AI Agent / Claude Code 工作規則

見 [`CLAUDE.md`](../CLAUDE.md)（repo 根目錄）的「版本與發布規則」章節 —— 那是 Agent 每次動工前要照著跑的檢查清單，
與本文件是同一套規則，本文件為準。

---

## 17. 目前的起點

第一支正式單一 Offline-first OTA APK：

- **Shell Version `1.0.0`**
- **第一個正式 Web Bundle `1.0.0`**

真正發布時的完整 Release ID 為 `1.0.0-YYYYMMDD.NNN`，日期與序號依**實際正式發布日**由 CI 產生，
現在不寫死。`docs/RELEASE_HISTORY.md` 在第一次正式發布之前是空的 —— 那也是誠實的：還沒有發布過。
