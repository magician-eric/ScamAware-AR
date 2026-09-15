// Route B (驚喜福袋) dialogue tree - same 2-choice-max structure as
// health.js (see that file's header comment for the overall shape).
import { toneLine } from '../../features/shopping/sellerTone';
import { t } from '../../pages/scenario04/i18n';

const seller = (text, opts = {}) => ({ speaker: 'seller', text, ...opts });
const notice = (title, text) => ({ speaker: 'system', type: 'notice', text, data: { title } });

// ---------------------------------------------------------------------------
// Pre-sale ------------------------------------------------------------------
// ---------------------------------------------------------------------------

export function buildLuckyBagPresaleTree(lang) {
  return [
  {
    id: 'luckyBag.presale.welcome',
    route: 'luckyBag',
    phase: 'preSale',
    messages: [
      seller(t('您好，這批是限量精品驚喜福袋，每袋都保證有品牌商品喔。', lang)),
      { speaker: 'seller', text: '', type: 'product-card', assetKey: 'luckybag-main' },
    ],
    autoNextNodeId: 'luckyBag.presale.stage1',
  },
  {
    id: 'luckyBag.presale.stage1',
    route: 'luckyBag',
    phase: 'preSale',
    messages: [],
    choices: [
      {
        id: 'brand',
        label: t('一定有知名品牌嗎？', lang),
        playerMessage: t('一定有知名品牌嗎？', lang),
        nextNodeId: 'luckyBag.presale.brand',
        effects: { suspicion: 6 },
      },
      {
        id: 'value',
        label: t('價值真的超過五千？', lang),
        playerMessage: t('價值真的超過五千嗎？', lang),
        nextNodeId: 'luckyBag.presale.value',
        effects: { suspicion: 5 },
      },
    ],
  },

  // brand branch -------------------------------------------------------
  {
    id: 'luckyBag.presale.brand',
    route: 'luckyBag',
    phase: 'preSale',
    messages: [seller(t('每袋至少有一件合作品牌商品，但品牌與款式無法指定。', lang))],
    choices: [
      {
        id: 'which',
        label: t('有哪些合作品牌？', lang),
        playerMessage: t('有哪些合作品牌？', lang),
        nextNodeId: 'luckyBag.presale.brand.which',
        effects: { suspicion: 6 },
      },
      {
        id: 'seeOthers',
        label: t('可以看買家開箱嗎？', lang),
        playerMessage: t('可以看其他買家的開箱嗎？', lang),
        nextNodeId: 'luckyBag.presale.brand.seeOthers',
        effects: { evidence: 3 },
      },
    ],
  },
  {
    id: 'luckyBag.presale.brand.which',
    route: 'luckyBag',
    phase: 'preSale',
    messages: (state) => [
      seller(t('合作品牌會依批次調整，為了保留驚喜感，目前不公開完整名單。', lang)),
      seller(toneLine(state, {
        trusting: t('您放心，這批品質真的很不錯，很多人一次買兩袋回購。', lang),
        cautious: t('這批今天只剩最後 12 組，很多人一次買兩袋。', lang),
        defensive: t('這批賣得很快，已經沒剩多少組了，庫存數字是系統即時更新的。', lang),
      })),
    ],
    onEnterEffects: { suspicion: 10, urgency: 8, sellerPressure: 6, warningFlags: ['undefined_brand'] },
    autoNextNodeId: 'luckyBag.presale.stage3',
  },
  {
    id: 'luckyBag.presale.brand.seeOthers',
    route: 'luckyBag',
    phase: 'preSale',
    messages: (state) => [
      seller(t('圖片是過去批次的內容示意，每一袋不保證完全相同。', lang)),
      seller(toneLine(state, {
        trusting: t('您放心，這批品質真的很不錯，很多人一次買兩袋回購。', lang),
        cautious: t('這批今天只剩最後 12 組，很多人一次買兩袋。', lang),
        defensive: t('這批賣得很快，已經沒剩多少組了，庫存數字是系統即時更新的。', lang),
      })),
    ],
    onEnterEffects: { suspicion: 10, evidence: 6, urgency: 8, sellerPressure: 6, warningFlags: ['image_for_reference'] },
    autoNextNodeId: 'luckyBag.presale.stage3',
  },

  // value branch --------------------------------------------------------
  {
    id: 'luckyBag.presale.value',
    route: 'luckyBag',
    phase: 'preSale',
    messages: [seller(t('是以商品原始建議售價計算，每袋商品的建議售價合計都超過 NT$5,000。', lang))],
    choices: [
      {
        id: 'checkPrice',
        label: t('原始售價可以查嗎？', lang),
        playerMessage: t('原始售價可以查嗎？', lang),
        nextNodeId: 'luckyBag.presale.value.check',
        effects: { suspicion: 12, warningFlags: ['unverifiable_value'] },
      },
      {
        id: 'whyCheap',
        label: t('為什麼只賣 999？', lang),
        playerMessage: t('為什麼只賣 999？', lang),
        nextNodeId: 'luckyBag.presale.value.why',
        effects: { urgency: 6, sellerPressure: 5 },
      },
    ],
  },
  {
    id: 'luckyBag.presale.value.check',
    route: 'luckyBag',
    phase: 'preSale',
    messages: [seller(t('部分商品是合作通路限定款，公開通路不一定查得到相同品項。', lang))],
    autoNextNodeId: 'luckyBag.presale.stage3',
  },
  {
    id: 'luckyBag.presale.value.why',
    route: 'luckyBag',
    phase: 'preSale',
    messages: [seller(t('這是品牌宣傳與庫存回饋活動，數量有限，所以用福袋形式提供。', lang))],
    autoNextNodeId: 'luckyBag.presale.stage3',
  },

  // convergence -----------------------------------------------------
  {
    id: 'luckyBag.presale.stage3',
    route: 'luckyBag',
    phase: 'preSale',
    messages: [],
    choices: [
      { id: 'buyNow', label: t('直接購買', lang), playerMessage: t('好，我要直接購買。', lang), nextNodeId: 'luckyBag.presale.toCheckout' },
      { id: 'askReturn', label: t('我想先問退貨規則', lang), playerMessage: t('我想先問退貨規則。', lang), nextNodeId: 'luckyBag.presale.returnRule' },
    ],
  },
  {
    id: 'luckyBag.presale.returnRule',
    route: 'luckyBag',
    phase: 'preSale',
    messages: [seller(t('未使用、商品完整都可以依黑皮購物七天鑑賞期申請，不過福袋內容隨機，不接受因款式不喜歡退貨。', lang))],
    choices: [
      {
        id: 'noBrandCase',
        label: t('如果完全沒有品牌商品呢？', lang),
        playerMessage: t('如果完全沒有品牌商品呢？', lang),
        nextNodeId: 'luckyBag.presale.returnRule.noBrand',
        effects: { suspicion: 10, warningFlags: ['broad_brand_definition'] },
      },
      {
        id: 'mismatchCase',
        label: t('如果跟描述不符呢？', lang),
        playerMessage: t('如果商品跟描述不符呢？', lang),
        nextNodeId: 'luckyBag.presale.returnRule.mismatch',
        effects: { evidence: 5 },
      },
    ],
  },
  {
    id: 'luckyBag.presale.returnRule.noBrand',
    route: 'luckyBag',
    phase: 'preSale',
    messages: [seller(t('我們的合作選物也屬於品牌商品，只是有些品牌在台灣比較少見。', lang))],
    autoNextNodeId: 'luckyBag.presale.toCheckout',
  },
  {
    id: 'luckyBag.presale.returnRule.mismatch',
    route: 'luckyBag',
    phase: 'preSale',
    messages: [seller(t('若有明顯出貨錯誤，可以提交照片讓倉庫判定。', lang))],
    autoNextNodeId: 'luckyBag.presale.toCheckout',
  },
  // Exit sentinel - see the matching comment in health.js.
  { id: 'luckyBag.presale.toCheckout', route: 'luckyBag', phase: 'preSale', messages: [], terminal: true },
  ];
}

// ---------------------------------------------------------------------------
// Received / dispute ---------------------------------------------------------
// ---------------------------------------------------------------------------

export function buildLuckyBagDisputeTree(lang) {
  return [
  {
    id: 'luckyBag.dispute.opening',
    route: 'luckyBag',
    phase: 'dispute',
    messages: [
      { speaker: 'buyer', text: t('你好，我收到的福袋裡完全沒有商品頁說的品牌精品，這是寄錯了嗎？', lang) },
      seller(t('您好，福袋的內容本來就是隨機搭配，每位買家收到的商品都不同喔。', lang)),
    ],
    choices: [
      {
        id: 'demandBrand',
        label: t('沒有品牌商品，我要退貨', lang),
        playerMessage: t('完全沒有品牌商品，我要退貨。', lang),
        nextNodeId: 'luckyBag.dispute.returnPath',
        effects: { assertiveness: 8, evidence: 5 },
      },
      {
        id: 'hearExplain',
        label: t('先聽你們怎麼解釋', lang),
        playerMessage: t('先聽你們怎麼解釋。', lang),
        nextNodeId: 'luckyBag.dispute.explain',
        effects: { trust: 5 },
      },
    ],
  },

  {
    id: 'luckyBag.dispute.explain',
    route: 'luckyBag',
    phase: 'dispute',
    messages: (state) => [seller(toneLine(state, {
      trusting: t('品牌商品包含我們合作的選物品牌，可能您比較沒注意到，我幫您再確認一次內容。', lang),
      cautious: t('品牌商品包含我們合作的選物品牌，不一定是大家熟悉的國際品牌。', lang),
      defensive: t('福袋商品清單是系統依批次配發的，客服這邊只能依照系統紀錄回覆品牌類別。', lang),
    }))],
    choices: [
      {
        id: 'pressOn',
        label: t('請指出哪一件是品牌商品', lang),
        playerMessage: t('請指出哪一件是品牌商品。', lang),
        nextNodeId: 'luckyBag.dispute.pressOn',
        effects: { assertiveness: 10, suspicion: 8, evidence: 5 },
      },
      {
        id: 'acceptIt',
        label: t('好吧，可能我誤會了', lang),
        playerMessage: t('好吧，可能是我誤會了。', lang),
        nextNodeId: 'luckyBag.dispute.acceptIt',
      },
    ],
  },
  {
    id: 'luckyBag.dispute.pressOn',
    route: 'luckyBag',
    phase: 'dispute',
    messages: [seller(t('手機架是合作生活品牌的商品，只是採用簡約包裝，因此沒有明顯 Logo。', lang))],
    onEnterEffects: { suspicion: 12, evidence: 8, warningFlags: ['unverifiable_brand_claim'] },
    autoNextNodeId: 'luckyBag.dispute.toReturn',
  },
  {
    id: 'luckyBag.dispute.acceptIt',
    route: 'luckyBag',
    phase: 'dispute',
    messages: [notice(t('商品爭議提醒', lang), t('「品牌商品」的定義可能被賣家擴大解釋，建議先保存商品內容與商品頁宣稱，再決定是否申請退貨。', lang))],
    choices: [
      {
        id: 'saveData',
        label: t('保存商品資料', lang),
        playerMessage: t('我先保存商品資料。', lang),
        nextNodeId: 'luckyBag.dispute.toReturn',
        effects: { evidence: 8 },
      },
      {
        id: 'demandReturn2',
        label: t('要求賣家退貨', lang),
        playerMessage: t('我要要求賣家退貨。', lang),
        nextNodeId: 'luckyBag.dispute.toReturn',
        effects: { assertiveness: 6 },
      },
    ],
  },

  {
    id: 'luckyBag.dispute.returnPath',
    route: 'luckyBag',
    phase: 'dispute',
    messages: [seller(t('可以協助您申請退貨，不過福袋內容為隨機出貨，需要倉庫確認是否符合退貨條件。', lang))],
    choices: [
      {
        id: 'insist',
        label: t('商品與描述不符，不是不喜歡', lang),
        playerMessage: t('是商品與描述不符，不是單純不喜歡。', lang),
        nextNodeId: 'luckyBag.dispute.toReturn',
      },
      {
        id: 'giveup',
        label: t('算了，不想那麼麻煩', lang),
        playerMessage: t('算了，不想那麼麻煩。', lang),
        nextNodeId: 'luckyBag.dispute.giveupWarn',
      },
    ],
  },
  {
    id: 'luckyBag.dispute.giveupWarn',
    route: 'luckyBag',
    phase: 'dispute',
    messages: [notice(t('放棄退貨提醒', lang), t('放棄退貨將使後續求償更困難。你仍可以保存證據並向平台提出爭議。', lang))],
    choices: [
      {
        id: 'stillReturn',
        label: t('我再想想，還是要退貨', lang),
        playerMessage: t('我再想想，還是要申請退貨。', lang),
        nextNodeId: 'luckyBag.dispute.toReturn',
      },
      {
        id: 'completeOrder',
        label: t('先完成訂單好了', lang),
        playerMessage: t('好，我先完成訂單。', lang),
        nextNodeId: 'luckyBag.dispute.completedOrderExit',
        effects: { trust: 5, evidence: -5, warningFlags: ['premature_order_completion'] },
      },
    ],
  },

  { id: 'luckyBag.dispute.toReturn', route: 'luckyBag', phase: 'dispute', messages: [], terminal: true },
    { id: 'luckyBag.dispute.completedOrderExit', route: 'luckyBag', phase: 'dispute', messages: [], terminal: true },
  ];
}

export function buildLuckyBagDialogueTree(lang) {
  return [...buildLuckyBagPresaleTree(lang), ...buildLuckyBagDisputeTree(lang)];
}
