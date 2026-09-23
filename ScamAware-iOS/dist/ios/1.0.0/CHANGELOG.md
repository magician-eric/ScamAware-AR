# ScamAware-iOS 版本變更

## 1.0.0（首版，尚未建置）

iOS 版本號獨立於 Android（Android Shell 1.2.0／Web Bundle 1.7.6），從 1.0.0 開始。

內容來源：ScamAware-AR `webapp/`，commit `817df36`（Web Bundle 1.7.6）。

新增
- 獨立的 iPhone App（Bundle ID `com.bigxreality.scamaware.ios`），Ad Hoc 發佈，不上架。
- 以 iPhone 後鏡頭做 MindAR 圖卡辨識，辨識後點按進入情境。
- 五個反詐情境、中／英／日三語、影片、音訊、測驗與分析，全部素材內建、可離線使用。
- 相機、定位權限說明提供中／英／日三語。
- 影片與語音在靜音開關打開時仍會播放；情境進行中螢幕不會自動鎖定。
- 工作人員設定頁的「系統版本」改為顯示 iOS App 版本與建置號。

移除（相對 Android 版）
- 佐臻 JJSDK、眼鏡連線、眼鏡相機串流、ToF、手勢辨識、手勢教學、掃描診斷面板。
- Android OTA 線上更新與其面板；iOS 版一律以重新安裝完整 App 更新。

變更
- 閒置提示從「請向右揮手」改為「請點選畫面上的按鈕」（三語）。
- 選完語言直接進入 AR 掃描（原本會先經過手勢教學）。
