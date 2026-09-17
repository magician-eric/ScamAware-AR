// Phase 2 AR Interaction Contract migration inventory.
//
// One row per story surface that has been migrated onto the contract
// (src/lib/arInteraction), plus the two lists that keep the migration honest:
// what was deliberately left out, and where the story itself is not yet
// AR-ready. This is the machine-readable twin of
// docs/ar-interaction-phase2-migration.md - scripts/ar-interaction-migration.test.mjs
// checks the two against each other and against the source tree, so neither
// can drift.
//
// Row shape:
//   scenario   'scenario01'..'scenario05' | 'shared'
//   surface    what the player is looking at, in story words
//   file       the file that declares the contract (repo-relative, from webapp/)
//   surfaceId  the id the contract is registered with. A `<name>` segment means
//              the id is built per node/stage at runtime; `sourceToken` then
//              carries the literal template the file really contains.
//   mode       'display' | 'single' | 'dual' - never anything else
//   left       what a LEFT gesture runs (null for display/single)
//   right      what a RIGHT gesture runs (null for display)
//   notes      why this geometry, when it is not obvious
//   sourceToken the literal text the declaring file must contain (defaults to
//              surfaceId; a `${...}` template for per-node/per-stage ids)
//   namedIn    the file that supplies the id, when it is passed in as a prop
//              rather than written in the declaring file
//
// Ordering is the order the player meets the surfaces in a run.

const SEEN = new Set();
function surface(row) {
  if (SEEN.has(row.surfaceId)) throw new Error(`duplicate surfaceId in inventory: ${row.surfaceId}`);
  SEEN.add(row.surfaceId);
  return { left: null, right: null, notes: '', sourceToken: row.surfaceId, ...row };
}

export const AR_MIGRATION_INVENTORY = [
  // ---------------------------------------------------------------- shared
  surface({
    scenario: 'shared', surface: 'AR 掃描（尚未發現線索）',
    file: 'src/pages/arScan/ArScanHome.jsx',
    surfaceId: 'ar-scan/scanning', mode: 'display',
    notes: '海報上有上百張與情境無關的 3D 圖像，掃到它們就只是沒掃到——不報錯、不震動、不提示失敗。此時沒有 selectedTarget，RIGHT 不得猜任何情境，所以是 display 而不是 disabled 的 single。',
  }),
  surface({
    scenario: 'shared', surface: 'AR 掃描（已發現線索，等玩家決定）',
    file: 'src/pages/arScan/ArScanHome.jsx',
    surfaceId: 'ar-scan/target-offer', mode: 'single',
    right: '進入 selectedTarget 對應情境（enterSelectedScenario）',
    notes: '辨識成功不再自動跳頁：五張正式 Image Target 只把底部提示換成該情境的第一句故事＋CTA，RIGHT 與點擊 CTA 呼叫同一個 enterSelectedScenario()。Target → Scenario 沿用 lib/ar/scenarioTargetMap.js，沒有第二套 mapping。',
  }),
  surface({
    scenario: 'shared', surface: '案件辨識成功（五情境共用進入畫面）',
    file: 'src/components/ui/ScenarioEntryBriefing.jsx',
    surfaceId: 'shared/scenario-entry-briefing', mode: 'single',
    right: '開始體驗（startRoute）',
    notes: 'TopBar 只剩品牌行——返回情境選單連結已從入口頁移除（不 render，不佔 DOM）。五情境共用一次宣告。',
  }),
  surface({
    scenario: 'shared', surface: '結局（詐騙成立／成功反詐）',
    file: 'src/components/outcome/ScenarioOutcome.jsx',
    surfaceId: 'shared/outcome', mode: 'single',
    right: '查看詐騙疑點分析（analysisTo）',
    notes: '#323 shared Outcome System，十個結局共用同一個 contract，五情境的 Outcome page 不再各自宣告。',
  }),
  surface({
    scenario: 'shared', surface: '詐騙疑點分析',
    file: 'src/components/outcome/FraudClueAnalysis.jsx',
    surfaceId: 'shared/fraud-clue-analysis', mode: 'single',
    right: '進行反詐小測驗（quizTo）',
    notes: 'shared Analysis 只在此宣告一次；gesture 會先跑 onContinue 再導頁，與 <Link> 完全相同。',
  }),
  surface({
    scenario: 'shared', surface: '反詐小測驗（作答前）',
    file: 'src/components/ui/ScenarioFinalDecision.jsx',
    surfaceId: 'shared/anti-fraud-quiz', mode: 'dual',
    left: 'options[0]（安全解）', right: 'options[1]（風險解）',
    notes: 'Phase 1 已完成，本次僅驗證未回歸。',
  }),
  surface({
    scenario: 'shared', surface: '反詐小測驗（作答後）',
    file: 'src/components/ui/ScenarioFinalDecision.jsx',
    surfaceId: 'shared/anti-fraud-quiz-answered', mode: 'single',
    right: '返回掃描（backTo，預設 /ar-scan）',
    notes: 'Phase 1 已完成。作答後兩個選項鎖住，LEFT 不再存在。',
  }),

  // ------------------------------------------------------------ scenario 01
  surface({
    scenario: 'scenario01', surface: 'Facebook 廣告貼文',
    file: 'src/pages/scenario01/Feed.jsx',
    surfaceId: 'scenario01/feed', mode: 'single',
    right: '前往投資老師影片',
    notes: '廣告圖與 CTA 卡是兩個 <Link>，但指向同一步，所以是 single 不是 dual。topbar／假 tab／讚留言分享／留言牆皆不宣告。',
  }),
  surface({
    scenario: 'scenario01', surface: '投資老師影片',
    file: 'src/pages/scenario01/VideoTeacher.jsx',
    surfaceId: 'scenario01/video-teacher', mode: 'single',
    right: '加入 LINE 了解更多',
    notes: '影片自動播放，tap-to-play 只是播放失敗時的救援控制，不是劇情操作。',
  }),
  surface({
    scenario: 'scenario01', surface: 'LINE 投資小助理（訊息播放中）',
    file: 'src/pages/scenario01/LineTeacher.jsx',
    surfaceId: 'scenario01/line-teacher', mode: 'display',
  }),
  surface({
    scenario: 'scenario01', surface: 'LINE 投資小助理・二選一',
    file: 'src/pages/scenario01/LineTeacher.jsx',
    surfaceId: 'scenario01/line-teacher/need-choice', mode: 'dual',
    left: '我想直接跟老師操作', right: '我想先自己試試看',
    notes: 'contract 由知道 choice node 的 scenario 畫面宣告，不放進 apps/line。',
  }),
  surface({
    scenario: 'scenario01', surface: 'LINE 投資小助理・加入 VIP',
    file: 'src/pages/scenario01/LineTeacher.jsx',
    surfaceId: 'scenario01/line-teacher/join-vip', mode: 'single',
    right: '加入 VIP 群組',
  }),
  surface({
    scenario: 'scenario01', surface: 'VIP 群組（訊息播放中）',
    file: 'src/pages/scenario01/VipGroup.jsx',
    surfaceId: 'scenario01/vip-group-playing', mode: 'display',
  }),
  surface({
    scenario: 'scenario01', surface: 'VIP 群組（訊息播完）',
    file: 'src/pages/scenario01/VipGroup.jsx',
    surfaceId: 'scenario01/vip-group', mode: 'single',
    right: '前往註冊平台',
  }),
  surface({
    scenario: 'scenario01', surface: 'GuGo Invest・註冊',
    file: 'src/apps/gugo-invest/app/pages/onboarding/Register.tsx',
    surfaceId: 'gugo-invest/onboarding/register', mode: 'single',
    right: '建立帳戶',
    notes: 'App 層宣告：整個畫面就是一顆劇情 CTA，欄位都是唯讀展示卡。GuGo 其餘 chrome（BottomNav、語言切換、股票卡、圖表）一律不宣告。',
  }),
  surface({
    scenario: 'scenario01', surface: 'GuGo Invest・入金（AI 量化合約）',
    file: 'src/apps/gugo-invest/app/pages/onboarding/InvestOffer.tsx',
    surfaceId: 'gugo-invest/onboarding/invest-offer', mode: 'single',
    right: '立即投入',
  }),
  surface({
    scenario: 'scenario01', surface: 'GuGo Invest・入金成功',
    file: 'src/apps/gugo-invest/app/pages/onboarding/InvestOffer.tsx',
    surfaceId: 'gugo-invest/onboarding/invest-success', mode: 'single',
    right: '繼續',
  }),
  surface({
    scenario: 'scenario01', surface: '平台已入金・查看持股',
    file: 'src/pages/scenario01/PlatformRegister.jsx',
    surfaceId: 'scenario01/platform-register/holdings', mode: 'single',
    right: '查看 AI 智慧量化合約持股',
    notes: 'scenario 自己的 footer，只有在 funded 之後才 mount，所以永遠不會遮住 GuGo 自己的 onboarding contract。',
  }),
  surface({
    scenario: 'scenario01', surface: '平台已入金・前往下一步',
    file: 'src/pages/scenario01/PlatformRegister.jsx',
    surfaceId: 'scenario01/platform-register/continue', mode: 'single',
    right: '前往下一步',
  }),
  surface({
    scenario: 'scenario01', surface: '獲利總覽（金額累加動畫中）',
    file: 'src/apps/gugo-invest/app/screens/ProfitOverview.tsx',
    surfaceId: 'gugo-invest/profit-overview-counting', mode: 'display',
    notes: '出金鍵在動畫結束前根本不存在，所以此時沒有任何操作。',
  }),
  surface({
    scenario: 'scenario01', surface: '獲利總覽（可出金）',
    file: 'src/apps/gugo-invest/app/screens/ProfitOverview.tsx',
    surfaceId: 'gugo-invest/profit-overview', mode: 'single',
    right: '申請提領',
  }),
  surface({
    scenario: 'scenario01', surface: '出金失敗・最終決定',
    file: 'src/pages/scenario01/WithdrawFail.jsx',
    surfaceId: 'scenario01/withdraw-fail/final-decision', mode: 'dual',
    left: '確認支付', right: '稍後處理',
    notes: 'LEFT/RIGHT 依畫面上兩顆按鈕的既有順序（choice[0] / choice[1]）。',
  }),

  // ------------------------------------------------------------ scenario 02
  surface({
    scenario: 'scenario02', surface: '手機桌面（自動開啟 MeetU）',
    file: 'src/pages/scenario02/PhoneDesktop.jsx',
    surfaceId: 'scenario02/phone-desktop', mode: 'display',
  }),
  surface({
    scenario: 'scenario02', surface: 'MeetU 啟動頁',
    file: 'src/pages/scenario02/AppLanding.jsx',
    surfaceId: 'scenario02/app-landing', mode: 'single',
    right: '開始配對',
  }),
  surface({
    scenario: 'scenario02', surface: 'MeetU 滑卡（每張卡）',
    file: 'src/pages/scenario02/DatingBrowse.jsx',
    surfaceId: 'scenario02/dating-browse/<cardId>', mode: 'dual',
    left: '略過（✕）', right: '喜歡（♥）',
    sourceToken: 'scenario02/dating-browse/${card.id}',
    notes: 'swipe 卡本身就是正式 decision contract 的一部分（like/pass 走不同劇情），LEFT/RIGHT 依畫面上 ✕／♥ 的既有位置。',
  }),
  surface({
    scenario: 'scenario02', surface: 'MeetU 配對成功 overlay',
    file: 'src/pages/scenario02/DatingBrowse.jsx',
    surfaceId: 'scenario02/dating-browse/match', mode: 'single',
    right: '開始聊天',
  }),
  surface({
    scenario: 'scenario02', surface: '路人配對小對話・二選一',
    file: 'src/pages/scenario02/DatingBrowse.jsx',
    surfaceId: 'scenario02/mini-match/<cardId>/reply', mode: 'dual',
    left: 'choices[0]', right: 'choices[1]',
    sourceToken: "scenario02/mini-match/${person.id ?? 'candidate'}/reply",
    notes: '兩顆 pill 以 .meetu-mini-chat 的雙欄 modifier 並排（與主線對話同一條規則），不在任何 @media 內，任何寬度都不會改回上下排。',
  }),
  surface({
    scenario: 'scenario02', surface: '路人配對小對話（播放中）',
    file: 'src/pages/scenario02/DatingBrowse.jsx',
    surfaceId: 'scenario02/mini-match/playing', mode: 'display',
  }),
  surface({
    scenario: 'scenario02', surface: '路人配對小對話（已結束）',
    file: 'src/pages/scenario02/DatingBrowse.jsx',
    surfaceId: 'scenario02/mini-match/closing', mode: 'single',
    right: '繼續探索',
  }),
  surface({
    scenario: 'scenario02', surface: '略過主線對象後的通知',
    file: 'src/pages/scenario02/DatingBrowse.jsx',
    surfaceId: 'scenario02/dating-lead-skipped', mode: 'dual',
    left: '查看對方', right: '先不用',
  }),
  surface({
    scenario: 'scenario02', surface: '主線對象個人頁',
    file: 'src/pages/scenario02/DatingBrowse.jsx',
    surfaceId: 'scenario02/dating-lead-reveal', mode: 'dual',
    left: '看看她的訊息', right: '返回',
    notes: '與 dating-lead-skipped 一樣以 MeetUInterstitial 的 splitActions 畫成左右兩欄；LEFT 是畫面上的第一顆按鈕。',
  }),
  surface({
    scenario: 'scenario02', surface: '案例模式入口',
    file: 'src/pages/scenario02/DatingBrowse.jsx',
    surfaceId: 'scenario02/simulation-required', mode: 'single',
    right: '查看配對',
    notes: '查看配對 是這頁唯一的動作（原本的「返回情境首頁」已移除，情境二不從這裡退出），所以是 single。',
  }),
  surface({
    scenario: 'scenario02', surface: '配對成功（獨立測試路由）',
    file: 'src/pages/scenario02/DatingMatch.jsx',
    surfaceId: 'scenario02/dating-match', mode: 'single',
    right: '開始聊天',
    notes: '正常流程不會走到這條路由，但它是可直接連結的 surface，所以一併 migration。',
  }),
  surface({
    scenario: 'scenario02', surface: 'MeetU 對話（對方輸入中）',
    file: 'src/pages/scenario02/DatingChat.jsx',
    surfaceId: 'scenario02/dating-chat', mode: 'display',
  }),
  surface({
    scenario: 'scenario02', surface: 'MeetU 對話・玩家回覆',
    file: 'src/pages/scenario02/DatingChat.jsx',
    surfaceId: 'scenario02/dating-chat/choice', mode: 'dual',
    left: 'options[0]', right: 'options[1]',
    notes: 'scenario02 全部玩家回覆都是二選一（scripts/scenario02-choices.test.mjs 已鎖住）。',
  }),
  surface({
    scenario: 'scenario02', surface: 'MeetU 對話・加 LINE',
    file: 'src/pages/scenario02/DatingChat.jsx',
    surfaceId: 'scenario02/dating-chat/join-line', mode: 'single',
    right: '加入她的 LINE',
  }),
  surface({
    scenario: 'scenario02', surface: 'MeetU 對話・前往 LINE',
    file: 'src/pages/scenario02/DatingChat.jsx',
    surfaceId: 'scenario02/dating-chat/go-to-line', mode: 'single',
    right: '前往 LINE',
  }),
  surface({
    scenario: 'scenario02', surface: 'LINE 私訊（訊息／影片／照片播放中）',
    file: 'src/pages/scenario02/PrivateChat.jsx',
    surfaceId: 'scenario02/private-chat', mode: 'display',
    notes: '影片 overlay 與照片 lightbox 都會自己結束，所以播放期間沒有任何操作——影片縮圖與照片 lightbox 的 ✕／背景都已是純裝飾（pointer-events:none），沒有任何只有觸控碰得到、卻能推進劇情的控制。',
  }),
  surface({
    scenario: 'scenario02', surface: 'LINE 私訊・玩家回覆',
    file: 'src/pages/scenario02/PrivateChat.jsx',
    surfaceId: 'scenario02/private-chat/choice', mode: 'dual',
    left: 'options[0]', right: 'options[1]',
  }),
  surface({
    scenario: 'scenario02', surface: 'LINE 私訊・影片中斷／載入失敗',
    file: 'src/pages/scenario02/PrivateChat.jsx',
    surfaceId: 'scenario02/private-chat/video-recovery', mode: 'dual',
    left: '重新播放（retryVideo）', right: '略過影片並繼續（finishVideo）',
    notes: 'AUD-01：影片 STALLED／ERROR 時 overlay 上只剩這兩顆按鈕，手勢必須碰得到，否則眼鏡玩家會卡死。兩側直接呼叫 VideoOverlay 自己的 handler，沒有第二套播放邏輯，也沒有自動 skip timer。正常播放仍是 display。兩顆按鈕以 .line-video-error-actions 畫成左右兩欄（純 layout，handler 與 recovery 機制未動），不在任何 @media 內。',
  }),
  surface({
    scenario: 'scenario02', surface: 'LINE 私訊・安全提醒',
    file: 'src/pages/scenario02/PrivateChat.jsx',
    surfaceId: 'scenario02/private-chat/tip', mode: 'single',
    right: '我知道了（completeTip）',
  }),
  surface({
    scenario: 'scenario02', surface: 'LINE 私訊・平台連結卡',
    file: 'src/pages/scenario02/PrivateChat.jsx',
    surfaceId: 'scenario02/private-chat/platform-link', mode: 'single',
    right: '開啟幣勝客',
    notes: '只有在 linkClickable 之後才宣告，與卡片本身可點的時間完全一致。',
  }),
  surface({
    scenario: 'scenario02', surface: 'LINE 私訊・切換回平台中',
    file: 'src/pages/scenario02/PrivateChat.jsx',
    surfaceId: 'scenario02/private-chat/switching-to-platform', mode: 'display',
  }),
  surface({
    scenario: 'scenario02', surface: '幣勝客・平台首屏',
    file: 'src/apps/coin-winner/PlatformLanding.jsx',
    surfaceId: 'coin-winner/landing', mode: 'single', right: '開始使用',
    notes: 'App 層宣告：畫面本身就是一顆劇情 CTA。',
  }),
  surface({
    scenario: 'scenario02', surface: '幣勝客・註冊表單',
    file: 'src/apps/coin-winner/PlatformRegister.jsx',
    surfaceId: 'coin-winner/register', mode: 'single', right: '建立帳戶',
  }),
  surface({
    scenario: 'scenario02', surface: '幣勝客・建立帳戶中／成功',
    file: 'src/apps/coin-winner/PlatformRegister.jsx',
    surfaceId: 'coin-winner/register-creating', mode: 'display',
    notes: '按鈕 disabled／已消失，gesture 也必須跟著失效。',
  }),
  surface({
    scenario: 'scenario02', surface: '幣勝客・平台首頁（玩家按「返回 LINE 對話」）',
    file: 'src/apps/coin-winner/PlatformHome.jsx',
    surfaceId: 'coin-winner/home', mode: 'single', right: '返回 LINE 對話',
    notes: '兩種到訪都改為玩家自己結束（原本是 5 秒／2.6 秒計時自動回報）。快捷操作列、頁首 icon 與底部分頁仍是 aria-disabled／aria-hidden 裝飾，整頁唯一的劇情控制就是底部那條返回列。deep link 進來的 browsing 到訪沒有可回報的事件，contract 會自行收斂成 display。',
  }),
  surface({
    scenario: 'scenario02', surface: '幣勝客・入金',
    file: 'src/apps/coin-winner/DepositPage.jsx',
    surfaceId: 'coin-winner/deposit', mode: 'single', right: '完成入金',
  }),
  surface({
    scenario: 'scenario02', surface: '幣勝客・入金處理中',
    file: 'src/apps/coin-winner/DepositPage.jsx',
    surfaceId: 'coin-winner/deposit-processing', mode: 'display',
  }),
  surface({
    scenario: 'scenario02', surface: '幣勝客・入金成功（玩家按「返回 LINE 對話」）',
    file: 'src/apps/coin-winner/DepositPage.jsx',
    surfaceId: 'coin-winner/deposit-success', mode: 'single', right: '返回 LINE 對話',
    notes: '原本是成功卡出現 2.4 秒後自動回 LINE，餘額還在跳動就被切走。',
  }),
  surface({
    scenario: 'scenario02', surface: '幣勝客・啟用策略',
    file: 'src/apps/coin-winner/TradingPage.jsx',
    surfaceId: 'coin-winner/trading', mode: 'single', right: '立即啟用',
  }),
  surface({
    scenario: 'scenario02', surface: '幣勝客・策略已啟用（玩家按「返回 LINE 對話」）',
    file: 'src/apps/coin-winner/TradingPage.jsx',
    surfaceId: 'coin-winner/trading-activated', mode: 'single', right: '返回 LINE 對話',
    notes: '「立即啟用」原本同一幀就切回 LINE；現在先把狀態顯示為運行中，離開仍由玩家決定。回報給 host 的事件與時點不變。',
  }),
  surface({
    scenario: 'scenario02', surface: '幣勝客・申請提領',
    file: 'src/apps/coin-winner/WithdrawalPage.jsx',
    surfaceId: 'coin-winner/withdrawal', mode: 'single', right: '確認提領',
  }),
  surface({
    scenario: 'scenario02', surface: '幣勝客・提領審核中',
    file: 'src/apps/coin-winner/WithdrawalPage.jsx',
    surfaceId: 'coin-winner/withdrawal-reviewing', mode: 'display',
  }),
  surface({
    scenario: 'scenario02', surface: '幣勝客・提領失敗（玩家按「返回 LINE 對話」）',
    file: 'src/apps/coin-winner/WithdrawalPage.jsx',
    surfaceId: 'coin-winner/withdrawal-failed', mode: 'single', right: '返回 LINE 對話',
    notes: '失敗卡上的「完成安全驗證」本來就是 disabled，也不是這裡宣告的 action，gesture 一樣不得繞過；唯一能碰到的是返回列。原本是 1 秒後自動回 LINE。',
  }),
  surface({
    scenario: 'scenario02', surface: '入金前紅色警示',
    file: 'src/pages/scenario02/components/RedWarning.jsx',
    surfaceId: 'scenario02/deposit-warning', mode: 'dual',
    namedIn: 'src/pages/scenario02/DepositWarning.jsx',
    left: '停止入金', right: '我已了解，仍要繼續',
    notes: '中間的「撥打反詐專線 165」是選擇性衛教 overlay，不推進劇情，其唯一有劇情效果的控制（停止付款）與 LEFT 相同。',
  }),
  surface({
    scenario: 'scenario02', surface: '入金前紅色警示・165 說明',
    file: 'src/pages/scenario02/components/RedWarning.jsx',
    surfaceId: 'scenario02/deposit-warning/hotline-165', mode: 'single',
    right: '返回體驗',
    sourceToken: '${surfaceId}/hotline-165',
  }),
  surface({
    scenario: 'scenario02', surface: '入金前紅色警示・已停止',
    file: 'src/pages/scenario02/components/RedWarning.jsx',
    surfaceId: 'scenario02/deposit-warning/stopped', mode: 'single',
    right: '繼續觀看詐騙如何發展',
    sourceToken: '${surfaceId}/stopped',
  }),
  surface({
    scenario: 'scenario02', surface: '安全驗證金前紅色警示',
    file: 'src/pages/scenario02/components/RedWarning.jsx',
    surfaceId: 'scenario02/topup-warning', mode: 'dual',
    namedIn: 'src/pages/scenario02/TopupWarning.jsx',
    left: '停止付款', right: '我已了解，仍要繼續',
    notes: '這一頁在主線上（AD-23），因此以 hotline={false} 關掉 165 按鈕：畫面上的兩顆按鈕與 LEFT／RIGHT 一一對應，沒有第三顆只有 touch 能操作的控制。也因此本頁沒有 .../hotline-165 surface。',
  }),
  surface({
    scenario: 'scenario02', surface: '安全驗證金前紅色警示・已停止',
    file: 'src/pages/scenario02/components/RedWarning.jsx',
    surfaceId: 'scenario02/topup-warning/stopped', mode: 'single',
    right: '查看結果',
    sourceToken: '${surfaceId}/stopped',
  }),
  surface({
    scenario: 'scenario02', surface: '資金安全驗證',
    file: 'src/pages/scenario02/GuaranteePage.jsx',
    surfaceId: 'scenario02/guarantee', mode: 'single', right: '完成驗證',
  }),
  surface({
    scenario: 'scenario02', surface: '資金安全驗證・處理中',
    file: 'src/pages/scenario02/GuaranteePage.jsx',
    surfaceId: 'scenario02/guarantee-processing', mode: 'display',
  }),
  surface({
    scenario: 'scenario02', surface: '帳戶凍結',
    file: 'src/pages/scenario02/GuaranteePage.jsx',
    surfaceId: 'scenario02/guarantee/frozen', mode: 'single',
    right: '查看發生了什麼事',
  }),

  // ------------------------------------------------------------ scenario 03
  surface({
    scenario: 'scenario03', surface: '手機鎖定畫面（來電自動響起）',
    file: 'src/pages/scenario03/PhoneHome.jsx',
    surfaceId: 'scenario03/phone-home', mode: 'display',
    notes: '第一幕是一支放著的鎖定手機：時間、日期、桌布、狀態列，沒有 App grid，也沒有任何說明文字。玩家不需要操作，幾秒後陌生來電自己打進來。回訪用的「桌面只剩網路銀行」畫面（scenario03/phone-home/open-bank）已隨這段流程一起移除——銀行改由 LINE 的網址卡進入。',
  }),
  surface({
    scenario: 'scenario03', surface: '陌生來電',
    file: 'src/pages/scenario03/IncomingCall.jsx',
    surfaceId: 'scenario03/incoming-call', mode: 'single',
    right: '接聽',
    notes: '「先傳簡訊查證」這個多餘入口（以及它帶出的簡訊畫面）已移除，玩家不需要先按傳訊息才進得了承辦員警的對話。這通來電現在只剩「接聽」一個正式操作，和假檢察官來電、員警重新來電的響鈴畫面一致。',
  }),
  surface({
    scenario: 'scenario03', surface: '通話第一階段（字幕播放中）',
    file: 'src/pages/scenario03/CallStage1.jsx',
    surfaceId: 'scenario03/call-stage1', mode: 'display',
  }),
  surface({
    scenario: 'scenario03', surface: '通話第一階段・二選一',
    file: 'src/pages/scenario03/CallStage1.jsx',
    surfaceId: 'scenario03/call-stage1/<momentKey>', mode: 'dual',
    left: 'options[0]', right: 'options[1]',
    sourceToken: 'scenario03/call-stage1/${player.choice.momentKey}',
    notes: 'momentKey = call.ownership。',
  }),
  surface({
    scenario: 'scenario03', surface: '通話第一階段・繼續',
    file: 'src/pages/scenario03/CallStage1.jsx',
    surfaceId: 'scenario03/call-stage1/continue', mode: 'single',
    right: '前往 LINE',
  }),
  surface({
    scenario: 'scenario03', surface: '加入 LINE 好友',
    file: 'src/pages/scenario03/LineAdd.jsx',
    surfaceId: 'scenario03/line-add', mode: 'single', right: '加入好友',
  }),
  surface({
    scenario: 'scenario03', surface: 'LINE 案件說明（訊息播放中／資料卡）',
    file: 'src/pages/scenario03/LineIntro.jsx',
    surfaceId: 'scenario03/line-intro', mode: 'display',
    notes: '訊息播放中，畫面上沒有任何可執行的控制：案件資料卡只有欄位，footer 也還沒出現。案件狀態查詢卡一出現就換成下面的 open-case-site（single）。',
  }),
  surface({
    scenario: 'scenario03', surface: 'LINE 案件說明・二選一',
    file: 'src/pages/scenario03/LineIntro.jsx',
    surfaceId: 'scenario03/line-intro/<momentKey>', mode: 'dual',
    left: 'options[0]', right: 'options[1]',
    sourceToken: 'scenario03/line-intro/${player.choice.momentKey}',
    notes: 'momentKey = line.cooperate。',
  }),
  surface({
    scenario: 'scenario03', surface: 'LINE 案件說明・開啟案件網站',
    file: 'src/pages/scenario03/LineIntro.jsx',
    surfaceId: 'scenario03/line-intro/open-case-site', mode: 'single',
    right: '開啟案件網站',
    notes: '案件狀態查詢卡自己帶著 開啟案件狀態查詢 按鈕，比 footer 早約四秒出現；兩顆是同一個 toCaseSite，所以卡片一進 transcript 就宣告 single。',
  }),
  surface({
    scenario: 'scenario03', surface: '假案件網站・任務清單',
    file: 'src/pages/scenario03/CaseSite.jsx',
    surfaceId: 'scenario03/case-site', mode: 'single',
    right: '開啟目前解鎖的任務',
    notes: '四個任務同一時間只有一個是解鎖的，其餘不是已完成就是 disabled，所以是 single。',
  }),
  surface({
    scenario: 'scenario03', surface: '假案件網站・文件',
    file: 'src/pages/scenario03/CaseSite.jsx',
    surfaceId: 'scenario03/case-site/document', mode: 'single',
    right: '已閱讀，返回',
  }),
  surface({
    scenario: 'scenario03', surface: '假案件網站・同意書',
    file: 'src/pages/scenario03/CaseSite.jsx',
    surfaceId: 'scenario03/case-site/consent', mode: 'single',
    right: '送出同意書',
  }),
  surface({
    scenario: 'scenario03', surface: '假案件網站・任務全部完成',
    file: 'src/pages/scenario03/CaseSite.jsx',
    surfaceId: 'scenario03/case-site/complete', mode: 'display',
    notes: '正常流程走不到：關閉同意書不會把第四個任務標成已完成，只有 送出同意書 會，而它同時離開這個畫面。留著是給「同一個 session 簽完再回來」的情況，那種情況本來就會被 mount guard 導走。',
  }),
  surface({
    scenario: 'scenario03', surface: '假檢察官來電',
    file: 'src/pages/scenario03/ProsecutorCall.jsx',
    surfaceId: 'scenario03/prosecutor-call/answer', mode: 'single',
    right: '接聽',
    notes: '這通來電確實只有「接聽」一個操作。',
  }),
  surface({
    scenario: 'scenario03', surface: '假檢察官通話（字幕播放中）',
    file: 'src/pages/scenario03/ProsecutorCall.jsx',
    surfaceId: 'scenario03/prosecutor-call', mode: 'display',
  }),
  surface({
    scenario: 'scenario03', surface: '假檢察官掛斷（約 1.1 秒的通話結束畫面）',
    file: 'src/pages/scenario03/ProsecutorCall.jsx',
    surfaceId: 'scenario03/prosecutor-call/ended', mode: 'display',
    notes: '檢察官掛斷、clearActiveCall 之後的短暫過場；接著原承辦員警會自己重新來電。畫面上沒有任何可按的東西。',
  }),
  surface({
    scenario: 'scenario03', surface: '假檢察官通話・二選一',
    file: 'src/pages/scenario03/ProsecutorCall.jsx',
    surfaceId: 'scenario03/prosecutor-call/<momentKey>', mode: 'dual',
    left: 'options[0]', right: 'options[1]',
    sourceToken: 'scenario03/prosecutor-call/${player.choice.momentKey}',
    notes: 'momentKey = prosecutor.account。',
  }),
  surface({
    scenario: 'scenario03', surface: '原承辦員警重新來電（響鈴中）',
    file: 'src/pages/scenario03/PoliceCallback.jsx',
    surfaceId: 'scenario03/police-callback/answer', mode: 'single',
    right: '接聽',
    notes: '檢察官掛斷後，原承辦員警重新來電——這是一通獨立的來電，玩家必須自己接聽。和本情境其他來電畫面一樣，響鈴時只有「接聽」一個操作。',
  }),
  surface({
    scenario: 'scenario03', surface: '原承辦員警通話（接聽後，語音播放中）',
    file: 'src/pages/scenario03/PoliceCallback.jsx',
    surfaceId: 'scenario03/police-callback', mode: 'display',
    notes: '接聽後 police_callback_intro 自己播完，播完自動前往 LINE 資金監管任務卡。這段沒有任何玩家操作。',
  }),
  surface({
    scenario: 'scenario03', surface: '資金監管任務卡（語音／訊息播放中）',
    file: 'src/pages/scenario03/LineCustody.jsx',
    surfaceId: 'scenario03/line-custody', mode: 'display',
  }),
  surface({
    scenario: 'scenario03', surface: '資金監管任務卡・偵查佐傳來的網址卡',
    file: 'src/pages/scenario03/LineCustody.jsx',
    surfaceId: 'scenario03/line-custody/open-bank-site', mode: 'single',
    right: '開啟好匯銀行安全驗證頁面',
    notes: '偵查佐在 LINE 傳來一張「好匯銀行 HOWEI BANK」的網址預覽卡；點卡片和 RIGHT 走的是同一個 handler（openBankSite），所以觸控和手勢不可能導到不同地方。',
  }),
  surface({
    scenario: 'scenario03', surface: '好匯銀行網站・登入',
    file: 'src/pages/scenario03/BankSite.jsx',
    surfaceId: 'scenario03/bank/login', mode: 'single', right: '登入',
    sourceToken: 'scenario03/bank/${stage}',
  }),
  surface({
    scenario: 'scenario03', surface: '好匯銀行網站・帳戶總覽',
    file: 'src/pages/scenario03/BankSite.jsx',
    surfaceId: 'scenario03/bank/overview', mode: 'single', right: '轉帳',
    sourceToken: 'scenario03/bank/${stage}',
  }),
  surface({
    scenario: 'scenario03', surface: '好匯銀行網站・轉帳（唯一轉帳操作）',
    file: 'src/pages/scenario03/BankSite.jsx',
    surfaceId: 'scenario03/bank/transfer', mode: 'single',
    right: '下一步',
    sourceToken: 'scenario03/bank/${stage}',
  }),
  surface({
    scenario: 'scenario03', surface: '好匯銀行網站・確認交易',
    file: 'src/pages/scenario03/BankSite.jsx',
    surfaceId: 'scenario03/bank/confirm', mode: 'single', right: '確認交易',
    sourceToken: 'scenario03/bank/${stage}',
  }),
  surface({
    scenario: 'scenario03', surface: '最後一個決定',
    file: 'src/pages/scenario03/FinalDecision.jsx',
    surfaceId: 'scenario03/final-decision', mode: 'dual',
    left: '確認轉帳', right: '撥打 165',
    notes: 'LEFT/RIGHT 依畫面上兩顆按鈕的既有順序。',
  }),
  surface({
    scenario: 'scenario03', surface: '轉帳完成後・LINE（檢察官要你等消息）',
    file: 'src/pages/scenario03/Aftermath.jsx',
    surfaceId: 'scenario03/aftermath/wait', mode: 'display',
    sourceToken: 'scenario03/aftermath/${stage === \'timeskip\' ? \'timeskip\' : \'wait\'}',
    notes: '只有「完成轉帳」分支會走到；自動敘事，畫面上沒有任何可按的東西。',
  }),
  surface({
    scenario: 'scenario03', surface: '轉帳完成後・「幾天後」過場',
    file: 'src/pages/scenario03/Aftermath.jsx',
    surfaceId: 'scenario03/aftermath/timeskip', mode: 'display',
    sourceToken: 'scenario03/aftermath/${stage === \'timeskip\' ? \'timeskip\' : \'wait\'}',
    notes: '約 2.4 秒的時間過場，接著回到 LINE。',
  }),
  surface({
    scenario: 'scenario03', surface: '轉帳完成後・兩個帳號都消失',
    file: 'src/pages/scenario03/Aftermath.jsx',
    surfaceId: 'scenario03/aftermath/continue', mode: 'single',
    right: '查看結果',
    notes: '員警與檢察官兩個 LINE 帳號都已不存在；這一段沒有新的二選一，只有一個往結局的出口。',
  }),

  // ------------------------------------------------------------ scenario 04
  surface({
    scenario: 'scenario04', surface: '模擬手機桌面',
    file: 'src/pages/scenario04/SimPhoneHome.jsx',
    surfaceId: 'scenario04/phone-home', mode: 'single', right: '開啟黑皮購物',
  }),
  surface({
    scenario: 'scenario04', surface: '黑皮購物開場動畫',
    file: 'src/pages/scenario04/blackpi/hosts.jsx',
    surfaceId: 'scenario04/blackpi-splash', mode: 'display',
  }),
  surface({
    scenario: 'scenario04', surface: '黑皮首頁・商品選擇',
    file: 'src/apps/blackpi/screens/Home.jsx',
    surfaceId: 'blackpi/home', mode: 'dual',
    left: 'VEXA FLEX X1 旗艦摺疊手機', right: '智慧掃拖機器人',
    notes: '首頁有兩個劇情商品卡（固定左右）。同一畫面上的搜尋列、通知鈴、BottomNav、裝飾商品列都不宣告，而且自 inert chrome 修正後三者（Touch / Mouse / Gesture）皆不可操作 —— 這正是 contract 存在的理由。',
  }),
  surface({
    scenario: 'scenario04', surface: '商品詳情',
    file: 'src/apps/blackpi/screens/ProductDetail.jsx',
    surfaceId: 'blackpi/product-detail', mode: 'dual',
    left: '賣家聊聊', right: '直接購買',
  }),
  surface({
    scenario: 'scenario04', surface: '商品詳情・找不到商品',
    file: 'src/apps/blackpi/screens/ProductDetail.jsx',
    surfaceId: 'blackpi/product-not-found', mode: 'single', right: '回首頁',
  }),
  surface({
    scenario: 'scenario04', surface: '結帳確認',
    file: 'src/apps/blackpi/screens/Checkout.jsx',
    surfaceId: 'blackpi/checkout', mode: 'single', right: '確認付款',
  }),
  surface({
    scenario: 'scenario04', surface: '結帳確認・無商品',
    file: 'src/apps/blackpi/screens/Checkout.jsx',
    surfaceId: 'blackpi/checkout-empty', mode: 'display',
  }),
  surface({
    scenario: 'scenario04', surface: '付款成功',
    file: 'src/pages/scenario04/blackpi/hosts.jsx',
    surfaceId: 'scenario04/payment-success', mode: 'single', right: '查看訂單',
  }),
  surface({
    scenario: 'scenario04', surface: '訂單詳情（尚未送達）',
    file: 'src/apps/blackpi/screens/OrderDetail.jsx',
    surfaceId: 'blackpi/order-detail', mode: 'single', right: '查看最新物流',
  }),
  surface({
    scenario: 'scenario04', surface: '訂單詳情・物流更新中',
    file: 'src/apps/blackpi/screens/OrderDetail.jsx',
    surfaceId: 'blackpi/order-detail-montage', mode: 'display',
    notes: 'UI 上按鈕 disabled，gesture 同步失效。',
  }),
  surface({
    scenario: 'scenario04', surface: '訂單詳情・已送達',
    file: 'src/apps/blackpi/screens/OrderDetail.jsx',
    surfaceId: 'blackpi/order-detail/unbox', mode: 'single', right: '拆開包裹',
  }),
  surface({
    scenario: 'scenario04', surface: '訂單詳情・已開爭議',
    file: 'src/apps/blackpi/screens/OrderDetail.jsx',
    surfaceId: 'blackpi/order-detail/aftersales', mode: 'single',
    right: '查看售後進度',
  }),
  surface({
    scenario: 'scenario04', surface: '賣家聊聊（對方輸入中）',
    file: 'src/pages/scenario04/SellerChat.jsx',
    surfaceId: 'scenario04/seller-chat', mode: 'display',
  }),
  surface({
    scenario: 'scenario04', surface: '賣家聊聊・玩家回覆',
    file: 'src/pages/scenario04/SellerChat.jsx',
    surfaceId: 'scenario04/seller-chat/<nodeId>', mode: 'dual',
    left: 'pendingChoices[0]', right: 'pendingChoices[1]',
    sourceToken: 'scenario04/seller-chat/${engine.currentNodeId}',
    notes: '售前對話所有 node 都是二選一。',
  }),
  surface({
    scenario: 'scenario04', surface: '收貨開箱（四個單一操作節點）',
    file: 'src/pages/scenario04/Unboxing.jsx',
    surfaceId: 'scenario04/unboxing/<stage>', mode: 'single',
    right: '拆開外箱／把東西全部拿出來看看／查看商品頁與實際內容／先問賣家是不是寄錯了',
    sourceToken: 'scenario04/unboxing/${stage}',
  }),
  surface({
    scenario: 'scenario04', surface: '賣家售後對話（對方輸入中）',
    file: 'src/pages/scenario04/DisputeChat.jsx',
    surfaceId: 'scenario04/dispute-chat', mode: 'display',
  }),
  surface({
    scenario: 'scenario04', surface: '賣家售後對話・玩家回覆',
    file: 'src/pages/scenario04/DisputeChat.jsx',
    surfaceId: 'scenario04/dispute-chat/<nodeId>', mode: 'dual',
    left: 'pendingChoices[0]', right: 'pendingChoices[1]',
    sourceToken: 'scenario04/dispute-chat/${engine.currentNodeId}',
  }),
  surface({
    scenario: 'scenario04', surface: '退貨申請',
    file: 'src/pages/scenario04/ReturnRequest.jsx',
    surfaceId: 'scenario04/return-request', mode: 'single',
    right: '提交退貨申請',
    notes: '送出後按鈕被狀態列取代，contract 以 disabled 同步失效。',
  }),
  surface({
    scenario: 'scenario04', surface: '退貨確認對話（對方輸入中）',
    file: 'src/pages/scenario04/ReturnAckChat.jsx',
    surfaceId: 'scenario04/return-ack', mode: 'display',
  }),
  surface({
    scenario: 'scenario04', surface: '退貨確認對話・玩家回覆',
    file: 'src/pages/scenario04/ReturnAckChat.jsx',
    surfaceId: 'scenario04/return-ack/<nodeId>', mode: 'single',
    right: 'pendingChoices[0]',
    sourceToken: 'scenario04/return-ack/${engine.currentNodeId}',
    notes: '這段對話只有一個回覆節點，所以是 single；同一段程式碼在兩個回覆時會是 dual。',
  }),
  surface({
    scenario: 'scenario04', surface: '退貨寄件',
    file: 'src/pages/scenario04/ReturnShipping.jsx',
    surfaceId: 'scenario04/return-shipping', mode: 'single',
    right: '我已完成寄件',
  }),
  surface({
    scenario: 'scenario04', surface: '退貨物流',
    file: 'src/pages/scenario04/ReturnLogistics.jsx',
    surfaceId: 'scenario04/return-logistics', mode: 'single',
    right: '完成退貨寄件（推進物流）',
    notes: 'montage 期間 disabled，與按鈕一致。',
  }),
  surface({
    scenario: 'scenario04', surface: '退貨物流・賣家已簽收',
    file: 'src/pages/scenario04/ReturnLogistics.jsx',
    surfaceId: 'scenario04/return-logistics/received', mode: 'single',
    right: '查看退款進度',
  }),
  surface({
    scenario: 'scenario04', surface: '退款拖延／賣家失聯（對方輸入中）',
    file: 'src/pages/scenario04/RefundDelayChat.jsx',
    surfaceId: 'scenario04/refund-delay', mode: 'display',
  }),
  surface({
    scenario: 'scenario04', surface: '退款拖延・玩家回覆',
    file: 'src/pages/scenario04/RefundDelayChat.jsx',
    surfaceId: 'scenario04/refund-delay/<nodeId>', mode: 'dual',
    left: 'pendingChoices[0]', right: 'pendingChoices[1]',
    sourceToken: 'scenario04/refund-delay/${engine.currentNodeId}',
    notes: '前三個節點只有一個回覆（single），unreachable.notice 是二選一（dual）。',
  }),
  surface({
    scenario: 'scenario04', surface: '黑皮退款中心',
    file: 'src/pages/scenario04/RefundCenter.jsx',
    surfaceId: 'scenario04/refund-center', mode: 'single',
    right: '聯絡黑皮安心客服',
  }),
  surface({
    scenario: 'scenario04', surface: '黑皮客服（對方輸入中）',
    file: 'src/pages/scenario04/PlatformSupportChat.jsx',
    surfaceId: 'scenario04/platform-support', mode: 'display',
  }),
  surface({
    scenario: 'scenario04', surface: '黑皮客服・玩家回覆',
    file: 'src/pages/scenario04/PlatformSupportChat.jsx',
    surfaceId: 'scenario04/platform-support/<nodeId>', mode: 'dual',
    left: 'pendingChoices[0]', right: 'pendingChoices[1]',
    sourceToken: 'scenario04/platform-support/${engine.currentNodeId}',
    notes: '安心專員的「繼續要求平台負責／聯絡 165 報案」是本情境的最終決定。唯一例外見 AR_MIGRATION_BLOCKERS。',
  }),
  surface({
    scenario: 'scenario04', surface: '我的訂單（BottomNav）',
    file: 'src/pages/scenario04/blackpi/hosts.jsx',
    surfaceId: 'scenario04/orders', mode: 'single', right: '開啟訂單',
    notes: '非主線。BottomNav 已是純裝飾，本畫面只能由訂單詳情的返回進入。',
  }),
  surface({
    scenario: 'scenario04', surface: '我的訂單・尚無訂單',
    file: 'src/pages/scenario04/blackpi/hosts.jsx',
    surfaceId: 'scenario04/orders-empty', mode: 'display',
  }),
  surface({
    scenario: 'scenario04', surface: '訊息匣（BottomNav）',
    file: 'src/pages/scenario04/blackpi/hosts.jsx',
    surfaceId: 'scenario04/messages', mode: 'dual',
    left: '賣家對話', right: '黑皮客服',
    notes: '非主線。BottomNav 已是純裝飾，分頁不可點；畫面本身的兩個對話入口仍可操作。',
  }),
  surface({
    scenario: 'scenario04', surface: '我的（BottomNav）',
    file: 'src/pages/scenario04/blackpi/hosts.jsx',
    surfaceId: 'scenario04/me', mode: 'dual',
    left: '退款中心', right: '客服',
    notes: '非主線。BottomNav 已是純裝飾。音效開關是裝置設定，不是劇情操作。',
  }),
  surface({
    scenario: 'scenario04', surface: '我的・尚未選定商品線',
    file: 'src/pages/scenario04/blackpi/hosts.jsx',
    surfaceId: 'scenario04/me-empty', mode: 'display',
  }),
  surface({
    scenario: 'scenario04', surface: '分類（BottomNav）',
    file: 'src/pages/scenario04/blackpi/hosts.jsx',
    surfaceId: 'scenario04/category', mode: 'display',
  }),

  // ------------------------------------------------------------ scenario 05
  surface({
    scenario: 'scenario05', surface: '手機桌面',
    file: 'src/pages/scenario05/MarketplacePhoneHome.jsx',
    surfaceId: 'scenario05/phone-home', mode: 'single', right: '開啟買東東',
  }),
  surface({
    scenario: 'scenario05', surface: '買東東首頁',
    file: 'src/pages/scenario05/MarketplaceHome.jsx',
    surfaceId: 'scenario05/marketplace-home', mode: 'single', right: '刊登商品',
    notes: 'tab bar 是假 App chrome，不宣告。',
  }),
  surface({
    scenario: 'scenario05', surface: '選擇要出售的商品',
    file: 'src/apps/mydondon/screens/ProductSelect.jsx',
    surfaceId: 'mydondon/product-select', mode: 'dual',
    left: 'products[0]', right: 'products[1]',
    notes: 'App 層宣告：畫面本身就是這個二選一決定，並沿用按鈕自己的防連點 disabled。',
  }),
  surface({
    scenario: 'scenario05', surface: '刊登完成・買家來訊',
    file: 'src/pages/scenario05/MarketplaceListing.jsx',
    surfaceId: 'scenario05/listing', mode: 'single', right: '開啟對話',
  }),
  surface({
    scenario: 'scenario05', surface: '刊登完成・無商品',
    file: 'src/pages/scenario05/MarketplaceListing.jsx',
    surfaceId: 'scenario05/listing-empty', mode: 'display',
  }),
  surface({
    scenario: 'scenario05', surface: '買家對話（對方輸入中）',
    file: 'src/pages/scenario05/BuyerChat.jsx',
    surfaceId: 'scenario05/buyer-chat', mode: 'display',
  }),
  surface({
    scenario: 'scenario05', surface: '買家對話・玩家回覆',
    file: 'src/pages/scenario05/BuyerChat.jsx',
    surfaceId: 'scenario05/buyer-chat/<nodeId>', mode: 'dual',
    left: 'pendingChoices[0]', right: 'pendingChoices[1]',
    sourceToken: 'scenario05/buyer-chat/${engine.currentNodeId}',
    notes: 'buyer.s07.explain 就是本情境的最終決定；buyer.s09.gone 只有一個回覆，走同一段程式碼的 single 分支。',
  }),
  surface({
    scenario: 'scenario05', surface: 'SafeDeal・建立賣場',
    file: 'src/pages/scenario05/ShopCreate.jsx',
    surfaceId: 'scenario05/shop-create', mode: 'single', right: '建立交易',
    notes: '送出後 disabled，contract 同步。',
  }),
  surface({
    scenario: 'scenario05', surface: 'SafeDeal・交易安全提醒',
    file: 'src/pages/scenario05/TradeInfo.jsx',
    surfaceId: 'scenario05/trade-info', mode: 'single', right: '返回聊天',
  }),
  surface({
    scenario: 'scenario05', surface: '買東東官方訂單（空的）',
    file: 'src/pages/scenario05/MarketplaceOrders.jsx',
    surfaceId: 'scenario05/mydondon-orders', mode: 'single', right: '返回聊天',
  }),
  surface({
    scenario: 'scenario05', surface: 'SafeDeal・收款狀態',
    file: 'src/pages/scenario05/SafeDealPaymentStatus.jsx',
    surfaceId: 'scenario05/safedeal-payment-status', mode: 'single', right: '聯繫客服',
  }),
  surface({
    scenario: 'scenario05', surface: 'SafeDeal 假客服（對方輸入中／身分驗證進度）',
    file: 'src/pages/scenario05/SafeDealSupportChat.jsx',
    surfaceId: 'scenario05/safedeal-support', mode: 'display',
    notes: '自動播放與模擬認證進度期間沒有可執行動作，手勢不得沿用上一個畫面的操作。',
  }),
  surface({
    scenario: 'scenario05', surface: 'SafeDeal 假客服・玩家回覆',
    file: 'src/pages/scenario05/SafeDealSupportChat.jsx',
    surfaceId: 'scenario05/safedeal-support/<nodeId>', mode: 'dual',
    left: 'pendingChoices[0]', right: 'pendingChoices[1]',
    sourceToken: 'scenario05/safedeal-support/${engine.currentNodeId}',
    notes: 'cs.flow 是唯一的轉帳決定；cs.done 只有一個回覆，走同一段程式碼的 single 分支。',
  }),
  surface({
    scenario: 'scenario05', surface: 'SafeDeal・模擬轉帳確認',
    file: 'src/pages/scenario05/SafeDealTransfer.jsx',
    surfaceId: 'scenario05/safedeal-transfer', mode: 'single', right: '確認模擬轉帳',
    notes: '整個情境只會發生一次；確認後整份宣告被換掉（見下一列），手勢無法重複觸發第二次扣款。',
  }),
  surface({
    scenario: 'scenario05', surface: 'SafeDeal・模擬轉帳已完成',
    file: 'src/pages/scenario05/SafeDealTransfer.jsx',
    surfaceId: 'scenario05/safedeal-transfer-done', mode: 'single', right: '返回客服對話',
  }),
  surface({
    scenario: 'scenario05', surface: '黑皮通寄件',
    file: 'src/pages/scenario05/HpeShip.jsx',
    surfaceId: 'scenario05/hpe-ship', mode: 'single',
    right: '寄出／查看對話',
    notes: 'Phase 1 已接，本次未改寫，只驗證仍正確（montage 期間 disabled）。',
  }),
  surface({
    scenario: 'scenario05', surface: '款項處理中',
    file: 'src/pages/scenario05/OrderGone.jsx',
    surfaceId: 'scenario05/order-gone-processing', mode: 'display',
    notes: 'Phase 1 已接，本次未改寫。',
  }),
  surface({
    scenario: 'scenario05', surface: '賣場已不存在',
    file: 'src/pages/scenario05/OrderGone.jsx',
    surfaceId: 'scenario05/order-gone', mode: 'single', right: '查看結果',
    notes: 'Phase 1 已接，本次未改寫。',
  }),
];

// Story surfaces deliberately NOT migrated in Phase 2, with the reason. Each
// entry must name the instruction that put it out of scope - "we ran out of
// time" is not a reason that belongs here.
export const AR_MIGRATION_EXCLUSIONS = [
  {
    scenario: 'scenario04',
    surface: '黑皮購物・搜尋頁',
    file: 'src/apps/blackpi/screens/Search.jsx',
    reason: 'Phase 2 明確要求不處理 BlackPi search 的 product decision（search input 仍是 AR Interaction Audit 的 REPORT exception）。主線的商品選擇走首頁的兩張劇情商品卡（blackpi/home, dual），搜尋是非主線分支，AR 下不可達。',
  },
  {
    scenario: 'scenario04',
    surface: '黑皮購物・搜尋結果',
    file: 'src/apps/blackpi/screens/SearchResults.jsx',
    reason: '同上：只能從搜尋頁進入，屬於同一個被排除的分支。',
  },
];

// Places where the STORY, not the migration, is not AR-ready yet: a screen
// whose player decision genuinely has more than two options. The contract has
// exactly two gestures, so such a surface could only ever be declared
// `display` - no gesture would run anything, and a player on the glasses would
// be stuck on it.
//
// This list is EMPTY, and that is the point. The last three-option prompt in
// the five scenarios (shared.platform.agent.argue.pick) was narrowed to two in
// the same change that finished this migration. A new entry here would not be
// somewhere to park a problem: it would mean a flow had been made unplayable
// on the glasses. scripts/ar-interaction-migration.test.mjs fails on ANY
// dialogue node with more than two options, listed here or not.
export const AR_MIGRATION_BLOCKERS = [];

// A migrated area is expected to exercise all three geometries. Where one is
// genuinely absent, the reason belongs here rather than in a test's head.
// 目前是空的：shared 原本缺 display，唯一的理由是共用畫面（進入畫面、結局／
// 疑點分析、反詐小測驗）都是玩家要操作的畫面。AR 掃描頁改成「先提示、再由玩家
// 決定進入」之後，`ar-scan/scanning`（還沒發現線索，RIGHT 不得做任何事）就是
// shared 真正的 display surface，那條例外因此不再成立，直接刪掉而不是留著。
export const AR_MIGRATION_GEOMETRY_EXEMPTIONS = [];

export const AR_MIGRATION_MODES = Object.freeze(['display', 'single', 'dual']);
