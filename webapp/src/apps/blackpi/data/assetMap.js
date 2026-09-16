// Centralized asset registry for the BlackPi storefront (scenario04's
// shopping app). Every screen looks up its image by assetKey through here
// rather than inlining a path or a label - so the real photography lives in
// exactly one table.
//
// It sits inside the BlackPi module because BlackPi is its only consumer:
// components/AssetImage.jsx, components/ChatScreen.jsx and
// screens/ProductDetail.jsx are the three importers, and nothing outside the
// app has ever asked this table for anything. It used to live at
// src/data/assetMap.js, which read as shared scenario data it never was.
//
// Shape: { src, label, size }
//   src   - public URL of the real photo, or undefined when no real asset
//           exists yet. Components (see ../components/AssetImage.jsx) render a
//           real <img> when src is present and fall back to the dashed
//           <Placeholder> only when it is not.
//   label - Chinese caption, also used as the <img> alt text; translated
//           through pages/scenario04/i18n.js at the call site.
//   size   - intrinsic pixel size, shown by the placeholder fallback only.
//
// Files live in webapp/public/assets/scenarios/scenario-04/images/products/ as
// WebP - the shipped format for every photo in this repo - and are all square
// (1:1) so every consumer can safely use object-fit: cover without distorting
// or cropping the product out of frame. That folder is the scenario's product
// artwork specifically; its ending mascots sit beside it under images/results/,
// which resultMascots.js owns and this table never names.
const DIR = `${import.meta.env.BASE_URL}assets/scenarios/scenario-04/images/products/`;

const photo = (file, label, size = '2048×2048') => ({ src: `${DIR}${file}.webp`, label, size });

export const ASSET_MAP = {
  // -----------------------------------------------------------------
  // Route A - 智慧掃拖機器人 (貨不對版). Product page shows a high-end
  // robot vacuum; the parcel contains a detachable broom and a dustpan.
  // -----------------------------------------------------------------
  'robot-vacuum-main': photo('robot-vacuum-main', '智慧掃拖機器人商品主圖', '1024×1024'),
  'robot-vacuum-lifestyle': photo('robot-vacuum-lifestyle', '居家自動清掃情境照', '1024×1024'),
  'robot-vacuum-features': photo('robot-vacuum-features', '智慧導航與 APP 功能說明圖', '1024×1024'),
  'robot-vacuum-review': photo('robot-vacuum-review', '買家實拍照片（評論用）', '1024×1024'),
  'robot-vacuum-package': photo('robot-vacuum-package', '尚未拆開的宅配紙箱'),
  'robot-vacuum-unboxed': photo('robot-vacuum-unboxed', '拆開紙箱後看到的內容物'),
  'robot-vacuum-broom-head': photo('robot-vacuum-broom-head', '掃把頭'),
  'robot-vacuum-broom-poles': photo('robot-vacuum-broom-poles', '可拆式掃把桿'),
  'robot-vacuum-dustpan': photo('robot-vacuum-dustpan', '畚箕'),
  'robot-vacuum-actual': photo('robot-vacuum-actual', '實際收到的掃把與畚箕'),

  // -----------------------------------------------------------------
  // Route B - 精品驚喜福袋. The PDP carousel sells the fantasy; the
  // unboxing set is the four cheap items that actually arrive.
  // -----------------------------------------------------------------
  'luckybag-main': photo('luckybag-main', '驚喜福袋商品主圖'),
  'luckybag-premium-contents': photo('luckybag-premium-contents', '福袋精品內容示意圖'),
  // The single most persuasive shot in the carousel - a table full of
  // premium-looking gifts. Also the "商品頁宣稱" side of the claim-vs-actual
  // comparison, because it is what the player actually believed they were
  // buying.
  'luckybag-gift-selection': photo('luckybag-gift-selection', '福袋精品禮物示意圖'),
  'luckybag-limited': photo('luckybag-limited', '限量庫存宣傳圖'),
  'luckybag-review': photo('luckybag-review', '買家實拍照片（評論用）'),
  'luckybag-package': photo('luckybag-package', '尚未拆開的普通包裹'),
  'luckybag-unboxed': photo('luckybag-unboxed', '福袋開箱內容'),
  'luckybag-phone-holder': photo('luckybag-phone-holder', '無品牌塑膠手機架'),
  'luckybag-socks': photo('luckybag-socks', '普通襪子'),
  'luckybag-cup': photo('luckybag-cup', '一個普通廉價陶瓷杯'),
  'luckybag-keychain': photo('luckybag-keychain', '普通鑰匙圈'),
  'luckybag-actual': photo('luckybag-actual', '福袋實際收到的四件商品'),

  // -----------------------------------------------------------------
  // VEXA FLEX X1 - the foldable phone that will replace 精品驚喜福袋 as
  // Route B's product. The photography is in; the story is not. Nothing
  // reads these four keys yet: ./catalog.js still sells the 福袋, and the
  // luckybag-* entries above stay until it stops.
  //
  // They are registered now rather than later because a shipped file no
  // registry names fails validate-asset-ownership RULE 1 - the table is
  // what makes a photo reachable, so the photo and its entry land together.
  //
  // 1536x1536, the only size in this table that is neither 1024 nor 2048.
  // It is what the masters are; resampling to a rounder number would cost
  // detail for nothing. Square is the part that matters, and they are.
  // -----------------------------------------------------------------
  'vexa-flex-x1-main': photo('vexa-flex-x1-main', 'VEXA FLEX X1 摺疊手機商品主圖', '1536×1536'),
  'vexa-flex-x1-camera': photo('vexa-flex-x1-camera', 'VEXA FLEX X1 三鏡頭細節圖', '1536×1536'),
  'vexa-flex-x1-display': photo('vexa-flex-x1-display', 'VEXA FLEX X1 展開螢幕細節圖', '1536×1536'),
  'vexa-flex-x1-connectivity': photo('vexa-flex-x1-connectivity', 'VEXA FLEX X1 底部連接埠細節圖', '1536×1536'),

  // -----------------------------------------------------------------
  // VEXA FLEX X1 - what actually arrives. The four shots above are the
  // product page's claim; these four are the parcel: two cheap phones
  // joined by a door hinge and sold as one foldable. Same claim-vs-actual
  // pairing the robot-vacuum-* and luckybag-* sets above already use.
  //
  // Registered now for the same reason as the claim set, and with the same
  // caveat - nothing reads these four keys yet either. ./catalog.js still
  // sells the 福袋 and pages/scenario04/Unboxing.jsx still opens a parcel of
  // luckybag-* items, so no screen changes because these landed.
  //
  // 1254x1254 - square, which is the part this table promises its
  // consumers, but a third size again alongside 1024 and 2048. It is what
  // the masters are; resampling them to a rounder number would cost detail
  // for nothing.
  // -----------------------------------------------------------------
  'vexa-flex-x1-actual-unboxing': photo(
    'vexa-flex-x1-actual-unboxing',
    'VEXA FLEX X1 實際收到商品開箱照',
    '1254×1254',
  ),
  'vexa-flex-x1-actual-main': photo(
    'vexa-flex-x1-actual-main',
    'VEXA FLEX X1 實際收到商品正面照',
    '1254×1254',
  ),
  'vexa-flex-x1-actual-hinge': photo(
    'vexa-flex-x1-actual-hinge',
    'VEXA FLEX X1 實際收到商品轉軸瑕疵',
    '1254×1254',
  ),
  'vexa-flex-x1-actual-folded': photo(
    'vexa-flex-x1-actual-folded',
    'VEXA FLEX X1 實際收到商品摺疊背面',
    '1254×1254',
  ),

  // -----------------------------------------------------------------
  // Decorative filler only. `filler-generic` deliberately has no `src`:
  // the ~30 storefront filler cards and category-matched search decoys are
  // scenery, not part of the story, so they keep the neutral placeholder
  // tile rather than borrowing a story product's photo and implying a
  // relationship.
  //
  // The four `decor-*` keys below are the exception: they back the fixed
  // home-screen row (see ./catalog.js HOME_DECOR_PRODUCTS) and use real
  // product photography so the storefront reads as a real shop. Each key is
  // paired to its product by content, not by file order.
  //
  // Their four files stay in the scenario's public folder alongside the rest
  // of scenario04's product artwork - they are deliberately not moved into
  // src/apps/blackpi/assets/. Moving this table into the BlackPi module was a
  // question about which module owns the *code*; these are story artwork,
  // shot for this scenario's storefront, and they belong with the other 22
  // photos this same table resolves. Keeping them here also keeps one
  // resolution mechanism for all 26: a runtime URL off DIR, not a bundled
  // Vite import for four of them and a URL for the rest.
  // -----------------------------------------------------------------
  'filler-generic': { label: '商品圖片', size: '600×600' },
  'decor-powerbank': photo('power-bank', '行動電源商品縮圖', '1024×1024'),
  'decor-keyboard': photo('bluetooth-mechanical-keyboard', '機械鍵盤商品縮圖', '1024×1024'),
  'decor-speaker': photo('waterproof-bluetooth-speaker', '藍牙喇叭商品縮圖', '1024×1024'),
  'decor-coffee': photo('drip-coffee-10-pack', '掛耳咖啡商品縮圖', '1024×1024'),
};

export function getAsset(key) {
  return ASSET_MAP[key] || { label: key || '圖片', size: '' };
}
