# AR Interaction Contract — Phase 2 Migration Inventory

Phase 2 把五個 Scenario 所有「玩家真正需要操作、會推進劇情」的畫面，全面接到既有的
AR Interaction Contract（`webapp/src/lib/arInteraction/`）。

本文件是 `webapp/scripts/ar-interaction-migration-inventory.mjs` 的人類可讀版本，
兩者由 `npm run test:ar-interaction-migration` 互相比對，不會各自漂移。

這一支**沒有**任何手勢辨識：沒有 camera、沒有 MediaPipe、沒有 hand tracking、
沒有佐臻 SDK、沒有 debounce／cooldown，也沒有任何 DOM selector 或 synthetic click。
Contract 只是用**語意**再說一次畫面本來就有的 handler；觸控行為完全沒有改變。

## 契約規則（不變）

| 正式劇情操作數 | mode | LEFT | RIGHT |
| --- | --- | --- | --- |
| 0 | `display` | — | — |
| 1 | `single` | 不存在 | 唯一操作 |
| 2 | `dual` | choice[0] | choice[1] |
| >2 | AR contract violation | — | — |

## 總覽

| 範圍 | display | single | dual | 合計 |
| --- | --- | --- | --- | --- |
| Shared（五情境共用） | 1 | 5 | 1 | 7 |
| Scenario 01｜假投資 | 3 | 10 | 2 | 15 |
| Scenario 02｜網路交友 | 9 | 23 | 9 | 41 |
| Scenario 03｜假檢警 | 10 | 15 | 4 | 29 |
| Scenario 04｜購物詐騙 | 11 | 15 | 8 | 34 |
| Scenario 05｜幽靈訂單 | 3 | 8 | 2 | 13 |
| **合計** | **37** | **76** | **26** | **139** |

- migrated story surfaces：**139**
- remaining un-migrated story surfaces：**0**（唯二排除項見下方「刻意排除」，並非未完成）
- migrated surfaces with mode = triple / >2 actions：**0**
- flow-level >2-action story nodes still in the scripts：**0**

## Shared（五情境共用）

| Surface | File | surfaceId | Mode | LEFT | RIGHT | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| AR 掃描（尚未發現線索） | `webapp/src/pages/arScan/ArScanHome.jsx` | `ar-scan/scanning` | `display` | — | — | 海報上有上百張與情境無關的 3D 圖像，掃到它們就只是沒掃到——不報錯、不震動、不提示失敗。此時沒有 selectedTarget，RIGHT 不得猜任何情境，所以是 display 而不是 disabled 的 single。 |
| AR 掃描（已發現線索，等玩家決定） | `webapp/src/pages/arScan/ArScanHome.jsx` | `ar-scan/target-offer` | `single` | — | 進入 selectedTarget 對應情境（enterSelectedScenario） | 辨識成功不再自動跳頁：五張正式 Image Target 只把底部提示換成該情境的第一句故事＋CTA，RIGHT 與點擊 CTA 呼叫同一個 enterSelectedScenario()。Target → Scenario 沿用 lib/ar/scenarioTargetMap.js，沒有第二套 mapping。 |
| 案件辨識成功（五情境共用進入畫面） | `webapp/src/components/ui/ScenarioEntryBriefing.jsx` | `shared/scenario-entry-briefing` | `single` | — | 開始體驗（startRoute） | TopBar 只剩品牌行——返回情境選單連結已從入口頁移除（不 render，不佔 DOM）。五情境共用一次宣告。 |
| 結局（詐騙成立／成功反詐） | `webapp/src/components/outcome/ScenarioOutcome.jsx` | `shared/outcome` | `single` | — | 查看詐騙疑點分析（analysisTo） | #323 shared Outcome System，十個結局共用同一個 contract，五情境的 Outcome page 不再各自宣告。 |
| 詐騙疑點分析 | `webapp/src/components/outcome/FraudClueAnalysis.jsx` | `shared/fraud-clue-analysis` | `single` | — | 進行反詐小測驗（quizTo） | shared Analysis 只在此宣告一次；gesture 會先跑 onContinue 再導頁，與 <Link> 完全相同。 |
| 反詐小測驗（作答前） | `webapp/src/components/ui/ScenarioFinalDecision.jsx` | `shared/anti-fraud-quiz` | `dual` | options[0]（安全解） | options[1]（風險解） | Phase 1 已完成，本次僅驗證未回歸。 |
| 反詐小測驗（作答後） | `webapp/src/components/ui/ScenarioFinalDecision.jsx` | `shared/anti-fraud-quiz-answered` | `single` | — | 返回掃描（backTo，預設 /ar-scan） | Phase 1 已完成。作答後兩個選項鎖住，LEFT 不再存在。 |

## Scenario 01｜假投資

| Surface | File | surfaceId | Mode | LEFT | RIGHT | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Facebook 廣告貼文 | `webapp/src/pages/scenario01/Feed.jsx` | `scenario01/feed` | `single` | — | 前往投資老師影片 | 廣告圖與 CTA 卡是兩個 <Link>，但指向同一步，所以是 single 不是 dual。topbar／假 tab／讚留言分享／留言牆皆不宣告。 |
| 投資老師影片 | `webapp/src/pages/scenario01/VideoTeacher.jsx` | `scenario01/video-teacher` | `single` | — | 加入 LINE 了解更多 | 影片自動播放，tap-to-play 只是播放失敗時的救援控制，不是劇情操作。 |
| LINE 投資小助理（訊息播放中） | `webapp/src/pages/scenario01/LineTeacher.jsx` | `scenario01/line-teacher` | `display` | — | — | — |
| LINE 投資小助理・二選一 | `webapp/src/pages/scenario01/LineTeacher.jsx` | `scenario01/line-teacher/need-choice` | `dual` | 我想直接跟老師操作 | 我想先自己試試看 | contract 由知道 choice node 的 scenario 畫面宣告，不放進 apps/line。 |
| LINE 投資小助理・加入 VIP | `webapp/src/pages/scenario01/LineTeacher.jsx` | `scenario01/line-teacher/join-vip` | `single` | — | 加入 VIP 群組 | — |
| VIP 群組（訊息播放中） | `webapp/src/pages/scenario01/VipGroup.jsx` | `scenario01/vip-group-playing` | `display` | — | — | — |
| VIP 群組（訊息播完） | `webapp/src/pages/scenario01/VipGroup.jsx` | `scenario01/vip-group` | `single` | — | 前往註冊平台 | — |
| GuGo Invest・註冊 | `webapp/src/apps/gugo-invest/app/pages/onboarding/Register.tsx` | `gugo-invest/onboarding/register` | `single` | — | 建立帳戶 | App 層宣告：整個畫面就是一顆劇情 CTA，欄位都是唯讀展示卡。GuGo 其餘 chrome（BottomNav、語言切換、股票卡、圖表）一律不宣告。 |
| GuGo Invest・入金（AI 量化合約） | `webapp/src/apps/gugo-invest/app/pages/onboarding/InvestOffer.tsx` | `gugo-invest/onboarding/invest-offer` | `single` | — | 立即投入 | — |
| GuGo Invest・入金成功 | `webapp/src/apps/gugo-invest/app/pages/onboarding/InvestOffer.tsx` | `gugo-invest/onboarding/invest-success` | `single` | — | 繼續 | — |
| 平台已入金・查看持股 | `webapp/src/pages/scenario01/PlatformRegister.jsx` | `scenario01/platform-register/holdings` | `single` | — | 查看 AI 智慧量化合約持股 | scenario 自己的 footer，只有在 funded 之後才 mount，所以永遠不會遮住 GuGo 自己的 onboarding contract。 |
| 平台已入金・前往下一步 | `webapp/src/pages/scenario01/PlatformRegister.jsx` | `scenario01/platform-register/continue` | `single` | — | 前往下一步 | — |
| 獲利總覽（金額累加動畫中） | `webapp/src/apps/gugo-invest/app/screens/ProfitOverview.tsx` | `gugo-invest/profit-overview-counting` | `display` | — | — | 出金鍵在動畫結束前根本不存在，所以此時沒有任何操作。 |
| 獲利總覽（可出金） | `webapp/src/apps/gugo-invest/app/screens/ProfitOverview.tsx` | `gugo-invest/profit-overview` | `single` | — | 申請提領 | — |
| 出金失敗・最終決定 | `webapp/src/pages/scenario01/WithdrawFail.jsx` | `scenario01/withdraw-fail/final-decision` | `dual` | 確認支付 | 稍後處理 | LEFT/RIGHT 依畫面上兩顆按鈕的既有順序（choice[0] / choice[1]）。 |

## Scenario 02｜網路交友

| Surface | File | surfaceId | Mode | LEFT | RIGHT | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 手機桌面（自動開啟 MeetU） | `webapp/src/pages/scenario02/PhoneDesktop.jsx` | `scenario02/phone-desktop` | `display` | — | — | — |
| MeetU 啟動頁 | `webapp/src/pages/scenario02/AppLanding.jsx` | `scenario02/app-landing` | `single` | — | 開始配對 | — |
| MeetU 滑卡（每張卡） | `webapp/src/pages/scenario02/DatingBrowse.jsx` | `scenario02/dating-browse/<cardId>` | `dual` | 略過（✕） | 喜歡（♥） | swipe 卡本身就是正式 decision contract 的一部分（like/pass 走不同劇情），LEFT/RIGHT 依畫面上 ✕／♥ 的既有位置。 |
| MeetU 配對成功 overlay | `webapp/src/pages/scenario02/DatingBrowse.jsx` | `scenario02/dating-browse/match` | `single` | — | 開始聊天 | — |
| 路人配對小對話・二選一 | `webapp/src/pages/scenario02/DatingBrowse.jsx` | `scenario02/mini-match/<cardId>/reply` | `dual` | choices[0] | choices[1] | 兩顆 pill 以 .meetu-mini-chat 的雙欄 modifier 並排（與主線對話同一條規則），不在任何 @media 內，任何寬度都不會改回上下排。 |
| 路人配對小對話（播放中） | `webapp/src/pages/scenario02/DatingBrowse.jsx` | `scenario02/mini-match/playing` | `display` | — | — | — |
| 路人配對小對話（已結束） | `webapp/src/pages/scenario02/DatingBrowse.jsx` | `scenario02/mini-match/closing` | `single` | — | 繼續探索 | — |
| 略過主線對象後的通知 | `webapp/src/pages/scenario02/DatingBrowse.jsx` | `scenario02/dating-lead-skipped` | `dual` | 查看對方 | 先不用 | — |
| 主線對象個人頁 | `webapp/src/pages/scenario02/DatingBrowse.jsx` | `scenario02/dating-lead-reveal` | `dual` | 看看她的訊息 | 返回 | 與 dating-lead-skipped 一樣以 MeetUInterstitial 的 splitActions 畫成左右兩欄；LEFT 是畫面上的第一顆按鈕。 |
| 案例模式入口 | `webapp/src/pages/scenario02/DatingBrowse.jsx` | `scenario02/simulation-required` | `single` | — | 查看配對 | 查看配對 是這頁唯一的動作（原本的「返回情境首頁」已移除，情境二不從這裡退出），所以是 single。 |
| 配對成功（獨立測試路由） | `webapp/src/pages/scenario02/DatingMatch.jsx` | `scenario02/dating-match` | `single` | — | 開始聊天 | 正常流程不會走到這條路由，但它是可直接連結的 surface，所以一併 migration。 |
| MeetU 對話（對方輸入中） | `webapp/src/pages/scenario02/DatingChat.jsx` | `scenario02/dating-chat` | `display` | — | — | — |
| MeetU 對話・玩家回覆 | `webapp/src/pages/scenario02/DatingChat.jsx` | `scenario02/dating-chat/choice` | `dual` | options[0] | options[1] | scenario02 全部玩家回覆都是二選一（scripts/scenario02-choices.test.mjs 已鎖住）。 |
| MeetU 對話・加 LINE | `webapp/src/pages/scenario02/DatingChat.jsx` | `scenario02/dating-chat/join-line` | `single` | — | 加入她的 LINE | — |
| MeetU 對話・前往 LINE | `webapp/src/pages/scenario02/DatingChat.jsx` | `scenario02/dating-chat/go-to-line` | `single` | — | 前往 LINE | — |
| LINE 私訊（訊息／影片／照片播放中） | `webapp/src/pages/scenario02/PrivateChat.jsx` | `scenario02/private-chat` | `display` | — | — | 影片 overlay 與照片 lightbox 都會自己結束，所以播放期間沒有任何操作——影片縮圖與照片 lightbox 的 ✕／背景都已是純裝飾（pointer-events:none），沒有任何只有觸控碰得到、卻能推進劇情的控制。 |
| LINE 私訊・玩家回覆 | `webapp/src/pages/scenario02/PrivateChat.jsx` | `scenario02/private-chat/choice` | `dual` | options[0] | options[1] | — |
| LINE 私訊・影片中斷／載入失敗 | `webapp/src/pages/scenario02/PrivateChat.jsx` | `scenario02/private-chat/video-recovery` | `dual` | 重新播放（retryVideo） | 略過影片並繼續（finishVideo） | AUD-01：影片 STALLED／ERROR 時 overlay 上只剩這兩顆按鈕，手勢必須碰得到，否則眼鏡玩家會卡死。兩側直接呼叫 VideoOverlay 自己的 handler，沒有第二套播放邏輯，也沒有自動 skip timer。正常播放仍是 display。兩顆按鈕以 .line-video-error-actions 畫成左右兩欄（純 layout，handler 與 recovery 機制未動），不在任何 @media 內。 |
| LINE 私訊・安全提醒 | `webapp/src/pages/scenario02/PrivateChat.jsx` | `scenario02/private-chat/tip` | `single` | — | 我知道了（completeTip） | — |
| LINE 私訊・平台連結卡 | `webapp/src/pages/scenario02/PrivateChat.jsx` | `scenario02/private-chat/platform-link` | `single` | — | 開啟幣勝客 | 只有在 linkClickable 之後才宣告，與卡片本身可點的時間完全一致。 |
| LINE 私訊・切換回平台中 | `webapp/src/pages/scenario02/PrivateChat.jsx` | `scenario02/private-chat/switching-to-platform` | `display` | — | — | — |
| 幣勝客・平台首屏 | `webapp/src/apps/coin-winner/PlatformLanding.jsx` | `coin-winner/landing` | `single` | — | 開始使用 | App 層宣告：畫面本身就是一顆劇情 CTA。 |
| 幣勝客・註冊表單 | `webapp/src/apps/coin-winner/PlatformRegister.jsx` | `coin-winner/register` | `single` | — | 建立帳戶 | — |
| 幣勝客・建立帳戶中／成功 | `webapp/src/apps/coin-winner/PlatformRegister.jsx` | `coin-winner/register-creating` | `display` | — | — | 按鈕 disabled／已消失，gesture 也必須跟著失效。 |
| 幣勝客・平台首頁（玩家按「返回 LINE 對話」） | `webapp/src/apps/coin-winner/PlatformHome.jsx` | `coin-winner/home` | `single` | — | 返回 LINE 對話 | 兩種到訪都改為玩家自己結束（原本是 5 秒／2.6 秒計時自動回報）。快捷操作列、頁首 icon 與底部分頁仍是 aria-disabled／aria-hidden 裝飾，整頁唯一的劇情控制就是底部那條返回列。deep link 進來的 browsing 到訪沒有可回報的事件，contract 會自行收斂成 display。 |
| 幣勝客・入金 | `webapp/src/apps/coin-winner/DepositPage.jsx` | `coin-winner/deposit` | `single` | — | 完成入金 | — |
| 幣勝客・入金處理中 | `webapp/src/apps/coin-winner/DepositPage.jsx` | `coin-winner/deposit-processing` | `display` | — | — | — |
| 幣勝客・入金成功（玩家按「返回 LINE 對話」） | `webapp/src/apps/coin-winner/DepositPage.jsx` | `coin-winner/deposit-success` | `single` | — | 返回 LINE 對話 | 原本是成功卡出現 2.4 秒後自動回 LINE，餘額還在跳動就被切走。 |
| 幣勝客・啟用策略 | `webapp/src/apps/coin-winner/TradingPage.jsx` | `coin-winner/trading` | `single` | — | 立即啟用 | — |
| 幣勝客・策略已啟用（玩家按「返回 LINE 對話」） | `webapp/src/apps/coin-winner/TradingPage.jsx` | `coin-winner/trading-activated` | `single` | — | 返回 LINE 對話 | 「立即啟用」原本同一幀就切回 LINE；現在先把狀態顯示為運行中，離開仍由玩家決定。回報給 host 的事件與時點不變。 |
| 幣勝客・申請提領 | `webapp/src/apps/coin-winner/WithdrawalPage.jsx` | `coin-winner/withdrawal` | `single` | — | 確認提領 | — |
| 幣勝客・提領審核中 | `webapp/src/apps/coin-winner/WithdrawalPage.jsx` | `coin-winner/withdrawal-reviewing` | `display` | — | — | — |
| 幣勝客・提領失敗（玩家按「返回 LINE 對話」） | `webapp/src/apps/coin-winner/WithdrawalPage.jsx` | `coin-winner/withdrawal-failed` | `single` | — | 返回 LINE 對話 | 失敗卡上的「完成安全驗證」本來就是 disabled，也不是這裡宣告的 action，gesture 一樣不得繞過；唯一能碰到的是返回列。原本是 1 秒後自動回 LINE。 |
| 入金前紅色警示 | `webapp/src/pages/scenario02/components/RedWarning.jsx` | `scenario02/deposit-warning` | `dual` | 停止入金 | 我已了解，仍要繼續 | 中間的「撥打反詐專線 165」是選擇性衛教 overlay，不推進劇情，其唯一有劇情效果的控制（停止付款）與 LEFT 相同。 |
| 入金前紅色警示・165 說明 | `webapp/src/pages/scenario02/components/RedWarning.jsx` | `scenario02/deposit-warning/hotline-165` | `single` | — | 返回體驗 | — |
| 入金前紅色警示・已停止 | `webapp/src/pages/scenario02/components/RedWarning.jsx` | `scenario02/deposit-warning/stopped` | `single` | — | 繼續觀看詐騙如何發展 | — |
| 安全驗證金前紅色警示 | `webapp/src/pages/scenario02/components/RedWarning.jsx` | `scenario02/topup-warning` | `dual` | 停止付款 | 我已了解，仍要繼續 | 這一頁在主線上（AD-23），因此以 hotline={false} 關掉 165 按鈕：畫面上的兩顆按鈕與 LEFT／RIGHT 一一對應，沒有第三顆只有 touch 能操作的控制。也因此本頁沒有 .../hotline-165 surface。 |
| 安全驗證金前紅色警示・已停止 | `webapp/src/pages/scenario02/components/RedWarning.jsx` | `scenario02/topup-warning/stopped` | `single` | — | 查看結果 | — |
| 資金安全驗證 | `webapp/src/pages/scenario02/GuaranteePage.jsx` | `scenario02/guarantee` | `single` | — | 完成驗證 | — |
| 資金安全驗證・處理中 | `webapp/src/pages/scenario02/GuaranteePage.jsx` | `scenario02/guarantee-processing` | `display` | — | — | — |
| 帳戶凍結 | `webapp/src/pages/scenario02/GuaranteePage.jsx` | `scenario02/guarantee/frozen` | `single` | — | 查看發生了什麼事 | — |

## Scenario 03｜假檢警

| Surface | File | surfaceId | Mode | LEFT | RIGHT | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 手機鎖定畫面（來電自動響起） | `webapp/src/pages/scenario03/PhoneHome.jsx` | `scenario03/phone-home` | `display` | — | — | 第一幕是一支放著的鎖定手機：時間、日期、桌布、狀態列，沒有 App grid，也沒有任何說明文字。玩家不需要操作，幾秒後陌生來電自己打進來。回訪用的「桌面只剩網路銀行」畫面（scenario03/phone-home/open-bank）已隨這段流程一起移除——銀行改由 LINE 的網址卡進入。 |
| 陌生來電 | `webapp/src/pages/scenario03/IncomingCall.jsx` | `scenario03/incoming-call` | `single` | — | 接聽 | 「先傳簡訊查證」這個多餘入口（以及它帶出的簡訊畫面）已移除，玩家不需要先按傳訊息才進得了承辦員警的對話。這通來電現在只剩「接聽」一個正式操作，和假檢察官來電、員警重新來電的響鈴畫面一致。 |
| 通話第一階段（字幕播放中） | `webapp/src/pages/scenario03/CallStage1.jsx` | `scenario03/call-stage1` | `display` | — | — | — |
| 通話第一階段・二選一 | `webapp/src/pages/scenario03/CallStage1.jsx` | `scenario03/call-stage1/<momentKey>` | `dual` | options[0] | options[1] | momentKey = call.ownership。 |
| 通話第一階段・繼續 | `webapp/src/pages/scenario03/CallStage1.jsx` | `scenario03/call-stage1/continue` | `single` | — | 前往 LINE | — |
| 加入 LINE 好友 | `webapp/src/pages/scenario03/LineAdd.jsx` | `scenario03/line-add` | `single` | — | 加入好友 | — |
| LINE 案件說明（訊息播放中／資料卡） | `webapp/src/pages/scenario03/LineIntro.jsx` | `scenario03/line-intro` | `display` | — | — | 訊息播放中，畫面上沒有任何可執行的控制：案件資料卡只有欄位，footer 也還沒出現。案件狀態查詢卡一出現就換成下面的 open-case-site（single）。 |
| LINE 案件說明・二選一 | `webapp/src/pages/scenario03/LineIntro.jsx` | `scenario03/line-intro/<momentKey>` | `dual` | options[0] | options[1] | momentKey = line.cooperate。 |
| LINE 案件說明・開啟案件網站 | `webapp/src/pages/scenario03/LineIntro.jsx` | `scenario03/line-intro/open-case-site` | `single` | — | 開啟案件網站 | 案件狀態查詢卡自己帶著 開啟案件狀態查詢 按鈕，比 footer 早約四秒出現；兩顆是同一個 toCaseSite，所以卡片一進 transcript 就宣告 single。 |
| 假案件網站・任務清單 | `webapp/src/pages/scenario03/CaseSite.jsx` | `scenario03/case-site` | `single` | — | 開啟目前解鎖的任務 | 四個任務同一時間只有一個是解鎖的，其餘不是已完成就是 disabled，所以是 single。 |
| 假案件網站・文件 | `webapp/src/pages/scenario03/CaseSite.jsx` | `scenario03/case-site/document` | `single` | — | 已閱讀，返回 | — |
| 假案件網站・同意書 | `webapp/src/pages/scenario03/CaseSite.jsx` | `scenario03/case-site/consent` | `single` | — | 送出同意書 | — |
| 假案件網站・任務全部完成 | `webapp/src/pages/scenario03/CaseSite.jsx` | `scenario03/case-site/complete` | `display` | — | — | 正常流程走不到：關閉同意書不會把第四個任務標成已完成，只有 送出同意書 會，而它同時離開這個畫面。留著是給「同一個 session 簽完再回來」的情況，那種情況本來就會被 mount guard 導走。 |
| 假檢察官來電 | `webapp/src/pages/scenario03/ProsecutorCall.jsx` | `scenario03/prosecutor-call/answer` | `single` | — | 接聽 | 這通來電確實只有「接聽」一個操作。 |
| 假檢察官通話（字幕播放中） | `webapp/src/pages/scenario03/ProsecutorCall.jsx` | `scenario03/prosecutor-call` | `display` | — | — | — |
| 假檢察官掛斷（約 1.1 秒的通話結束畫面） | `webapp/src/pages/scenario03/ProsecutorCall.jsx` | `scenario03/prosecutor-call/ended` | `display` | — | — | 檢察官掛斷、clearActiveCall 之後的短暫過場；接著原承辦員警會自己重新來電。畫面上沒有任何可按的東西。 |
| 假檢察官通話・二選一 | `webapp/src/pages/scenario03/ProsecutorCall.jsx` | `scenario03/prosecutor-call/<momentKey>` | `dual` | options[0] | options[1] | momentKey = prosecutor.account。 |
| 原承辦員警重新來電（響鈴中） | `webapp/src/pages/scenario03/PoliceCallback.jsx` | `scenario03/police-callback/answer` | `single` | — | 接聽 | 檢察官掛斷後，原承辦員警重新來電——這是一通獨立的來電，玩家必須自己接聽。和本情境其他來電畫面一樣，響鈴時只有「接聽」一個操作。 |
| 原承辦員警通話（接聽後，語音播放中） | `webapp/src/pages/scenario03/PoliceCallback.jsx` | `scenario03/police-callback` | `display` | — | — | 接聽後 police_callback_intro 自己播完，播完自動前往 LINE 資金監管任務卡。這段沒有任何玩家操作。 |
| 資金監管任務卡（語音／訊息播放中） | `webapp/src/pages/scenario03/LineCustody.jsx` | `scenario03/line-custody` | `display` | — | — | — |
| 資金監管任務卡・偵查佐傳來的網址卡 | `webapp/src/pages/scenario03/LineCustody.jsx` | `scenario03/line-custody/open-bank-site` | `single` | — | 開啟好匯銀行安全驗證頁面 | 偵查佐在 LINE 傳來一張「好匯銀行 HOWEI BANK」的網址預覽卡；點卡片和 RIGHT 走的是同一個 handler（openBankSite），所以觸控和手勢不可能導到不同地方。 |
| 好匯銀行網站・登入 | `webapp/src/pages/scenario03/BankSite.jsx` | `scenario03/bank/login` | `single` | — | 登入 | — |
| 好匯銀行網站・帳戶總覽 | `webapp/src/pages/scenario03/BankSite.jsx` | `scenario03/bank/overview` | `single` | — | 轉帳 | — |
| 好匯銀行網站・轉帳（唯一轉帳操作） | `webapp/src/pages/scenario03/BankSite.jsx` | `scenario03/bank/transfer` | `single` | — | 下一步 | — |
| 好匯銀行網站・確認交易 | `webapp/src/pages/scenario03/BankSite.jsx` | `scenario03/bank/confirm` | `single` | — | 確認交易 | — |
| 最後一個決定 | `webapp/src/pages/scenario03/FinalDecision.jsx` | `scenario03/final-decision` | `dual` | 確認轉帳 | 撥打 165 | LEFT/RIGHT 依畫面上兩顆按鈕的既有順序。 |
| 轉帳完成後・LINE（檢察官要你等消息） | `webapp/src/pages/scenario03/Aftermath.jsx` | `scenario03/aftermath/wait` | `display` | — | — | 只有「完成轉帳」分支會走到；自動敘事，畫面上沒有任何可按的東西。 |
| 轉帳完成後・「幾天後」過場 | `webapp/src/pages/scenario03/Aftermath.jsx` | `scenario03/aftermath/timeskip` | `display` | — | — | 約 2.4 秒的時間過場，接著回到 LINE。 |
| 轉帳完成後・兩個帳號都消失 | `webapp/src/pages/scenario03/Aftermath.jsx` | `scenario03/aftermath/continue` | `single` | — | 查看結果 | 員警與檢察官兩個 LINE 帳號都已不存在；這一段沒有新的二選一，只有一個往結局的出口。 |

## Scenario 04｜購物詐騙

| Surface | File | surfaceId | Mode | LEFT | RIGHT | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 模擬手機桌面 | `webapp/src/pages/scenario04/SimPhoneHome.jsx` | `scenario04/phone-home` | `single` | — | 開啟黑皮購物 | — |
| 黑皮購物開場動畫 | `webapp/src/pages/scenario04/blackpi/hosts.jsx` | `scenario04/blackpi-splash` | `display` | — | — | — |
| 黑皮首頁・商品選擇 | `webapp/src/apps/blackpi/screens/Home.jsx` | `blackpi/home` | `dual` | VEXA FLEX X1 旗艦摺疊手機 | 智慧掃拖機器人 | 首頁有兩個劇情商品卡（固定左右）。同一畫面上的搜尋列、通知鈴、BottomNav、裝飾商品列都不宣告，而且自 inert chrome 修正後三者（Touch / Mouse / Gesture）皆不可操作 —— 這正是 contract 存在的理由。 |
| 商品詳情 | `webapp/src/apps/blackpi/screens/ProductDetail.jsx` | `blackpi/product-detail` | `dual` | 賣家聊聊 | 直接購買 | — |
| 商品詳情・找不到商品 | `webapp/src/apps/blackpi/screens/ProductDetail.jsx` | `blackpi/product-not-found` | `single` | — | 回首頁 | — |
| 結帳確認 | `webapp/src/apps/blackpi/screens/Checkout.jsx` | `blackpi/checkout` | `single` | — | 確認付款 | — |
| 結帳確認・無商品 | `webapp/src/apps/blackpi/screens/Checkout.jsx` | `blackpi/checkout-empty` | `display` | — | — | — |
| 付款成功 | `webapp/src/pages/scenario04/blackpi/hosts.jsx` | `scenario04/payment-success` | `single` | — | 查看訂單 | — |
| 訂單詳情（尚未送達） | `webapp/src/apps/blackpi/screens/OrderDetail.jsx` | `blackpi/order-detail` | `single` | — | 查看最新物流 | — |
| 訂單詳情・物流更新中 | `webapp/src/apps/blackpi/screens/OrderDetail.jsx` | `blackpi/order-detail-montage` | `display` | — | — | UI 上按鈕 disabled，gesture 同步失效。 |
| 訂單詳情・已送達 | `webapp/src/apps/blackpi/screens/OrderDetail.jsx` | `blackpi/order-detail/unbox` | `single` | — | 拆開包裹 | — |
| 訂單詳情・已開爭議 | `webapp/src/apps/blackpi/screens/OrderDetail.jsx` | `blackpi/order-detail/aftersales` | `single` | — | 查看售後進度 | — |
| 賣家聊聊（對方輸入中） | `webapp/src/pages/scenario04/SellerChat.jsx` | `scenario04/seller-chat` | `display` | — | — | — |
| 賣家聊聊・玩家回覆 | `webapp/src/pages/scenario04/SellerChat.jsx` | `scenario04/seller-chat/<nodeId>` | `dual` | pendingChoices[0] | pendingChoices[1] | 售前對話所有 node 都是二選一。 |
| 收貨開箱（四個單一操作節點） | `webapp/src/pages/scenario04/Unboxing.jsx` | `scenario04/unboxing/<stage>` | `single` | — | 拆開外箱／把東西全部拿出來看看／查看商品頁與實際內容／先問賣家是不是寄錯了 | — |
| 賣家售後對話（對方輸入中） | `webapp/src/pages/scenario04/DisputeChat.jsx` | `scenario04/dispute-chat` | `display` | — | — | — |
| 賣家售後對話・玩家回覆 | `webapp/src/pages/scenario04/DisputeChat.jsx` | `scenario04/dispute-chat/<nodeId>` | `dual` | pendingChoices[0] | pendingChoices[1] | — |
| 退貨申請 | `webapp/src/pages/scenario04/ReturnRequest.jsx` | `scenario04/return-request` | `single` | — | 提交退貨申請 | 送出後按鈕被狀態列取代，contract 以 disabled 同步失效。 |
| 退貨確認對話（對方輸入中） | `webapp/src/pages/scenario04/ReturnAckChat.jsx` | `scenario04/return-ack` | `display` | — | — | — |
| 退貨確認對話・玩家回覆 | `webapp/src/pages/scenario04/ReturnAckChat.jsx` | `scenario04/return-ack/<nodeId>` | `single` | — | pendingChoices[0] | 這段對話只有一個回覆節點，所以是 single；同一段程式碼在兩個回覆時會是 dual。 |
| 退貨寄件 | `webapp/src/pages/scenario04/ReturnShipping.jsx` | `scenario04/return-shipping` | `single` | — | 我已完成寄件 | — |
| 退貨物流 | `webapp/src/pages/scenario04/ReturnLogistics.jsx` | `scenario04/return-logistics` | `single` | — | 完成退貨寄件（推進物流） | montage 期間 disabled，與按鈕一致。 |
| 退貨物流・賣家已簽收 | `webapp/src/pages/scenario04/ReturnLogistics.jsx` | `scenario04/return-logistics/received` | `single` | — | 查看退款進度 | — |
| 退款拖延／賣家失聯（對方輸入中） | `webapp/src/pages/scenario04/RefundDelayChat.jsx` | `scenario04/refund-delay` | `display` | — | — | — |
| 退款拖延・玩家回覆 | `webapp/src/pages/scenario04/RefundDelayChat.jsx` | `scenario04/refund-delay/<nodeId>` | `dual` | pendingChoices[0] | pendingChoices[1] | 前三個節點只有一個回覆（single），unreachable.notice 是二選一（dual）。 |
| 黑皮退款中心 | `webapp/src/pages/scenario04/RefundCenter.jsx` | `scenario04/refund-center` | `single` | — | 聯絡黑皮安心客服 | — |
| 黑皮客服（對方輸入中） | `webapp/src/pages/scenario04/PlatformSupportChat.jsx` | `scenario04/platform-support` | `display` | — | — | — |
| 黑皮客服・玩家回覆 | `webapp/src/pages/scenario04/PlatformSupportChat.jsx` | `scenario04/platform-support/<nodeId>` | `dual` | pendingChoices[0] | pendingChoices[1] | 安心專員的「繼續要求平台負責／聯絡 165 報案」是本情境的最終決定。唯一例外見 AR_MIGRATION_BLOCKERS。 |
| 我的訂單（BottomNav） | `webapp/src/pages/scenario04/blackpi/hosts.jsx` | `scenario04/orders` | `single` | — | 開啟訂單 | 非主線。BottomNav 已是純裝飾，本畫面只能由訂單詳情的返回進入。 |
| 我的訂單・尚無訂單 | `webapp/src/pages/scenario04/blackpi/hosts.jsx` | `scenario04/orders-empty` | `display` | — | — | — |
| 訊息匣（BottomNav） | `webapp/src/pages/scenario04/blackpi/hosts.jsx` | `scenario04/messages` | `dual` | 賣家對話 | 黑皮客服 | 非主線。BottomNav 已是純裝飾，分頁不可點；畫面本身的兩個對話入口仍可操作。 |
| 我的（BottomNav） | `webapp/src/pages/scenario04/blackpi/hosts.jsx` | `scenario04/me` | `dual` | 退款中心 | 客服 | 非主線。BottomNav 已是純裝飾。音效開關是裝置設定，不是劇情操作。 |
| 我的・尚未選定商品線 | `webapp/src/pages/scenario04/blackpi/hosts.jsx` | `scenario04/me-empty` | `display` | — | — | — |
| 分類（BottomNav） | `webapp/src/pages/scenario04/blackpi/hosts.jsx` | `scenario04/category` | `display` | — | — | — |

## Scenario 05｜幽靈訂單

| Surface | File | surfaceId | Mode | LEFT | RIGHT | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 手機桌面 | `webapp/src/pages/scenario05/MarketplacePhoneHome.jsx` | `scenario05/phone-home` | `single` | — | 開啟買東東 | — |
| 買東東首頁 | `webapp/src/pages/scenario05/MarketplaceHome.jsx` | `scenario05/marketplace-home` | `single` | — | 刊登商品 | tab bar 是假 App chrome，不宣告。 |
| 選擇要出售的商品 | `webapp/src/apps/mydondon/screens/ProductSelect.jsx` | `mydondon/product-select` | `dual` | products[0] | products[1] | App 層宣告：畫面本身就是這個二選一決定，並沿用按鈕自己的防連點 disabled。 |
| 刊登完成・買家來訊 | `webapp/src/pages/scenario05/MarketplaceListing.jsx` | `scenario05/listing` | `single` | — | 開啟對話 | — |
| 刊登完成・無商品 | `webapp/src/pages/scenario05/MarketplaceListing.jsx` | `scenario05/listing-empty` | `display` | — | — | — |
| 買家對話（對方輸入中） | `webapp/src/pages/scenario05/BuyerChat.jsx` | `scenario05/buyer-chat` | `display` | — | — | — |
| 買家對話・玩家回覆 | `webapp/src/pages/scenario05/BuyerChat.jsx` | `scenario05/buyer-chat/<nodeId>` | `dual` | pendingChoices[0] | pendingChoices[1] | buyer.s07.explain 就是本情境的最終決定；buyer.s09.gone 只有一個回覆，走同一段程式碼的 single 分支。 |
| SafeDeal・建立賣場 | `webapp/src/pages/scenario05/ShopCreate.jsx` | `scenario05/shop-create` | `single` | — | 建立交易 | 送出後 disabled，contract 同步。 |
| SafeDeal・交易安全提醒 | `webapp/src/pages/scenario05/TradeInfo.jsx` | `scenario05/trade-info` | `single` | — | 返回聊天 | — |
| 買東東官方訂單（空的） | `webapp/src/pages/scenario05/MarketplaceOrders.jsx` | `scenario05/mydondon-orders` | `single` | — | 返回聊天 | — |
| 黑皮通寄件 | `webapp/src/pages/scenario05/HpeShip.jsx` | `scenario05/hpe-ship` | `single` | — | 寄出／查看對話 | Phase 1 已接，本次未改寫，只驗證仍正確（montage 期間 disabled）。 |
| 款項處理中 | `webapp/src/pages/scenario05/OrderGone.jsx` | `scenario05/order-gone-processing` | `display` | — | — | Phase 1 已接，本次未改寫。 |
| 賣場已不存在 | `webapp/src/pages/scenario05/OrderGone.jsx` | `scenario05/order-gone` | `single` | — | 查看結果 | Phase 1 已接，本次未改寫。 |

## 沒有出現的 geometry

**沒有。** display／single／dual 三種 geometry 在 shared 與五個 Scenario 都出現了。

## 刻意排除（不是未完成）

### 黑皮購物・搜尋頁

- File：`webapp/src/apps/blackpi/screens/Search.jsx`
- 原因：Phase 2 明確要求不處理 BlackPi search 的 product decision（search input 仍是 AR Interaction Audit 的 REPORT exception）。主線的商品選擇走首頁的兩張劇情商品卡（blackpi/home, dual），搜尋是非主線分支，AR 下不可達。

### 黑皮購物・搜尋結果

- File：`webapp/src/apps/blackpi/screens/SearchResults.jsx`
- 原因：同上：只能從搜尋頁進入，屬於同一個被排除的分支。

## AR-readiness blocker（劇情層，不是 migration 層）

**沒有。** 五情境已經沒有任何三選一以上的玩家提示——最後一個（`shared.platform.agent.argue.pick`）
已在本次 migration 一併收成二選一，因此每一個劇情提示在 AR 上都答得出來。

`npm run test:ar-interaction-migration` 對**任何** `>2` 的對話節點都會失敗，沒有例外清單。

## 三個 AR 工具的分工

| 指令 | 負責 |
| --- | --- |
| `npm run audit:ar-interactions` | source 層的互動風險盤點 |
| `npm run test:ar-interactions` | 上面那份盤點的回歸守門 |
| `npm run test:gesture-contract` | contract engine 本身的正確性 |
| `npm run test:ar-interaction-migration` | 五情境是否已全面接線（本文件） |

## 不在這一支範圍內

- Gesture Bridge：尚未開始。
- 佐臻 SDK／Android native／camera／MediaPipe／hand tracking：尚未開始。
- AR scan 圖片辨識引擎（mind-ar detect + match、camera、dataset）：未更動。
- 劇情文案、Outcome UI、Quiz 題目：未更動。
