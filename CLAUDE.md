# CIBAR — 給 AI Agent / Claude Code 的專案規則

這個檔案只放**跨整個 repo 的工作規則**。Android 專案自己的必讀錯誤紀錄在
[`android/CLAUDE.md`](android/CLAUDE.md)（手勢、JJSDK、flavor、正式 APK 不得有工程 UI 等），
產品規格在 [`docs/CIBAR-Technical-Specification.md`](docs/CIBAR-Technical-Specification.md)。

---

## 版本與發布規則

完整規範：[`docs/RELEASE_VERSIONING.md`](docs/RELEASE_VERSIONING.md)。**那份文件為準**，
這裡只是每次動工前要照著跑的檢查清單。

### 每次執行 CIBAR 修改任務前

1. **讀 [`docs/RELEASE_VERSIONING.md`](docs/RELEASE_VERSIONING.md)。**
2. **查目前最新 Shell Version** —— [`release/versions.json`](release/versions.json) 的 `shellVersion`。
3. **查目前最新正式 Web Bundle Version** —— `release/versions.json` 的 `webBundleVersion`，
   以及 [`docs/RELEASE_HISTORY.md`](docs/RELEASE_HISTORY.md) 最上面那一列（最近一次正式發布）。
4. **判斷這次屬於 PATCH / MINOR / MAJOR**：

   | 這次改了什麼 | 版本 |
   | --- | --- |
   | Bug／UI／文案／圖片／影片／情境小修 | PATCH |
   | 新增相容的新功能 | MINOR |
   | 不相容／重大架構改版 | MAJOR |
   | 只改 `webapp/` | 只動 `webBundleVersion` |
   | 改到 `android/` Native 層 | 動 `shellVersion`（＋ `shellVersionCode`） |

   判斷不出來時預設 PATCH。
5. **不得自行重設版本號。** 不知道目前版本就去讀第 2、3 步的檔案，
   **禁止因為不知道就從 `1.0.0` 重新開始**，也禁止跳版（`1.4.7` 只能走到 `1.4.8` / `1.5.0` / `2.0.0`）。
6. **PR 尚未 merge 不得 publish production latest。** 不要在 PR 裡寫日期或當日序號，
   不要手改 `release/ota/latest.json` —— Release ID（`YYYYMMDD.NNN`）只在 merge 後由 CI 產生。
7. **merge 後的正式 OTA release 由 CI 留下 Release History。**
   [`.github/workflows/ota-release.yml`](.github/workflows/ota-release.yml) 自動打包、算 SHA-256、
   發 GitHub Release、寫 manifest 與 `docs/RELEASE_HISTORY.md`。不要手動補、也不要重複發。
8. **真正交付客戶／展示設備時才更新
   [`docs/DELIVERY_HISTORY.md`](docs/DELIVERY_HISTORY.md)**，並附上該支 APK 的完整 SHA-256。
   發布 ≠ 交付。

### 動到 `webapp/` 的 PR，一定要做的事

改到 `webapp/src/`、`webapp/public/`、`webapp/index.html`、`webapp/vite.config.js`、
`webapp/package.json`、`webapp/package-lock.json` 之中任何一個，就**必須在同一個 PR 內**
把 `release/versions.json` 的 `webBundleVersion` 依規則遞增。
忘了的話 `ota-release.yml / version-bump-check` 會擋下來。

只改 `webapp/scripts/`（validator、測試）不算 Web Bundle 內容，不需要遞增。

### 版本號只能在一個地方改

`release/versions.json` 是**唯一**可以編輯版本號的檔案。
`android/app/build.gradle`（`versionName` / `versionCode` / `BuildConfig.SHELL_VERSION`）與
`webapp/vite.config.js`（bundle 內建的版本資訊）都從它讀，**不要在那兩個檔案裡寫死版本**。
