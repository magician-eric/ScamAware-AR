// English dictionary for scenario01 (Money Trap / fake investment scam).
// Keyed directly off the Chinese source string exactly as it appears in the
// codebase - see ./i18n.js for how this is looked up. This is a
// localization pass, not a literal translation: chat/dialogue reads the
// way an actual American investor-scam target would see it (a "trading
// guru" ad, a LINE group full of fake testimonials, a slick fake trading
// app, a withdrawal "deposit" demand); platform/UI text (buttons,
// warnings, quiz copy) stays clear and formal, matching a real app's tone.
// Currency amounts keep the original NT$ (New Taiwan Dollar) notation and
// LINE/VIP/165 stay as-is, since the scam is set on a Taiwan-based fake
// platform. Any first full mention of the 165 hotline spells out "Taiwan
// 165 Anti-Fraud Hotline" for a non-Taiwanese reader; later mentions on the
// same page may shorten to "the 165 Hotline".
export const EN = {
  // ---------------------------------------------------------------------
  // Shared / repeated across multiple files
  // ---------------------------------------------------------------------
  '返回': 'Back',
  '搜尋': 'Search',
  '通話': 'Call',
  '選單': 'Menu',
  '首頁': 'Home',
  '查看 165 提醒': 'See the 165 Reminder',

  // ---------------------------------------------------------------------
  // pages/scenario01/Briefing.jsx
  // ---------------------------------------------------------------------
  '財富陷阱｜假投資詐騙': 'Money Trap | Fake Investment Scam',
  '案件辨識成功': 'Case Flagged',
  '疑似假投資詐騙。你將看到社群廣告、投資老師影片、LINE 群組、假平台與出金保證金的完整流程。':
    "Suspected fake investment scam. You're about to see the whole playbook — a social media ad, a \"trading guru\" video, a LINE group, a fake trading platform, and a withdrawal \"deposit\" demand.",
  '開始案件': 'Start the Case',

  // ---------------------------------------------------------------------
  // pages/scenario01/Feed.jsx
  // ---------------------------------------------------------------------
  '繼續案件，了解更多': 'Continue the case, learn more',
  '了解更多': 'Learn More',
  '陳老師・AI 智慧投資': 'Coach Chen · AI Smart Investing',
  'AI 智慧選股，精準預測漲跌 📈\n穩定獲利，讓財富自動增值 💰\n加入我們的 VIP 投資團隊，與我一起實現財務自由！🔥\n名額有限，立即私訊了解詳情👇':
    'AI stock picks that call every move 📈\nSteady profits, growing your wealth on autopilot 💰\nJoin our VIP Investment Team and reach financial freedom with me! 🔥\nLimited spots — DM me now for details 👇',
  '立即加入 VIP 投資團隊': 'Join the VIP Investment Team Now',
  '8.7萬': '87K',
  '165則留言': '165 comments',
  '987次分享': '987 shares',
  '讚': 'Like',
  '留言': 'Comment',
  '分享': 'Share',
  '跟老師兩週，本金已經翻了快一倍，終於敢跟家人炫耀了！': "Two weeks with the coach and my principal's almost doubled — finally brave enough to brag to my family!",
  '老師這次的判斷也太準了吧，K 線一出來就照他說的走。': 'The coach called it again — the candles moved exactly like he said they would.',
  '看了好幾天了，我也想加入 VIP，要怎麼私訊？': "I've been watching for days, I want to join VIP too — how do I DM?",
  '請問老師這邊現在還可以加入嗎？': 'Is it still possible to join the coach right now?',
  '已經私訊老師了，等通知中，好期待！': "Already DM'd the coach, waiting to hear back — so excited!",
  'VIP 團隊還有名額嗎？我怕我來晚了。': "Are there still spots on the VIP team? Hope I'm not too late.",
  '我朋友上個月就加入了，說真的有賺，我也想跟。': 'My friend joined last month and says it really pays off — I want in too.',
  '還好昨天有趕上老師的提醒，不然又錯過一次。': "Glad I caught the coach's alert yesterday, or I'd have missed it again.",
  '42': '42', '18': '18', '65': '65', '9': '9', '130': '130', '24': '24', '77': '77', '3': '3',
  '1小時': '1h', '2小時': '2h', '3小時': '3h', '4小時': '4h', '5小時': '5h', '6小時': '6h', '1天': '1d',

  // ---------------------------------------------------------------------
  // pages/scenario01/VideoTeacher.jsx
  // ---------------------------------------------------------------------
  '30 天掌握飆股趨勢': 'Master Breakout Stocks in 30 Days',
  '贊助內容': 'Sponsored',
  '陳老師 AI 選股直播': "Coach Chen's AI Trading Signals Livestream",
  'AI 智慧選股．精準預測漲跌．穩定獲利': 'AI Trading Signals · High-Accuracy Market Calls · Consistent Returns',
  '影片載入失敗': 'Video Failed to Load',
  '重新播放': 'Play Again',
  '繼續播放': 'Continue Playing',
  '陳老師站在白板前，背景有 K 線圖、AI 分析圖、會員獲利截圖。':
    'Coach Chen stands in front of a whiteboard, with candlestick charts, AI analysis graphics, and member profit screenshots in the background.',
  '🔥 開播 3 天': '🔥 Live for 3 Days',
  '好評留言 500+': '500+ Positive Comments',
  '2.8 萬人按讚': '28K Likes',
  '加入 LINE 了解更多': 'Add LINE to Learn More',
  '⚠ AI 即時辨識': '⚠ AI Live Detection',
  '高風險投資話術': 'High-Risk Investment Pitch',
  '偵測到關鍵字：保證獲利、穩賺不賠。合法投資不得保證收益。若有人承諾穩賺不賠，請立即提高警覺。':
    'Flagged keywords: "guaranteed returns," "can\'t lose." Legitimate investments can never guarantee returns. If someone promises you a sure thing, treat it as an immediate red flag.',
  '⚠ AI 即時辨識：偵測到高風險投資話術——保證獲利、穩賺不賠。合法投資不得保證收益，請提高警覺。':
    '⚠ AI LIVE DETECTION: High-risk investment pitch flagged — "guaranteed returns," "can\'t lose." Legitimate investments can never guarantee returns. Stay alert.',
  '繼續觀看': 'Keep Watching',

  // ---------------------------------------------------------------------
  // pages/scenario01/LineTeacher.jsx
  // ---------------------------------------------------------------------
  '您好😊\n歡迎加入陳老師 AI 選股體驗。': "Hi there 😊\nWelcome to Coach Chen's AI Stock-Picking experience.",
  '剛剛看到您是從 AI 選股直播課進來的，想先了解一下您的需求。':
    "Saw you came in from the AI stock-picking livestream — wanted to check in on what you're looking for.",
  '請問您目前比較傾向哪一種方式？': 'Which approach sounds more like you right now?',

  '我想直接跟老師操作': 'I want to trade directly alongside the coach',
  '我想先自己試試看': 'I want to try it myself first',

  '沒問題😊\n很多新朋友一開始也是希望有人帶著操作，這樣比較安心。':
    'No problem 😊\nA lot of new members start out wanting someone to guide them — it just feels safer that way.',
  '老師平常不會在公開頁面直接公布標的，主要是在 VIP 群組裡即時分享盤勢和操作策略。':
    "The coach doesn't post picks on the public page. He shares real-time market calls and strategy inside the VIP group.",
  '我可以先邀請您進群，等等老師有新的操作提醒，您就能第一時間看到。':
    "I can add you to the group now, so you'll see it the moment he posts a new alert.",

  '可以理解😊\n很多學員一開始也是想先自己研究看看。':
    'Totally understandable 😊\nA lot of members start out wanting to research things on their own first.',
  '老師不會強迫大家跟單，您也可以先進 VIP 群組觀察大家每天怎麼分析市場。':
    'The coach never pressures anyone to copy his trades. You can just join the VIP group first and watch how everyone breaks down the market every day.',
  '裡面會有老師的盤勢解析、學員交流和操作紀錄，您可以先學習，不一定要馬上投入。':
    "You'll find the coach's market breakdowns, member discussion, and trade logs in there. You can just learn for now — no need to put money in right away.",
  '而且群組目前免費，不懂的地方也可以直接發問。':
    "And the group's free to join right now. Feel free to ask questions if anything's unclear.",
  '我先幫您開通 VIP 群組邀請，您進去看看大家怎麼操作就好。':
    "I'll go ahead and send you a VIP group invite — just take a look at how everyone's trading.",

  '投資小助理 {investmentAssistant}': 'Investment Assistant {investmentAssistant}',
  '加入 VIP 群組': 'Join the VIP Group',

  // ---------------------------------------------------------------------
  // pages/scenario01/VipGroup.jsx
  // ---------------------------------------------------------------------
  '你已加入群組。': "You've joined the group.",
  '陳老師：今天盤勢很漂亮，AI 模型剛剛抓到一檔短線標的。':
    "Coach Chen: Market's looking great today. The AI model just flagged a short-term pick.",
  '{investmentAssistant}：新朋友可以先觀察，老師等等會公布操作方向。':
    '{investmentAssistant}: New members, just watch for now — the coach will post the trade direction shortly.',
  '阿凱：我昨天跟老師那檔，今天開盤就拉上去了，真的有點誇張。':
    "Kai: I followed the coach's pick yesterday and it shot up right at the open today. Kind of insane, honestly.",
  'Jenny：我剛剛試著出金，已經入帳了，謝謝老師。':
    'Jenny: Just tried withdrawing and it already hit my account. Thanks, Coach!',
  '股海小白：原本只是進來看看，沒想到三天就有收益。':
    "StockRookie: I only joined to look around — wasn't expecting a profit within 3 days.",
  '王先生：我今天先小額跟 1 萬，想先試水溫。':
    'Mr. Wang: Putting in a small NT$10,000 today, just testing the waters.',
  '小雅：早上看帳面多了 2,800，雖然不多但很有感。':
    "Yaya: Checked this morning and I'm up NT$2,800 on paper. Not huge, but it feels real.",
  '{investmentAssistant}：目前下午場名額剩 12 位，還沒補資料的我會一對一提醒。':
    "{investmentAssistant}: Only 12 spots left for this afternoon's session. I'll DM anyone who still needs to finish their registration.",
  'Kevin：昨天照老師提醒停利，剛剛本金跟獲利都回到帳戶了。':
    'Kevin: Took profit yesterday like the coach said — principal and gains both just landed back in my account.',
  '財富自由ing：我先把上週獲利留下來，今天準備再加碼一點。':
    "FIRE_InProgress: Leaving last week's profits in for now. Thinking about adding a bit more today.",
  '陳老師：今天這檔不適合猶豫，下午 2 點前完成入金，晚上我會公布操作策略。':
    "Coach Chen: No time to hesitate on this one today. Get your deposit in before 2 PM — I'll post the strategy tonight.",
  '{investmentAssistant}：還沒完成註冊的新朋友，請先點下方連結開通帳戶。':
    "{investmentAssistant}: New members who haven't registered yet — tap the link below to activate your account first.",
  '陳老師：完成平台註冊後把帳號截圖私訊助理，方便我安排今晚的操作名單。':
    "Coach Chen: Once you've registered on the platform, screenshot your account and DM it to the assistant so I can add you to tonight's trade list.",

  '陳老師 AI 飆股': "Coach Chen's AI Breakout Stocks",
  '165 人': '165 Members',
  '前往註冊平台': 'Go to Platform Registration',
  'AI 提示': 'AI Alert',
  '偵測到高風險投資訊息：': 'High-risk investment activity detected:',
  '大量獲利截圖、短時間快速收益、成功出金回報。':
    'A flood of profit screenshots, suspiciously fast short-term gains, and withdrawal success stories.',
  '這類內容可能是詐騙集團安排的暗樁話術，': 'This kind of content may be planted by the scam ring as fake social proof.',
  '請勿僅依據群組訊息作為投資判斷。': "Don't base any investment decision on group chat messages alone.",
  '繼續體驗': 'Continue the Experience',
  '⚠ AI 提示：偵測到高風險投資訊息——大量獲利截圖、短時間快速收益、成功出金回報。這類內容可能是詐騙集團安排的暗樁話術，請勿僅依據群組訊息作為投資判斷。':
    '⚠ AI ALERT: High-risk investment activity detected — a flood of profit screenshots, suspiciously fast gains, and withdrawal success stories. This content may be planted by the scam ring as fake social proof. Don\'t base any investment decision on group chat messages alone.',

  // ---------------------------------------------------------------------
  // pages/scenario01/PlatformRegister.jsx
  // ---------------------------------------------------------------------
  '查看 AI 智慧量化合約持股': 'View AI Quant Contract Holdings',
  '前往下一步': 'Continue',

  // ---------------------------------------------------------------------
  // pages/scenario01/Profit.jsx
  // ---------------------------------------------------------------------
  '資產總覽': 'Asset Overview',
  '提領': 'Withdraw',
  '投資': 'Invest',
  '投入本金：NT$300,000': 'Principal Invested: NT$300,000',
  '申請提領': 'Request Withdrawal',
  'AI 智慧量化合約': 'AI Smart Quant Contract',
  '震盪上漲的 K 線圖': 'A candlestick chart trending upward with volatility',
  '本日收益': "Today's Return",
  '兩週收益': '2-Week Return',
  '本月收益': '1-Month Return',

  // ---------------------------------------------------------------------
  // pages/scenario01/WithdrawFail.jsx
  // ---------------------------------------------------------------------
  '系統通知': 'System Notification',
  '出金失敗': 'Withdrawal Failed',
  '您的帳戶尚未完成高級會員驗證。為保障資金安全，請先支付保證金 NT$30,000。完成後即可立即提領本金與獲利。請於 24 小時內完成，以免帳戶凍結。':
    "Your account hasn't completed Premium Member verification yet. To protect the security of your funds, please pay a NT$30,000 security deposit first. Once complete, you can withdraw your principal and earnings immediately. Please finish this within 24 hours or your account will be frozen.",
  '確認支付': 'Confirm Payment',
  '稍後處理': 'Not Now',
  '平台要求先支付 NT$30,000 保證金才能出金。出金前要求付款，是常見的假投資詐騙手法。合法投資不會要求你先付錢，才能拿回自己的錢。':
    'The platform demands a NT$30,000 deposit before withdrawal. Demanding payment before a withdrawal is a common fake-investment scam tactic. A legitimate investment will not make you pay before returning your own money.',

  // Scenario 01 outcome pages (shared ScenarioOutcome). The 詐騙成立 /
  // 成功反詐 status, the 請記住 label and the CTA are the Outcome System's own
  // (components/outcome/outcomeStrings.js), so they are no longer listed here.
  '累計損失 NT$330,000': 'Total Loss: NT$330,000',
  '前期投入': 'Previous investment', '追加保證金': 'Additional deposit', '累計損失': 'Total loss',
  '先前投入的資金已無法正常提領。平台再以保證金、稅金、手續費、解凍費或驗證金要求付款，通常是要讓損失繼續擴大。': 'The money already invested can no longer be withdrawn normally. When a platform demands a deposit, tax, processing fee, unfreezing fee, or verification payment, it is usually trying to increase the loss.',
  '要求你再付一筆錢，才能拿回原本投入的資金，是重大詐騙警訊。': 'Being told to pay again before recovering money already invested is a major fraud warning sign.',
  '成功停手': 'Stopped in Time', '避免損失再擴大': 'Prevented the loss from growing',
  '前期已投入': 'Already invested', '本次避免追加': 'Additional payment avoided', '結果': 'Result', '成功避免損失繼續增加': 'Successfully prevented further loss',
  '當平台要求再支付一筆錢才能出金時，停止付款是正確的第一步。接下來應保存交易與對話紀錄，向 165 或警方查證，並拒絕任何追加付款理由。': 'When a platform demands another payment before withdrawal, stopping is the right first step. Save transaction and chat records, verify with the Taiwan 165 Anti-Fraud Hotline or police, and reject every reason for another payment.',
  '停手不是代表前面的錢已經安全，而是避免損失繼續擴大。': 'Stopping does not mean the money already paid is safe; it prevents the loss from growing.',

  // ---------------------------------------------------------------------
  // pages/scenario01/Analysis.jsx (shared FraudClueAnalysis)
  // ---------------------------------------------------------------------
  '社群廣告以「老師」名義主打高獲利': 'A sponsored post sells high returns in a "teacher\'s" name',
  '影片與頭銜營造投資專業的權威感': 'The video and the titles manufacture investment authority',
  '引導加 LINE，由「投資助理」一對一帶單': 'You are moved to LINE, where an "investment assistant" guides you one-to-one',
  'VIP 群組不斷貼出獲利截圖': 'The VIP group posts profit screenshots non-stop',
  '被帶到陌生投資平台註冊並入金': 'You are taken to an unfamiliar platform to register and deposit',
  '要出金時才被要求先支付保證金': 'Only when you try to withdraw are you told to pay a deposit first',
  '出金前要求付款，是假投資詐騙最明顯的警訊。遇到疑似詐騙，請保留對話與交易紀錄，立即撥打 165 或就近向警方求證。': 'Being asked to pay before a withdrawal is the clearest sign of a fake-investment scam. Keep your chat and transaction records, and verify immediately with the Taiwan 165 Anti-Fraud Hotline or your local police.',

  // ---------------------------------------------------------------------
  // pages/scenario01/WithdrawFail.jsx (FraudWarningBanner title)
  // ---------------------------------------------------------------------
  '⚠ 165 案例比對成功': '⚠ Matched a Known Taiwan 165 Fraud Case',

  // ---------------------------------------------------------------------
  // pages/scenario01/Quiz.jsx (shared ScenarioFinalDecision)
  // ---------------------------------------------------------------------
  '反詐小測驗': 'Anti-Fraud Quiz',
  '返回掃描': 'Back to Scan',
  '✅ 判斷正確': '✅ Correct',
  '❌ 判斷錯誤': '❌ Incorrect',
  '你已經看到帳面獲利，但平台要求先繳保證金才能出金。你會怎麼做？':
    "You've seen the paper profits, but the platform says you need to pay a security deposit before you can withdraw. What do you do?",
  '先支付保證金，趕快把獲利領出來。': 'Pay the deposit first and rush to withdraw the profits.',
  '停止付款，查詢 165 或向警方求證。': 'Stop paying, and verify with the Taiwan 165 Anti-Fraud Hotline or the police.',
  '請對方直接從獲利裡面扣款就好。': "Ask them to just deduct the fee from your profits instead.",
  '出金前要求付款，是假投資詐騙常見警訊。一旦支付保證金，對方通常會再要求稅金、手續費或帳戶解凍金，你可能永遠無法提領本金與獲利。遇到疑似詐騙，請保留對話與交易紀錄，立即撥打 165 或就近向警方求證。':
    "Being asked to pay before you can withdraw is a classic red flag of a fake investment scam. Once you pay the deposit, they'll usually come back asking for tax, processing fees, or an unfreezing fee next — you may never be able to withdraw your principal or profits at all. If you suspect fraud, save your chat logs and transaction records, then call the Taiwan 165 Anti-Fraud Hotline or go to your nearest police station right away.",
  // The LINE quick-reply prompt on the coach's chat. It reached t() from
  // LineTeacher and had no entry here, so it rendered Chinese in EN and JP.
  '選擇一個回覆': 'Pick a reply',
};
