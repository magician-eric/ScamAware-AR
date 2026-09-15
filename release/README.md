# `release/` —— 版本與正式發布的單一事實來源

這個目錄是 CIBAR 版本號**唯一**可以被讀取與修改的地方。規則全文在
[`docs/RELEASE_VERSIONING.md`](../docs/RELEASE_VERSIONING.md)。

| 檔案 | 誰寫 | 內容 |
| --- | --- | --- |
| `versions.json` | **人／AI 在 PR 內手動修改** | 目前的 `shellVersion`、`shellVersionCode`、`webBundleVersion`、`minShellVersion` |
| `ota/latest.json` | **CI 自動產生**（`.github/workflows/ota-release.yml`） | 目前 production 指向的正式 OTA Release |
| `ota/releases/<Release ID>.json` | **CI 自動產生** | 每一次正式發布的 manifest（含 `sha256`、`gitCommit`、`sourcePR`） |

## `versions.json`

```json
{
  "shellVersion": "1.0.0",
  "shellVersionCode": 10000,
  "webBundleVersion": "1.0.0",
  "minShellVersion": "1.0.0"
}
```

- `shellVersion` —— Android APK Shell 的產品版本（`SHELL_VERSION`）。**只有 Native 層改動才增加。**
  `android/app/build.gradle` 讀這個值當作 `versionName` 的基底，`ShellVersionTest` 釘住兩者一致。
- `shellVersionCode` —— `MAJOR × 10000 + MINOR × 100 + PATCH`。Android `versionCode` 的基底，
  實際 `versionCode = shellVersionCode + CI run number`（見規格書 §5）。
- `webBundleVersion` —— 目前 `main` 上網頁內容的 Semantic Version。**每一個改到網頁內容的 PR 都要遞增**，
  `ota-release.yml` 的 `version-bump-check` 會在 PR 上擋。
- `minShellVersion` —— 這份 Web Bundle 至少需要哪一版 Shell 才能執行。

## 手動改這裡之前

1. 先讀 `docs/RELEASE_VERSIONING.md`。
2. 先看 `docs/RELEASE_HISTORY.md` 最上面那一列（新的在上面），確認目前最新正式版本。
3. 判斷這次是 PATCH / MINOR / MAJOR，只加該加的那一位。
4. **不要**在這裡填日期或序號 —— `YYYYMMDD.NNN` 由 CI 在正式發布當下產生。
