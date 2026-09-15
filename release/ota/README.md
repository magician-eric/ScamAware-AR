# `release/ota/` —— 正式 OTA Release 紀錄（由 CI 產生）

**這個目錄的內容全部由 [`.github/workflows/ota-release.yml`](../../.github/workflows/ota-release.yml)
自動寫入，不要用手改。** 規則見 [`docs/RELEASE_VERSIONING.md`](../../docs/RELEASE_VERSIONING.md)。

| 檔案 | 內容 |
| --- | --- |
| `latest.json` | production 目前指向的正式 OTA Release（＝最後一次發布的 manifest 副本） |
| `releases/<Release ID>.json` | 每一次正式發布的 manifest，永久保留 |

manifest 至少包含：`releaseId`、`version`、`releaseDate`、`sequence`、`gitCommit`、`sourcePR`、
`sha256`、`sizeBytes`、`minShellVersion`、`url`。

`latest.json` 在第一次正式發布之前不存在 —— **這代表「還沒有任何正式 OTA Release」，不是錯誤。**
發布站台上的 `https://ericingptt.github.io/CIBAR/ota/latest.json` 是它的同一份副本。

> **PR 尚未 merge 不得讓 `latest.json` 指向該版本**（規範 §8）。這也是這裡沒有任何人工編輯空間的原因：
> Release ID 只在 `main` 上、發布流程走完之後才存在。
