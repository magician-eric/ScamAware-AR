# Scenario 02 — 影片自動播放修正／LINE 幣勝客網頁預覽卡

本目錄為該次 PR 當下的畫面存檔，**不是現行規格的畫面基準**（同 `../README.md` 說明）。

## 影片自動播放（before / after）

`before-video-1.png`、`before-video-2.png`
：修正前，第一／第二支影片停在 `currentTime = 0`，畫面中央出現「繼續播放／略過影片並繼續」。這就是回報的「播放按鈕」。

`after-video-1.png`、`after-video-2.png`、`after-video-3.png`
：修正後，三支影片一律自動播放（截圖時間點 `currentTime ≈ 2.6–2.9s`），overlay 內按鈕數為 0。

### 這幾張截圖的拍攝條件（重要）

拍攝用的容器只有 Playwright 的開源 Chromium，**無 H.264／AAC 解碼器**（實測 `DEMUXER_ERROR_NO_SUPPORTED_STREAMS`），Google Chrome 也因 proxy 封鎖 `dl.google.com` 無法安裝。因此截圖是在下列兩項替換下拍攝的，元件本身未經任何修改：

1. `<video class="line-video-overlay-el">` 改餵一段 canvas capture stream（含真實 audio track），所以畫面中的漸層與 `t = x.xs` 是**測試替身影格**，不是 {datingLead} 的真實影片；
2. `muted` setter 模擬 Chrome／WebKit 實際行為：沒有 user activation 時把元素 unmute 就 `pause()`。此處**無條件**觸發，等於瀏覽器政策的最壞情況。

實機（Android WebView／Chrome／Safari）播放的是原始 mp4，不需要任何替換。

## LINE 網頁預覽卡

`line-coin-winner-website-card.png`
：{datingLead} 在 LINE 傳出幣勝客連結時的網址預覽卡（特色圖片＋標題＋description＋假網域 `bition-invest.tw`），下方為 CIBAR 既有的主要 CTA `.btn`。
