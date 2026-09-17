# Localization contamination audit — five Scenarios × three languages

在英文版 Scenario 03 看到「臺北市政府警察局 信義分局」「臺灣臺北地方檢察署」之後所做的
全面稽核。範圍是**玩家實際看得到的文字**，不是原始碼裡有沒有中文字：`zh-TW` 的來源字串
本來就是中文，註解也是。

驗收標準：

| 語言 | 標準 |
| --- | --- |
| `zh-TW` | 玩家可見內容為繁體中文，不得出現假名 |
| `en` | 玩家可見內容不得含任何漢字 |
| `ja` | 不得出現繁體字形或中文虛詞，不得因缺 key 而 fallback 成中文 |

品牌名稱（`MyDonDon`／`HPE`／`BlackPi`／`SafeDeal`／`BITION`）、網址、英數案件編號不算污染。
語言選擇畫面上的 `中文` / `English` / `日本語` 三顆按鈕也不算 —— 語言選單本來就必須用
各自的語言寫自己的名字。

---

## 1. 污染來源（root cause）

| # | 類型 | 檔案 | 說明 |
| --- | --- | --- | --- |
| 1 | 定位／機關資料直接以中文 display string 渲染 | `src/data/location/locationDataset.js`、`src/data/location/policeOrganization.js` | 兩份 dataset 是真實機關名稱的抄錄，只有中文。每個把 `縣市／行政區／警察局／分局／派出所／地方檢察署／地方法院` 直接畫上畫面的元件，在 en/ja 都是中文 |
| 2 | session 快照沿用 zh display string | `src/lib/session/ScenarioSessionFactory.js` | `policeDepartment` / `policeDivision` / `policeStation` / `lineAccountName` 建立時就是中文，三個語言共用 |
| 3 | 公文產生器繞過 i18n | `src/data/scenario03Config.js` | `buildFakeDocumentsEn/Jp` 明文寫著「機關名稱兩種語言都保持原樣」，`發文機關`／`Issuing Agency` 因此是中文 |
| 4 | 對話行內插入機關名稱 | `src/data/scenario03Dialogues.js` | `prosecutors(session)` 把中文檢察署名塞進 zh 與 **jp** 兩條台詞 |
| 5 | 民國日期只有中文寫法 | `src/lib/dateTimeService.js` | `formatROCDate()` 固定回傳「中華民國115年08月25日」，被英文／日文公文直接引用 |
| 6 | hardcoded 中文可見字串 | `src/pages/LanguageSelect.jsx` | 入口畫面的館名／標題／說明／`aria-label` 寫死中文，玩家選過 EN/JA 再回到這頁仍是中文 |
| 7 | 共用元件的中文預設值 | `src/components/warnings/FraudWarningBanner.jsx`、`src/apps/line/components/Line.jsx`、`src/apps/blackpi/components/ChatScreen.jsx` | `title = '防詐風險提醒'`、`label = '選擇一個回覆'`、`avatarLabel = '賣'`。兩個 Scenario 01 場景沒有傳 title，於是整條警示列在 en/ja 都是中文 |
| 8 | 缺 en/ja translation key | `src/pages/scenario01/i18nEn.js`／`i18nJp.js`、`src/shared/i18n/scenario02*.js`、`scenario04*.js`、`src/apps/blackpi/i18n/*.js` | 11 條字串沒有翻譯，`createTranslator` 的 fallback 讓它們在 en/ja 直接顯示中文原句 |
| 9 | i18n fallback 到 zh-TW | `src/shared/i18n/createTranslator.js`（機制）＋ `scripts/validate-i18n.mjs`（漏檢） | fallback 機制本身要保留，但 Scenario 01 與所有 namespaced 字典（Scenario 03、四個入口畫面）**完全沒有被檢查過**，缺 key 不會有人發現 |
| 10 | 品牌 alt 文字混中文 | `src/apps/hpe-logistics/components/HpeLogo.jsx`、`src/apps/mydondon/components/MyDonDonLogo.jsx` | `alt="黑皮通 HPE"`／`alt="MyDonDon 買東東"` 在 en/ja 也照樣輸出 |
| 11 | 動態拼接的地址 | `src/apps/blackpi/screens/Checkout.jsx` | `` `${region.county}${region.district}○○路＊＊號` `` 先拼中文再丟進 `t()`，永遠不可能命中字典 |
| 12 | 玩家可見的 guard 畫面寫死中文 | `src/lib/RequireLocationProfile.jsx` | 「此情境尚未完成場地設定」。門後面是 zh-TW-only 的工作人員畫面（AD-13），但這句話是講給玩家聽的 |

---

## 2. 定位資料的 locale-aware 做法

**沒有**在元件裡用 `.replace()` 換字。做法是把「資料」與「顯示名稱」分開：

```
data/location/locationDataset.js      縣市／行政區／警察局／檢察署／法院（中文，不動）
data/location/policeOrganization.js   分局／派出所／分駐所／駐在所（中文，不動）
        │
        │  key = 中文名稱
        ▼
data/location/localizedLocationNames.js   1,922 筆 { en, jp }（產生後 commit）
        │
        ▼
lib/location/localizedLocationName.js     localizeLocationName(name, lang)
                                          localizeAgencies(agencies, lang)
                                          localizeRegion(region, lang)
        │
        ▼
ScenarioSessionFactory.getPoliceUnitDisplay(session, lang)
                      .getProsecutorsOfficeDisplay(session, lang)
                      .getDistrictCourtDisplay(session, lang)
                      .getLineAccountDisplayName(session, lang, suffix)
```

兩份 dataset 維持原樣（它們記錄的是真實機關的真實名稱），中文名稱當 key，
所有玩家可見的畫面都改成走上面的 accessor。

- **英文**：機關自己有的官方羅馬拼音優先（Taipei、Kaohsiung、Tamsui、Lukang），
  其餘用臺灣官方羅馬拼音標準漢語拼音，含 `Da'an` 這種必要的隔音符號。
  `區/鄉/鎮/市 → District/Township/Township/City`、`分局 → Precinct`、
  `派出所 → Police Station`、`分駐所 → Substation`、`駐在所 → Police Post`、
  `地方檢察署 → District Prosecutors Office`、`地方法院 → District Court`。
- **日文**：同樣的漢字，換成日本的字體形（`臺北市信義區 → 台北市信義区`、
  `臺灣臺北地方檢察署 → 台湾台北地方検察署`）—— 這正是日文寫臺灣地名／機關名的方式。

產生器是 `webapp/scripts/generate-location-localization.mjs`。它需要 `pinyin-pro`，
而那**不是** app 的相依套件（執行期不需要字典）：

```sh
cd webapp
npm install --no-save pinyin-pro
node scripts/generate-location-localization.mjs
```

`scripts/location-localization.test.mjs` 會在兩份 dataset 出現任何表裡沒有的名稱時擋下 build。

---

## 3. 檢查工具

| 工具 | 檢查什麼 | 何時跑 |
| --- | --- | --- |
| `scripts/validate-i18n.mjs` | 以中文原句為 key 的字典（Scenario 01/02/04/05 ＋ 五個 App）三語 key 覆蓋率、EN/JP key 一致、重複 key | `prebuild` |
| `scripts/localization-coverage.test.mjs` | namespaced 字典（Scenario 03、AR scan、手勢教學、情境選單、語言選擇）的 zh/en/jp **結構一致**；**所有**字典（含上面那些）沒有任何 entry 仍是中文原句或寫成錯的語言 | `prebuild` |
| `scripts/location-localization.test.mjs` | 兩份定位 dataset 的每個名稱都有 en/jp、en 不含漢字、jp 不含繁體字形 | `prebuild` |
| `scripts/dynamic-localization.test.mjs` | 每一類 **runtime 產生**的資料 × 三語：縣市／行政區／警察局／分局／派出所／檢察署／法院／人名／職稱／地址／銀行帳號／公文／對話／選項／角色名字池，外加走完整份 dataset 的 22 縣市、357 行政區、149 分局、1,328 派出所 | `prebuild` |
| `scripts/localization-runtime-scan.mjs` | **實際瀏覽器**逐頁走完五個情境三種語言，讀 DOM 可見文字＋`alt`/`placeholder`/`aria-label`，每頁還會逐一點過畫面上的按鈕以進入互動後的狀態 | 手動（需要瀏覽器） |
| `scripts/localization-leak-rules.mjs` | 上面四者共用的判準 | — |

runtime scan 需要一個已啟動的 server 與一個 Chromium：

```sh
cd webapp
npm install --no-save playwright
npx vite build && npx vite preview --port 5179 &
node scripts/localization-runtime-scan.mjs --base http://127.0.0.1:5179/CIBAR --dwell 2000
# 想跑快一點就降低每頁嘗試的控制項數：--taps 6
```

它刻意不在 `npm test` 或 `prebuild` 裡：需要瀏覽器與 server，不該擋住一般 build。

### 日文為什麼不用 CJK regex 判

日文本來就寫漢字，`[㐀-鿿]` 對 `ja` 完全沒有意義。實際判準是：

1. **繁體專用字形** —— 264 個中日寫法不同的字（`臺→台`、`區→区`、`檢→検`、`查→査`、
   `號→号`、`轉→転`、`讀→読`⋯）。任何一個出現在 `ja` 畫面上就是中文漏進來了。
2. **中文虛詞** —— 日文完全不寫的字（`這`、`您`、`們`、`嗎`、`呢`、`麼`⋯）。

有長度的中文句子必定命中其中一項。反過來，`台北市信義区` 與 `台湾台北地方検察署`
是正確的日文，不會被誤判。`那`（那覇）、`誰`、`個`、`於` 這些日文照用的字刻意不列入。

---

## 4. 稽核範圍外

- `src/pages/staff/*` 與 `/staff-setup`：依 AD-13 本來就是 zh-TW-only 的現場工作人員畫面，
  玩家流程不會經過（`/language` 上那顆齒輪的 `aria-label` 仍改成三語）。
- `webapp/index.html` 的 `<title>` 與 `public/manifest.json` 的 app name：kiosk 全螢幕
  WebView 不顯示分頁標題，玩家看不到。
- `src/data/warnings/warningRegistry.js`：規範文件，沒有任何 consumer，不會渲染。
