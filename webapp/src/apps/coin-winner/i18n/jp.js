// Japanese dictionary for the Coin Winner (幣勝客 / BITION) App module.
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
//
// The internal locale code for Japanese is always 'jp', never 'ja'.
export const JP = {
  // apps/coin-winner/DepositPage.jsx
  '運行中': '稼働中',
  '啟用 AI 智慧套利策略': 'AIスマート裁定戦略を起動する',
  '換算': '換算',
  '約 NT$10,000': '約NT$10,000',
  '完成入金': '入金を確定する',
  '入金處理中……': '入金処理中……',
  '入金成功': '入金完了',
  '已到帳': 'が入金されました',
  '首次結算倒數：23:59:42': '初回決済までのカウントダウン：23:59:42',
  '幣勝客': '',
  '入金金額': '入金額',
  '防詐風險提醒': '詐欺リスク警告',

  // apps/coin-winner/PlatformHome.jsx
  'AI 智慧套利策略': 'AIスマート裁定戦略',
  '全球多市場套利': 'グローバル・マルチマーケット裁定',
  '預估日收益': '想定日利',
  '結算資產': '決済資産',
  '策略市場': '戦略マーケット',
  '累積收益': '累積収益',
  '今日收益': '本日の収益',
  '等待啟用': '起動待ち',
  '市場': 'マーケット',
  '策略': '戦略',
  '資產': '資産',
  '我的': 'マイページ',
  '全球趨勢池': 'グローバルトレンドプール',
  '跨市場套利池': 'クロスマーケット裁定プール',
  '智能網格池': 'スマートグリッドプール',
  '20:31:12　跨市場價差捕捉　+12.6 CIBDT': '20:31:12　クロスマーケット価格差捕捉　+12.6 CIBDT',
  '20:31:08　智能網格結算　　+8.2 CIBDT': '20:31:08　スマートグリッド決済　　　　+8.2 CIBDT',
  '20:30:54　全球趨勢套利　　+16.4 CIBDT': '20:30:54　グローバルトレンド裁定　　　+16.4 CIBDT',
  '20:30:41　跨市場價差捕捉　+9.8 CIBDT': '20:30:41　クロスマーケット価格差捕捉　+9.8 CIBDT',
  '20:30:22　智能網格結算　　+11.3 CIBDT': '20:30:22　スマートグリッド決済　　　　+11.3 CIBDT',
  '通知': '通知',
  '帳戶': 'アカウント',
  '我的資產': '保有資産',
  '轉換': '両替',
  '紀錄': '履歴',
  '全球多市場價格差自動追蹤': 'グローバル市場の価格差を自動追跡',
  '策略類型': '戦略タイプ',
  '穩健型': '安定型',
  '即時策略執行紀錄': 'リアルタイム実行履歴',
  '運行節點': '稼働ノード数',
  'CIBDT 餘額': 'CIBDT残高',
  '推薦人': '紹介者',
  '服務條款': '利用規約',
  '使用者服務協議': 'ユーザーサービス規約',
  '首頁': 'ホーム',
  '入金': '入金',
  '提領': '出金',
  '目前狀態': '現在のステータス',
  '資產總覽': '資産概要',

  // apps/coin-winner/ReturnBar.jsx
  '返回 LINE 對話': 'LINEのトークに戻る',

  // apps/coin-winner/PlatformLanding.jsx
  '全球運行節點': '稼働中のグローバルノード数',
  '今日策略執行': '本日の戦略実行回数',
  '24,856 次': '24,856回',
  '平台資產規模': 'プラットフォーム資産総額',
  '讓 AI 為你捕捉全球市場價差': 'AIがあなたに代わって世界の市場価格差を捉える',
  '24 小時智能策略運行': '24時間365日、スマート戦略が自動稼働',
  '即時追蹤全球多市場套利機會': '世界のマルチマーケット裁定機会をリアルタイムで追跡',
  '開始使用': '今すぐ始める',
  'AI 智慧數位資產交易': 'AIによるデジタル資産取引',

  // apps/coin-winner/PlatformRegister.jsx
  '快速註冊': 'かんたん登録',
  '手機號碼': '電話番号',
  '登入密碼': 'ログインパスワード',
  '確認密碼': 'パスワード確認',
  '推薦碼': '紹介コード',
  '✓ 已閱讀並同意《使用者服務協議》與《風險揭露聲明》': '✓「利用者サービス規約」および「リスク開示声明」を確認し、同意しました',
  '建立帳戶': 'アカウントを作成する',
  '建立中……': '作成中……',
  '帳戶建立成功': 'アカウント作成が完了しました',

  // apps/coin-winner/TradingPage.jsx
  '立即啟用': '今すぐ起動する',
  '系統透過全球市場價差，自動執行套利配置。': 'システムが世界市場の価格差を分析し、自動で裁定取引を実行します。',
  '策略週期': '戦略サイクル',
  '24 小時自動運行': '24時間自動稼働',
  '最低啟用金額': '最低起動金額',

  // apps/coin-winner/WithdrawalPage.jsx
  '總資產估值': '総資産評価額',
  '可提領資產': '出金可能資産',
  '預計到帳': '入金予定額',
  '確認提領': '出金を確定する',
  '提領申請審核中……': '出金申請審査中……',
  '提領暫時無法完成': '出金を一時的に完了できません',
  '您的帳戶尚未完成資金安全驗證。完成驗證後，即可恢復完整提領權限。': 'お客様のアカウントはまだ資金セキュリティ認証が完了していません。認証完了後、出金機能がすべて回復します。',
  '完成安全驗證': 'セキュリティ認証を完了する',
  '申請提領': '出金申請',
  '資金安全驗證金': '資金セキュリティ認証金',
};
