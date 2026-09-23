// Product data for scenario04 (BlackPi shopping fraud). Image references
// are assetKeys resolved through data/assetMap.js - the two story products
// now point at real photography; the decorative filler cards keep the
// neutral 'filler-generic' placeholder.
//
// NOTE ON `route: 'health'`: this is a LEGACY INTERNAL IDENTIFIER only.
// The player-facing product on this route is the 智慧掃拖機器人
// (robot vacuum) 貨不對版 story - there is no supplement product anywhere
// in the experience any more. The string 'health' survives purely as the
// route key because it is baked into saved localStorage state
// (selectedRoute / completedRoutes), every dialogue node id
// ('health.presale.*', 'health.dispute.*') recorded in dialogueHistory, the
// URLs the host mounts these screens on, and the report-timeline lookup in
// data/scenarioConfig.js. Renaming it would strand every in-progress save
// on a dead route for no player-visible gain. Asset keys, copy, i18n and
// every screen the player sees use robot-vacuum naming.

export const ROBOT_VACUUM_PRODUCT = {
  id: 'robot-vacuum',
  route: 'health',
  name: '智慧掃拖機器人｜APP 遠端控制｜自動回充｜掃拖二合一',
  shop: '智選家電生活館',
  // NT$8,888 is the whole of the money this route ever charges: free
  // shipping, so 商品金額 / 訂單金額 / 實際付款 / 退款金額 / 受騙損失 are one
  // number on every screen that shows any of them, including the ending.
  price: 8888,
  shipping: 0,
  total: 8888,
  claims: [
    '智慧導航自動規劃清掃路線',
    'APP 遠端控制與預約排程',
    '電量不足自動回充',
    '掃拖二合一，一機到位',
    '七天鑑賞期',
  ],
  sold: 2418,
  rating: 4.9,
  reviewCount: 612,
  assetKey: 'robot-vacuum-main',
  assetLabel: '智慧掃拖機器人商品主圖',
  images: ['robot-vacuum-main', 'robot-vacuum-lifestyle', 'robot-vacuum-features', 'robot-vacuum-review'],
  category: '家電',
  shopItemCount: 68,
  shopRating: 4.9,
  promoTitle: '限時優惠',
  promoSub: '原價 NT$20,000，限時特惠 NT$8,888',
  deliveryInfo: '宅配免運｜預計 3 至 5 天送達',
  guaranteeInfo: '平台付款保障｜七天鑑賞期',
  description: '主打智慧導航與 APP 遠端控制的掃拖二合一機器人，可自動規劃清掃路線，電量不足時自動回到充電座，適合小坪數與租屋族日常使用。',
  notice: '商品規格可能因批次調整，實際內容以出貨商品為準。',
};

export const ROBOT_VACUUM_SPECS = [
  { label: '商品類型', value: '掃地機器人' },
  { label: '清潔方式', value: '掃拖二合一' },
  { label: '控制方式', value: 'APP 遠端控制' },
  { label: '充電方式', value: '頁面宣稱自動回充' },
];

export const ROBOT_VACUUM_REVIEWS = [
  {
    rating: 5, name: '張＊＊', purchased: true, date: '2026/07/08',
    text: '外箱包裝很完整，實際清掃效果還要再用幾天觀察看看。',
    photo: 'robot-vacuum-review',
  },
  {
    rating: 4, name: '黃＊＊', purchased: true, date: '2026/06/23',
    text: '出貨速度快，不過外盒感覺跟商品頁照片有點不一樣，可能是批次不同。',
  },
];

// Route B - VEXA FLEX X1. Same shape as the robot vacuum above, and the same
// trap: the listing sells a flagship foldable, the parcel holds two cheap
// phones joined by a plastic hinge.
//
// NOTE ON `route: 'luckyBag'`: a LEGACY INTERNAL IDENTIFIER, exactly like
// `health` above. The product on this route used to be the 限量精品驚喜福袋;
// it is the VEXA FLEX X1 now, and nothing the player sees says 福袋 any more.
// The key survives for the same reason `health` did - it is baked into saved
// localStorage state (selectedRoute / completedRoutes), every dialogue node id
// ('luckyBag.presale.*', 'luckyBag.dispute.*') recorded in dialogueHistory,
// the URLs the host mounts these screens on, and the route tables in
// data/scenarioConfig.js. Renaming it would strand every in-progress save on a
// dead route for no player-visible gain.
export const VEXA_FLEX_X1_PRODUCT = {
  id: 'vexa-flex-x1',
  route: 'luckyBag',
  // The listing's own headline. 8.7 吋 is the advertised panel size - a spec
  // line the player reads exactly as they would on a real listing.
  name: 'VEXA FLEX X1｜8.7 吋旗艦摺疊手機',
  shop: '潮選數位通訊館',
  // NT$29,800 is the whole of the money this route ever charges: free
  // shipping, so 商品金額 / 訂單金額 / 實際付款 / 退款金額 / 受騙損失 are one
  // number on every screen that shows any of them, including the ending.
  price: 29800,
  shipping: 0,
  total: 29800,
  claims: [
    '8.7 吋旗艦摺疊大螢幕',
    '旗艦三鏡頭',
    '512GB 大容量',
    '5G 高速連線',
    '石墨黑精品機身',
  ],
  sold: 3821,
  rating: 4.8,
  reviewCount: 940,
  assetKey: 'vexa-flex-x1-main',
  assetLabel: 'VEXA FLEX X1 摺疊手機商品主圖',
  images: ['vexa-flex-x1-main', 'vexa-flex-x1-camera', 'vexa-flex-x1-display', 'vexa-flex-x1-connectivity'],
  category: '手機',
  shopItemCount: 36,
  shopRating: 4.8,
  promoTitle: '限時品牌體驗價・數量有限',
  promoSub: '原價 NT$69,800，限時特惠 NT$29,800',
  deliveryInfo: '宅配免運｜預計 3 至 5 天送達',
  guaranteeInfo: '平台付款保障｜七天鑑賞期',
  description: '全新 VEXA FLEX X1，搭載 8.7 吋旗艦摺疊大螢幕、旗艦三鏡頭與 512GB 大容量。限時品牌體驗價 NT$29,800，數量有限，售完為止。',
  // The hedge the seller leans on later, when the parcel turns out to be two
  // phones on a hinge: 「不同批次外觀可能略有差異」.
  notice: '商品規格與外觀可能因出貨批次略有差異，實際內容以出貨商品為準。',
};

export const VEXA_FLEX_X1_SPECS = [
  { label: '商品類型', value: '摺疊智慧型手機' },
  { label: '螢幕尺寸', value: '8.7 吋' },
  { label: '顏色', value: '石墨黑' },
  { label: '儲存容量', value: '512GB' },
  { label: '行動網路', value: '5G' },
  { label: '相機規格', value: '旗艦三鏡頭' },
];

export const VEXA_FLEX_X1_REVIEWS = [
  {
    rating: 5, name: '林＊＊', purchased: true, date: '2026/07/02',
    text: '螢幕很漂亮，這價格真的划算！',
    photo: 'vexa-flex-x1-display',
  },
  {
    rating: 4, name: '陳＊＊', purchased: true, date: '2026/06/15',
    text: '已收到，外觀很有質感。',
  },
];

export const MAIN_PRODUCTS = [ROBOT_VACUUM_PRODUCT, VEXA_FLEX_X1_PRODUCT];

// 20-30 filler product cards so the homepage/search results look like a real
// shopping app. Deliberately generic, placeholder-only, non-interactive
// beyond a "not part of this experience" toast.
const FILLER_NAMES = [
  '大容量行動電源 20000mAh', '無線藍牙機械鍵盤', '戶外防水藍牙喇叭', '陶瓷咖啡杯 2 入組',
  '摺疊收納箱 三入組', '自動摺疊雨傘', '極簡後背包 15 吋筆電夾層', '胺基酸溫和洗顏慕斯',
  '滋潤修護洗髮精 500ml', '手工燕麥餅乾 禮盒裝', 'precio 掛耳式黑咖啡 10 入',
  '德國進口水果茶包組', 'Type-C 快充傳輸線 1.5m', '運動休閒不鏽鋼水壺 600ml',
  '記憶棉護頸枕', '寵物自動餵食器', '負離子摺疊吹風機', 'LED 護眼桌燈',
  '大容量旅行收納袋', '抽取式衛生紙 6 包組', '多功能廚房清潔劑組', '透明保鮮盒 5 件組',
  '瑜珈墊 加厚防滑', '保濕精華液 30ml', '無線滑鼠 靜音款', '車用手機支架',
  '折疊野餐墊', '真空保溫杯 350ml', '毛巾三件組 純棉加大', '香氛室內擴香瓶',
];

export const FILLER_PRODUCTS = FILLER_NAMES.map((name, i) => ({
  id: `filler-${i + 1}`,
  route: null,
  name,
  shop: `優選生活館 ${((i % 5) + 1)}`,
  price: 199 + ((i * 137) % 1800),
  shipping: i % 3 === 0 ? 0 : 60,
  sold: 100 + ((i * 53) % 5000),
  rating: (4 + ((i % 10) / 10)).toFixed(1),
  assetKey: 'filler-generic',
  assetLabel: name,
  category: '一般商品',
}));

export function getProductByRoute(route) {
  return MAIN_PRODUCTS.find((p) => p.route === route) || null;
}

const PRODUCT_SPECS = { health: ROBOT_VACUUM_SPECS, luckyBag: VEXA_FLEX_X1_SPECS };
export function getProductSpecs(route) {
  return PRODUCT_SPECS[route] || [];
}

const PRODUCT_REVIEWS = { health: ROBOT_VACUUM_REVIEWS, luckyBag: VEXA_FLEX_X1_REVIEWS };
export function getProductReviews(route) {
  return PRODUCT_REVIEWS[route] || [];
}

// Fixed 4-item decorative row for the home screen (spec: "只需保留約 3 至 4
// 件"). Unlike the rest of FILLER_PRODUCTS - which take a generic
// placeholder tile and a formula-derived price - these four carry real
// product photography and a real price, so the storefront reads as a real
// shop.
//
// This table is the single source of truth for all three of a decor
// product's identity fields: name, photo, price. Each row keeps them
// together, and lookup is by name rather than array position, so a photo
// can never drift into the wrong card and no page can show a different
// price for the same product.
const HOME_DECOR_SPECS = [
  { name: '大容量行動電源 20000mAh', assetKey: 'decor-powerbank', price: 1659 },
  { name: '無線藍牙機械鍵盤', assetKey: 'decor-keyboard', price: 3859 },
  { name: '戶外防水藍牙喇叭', assetKey: 'decor-speaker', price: 473 },
  { name: 'precio 掛耳式黑咖啡 10 入', assetKey: 'decor-coffee', price: 890 },
];

export const HOME_DECOR_PRODUCTS = HOME_DECOR_SPECS.map(({ name, assetKey, price }) => {
  const product = FILLER_PRODUCTS.find((p) => p.name === name);
  if (!product) throw new Error(`HOME_DECOR_SPECS: no filler product named "${name}"`);
  product.assetKey = assetKey;
  product.price = price;
  return product;
});

// Category-matched decoy results shown alongside each main product in
// search results, so a robot-vacuum search never surfaces phone-line decoys
// (or vice versa) or completely generic gear.
export const SEARCH_DECOYS = {
  health: [
    { id: 'decoy-vacuum-1', name: '無線手持吸塵器 輕量款', shop: '智選家電生活館', price: 890, sold: 1204, rating: '4.7' },
    { id: 'decoy-vacuum-2', name: '掃地機器人集塵袋 5 入', shop: '智選家電生活館', price: 720, sold: 866, rating: '4.6' },
    { id: 'decoy-vacuum-3', name: '靜音拖地機器人', shop: '優選生活館 2', price: 1050, sold: 532, rating: '4.8' },
    { id: 'decoy-vacuum-4', name: '掃地機邊刷替換組', shop: '優選生活館 3', price: 980, sold: 341, rating: '4.5' },
  ].map((d) => ({ ...d, route: null, shipping: 60, assetKey: 'filler-generic', assetLabel: d.name, category: '家電' })),
  luckyBag: [
    { id: 'decoy-phone-1', name: '摺疊手機專用保護殼', shop: '潮選數位通訊館', price: 890, sold: 2013, rating: '4.6' },
    { id: 'decoy-phone-2', name: '5G 智慧型手機 128GB', shop: '優選生活館 1', price: 699, sold: 998, rating: '4.5' },
    { id: 'decoy-phone-3', name: '65W 氮化鎵快充組', shop: '優選生活館 4', price: 1200, sold: 415, rating: '4.7' },
    { id: 'decoy-phone-4', name: '手機螢幕保護貼 2 入', shop: '優選生活館 5', price: 799, sold: 1587, rating: '4.6' },
  ].map((d) => ({ ...d, route: null, shipping: 60, assetKey: 'filler-generic', assetLabel: d.name, category: '手機' })),
};

export function getSearchResults(route) {
  const product = getProductByRoute(route);
  const decoys = SEARCH_DECOYS[route] || [];
  return [decoys[0], decoys[1], product, decoys[2], decoys[3]].filter(Boolean);
}
