# CIBAR Release History

**只記錄實際正式發布的版本。** 這不是 changelog，也不是 commit 紀錄 ——
沒有走完正式發布流程的 commit、PR、預覽建置都不會出現在這裡。

規則見 [`RELEASE_VERSIONING.md`](RELEASE_VERSIONING.md)。交付紀錄是另一份：
[`DELIVERY_HISTORY.md`](DELIVERY_HISTORY.md)（發布 ≠ 交付，見規範 §13）。

## 這份表格由 CI 維護

新的一列由 [`.github/workflows/ota-release.yml`](../.github/workflows/ota-release.yml) 在
**GitHub Release 發布成功之後**自動附加到下面那個標記的位置，不要用手加。
`Type` 欄是拿前一版與這一版的版本號比出來的，所以永遠不會與版本號互相矛盾。

欄位：

| 欄位 | 意義 |
| --- | --- |
| `Release` | 完整 Release ID `MAJOR.MINOR.PATCH-YYYYMMDD.NNN` |
| `Shell` | 發布當下的 APK Shell Version（`release/versions.json` 的 `shellVersion`） |
| `Web Bundle` | 這次發布的 Web Bundle Semantic Version |
| `Date` | 正式發布日（Asia/Taipei） |
| `PR` | 來源 PR；直接 push 到 `main` 時為 `—` |
| `Commit` | 產生這個 bundle 的 commit（前 7 碼） |
| `Type` | `PATCH` / `MINOR` / `MAJOR` / `INITIAL` / `REBUILD` |
| `Notes` | 該次發布的 commit 標題 |

每一列的完整 manifest（含 SHA-256、`minShellVersion`、下載網址）在
`release/ota/releases/<Release ID>.json`，以及 GitHub Release `web-<Release ID>`。

## Releases

**最新的在最上面。** 表格是空的就代表還沒有任何正式 OTA Release ——
第一次正式發布會是 `1.0.0-YYYYMMDD.NNN`，日期與序號依實際發布日產生（規範 §17）。

> **`1.4.0-20260901.001` 以前的 12 列產生於 `ericingptt/CIBAR`。** 該帳號已無法存取，所以
> `Notes` 欄裡的 `ericingptt/...` 分支名與 `PR` 欄的編號**維持原樣不改寫** —— 它們記錄的是
> 當時確實存在過的來源，改成新帳號只會造出從未存在的參照。對應的
> `release/ota/releases/*.json` 的 `url` 基於同一個理由也保持原值，那些下載網址已失效且
> 無法復原。詳見 [`release/ota/README.md`](../release/ota/README.md)。
> `1.5.0` 起改由 `magician-eric/ScamAware-AR` 發佈。

| Release | Shell | Web Bundle | Date | PR | Commit | Type | Notes |
| ------- | ----- | ---------- | ---- | -- | ------ | ---- | ----- |
<!-- ota-release-rows -->
| `1.7.2-20260917.005` | 1.2.0 | 1.7.2 | 2026-09-17 | #13 | `0c314bd` | PATCH | Merge pull request #13 from magician-eric/claude/gesture-arrow-sync |
| `1.7.1-20260917.004` | 1.2.0 | 1.7.1 | 2026-09-17 | #12 | `de8513a` | PATCH | Merge pull request #12 from magician-eric/claude/youthful-euler-pvpjd6 |
| `1.7.0-20260917.003` | 1.2.0 | 1.7.0 | 2026-09-17 | #11 | `c06e9fc` | MINOR | Merge pull request #11 from magician-eric/claude/inspiring-cannon-dh30oq |
| `1.6.0-20260917.002` | 1.2.0 | 1.6.0 | 2026-09-17 | #8 | `17175e7` | MINOR | Merge pull request #8 from magician-eric/claude/brave-galileo-qfr88p |
| `1.5.4-20260917.001` | 1.2.0 | 1.5.4 | 2026-09-17 | #7 | `9e489c2` | PATCH | Merge pull request #7 from magician-eric/claude/kind-gates-bwld4m |
| `1.5.3-20260916.004` | 1.2.0 | 1.5.3 | 2026-09-16 | #6 | `0ed81b5` | PATCH | Merge pull request #6 from magician-eric/feat/s04-vexa-flex-x1-story |
| `1.5.2-20260916.003` | 1.2.0 | 1.5.2 | 2026-09-16 | #5 | `7e613e3` | PATCH | Merge pull request #5 from magician-eric/feat/s04-vexa-actual-product-assets |
| `1.5.1-20260916.002` | 1.2.0 | 1.5.1 | 2026-09-16 | #4 | `22f72f2` | MINOR | Merge pull request #4 from magician-eric/claude/youthful-heisenberg-xau2b7 |
| `1.4.0-20260901.001` | 1.1.0 | 1.4.0 | 2026-09-01 | #386 | `6ed8d72` | MINOR | Merge pull request #386 from ericingptt/claude/ar-recognition-flow-split-m86xio |
| `1.3.3-20260826.004` | 1.1.0 | 1.3.3 | 2026-08-26 | #385 | `92eee5e` | PATCH | Merge pull request #385 from ericingptt/claude/cibar-scenario2-remove-back-button-tqwyqm |
| `1.3.2-20260826.003` | 1.1.0 | 1.3.2 | 2026-08-26 | #384 | `67d9e4e` | PATCH | Merge pull request #384 from ericingptt/claude/scenario04-ad33-flow-blocker |
| `1.3.1-20260826.002` | 1.1.0 | 1.3.1 | 2026-08-26 | #382 | `67da8dc` | PATCH | Merge pull request #382 from ericingptt/claude/cibar-opening-motion-graphics-phase2 |
| `1.3.0-20260826.001` | 1.1.0 | 1.3.0 | 2026-08-26 | #381 | `0a6389f` | MINOR | Merge pull request #381 from ericingptt/claude/cibar-opening-animation-redesign-gduw13 |
| `1.2.0-20260825.007` | 1.1.0 | 1.2.0 | 2026-08-25 | #378 | `75876bf` | MINOR | Merge pull request #378 from ericingptt/claude/cibar-staff-version-management-2tkbzp |
| `1.1.3-20260825.006` | 1.0.0 | 1.1.3 | 2026-08-25 | #377 | `667063b` | PATCH | Merge pull request #377 from ericingptt/claude/intro-video-triple-tap-skip-xd1wfe |
| `1.1.2-20260825.005` | 1.0.0 | 1.1.2 | 2026-08-25 | #376 | `e4d90c5` | PATCH | Merge pull request #376 from ericingptt/claude/intro-video-startup-latency-moc9p9 |
| `1.1.1-20260825.004` | 1.0.0 | 1.1.1 | 2026-08-25 | #375 | `967539a` | PATCH | Merge pull request #375 from ericingptt/claude/scenario-02-coin-winner-return-u8esja |
| `1.1.0-20260825.003` | 1.0.0 | 1.1.0 | 2026-08-25 | #372 | `361d3b7` | MINOR | Merge pull request #372 from ericingptt/claude/cibar-android-ota-offline-am8h0t |
| `1.0.0-20260825.002` | 1.0.0 | 1.0.0 | 2026-08-25 | — | `43e6c21` | REBUILD | Add files via upload |
| `1.0.0-20260825.001` | 1.0.0 | 1.0.0 | 2026-08-25 | #371 | `7c7c994` | INITIAL | Merge pull request #371 from ericingptt/claude/cibar-versioning-release-spec-lr3bvb |
