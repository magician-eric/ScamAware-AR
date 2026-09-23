// English dictionary for the Coin Winner (幣勝客 / BITION) App module.
//
// The App owns its UI, so it owns its UI copy: every string here is rendered
// by a screen or component under apps/coin-winner/ and by nothing else. It used
// to live in Scenario 02's dictionary, which made a story
// module the owner of another module's buttons and tabs (§13 AD-14). The
// values are the ones that were already on screen, moved across unchanged -
// this was an ownership move, not a re-translation.
//
// Keyed off the Chinese source string exactly as it appears in the JSX, the
// same convention every dictionary in this repo uses; see
// shared/i18n/createTranslator.js for how a key is looked up and what happens
// when one is missing. Grouped by the file that renders each string.
//
// A label another App also renders (返回, 首頁, 訊息) is deliberately repeated
// in that App's own table rather than shared: ownership follows the UI, not
// the spelling (spec section 3.6).
export const EN = {
  // apps/coin-winner/DepositPage.jsx
  '運行中': 'Running',
  '啟用 AI 智慧套利策略': 'Activate the AI Smart Arbitrage Strategy',
  '換算': 'Converted',
  '約 NT$10,000': 'Approx. NT$10,000',
  '完成入金': 'Confirm Deposit',
  '入金處理中……': 'Processing deposit…',
  '入金成功': 'Deposit Successful',
  '已到帳': 'has been credited',
  '首次結算倒數：23:59:42': 'First settlement countdown: 23:59:42',
  '幣勝客': '',
  '入金金額': 'Deposit Amount',
  '防詐風險提醒': 'Fraud Risk Alert',

  // apps/coin-winner/PlatformHome.jsx
  'AI 智慧套利策略': 'AI Smart Arbitrage Strategy',
  '全球多市場套利': 'Global Multi-Market Arbitrage',
  '預估日收益': 'Est. Daily Return',
  '結算資產': 'Settlement Asset',
  '策略市場': 'Strategy Market',
  '累積收益': 'Cumulative Earnings',
  '今日收益': "Today's Earnings",
  '等待啟用': 'Waiting to Activate',
  '市場': 'Market',
  '策略': 'Strategy',
  '資產': 'Assets',
  '我的': 'Me',
  '全球趨勢池': 'Global Trend Pool',
  '跨市場套利池': 'Cross-Market Arbitrage Pool',
  '智能網格池': 'Smart Grid Pool',
  '20:31:12　跨市場價差捕捉　+12.6 CIBDT': '20:31:12   Cross-market spread capture   +12.6 CIBDT',
  '20:31:08　智能網格結算　　+8.2 CIBDT': '20:31:08   Smart grid settlement           +8.2 CIBDT',
  '20:30:54　全球趨勢套利　　+16.4 CIBDT': '20:30:54   Global trend arbitrage          +16.4 CIBDT',
  '20:30:41　跨市場價差捕捉　+9.8 CIBDT': '20:30:41   Cross-market spread capture     +9.8 CIBDT',
  '20:30:22　智能網格結算　　+11.3 CIBDT': '20:30:22   Smart grid settlement          +11.3 CIBDT',
  '通知': 'Notifications',
  '帳戶': 'Account',
  '我的資產': 'My Assets',
  '轉換': 'Convert',
  '紀錄': 'History',
  '全球多市場價格差自動追蹤': 'Auto-tracks price gaps across global markets',
  '策略類型': 'Strategy Type',
  '穩健型': 'Steady',
  '即時策略執行紀錄': 'Live Execution Feed',
  '運行節點': 'Active Nodes',
  'CIBDT 餘額': 'CIBDT Balance',
  '推薦人': 'Referrer',
  '服務條款': 'Terms of Service',
  '使用者服務協議': 'User Service Agreement',
  '首頁': 'Home',
  '入金': 'Deposit',
  '提領': 'Withdraw',
  '目前狀態': 'Current Status',
  '資產總覽': 'Asset Overview',

  // apps/coin-winner/ReturnBar.jsx
  // The one control that ends a visit to the platform. It is the App's own
  // button, so the App says it in three languages - the same rule every other
  // label here follows (§13 AD-14: ownership follows the UI).
  '返回 LINE 對話': 'Back to LINE Chat',

  // apps/coin-winner/PlatformLanding.jsx
  '全球運行節點': 'Active Global Nodes',
  '今日策略執行': 'Strategies Executed Today',
  '24,856 次': '24,856',
  '平台資產規模': 'Total Platform Assets',
  '讓 AI 為你捕捉全球市場價差': 'Let AI capture global market spreads for you',
  '24 小時智能策略運行': 'Smart strategies running around the clock',
  '即時追蹤全球多市場套利機會': 'Real-time tracking of arbitrage opportunities across global markets',
  '開始使用': 'Get Started',
  'AI 智慧數位資產交易': 'AI-Powered Digital Asset Trading',

  // apps/coin-winner/PlatformRegister.jsx
  '快速註冊': 'Quick Sign-Up',
  '手機號碼': 'Phone Number',
  '登入密碼': 'Password',
  '確認密碼': 'Confirm Password',
  '推薦碼': 'Referral Code',
  '✓ 已閱讀並同意《使用者服務協議》與《風險揭露聲明》': "✓ I've read and agree to the User Service Agreement and Risk Disclosure Statement",
  '建立帳戶': 'Create Account',
  '建立中……': 'Creating account…',
  '帳戶建立成功': 'Account Created Successfully',

  // apps/coin-winner/TradingPage.jsx
  '立即啟用': 'Activate Now',
  '系統透過全球市場價差，自動執行套利配置。': 'The system automatically executes arbitrage trades based on price gaps across global markets.',
  '策略週期': 'Strategy Cycle',
  '24 小時自動運行': 'Runs automatically, 24 hours a day',
  '最低啟用金額': 'Minimum to Activate',

  // apps/coin-winner/WithdrawalPage.jsx
  '總資產估值': 'Total Asset Value',
  '可提領資產': 'Available to Withdraw',
  '預計到帳': 'Estimated Arrival',
  '確認提領': 'Confirm Withdrawal',
  '提領申請審核中……': 'Withdrawal request under review…',
  '提領暫時無法完成': 'Withdrawal Temporarily Unavailable',
  '您的帳戶尚未完成資金安全驗證。完成驗證後，即可恢復完整提領權限。': "Your account hasn't completed funds security verification yet. Once verified, your full withdrawal access will be restored.",
  '完成安全驗證': 'Complete Security Verification',
  '申請提領': 'Request a Withdrawal',
  '資金安全驗證金': 'Funds Security Verification Fee',
};
