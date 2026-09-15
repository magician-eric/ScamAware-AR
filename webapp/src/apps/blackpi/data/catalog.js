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
  price: 1680,
  shipping: 60,
  total: 1740,
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
  promoSub: '售完不補，恢復原價 NT$2,280',
  deliveryInfo: '宅配 NT$60｜預計 3 至 5 天送達',
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

export const LUCKY_BAG_PRODUCT = {
  id: 'luckybag-surprise',
  route: 'luckyBag',
  name: '限量精品驚喜福袋｜保證品牌商品｜總價值超過 NT$5,000',
  shop: '好日子驚喜選物',
  price: 999,
  shipping: 60,
  total: 1059,
  claims: [
    '每袋保證包含品牌商品',
    '總價值超過 NT$5,000',
    '限量精選商品，每袋內容不同',
    '限量 100 組，售完不補',
  ],
  sold: 3821,
  rating: 4.8,
  reviewCount: 940,
  assetKey: 'luckybag-main',
  assetLabel: '驚喜福袋商品主圖',
  // 'luckybag-gift-selection' is deliberately kept in this carousel: it is
  // the shot that makes the "看起來非常超值" claim believable, and the
  // unboxing pay-off only lands if the player actually saw it first.
  images: ['luckybag-main', 'luckybag-premium-contents', 'luckybag-gift-selection', 'luckybag-limited'],
  category: '福袋',
  shopItemCount: 36,
  shopRating: 4.8,
  promoTitle: '限量活動',
  promoSub: '僅剩 12 組',
  deliveryInfo: '宅配 NT$60｜預計 3 至 5 天送達',
  guaranteeInfo: '平台付款保障｜七天鑑賞期',
  contentInfo: '每袋內容隨機',
  description: '限量選物福袋，每袋隨機搭配生活選物與品牌商品，主打驚喜感與高 CP 值，數量有限、售完不補。',
  notice: '福袋內容隨機，以實際出貨內容為準。',
};

export const LUCKY_BAG_SPECS = [
  { label: '商品類型', value: '隨機福袋' },
  { label: '商品來源', value: '合作選物' },
  { label: '商品數量', value: '每袋內容不同' },
  { label: '活動數量', value: '限量 100 組' },
];

export const LUCKY_BAG_REVIEWS = [
  {
    rating: 5, name: '林＊＊', purchased: true, date: '2026/07/02',
    text: '包裝很漂亮，內容比想像中多，覺得划算。',
    photo: 'luckybag-review',
  },
  {
    rating: 4, name: '陳＊＊', purchased: true, date: '2026/06/15',
    text: '有抽到一些東西還不錯，但品牌不是很知名，跟預期有點落差。',
  },
];

export const MAIN_PRODUCTS = [ROBOT_VACUUM_PRODUCT, LUCKY_BAG_PRODUCT];

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

const PRODUCT_SPECS = { health: ROBOT_VACUUM_SPECS, luckyBag: LUCKY_BAG_SPECS };
export function getProductSpecs(route) {
  return PRODUCT_SPECS[route] || [];
}

const PRODUCT_REVIEWS = { health: ROBOT_VACUUM_REVIEWS, luckyBag: LUCKY_BAG_REVIEWS };
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
// search results, so a robot-vacuum search never surfaces luckyBag-style
// decoys (or vice versa) or completely generic gear.
export const SEARCH_DECOYS = {
  health: [
    { id: 'decoy-vacuum-1', name: '無線手持吸塵器 輕量款', shop: '智選家電生活館', price: 890, sold: 1204, rating: '4.7' },
    { id: 'decoy-vacuum-2', name: '掃地機器人集塵袋 5 入', shop: '智選家電生活館', price: 720, sold: 866, rating: '4.6' },
    { id: 'decoy-vacuum-3', name: '靜音拖地機器人', shop: '優選生活館 2', price: 1050, sold: 532, rating: '4.8' },
    { id: 'decoy-vacuum-4', name: '掃地機邊刷替換組', shop: '優選生活館 3', price: 980, sold: 341, rating: '4.5' },
  ].map((d) => ({ ...d, route: null, shipping: 60, assetKey: 'filler-generic', assetLabel: d.name, category: '家電' })),
  luckyBag: [
    { id: 'decoy-luckybag-1', name: '美妝驚喜盒', shop: '好日子驚喜選物', price: 890, sold: 2013, rating: '4.6' },
    { id: 'decoy-luckybag-2', name: '生活選物福袋', shop: '優選生活館 1', price: 699, sold: 998, rating: '4.5' },
    { id: 'decoy-luckybag-3', name: '文創限定福袋', shop: '優選生活館 4', price: 1200, sold: 415, rating: '4.7' },
    { id: 'decoy-luckybag-4', name: '女生日常驚喜包', shop: '優選生活館 5', price: 799, sold: 1587, rating: '4.6' },
  ].map((d) => ({ ...d, route: null, shipping: 60, assetKey: 'filler-generic', assetLabel: d.name, category: '福袋' })),
};

export function getSearchResults(route) {
  const product = getProductByRoute(route);
  const decoys = SEARCH_DECOYS[route] || [];
  return [decoys[0], decoys[1], product, decoys[2], decoys[3]].filter(Boolean);
}
