# Asset Localization Audit（素材語系稽核）

`validate-i18n` 已經保證**字串**不會只翻一種語言就矇混過去。這份文件處理的是
另外半邊：**素材本身**。

一支對著鏡頭講話的影片、一張把文案畫死在畫面裡的圖、一段錄好的語音 —— 它們的
「內容」就是語言。React UI 全部翻成英文，玩家還是會聽到中文、看到中文。

> 判準：**玩家選 EN 之後，從進入情境到結束，畫面上與聲音裡不該再出現中文。**
> UI 字串只是其中一項。

> **後續變更（開場動畫改版）：** 這份稽核寫成時，開場是一支影片，並以
> `shared/intro-film` 這個 `languageNeutral` family 註冊在 gate 裡。開場後來改成
> 純 CSS 動畫（見 [`opening-animation.md`](opening-animation.md)），影片與
> `src/pages/intro/introAssets.js` 一併刪除，該 family 也從
> `validate-localized-assets.mjs` 移除 —— 沒有素材，就沒有素材語系可稽核。
> 下面出現 `intro.mp4` 的段落都是當時的紀錄，不是現況。其餘每一個 family 都不受影響。

---

## 1. 這次的起因：Scenario 02 英文版播中文影片

### Root cause

`webapp/src/pages/scenario02/PrivateChat.jsx`（修正前）：

```js
const VIDEO_SRC = {
  v1: getVisualAssetUrl('dating_visual_03', 'videos', 0),
  v2: getVisualAssetUrl('dating_visual_03', 'videos', 1),
  v3: getVisualAssetUrl('dating_visual_03', 'videos', 2),
};
```

三個問題疊在一起：

1. **`VIDEO_SRC` 是 module-level 常數。** 它在 `import` 當下就算完了 ——
   比玩家選語言還早。之後不管 localStorage 裡是 `en` 還是 `jp`，這張表都不會再
   重算一次。
2. **`getVisualAssetUrl()` 根本沒有 `lang` 參數。** 它的簽章是
   `(visualId, asset, index)`。語系這個維度在 API 上就不存在，所以呼叫端不可能
   傳、也不可能發現自己漏傳。
3. **Shared Character Registry 只存了一種語言。**
   `src/experience/characters/visuals.js` 裡 `dating_visual_03` 的
   `assets.videos` 是一個扁平陣列，只有中文版三支檔案。**en / jp 的錄影從來就
   不存在於這個 repo。**

所以這不是「fallback 回中文」，而是**從頭到尾只有中文這一條路**。沒有任何一行
程式碼有能力表達「這支是中文版在頂替」。這也是為什麼它不會被任何既有檢查抓到 ——
每個檔案都存在、每條路徑都解析得到、每個 UI 字串都是英文。**只有真的把影片播出來
才看得出問題。**

### 同一支影片被引用兩次

`visuals.js` 的 `dating_visual_03` 同時把同一組檔案掛在 `videos` 和
`mediaPreviews` 兩個 key 上（聊天室縮圖走 `mediaPreviews`，全螢幕播放走
`videos`）。修正前兩邊都是硬寫死的中文檔，所以縮圖與播放內容一致地錯。修正後
兩邊共用同一張 locale table，不會出現「縮圖對了、播放沒對」的半修好狀態。

---

## 2. Scenario 02 影片實際 mapping

Scenario 02 全情境**只有這三支影片**，全部由 `{datingLead}`（`dating_visual_03`）
在 LINE 私訊裡傳出，並由 `PrivateChat.jsx` 的 `VideoOverlay` 播放。已逐一確認過
沒有第四支：沒有轉場影片、沒有投資平台影片、沒有結局影片，其餘畫面都是 React
算出來的 DOM。

| Beat | 對話節點 | videoId | 語系 | 實際檔案 |
| --- | --- | --- | --- | --- |
| Scenario 02 video 01（Day 2） | `day2-video` | `v1` | zh-TW | `assets/shared/characters/dating_visual_03/video-010.mp4` |
| | | | en | **不存在** → 目前退回 `video-010.mp4`（中文版） |
| | | | ja | **不存在** → 目前退回 `video-010.mp4`（中文版） |
| Scenario 02 video 02（Day 4） | `day4-video` | `v2` | zh-TW | `assets/shared/characters/dating_visual_03/video-020.mp4` |
| | | | en | **不存在** → 目前退回 `video-020.mp4`（中文版） |
| | | | ja | **不存在** → 目前退回 `video-020.mp4`（中文版） |
| Scenario 02 video 03（Day 5） | `day5-video` | `v3` | zh-TW | `assets/shared/characters/dating_visual_03/video-030.mp4` |
| | | | en | **不存在** → 目前退回 `video-030.mp4`（中文版） |
| | | | ja | **不存在** → 目前退回 `video-030.mp4`（中文版） |

三支都是 480×854、H.264 / AAC，12–15 秒，AI 生成的自拍講話影片。
**畫面裡沒有任何燒死的字幕或文字** —— 語系問題完全出在「她講的是中文」。
所以能修的只有 source selection，內容本身必須重錄。

---

## 3. 這次改了什麼

### 改了 wiring（可以修的部分）

`visuals.js` 的錄影類素材改成 locale table，形狀對齊 repo 既有的
`SCENARIO03_AUDIO_FILES`：

```js
const DV3_VIDEOS = {
  zh: [dv3('video-010.mp4'), dv3('video-020.mp4'), dv3('video-030.mp4')],
  en: [],   // 尚未錄製 —— 這是宣告，不是遺漏
  jp: [],
};
```

`en` / `jp` 留空是刻意的。**不可以在這裡填一個磁碟上不存在的檔名** ——
`validate-asset-ownership` RULE 1 就是在擋這件事。

新的解析函式回傳的不是裸 URL：

```js
getVisualVideo(visualId, index, lang)
// → { url, path, resolvedLang, localized }
```

`localized: false` 就是「這支是中文版在頂替」這句話在程式裡的說法。舊 API
`getVisualAssetUrl()` 現在對錄影類素材一律回傳空字串，任何人都不可能再從那扇門
拿到一支「不知道是什麼語言」的影片。

`PrivateChat.jsx` 改成跟對話樹同一個節奏重算：

```js
const nodes        = useMemo(() => buildNodes(lang), [lang]);
const videoSources = useMemo(() => buildVideoSources(lang), [lang]);
```

### 沒有改的部分（照要求）

- **沒有生成任何影片。**
- **沒有改劇情。** 對話樹、節點、選項、時間軸全部原封不動。
- **沒有重寫 video player。** `VideoOverlay` 的 muted-first autoplay、
  `enableSound()`、stall/error 復原、AR 手勢契約全部沒動。改的只有餵給它的
  `src` 從哪裡來。

### 關於「不得 default 回中文版」

要求是「不要**偷偷**讓英文／日文繼續播放中文版」。這裡有一個硬衝突：影片是劇情
節拍，`VideoOverlay` 的 `onFinished` 會推進對話；讓 en/ja 直接失敗會把情境走不
下去，而那等於改劇情。

所以採取的是**「宣告式頂替」**而不是靜默 fallback：

| | 修正前 | 修正後 |
| --- | --- | --- |
| en/ja 播到什麼 | 中文版 | 中文版（暫時） |
| 程式知不知道 | 不知道 —— 沒有這個概念 | 知道 —— `localized: false` |
| 有沒有被記錄 | 沒有 | 有 —— registry 宣告 + validator 列出 |
| 素材到位後要改幾行 | 不明 | 0 行（把檔案填進 `en: []` 即可） |

**這只是把問題變得可見、可追蹤，不等於問題解決了。** 真正修好要等 en/ja 錄影
產出，見 §5 缺件清單。

### 3.1 validator 的三個補強（本次）

**(a) 所有 locale pair 都要互相比較。** 原本的 pass 2 只把 `en`／`jp` 各自跟
`zh` 比，於是「**en 與 jp 同時指向同一個非中文檔案**」在兩邊都被算成 PASS ——
一支貼錯槽的英文錄音放進日文位置，validator 看不出來。這是 Codex 在 PR #379
上指出的漏洞。現在比的是 zh↔en、zh↔jp、**en↔jp** 三組全部。

判斷邏輯抽成純函式 `checkLocaleTable()`（`scripts/localized-asset-rules.mjs`），
因為值得測的形狀正好是這個 repo 目前不存在的那些。regression test 在
`scripts/validate-localized-assets.test.mjs`：

| Case | 情況 | 期望 |
| --- | --- | --- |
| A | zh / en / jp 各自不同檔案 | PASS |
| B | zh 與 en 共用同一 localized asset | FAIL |
| C | zh 與 jp 共用同一 localized asset | FAIL |
| **D** | **en 與 jp 共用同一個非中文 localized asset** | **FAIL** |
| E | 真正 language-neutral 的共用素材 | PASS |

Case D 另外附一個測試，把**舊規則重新實作一遍**，證明舊規則確實會放行這個形狀、
而新規則會擋下來 —— 回歸測試釘的是實際行為，不是對行為的描述。

**(b) language-neutral family。** 「刻意共用」與「沒人看過」在程式上本來沒有
差別。現在可以宣告 `languageNeutral: true`：契約反過來 —— 三語**必須**是同一個
檔案，某個語系偷偷長出自己的變體反而是 FAIL。`intro.mp4` 就是這樣註冊的。

**(c) bundler import 的素材也納管。** GuGo Invest 的三語 wordmark 是用
`import logoZh from './logo-zh.webp'` 進來的，build 後才有 hash URL，沒有
runtime table 可讀 —— 所以它一直在這道 gate 之外。新增 `files` + `pinnedIn`
兩個 family 欄位：靜態宣告 repo 相對路徑，並要求指定的模組原始碼確實引用到每個
檔名，宣告因此不可能跟程式漂開。

### 新增的守門機制

`npm run validate:localized-assets`（已掛進 `prebuild`）：

```
Localized asset coverage
  scenario01/teacher-pitch-video  zh PASS(1)    en PASS(1)     jp PASS(1)     Coach Chen's pitch video
  scenario02/dating-lead-clips    zh PASS(3)    en MISSING(0)  jp MISSING(0)  {datingLead}'s three selfie clips
  shared/ar-scan-hero             zh PASS(1)    en PASS(1)     jp PASS(1)     AR scan home artwork
  shared/intro-film               zh SHARED(1)  en SHARED(1)   jp SHARED(1)   Opening film (language-neutral)
  gugo-invest/wordmark            zh PASS(1)    en PASS(1)     jp PASS(1)     GuGo Invest wordmark
  scenario03/call-recordings      zh PASS(21)   en PASS(21)    jp PASS(21)    Fake police / prosecutor call recordings
```

它會 **fail** 的情況：

- 某個語系指到磁碟上不存在的檔案
- **任兩個語系共用同一個檔案** —— zh↔en、zh↔jp、**en↔jp** 全部都比
- 某個語系檔案數量跟 zh 對不上
- `zh` 自己沒有檔案（其他語系都是拿它當基準數的）
- 用了 `ja` 而不是內部代碼 `jp`
- 宣告成缺件、實際上卻有檔案（提醒把宣告拿掉）
- language-neutral family 裡某個語系長出自己的變體
- `pinnedIn` 指定的模組沒有引用到宣告的檔名

缺件本身是**報告**不是 fail —— 那是待製作的素材，把 build 擋掉只會逼人刪掉宣告。

---

## 4. Asset Localization Audit 總表（五情境 × 三語）

問題分成三類。**這是這份表最重要的一件事** —— 「Claude Code 可以修的」與
「Eric 要另外做素材的」不可以混在一起：

| 類別 | 意思 | 誰處理 |
| --- | --- | --- |
| **PASS** | 程式與素材都正確 | 無 |
| **CODE BUG** | 素材存在，但程式引用錯誤／語言 mapping 錯誤 | Claude Code |
| **MISSING ASSET** | 程式 mapping 已正確，repo 裡沒有該語言的實體素材 | **Eric（要做圖／影片／錄音）** |

`text-bearing` = 素材裡有燒死的中文句子。純品牌標記（`刑警` 臂章、`MeetU｜覓友`
這種固定 lockup）不算，理由見 §6。

### 4.1 CODE BUG（本次全部修完）

| # | 項目 | 狀態 |
| --- | --- | --- |
| 1 | Scenario 02 三支影片以 module-level 常數解析，語系被丟掉 | **已修**（§1、§3） |
| 2 | `getVisualAssetUrl()` 對錄影類素材沒有 `lang` 維度 | **已修** —— 錄影類一律走 `getVisualVideo()` |
| 3 | 縮圖（`mediaPreviews`）與播放（`videos`）各自寫死，可能半修好 | **已修** —— 兩邊共用同一張 locale table |
| 4 | validator 只比 en↔zh、jp↔zh，**沒有比 en↔jp** | **已修**（§3.1，Codex 回報） |
| 5 | GuGo Invest 三語 wordmark 完全不在 validator 管轄內 | **已修** —— 新增 `gugo-invest/wordmark` family |
| 6 | `intro.mp4` 是刻意共用還是沒人看過，程式上沒有差別 | **已修** —— 宣告為 `languageNeutral` family |

**目前沒有已知未修的 CODE BUG。**

### 4.2 逐情境 × 逐語系

`—` = 該情境沒有這類素材。

```
                              zh-TW          en                     ja/jp
Scenario 01
  UI text / dialogue / 按鈕    PASS           PASS                   PASS
  角色名 / 機關名 / 縣市名      PASS           PASS                   PASS
  Quiz / Outcome / 疑點分析     PASS           PASS                   PASS
  Video（投資老師）            PASS           PASS                   PASS
  Audio                       —              —                      —
  Text-bearing images         PASS           MISSING ASSET (×2)     MISSING ASSET (×2)
  Ending artwork              PASS           PASS（語系中立）         PASS（語系中立）

Scenario 02
  UI text / dialogue / 按鈕    PASS           PASS                   PASS
  角色名 / 地點 / 職業 / 自介   PASS           PASS                   PASS
  Quiz / Outcome / 疑點分析     PASS           PASS                   PASS
  Video（{datingLead} ×3）     PASS           MISSING ASSET (×3)     MISSING ASSET (×3)
  Audio                       —              —                      —
  Text-bearing images         PASS           MISSING ASSET (×1)     MISSING ASSET (×1)
  Ending artwork              PASS           MISSING ASSET (×1)     MISSING ASSET (×1)

Scenario 03
  UI text / dialogue / 按鈕    PASS           PASS                   PASS
  警察局 / 分局 / 派出所        PASS           PASS                   PASS
  地檢署 / 法院 / 縣市 / 行政區  PASS           PASS                   PASS
  人名 / 職稱 / 公文           PASS           PASS                   PASS
  Quiz / Outcome / 疑點分析     PASS           PASS                   PASS
  Video                       —              —                      —
  Audio（21 段）               PASS           PASS                   PASS
  Text-bearing images         PASS           —                      —
  Ending artwork              PASS           MISSING ASSET (×2)     MISSING ASSET (×2)

Scenario 04
  UI text / dialogue / 按鈕    PASS           PASS                   PASS
  商品名 / 訂單 / 物流 / 客服   PASS           PASS                   PASS
  Quiz / Outcome / 疑點分析     PASS           PASS                   PASS
  Video                       —              —                      —
  Audio                       —              —                      —
  商品照 ×25                   PASS           PASS（語系中立）         PASS（語系中立）
  Ending artwork              PASS           MISSING ASSET (×2)     MISSING ASSET (×2)

Scenario 05
  UI text / dialogue / 按鈕    PASS           PASS                   PASS
  商品 / 買家 / 銀行 / 錯誤碼   PASS           PASS                   PASS
  Quiz / Outcome / 疑點分析     PASS           PASS                   PASS
  Video                       —              —                      —
  Audio                       —              —                      —
  Ending artwork              PASS           MISSING ASSET (×2)     MISSING ASSET (×2)

共用
  AR scan hero                PASS           PASS                   PASS
  GuGo Invest wordmark        PASS           PASS                   PASS
  intro.mp4                   SHARED（語系中立，已宣告）
  語言選擇 / 情境選單 / 手勢教學  PASS           PASS                   PASS
```

**Scenario 02 影片這一格必須看清楚：**

```
Scenario 02 zh：完整（3 支）
Scenario 02 en：3 recorded clips MISSING
Scenario 02 jp：3 recorded clips MISSING
```

英日目前播放的是中文版影片。**那不算 EN／JP localization PASS** ——
它是一個被宣告、被驗證、被列在缺件清單上的頂替（`localized: false`），
不是覆蓋率。沒有複製中文影片改檔名，也沒有在 registry 裡填任何不存在的路徑。

### 4.3 UI 文字這一塊為什麼全部 PASS

上表 UI text／dialogue／按鈕／機關名／人名／Quiz／Outcome 的 PASS 不是這份文件
自己宣稱的，而是由另外四道 build gate 保證的（`localization-audit.md` §3）：

| Gate | 保證 |
| --- | --- |
| `validate-i18n.mjs` | 每個字典的三語 key 覆蓋率與一致性 |
| `localization-coverage.test.mjs` | 所有字典沒有任何 entry 是錯的語言 |
| `location-localization.test.mjs` | 22 縣市／357 行政區／149 分局／1,328 派出所 三語齊全 |
| `dynamic-localization.test.mjs` | 每一類 runtime 產生的資料 × 三語 |

素材這一塊則由本文件的 `validate-localized-assets.mjs` 把關。兩者互補：
**字串走字典，檔案走 family table。**

---

## 5. MISSING ASSET 清單 —— 需要 Eric 另外製作

以下素材 repo 內**確實不存在**。程式端的 mapping 全部已經就緒，**沒有任何一項
在等 Claude Code**；未自行生成，也未複製中文檔改名冒充。

合計 **6 支影片 ＋ 11 張圖**（其中 7 張是結局畫面）。

### 5.1 影片（最高優先）

```
Missing localized asset
Scenario: 02
Step:     Day 2 / day2-video / videoId v1
Current zh-TW file: webapp/public/assets/shared/characters/dating_visual_03/video-010.mp4
Missing en:  webapp/public/assets/shared/characters/dating_visual_03/<en 錄影>
Missing ja:  webapp/public/assets/shared/characters/dating_visual_03/<jp 錄影>

Missing localized asset
Scenario: 02
Step:     Day 4 / day4-video / videoId v2
Current zh-TW file: webapp/public/assets/shared/characters/dating_visual_03/video-020.mp4
Missing en:  webapp/public/assets/shared/characters/dating_visual_03/<en 錄影>
Missing ja:  webapp/public/assets/shared/characters/dating_visual_03/<jp 錄影>

Missing localized asset
Scenario: 02
Step:     Day 5 / day5-video / videoId v3
Current zh-TW file: webapp/public/assets/shared/characters/dating_visual_03/video-030.mp4
Missing en:  webapp/public/assets/shared/characters/dating_visual_03/<en 錄影>
Missing ja:  webapp/public/assets/shared/characters/dating_visual_03/<jp 錄影>
```

規格：480×854 直式、H.264 + AAC、12–15 秒、同一位角色、口說內容對應原本中文台詞。
檔名不必跟中文版對稱 —— registry 是查表，不是加後綴推導（Scenario 01 的三語檔名
本來就完全不對稱）。

**素材到位後怎麼接：** 把檔案放進 `dating_visual_03/`，然後在 `visuals.js` 把
`en: []` / `jp: []` 填成三個路徑，並移除 `validate-localized-assets.mjs` 裡
`scenario02/dating-lead-clips` 的 `gaps` 宣告。**不需要改任何元件。**

### 5.2 含中文的圖片素材

| Scenario | 檔案 | 內容 | 出現位置 |
| --- | --- | --- | --- |
| 01 | `src/assets/scenarios/scenario-01/images/fb-ad-creative.webp` | 「AI 智能投資／穩定獲利／財富自由／專業團隊・精準預測・穩定獲利／AI 精準選股／風險嚴格控管／穩定高報酬」 | 假 FB 廣告貼文 `Feed.jsx` |
| 01 | `public/assets/shared/characters/scenario01_stock_rookie/avatar.webp` | 背景「股海小白」 | VIP 群組頭像 |
| 01 | `public/assets/scenarios/scenario-01/videos/teacher-en-*.mp4`、`teacher-jp-*.mp4` | 背景股市牆整面繁中（指數資訊／上市類股漲跌排行／半導體／加權指數(TWSE) 日線…） | 影片背景，非可換素材 |
| 02 | `public/assets/scenarios/scenario-02/images/chat/photo-villa-booking-paid.webp` | 整張中文訂房確認截圖（訂單已確認／付款成功！預訂已確認／宜蘭 隱沐山景玻璃Villa／雙人房／總金額 TWD 10,800／查看預訂資訊…） | LINE 聊天自動開啟的 lightbox |
| 02 | `public/assets/scenarios/scenario-02/images/results/cib-bear-romance-stopped.webp` | 「我想和你共創未來／再加碼一筆，就能一起出金／不要再加碼／驗證對方身分／別讓感情影響判斷」 | 結局畫面 |
| 03 | `public/assets/scenarios/scenario-03/images/results/cib-bear-authority-scammed.webp` | 「臺灣地方法院 檢察署／偵查中案件／偽造／監管帳戶／涉入司法案件／配合調查／資金監管」 | 結局畫面 |
| 03 | `public/assets/scenarios/scenario-03/images/results/cib-bear-authority-verified.webp` | 「先查證・再行動！／檢警不會要求轉帳，也沒有安全帳戶／165 反詐騙專線／掛斷電話／自己查官方電話／165 / 110 查證」 | 結局畫面 |
| 04 | `public/assets/scenarios/scenario-04/images/results/cib-bear-package-scammed.webp` | 「商品有問題！／每台都有保固！／是物流問題啦～／退貨要先付手續費／私下交易無保障！／高風險／異常狀況…」 | 結局畫面 |
| 04 | `public/assets/scenarios/scenario-04/images/results/cib-bear-package-stopped.webp` | 「成功止損！／不私下協商，回到平台正式機制！／都是騙局！／拒絕詐騙／保留證據／聯繫官方／使用平台檢舉」 | 結局畫面 |
| 05 | `public/assets/scenarios/scenario-05/images/results/cib-bear-order-blocked.webp` | 「詐騙成立！／驗證是假的，轉帳是真的！／成功攔截！／正確做法／防詐核心記憶點／銀行或平台客服不會要求你…」 | 結局畫面 |
| 05 | `public/assets/scenarios/scenario-05/images/results/cib-bear-order-scammed.webp` | 「幽靈訂單？／小心！可能是騙局！／賣家手法／我是平台客服／請點擊連結／加入 LINE」 | 結局畫面 |

其中**結局畫面（7 張）影響最大** —— 那是每個情境的收尾教學，等於把整份反詐重點
用中文圖片交給一個英文玩家。

`photo-villa-booking-paid.webp` 是典型的「截圖型素材」污染：它會被
`useAutoMediaPreview` 自動放大 6 秒，玩家想不看都不行。

---

## 6. 判定為「不需要語系切換」的素材（以及理由）

| 素材 | 判定 | 理由 |
| --- | --- | --- |
| Scenario 04 商品照 ×25 | 語系中立 | 純商品攝影，無任何文字 |
| `scenario-0N/images/entry-hero.webp` ×5 | 語系中立 | 純吉祥物插畫，無文字 |
| `cib-bear-scammed` / `cib-bear-stopped`（S01） | 語系中立 | 只有「刑警」臂章與 POLICE 車身，無句子 |
| `cib-bear-romance-scammed`（S02） | 語系中立 | 同上 |
| 角色頭像（`stock_rookie` 除外） | 語系中立 | 人臉照片 |
| `MeetU｜覓友`、`MyDonDon 買東東`、`HPE 黑皮通`、`BITION 幣勝客` logo | **設計決定，不翻譯** | 品牌名在任何語系都不翻，manifest 與規格 §47 已明文寫死。等同於「Rakuten 楽天」在英文介面保留日文 |
| `scenario-menu-background.webp` | 語系中立 | 刑事警察局徽記本身已是中英雙語 |
| `media/intro/intro.mp4` | **語系中立（已在 gate 內宣告）** | 40 秒吉祥物動畫，無口白、無中文句子。註冊為 `shared/intro-film` 的 `languageNeutral` family，所以「刻意共用」與「沒人看過」不再是同一個狀態 |
| AR image targets `scenario1–5.png` | 不適用 | 是印出來給人掃的實體圖卡，不是 App 內畫面 |
| Scenario 01 en/jp 影片的背景股市牆 | **無法修，需重拍** | 中文燒死在畫面裡；換素材＝重新拍攝，不是 wiring 問題 |

---

## 7. Runtime 驗證

在 headless Chromium（430×932）中，實際載入 build 產物、實際切換語系、實際走進
`/scenario02-romance/private-chat`，用聊天室自己的 checkpoint 機制
（`savePrivateChatCheckpoint` / `takePrivateChatCheckpoint` —— 情境從投資平台回來
時走的同一扇門）直接進到三個影片節拍，記錄 `<video>` 元素**實際掛上的
`currentSrc`**、實際發出的網路請求，以及 autoplay 相關屬性。

| lang | beat | overlay `currentSrc` | 縮圖 `currentSrc` | 網路實際抓取 | muted | autoplay | playsInline | 原生控制列 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| zh | v1 | `…/video-010.mp4` | `…/video-010.mp4` | `…/video-010.mp4` | true | true | true | false |
| zh | v2 | `…/video-020.mp4` | `…/video-020.mp4` | `…/video-020.mp4` | true | true | true | false |
| zh | v3 | `…/video-030.mp4` | `…/video-030.mp4` | `…/video-030.mp4` | true | true | true | false |
| en | v1 | `…/video-010.mp4` | `…/video-010.mp4` | `…/video-010.mp4` | true | true | true | false |
| en | v2 | `…/video-020.mp4` | `…/video-020.mp4` | `…/video-020.mp4` | true | true | true | false |
| en | v3 | `…/video-030.mp4` | `…/video-030.mp4` | `…/video-030.mp4` | true | true | true | false |
| jp | v1 | `…/video-010.mp4` | `…/video-010.mp4` | `…/video-010.mp4` | true | true | true | false |
| jp | v2 | `…/video-020.mp4` | `…/video-020.mp4` | `…/video-020.mp4` | true | true | true | false |
| jp | v3 | `…/video-030.mp4` | `…/video-030.mp4` | `…/video-030.mp4` | true | true | true | false |

**三個語系仍然指向同一批檔案** —— 因為 en/ja 錄影不存在，這正是預期結果，也正是
§5 缺件清單存在的原因。差別在於現在這件事是被宣告、被驗證、被列出來的，而不是
沒有人知道。

**驗證環境限制（必須說明）：** 這個環境的 Playwright Chromium build **不含
H.264/AAC 解碼器**（`canPlayType('video/mp4; codecs="avc1.42E01E"')` 回傳空字串），
所以 `<video>` 元素會正確掛載、正確送出 206 range request，但無法解出畫面 ——
`playing` 因此為 false。這是驗證瀏覽器的限制，不是 App 的問題：

- 三支檔案本身已用 ffmpeg 驗過是合法 H.264/AAC，且有實際語音（mean volume 約 −26 dB）
- Android / iOS / desktop 的正式瀏覽器都支援 H.264

**已解碼播放這一段沒有在瀏覽器裡實測到**，需要在有 H.264 的裝置上補做。

---

## 8. 待辦（依影響排序）

### 需要 Eric 製作素材（Claude Code 無法代勞）

1. **Scenario 02 的 en / ja 影片**（3 支 × 2 語系 = **6 支**）。這是原始回報的
   問題；wiring 已就緒，素材放進 `dating_visual_03/`、把 `visuals.js` 的
   `en: []` / `jp: []` 填上、移除 validator 的 `gaps` 宣告即可，**元件一行都不用改**。
2. **7 張結局圖的 en / ja 版本**（S02 stopped ×1、S03 ×2、S04 ×2、S05 ×2）。
   每個情境的收尾教學目前對英日玩家完全失效 —— 影響最大的一項。
3. **`photo-villa-booking-paid.webp` 的 en / ja 版本。** 會被
   `useAutoMediaPreview` 自動放大 6 秒的中文截圖，玩家想不看都不行。
4. **`fb-ad-creative.webp` 的 en / ja 版本。** Scenario 01 的第一個畫面。
5. **`scenario01_stock_rookie/avatar.webp`** 去掉或翻譯背景的「股海小白」。
6. **Scenario 01 en/jp 影片背景的股市牆是中文** —— 燒在畫面裡，需重拍。
   成本最高、可見度最低，可排最後。

### 程式面（已完成，僅供日後參考）

7. 每新增一個 locale table，記得加進 `validate-localized-assets.mjs` 的
   `FAMILIES`。用 bundler `import` 進來的素材走 `files` + `pinnedIn`；刻意共用的
   走 `languageNeutral: true`。

至於 2–5 這類圖片素材，長期解法應該是**別把文案畫進圖裡** —— 底圖語系中立、文字
用 DOM 疊上去，這樣就自動走 `validate-i18n` 那條已經有保障的路。
