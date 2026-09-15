# 遷移指示：CIBAR → magician-eric/ScamAware-AR

**給 Claude Code 的執行文件。** 這是第一批（遷移）。品牌全面改名是第二批，**不在本文件範圍內**。

---

## 0. 背景與前提

- 舊 repo `ericingptt/CIBAR` **已無法存取，也無法 transfer**。沒有 git 歷史、沒有 PR、舊的 GitHub Releases 資產（12 個 OTA bundle、shell APK）全部取不回。
- 現有的原始碼來自 GitHub「Download ZIP」的快照，工作目錄完整，但 `.git` 不存在。
- 新位置：**`magician-eric/ScamAware-AR`**，repo 名稱大小寫以 URL 為準 —— `ScamAware-AR`，不是 `SCAMAWARE-AR`。GitHub Pages 會用 repo 的實際大小寫組出路徑，寫錯就 404。
- 新 repo 必須是 **private**（理由見 §1）。
- 現場裝置（刑事局展場、測試機）跑的是 shell 1.1.0 + web bundle 1.4.0，它們指向已死的舊帳號網址。**這些裝置必須手動重裝一次新 APK**，這是無法用 OTA 解決的，因為 OTA 通道本身就指向死掉的位置。

### 交付要求

不要交付 placeholder、樣板、`TODO`、或「示意用」的實作。每一項改完都要能通過 §8 的驗證。如果某一項你做不到或判斷不該做，**停下來說明原因**，不要用假的實作填過去。

每完成一個 Task 就停下來報告 diff，等確認後再進下一個。不要一次做完全部。

---

## 1. 絕對不要改

以下每一項都有具體理由。動了就會壞，而且有些壞法要到現場才發現。

| 不要改 | 位置 | 理由 |
|---|---|---|
| `keystore/cibar-test.jks` 檔名 | `android/app/keystore/` | `AppIdentityTest.java:197` 斷言此檔存在且 > 500 bytes |
| `storeFile file("keystore/cibar-test.jks")` | `build.gradle:78` | `AppIdentityTest.java:203` 逐字斷言這行字串 |
| `signingConfigs.cibarTest` 這個名字 | `build.gradle:77,127,138` | `AppIdentityTest.java:205` 斷言它恰好出現 2 次 |
| storePassword / keyAlias / keyPassword `"cibar-test"` | `build.gradle:79-81` | **改 keyAlias 等於換簽章身分。** 現場裝置就無法覆蓋升級，必須先卸載，卸載會清光本機資料和已下載的 bundle |
| `applicationId "com.bigxreality.jorjinverifier"` | `build.gradle:86` | 同上，改了就不是同一個 app，無法覆蓋安裝 |
| CSS class 前綴 `cibar-outcome-*`、`cibar-analysis-*` | `webapp/src/**`、`webapp/src/styles/**` | 測試逐字斷言：`outcome-ownership.test.mjs:184,185,196,197,214,239,241,263,268`、`global-css-ownership.test.mjs:228,229`。約 378 處，純內部命名，改了零收益 |
| `'cibar-scenario05-state'` | `webapp/src/lib/scenario05Store.js:10` | localStorage key，改了清光現場裝置進度 |
| `'cibar-scenario02-platform-state'` | `webapp/src/lib/scenario02Store.js:137` | 同上 |
| `'cibar-location'` | `webapp/src/lib/location/LocationProfileStore.js:17` | IndexedDB DB_NAME，改了舊資料庫變孤兒 |
| `'cibar-location-profile'` | `webapp/src/lib/location/LocationProfileStore.js:21` | 同上 |
| `CIBAR_RELEASE_ID`、`__CIBAR_WEB_BUNDLE__`、`__CIBAR_AR_GESTURE_DIAGNOSTICS__`、`CIBAR_URL` | 多處 | 內部識別字，屬第二批。現在改只是擴大這次的風險面 |
| `release/ota/releases/*.json` 的 `url` 欄位（12 個檔案） | `release/ota/releases/` | 這些記錄「當時確實存在過的位址」。改成新帳號會造出從未存在、而且同樣抓不到的 URL，那是偽造記錄。見 Task 3d |

**keystore 為什麼不抽離到 `keystore.properties`：** 原本的想法是把明文密碼移出 repo，但 `AppIdentityTest` 的註解說明了金鑰是刻意 commit 的 —— 為了讓 release 與 debug 兩種 build 用同一把 key，兩支 APK 才能互相覆蓋。抽離會打掉這個保證。改用 **private repo** 來處理暴露問題，並在 README 記錄這是已知且刻意接受的取捨。

---

## 2. Task 1 — 確認並移除誤入 repo 的 build 產物

根目錄有一批看起來是舊版 branch-based Pages 部署的輸出被 commit 進去了。`docs/asset-architecture.md` §1 明確寫著正式的 asset root 只有五個地方，「其他看起來像 asset root 的都是 generated output」。而 `.github/workflows/deploy-pages.yml:114,124` 已經改用 `actions/deploy-pages@v4` + `path: site`，根目錄那份輸出沒有任何東西在用。

**候選清單**（根目錄）：`assets/`、`index.html`、`sw.js`、`manifest.json`、`icons/`、`data/`、`ota/`、`.nojekyll`

**先驗證，不要直接刪。** 對每一項做完以下確認並回報結果：

```bash
# 1. 根目錄 assets 是否為 Vite hash 產物
ls assets | head -20   # 預期看到 compiler-base-BsKTVWyL.js 這類 content hash 檔名

# 2. 每一項在 webapp/ 底下是否有對應的來源
for p in index.html sw.js manifest.json icons data ota; do
  echo "--- $p ---"
  find webapp release -maxdepth 3 -name "$(basename $p)" 2>/dev/null
done

# 3. 有沒有任何「非根目錄產物」的程式碼引用它們
grep -rIn --exclude-dir=assets --exclude-dir=node_modules \
  -E "\.\./(assets|icons|data|ota)/" webapp android release docs

# 4. deploy-pages.yml 是自己產生 .nojekyll 還是沿用根目錄那個
grep -n "nojekyll\|site" .github/workflows/deploy-pages.yml
```

確認為產物後才刪除。`release/ota/` 是**來源**，不要跟根目錄的 `ota/` 搞混 —— 只刪根目錄那個。

預期效果：解開後體積從約 217MB 降到約 130MB。

---

## 3. Task 2 — 新增根目錄 `.gitignore`

目前只有 `android/.gitignore`，webapp 那層完全沒有保護。第一次 `npm install` 之後 `git add .` 會把 `node_modules/` 整包 commit 進去。

**這個必須在第一次 `git add` 之前就位。**

請依照 repo 實際狀況產生，至少要涵蓋：

- `webapp/node_modules/`、`webapp/dist/`
- `webapp/src/apps/gugo-invest/app/styles/preflight.generated.css` —— `vite.config.js` 的 `scopeGugoPreflight` plugin 在 `buildStart` 時產生，檔頭自己寫了 `do not edit`，屬 generated output
- Task 1 刪掉的那批根目錄產物路徑（避免下次 build 又被加回來）
- 一般的 OS / 編輯器雜物

產生前先用 `find` / `git status --ignored` 類的方式確認沒有漏掉實際存在的產物目錄，也**不要誤擋掉來源檔**。特別注意 `webapp/public/assets/` 是來源，不能 ignore。

---

## 4. Task 3 — 帳號與路徑替換

### 3a. 帳號：`ericingptt` → `magician-eric`

50 處、30 個檔案。用以下指令取得完整清單：

```bash
grep -rIn "ericingptt" . --exclude-dir=node_modules
```

**例外**：`release/ota/releases/*.json` 那 12 個歷史檔不改（見 §1 與 Task 3d）。

### 3b. 路徑：`/CIBAR/` → `/ScamAware-AR/`

154 處。取得清單：

```bash
grep -rIn "/CIBAR/" . --exclude-dir=node_modules
```

其中必須特別檢查、不能只靠 sed 的關鍵位置：

| 檔案 | 內容 |
|---|---|
| `webapp/vite.config.js` | `base: '/CIBAR/'` → `base: '/ScamAware-AR/'`，同時更新上方註解裡的 Pages URL |
| `android/.../WebContentSource.java:40` | `LOCAL_PATH_PREFIX`，並更新 21-24 行與 39、48 行的說明註解 |
| `android/.../WebContentSource.java:60` | `SITE_ROOT` = `https://magician-eric.github.io/ScamAware-AR/` |
| `android/.../ota/WebBundlePaths.java` | `appassets.androidplatform.net/CIBAR/` 的映射與註解 |
| `android/.../WebBundleAssetHandler.java` | 3 處 |
| `.github/workflows/build-android.yml` | 6 處 |
| `.github/workflows/deploy-pages.yml` | 1 處 + 第 55 行註解裡的 latest.json URL |
| Java 測試 4 個檔案 | `WebContentSourceTest`、`WebLayerControllerTest`、`ota/WebBundlePathsTest`、`ota/TestBundles` —— 必須與主程式同步改，否則測試紅 |
| `webapp/scripts/` 下 7 個 test/stub | 同上 |

**注意大小寫**：`/ScamAware-AR/`。所有位置必須完全一致，Pages 的路徑是大小寫敏感的。

### 3c. `latest.json`

`release/ota/latest.json` 要更新為新版本（版號見 Task 5）。`url` 欄位指向新帳號的 Release 資產。

### 3d. 歷史 manifest 加註

`release/ota/releases/` 下 12 個檔案的 `url` 欄位保持原樣。在 `release/ota/README.md` 增加一段說明：這些是 `ericingptt/CIBAR` 時期的發佈記錄，該帳號已無法存取，URL 已失效且無法復原，保留僅作為版本序列的歷史依據。同時說明 1.5.0 起改由 `magician-eric/ScamAware-AR` 發佈。

`docs/RELEASE_HISTORY.md` 和 `docs/RELEASE_VERSIONING.md` 若有引用到舊 URL 的敘述，一併補上同樣的註記。

---

## 5. Task 4 — ⚠️ 新程式碼：擋掉為舊 base path 建置的 bundle

**這是本次遷移唯一的實質程式碼變更，也是最高風險項。做錯的症狀是現場裝置白畫面。**

### 問題

- `WebContentSource.LOCAL_PATH_PREFIX` 從 `/CIBAR/` 改成 `/ScamAware-AR/` 之後，shell 會把本機已安裝的 bundle 掛在新路徑下。
- 但裝置上那份 1.4.0 bundle 是用 `base: '/CIBAR/'` 建置的，它內部每一個 asset URL 都寫死 `/CIBAR/`。掛在新路徑下，所有 asset 請求 404。
- `BundleInstaller.java:102` 只檢查 `minShellVersion`（bundle 要求的最低 shell 版本），**沒有反向檢查**。沒有任何機制阻止 shell 1.2.0 去服務 1.4.0 的 bundle。

### 要求的行為

新 shell 啟動時，若本機已安裝的 bundle 不是為當前 `LOCAL_PATH_PREFIX` 建置的，必須**拒絕使用它**，退回 APK 內建的 bundle，並讓 OTA 流程去抓新版。不要讓它掛載後才失敗。

### 實作方向（自行評估後提案，不要直接動手）

先讀 `ota/BundleInstaller.java`、`ota/BundleContent.java`、`ota/BundlePaths.java`、`WebContentSource.java`、`ota/OtaManifest.java`，然後提出方案再實作。可能的做法：

- 在 bundle manifest 裡新增一個記錄 base path 的欄位，安裝時寫入、啟動時比對。需要同時改 `ota-release.yml` 的產生端。
- 或以 `minBundleVersion` 的形式在 shell 端設一個下限（例如 shell 1.2.0 要求 bundle ≥ 1.5.0），與現有 `SemanticVersion` / `minShellVersion` 機制對稱，改動面較小。
- 或啟動時直接探測已安裝 bundle 的 `index.html` 內是否含當前 prefix。

**選哪個請先說明取捨再做。** 判斷標準：能不能在沒有實機的情況下用 JVM 測試驗證。

同時必須補上對應測試。現有的 `ota/` 測試已經有既成模式可以參考（`ota/TestBundles.java`）。

---

## 6. Task 5 — 版號

`release/versions.json`：

| 欄位 | 現值 | 新值 | 理由 |
|---|---|---|---|
| `shellVersion` | `1.1.0` | `1.2.0` | shell 改了 OTA host 與 local path prefix，是行為變更 |
| `shellVersionCode` | `10100` | `10200` | 與 shellVersion 對應 |
| `webBundleVersion` | `1.4.0` | `1.5.0` | 新 base path 重新建置 |
| `minShellVersion` | `1.0.0` | `1.2.0` | **1.5.0 bundle 用新 base path，舊 shell 服務不了它。** 必須拉到 1.2.0，否則舊 shell 會下載一個它無法正確掛載的 bundle |

`minShellVersion` 這一項請對照 `BundleInstaller.java:102` 的檢查邏輯確認語意方向正確後再改。

改完檢查 `docs/RELEASE_VERSIONING.md` 是否需要同步更新。

---

## 7. Task 6 — GitHub 端設定（產出清單，不要嘗試代為執行）

你沒有新帳號的權限，所以這一項只要**產出一份精確的待辦清單**給人工執行，包含：

1. 三個 workflow（`build-android.yml`、`deploy-pages.yml`、`ota-release.yml`）各自需要哪些 secrets / variables / environments —— 逐一從 workflow 檔案裡實際讀出 `secrets.*` 與 `vars.*` 的引用，不要憑印象列。
2. Pages 需要在新 repo 開啟，以及要選哪種來源（依 `deploy-pages.yml` 的實際做法判斷）。
3. Actions 的權限設定（`permissions:` 區塊要求什麼）。
4. 首次發佈 1.5.0 的操作順序。

---

## 8. 驗證

每個 Task 完成後跑對應的驗證，全部完成後跑完整輪。

### webapp

```bash
cd webapp && npm install
npm run prebuild      # 這是一長串 validate + test 鏈，會擋住多數結構性錯誤
npm run build
npm run lint
```

`prebuild` 包含 `validate:asset-ownership`、`validate:boundaries`、`test:localization-coverage` 等十餘項，Task 1 刪檔和 Task 3 改路徑之後這條鏈是主要防線。**不要用 `--ignore-scripts` 或改 package.json 繞過它。**

### Android

`./gradlew` 在沙箱裡跑不起來（`dl.google.com` 不可達，`android/.gitignore` 的註解有說明）。用 repo 自己的 JVM 測試路徑：

```bash
cd android && tools/run-jvm-tests.sh
```

必須包含 `AppIdentityTest`、`WebContentSourceTest`、`WebBundlePathsTest`。

### 殘留檢查

```bash
# 應該為 0（12 個歷史 manifest 除外，請確認命中的只有它們）
grep -rIn "ericingptt" . --exclude-dir=node_modules

# 應該為 0（同上例外）
grep -rIn "/CIBAR/" . --exclude-dir=node_modules

# 這些應該還在，數量不變 —— 確認沒有誤改
grep -rIo "cibar-outcome" webapp/src | wc -l
grep -rIn "cibar-test" android/app/build.gradle
grep -rIn "cibar-scenario05-state\|cibar-location" webapp/src
```

### 大小

```bash
du -sh --exclude=.git --exclude=node_modules .
```

---

## 9. 推送（確認驗證全過之後）

新 repo 必須是**空的**，不要勾 README / .gitignore / license。

```bash
gh auth login                    # 登入 magician-eric
gh repo create magician-eric/ScamAware-AR --private

git init -b main
git add .
git status                       # 逐項確認：沒有 node_modules、沒有 Task 1 刪掉的產物
git commit -m "Initial import from CIBAR (no history: old account inaccessible)"
git remote add origin git@github.com:magician-eric/ScamAware-AR.git
git push -u origin main
```

`git status` 那一步不要跳。第一個 commit 進去的東西，之後要清很麻煩。

### 多帳號 SSH

若本機同時有舊帳號的 key，在 `~/.ssh/config` 用 Host alias 區分，remote 寫 `git@github-magician:magician-eric/ScamAware-AR.git`，避免又用到舊身分。

### commit 身分

確認 `git config user.email` 是新帳號的信箱，不是舊的。

---

## 10. 推送後的現場作業（給人工）

1. 用新 repo build shell 1.2.0 APK（簽章金鑰不變，所以可覆蓋安裝）。
2. 發佈 web bundle 1.5.0 到新帳號的 Releases，更新 `latest.json`。
3. 確認 `https://magician-eric.github.io/ScamAware-AR/ota/latest.json` 可正常取得。
4. 現場每台裝置手動安裝一次 1.2.0 APK。**不要卸載舊版** —— 直接覆蓋，本機資料和 LocationProfile 才會保留。
5. 覆蓋安裝後確認：新 shell 拒用舊的 1.4.0 bundle（Task 4 的行為），退回內建 bundle，然後 OTA 抓到 1.5.0。
6. 第 5 點請至少在一台測試機上先走完，再動展場裝置。
