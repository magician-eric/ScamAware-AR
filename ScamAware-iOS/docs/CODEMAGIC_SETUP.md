# Codemagic 雲端建置設定（全程用 Windows 瀏覽器）

為什麼選 Codemagic：提供雲端 macOS + Xcode，可以**只用網頁**設定 iOS 簽章（用 App Store Connect API 金鑰
自動建立憑證與 Ad Hoc 描述檔），不需要任何一台 Mac；有免費額度，手動觸發才計費。
（替代方案：GitHub Actions 的 macOS runner 也可以，但私有 repo 的 macOS 分鐘數要 10 倍計費，
且簽章要自己處理 `.p12` 匯出，而匯出 `.p12` 通常需要 Mac，所以首選 Codemagic。）

## 0. 決定 repo（Codemagic 只讀 repo 根目錄的 `codemagic.yaml`）

**建議：獨立私有 repo**，iOS 與 Android 的發布紀錄完全分開：

```bash
# 在 ScamAware-AR 的 clone 裡（Git Bash / WSL）
git subtree split --prefix=ScamAware-iOS -b scamaware-ios-only
# 在 GitHub 建立空的私有 repo，例如 <公司>/ScamAware-iOS，然後：
git push https://github.com/<公司>/ScamAware-iOS.git scamaware-ios-only:main
```

新 repo 的根目錄就是 `project.yml`、`codemagic.yaml`，直接可用。

**替代：留在 ScamAware-AR**：把 `ScamAware-iOS/codemagic.yaml` 複製一份到 repo 根目錄即可
（yaml 會自動找 `ScamAware-iOS/` 子目錄）。這會在原 repo 根目錄多一個檔案，但不影響 Android 與 OTA。

## 1. 建立 Codemagic 帳號與 App

1. codemagic.io → **Sign up with GitHub**，授權可以讀取上一步的 repo。
2. **Add application** → 選 repo → Project type 選 **iOS App**（其他設定都由 `codemagic.yaml` 決定）。

## 2. 先跑免帳號的編譯檢查（建議立即做）

Codemagic → 這個 App → **Start new build** → Workflow 選 **`ios-compile-check`**。

- 不需要任何 Apple 帳號。
- 會建置網頁、產生 Xcode 專案、分別為模擬器與 iPhone 編譯（**關閉簽章**）。
- 成功 = Swift 程式與專案設定可以編譯。**這個 workflow 不會產生 IPA，它的產物不能安裝到 iPhone。**
- 若失敗，把 build log 給我，我來修。

## 3. 設定簽章用的安全變數

準備好 [`NEEDED_FROM_YOU.md`](NEEDED_FROM_YOU.md) 第 1–8 項後：

Codemagic → **Teams**（或 App settings）→ **Environment variables** → 新增群組 **`scamaware_ios_signing`**，
新增下列變數，**每一個都勾選 Secure**：

| 變數名稱 | 值 |
| --- | --- |
| `APP_STORE_CONNECT_ISSUER_ID` | App Store Connect API 頁面上方的 Issuer ID（UUID） |
| `APP_STORE_CONNECT_KEY_IDENTIFIER` | API 金鑰的 Key ID（10 碼） |
| `APP_STORE_CONNECT_PRIVATE_KEY` | 用記事本打開 `AuthKey_XXXXXXXXXX.p8`，**整份內容**（含 `-----BEGIN PRIVATE KEY-----` 那兩行）貼上 |
| `CERTIFICATE_PRIVATE_KEY` | 用記事本打開 `scamaware_cert_key`（不是 `.pub`），**整份內容**貼上 |
| `BUNDLE_ID`（選填） | 只有在不用 `com.bigxreality.scamaware.ios` 時才需要 |

這些值只存在 Codemagic，建置 log 會自動遮蔽。不要寫進任何檔案或 commit。

## 4. 建置 Ad Hoc IPA

**Start new build** → Workflow 選 **`ios-adhoc`**。流程：

1. 檢查上面 4 個變數，缺一個就**直接失敗**（不會偷偷產生未簽署版本）。
2. 用 API 金鑰建立（或沿用）Apple Distribution 憑證，以及包含**目前所有已登記 iPhone** 的 Ad Hoc 描述檔。
3. 建置網頁、靜態檢查、離線稽核 → 產生 Xcode 專案 → 套用描述檔 → `build-ipa`。
4. `scripts/verify-ipa.sh` 驗證：簽章有效、是 Ad Hoc（不是開發版／企業版）、描述檔內至少 1 台裝置。
   驗證不過就失敗，不會輸出 IPA。
5. 輸出到 `dist/ios/<版本>/ScamAware-iOS-v<版本>-build<建置號>.ipa`，並附上
   `SHA256SUMS.txt`、`BUILD_INFO.txt`（含描述檔涵蓋的裝置數、到期日）、`INSTALL.md`、`CHANGELOG.md`、`KNOWN_LIMITATIONS.md`。

## 5. 下載產物（Windows）

Codemagic → 該次 build → 右側 **Artifacts** → 逐一下載，或下載整包 zip。
建議存到你電腦上同樣的結構：`ScamAware-iOS\dist\ios\<版本>\`。
IPA 約 80 MB，**不要 commit 進 git**（`.gitignore` 已排除）。

Codemagic 也會把結果寄到啟動建置的人的信箱；要寄給其他人，在 `codemagic.yaml` 的 `publishing.email` 加收件人。
接著照 [`INSTALL_WINDOWS_IPHONE.md`](INSTALL_WINDOWS_IPHONE.md) 安裝到 iPhone。

## 6. 之後要發新版

1. 改程式或內容。
2. 依影響程度改 `version.json` 的 `marketingVersion`（PATCH 修正／MINOR 新功能／MAJOR 不相容），
   並新增 `dist/ios/<新版本>/` 的 `INSTALL.md`、`CHANGELOG.md`、`KNOWN_LIMITATIONS.md`（可複製上一版再改）。
   只重建同一版本時不用改，建置號會自動遞增。
3. Codemagic 跑 `ios-adhoc`，下載，重新安裝。已安裝的 App 會被覆蓋（資料保留，除非 Bundle ID 改變）。

iOS 版的版本號與 Android 的 `release/versions.json` **完全無關**，兩邊各自遞增。

## 常見失敗

| 訊息 | 原因／處理 |
| --- | --- |
| `Missing Codemagic secure variables` | 第 3 步的群組名稱或變數名打錯，或忘了在 workflow 可見的範圍建立 |
| `fetch-signing-files` 找不到 Bundle ID | 先在 Apple Developer 登記 Bundle ID（NEEDED_FROM_YOU 第 4 項） |
| 憑證數量已達上限 | Apple 限制 Distribution 憑證數量；到 Certificates 撤銷不用的舊憑證後重跑 |
| `profile lists no devices` | 還沒登記任何 UDID（第 8 項），或登記後沒刪舊描述檔 |
| iPhone 顯示「無法安裝」 | 該 iPhone 不在描述檔中 → 登記 UDID、刪舊描述檔、重建、重裝 |
