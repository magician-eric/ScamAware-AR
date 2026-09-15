# 開場動畫（App 啟動動畫）

App 啟動後的第一個畫面就是**首頁**，上面疊著一段開場動畫：

```text
啟動 App →（首頁 ＋ 開場動畫）→ 語言選擇 →（之後的流程完全沒有改變）
```

這裡以前是一支開場影片。影片已經整支移除，換成純 CSS 動畫 —— 為什麼、以及影片檔案
現在在哪裡，見最後一節。

## 檔案在哪裡

| 檔案 | 是什麼 |
| --- | --- |
| `webapp/src/pages/opening/OpeningHome.jsx` | index route（`/`）。把首頁與開場動畫組在同一個畫面上 |
| `webapp/src/pages/opening/OpeningSequence.jsx` | 動畫本體的 DOM 與兩個時間點 |
| `webapp/src/pages/opening/OpeningSequence.css` | 整段 timeline（keyframes）與三語字級 |
| `webapp/src/pages/opening/openingStaffExit.js` | 右上角連點三下跳過的工作人員手勢 |
| `webapp/scripts/opening-animation.test.mjs` | 上面四個檔案的契約測試（`npm run test:opening-animation`） |

沒有素材檔。動畫沒有任何要下載的東西 —— 沒有影片、圖片、字型、CDN，也沒有
Canvas／WebGL／Lottie／GSAP 之類的套件。

## 它疊在首頁上，不是另一個畫面

`OpeningHome` 從第一個 paint 就把真正的首頁（`LanguageSelect`）掛在底下，開場動畫是
疊在它上面的 overlay。**全程沒有換頁**，所以：

- 動畫第一幀的背景 ＝ 動畫最後一幀的背景 ＝ 首頁背景（同一個 `<img>` 元素）。
- 背景圖只載入一次、不會重新 decode，不會有黑屏、白屏、閃動或跳動。
- 結束時只是 overlay 淡出並 **unmount**（不是 `opacity: 0` 留在 DOM 上），底下的首頁 UI
  自然露出。overlay 存在期間 `pointer-events: auto`，首頁按鈕不會被誤觸。

首頁自己的介面（標題、三顆語言按鈕、工作人員入口）在動畫期間由 `is-booting` 這個
class 以 `opacity` 藏起來 —— 只有 `opacity`，不動版型，也**不碰背景圖**。

## 動畫概念

```text
SCAN → ASSEMBLE → LOCK → EXPAND → PROJECT → PULSE → REVEAL
```

先掃描空間，再由系統把中文組裝出來，AR 用力鎖定，畫面向外展開，英日文像 AR 資訊層被
投射進來，三語構圖停住讓人讀，一次系統脈衝把資訊層推開，中文最後定位，首頁揭露。

重點不是「文字進場、文字退場」，而是每一段都有**不同的機制**：中文不是飛進來而是被
校準，`詐騙體驗` 不是滑進來而是被掃描揭露，英日文不是從畫面外衝進來而是從景深被投射。

## Timeline（總長 7 秒）

時間變長不是把每個動作放慢 —— 單一動作仍然維持 200～600ms。變長的是**完成一個動作
之後的停留**：中文的閱讀時間，以及三語構圖的停留時間。

| 時間 | 階段 |
| --- | --- |
| 0.00–0.70s | **SCAN**：大型掃描光由上而下、細網格與座標軸浮現、四角 tracking 框與 data ticks 就位（**此時完全沒有文字**） |
| 0.70–1.15s | **ASSEMBLE**：`沉` `浸` `式` 三個字各自從自己的偏移位置**聚合校準**成一組（掃描完成之後才開始，中間沒有重疊） |
| 1.00–1.35s | **LOCK**：`AR` 1.6 → .92 → 1.045 → 1，四個小定位角收進 AR，切片錯位、掃描光橫過、兩道細線向左右爆開、一圈 ring 擴散 |
| 1.35–1.80s | **REVEAL**：`詐騙體驗` 由左而右被 `clip-path` 揭露，亮邊跟著揭露邊緣走 |
| 1.80–2.70s | **EXPAND**：中文完全靜止不動，四周的 grid／定位框／四角向外展開（深度位移），再一圈 ring |
| 2.60–3.30s | **PROJECT**：英文從右側景深被投射進來（`perspective` + `rotateY` + `scale`），掃描線經過後才完全亮起 |
| 2.72–3.42s | 日文從左側鏡像投射，比英文晚 120ms |
| 3.30–5.10s | **COMPOSITION**：三語完整構圖停留約 1.8 秒；中文完全不動，四周 HUD 持續緩慢運作，英日文極輕微向外 drift |
| 5.10–5.40s | **PULSE**：AR 亮起、兩圈 ring 由中央擴散、HUD 向外推、英日文被推開、中文 scale 1 → 1.025 → 1 |
| 5.25–6.20s | 英日文向左右**退回景深**（`rotateY` 轉開＋縮小），中文留下 |
| 5.90–6.35s | **FINAL LOCK**：四角快速收回原位，一條掃描線穿過完整中文 |
| 6.55s | **REVEAL**：首頁 UI 開始浮現（`OPENING_REVEAL_MS`） |
| 7.00s | overlay unmount（`OPENING_TOTAL_MS`） |

每一個會動的元素各跑**一條 7000ms 的 animation**，自己的時間點寫成 keyframe 百分比。
這件事看起來很怪，是刻意的：CSS animation 不會合成 `transform`，同一個元素掛兩條都寫
`transform` 的 animation 只有最後一條會生效 —— 拆成「投射、drift、被推開」三條寫，
投射那條就會消失。一條長的等於整段生命週期是一次插值，也讓 timeline 集中在一個地方
讀得完。同樣的理由，ring 是**四個元素**而不是一個重複用四次：一個元素沒辦法在四個不同
的時間點各擴散一次。

所有位移都是 `transform` / `opacity`，加上一處 `clip-path`（`詐騙體驗` 的揭露）與兩次
很短的 `filter: brightness` 閃光，所以動畫不會 reflow 或 repaint 底下那個真實、已排版
好的首頁。沒有任何 `width`／`height`／`top`／`left` 動畫，也沒有大面積 blur 或
box-shadow 動畫。

## 三語字級

中文永遠是第一視覺層級，英文與日文是大型 motion typography，不是角落小字：

| | 360×800 | 412×915 | 390×844 | 320×568 | 規格 |
| --- | --- | --- | --- | --- | --- |
| 中文 `沉浸式 AR` | 79% | 79% | 79% | 78% | 75–88% |
| 英文 `ANTI-FRAUD EXPERIENCE` | 82% | 82% | 82% | 75% | 70–85% |
| 日文 `没入型 AR 詐欺体験` | 74% | 74% | 74% | 67% | 65–80% |

（Chromium 直式實測，量的是文字本身的寬度佔畫面寬的比例。）

三個字級都是 `clamp(下限, min(vw, vh), 上限)`：`vw` 是手機真正吃到的那一項，`vh` 讓很矮的
視窗不會擠爆，上限是給 ≥768px 視窗用的（那裡 `.ar-stage` 是一個 430px 的直欄，只用 `vw`
會大好幾倍）。英文是**兩行**（`IMMERSIVE AR` ／ `ANTI-FRAUD EXPERIENCE`），不是縮成一行。

日文以 `lang="ja"` ＋ 日文優先的系統字型堆疊指定，`験`／`体` 不會退回到沒有該字的字型。
所有字型都是系統字型，沒有 Google Fonts 或任何外部 font CDN。

## 工作人員跳過手勢

**右上角連點三下，1.5 秒內**，開場立刻結束。畫面上沒有任何東西提到它 —— 沒有「跳過」、
沒有倒數、沒有提示，那個角落也不畫任何東西。細節與它為什麼是 `document.body` 上的
一塊 DOM（而不是畫面裡的一個 div）寫在 `openingStaffExit.js` 自己的註解裡。

跳過會「先露出首頁 UI、再 unmount overlay」，跟正常播完走的是同一條路。它**不會**碰到
背景正在跑的 OTA 更新。

## 這裡以前是一支影片

`webapp/public/media/intro/intro.mp4` ＋ `intro-poster.webp`，由 `pages/intro/IntroVideo.jsx`
播放，播完 navigate 到 `/language`。整支連同 poster、投放資料夾與所有播放邏輯
（autoplay／preload／muted／playsInline／啟動與播放中斷的 watchdog／播放失敗 fallback）
都已經刪除。

原因是那些卡頓沒有一項修得掉：它們全部發生在第一個 frame 之前 —— 要下載、要 decode、
autoplay 可以被拒絕，而且 Android WebView、iOS Safari 與 Desktop Chrome 開同一支檔案
所需的時間都不一樣。而「播完換頁」本身也是一次 re-mount，首頁背景圖會再 decode 一次。

**影片本身沒有消失。** 三份 bytes 都還在 git 裡，一行指令就能取回：

```bash
# 上傳進來的原始檔（1080×1920, 22,036,902 bytes）
git cat-file blob b762a1dee0e97eb915d741278d82a21bb5b34e9b > intro.original.mp4
# 裁掉浮水印後的母帶（1080×1836, 24,097,384 bytes）
git cat-file blob 2560229906c201daf8da4a5842c7069db827b79f > intro.1080.mp4
# App 最後播的那一支（720×1224, 8,593,483 bytes）
git show 70522af:webapp/public/media/intro/intro.mp4 > intro.mp4
```

完整的浮水印裁切量測、編碼參數與 iPhone 開場延遲的分析，留在 `docs/intro-video.md`
最後一次存在的那個 commit 裡（`git show 70522af:docs/intro-video.md`）。
