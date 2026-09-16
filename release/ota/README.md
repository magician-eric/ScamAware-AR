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
發布站台上的 `https://magician-eric.github.io/ScamAware-AR/ota/latest.json` 是它的同一份副本。

> **PR 尚未 merge 不得讓 `latest.json` 指向該版本**（規範 §8）。這也是這裡沒有任何人工編輯空間的原因：
> Release ID 只在 `main` 上、發布流程走完之後才存在。

---

## 帳號遷移：`ericingptt/CIBAR` → `magician-eric/ScamAware-AR`

### `releases/` 底下那 12 份 manifest 的 `url` 不改寫

`1.0.0-20260825.001` 到 `1.4.0-20260901.001` 這 12 份 manifest 產生於 `ericingptt/CIBAR` 時期，
它們的 `url` 欄位**維持原樣**。

那些網址記錄的是「發佈當下確實存在過的位址」。舊帳號已無法存取，該帳號下的 GitHub Release
資產也無法取回，所以**那些 URL 已經失效且無法復原**。把它們改成新帳號的位址，只會造出一個
從未存在、而且同樣抓不到的網址 —— 那不是修正，是偽造記錄。

保留原值的用途是版本序列的歷史依據：`releaseId`、`version`、`sequence`、`sha256`、`sizeBytes`、
`gitCommit`、`sourcePR`、`minShellVersion` 這些欄位仍然誠實有效，只有 `url` 不再可取。
`docs/RELEASE_HISTORY.md` 對應的 12 列（`Notes` 欄裡的 `ericingptt/...` 分支名、`PR` 欄的編號）
基於同一個理由也不改寫。

`1.5.0` 起的正式發佈改由 `magician-eric/ScamAware-AR` 產生。`ota-release.yml` 是從
`$GITHUB_REPOSITORY` 組出 `url` 的，所以它會自動指向新帳號，不需要任何設定。

### `latest.json` 在 1.5.0 發佈前是死連結

`latest.json` 的 `url` **已經改成新帳號的位址**，但它指向的 `1.4.0-20260901.001` 資產從未在新
帳號發佈過。在 `1.5.0` 正式發佈之前，那是個抓不到的網址。

這是遷移期間的已知中間狀態，不是錯誤：舊帳號的位址一樣抓不到，兩者等價，差別只在於新位址會
在 `1.5.0` 發佈後自動成立。實務影響也有限 —— 已經裝著 1.4.0 的裝置比對版本後根本不會發動下載
（`OtaUpdater` 的「已經是這一版或更新」狀態），只有停在更舊 bundle 的裝置才會真的去抓而失敗，
而下載失敗不影響目前這一份 bundle，App 照常使用。
