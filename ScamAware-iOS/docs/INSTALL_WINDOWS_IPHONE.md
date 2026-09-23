# 在沒有 Mac 的情況下安裝到 iPhone

前提：iPhone 的 UDID 已登記，而且**是在登記之後才建置的 IPA**。Ad Hoc IPA 只能裝在描述檔列出的 iPhone；
其他 iPhone 一律會顯示「無法安裝」，這不是檔案壞掉。

以下三種方式任選一種。**A 或 B 最推薦**，完全不需要把 IPA 傳到 iPhone 上。

---

## A. Firebase App Distribution（免費，最省事）

適合：多支 iPhone、同事分散各地、之後要反覆更新。

一次性設定（Windows 瀏覽器）：
1. console.firebase.google.com → 建立專案（例如 `scamaware-ios`）→ 新增 **iOS App**，Bundle ID 填 `com.bigxreality.scamaware.ios`。
   設定精靈裡下載 `GoogleService-Info.plist`、加 SDK 的步驟**都可以跳過**（App 不需要 Firebase SDK）。
2. 左側 **App Distribution** → Get started → **Testers & Groups** 建立群組 `company-iphones`，加入同事 email。
3. 上傳 IPA：
   - 手動：App Distribution → Releases → 把 `ScamAware-iOS-v…-build….ipa` 拖進去 → 選群組 → Distribute。
   - 自動：在 Codemagic 建立 Firebase service account 變數，取消 `codemagic.yaml` 最後 `firebase:` 區塊的註解。

每支 iPhone（在 iPhone 上操作）：
1. 用 **Safari** 打開邀請信 → Accept invitation → 依指示安裝 App Distribution 的描述檔
   （第一次會同時把這支 iPhone 的 UDID 送到 Firebase → 你匯出後登記到 Apple Developer → 重建 IPA）。
2. 之後每次有新版，打開主畫面上的「App Tester」→ 點 ScamAware → Download。

## B. 公司自己的 HTTPS 網址（不經第三方）

適合：公司有可放檔案的 HTTPS 網站或檔案伺服器。

1. 在 Windows 產生安裝頁（只需要 Node.js）：
   ```bash
   node scripts/make-install-page.mjs dist/ios/1.0.0/ScamAware-iOS-v1.0.0-build12.ipa https://files.公司網域/scamaware-ios/1.0.0/
   ```
   會在 IPA 旁邊產生 `manifest.plist` 與 `install.html`。
2. 把 **IPA、manifest.plist、install.html** 三個檔案上傳到上面那個 HTTPS 資料夾。
   - 必須是 **HTTPS，且憑證是公開信任的**（Let's Encrypt 可以，自簽憑證不行）。
   - 伺服器最好把 `.ipa` 以 `application/octet-stream`、`.plist` 以 `text/xml` 送出。
   - 不要用需要登入的網址（SharePoint／Google Drive 分享連結通常不行，iOS 安裝程式拿不到檔案）。
3. 在 iPhone 用 **Safari** 開 `install.html` → 點「安裝」→ 確認 → 回主畫面看圖示下載。

## C. Windows 電腦 + 傳輸線

Apple 官方的「Apple 裝置」App／iTunes for Windows **不能**安裝 IPA。需使用第三方工具，例如
**iMazing**（商業軟體，有 Windows 版）：接上 iPhone → 選裝置 → 管理 App → 從檔案安裝 `.ipa`。
使用前請確認符合公司的軟體使用規範。IPA 一樣必須是 Ad Hoc 且包含這支 iPhone 的 UDID。

---

## 安裝後第一次開啟

1. 點「反詐AR體驗」。
2. 選語言 → 進入 AR 掃描畫面時，iOS 會問「要允許使用相機嗎？」→ 選**允許**。
   （選了不允許也還是可以按「手動選擇情境」；要改回來：設定 → 反詐AR體驗 → 相機。）
3. 把後鏡頭對準印出來的圖卡（[`docs/image-targets/`](image-targets/) 的 scenario1–5.png），
   畫面出現情境名稱後點按鈕進入。
4. 建議：展示前把 iPhone 的**音量調大**；靜音開關不影響 App 內影片聲音。

## 更新

重新安裝新版 IPA 即可（同一個 Bundle ID 會直接覆蓋，語言與場地設定會保留）。
本版**沒有**線上更新功能，也不會自己檢查新版。

## 到期

Ad Hoc 描述檔到期（最長 1 年，看 `BUILD_INFO.txt` 的 `expires`）後 App 會打不開。到期前重建並重裝。
