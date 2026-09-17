// English dictionary for scenario05 (Ghost Order). Keyed directly off the
// Chinese source string used throughout webapp/src/pages/scenario05,
// webapp/src/apps/mydondon, webapp/src/pages/scenario05/components and
// webapp/src/data/scenario05Dialogues.js - see ./i18n.js for how this is
// looked up.
//
// Brand names: MyDonDon 買東東 -> MyDonDon (never translated, never
// re-cased - spec section 47), 黑皮通 -> HPE. SafeDeal (the fake external
// trading site the buyer links the player to - see
// data/scenario05FakeSite.js) is a wholly fictional brand kept in Roman
// letters across every language, the same way HPE is. Fictional domains
// (safe-deal.tw), NT$ amounts and the 165 hotline number are also left
// unchanged across all three languages.
export const EN = {
  // -----------------------------------------------------------------------
  // MyDonDon shell: header / bottom nav / chat screen
  // -----------------------------------------------------------------------
  '瀏覽器選單': 'Browser menu',
  '返回': 'Back',
  '快速回覆': 'Quick replies',
  '在線上': 'Online',
  '已加入 MyDonDon 4 年 ・ 有一般生活貼文\n共同社團：二手交易交流':
    'On MyDonDon for 4 years · Shares everyday life posts\nShared group: Secondhand Trading Exchange',

  // -----------------------------------------------------------------------
  // apps/mydondon/screens/MyDonDonOrders.jsx - "目前沒有新的交易訂單"
  // -----------------------------------------------------------------------
  '返回對話': 'Back to Conversation',

  // -----------------------------------------------------------------------
  // data/scenario05Dialogues.js - buildBuyerTree (marketplaceBuyer)
  // -----------------------------------------------------------------------
  '你好～請問這台{product}還在嗎？': 'Hi! Is this {product} still available?',
  '你好～請問這台{product}還在嗎？…': 'Hi! Is this {product} still available?...',
  '如果還在的話我滿有興趣的，想再跟你確認一下狀況。': 'If it’s still available I’m definitely interested—I’d love to check a few more details with you.',
  '如果還在的話我滿有興趣的，功能都正常的話我應該會想收。': 'If it’s still available I’m definitely interested—if everything’s working fine I’d probably want it.',
  '還在，你想怎麼交易？': 'It is. How would you like to do the handoff?',
  '還在，需要我再拍商品細節給你嗎？': 'It is. Want me to send a few more close-up photos?',
  '不用～照片看起來沒問題，我可以直接收。': 'No need—the photos look good. I’m happy to take it.',

  // Stroller-line persona buildup (single-parent persona, gender-neutral
  // wording so either the mom or dad persona can say every line unmodified).
  '太好了，我最近剛好一直在找二手的。': 'Oh good—I’ve actually been looking for a secondhand one lately.',
  '因為我自己一個人帶小孩，平常抱著他又要拿東西，出門真的有點吃不消 😅': 'I’m raising my kid on my own, so carrying them while also holding everything else makes going out pretty exhausting 😅',
  '辛苦你了，這台狀況還不錯。': 'That sounds tough. This one’s in pretty good shape.',
  '了解，那你是想約時間面交嗎？': 'Got it—were you thinking of setting up a time to meet in person?',
  '新的對我來說有點貴，所以才想找狀況好一點的二手。': 'A new one’s a bit pricey for me, so I’ve been hoping to find a used one in good condition.',
  '你這台如果使用都正常的話，我真的很想買。': 'If everything on yours works fine, I’d really love to buy it.',
  '都正常，你可以放心。': 'Everything works fine, don’t worry.',
  '功能都測過，沒問題的。': 'I’ve tested everything—it’s all good.',

  // Tablet-line persona buildup (budget-conscious college student).
  '我是大學生，最近上課真的很需要一台平板做筆記。': 'I’m a college student, and I really need a tablet for taking notes in class these days.',
  '老師現在很多資料都直接丟 PDF，用手機看真的很不方便 😅': 'A lot of professors just send everything as PDFs now, and reading them on my phone is really inconvenient 😅',
  '手機螢幕真的太小了，做筆記也不方便。': 'A phone screen really is too small, and it’s awkward for notes too.',
  '了解，那你主要是想拿來做什麼？': 'Got it—so what would you mainly use it for?',
  '本來有想買筆電，可是預算真的不太夠。': 'I did consider a laptop, but it’s a bit more than my budget can handle right now.',
  '想說我主要就是上課看資料、做筆記，平板其實就夠用了。': 'Since I’m mainly just reading course material and taking notes, a tablet should really be enough.',
  '平板應付上課應該沒問題。': 'A tablet should handle classwork just fine.',
  '了解，那你是想找什麼價位的？': 'Got it—what price range are you looking for?',
  '所以最近才一直在找二手的，你這台如果功能都正常的話，我真的很想買。': 'That’s why I’ve been looking for a used one—if everything on yours works fine, I’d really love to buy it.',

  '好，那我就照你說的方式建立賣場。': 'Okay, I’ll set up the listing the way you described.',
  '我先確認一下官方交易流程。': 'Let me check the official transaction process first.',
  '好，我看過安全提醒了，我照你說的方式建立賣場。': 'Okay, I’ve read the safety notice—I’ll set up the listing the way you described.',
  '好，我建立好再傳給你。': "Okay, I'll set it up and send it to you.",
  '我通常只接受面交或平台內交易。': 'I usually only do in-person meetups or deals inside the marketplace app.',
  '賣場建立好了嗎？連結傳給我就可以了～': 'Is the listing ready? Just send me the link!',
  '好，我現在去建立。': "Okay, I'll go create it now.",
  '賣場建立成功 ✓': 'Shop created successfully ✓',
  '我建立好了，這是賣場連結：': "It's set up — here's the shop link:",

  // -----------------------------------------------------------------------
  // The SafeDeal pitch, the missing order, and - after the fake
  // verification detour - the push to ship. Brand marks follow the rule at
  // the top of this file: 買東東 reads MyDonDon and 黑皮通 reads HPE in
  // every language, including inside a line of dialogue.
  // -----------------------------------------------------------------------
  '我確定要買～不過我平常都用 SafeDeal 交易，覺得對買賣雙方比較有保障。':
    "I'm definitely buying it! I usually use SafeDeal because I feel it offers more protection for both buyers and sellers.",
  '你只要建立這個商品的專屬賣場，把連結傳給我，我就能直接付款。':
    'All you need to do is create a listing for this item and send me the link. Then I can pay right away.',
  '我知道你會擔心，但我也是第一次跟你交易啊。我都願意先付款了，你至少可以先看看流程吧？':
    "I understand you're worried, but this is my first time dealing with you too. I'm willing to pay first, so could you at least take a look at the process?",
  '我自己一個人帶小孩，真的不太方便一直出門面交。原本以為你願意幫我用這個方式交易……':
    "I'm raising my child on my own, so meeting up in person is really difficult. I thought you'd be willing to use this method for me...",
  '我上課跟打工的時間都排滿了，真的很難另外約面交。原本以為這樣交易可以讓我們都省點時間……':
    'My classes and part-time job take up almost all my time, so arranging an in-person meetup is really hard. I thought this way would save us both some time...',
  '好了～我這邊已經付款完成了！你那邊應該可以看到交易資訊了。':
    "All done! I've completed the payment on my end. You should be able to see the transaction information now.",
  '奇怪，買東東怎麼沒有這筆訂單？': "That's strange. Why isn't this order showing up on MyDonDon?",
  '因為我們這次不是走買東東付款，所以買東東本來就不會有這筆訂單啊。':
    "That's because we're not paying through MyDonDon this time, so of course the order won't appear there.",
  '我這邊都已經照流程付款了，你現在才說找不到訂單，我也很困擾耶。':
    "I've already followed the process and paid. It's frustrating for me too that you're only now saying you can't find the order.",
  '你先回 SafeDeal 看一下好不好？不要還沒確認，就覺得是我沒有付款。':
    "Could you check SafeDeal first? Please don't assume I haven't paid before you've even checked.",
  '沒有官方訂單，也沒有入帳，我先停止交易。':
    "There's no order on the original platform and no payment in my account. I'll stop this transaction.",
  '我再去 SafeDeal 確認一下。': "I'll check SafeDeal again.",
  '客服那邊應該都跟你說明了吧？我這邊付款早就完成了，現在就等你寄出了。':
    "Support should have explained everything to you by now, right? I finished paying ages ago. I'm just waiting for you to ship it.",
  '我是真的有需要才跟你買的，也一直很有耐心在等。你現在又說要等入帳，我真的不知道還要等多久……':
    "I genuinely need this item, and I've been waiting patiently. Now you're saying you want to wait until the money reaches your account? I honestly don't know how much longer I'm supposed to wait...",
  '你不是說今天可以寄嗎？如果你不想賣，也可以直接跟我說，不用讓我一直等。':
    "Didn't you say you could ship it today? If you don't want to sell it anymore, you can just tell me instead of keeping me waiting.",
  '還沒確認實際入帳，我先不寄件。': "I haven't confirmed that the money is actually in my account. I won't ship it yet.",
  '我相信對方，使用黑皮通寄件。': "I'll trust them and ship the item through HPE.",

  // The buyer vanishes: the item has been delivered, the seller asks about
  // the money, and no one is there. Two plain status rows, no warning copy.
  '商品已經送到了，請問款項大概什麼時候會入帳？': "The item's been delivered—when should I expect the payment to come through?",
  '訊息傳送失敗': 'Message failed to send',
  '此帳號已不存在': 'This account no longer exists',
  '查看 {brand} 款項': 'Check the payment on {brand}',

  // -----------------------------------------------------------------------
  // pages/scenario05/ShopCreate.jsx
  // -----------------------------------------------------------------------
  '商品名稱': 'Item Name',
  '商品價格': 'Item Price',
  '配送方式': 'Delivery Method',
  '黑皮通超商取貨': 'HPE Convenience Store Pickup',
  '安全交易・安心收付': 'Secure trades, protected payments',
  '寄件人資料（預填）': 'Sender Info (Pre-filled)',
  '{name} ・ {phone}': '{name} · {phone}',
  '建立專屬交易': 'Create a Dedicated Trade',
  '建立交易': 'Create Trade',
  '建立中…': 'Creating…',
  '交易已建立': 'Trade Created',
  '專屬交易連結已產生': 'Your dedicated trade link is ready',

  // -----------------------------------------------------------------------
  // pages/scenario05/TradeInfo.jsx
  // -----------------------------------------------------------------------
  '交易安全提醒': 'Transaction Safety',
  '建立賣場與查看交易資訊，請以本站頁面顯示的內容為準。': 'For listing creation and transaction details, refer to what this site shows you.',
  '客服聯絡方式請以官方網站「客服中心」所列資訊為準。': 'Use only the contact details listed in the official website’s Support Center.',
  '平台不會要求賣家透過非官方管道設定收款功能。': 'HPE will never ask sellers to set up payment receiving through an unofficial channel.',
  '返回聊天': 'Back to Chat',

  // -----------------------------------------------------------------------
  // pages/scenario05/HpeShip.jsx - real 黑皮通 logistics
  // -----------------------------------------------------------------------
  '寄件': 'Shipping',
  '包裹': 'Parcel',
  '寄件編號': 'Shipment Number',
  '目前狀態': 'Current Status',
  '準備寄件': 'Ready to Ship',
  '物流方式': 'Delivery Method',
  '物流進度': 'Shipping Progress',
  '已收件': 'Picked Up',
  '運送中': 'In Transit',
  '已送達': 'Delivered',
  '確認寄件': 'Confirm Shipment',
  '物流更新中…': 'Updating…',

  // -----------------------------------------------------------------------
  // pages/scenario05/OrderGone.jsx - the ghost order reveals itself
  // -----------------------------------------------------------------------
  '款項處理中': 'Processing Payment…',
  '此網站目前無法連上': 'This site can’t currently be reached',
  '賣場已不存在，頁面內容無法顯示。': 'This listing no longer exists. The page content can’t be displayed.',
  '查看結果': 'See the Result',

  // -----------------------------------------------------------------------
  // pages/scenario05/EndingCaught.jsx - 安全結局
  // -----------------------------------------------------------------------
  '成功攔截': 'You Blocked It in Time',
  '沒在官方平台看到訂單與入帳，不要只憑買家提供的畫面寄出商品。': "If you don't see the order and the payment on the official platform, don't ship based only on a screen the buyer shows you.",

  // -----------------------------------------------------------------------
  // pages/scenario05/EndingScammed.jsx - 受騙結局
  // -----------------------------------------------------------------------
  '黑皮通': 'HPE',
  '商品': 'Item',
  '實際入帳': 'Payment actually received',
  '外部交易網站': 'External Trading Site',
  '帳號不存在': 'Account no longer exists',
  '你看到的是假的付款成功頁面，真正的官方平台從未產生訂單。': "What you saw was a fake payment-success page. The real official platform never generated an order.",

  // -----------------------------------------------------------------------
  // pages/scenario05/Reveal.jsx
  // -----------------------------------------------------------------------
  '幽靈訂單是怎麼出現的？': 'How Did the Ghost Order Happen?',

  // -----------------------------------------------------------------------
  // pages/scenario05/Quiz.jsx (shared ScenarioFinalDecision)
  // -----------------------------------------------------------------------
  '反詐小測驗': 'Anti-Fraud Quiz',
  '返回掃描': 'Back to Scan',
  '✅ 判斷正確': '✅ Correct',
  '❌ 判斷錯誤': '❌ Incorrect',

  // -----------------------------------------------------------------------
  // pages/scenario05/SafeDealPaymentStatus.jsx - the fake site’s own
  // "payment receipt status", which is a claim, never a verified fact
  // -----------------------------------------------------------------------
  '收款狀態': 'Payment Receipt Status',
  '買方付款狀態': "Buyer's Payment Status",
  '買方聲稱已付款': 'Buyer claims payment is complete',
  '賣方收款狀態': "Seller's Receipt Status",
  '賣方尚未完成首次收款認證': "Seller's initial payment-receipt verification is incomplete",
  '系統提示': 'System Notice',
  '您的收款功能尚未啟用。請聯繫客服完成首次收款認證。':
    'Your payment-receipt function has not been activated. Please contact customer support to complete the initial verification.',
  '聯繫客服': 'Contact Support',

  // -----------------------------------------------------------------------
  // pages/scenario05/SafeDealSupportChat.jsx + data/scenario05Dialogues.js’s
  // buildSupportTree - SafeDeal’s fake support desk. The refund it promises is
  // the scammer speaking; nothing in the app repeats it as fact.
  // -----------------------------------------------------------------------
  '對方輸入中': 'Other person is typing',
  '客服中心': 'Support Center',
  '您好，系統顯示買方已完成付款，目前卡住的是賣方帳戶的首次收款認證。':
    'Hello. Our system shows that the buyer has completed payment. The transaction is currently held up by the seller account’s initial payment-receipt verification.',
  '這不是買方的問題，也不是客服可以直接幫您略過的步驟。您如果希望這筆交易正常完成，就需要先處理帳戶認證。':
    "This is not an issue on the buyer's side, and customer support cannot skip this step for you. If you want the transaction to proceed, you'll need to complete your account verification first.",
  '我可以協助您完成，但需要您本人配合操作。一直停留在這個畫面，系統是不會自行解除限制的。':
    "I can guide you through it, but you'll need to complete the steps yourself. The restriction won't disappear if you simply stay on this screen.",
  '身分資料確認中……': 'Checking identity information...',
  '身分資料確認完成': 'Identity information check complete',
  '身分資料已確認，但您的帳戶還沒有完成金流驗證，因此目前無法啟用收款。':
    'Your identity information has been confirmed, but your account has not completed payment-flow verification, so the payment-receipt function cannot be activated yet.',
  '您需要先支付一筆 NT${amount} 的驗證金。這只是系統確認收款帳戶的暫時款項，驗證完成後會全額退還。':
    "You'll need to pay a verification deposit of NT${amount} first. This is only a temporary payment to verify your receiving account. The full amount will be refunded once verification is complete.",
  '您前面的身分認證都已經完成了，現在只差最後這個步驟。如果不完成，交易款項就只能繼續保留在系統裡。':
    "You've already completed the identity check. This is the only step left. If you don't complete it, the transaction funds will remain on hold in the system.",
  '是否繼續由您決定，但如果您希望順利收到貨款，就需要先完成這項驗證。':
    'The decision is yours, but if you want to receive the payment, you’ll need to complete this verification first.',
  '收款為什麼要先付錢？我不轉帳。': "Why would I need to pay money just to receive a payment? I'm not transferring anything.",
  '我先完成這次驗證。': "I'll complete this verification.",
  '好的，系統顯示您的金流驗證已完成。交易款項與驗證金將在商品送達後一併撥付。':
    'All right. The system shows that your payment-flow verification is complete. The transaction payment and verification deposit will be released together after the item is delivered.',
  '接下來請依照買賣雙方約定的方式寄出商品即可。':
    'Please proceed with shipping the item using the delivery method agreed upon by you and the buyer.',

  // -----------------------------------------------------------------------
  // pages/scenario05/SafeDealTransfer.jsx - the one simulated transfer.
  // {amount} is filled from data/scenario05Verification.js, never written out.
  // -----------------------------------------------------------------------
  '模擬轉帳確認': 'Simulated Transfer Confirmation',
  '教育模擬｜不會進行真實轉帳': 'Educational simulation | No real transfer will occur',
  '驗證金額': 'Verification Deposit',
  'NT${amount}': 'NT${amount}',
  '確認模擬轉帳': 'Confirm Simulated Transfer',
  '模擬轉帳已完成': 'Simulated transfer complete',
  '返回客服對話': 'Return to Support Chat',

  // -----------------------------------------------------------------------
  // The three結局’s amount rows (EndingCaught / EndingStopped / EndingScammed)
  // -----------------------------------------------------------------------
  '驗證金損失': 'Verification deposit lost',
  '商品損失': 'Item lost',
  '總損失': 'Total loss',
  '未寄出': 'Not shipped',
  '網站無法連線': 'Website inaccessible',

  // -----------------------------------------------------------------------
  // pages/scenario05/EndingCaught.jsx / EndingStopped.jsx / EndingScammed.jsx
  // -----------------------------------------------------------------------
  '你及時識破了這筆交易': 'You spotted the scam in time',
  '買家聲稱已付款，但你沒有查到可信的交易紀錄，也沒有確認實際入帳。你選擇停止交易，沒有轉帳，也沒有寄出商品。':
    'The buyer claimed to have paid, but you found no trustworthy transaction record and could not confirm that the money had reached your account. You stopped the transaction without transferring money or shipping the item.',
  '你保住了商品，但已損失驗證金': 'You saved the item, but lost the verification deposit',
  '你相信假客服的說法，轉出了所謂可退還的驗證金。雖然你在寄件前停下來，保住了商品，但轉出的款項並未退回。':
    'You believed the fake support agent and transferred a supposedly refundable verification deposit. You stopped before shipping and saved the item, but the money you transferred was never returned.',
  '收取貨款不需要先支付驗證金。即使已經轉帳，只要發現異常就應立即停止後續操作，避免連商品也一起損失。':
    "You should never have to pay a verification deposit just to receive payment. Even if you've already transferred money, stop any further action as soon as you notice something suspicious to avoid losing the item as well.",
  '你付出了錢，也失去了商品': 'You lost both your money and your item',
  '你相信假客服，支付了所謂可退還的驗證金，也在尚未確認入帳時寄出商品。商品已送達，但買家帳號消失，SafeDeal 也無法連線。驗證金沒有退回，貨款也沒有入帳。':
    "You believed the fake support agent and paid a supposedly refundable verification deposit. You also shipped the item without confirming that the payment had reached your account. The item was delivered, but the buyer's account disappeared and SafeDeal became inaccessible. The deposit was never refunded, and you never received the sale payment.",

  // -----------------------------------------------------------------------
  // pages/scenario05/Reveal.jsx - the five clues, in the order met
  // -----------------------------------------------------------------------
  '詐騙者後續可能使用的手法：{clue}': 'Tactics the scammer would have used next: {clue}',
  '誘導離開原平台': 'Lured Off the Original Platform',
  '假買家要求你離開原本的交易平台，改用他指定的外部網站。這讓你失去原平台交易紀錄的保護與查證依據。':
    'The fake buyer directed you away from the original marketplace to an external website of their choosing. This removed the original platform’s transaction records as a source of protection and verification.',
  '假付款資訊': 'Fake Payment Information',
  '買家聲稱已付款，假網站也顯示交易資訊，但你始終沒有確認到可信的付款紀錄或實際入帳。':
    'The buyer claimed to have paid, and the fake website displayed transaction information, but you never confirmed a trustworthy payment record or an actual deposit.',
  '假身分驗證': 'Fake Identity Verification',
  '假客服把無法收款歸咎於你的帳戶尚未認證，讓你以為問題出在自己身上，必須依照指示處理。':
    'The fake support agent blamed the payment problem on your unverified account, making you think the problem was yours to fix by following their instructions.',
  '可退還的驗證金': 'The “Refundable” Verification Deposit',
  '假客服宣稱先轉帳一筆驗證金就能開通收款，並承諾全額退還。這是要求你先付錢的詐騙話術，不是真正的收款驗證。':
    'The fake support agent claimed that transferring a verification deposit would activate your ability to receive payment and promised a full refund. This was a scam designed to make you pay first, not a genuine payment verification process.',
  '未入帳就寄件': 'Shipping Before the Money Arrives',
  '即使物流服務是真的，也不代表買家的付款是真的。尚未確認實際入帳就寄出商品，可能同時失去貨款與商品。':
    'Even if the delivery service is genuine, that does not mean the buyer’s payment is genuine. Shipping before confirming the money is in your account can leave you without both the payment and the item.',

  // -----------------------------------------------------------------------
  // pages/scenario05/Quiz.jsx (shared ScenarioFinalDecision)
  // -----------------------------------------------------------------------
  '二手交易時，買家聲稱已付款，但外部網站客服要求你先匯一筆「完成後會退還」的驗證金，才能收到貨款。你應該怎麼做？':
    'During a second-hand sale, the buyer claims to have paid, but support on an external website says you must first transfer a “refundable” verification deposit to receive the payment. What should you do?',
  '拒絕轉帳，停止交易，透過可信管道確認付款。':
    'Refuse to transfer money, stop the transaction, and verify payment through a trustworthy channel.',
  '先匯驗證金，等客服退還後再寄件。': 'Transfer the deposit first and wait for support to refund it before shipping.',
  '收到貨款不應以先匯款給陌生人作為條件。不要只相信買家的付款截圖、外部網站畫面或自稱客服的說法，應透過可信管道確認實際入帳。':
    'Receiving payment should not require you to transfer money to a stranger first. Do not rely solely on the buyer’s payment screenshot, an external website, or someone claiming to be support. Confirm that the money has actually arrived through a trustworthy channel.',

  // -----------------------------------------------------------------------
  // Scenario menu entry blurb
  // -----------------------------------------------------------------------
  '你將以賣家身分刊登商品，買家會要求你到陌生外部網站建立專屬賣場並顯示已付款，誘導你在沒有官方訂單與入帳的情況下把商品寄出。':
    'You will list an item as the seller. The buyer will ask you to set up a dedicated listing on an unfamiliar external site that shows payment as complete, luring you into shipping the item with no order or payment on the official platform.',
};
