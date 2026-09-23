// Route B (VEXA FLEX X1) dialogue tree - same 2-choice-max structure as
// health.js (see that file's header comment for the overall shape).
//
// The file, its exports and every node id keep the `luckyBag` name. That is
// the ROUTE KEY, not the product. This route used to sell the 限量精品驚喜福袋
// and now sells the VEXA FLEX X1 - the same way health.js names the route that
// sells a robot vacuum, because a dialogue tree in this folder is named for
// the route it belongs to. The key is also baked into saved localStorage state
// and into every dialogue node id already recorded in a player's
// dialogueHistory, so renaming it would strand in-progress saves for no
// player-visible gain (see apps/blackpi/data/catalog.js for the same note).
// Nothing the player reads says 福袋 any more.
//
// Seller voice: ordinary Taiwanese marketplace customer service. Never 「親」.
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
      seller(t('您好，這批 VEXA FLEX X1 是品牌限時體驗活動，數量有限。', lang)),
      { speaker: 'seller', text: '', type: 'product-card', assetKey: 'vexa-flex-x1-main' },
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
        id: 'genuine',
        label: t('這是正版摺疊手機嗎？', lang),
        playerMessage: t('請問這是 VEXA FLEX X1 正版摺疊手機嗎？', lang),
        nextNodeId: 'luckyBag.presale.genuine',
        effects: { suspicion: 6 },
      },
      {
        id: 'screen',
        label: t('螢幕可以完整展開嗎？', lang),
        playerMessage: t('螢幕是可以完整展開的那種嗎？', lang),
        nextNodeId: 'luckyBag.presale.screen',
        effects: { suspicion: 5 },
      },
    ],
  },

  // genuine branch -----------------------------------------------------
  {
    id: 'luckyBag.presale.genuine',
    route: 'luckyBag',
    phase: 'preSale',
    messages: [seller(t('是的！目前是品牌限時體驗活動，所以才有這個優惠價格😊', lang))],
    choices: [
      {
        id: 'warranty',
        label: t('有保固卡或 IMEI 嗎？', lang),
        playerMessage: t('可以先提供保固卡或 IMEI 嗎？', lang),
        nextNodeId: 'luckyBag.presale.genuine.warranty',
        effects: { suspicion: 6 },
      },
      {
        id: 'realPhoto',
        label: t('可以看實機照片嗎？', lang),
        playerMessage: t('可以看實機的照片嗎？', lang),
        nextNodeId: 'luckyBag.presale.genuine.realPhoto',
        effects: { evidence: 3 },
      },
    ],
  },
  {
    id: 'luckyBag.presale.genuine.warranty',
    route: 'luckyBag',
    phase: 'preSale',
    messages: (state) => [
      seller(t('保固資料會隨機出貨一起寄出，體驗活動的機器目前無法先提供單一序號。', lang)),
      seller(toneLine(state, {
        trusting: t('您放心，這批的做工真的很不錯，很多客人回購第二支送家人。', lang),
        cautious: t('這批今天只剩最後 12 台，很多客人一次下兩單。', lang),
        defensive: t('這批賣得很快，已經沒剩多少台了，庫存數字是系統即時更新的。', lang),
      })),
    ],
    onEnterEffects: { suspicion: 10, urgency: 8, sellerPressure: 6, warningFlags: ['undefined_brand'] },
    autoNextNodeId: 'luckyBag.presale.stage3',
  },
  {
    id: 'luckyBag.presale.genuine.realPhoto',
    route: 'luckyBag',
    phase: 'preSale',
    messages: (state) => [
      seller(t('頁面上的圖片就是這個型號的商品圖，實際外觀仍以出貨批次為準。', lang)),
      seller(toneLine(state, {
        trusting: t('您放心，這批的做工真的很不錯，很多客人回購第二支送家人。', lang),
        cautious: t('這批今天只剩最後 12 台，很多客人一次下兩單。', lang),
        defensive: t('這批賣得很快，已經沒剩多少台了，庫存數字是系統即時更新的。', lang),
      })),
    ],
    onEnterEffects: { suspicion: 10, evidence: 6, urgency: 8, sellerPressure: 6, warningFlags: ['image_for_reference'] },
    autoNextNodeId: 'luckyBag.presale.stage3',
  },

  // screen branch -------------------------------------------------------
  {
    id: 'luckyBag.presale.screen',
    route: 'luckyBag',
    phase: 'preSale',
    messages: [seller(t('是的，8.7 吋旗艦摺疊大螢幕，商品規格與圖片皆以頁面展示為準。', lang))],
    choices: [
      {
        id: 'checkPrice',
        label: t('原價真的是 69,800 嗎？', lang),
        playerMessage: t('原價真的是 NT$69,800 嗎？', lang),
        nextNodeId: 'luckyBag.presale.screen.check',
        effects: { suspicion: 12, warningFlags: ['unverifiable_value'] },
      },
      {
        id: 'whyCheap',
        label: t('為什麼只賣 29,800？', lang),
        playerMessage: t('為什麼只賣 NT$29,800？', lang),
        nextNodeId: 'luckyBag.presale.screen.why',
        effects: { urgency: 6, sellerPressure: 5 },
      },
    ],
  },
  {
    id: 'luckyBag.presale.screen.check',
    route: 'luckyBag',
    phase: 'preSale',
    messages: [seller(t('原價是品牌公布的建議售價，這個型號在臺灣還沒有正式上市通路，所以查不到相同品項。', lang))],
    autoNextNodeId: 'luckyBag.presale.stage3',
  },
  {
    id: 'luckyBag.presale.screen.why',
    route: 'luckyBag',
    phase: 'preSale',
    messages: [seller(t('這是品牌體驗與庫存回饋活動，數量有限，所以才有這個價格。', lang))],
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
    messages: [seller(t('未使用、配件完整都可以依黑皮購物七天鑑賞期申請，不過開機啟用或機身有使用痕跡就不接受退貨。', lang))],
    choices: [
      {
        id: 'notGenuineCase',
        label: t('如果收到的不是這款手機呢？', lang),
        playerMessage: t('如果收到的不是這款手機呢？', lang),
        nextNodeId: 'luckyBag.presale.returnRule.notGenuine',
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
    id: 'luckyBag.presale.returnRule.notGenuine',
    route: 'luckyBag',
    phase: 'preSale',
    messages: [seller(t('這批都是同一條產線出貨的摺疊機型，外觀細節仍以商品頁展示為準。', lang))],
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
      { speaker: 'buyer', text: t('我收到的根本不是商品頁上的手機！這是兩支舊手機接在一起吧？', lang) },
      seller(t('您收到的確實是雙手機摺疊款，摺疊功能正常。', lang)),
    ],
    choices: [
      {
        id: 'demandReturn',
        label: t('商品與描述完全不符，我要求退貨並全額退款！', lang),
        playerMessage: t('商品與描述完全不符，我要求退貨並全額退款！', lang),
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
      trusting: t('不同批次外觀可能略有差異，可能您比較沒注意到，但商品確實具備摺疊功能。', lang),
      cautious: t('不同批次外觀可能略有差異，但商品確實具備摺疊功能。', lang),
      defensive: t('出貨批次是系統統一配發的，客服這邊只能依照系統紀錄回覆規格，商品確實具備摺疊功能。', lang),
    }))],
    choices: [
      {
        id: 'pressOn',
        label: t('這明明是兩支獨立手機', lang),
        playerMessage: t('商品寫的是 8.7 吋摺疊手機，這明明是兩支獨立手機！', lang),
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
    messages: [seller(t('這款是雙機身摺疊設計，兩邊各自獨立運作也屬於規格的一部分。', lang))],
    onEnterEffects: { suspicion: 12, evidence: 8, warningFlags: ['unverifiable_brand_claim'] },
    autoNextNodeId: 'luckyBag.dispute.toReturn',
  },
  {
    id: 'luckyBag.dispute.acceptIt',
    route: 'luckyBag',
    phase: 'dispute',
    messages: [notice(t('商品爭議提醒', lang), t('賣家可能用「不同批次」「規格差異」等說法帶過貨不對版，建議先保存實際收到的商品照片與商品頁宣稱，再決定是否申請退貨。', lang))],
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
    messages: [seller(t('很抱歉造成您的困擾，請透過平台申請退貨，我們會協助處理。', lang))],
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
