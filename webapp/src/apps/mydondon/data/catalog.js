import tabletPhoto from '../assets/tablet.webp';
import strollerPhoto from '../assets/stroller.webp';

// Product data for scenario05 (幽靈訂單 / 假買家騙賣家). The two branches only
// ever differ by these fields - every downstream screen and dialogue node
// reads through getProduct(selectedProduct, lang) rather than forking the
// script (spec section 5: "不要為兩項商品製作兩套完全不同的劇情").
//
// name/desc/assetLabel are per-language (zh/en/jp) - id, price, priceValue
// and image stay fixed regardless of language, per spec: the listed price
// is the source of truth for every downstream screen (Listing, ShopCreate,
// etc.), so it's never translated/reformatted per-currency.
export const PRODUCTS = {
  tablet: {
    id: 'tablet',
    price: 'NT$12,000',
    priceValue: 12000,
    image: tabletPhoto,
    name: { zh: '10.9 吋二手平板', en: '10.9" Used Tablet', jp: '10.9インチ 中古タブレット' },
    desc: {
      zh: '功能正常，外觀有輕微使用痕跡',
      en: 'Works fine, minor cosmetic wear',
      jp: '動作良好、外観に軽い使用感あり',
    },
    assetLabel: {
      zh: '商品照：二手平板電腦',
      en: 'Product photo: used tablet',
      jp: '商品写真：中古タブレット',
    },
  },
  stroller: {
    id: 'stroller',
    price: 'NT$4,500',
    priceValue: 4500,
    image: strollerPhoto,
    name: { zh: '輕量型嬰兒手推車', en: 'Lightweight Baby Stroller', jp: '軽量ベビーカー' },
    desc: {
      zh: '使用約一年，功能正常',
      en: 'About a year old, works fine',
      jp: '使用期間約1年、動作良好',
    },
    assetLabel: {
      zh: '商品照：嬰兒手推車',
      en: 'Product photo: baby stroller',
      jp: '商品写真：ベビーカー',
    },
  },
};

// Resolves a product's per-language fields into plain strings so every
// caller (Listing, ProductSelect, ShopCreate, HpeShip, the dialogue trees)
// can keep reading product.name/product.desc/product.assetLabel exactly as
// before, without knowing about the {zh,en,jp} shape underneath.
export function getProduct(id, lang = 'zh') {
  const p = PRODUCTS[id];
  if (!p) return null;
  return {
    ...p,
    name: p.name[lang] || p.name.zh,
    desc: p.desc[lang] || p.desc.zh,
    assetLabel: p.assetLabel[lang] || p.assetLabel.zh,
  };
}

export function getAllProducts(lang = 'zh') {
  return Object.keys(PRODUCTS).map((id) => getProduct(id, lang));
}
