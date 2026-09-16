// English dictionary for the BlackPi (黑皮購物) App module.
//
// The App owns its UI, so it owns its UI copy: every string here is rendered
// by a screen or component under apps/blackpi/ and by nothing else. It used
// to live in Scenario 04's dictionary, which made a story
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
  // apps/blackpi/brand/index.js
  '黑皮購物': 'HappyPick Shopping',

  // apps/blackpi/components/BottomNav.jsx
  '分類': 'Categories',
  '訂單': 'Orders',
  '主要導覽': 'Main Navigation',
  '我的': 'Me',
  '首頁': 'Home',
  '訊息': 'Messages',

  // apps/blackpi/components/ChatScreen.jsx
  '賣家': 'Seller',
  '黑皮客服': 'HappyPick Support',
  '我': 'Me',
  '提醒': 'Notice',
  '返回': 'Back',
  '已送達': 'Delivered',
  '賣': 'S',
  '店家暫停營業': 'Store Temporarily Closed',
  '已讀': 'Read',

  // apps/blackpi/components/DialogueChoiceGrid.jsx
  '選擇你的回應': 'Choose your response',

  // apps/blackpi/components/ProductCard.jsx
  '已售': 'Sold',
  '免運': 'Free Shipping',
  '分': ' rating',

  // apps/blackpi/data/catalog.js
  '合作選物': 'Partner Selections',
  '七天鑑賞期': '7-Day Return Window',
  '限時優惠': 'Limited-Time Deal',
  '售完不補，恢復原價 NT$2,280': 'Almost Gone — Back to $95 After This',
  '宅配 NT$60｜預計 3 至 5 天送達': '$2 Shipping · Arrives in 3-5 Days',
  '平台付款保障｜七天鑑賞期': 'Payment Protection Included · 7-Day Return Window',
  '商品類型': 'Type',
  '商品來源': 'Origin',
  '張＊＊': 'J.C.',
  '黃＊＊': 'H.W.',
  '出貨速度快，不過外盒感覺跟商品頁照片有點不一樣，可能是批次不同。': 'Shipped fast, though the box looked a bit different from the listing photos — probably just a different batch.',
  '林＊＊': 'L.C.',
  '陳＊＊': 'D.W.',
  '大容量行動電源 20000mAh': '20,000mAh Portable Charger',
  '無線藍牙機械鍵盤': 'Wireless Mechanical Keyboard',
  '戶外防水藍牙喇叭': 'Outdoor Waterproof Bluetooth Speaker',
  '陶瓷咖啡杯 2 入組': 'Ceramic Mug, Set of 2',
  '摺疊收納箱 三入組': 'Foldable Storage Bin, Set of 3',
  '自動摺疊雨傘': 'Auto-Open Umbrella',
  '極簡後背包 15 吋筆電夾層': 'Minimalist Backpack with 15" Laptop Sleeve',
  '胺基酸溫和洗顏慕斯': 'Gentle Amino Acid Face Wash',
  '滋潤修護洗髮精 500ml': 'Nourishing Repair Shampoo 500ml',
  '手工燕麥餅乾 禮盒裝': 'Handmade Oatmeal Cookies, Gift Box',
  'precio 掛耳式黑咖啡 10 入': 'precio Drip Coffee Bags, 10-Pack',
  '德國進口水果茶包組': 'German Fruit Tea Sampler',
  'Type-C 快充傳輸線 1.5m': 'USB-C Fast Charge Cable, 1.5m',
  '運動休閒不鏽鋼水壺 600ml': 'Stainless Steel Sports Water Bottle 600ml',
  '記憶棉護頸枕': 'Memory Foam Neck Pillow',
  '寵物自動餵食器': 'Automatic Pet Feeder',
  '負離子摺疊吹風機': 'Ionic Folding Hair Dryer',
  'LED 護眼桌燈': 'LED Eye-Care Desk Lamp',
  '大容量旅行收納袋': 'Large Travel Storage Bag',
  '抽取式衛生紙 6 包組': 'Facial Tissue, 6-Pack',
  '多功能廚房清潔劑組': 'Multi-Surface Kitchen Cleaner Set',
  '透明保鮮盒 5 件組': 'Clear Storage Containers, Set of 5',
  '瑜珈墊 加厚防滑': 'Extra-Thick Non-Slip Yoga Mat',
  '保濕精華液 30ml': 'Hydrating Serum 30ml',
  '無線滑鼠 靜音款': 'Silent Wireless Mouse',
  '車用手機支架': 'Car Phone Mount',
  '折疊野餐墊': 'Foldable Picnic Blanket',
  '真空保溫杯 350ml': 'Vacuum-Insulated Water Bottle 350ml',
  '毛巾三件組 純棉加大': 'Cotton Towel Set of 3, Extra Large',
  '香氛室內擴香瓶': 'Aromatherapy Reed Diffuser',
  '優選生活館 1': 'Everyday Picks 1',
  '優選生活館 2': 'Everyday Picks 2',
  '優選生活館 3': 'Everyday Picks 3',
  '優選生活館 4': 'Everyday Picks 4',
  '優選生活館 5': 'Everyday Picks 5',
  '一般商品': 'General Merchandise',
  'APP 遠端控制與預約排程': 'App remote control and scheduled cleaning',
  '主打智慧導航與 APP 遠端控制的掃拖二合一機器人，可自動規劃清掃路線，電量不足時自動回到充電座，適合小坪數與租屋族日常使用。': 'A 2-in-1 sweeping and mopping robot built around smart navigation and app remote control. It plans its own cleaning route and returns to the dock by itself when the battery runs low — ideal for small apartments and rentals.',
  '充電方式': 'Charging',
  '商品規格可能因批次調整，實際內容以出貨商品為準。': 'Specifications may be adjusted between batches; the item as shipped takes precedence.',
  '外箱包裝很完整，實際清掃效果還要再用幾天觀察看看。': "Packaging arrived intact. I'll need a few more days to see how well it actually cleans.",
  '家電': 'Home Appliances',
  '掃地機器人': 'Robot vacuum',
  '掃地機器人集塵袋 5 入': 'Robot Vacuum Dust Bags, 5-Pack',
  '掃地機邊刷替換組': 'Robot Vacuum Side-Brush Replacement Set',
  '掃拖二合一，一機到位': '2-in-1 sweeping and mopping in a single unit',
  '控制方式': 'Control',
  '智慧導航自動規劃清掃路線': 'Smart navigation plans the cleaning route automatically',
  '智慧掃拖機器人商品主圖': 'Smart Robot Vacuum Main Product Photo',
  '智慧掃拖機器人｜APP 遠端控制｜自動回充｜掃拖二合一': 'Smart Robot Vacuum & Mop｜App Remote Control｜Auto-Recharge｜2-in-1 Sweep and Mop',
  '清潔方式': 'Cleaning',
  '無線手持吸塵器 輕量款': 'Lightweight Cordless Handheld Vacuum',
  '電量不足自動回充': 'Returns to the dock automatically when the battery is low',
  '靜音拖地機器人': 'Quiet Mopping Robot',
  '頁面宣稱自動回充': 'Auto-recharge (as claimed on the listing)',
  'APP 遠端控制': 'App remote control',
  '掃拖二合一': '2-in-1 sweep and mop',
  '智選家電生活館': 'SmartPick Home Appliance',

  // apps/blackpi - VEXA FLEX X1 (Route B product line)
  'VEXA FLEX X1｜8.7 吋旗艦摺疊手機': 'VEXA FLEX X1 | 8.7-inch Flagship Foldable Phone',
  '潮選數位通訊館': 'TrendPick Mobile',
  '8.7 吋旗艦摺疊大螢幕': '8.7-inch flagship foldable display',
  '旗艦三鏡頭': 'Flagship triple camera',
  '512GB 大容量': '512GB of storage',
  '5G 高速連線': '5G high-speed connectivity',
  '石墨黑精品機身': 'Premium graphite black body',
  '手機': 'Phones',
  '限時品牌體驗價・數量有限': 'Limited-Time Brand Experience Price · While Supplies Last',
  '原價 NT$69,800，限時特惠 NT$29,800': 'Was NT$69,800 — NT$29,800 for a limited time',
  '宅配免運｜預計 3 至 5 天送達': 'Free Home Delivery · Arrives in 3-5 Days',
  '石墨黑／512GB／1 台': 'Graphite Black / 512GB / 1 unit',
  '主打 8.7 吋旗艦摺疊大螢幕的 5G 摺疊手機，搭載旗艦三鏡頭與 512GB 大容量，石墨黑精品機身，限時品牌體驗價供應，數量有限。':
    'A 5G foldable phone built around an 8.7-inch flagship folding display, with a flagship triple camera, 512GB of storage and a premium graphite black body. Offered at a limited-time brand experience price while supplies last.',
  '商品規格與外觀可能因出貨批次略有差異，實際內容以出貨商品為準。':
    'Specifications and appearance may vary slightly between shipping batches; the item as shipped takes precedence.',
  '摺疊智慧型手機': 'Foldable Smartphone',
  '螢幕尺寸': 'Screen Size',
  '8.7 吋': '8.7 inches',
  '顏色': 'Color',
  '石墨黑': 'Graphite Black',
  '儲存容量': 'Storage',
  '行動網路': 'Mobile Network',
  '相機規格': 'Camera',
  '螢幕很漂亮，這價格真的划算！': 'The screen is gorgeous — a real steal at this price!',
  '已收到，外觀很有質感。': 'Arrived. It looks and feels well made.',
  '摺疊手機專用保護殼': 'Case Made for Foldable Phones',
  '5G 智慧型手機 128GB': '5G Smartphone 128GB',
  '65W 氮化鎵快充組': '65W GaN Fast Charger Set',
  '手機螢幕保護貼 2 入': 'Phone Screen Protector, 2-Pack',
  '摺疊手機': 'Foldable Phone',
  '點這裡搜尋智慧掃地機器人或摺疊手機': 'Tap to search smart robot vacuums or foldable phones',
  '搜尋掃地機器人、摺疊手機': 'Search robot vacuums, foldable phones',
  '規格 ': 'Spec ',

  // apps/blackpi/screens/Category.jsx
  '美妝保養': 'Beauty & Skincare',
  '生活雜貨': 'Home Essentials',
  '3C 配件': 'Electronics & Accessories',
  '食品飲料': 'Food & Beverages',
  '寵物用品': 'Pet Supplies',
  '戶外運動': 'Outdoor & Sports',
  '居家收納': 'Home Organization',
  '精選商品': 'Featured Picks',

  // apps/blackpi/screens/Checkout.jsx
  '商品金額': 'Subtotal',
  '運費': 'Shipping',
  '結帳確認': 'Payment',
  '應付金額': 'Order Total',
  '黑皮支付': 'HappyPay',
  '確認付款 NT$': 'Confirm Payment NT$',

  // apps/blackpi/screens/Home.jsx
  '通知': 'Notifications',
  '目前沒有其他通知': 'No new notifications',
  '搜尋商品': 'Search',
  '搜尋 ': 'Search ',
  '為你推薦': 'Picked for You',

  // apps/blackpi/screens/Me.jsx
  '開啟': 'On',
  '黑皮會員': 'HappyPick Member',
  '一般會員・會員編號 BP-165165': 'Standard Member · Member ID BP-165165',
  '音效與震動回饋': 'Sound & Haptic Feedback',
  '黑皮安心客服': 'HappyPick Trust & Safety',
  '我的收藏': 'My Favorites',
  '優惠券': 'Coupons',
  '關閉': 'Off',
  '黑皮退款中心': 'HappyPick Refund Center',

  // apps/blackpi/screens/Messages.jsx
  '（店家暫停營業）': '(Store Closed)',
  '點擊繼續與賣家的對話': 'Tap to Keep Chatting with the Seller',
  '官方認證・線上服務': 'Verified Account · Online Support',
  '目前沒有進行中的對話。': 'No active conversations.',

  // apps/blackpi/screens/OrderDetail.jsx
  '查看最新物流': 'Check Shipping Status',
  '已付款': 'Paid',
  '賣家備貨': 'Preparing',
  '已出貨': 'Shipped',
  '配送中': 'In Transit',
  '您的包裹已送達': 'Your package has arrived',
  '黑皮通物流': 'HPE Express',
  '訂單詳情': 'Order Details',
  '產生中…': 'Generating…',
  '拆開包裹': 'Delivered',
  '查看售後進度': 'Delivered',
  '訂單編號 ': 'Order Number ',
  '物流更新中…': 'Refreshing…',
  '物流進度': 'Shipping Progress',

  // apps/blackpi/screens/Orders.jsx
  '已下單': 'Order Placed',
  '賣家備貨中': 'Preparing',
  '訂單已完成': 'Order Complete',
  '我的訂單': 'My Orders',
  '目前沒有訂單。': 'No orders yet.',
  '尚未下單': 'Not Ordered Yet',

  // apps/blackpi/screens/PaymentSuccess.jsx
  '付款成功': 'Payment Successful',
  '訂單已成立，賣家將盡快備貨出貨。': "Your order's confirmed — the seller will get it ready to ship soon.",
  '查看訂單': 'Check Shipping Status',

  // apps/blackpi/screens/ProductDetail.jsx
  '找不到商品。': 'Item not found.',
  '回首頁': 'Back to Home',
  '商品圖片': 'Product Photo',
  '加入收藏': 'Save for Later',
  '已加入收藏': 'Saved for Later',
  '賣家聊聊': 'Message Seller',
  '購物保障': 'Buyer Protection',
  '商品內容': "What's Included",
  '商品 ': 'Items: ',
  ' 件': '',
  '進入商店': 'Visit Store',
  '商品介紹': 'Description',
  '商品特色': 'Highlights',
  '買家評價': 'Reviews',
  '已購買': 'Verified Purchase',
  '則評價': ' reviews',
  '商品規格': 'Specifications',
  '直接購買': 'Buy Now',
  '分享': 'Share',
  '配送方式': 'Shipping',
  '注意事項': 'Notes',

  // apps/blackpi/screens/Search.jsx
  '行動電源': 'Portable Charger',
  '藍牙喇叭': 'Bluetooth Speaker',
  '掛耳咖啡': 'Drip Coffee Bags',
  '保濕精華': 'Hydrating Serum',
  '吹風機': 'Hair Dryer',
  '瑜珈墊': 'Yoga Mat',
  '找不到相關商品，請嘗試其他關鍵字': 'No matching products. Try a different keyword.',
  '搜尋商品輸入框': 'Search Field',
  '搜尋紀錄': 'Recent Searches',
  '熱門搜尋': 'Trending',
  '智慧掃地機器人': 'Smart Robot Vacuum',

  // apps/blackpi/screens/SearchResults.jsx
  '找到 ': 'Found ',
  ' 項相關商品': ' matching items',

  // apps/blackpi/data/assetMap.js
  '買家實拍照片（評論用）': 'Buyer Photo (for Review)',
  '尚未拆開的宅配紙箱': 'Unopened Delivery Box',
  '圖片': 'Image',
  '居家自動清掃情境照': 'Automatic Home Cleaning Lifestyle Photo',
  '拆開紙箱後看到的內容物': "What's Inside Once the Box Is Opened",
  '智慧導航與 APP 功能說明圖': 'Smart Navigation and App Feature Graphic',
  '可拆式掃把桿': 'Detachable broom poles',
  '實際收到的掃把與畚箕': 'The Broom and Dustpan That Actually Arrived',
  '掃把頭': 'Broom Head',
  '畚箕': 'Dustpan',
  'VEXA FLEX X1 摺疊手機商品主圖': 'VEXA FLEX X1 Foldable Phone Main Product Photo',
  'VEXA FLEX X1 三鏡頭細節圖': 'VEXA FLEX X1 Triple-Camera Detail',
  'VEXA FLEX X1 展開螢幕細節圖': 'VEXA FLEX X1 Unfolded Display Detail',
  'VEXA FLEX X1 底部連接埠細節圖': 'VEXA FLEX X1 Bottom Port Detail',
  'VEXA FLEX X1 實際收到商品開箱照': 'VEXA FLEX X1 Unboxing Photo of What Actually Arrived',
  'VEXA FLEX X1 實際收到商品正面照': 'VEXA FLEX X1 Front View of What Actually Arrived',
  'VEXA FLEX X1 實際收到商品轉軸瑕疵': 'VEXA FLEX X1 Hinge Defect on What Actually Arrived',
  'VEXA FLEX X1 實際收到商品摺疊背面': 'VEXA FLEX X1 Folded Rear View of What Actually Arrived',

  // apps/blackpi/components/ChatScreen.jsx / Placeholder.jsx / screens/ProductDetail.jsx
  // (reached from inside a template literal: `${t('...')}${value}`)
  '圖片 ': 'Image ',
  '圖片佔位：': 'Image placeholder: ',
  '對方': 'The other party',
  '輸入中': 'is typing',
  // <img alt> for the four decorative storefront products.
  '行動電源商品縮圖': 'Power bank product thumbnail',
  '機械鍵盤商品縮圖': 'Mechanical keyboard product thumbnail',
  '藍牙喇叭商品縮圖': 'Bluetooth speaker product thumbnail',
  '掛耳咖啡商品縮圖': 'Drip coffee bag product thumbnail',
  // The delivery address on the checkout screen. Built from the device's
  // locked location profile, so the county/district part arrives already
  // localized - see lib/location/localizedLocationName.js.
  '{region}○○路＊＊號': 'No. **, ○○ Rd., {region}',
};
