// English dictionary for scenario04 (HappyPick Shopping). Keyed directly off
// the Chinese source string exactly as it appears in the codebase - see
// ./i18n.js for how this is looked up. Every value here is taken verbatim
// from docs/scenario3-shopping-text-en.md (the reviewed English text), with
// the exception of a handful of shared-component strings called out in the
// PR description that had no pre-reviewed counterpart (Placeholder
// captions, ProductCard badges, ChatScreen/DialogueChoiceGrid
// speaker labels/prompt, and data/assetMap.js photo captions) which were
// translated to match the doc's tone/terminology.
export const EN = {
  // ---------------------------------------------------------------------
  // Shared / repeated across many files
  // ---------------------------------------------------------------------
  '返回': 'Back',
  '三天後': 'Three Days Later',
  '物流更新中…': 'Refreshing…',
  '賣家已簽收': 'Received by Seller',
  '已保存': 'Saved',
  '直接購買': 'Buy Now',
  '好，我要直接購買。': "Sure, I'll buy it now.",
  '先聽你們怎麼解釋': 'Let me hear you out first',
  '先聽你們怎麼解釋。': "Let me hear your side of it first.",
  '算了，不想那麼麻煩': "Forget it, this isn't worth the hassle",
  '算了，不想那麼麻煩。': "Never mind, it's not worth the hassle.",
  '我再想想，還是要退貨': 'Actually, I still want that return',
  '我再想想，還是要申請退貨。': 'On second thought, I do want to go through with the return.',
  '先完成訂單好了': 'Fine, I’ll just mark it complete',
  '好，我先完成訂單。': "Fine, I'll just go ahead and mark the order complete.",
  '保存商品資料': 'Save Product Info',
  '我先保存商品資料。': "I'll save the product info first.",
  '要求賣家退貨': 'Ask the Seller for a Return',
  '我要要求賣家退貨。': "I'd like to request a return.",
  '放棄退貨提醒': 'Before You Give Up on This Return',
  '放棄退貨將使後續求償更困難。你仍可以保存證據並向平台提出爭議。':
    'Giving up now makes it a lot harder to get your money back later. You can still save evidence and file a dispute with the platform.',

  // ---------------------------------------------------------------------
  // pages/scenario04/Cart.jsx
  // ---------------------------------------------------------------------
  '購物車': 'Cart',
  '購物車是空的': 'Your cart is empty.',
  '數量 1': 'Qty: 1',
  '合計': 'Total',
  '前往結帳': 'Proceed to Checkout',

  // ---------------------------------------------------------------------
  // pages/scenario04/Checkout.jsx
  // ---------------------------------------------------------------------
  '臺北市中正區○○路＊＊號': 'No. **, ○○ Rd., Zhongzheng District, Taipei City',

  // ---------------------------------------------------------------------
  // pages/scenario04/DisputeChat.jsx
  // ---------------------------------------------------------------------
  '售後問題處理': 'Order Support',

  // ---------------------------------------------------------------------
  // pages/scenario04/Ending.jsx
  // ---------------------------------------------------------------------
  '你在聯絡賣家前先保存商品與頁面資料，這有助於後續申訴與報案。':
    'You saved the listing and screenshots before messaging the seller, which makes any future complaint or report a lot easier.',
  '你在賣家失聯後聯絡 165，並完成報案資料整理。':
    'Once the seller stopped responding, you called the 165 Anti-Fraud Hotline and got your report together.',
  '退款持續未完成時，你聯絡 165 諮詢，並完成報案資料整理。':
    "With the refund still stalled, you called the 165 Anti-Fraud Hotline and got your report together.",
  '你在聯絡賣家前，先保存了開箱異常的照片與資料。':
    'Before messaging the seller, you saved photos and notes on what was wrong.',
  '你收到異常商品後，直接聯絡了賣家，沒有先保存證據。':
    'You messaged the seller the moment you saw the problem, without saving anything first.',
  '退款一再拖延時，你主動要求平台客服介入。':
    "When the refund kept stalling, you asked the platform's support team to step in.",
  '面對賣家一再拖延，你選擇繼續等待賣家的回覆。':
    'Even with the delays piling up, you just kept waiting on the seller.',
  '賣家失聯後你是否聯絡 165': 'Once the seller disappeared, did you call 165?',
  '賣家失聯後，你聯絡了 165 並完成報案資料整理。':
    'Once the seller became unreachable, you called the 165 Anti-Fraud Hotline and got your report together.',
  '退款持續未完成，你在平台介入後進一步聯絡 165，並完成報案資料整理。':
    "With the refund still stalled, you also called the 165 Anti-Fraud Hotline after the platform stepped in, and got your report together.",
  '賣家失聯後，你目前還沒有聯絡 165 諮詢。': "You haven't called the 165 Anti-Fraud Hotline yet.",
  '退款異常後，你目前還沒有聯絡 165 諮詢。': "You haven't called the 165 Anti-Fraud Hotline yet.",
  '退款處理': 'Refund Handling',
  '賣家利用「內容隨機」與模糊的品牌定義掩飾商品與廣告不符，收到退貨後仍拖延退款並停止營業。':
    'The seller hid behind "random contents" and a fuzzy definition of "name-brand product" to cover for a listing that didn\'t match reality, stalled the refund even after getting the item back, and eventually closed up shop.',
  '賣家利用「內容隨機」與模糊的品牌定義掩飾商品與廣告不符，收到退貨後仍拖延退款，退款持續未完成，你已向平台提出異常交易申訴。':
    'The seller hid behind "random contents" and a fuzzy definition of "name-brand product" to cover for a listing that didn\'t match reality, and kept stalling the refund even after getting the item back - it still hasn\'t gone through, so you filed a transaction dispute with the platform.',
  '隨機商品不代表賣家可以提供與描述完全不符的內容':
    '"Random contents" doesn\'t give a seller a pass to send something completely different from what was advertised.',
  '賣家同意退貨不代表一定會主動退款':
    "A seller agreeing to take something back doesn't mean they'll actually refund you.",
  '商品寄回前後都要保存物流與照片':
    "Photograph and log your shipment both before you send it and after it's delivered.",
  '不要刪除訂單、對話、付款及商品頁':
    'Never delete your order history, chat log, payment records, or the listing itself.',
  '商品評分、銷量與開箱照片，也可能遭到偽造、篩選或大量灌入':
    'Ratings, sales counts, and unboxing photos can all be faked, cherry-picked, or bought.',
  '賣家失聯或疑似涉及詐騙時，聯絡 165':
    'If a seller disappears or something feels like a scam, call the 165 Anti-Fraud Hotline right away.',
  '依 165 或警方指示完成後續報案程序':
    'Follow whatever the hotline or local police tell you to do next to file an official report.',

  // ---------------------------------------------------------------------
  // pages/scenario04/Home.jsx
  // ---------------------------------------------------------------------
  '黑皮購物': 'HappyPick Shopping',

  // ---------------------------------------------------------------------
  // pages/scenario04/Me.jsx
  // ---------------------------------------------------------------------
  '關閉': 'Off',
  '黑皮退款中心': 'HappyPick Refund Center',

  // ---------------------------------------------------------------------
  // pages/scenario04/Messages.jsx
  // ---------------------------------------------------------------------
  '案件編號 ': 'Case Number ',

  // ---------------------------------------------------------------------
  // pages/scenario04/OrderDetail.jsx / Orders.jsx (shared STEP labels)
  // ---------------------------------------------------------------------
  '你的包裹已送達': 'Your package has arrived',
  '收貨': 'Delivered',
  '付款': 'Payment',

  // ---------------------------------------------------------------------
  // pages/scenario04/PlatformSupportChat.jsx
  // ---------------------------------------------------------------------
  '黑皮安心專員': 'HappyPick Trust & Safety Specialist',
  '黑皮智能客服': 'HappyPick Assistant',
  '真人客服・已為您轉接': 'Live Agent · Connected',
  '官方認證・自動回覆中': 'Verified Account · Auto-Reply',
  '智': 'A',
  '賣': 'S',

  // ---------------------------------------------------------------------
  // pages/scenario04/ProductDetail.jsx
  // ---------------------------------------------------------------------
  '已加入購物車': 'Added to Cart',
  '已加入': 'Added',
  '加入購物車': 'Add to Cart',

  // ---------------------------------------------------------------------
  // pages/scenario04/RefundCenter.jsx
  // ---------------------------------------------------------------------
  '尚未申請退款': 'Refund Not Requested Yet',
  '退款處理中': 'Refund in Progress',
  '退款延遲，尚未完成': 'Refund Delayed',
  '賣家已失聯，退款仍未完成': 'Seller Unreachable, Refund Still Pending',
  '退款已完成': 'Refund Complete',
  '黑皮退款中心 ': 'HappyPick Refund Center ',
  '退貨狀態': 'Return Status',
  '退款狀態': 'Refund Status',
  '聯絡黑皮安心客服': 'Contact HappyPick Trust & Safety',

  // ---------------------------------------------------------------------
  // pages/scenario04/RefundDelayChat.jsx
  // ---------------------------------------------------------------------
  '店家暫停營業': 'Store Temporarily Closed',

  '缺少': 'Missing',
  '下一步': 'Next',

  // ---------------------------------------------------------------------
  // pages/scenario04/ReturnAckChat.jsx
  // ---------------------------------------------------------------------
  '退貨申請已提交，賣家須於 24 小時內回覆': 'Return request submitted — the seller has 24 hours to respond',

  // ---------------------------------------------------------------------
  // pages/scenario04/ReturnLogistics.jsx
  // ---------------------------------------------------------------------
  '退貨商品已由賣家簽收': 'Return delivered and signed for',
  '查看退款進度': 'Check Refund Progress',

  // ---------------------------------------------------------------------
  // pages/scenario04/ReturnRequest.jsx
  // ---------------------------------------------------------------------
  '退貨申請': 'Request a Return',

  // ---------------------------------------------------------------------
  // pages/scenario04/ReturnShipping.jsx
  // ---------------------------------------------------------------------
  '退貨寄件': 'Ship Your Return',
  '請依下列編號完成寄件': 'Use These Numbers to Complete Your Return',
  '退貨編號': 'Return ID',
  '物流編號': 'Tracking Number',
  '請將商品交由指定物流業者寄回，並保留寄件憑證。':
    'Hand it off to the courier and keep your shipping receipt.',
  '我已完成寄件': "I've Shipped It",

  // ---------------------------------------------------------------------
  // pages/scenario04/SellerChat.jsx
  // ---------------------------------------------------------------------
  '正在諮詢：': 'Chatting About: ',

  // ---------------------------------------------------------------------
  // pages/scenario04/SimPhoneHome.jsx
  // ---------------------------------------------------------------------
  '開啟黑皮購物': 'Launch HappyPick Shopping',

  // ------------------------------------------------------------------
  // Route B - VEXA FLEX X1 (data/dialogueTrees/luckyBag.js, delay.js,
  // data/scenarioConfig.js, pages/scenario04/Unboxing.jsx / ReturnRequest
  // .jsx / Ending.jsx)
  // ------------------------------------------------------------------
  '您好，這批 VEXA FLEX X1 是品牌限時體驗活動，數量有限。':
    'Hi there — this batch of VEXA FLEX X1 is part of a limited-time brand experience promotion, so quantities are limited.',
  '這是正版摺疊手機嗎？': 'Is this a genuine foldable phone?',
  '請問這是 VEXA FLEX X1 正版摺疊手機嗎？': 'Is this an authentic VEXA FLEX X1 foldable phone?',
  '螢幕可以完整展開嗎？': 'Does the screen open out fully?',
  '螢幕是可以完整展開的那種嗎？': 'Does the screen unfold into one full display?',
  '是的！目前是品牌限時體驗活動，所以才有這個優惠價格😊':
    'Yes! We\'re running a limited-time brand trial promotion, which is why we\'re offering this special price. 😊',
  '有保固卡或 IMEI 嗎？': 'Is there a warranty card or an IMEI?',
  '可以先提供保固卡或 IMEI 嗎？': 'Could you send me the warranty card or the IMEI first?',
  '可以看實機照片嗎？': 'Can I see photos of the actual unit?',
  '可以看實機的照片嗎？': 'Could I see a photo of the actual unit?',
  '保固資料會隨機出貨一起寄出，體驗活動的機器目前無法先提供單一序號。':
    'The warranty paperwork ships together with the phone. For promotion units we can\'t give out an individual serial number in advance.',
  '您放心，這批的做工真的很不錯，很多客人回購第二支送家人。':
    'Don\'t worry, the build quality on this batch is genuinely good — plenty of customers come back for a second one to give to family.',
  '這批今天只剩最後 12 台，很多客人一次下兩單。': 'Only 12 units left in today\'s batch — a lot of customers order two at once.',
  '這批賣得很快，已經沒剩多少台了，庫存數字是系統即時更新的。':
    'This batch is moving fast and there aren\'t many units left. The stock figure updates live.',
  '頁面上的圖片就是這個型號的商品圖，實際外觀仍以出貨批次為準。':
    'The photos on the page are this model\'s product shots; the actual appearance still depends on the shipping batch.',
  '是的，8.7 吋旗艦摺疊大螢幕，商品規格與圖片皆以頁面展示為準。':
    'Yes. It features an 8.7-inch flagship foldable display. The specifications and images shown on the product page apply.',
  '原價真的是 69,800 嗎？': 'Is NT$69,800 really the list price?',
  '原價真的是 NT$69,800 嗎？': 'Is the original price really NT$69,800?',
  '為什麼只賣 29,800？': 'Then why only NT$29,800?',
  '為什麼只賣 NT$29,800？': 'Then why is it only NT$29,800?',
  '原價是品牌公布的建議售價，這個型號在臺灣還沒有正式上市通路，所以查不到相同品項。':
    'That\'s the brand\'s published recommended retail price. This model hasn\'t launched through official channels in Taiwan yet, so you won\'t find the same item listed anywhere.',
  '這是品牌體驗與庫存回饋活動，數量有限，所以才有這個價格。':
    'It\'s a brand experience and inventory give-back promotion — limited quantities, which is why the price is what it is.',
  '未使用、配件完整都可以依黑皮購物七天鑑賞期申請，不過開機啟用或機身有使用痕跡就不接受退貨。':
    'As long as it\'s unused and all the accessories are there, you can file under HappyPick Shopping\'s 7-day return window — but once it\'s been powered on and activated, or the body shows signs of use, we can\'t accept a return.',
  '如果收到的不是這款手機呢？': 'And if what arrives isn\'t this phone?',
  '這批都是同一條產線出貨的摺疊機型，外觀細節仍以商品頁展示為準。':
    'This whole batch is the same foldable model off one production line; for the finer details of the appearance, the product page is what applies.',
  '我收到的根本不是商品頁上的手機！這是兩支舊手機接在一起吧？':
    'This isn\'t the phone shown on the product page at all! Aren\'t these just two old phones joined together?',
  '您收到的確實是雙手機摺疊款，摺疊功能正常。':
    'What you received is indeed our dual-phone folding model. The folding function works normally.',
  '兩支手機各有一個充電孔，我要退貨': 'Each phone has its own charging port — I want a return',
  '兩支手機連充電孔都各有一個！我要退貨退款。': 'Each phone even has its own charging port! I want to return this and get a refund.',
  '不同批次外觀可能略有差異，但商品確實具備摺疊功能。':
    'The appearance may vary slightly between production batches, but the product does have a folding function.',
  '不同批次外觀可能略有差異，可能您比較沒注意到，但商品確實具備摺疊功能。':
    'Appearance can vary slightly between batches — you may not have noticed — but the product does have a folding function.',
  '出貨批次是系統統一配發的，客服這邊只能依照系統紀錄回覆規格，商品確實具備摺疊功能。':
    'Shipping batches are assigned by the system, so all support can go by is what is logged for the specs. The product does have a folding function.',
  '這明明是兩支獨立手機': 'These are plainly two separate phones',
  '商品寫的是 8.7 吋摺疊手機，這明明是兩支獨立手機！':
    'The listing says it\'s an 8.7-inch foldable phone, but these are clearly two separate phones!',
  '這款是雙機身摺疊設計，兩邊各自獨立運作也屬於規格的一部分。':
    'This model uses a dual-body foldable design; each side operating independently is part of the spec.',
  '賣家可能用「不同批次」「規格差異」等說法帶過貨不對版，建議先保存實際收到的商品照片與商品頁宣稱，再決定是否申請退貨。':
    'Sellers can wave away goods that don’t match the ad with talk of "different batches" or "spec variations". Save photos of what actually arrived and of what the listing claimed before deciding whether to file a return.',
  '很抱歉造成您的困擾，請透過平台申請退貨，我們會協助處理。':
    'We\'re sorry for the inconvenience. Please submit a return request through the platform, and we\'ll assist you.',
  '真的很不好意思讓您久等，倉庫已經檢查過，商品摺疊功能正常，我再幫您跟他們確認一次。':
    'So sorry for the long wait. The warehouse has already checked it and the folding function works normally — I\'ll confirm with them once more for you.',
  '經檢查，商品摺疊功能正常，與您描述不符。': 'After inspection, we found that the product\'s folding function works normally. This does not match your description.',
  '倉庫檢查結果是商品摺疊功能正常，與您描述不符，驗收結果都是系統統一判定的。':
    'The warehouse\'s finding is that the folding function works normally, which doesn\'t match your description. Inspection outcomes are decided by the system across the board.',
  '合起來不代表它是摺疊手機': 'Closing it doesn\'t make it a foldable',
  '能把兩支手機合起來，不代表它是摺疊手機！': 'Being able to fold two phones together doesn\'t make it a foldable phone!',
  '目前已提交專員複核，請您耐心等候。': 'Your case has been submitted for further review. Please wait patiently.',
  '倉庫那邊回報機身好像有一點使用痕跡，我幫您跟主管確認一下，不好意思還要再等等。':
    'The warehouse flagged what looks like some signs of use on the body — let me check with a supervisor. Sorry, it\'ll be a little longer.',
  '倉庫回報機身外觀有使用痕跡，目前需要確認是否符合退貨條件。':
    'The warehouse reports signs of use on the body, so we need to confirm whether it still meets the return conditions.',
  '系統顯示機身外觀有使用痕跡，這部分需要走主管覆核流程，客服無法直接判斷。':
    'The system shows signs of use on the body. That has to go through a supervisor review — support can\'t decide it directly.',
  '商品收到了為什麼還不退款': 'You have the item — why no refund?',
  '商品你們已經收到了，為什麼還不退款？': 'You\'ve already received the returned item. Why haven\'t you issued my refund?',
  '退款審核尚未完成，請勿重複提交申請。': 'Your refund is still under review. Please do not submit duplicate requests.',
  'VEXA FLEX X1 旗艦摺疊手機': 'VEXA FLEX X1 Flagship Foldable Phone',
  '賣家迴避提供保固或序號證明': 'Seller Dodged Providing a Warranty or Serial Number',
  '原價宣稱無法查證': 'The Claimed List Price Couldn\'t Be Verified',
  '賣家擴大解釋商品規格說法': 'Seller Stretched What the Product Spec Meant',
  '賣家以「規格差異」解釋貨不對版': 'Seller Explained the Mismatch Away as a "Spec Variation"',
  '等等……這是兩支手機接在一起的？': 'Wait... are these two phones joined together?',
  '這根本是兩支獨立手機，中間用塑膠轉軸接起來的！': 'These are two separate phones connected by a plastic hinge!',
  '實際收到的雙機身手機': 'The dual-body phone that actually arrived',
  '中間的塑膠轉軸': 'The plastic hinge in the middle',
  '摺疊背面的兩個 Micro USB 充電孔': 'Two Micro USB charging ports on the folded rear',
  '包裹裡的實際內容物': 'What was actually in the parcel',
  '8.7 吋旗艦摺疊大螢幕': '8.7-inch flagship foldable display',
  '兩支獨立手機的螢幕': 'Two separate phone screens',
  '一體成型摺疊機身': 'One-piece foldable body',
  '塑膠轉軸拼接': 'Spliced with a plastic hinge',
  '旗艦三鏡頭': 'Flagship triple camera',
  '兩組低階相機': 'Two low-end cameras',
  '規格與商品頁不符': 'Specs don\'t match the product page',
  '機身底部 USB-C 充電埠': 'USB-C charging port on the bottom of the body',
  '兩個獨立 Micro USB 充電孔': 'Two separate Micro USB charging ports',
  '商品頁宣稱為 VEXA FLEX X1 8.7 吋摺疊手機，實際收到兩支舊手機以轉軸拼接的商品，並非廣告所示的摺疊手機，且具有兩個獨立 Micro USB 充電孔。要求退貨並全額退款 NT$29,800。':
    'The listing advertised a VEXA FLEX X1 8.7-inch foldable phone. However, I received two old phones joined together by a hinge, not the foldable phone shown in the advertisement. Each phone has its own Micro USB charging port. I request a return and a full refund of NT$29,800.',
  '遠低於原價的「限時優惠」可能只是誘餌': 'A "limited-time deal" far below list price can be nothing but bait',
  '遠低於原價的限時優惠，可能利用價格吸引消費者忽略商品真偽與賣家資訊。購買前先確認商品規格、賣家資訊與交易保障，並保存商品頁面及賣家承諾。':
    'A limited-time price far below the list price can use the discount itself to pull attention away from whether the product is genuine and who the seller is. Before buying, check the specs, the seller details and what transaction protection applies - and keep a copy of the listing and of whatever the seller promised.',

  // ---------------------------------------------------------------------
  // pages/scenario04/Unboxing.jsx
  // ---------------------------------------------------------------------
  '把東西全部拿出來後，箱子裡只有這些東西。': 'After taking everything out, this is all that was in the box.',
  '這和商品頁展示的內容差太多了。': 'This is nothing like what the product page showed.',
  '查看商品頁與實際內容': 'Compare the Listing and Actual Items',
  '包裹已送達': 'Package Has Arrived',
  '商品已送達，準備開箱': 'Your order has arrived. Time to unbox it.',
  '拆開外箱': 'Open the Box',
  '先拍照': 'Take Photos First',
  '繼續查看': 'Keep Going',
  '繼續查看內容物…': 'Checking the Rest of the Contents…',
  '查看完整比較': 'See Full Comparison',
  '還有 ': 'There Are ',
  ' 項尚未查看': ' Items Left to Check',
  '商品頁宣稱 vs 實際收到': 'Listing vs. What You Received',
  '商品頁宣稱': 'Listing Said',
  '實際收到': 'What Arrived',
  '你準備怎麼處理？': 'What do you want to do?',
  '先保存證據': 'Save Evidence First',
  '直接聯絡賣家': 'Message the Seller Directly',

  // ---------------------------------------------------------------------
  // data/dialogueTrees/health.js
  // ---------------------------------------------------------------------
  '為什麼價格這麼便宜？': "Why's the price so low?",
  '這批賣得很快，已經有兩千多人下單了，庫存數字是系統即時更新，建議您儘快決定。':
    "This one's moving fast, over 2,000 sold already. The stock count updates in real time, so I'd grab it soon if you're interested.",
  '有沒有發票？': 'Can I get a receipt?',
  '可以貨到付款嗎？': 'Can I pay cash on delivery?',
  '訂單完成後會由平台提供電子購買紀錄，相關憑證可在訂單頁查看。':
    "Once your order's done, the platform gives you an electronic receipt you can pull up anytime on your order page.",
  '目前商品都已經封箱，客服手上沒有同批次照片，不過都是依規定處理的喔。':
    "Everything's already sealed and boxed on our end, so I don't have photos of this exact batch on hand — but it's all handled by the book, don't worry.",
  '沒問題，您可以放心下單。': 'No problem, go ahead and order with confidence.',
  '我只拆外箱，商品沒有使用': "I only opened the shipping box — the product itself is untouched",
  '我只拆物流外箱，商品沒有使用。': "I just opened the shipping box. The product hasn't been touched.",

  // ---------------------------------------------------------------------
  // data/dialogueTrees/luckyBag.js
  // ---------------------------------------------------------------------
  '我想先問退貨規則': 'I want to hear the return policy first',
  '我想先問退貨規則。': 'Can you walk me through the return policy first?',
  '如果跟描述不符呢？': 'What if it doesn’t match what was advertised?',
  '如果商品跟描述不符呢？': "What happens if it doesn't match the listing?",
  '若有明顯出貨錯誤，可以提交照片讓倉庫判定。':
    "If there's a clear mix-up with your order, send us photos and we'll have the warehouse take a look.",
  '好吧，可能我誤會了': 'Ah, fair enough, maybe I got it wrong',
  '好吧，可能是我誤會了。': 'Fair enough, maybe I misread it.',
  '商品爭議提醒': 'Product Dispute Notice',
  '商品與描述不符，不是不喜歡': "It doesn't match the listing — I don't just dislike it",
  '是商品與描述不符，不是單純不喜歡。': "It doesn't match what was advertised — this isn't about not liking it.",

  // ---------------------------------------------------------------------
  // data/dialogueTrees/delay.js
  // ---------------------------------------------------------------------
  '退貨商品已由賣家簽收。': "The returned item's been received and signed for by the seller.",
  '詢問退款時間': 'Ask About the Refund Timeline',
  '請問退款大概什麼時候會處理？': 'About how long until my refund goes through?',
  '先保存簽收紀錄': 'Save the Delivery Confirmation First',
  '我先保存簽收紀錄。': "I'll save the delivery confirmation first.",
  '正在保存簽收紀錄…': 'Saving delivery confirmation…',
  '已加入證據包。': 'Added to your evidence file.',
  '真的很不好意思讓您久等，倉庫這幾天在依序驗收，我會請他們優先處理您的訂單。':
    "Really sorry for the wait — our warehouse is working through inspections in order, I'll get them to bump your order up.",
  '請給我確切完成日期': "Can you give me a firm date this'll be done?",
  '請給我確切完成日期。': "Can you give me an exact date this'll be finished?",
  '好，我等五天': "Fine, I'll give it five more days",
  '好，我等五天。': "Okay, I'll wait five more days.",
  '目前無法保證特定日期，但已備註優先處理。':
    "Can't promise an exact date right now, but I've flagged your order as a priority.",
  '五天後': 'Five Days Later',
  '倉庫那邊回報外盒好像有一點拆封痕跡，我幫您跟主管確認一下，不好意思還要再等等。':
    "Warehouse just flagged that the outer box looks like it might've been opened before — let me run this by a supervisor, sorry for the extra wait.",
  '倉庫回報商品外盒有拆封痕跡，目前需要主管進一步確認。':
    "Warehouse says the outer box shows signs it's been opened, so this needs a supervisor to sign off before we go further.",
  '系統顯示商品外盒有拆封痕跡，這部分需要走主管覆核流程，客服無法直接判斷。':
    "Our system's showing the outer box has tampering marks. This has to go through supervisor review — that's not something I can decide on my end.",
  '同意退貨卻不退款，這樣不合理': "You approved the return but still haven't refunded me — that's not okay",
  '你們已經同意退貨，卻一直沒有退款，這樣不合理。': "You already approved the return, but the refund still hasn't come through. That's not okay.",
  '我要聯絡平台': 'I want to bring the platform into this',
  '同意寄回不代表保證退款，仍需要確認商品符合退貨條件，請您再耐心等候。':
    "Agreeing to take it back doesn't guarantee you a refund — we still have to confirm it qualifies, so please bear with us a bit longer.",
  '好的，這邊會再跟主管確認，也麻煩您同時等候平台客服回覆。':
    "Got it — I'll follow up with the supervisor again, and go ahead and keep an eye out for a response from platform support too.",
  '七天後': 'Seven Days Later',
  // The platform's status card for a shop that has gone dark - storefront
  // UI wording, not a line either the seller or the player says.
  '此賣場目前無法使用': 'This shop is no longer available',
  '店家已暫停營業，目前無法聯絡賣家。': 'The seller has closed their shop and can no longer be reached.',
  '保存完整對話紀錄': 'Save the Full Chat Log',
  '直接查看退款進度': 'Check Refund Status Directly',
  '已保存完整對話紀錄。': 'Full chat log saved.',

  // ---------------------------------------------------------------------
  // data/dialogueTrees/returnAck.js
  // ---------------------------------------------------------------------
  '我們已收到申請。請確認商品、外包裝及所有內容物完整，再依平台提供的寄件編號退回。':
    "Got your return request. Just make sure the item, the box, and everything inside is intact, then ship it back using the label the platform gave you.",
  '確認退貨後會全額退款嗎？': 'Will I get a full refund once it’s returned?',
  '請確認退貨後會全額退款嗎？': 'Just to be clear — will this be a full refund once you get it back?',
  '直接取得寄件編號': 'Just send me the shipping label',
  '請直接給我寄件編號。': 'Can you just send me the shipping label directly?',
  '倉庫驗收符合條件後，會依平台流程退款。':
    'Once the warehouse checks it over and confirms it qualifies, the refund goes through per platform policy.',

  // ---------------------------------------------------------------------
  // data/dialogueTrees/platformSupport.js
  // ---------------------------------------------------------------------
  '您好，請選擇遇到的問題。': 'Hi. Please select the issue that best matches your situation.',
  '退貨後沒有退款': 'Returned it, still no refund',
  '退貨後沒有退款。': "I returned the item, but I still haven't gotten a refund.",
  '賣家已無法聯絡': "Can't reach the seller anymore",
  '系統顯示退款仍在賣家驗收流程中。': "Our system shows the refund's still sitting in the seller's inspection process.",
  '另外系統顯示您先前已確認完成訂單，一般退款流程可能已結束，但若涉及商品描述不實，仍可以建立爭議案件，我先為您轉接專員。':
    "Also, our system shows you'd already marked this order complete, so the standard refund process might already be closed out. That said, if the listing was misleading, we can still open a dispute case — let me get you over to a specialist.",
  '已經超過期限': "You're already past the deadline",
  '已經超過您說的期限了。': "You're already past the deadline you gave me.",
  '轉接真人客服': 'Talk to a Real Person',
  '我要轉接真人客服。': "I'd like to talk to a real person.",
  '了解，已偵測到可能的退款異常，我先為您轉接客服專員。':
    "Got it — we've flagged a possible refund issue, connecting you with a specialist now.",
  '了解，系統顯示該商店目前確實已停止營業，我先為您轉接客服專員處理。':
    "Understood — our system confirms that store's closed for good, let me get you to a specialist who can help further.",
  '正在為您轉接真人客服…': 'Connecting you with a real person now…',
  '您好，我是黑皮安心專員，已經看到智能客服轉來的問題，這邊直接為您查詢。':
    "Hi, I'm a HappyPick Trust & Safety specialist. I can see what our assistant flagged — I'll look into this for you.",
  '正在查詢訂單與退貨紀錄，請稍候。': "I'm pulling up your order and return records now. One moment, please.",
  '查詢完成。系統顯示退貨商品已由賣家簽收，但退款尚未完成；賣家目前也沒有回應平台通知，我們已記錄賣家未提供明確完成日期，並將本案標記為退款異常延遲。':
    "I've found the records. They show the seller got your return back and signed for it, but the refund never went through, and they haven't responded to any of our notices either. We've noted they never gave a completion date, and flagged this as an abnormal refund delay.",
  // ---------------------------------------------------------------------
  // data/products.js
  // ---------------------------------------------------------------------
  '商品來源 ': 'Origin ',
  '優選生活館': 'Everyday Picks',

  // ---------------------------------------------------------------------
  // data/scenarioConfig.js
  // ---------------------------------------------------------------------
  '賣家拒絕提供實際商品照片': "Seller Wouldn't Provide Photos of the Actual Item",
  '賣家事後更改商品規格說法': 'Seller Changed Their Story About the Product Specs Afterward',
  '商品爭議尚未釐清就提前完成訂單': 'Marked the Order Complete Before the Dispute Was Settled',
  '聯絡賣家前已先保存證據': 'Saved Evidence Before Contacting the Seller',
  '賣家承認商品圖僅供參考': 'Seller Admitted the Photo Was "For Reference Only"',
  '賣家僅承諾有條件退款': 'Seller Only Offered a Conditional Refund',
  '賣家事後變更退貨承諾內容': 'Seller Changed the Return Terms Afterward',
  '其他': 'Other',
  '商品與描述不符': "Doesn't Match the Description",
  '下單': 'Order Placed',
  '收貨 ': 'Item Received ',
  '聯絡賣家': 'Contacted Seller',
  '賣家簽收 ': 'Signed for by Seller ',
  '賣家簽收': 'Signed for by Seller',
  '聯絡平台': 'Contacted Platform',
  '聯絡 165 ': 'Contacted 165 ',

  // ChatScreen.jsx / DialogueChoiceGrid.jsx
  '165 專員': '165 Specialist',
  '已送達 ': 'Delivered ',

  // data/assetMap.js photo captions
  '商品圖片 ': 'Product Photo ',

  // ---------------------------------------------------------------------
  // components/blackpi/DebugPanel.jsx (dev-only, ?debug=1) - no
  // pre-reviewed English exists for this internal tool; translated here
  // to match tone, flagged in the PR description for human review.
  // ---------------------------------------------------------------------
  '開發除錯面板': 'Dev Debug Panel',
  '退貨已簽收': 'Return Signed For',
  '賣家失聯': 'Seller Unreachable',
  '證據完整': 'Full Evidence',
  '證據不足': 'Insufficient Evidence',
  '重設目前路線': 'Reset Current Route',
  '清除 localStorage': 'Clear localStorage',

  // ---------------------------------------------------------------------
  // CIB Ending result page (OutcomeResult)
  // ---------------------------------------------------------------------
  '網購退款陷阱結算': 'Online Shopping Refund Trap — Outcome',
  '退款陷阱成立': 'The Refund Trap Closed',
  '賣家失聯，退款未完成': 'Seller unreachable, refund never completed',
  '訂單實付金額': 'Amount Actually Paid',
  '已取回金額': 'Amount Recovered',
  '尚未取回的款項': 'Still Unrecovered',
  '商品有問題只是開始。當賣家開始拖延退款、反覆修改條件、要求離開平台或額外付款時，消費者可能逐步失去原本的平台交易保障。你沒有保存完整對話紀錄，也沒有透過平台正式管道申訴，後續要證明整段交易經過會更困難。': 'A faulty product is only the beginning. Once a seller starts stalling the refund, repeatedly changing the conditions, pushing you off the platform or asking for extra payments, you can gradually lose the transaction protection the platform gave you. You did not save the full conversation log and did not file through the platform’s official channel, which makes proving what happened much harder later on.',
  '交易後不斷改變退款條件，是高風險警訊。': 'Refund conditions that keep changing after a purchase are a serious warning sign.',
  '看看哪裡出了問題': 'See what went wrong',
  '成功止損': 'You Limited the Damage',
  '交易保障：保住': 'Transaction protection: kept',
  '爭議款項': 'Amount in Dispute',
  '平台交易保障': 'Platform Transaction Protection',
  '你沒有繼續按照賣家私下提出的新條件處理，而是保留證據並回到平台正式機制。這讓你的申訴有紀錄可以依循，但平台受理不等於一定能追回全部款項，後續仍需持續追蹤案件進度。': 'You stopped following the new conditions the seller invented privately, preserved your evidence, and returned to the platform’s official process. That gives your complaint a documented basis — but a platform accepting a case does not guarantee every cent comes back, so keep tracking the case.',
  '看看你做對了什麼': 'See what you did right',

  // ---------------------------------------------------------------------
  // Route A rebuilt as 智慧掃拖機器人 (robot vacuum 貨不對版) + the real
  // scenario-04 photography captions and the code-built
  // 「商品頁宣稱 vs 實際收到」comparison. The retired supplement-route
  // strings were removed rather than left behind, since nothing
  // references them any more.
  // ---------------------------------------------------------------------

  'APP 遠端控制': 'App remote control',
  '主動詢問商品規格與功能': 'Asked about the specs and features up front',
  '倉庫目前正在依序驗收，家電商品需要確認配件是否齊全，通常需要 3 至 5 個工作天。':
    'The warehouse is working through inspections in order. Appliances also need an accessory check, so it usually takes 3 to 5 business days.',
  '再往下只有一個塑膠畚箕': 'Further down, just a plastic dustpan.',
  '出貨配置都有更新在系統裡，這批是手動清潔組合版，客服這邊只能依照系統紀錄回覆，無法個別再確認。':
    'The shipping configuration is all updated in the system — this batch is the manual cleaning set version. Support can only answer from the system record and can\'t verify orders individually.',
  '功能有寫清楚就好': 'As long as the features are spelled out',
  '功能有寫清楚就好。': 'As long as the features are spelled out, that\'s fine.',
  '可以先看實機照片嗎？': 'Could I see a photo of the actual unit first?',
  '可以協助您提出申請。不過家電商品拆封後需要由倉庫判定外箱與配件是否完整，才能確認是否符合退貨條件。':
    'I can help you file the request. But once an appliance has been opened, the warehouse has to judge whether the outer box and accessories are complete before we can confirm it qualifies for a return.',
  '可以看實機操作影片嗎？': 'Is there a video of the actual unit running?',
  '可拆式掃把桿': 'Detachable broom poles',
  '可拆式掃把＋畚箕': 'A detachable broom and a dustpan',
  '同型號的操作影片由原廠統一管理，客服端沒有辦法逐筆調閱，不過這款已經賣出兩千多台，目前沒有大規模反映問題。':
    'Demo videos for this model are managed centrally by the manufacturer, and support can\'t pull them one by one. That said, we\'ve sold over two thousand units and there\'s been no widespread complaint so far.',
  '商品頁完全沒有寫手動版': 'The listing never said manual',
  '商品頁宣稱的功能不存在': 'Features claimed on the listing don\'t exist',
  '商品頁宣稱的功能與實際收到的商品完全不符，賣家在收到退貨後持續拖延退款並停止營業。':
    'What the listing claimed and what actually arrived have nothing in common. After taking the return back, the seller kept stalling the refund and then shut the store down.',
  '商品頁宣稱的功能與實際收到的商品完全不符，賣家在收到退貨後持續拖延退款，退款持續未完成，你已向平台提出異常交易申訴。':
    "What the listing claimed and what actually arrived have nothing in common. After taking the return back, the seller kept stalling the refund - it still hasn't gone through, so you filed a transaction dispute with the platform.",
  '商品頁從頭到尾沒有寫是手動版。': 'Nowhere on that listing does it say this is a manual version.',
  '商品頁的功能宣稱，收貨後要逐項核對': 'Check every feature the listing claimed against what actually arrives',
  '商品頁的圖片與功能說明僅供參考，實際出貨內容以系統配置為準，客服無法另外提供文件。':
    'Images and feature descriptions on the listing are for reference only; what ships is determined by the system configuration. Support can\'t provide any further documentation.',
  '商品頁的規格都是原廠提供的，不同批次的配件包裝可能稍有差異，不影響主機功能。':
    'The specs on the listing come straight from the manufacturer. Accessory packaging can differ slightly between batches, but that doesn\'t affect how the unit works.',
  '實際收到的掃把與畚箕': 'The Broom and Dustpan That Actually Arrived',
  '底下是幾節可拆式掃把桿': 'Underneath, a few detachable broom poles.',
  '您好，家電商品不同批次可能會調整出貨配置，清潔效果不受影響喔。':
    'Hello! Appliance shipping configurations can be adjusted between batches — cleaning performance isn\'t affected.',
  '您好，這款掃拖機器人是本月主打，智慧導航加上 APP 遠端控制，現在剛好是活動批次喔。':
    'Hello! This sweep-and-mop robot is our feature of the month — smart navigation plus app remote control — and you\'ve caught it on a promotional batch.',
  '您很有眼光，這批回購率真的很高。我可以先幫您保留一台，但系統只能保留 15 分鐘喔。':
    'You\'ve got a good eye — the repeat-purchase rate on this batch is genuinely high. I can hold one for you, but the system only reserves it for 15 minutes.',
  '我想再確認一下規格。': 'I\'d like to double-check the specs first.',
  '我想再確認規格': 'I\'d like to double-check the specs',
  '手動清掃工具': 'A manual cleaning tool',
  '掃把頭': 'Broom Head',
  '掃拖二合一': '2-in-1 sweep and mop',
  '操作影片由原廠統一製作，目前還在更新，不過功能都與商品頁一致，請放心。':
    'Demo videos are produced centrally by the manufacturer and are still being updated. The features all match the listing, so there\'s nothing to worry about.',
  '收到的不是機器人，我要退貨': 'This isn\'t a robot — I want to return it',
  '收到的商品與商品頁完全不同': 'The item received is completely different from the listing',
  '收到的根本不是掃地機器人，我要退貨。': 'What I got isn\'t a robot vacuum at all. I want to return it.',
  '是的，下載 APP 就可以遠端啟動、預約排程，也能查看每次的清掃紀錄。':
    'Yes — install the app and you can start it remotely, schedule cleanings, and review the log for every run.',
  '智慧導航': 'Smart navigation',
  '智慧掃拖機器人': 'Smart robot vacuum and mop',
  '智選家電生活館': 'SmartPick Home Appliance',
  '最上面是一支掃把頭': 'On top, a broom head.',
  '海外代購與原廠宣稱仍需有可查證資訊':
    'Claims like "overseas purchasing" or "straight from the manufacturer" only mean something if you can actually verify them.',
  '無': 'None',
  '畚箕': 'Dustpan',
  '疑似以低價商品出貨': 'Suspected shipping of a cheap substitute',
  '目前優惠庫存只剩 4 台，今天下單預計 1 至 2 個工作天出貨。':
    'Only 4 units left at the promotional price. Order today and it ships in 1 to 2 business days.',
  '目前家電商品只支援黑皮支付，付款後由平台保障交易。':
    'Appliances currently support HappyPick Pay only. Once you\'ve paid, the platform protects the transaction.',
  '目前批次滿電可以連續清掃 120 分鐘，電量不足時會自動回到充電座。':
    'On a full charge this batch runs for 120 minutes straight, and heads back to the dock by itself when the battery gets low.',
  '真的有 APP 遠端控制嗎？': 'Does it really have app remote control?',
  '算了，我先用看看': 'Never mind, I\'ll just try using it',
  '算了，那我先用看看。': 'Never mind. I\'ll just try using it, then.',
  '箱子裡好像不是機器人。': 'There doesn\'t seem to be a robot in this box.',
  '自動回充': 'Auto-recharge',
  '賣家拒絕提供功能或規格證明': 'Seller refused to provide proof of features or specs',
  '賣家片面更改退貨條件，是常見的拖延退款手法。': 'A seller unilaterally rewriting the return terms is a common way of stalling a refund.',
  '賣家迴避提供實機操作證明': 'Seller dodged providing proof of the unit in operation',
  '這個您放心，功能都是原廠標配，您可以先安心下單，之後有任何問題我都會處理。':
    'No need to worry — those are all standard manufacturer features. Go ahead and order with confidence; I\'ll handle anything that comes up afterwards.',
  '這批出貨的是同系列手動清潔組合版，出貨內容以系統配置為準，雖然沒有主機，但清潔範圍是一樣的。':
    'This batch ships as the manual cleaning set from the same series; contents follow the system configuration. There\'s no main unit, but the cleaning coverage is the same.',
  '這批是原廠週年活動的特別價格，我們減少中間通路成本，所以才能提供優惠。':
    'This batch is priced for the manufacturer\'s anniversary campaign. We cut out the middle distribution costs, which is how we can offer it this low.',
  '這批是同系列的手動清潔組合版，一樣可以把家裡打掃乾淨，您可以先用用看。':
    'This batch is the manual cleaning set from the same series — it\'ll get your place just as clean. Do give it a try first.',
  '防詐風險提醒': 'Fraud Risk Alert',
  '電池可以用多久？': 'How long does the battery last?',
  '驗收流程都是系統統一排程，家電商品需要多一道配件確認，需要 3 至 5 個工作天，無法個別加快。':
    'Inspection is scheduled centrally by the system, and appliances need an extra accessory check. It takes 3 to 5 business days and can\'t be sped up case by case.',
  '這台可以掃拖一起用嗎？': 'Can this vacuum and mop at the same time?',
  '這個價格怎麼比其他台便宜這麼多？': 'Why is this so much cheaper than the others?',
  '可以，這台是掃拖二合一，也支援 APP 遠端控制、自動回充和智慧導航。': 'Yes. It vacuums and mops, with app control, auto-recharging, and smart navigation.',
  '你好，我買的是掃地機器人，但收到的是掃把，是不是寄錯了？': 'Hi, I ordered a robot vacuum, but I received a broom. Was the wrong item sent?',
  '不好意思，我先幫您確認一下訂單跟出貨紀錄。': 'Sorry about that. Let me check your order and shipping record first.',
  '我這邊查到您的訂單是這次活動批次，我再幫您確認一下出貨內容。': 'I found your order under this promotion batch. Let me check what was shipped.',
  '系統顯示這批活動商品是依「居家清潔系列」配置出貨。': 'The system says this promotion batch ships according to the “Home Cleaning Series” assortment.',
  '可是我商品頁買的是掃地機器人': 'But the listing I bought was for a robot vacuum',
  '可是我商品頁買的是掃地機器人。': 'But the listing I bought was for a robot vacuum.',
  '所以這不是寄錯？': 'So this wasn’t a shipping mistake?',
  '這批活動商品的部分圖片屬於系列示意，不同批次出貨內容可能不同。': 'Some images for this promotion represent the product series. Contents may vary by batch.',
  '實際出貨內容會依活動批次配置，客服這邊只能依系統紀錄處理。': 'Actual contents follow the promotion batch. Customer service can only process what the system shows.',
  '商品頁完全沒有寫會收到掃把': 'The listing never said I could receive a broom',
  '商品頁完全沒有寫會收到掃把。': 'The listing never said I could receive a broom.',
  '我要退貨': 'I want to return this',
  '我要退貨。': 'I want to return this.',
  '我查到您的退貨已經由賣家簽收。': 'I can see that the seller has received your return.',
  '我們已收到您的退貨申請。請將商品寄回，商品經倉庫驗收後，將依流程辦理退款。': 'We have received your return request. Please ship the item back; once it passes warehouse inspection, the refund will be processed according to our procedure.',
  '確認收到後會全額退款嗎？': 'Will I get a full refund once you receive it?',
  '好，請給我寄件編號。': 'Okay, please send me the return shipping code.',
  '先拍下這個狀況': 'Take a photo of this first',
  '把東西全部拿出來看看': 'Take everything out and check',
  '先把商品頁和開箱照片留著': 'Keep the listing and unboxing photos first',
  '先問賣家是不是寄錯了': 'Ask the seller if they sent the wrong item',
  '附加資料': 'Attachments',
  '開箱照片': 'Unboxing photos',
  '退貨原因': 'Reason for return',
  '購買商品為智慧掃地機器人，實際收到可拆式掃把與畚箕。': 'The item purchased was a smart robot vacuum, but the item received was a detachable broom and dustpan.',
  '退貨申請已送出': 'Return request submitted',
  '提交退貨申請': 'Submit return request',
  '完成退貨寄件': 'Send the return',
  '商品圖片、規格、評價都可能被刻意包裝。': 'Product images, specifications, and reviews can all be deliberately manipulated.',

  // ---------------------------------------------------------------------
  // Route A rebuilt as 智慧掃拖機器人 (robot vacuum 貨不對版) + the real
  // scenario-04 photography captions and the code-built
  // 「商品頁宣稱 vs 實際收到」comparison. The retired 韓國保健食品 strings
  // were removed rather than left behind, since nothing references them.
  // ---------------------------------------------------------------------

  '付款紀錄': 'Payment record',
  '你在 165 諮詢時表示資料還沒整理完整。若商品頁或帳號之後消失，會更難說明整段交易經過。':
    'You told the 165 operator your records weren\'t fully in order yet. If the listing or the account disappears later, explaining the whole transaction gets much harder.',
  '可查詢': 'Still viewable',
  '商品已經寄回，但退款仍未完成。接下來若要向平台申訴或進一步處理，先確認目前留下的交易紀錄。':
    'The item has gone back, but the refund never completed. Before filing with the platform or taking this further, check what records of the transaction you still have.',
  '商品頁與訂單資料': 'Listing and order details',
  '好的，建議您先整理目前留下的交易紀錄，之後隨時可以回來提出申訴。':
    'Understood. I\'d suggest gathering the transaction records you still have first — you can come back and file the complaint at any time.',
  '尚未付款': 'Not paid yet',
  '尚未寄回商品': 'Item not sent back yet',
  '尚未收到商品': 'Item not received yet',
  '尚未申請退貨': 'No return requested yet',
  '尚未確認賣家簽收': 'Seller receipt not confirmed yet',
  '尚未與賣家對話': 'No conversation yet',
  '已保留': 'Kept',
  '已保留完整截圖': 'Full screenshots kept',
  '已保留完整紀錄': 'Full log kept',
  '已取得': 'On record',
  '沒有可附上的照片': 'No photos to attach',
  '已附於退貨申請': 'Attached to the return request',
  '整理證據並繼續處理': 'Continue with these records',
  '未留存完整照片': 'No complete photos kept',
  '未附商品照片': 'No photos attached',
  '未附完整照片': 'Photos attached were incomplete',
  '爭議內容：商品頁宣稱智慧掃拖機器人，實際收到一組可拆式掃把與畚箕。':
    'Dispute: the listing advertised a smart robot vacuum and mop; what arrived was a detachable broom and a dustpan.',
  '與賣家的對話': 'Conversation with the seller',
  '訂單仍可查詢': 'Still viewable in your orders',
  '證據整理': 'Your Records',
  '賣家已停止回覆': 'The seller has stopped replying',
  '退款仍未完成': 'The refund still hasn\'t arrived',
  '退貨商品已由賣家簽收，但退款至今仍未入帳，賣家目前也沒有回覆。':
    'The seller signed for the returned item, but the refund has still not landed and they have stopped replying.',
  '退貨物流與簽收紀錄': 'Return shipping and delivery receipt',
  '退貨申請紀錄': 'Return request',
  '開箱與實際收到商品照片': 'Unboxing and received-item photos',
  '你將以買家身分下單一件熱門商品，收到的實物卻與商品頁描述不符，並在申請退貨、退款的過程中，一步步遇上賣家的拖延與話術。':
    'You will order a popular item as the buyer, receive something that does not match the listing, and walk through a return and refund request where the seller keeps stalling.',
  '反詐小測驗': 'Anti-Fraud Quiz',
  '返回掃描': 'Back to Scan',
  '✅ 判斷正確': '✅ Correct',
  '❌ 判斷錯誤': '❌ Incorrect',
  '收到的商品跟頁面上宣稱的完全不一樣，最安全的處理方式是什麼？':
    'The item you received is completely different from what the listing promised. What is the safest way to handle it?',
  '先確認收貨，之後再私下跟賣家協調退款。':
    'Confirm receipt first, then negotiate a refund privately with the seller later.',
  '保存商品頁、開箱照片與對話紀錄，透過平台正式申請退貨退款。':
    'Save the listing, unboxing photos, and chat records, and file a return/refund request through the platform\'s official process.',
  '直接把商品退回賣家指定的地址，並依對方要求先取消訂單。':
    'Ship the item straight back to whatever address the seller gives you, and cancel the order first as they ask.',
  '商品圖片、規格、評價都可能被刻意包裝。收到貨不對版時，先保存商品頁、開箱與對話紀錄，再透過平台正式機制申請退貨退款，才能讓爭議處理有紀錄可循；賣家同意退貨不代表退款已完成，若賣家拖延或失聯，應立即聯絡平台，疑似詐騙可撥打 165 諮詢，切勿私下協調或依對方指示直接取消訂單、寄回商品。':
    'Listing photos, specs, and reviews can all be deliberately dressed up. When what arrives doesn\'t match, save the listing, unboxing photos, and chat records first, then file the return/refund through the platform\'s official process so the dispute has a record to follow. A seller agreeing to a return doesn\'t mean the refund is done - if they stall or go silent, contact the platform right away, and call 165 if you suspect fraud. Never negotiate privately or cancel the order/ship items back just because the other side told you to.',

  // ---- Scenario04 back-half revision: the seller goes dark, platform
  // decline, and the reported/kept-arguing outcome split ----------------
  '保存對話紀錄': 'Save the chat log',
  '前往黑皮購物申請處理': 'File a case with HappyPick Shopping',
  '我再確認一下這筆訂單當初的付款紀錄。': 'Let me check the payment record for this order.',
  '很抱歉，此筆交易並不是透過黑皮購物的官方交易流程完成，因此不屬於平台交易保障範圍。':
    'I’m sorry, but this transaction wasn’t completed through HappyPick Shopping’s official checkout, so it isn’t covered by our platform protection.',
  '黑皮購物並沒有收到這筆款項，沒有辦法直接退款，也沒有辦法代為賠償。':
    'HappyPick Shopping never received this payment, so we can’t issue a refund or compensate you directly.',
  '賣家目前已經無法聯絡，賣場也已經停止營業，我們同樣沒有辦法取得完整的平台外交易資料。':
    'The seller is unreachable now and their shop has closed, so we can’t retrieve a complete record of an off-platform transaction either.',
  '如果你認為這整件事情涉及詐騙，建議向 165 或警方報案處理。':
    'If you believe this may be fraud, we’d recommend reporting it to the 165 hotline or the police.',
  '繼續要求平台負責': 'Keep pressing the platform',
  '我還是覺得平台應該負責。': 'I still think the platform should be responsible for this.',
  '聯絡 165 報案': 'Contact 165 to report it',
  '我要聯絡 165 報案。': 'I want to contact 165 to report this.',
  '好的，請問您想再確認哪個部分？': 'Sure - which part would you like me to go over again?',
  '商品是在你們平台看到的，你們應該負責': 'I found the listing on your platform, so you should be responsible',
  '我都已經把商品退回去了，平台不能直接退款嗎？': 'I already shipped the item back - can’t the platform just refund me directly?',
  '我理解這項商品確實是您在黑皮購物上看到的，但這筆訂單實際的付款紀錄顯示是透過站外連結完成，並沒有進入平台的金流系統。':
    'I understand you did see this item on HappyPick Shopping, but the payment record for this order shows it went through an outside link, not our platform’s payment system.',
  '退貨物流上確實顯示賣家已經簽收，但退款需要透過原本收款的管道處理，這筆款項並沒有進到黑皮購物的系統裡，所以沒有辦法由平台直接退款。':
    'The shipping record does show the seller signed for the return, but a refund has to go back through whichever channel originally took the payment - and this payment never reached HappyPick Shopping’s system, so we can’t issue the refund directly.',
  '好的，建議您直接撥打 165 或前往就近派出所報案，我會協助保留目前查到的訂單與退貨紀錄。':
    'Understood - I’d recommend calling 165 directly or reporting this at your nearest police station. I’ll help keep the order and return records we’ve found on file.',
  '你選擇聯絡 165 報案': 'You Chose to Report It to 165',
  '你選擇繼續要求平台處理': 'You Chose to Keep Pressing the Platform',
  '後續處理': 'Next Step',
  '已交由 165／警方處理': 'Handed to 165 / the police',
  '款項狀態': 'Payment Status',
  '平台無法追回': 'Unrecoverable via the platform',
  '你發現賣家失聯、賣場停止營業，而且平台無法處理平台外交易後，選擇將這起疑似詐騙案件交由 165 與警方處理。':
    'After finding the seller unreachable, their shop closed, and the platform unable to help with an off-platform transaction, you chose to hand this suspected fraud case to 165 and the police.',
  '這筆交易是在平台外完成，平台沒有收到款項，也無法替平台外交易退款或賠償。當賣家失聯、賣場停止營業後，繼續與平台爭執並沒有追回這筆款項。':
    'This transaction was completed off the platform - the platform never received the payment and can’t refund or compensate for an off-platform deal. Once the seller went unreachable and the shop closed, continuing to argue with the platform never got the money back.',
  '平台外交易一旦出問題，平台無法退款或賠償；發現疑似詐騙應盡快聯絡 165 或報案。':
    'Once something goes wrong with an off-platform transaction, the platform can’t refund or compensate you for it - if you suspect fraud, contact 165 or report it as soon as possible.',
  '成功': 'Success',
  '被詐騙': 'Scammed',
  '已聯絡 165': 'Contacted 165',
  // 詐騙疑點分析's own name and both CTAs used to be listed here. They are the
  // Outcome System's contract, not Scenario 04's copy, and now live in
  // components/outcome/outcomeStrings.js so all five scenarios say the same
  // thing (spec §4.3).
  '商品資訊與實際收到內容明顯不符':
    'What the listing described and what arrived were plainly different',
  '商品頁宣稱為智慧掃拖機器人，但實際收到的卻是完全不同的清潔用品。':
    'The listing advertised a robot vacuum and mop, but what actually arrived was an entirely different cleaning product.',
  '賣家以退貨流程持續拖延退款':
    'The seller used the return process to keep stalling the refund',
  '同意退貨不代表退款已經完成。賣家在收到退貨後仍不斷以驗收、確認等理由拖延。':
    'Agreeing to a return is not the same as refunding you. Even after receiving the goods back, the seller kept stalling with talk of inspections and checks.',
  '賣家失聯或賣場停止營業':
    'The seller went silent, or the shop closed down',
  '退款尚未完成時，賣家突然無法聯絡、賣場停止營業，是非常明顯的警訊。':
    'A seller who suddenly becomes unreachable - or a shop that closes - while your refund is still outstanding is a glaring warning sign.',
  '平台外交易缺乏平台保障':
    'Off-platform transactions come with no platform protection',
  '如果付款或交易是在平台外完成，平台通常無法直接退款或賠償。發現疑似詐騙時應保留證據並盡快聯絡 165 或報案。':
    'If the payment or the deal happened outside the platform, the platform usually cannot refund or compensate you directly. If you suspect fraud, keep your evidence and contact 165 or report it as soon as you can.',
  '目前退款還沒有完成，賣家也沒有回覆平台通知，我再確認一下這筆訂單當初的付款紀錄。':
    "The refund hasn't gone through yet, and the seller hasn't responded to our notice either. Let me check this order's original payment record.",
  // data/scenarioConfig.js ROUTE_LABELS - the product name Scenario 04's own
  // seller-chat header shows. BlackPi translates these in its dictionary; the
  // Scenario's header reads them through this one and had no entry, so an
  // English run read "Chatting About: 智慧掃地機器人".
  '智慧掃地機器人': 'Smart Robot Vacuum',
};
