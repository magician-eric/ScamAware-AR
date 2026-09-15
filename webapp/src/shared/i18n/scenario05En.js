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

  '我確定要～不過我平常都用 {brand} 這個交易網站，比較有保障。': 'I’m sure I want it—though I usually use {brand} for this kind of deal, it’s more protected.',
  '你只要開一個這個商品的專屬賣場，把連結給我，我直接付款就可以了。': 'Just open a listing just for this item there and send me the link—I’ll pay right away.',
  '喔喔了解～不好意思，我只是之前買二手的時候都習慣這樣交易，覺得超商取貨比較方便。': 'Oh, got it—sorry, I just usually do it this way for secondhand stuff, since convenience-store pickup is easier for me.',
  '如果你不放心也沒關係，我只是想說這樣彼此都比較方便一點 😅': 'If you’d rather not, that’s okay too—I just thought it’d be a bit more convenient for both of us.',
  '而且我自己帶小孩出門真的比較不方便，能省一趟是一趟。': 'And going out with my kid really isn’t easy, so skipping a trip out really helps.',
  '而且我平常上課跟打工時間比較固定，超商取貨對我比較方便，不用另外約時間面交。': 'And my class and part-time work hours are pretty fixed, so convenience-store pickup works better for me—I don’t have to set aside separate time to meet up.',
  '好，那我就照你說的方式建立賣場。': 'Okay, I’ll set up the listing the way you described.',
  '我先確認一下官方交易流程。': 'Let me check the official transaction process first.',
  '好，我看過安全提醒了，我照你說的方式建立賣場。': 'Okay, I’ve read the safety notice—I’ll set up the listing the way you described.',
  '好，我建立好再傳給你。': "Okay, I'll set it up and send it to you.",
  '我通常只接受面交或平台內交易。': 'I usually only do in-person meetups or deals inside the marketplace app.',
  '賣場建立好了嗎？連結傳給我就可以了～': 'Is the listing ready? Just send me the link!',
  '好，我現在去建立。': "Okay, I'll go create it now.",
  '賣場建立成功 ✓': 'Shop created successfully ✓',
  '我建立好了，這是賣場連結：': "It's set up — here's the shop link:",
  '好了～我這邊已經付款完成了！': "Okay—my payment's all done on my end!",
  '你那邊應該可以看到訂單了～': "You should be able to see the order on your end now~",
  '奇怪，買東東怎麼沒有這筆訂單？': "That's odd—why isn't this order showing up on MyDonDon?",
  '因為我們這次不是走買東東付款，所以買東東那邊不會有訂單喔～': "Oh, that's because we didn't pay through MyDonDon this time, so it won't show up there~",
  '我這邊外部賣場已經顯示付款完成了，你再看一下那邊就好～': 'The listing on the other site already shows payment as complete on my end—just take another look there~',
  '沒有官方訂單，也沒有入帳，我先停止交易。': "There's no official order, and no money received—I'm stopping this sale.",
  '好，那我相信對方，去寄件。': "Okay, I'll trust them and go ship it.",

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
  '你停下來了': 'You Stopped',
  '原平台沒有訂單、帳戶也沒有入帳，你在寄件前停下來查證。': 'There was no order on the original platform and no money received — you stopped to verify before shipping.',
  '沒在官方平台看到訂單與入帳，不要只憑買家提供的畫面寄出商品。': "If you don't see the order and the payment on the official platform, don't ship based only on a screen the buyer shows you.",

  // -----------------------------------------------------------------------
  // pages/scenario05/EndingScammed.jsx - 受騙結局
  // -----------------------------------------------------------------------
  '這是一筆幽靈訂單': 'This Was a Ghost Order',
  '黑皮通': 'HPE',
  '商品': 'Item',
  '實際入帳': 'Amount Actually Received',
  '外部交易網站': 'External Trading Site',
  '頁面不存在': 'Page no longer exists',
  '帳號不存在': 'Account does not exist',
  '你看到的是假的付款成功頁面，真正的官方平台從未產生訂單。': "What you saw was a fake payment-success page. The real official platform never generated an order.",

  // -----------------------------------------------------------------------
  // pages/scenario05/Reveal.jsx
  // -----------------------------------------------------------------------
  '幽靈訂單是怎麼出現的？': 'How Did the Ghost Order Happen?',
  '買家要求離開原平台': 'The Buyer Asks to Leave the Original Platform',
  '外部網站顯示假的付款成功': 'The External Site Shows a Fake Payment Success',
  '官方平台其實沒有訂單': 'There Is Actually No Order on the Official Platform',
  '真的商品卻被寄出去了': 'But the Real Item Gets Shipped Anyway',

  // -----------------------------------------------------------------------
  // pages/scenario05/Quiz.jsx (shared ScenarioFinalDecision)
  // -----------------------------------------------------------------------
  '反詐小測驗': 'Anti-Fraud Quiz',
  '返回掃描': 'Back to Scan',
  '✅ 判斷正確': '✅ Correct',
  '❌ 判斷錯誤': '❌ Incorrect',
  '買家提供的外部網站顯示「付款成功」，但買東東沒有訂單、你的帳戶也沒有入帳。你應該怎麼做？':
    'The external site the buyer gave you shows “Payment Successful,” but MyDonDon shows no order and your account has received no money. What should you do?',
  '對方已傳付款畫面，先把商品寄出': 'They sent a payment screen, so ship the item first',
  '停止交易，只依官方平台訂單與實際入帳確認是否出貨。': 'Stop the sale — only ship based on the order and actual payment shown by the official platform.',
  '請買家再傳一張付款截圖確認': 'Ask the buyer to send another payment screenshot to confirm',
  '不要只相信付款截圖或陌生外部網站；不要離開原平台完成陌生的交易流程；賣家寄貨前應確認官方訂單及實際付款狀態；物流成立不代表付款成立。':
    'Don’t just trust a payment screenshot or an unfamiliar external site; don’t leave the original platform to complete an unfamiliar transaction flow; before shipping, a seller should confirm the official order and the actual payment status; a shipment being created does not mean payment has actually happened.',

  // -----------------------------------------------------------------------
  // Scenario menu entry blurb
  // -----------------------------------------------------------------------
  '你將以賣家身分刊登商品，買家會要求你到陌生外部網站建立專屬賣場並顯示已付款，誘導你在沒有官方訂單與入帳的情況下把商品寄出。':
    'You will list an item as the seller. The buyer will ask you to set up a dedicated listing on an unfamiliar external site that shows payment as complete, luring you into shipping the item with no order or payment on the official platform.',
};
