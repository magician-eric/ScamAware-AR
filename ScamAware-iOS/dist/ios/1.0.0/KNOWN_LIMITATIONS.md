# ScamAware-iOS 1.0.0 — 已知限制

## 尚未驗證（誠實標示）

- **沒有在任何 iPhone 上執行過。** 所有 iPhone 實機項目都還沒測（清單見 `docs/VERIFICATION.md`）。
- **Swift 原生程式尚未被編譯過**（開發環境沒有 Xcode）。第一次 Codemagic `ios-compile-check` 可能需要小修。
- 影片播放只確認了檔案格式（H.264 + AAC），沒有在 iOS 上實際播放過。
- `app://` 自訂 scheme 下的相機（getUserMedia）是依照 Capacitor 同樣做法設計，需在 iOS 15+ 實機確認。

## 設計上的限制

- **只能安裝在已登記 UDID 的 iPhone**（Ad Hoc），每年每類裝置最多 100 台。新增 iPhone 要重建 IPA。
- **有效期限**：Ad Hoc 描述檔／憑證最長約 1 年，到期後 App 無法開啟，需重建重裝。
- **沒有線上更新**：新內容一律重新安裝 IPA。App 也不會提示有新版。
- 只支援 iPhone、直向、iOS 15 以上。iPad 可能以相容模式執行，但未設計也未測試。
- **內容不會自動與 Android 版同步**：這是 `817df36` 的快照，Android 之後的修改要手動移植（`docs/PORTING_NOTES.md`）。
- 辨識需要印出的圖卡（`docs/image-targets/`）；螢幕翻拍、反光、太小或光線不足會降低辨識率。
  辨識效能取決於機型，較舊的 iPhone 可能較慢。
- 工作人員頁的定位功能會有 iOS 與網頁各一次的權限詢問；沒有網路時請用手動選擇縣市。
- 情境中的假網站、假連結是劇情的一部分，App 內**刻意無法**打開任何外部網頁。
- App 圖示沿用原專案圖檔，原圖自帶圓角，iOS 再套一次圓角後邊緣會略有內縮。
- 原專案的自動化測試（`webapp/scripts/`）未一起移植；iOS 版改用 `scripts/check-ios-port.mjs` 與瀏覽器煙霧測試。
