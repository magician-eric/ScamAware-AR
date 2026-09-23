# ScamAware-iOS 1.0.0 — 安裝說明

> **目前這個資料夾裡還沒有 IPA。** 雲端建置需要 Apple Developer 帳號與 Codemagic 設定
> （見 `docs/NEEDED_FROM_YOU.md`）。建置完成後，這裡會多出
> `ScamAware-iOS-v1.0.0-build<N>.ipa`、`SHA256SUMS.txt`、`BUILD_INFO.txt`。
> 沒有 `BUILD_INFO.txt` 的 IPA 不是本流程產出的，請勿使用。

## 誰可以安裝

只有 UDID 已登記、且在該次建置**之前**就登記的公司 iPhone（iOS 15 以上）。
`BUILD_INFO.txt` 的 `devices:` 是這個 IPA 可安裝的裝置數，`expires:` 是到期日。

## 安裝（不需要 Mac）

任選一種，詳細步驟見 `docs/INSTALL_WINDOWS_IPHONE.md`：

1. **Firebase App Distribution**：iPhone 用 Safari 打開邀請信 → 在「App Tester」點 Download。
2. **公司 HTTPS 網址**：Windows 執行
   `node scripts/make-install-page.mjs dist/ios/1.0.0/ScamAware-iOS-v1.0.0-build<N>.ipa https://<公司網址>/scamaware-ios/1.0.0/`，
   把 IPA、`manifest.plist`、`install.html` 上傳到該 HTTPS 資料夾，iPhone 用 Safari 開 `install.html` 點「安裝」。
3. **Windows + 傳輸線**：用 iMazing 等工具安裝 `.ipa`（Apple 裝置 App／iTunes 不能裝 IPA）。

安裝前可用 PowerShell 核對檔案：`Get-FileHash .\ScamAware-iOS-v1.0.0-build<N>.ipa -Algorithm SHA256`，
與 `SHA256SUMS.txt` 比對。

## 第一次使用

1. 開啟「反詐AR體驗」→ 選語言。
2. 出現相機權限提示時選「允許」。
3. 後鏡頭對準印出的圖卡（`docs/image-targets/scenario1–5.png`）→ 出現情境名稱後點按鈕進入。
   不用圖卡也可以點「手動選擇情境」。
4. 工作人員設定：語言頁右上角齒輪（可設定場地所在縣市；不設定則使用預設值）。

## 更新與移除

- 更新：安裝新版 IPA 直接覆蓋，設定保留。本版沒有線上更新。
- 移除：長按圖示 → 移除 App。
