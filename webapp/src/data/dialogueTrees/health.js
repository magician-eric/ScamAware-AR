// Route A (智慧掃拖機器人 - 貨不對版) dialogue tree - every node has at most
// 2 choices. Pre-sale is staged (seller leads, 3 short rounds max) rather
// than a 4-question hub the player has to exhaust before buying;
// post-receipt dispute collapses the old 4-way fork into one clear contrast
// (push back vs hear the seller out) that still reaches every downstream
// beat.
//
// LEGACY NAMING: the route key and every node id in this file are still
// `health.*`. That is an internal identifier only - see the note at the top
// of data/products.js. Player-facing copy here is entirely the robot-vacuum
// story; keeping the ids means saved dialogueHistory / currentDialogueNodeId
// blobs from in-progress runs keep resolving instead of stranding on a dead
// branch. A few choice ids read oddly against the new copy for the same
// reason: `origin` = the smart-features branch, `expiry` = the battery /
// stock-pressure beat, `label`/`confirmLabel` = the spec double-check, and
// `tryIt` = "just use it anyway".
import { toneLine } from '../../features/shopping/sellerTone';
import { t } from '../../pages/scenario04/i18n';

const seller = (text, opts = {}) => ({ speaker: 'seller', text, ...opts });
const notice = (title, text) => ({ speaker: 'system', type: 'notice', text, data: { title } });

// ---------------------------------------------------------------------------
// Pre-sale ------------------------------------------------------------------
// ---------------------------------------------------------------------------

export function buildHealthPresaleTree(lang) {
  return [
  {
    id: 'health.presale.welcome',
    route: 'health',
    phase: 'preSale',
    messages: [
      seller(t('您好，這款掃拖機器人是本月主打，智慧導航加上 APP 遠端控制，現在剛好是活動批次喔。', lang)),
      { speaker: 'seller', text: '', type: 'product-card', assetKey: 'robot-vacuum-main' },
    ],
    autoNextNodeId: 'health.presale.stage1',
  },
  {
    id: 'health.presale.stage1',
    route: 'health',
    phase: 'preSale',
    messages: [],
    choices: [
      {
        id: 'origin',
        label: t('這台可以掃拖一起用嗎？', lang),
        playerMessage: t('這台可以掃拖一起用嗎？', lang),
        nextNodeId: 'health.presale.origin',
        effects: { trust: 5, suspicion: 2 },
      },
      {
        id: 'price',
        label: t('這個價格怎麼比其他台便宜這麼多？', lang),
        playerMessage: t('這個價格怎麼比其他台便宜這麼多？', lang),
        nextNodeId: 'health.presale.price',
        effects: { suspicion: 10, assertiveness: 4 },
      },
    ],
  },

  // smart-features branch ----------------------------------------------
  {
    id: 'health.presale.origin',
    route: 'health',
    phase: 'preSale',
    messages: [seller(t('可以，這台是掃拖二合一，也支援 APP 遠端控制、自動回充和智慧導航。', lang))],
    choices: [
      {
        id: 'proof',
        label: t('可以看實機操作影片嗎？', lang),
        playerMessage: t('可以看實機操作影片嗎？', lang),
        nextNodeId: 'health.presale.origin.proof',
        effects: { suspicion: 8, evidence: 3, warningFlags: ['ask_label'] },
      },
      {
        id: 'expiry',
        label: t('電池可以用多久？', lang),
        playerMessage: t('電池可以用多久？', lang),
        nextNodeId: 'health.presale.origin.expiry',
      },
    ],
  },
  {
    id: 'health.presale.origin.proof',
    route: 'health',
    phase: 'preSale',
    messages: (state) => [seller(toneLine(state, {
      trusting: t('這個您放心，功能都是原廠標配，您可以先安心下單，之後有任何問題我都會處理。', lang),
      cautious: t('操作影片由原廠統一製作，目前還在更新，不過功能都與商品頁一致，請放心。', lang),
      defensive: t('同型號的操作影片由原廠統一管理，客服端沒有辦法逐筆調閱，不過這款已經賣出兩千多台，目前沒有大規模反映問題。', lang),
    }))],
    onEnterEffects: { suspicion: 8, evidence: 4, warningFlags: ['vague_import_document'] },
    autoNextNodeId: 'health.presale.stage3',
  },
  {
    id: 'health.presale.origin.expiry',
    route: 'health',
    phase: 'preSale',
    messages: (state) => [
      seller(t('目前批次滿電可以連續清掃 120 分鐘，電量不足時會自動回到充電座。', lang)),
      seller(toneLine(state, {
        trusting: t('您很有眼光，這批回購率真的很高。我可以先幫您保留一台，但系統只能保留 15 分鐘喔。', lang),
        cautious: t('目前優惠庫存只剩 4 台，今天下單預計 1 至 2 個工作天出貨。', lang),
        defensive: t('這批賣得很快，已經有兩千多人下單了，庫存數字是系統即時更新，建議您儘快決定。', lang),
      })),
    ],
    onEnterEffects: { trust: 4, urgency: 8, sellerPressure: 6 },
    autoNextNodeId: 'health.presale.stage3',
  },

  // price branch --------------------------------------------------------
  {
    id: 'health.presale.price',
    route: 'health',
    phase: 'preSale',
    messages: [seller(t('這批是原廠週年活動的特別價格，我們減少中間通路成本，所以才能提供優惠。', lang))],
    choices: [
      {
        id: 'invoice',
        label: t('有沒有發票？', lang),
        playerMessage: t('有沒有發票？', lang),
        nextNodeId: 'health.presale.price.invoice',
        effects: { suspicion: 6, evidence: 4 },
      },
      {
        id: 'cod',
        label: t('可以貨到付款嗎？', lang),
        playerMessage: t('可以貨到付款嗎？', lang),
        nextNodeId: 'health.presale.price.cod',
        effects: { trust: 5 },
      },
    ],
  },
  {
    id: 'health.presale.price.invoice',
    route: 'health',
    phase: 'preSale',
    messages: [seller(t('訂單完成後會由平台提供電子購買紀錄，相關憑證可在訂單頁查看。', lang))],
    autoNextNodeId: 'health.presale.stage3',
  },
  {
    id: 'health.presale.price.cod',
    route: 'health',
    phase: 'preSale',
    messages: [seller(t('目前家電商品只支援黑皮支付，付款後由平台保障交易。', lang))],
    autoNextNodeId: 'health.presale.stage3',
  },

  // convergence -----------------------------------------------------
  {
    id: 'health.presale.stage3',
    route: 'health',
    phase: 'preSale',
    messages: [],
    choices: [
      { id: 'buyNow', label: t('直接購買', lang), playerMessage: t('好，我要直接購買。', lang), nextNodeId: 'health.presale.toCheckout' },
      { id: 'confirmLabel', label: t('我想再確認規格', lang), playerMessage: t('我想再確認一下規格。', lang), nextNodeId: 'health.presale.label' },
    ],
  },
  {
    id: 'health.presale.label',
    route: 'health',
    phase: 'preSale',
    messages: [seller(t('商品頁的規格都是原廠提供的，不同批次的配件包裝可能稍有差異，不影響主機功能。', lang))],
    choices: [
      {
        id: 'photo',
        label: t('可以先看實機照片嗎？', lang),
        playerMessage: t('可以先看實機照片嗎？', lang),
        nextNodeId: 'health.presale.label.photo',
        effects: { suspicion: 12, evidence: 6, warningFlags: ['refuse_actual_photo'] },
      },
      {
        id: 'ok',
        label: t('功能有寫清楚就好', lang),
        playerMessage: t('功能有寫清楚就好。', lang),
        nextNodeId: 'health.presale.label.ok',
        effects: { trust: 6 },
      },
    ],
  },
  {
    id: 'health.presale.label.photo',
    route: 'health',
    phase: 'preSale',
    messages: [seller(t('目前商品都已經封箱，客服手上沒有同批次照片，不過都是依規定處理的喔。', lang))],
    autoNextNodeId: 'health.presale.toCheckout',
  },
  {
    id: 'health.presale.label.ok',
    route: 'health',
    phase: 'preSale',
    messages: [seller(t('沒問題，您可以放心下單。', lang))],
    autoNextNodeId: 'health.presale.toCheckout',
  },
  // Exit sentinel - SellerChat.jsx watches for a currentNodeId ending in
  // '.toCheckout' and navigates away; this stub just needs to exist so the
  // dialogue-tree validator can confirm every choice/autoNext target
  // actually resolves to a real node.
  { id: 'health.presale.toCheckout', route: 'health', phase: 'preSale', messages: [], terminal: true },
  ];
}

// ---------------------------------------------------------------------------
// Received / dispute ---------------------------------------------------------
// ---------------------------------------------------------------------------

export function buildHealthDisputeTree(lang) {
  return [
  {
    id: 'health.dispute.opening',
    route: 'health',
    phase: 'dispute',
    messages: [
      { speaker: 'buyer', text: t('你好，我買的是掃地機器人，但收到的是掃把，是不是寄錯了？', lang) },
      seller(t('不好意思，我先幫您確認一下訂單跟出貨紀錄。', lang)),
      seller(t('我這邊查到您的訂單是這次活動批次，我再幫您確認一下出貨內容。', lang), { delay: 900 }),
    ],
    autoNextNodeId: 'health.dispute.explain',
  },

  {
    id: 'health.dispute.explain',
    route: 'health',
    phase: 'dispute',
    messages: [seller(t('系統顯示這批活動商品是依「居家清潔系列」配置出貨。', lang))],
    choices: [
      {
        id: 'pressOn',
        label: t('可是我商品頁買的是掃地機器人', lang),
        playerMessage: t('可是我商品頁買的是掃地機器人。', lang),
        nextNodeId: 'health.dispute.pressOn',
        effects: { assertiveness: 10, suspicion: 8, evidence: 8 },
      },
      {
        id: 'tryIt',
        label: t('所以這不是寄錯？', lang),
        playerMessage: t('所以這不是寄錯？', lang),
        nextNodeId: 'health.dispute.pressOn',
      },
    ],
  },
  {
    id: 'health.dispute.pressOn',
    route: 'health',
    phase: 'dispute',
    messages: [
      seller(t('這批活動商品的部分圖片屬於系列示意，不同批次出貨內容可能不同。', lang)),
      seller(t('實際出貨內容會依活動批次配置，客服這邊只能依系統紀錄處理。', lang), { delay: 700 }),
    ],
    onEnterEffects: { suspicion: 12, evidence: 8, warningFlags: ['refuse_proof'] },
    choices: [
      { id: 'notDisclosed', label: t('商品頁完全沒有寫會收到掃把', lang), playerMessage: t('商品頁完全沒有寫會收到掃把。', lang), nextNodeId: 'health.dispute.returnPath', effects: { evidence: 8 } },
      { id: 'demandReturn', label: t('我要退貨', lang), playerMessage: t('我要退貨。', lang), nextNodeId: 'health.dispute.returnPath', effects: { assertiveness: 8 } },
    ],
  },
  {
    id: 'health.dispute.returnPath',
    route: 'health',
    phase: 'dispute',
    messages: [seller(t('可以協助您提出申請。不過家電商品拆封後需要由倉庫判定外箱與配件是否完整，才能確認是否符合退貨條件。', lang))],
    choices: [
      {
        id: 'insist',
        label: t('我只拆外箱，商品沒有使用', lang),
        playerMessage: t('我只拆物流外箱，商品沒有使用。', lang),
        nextNodeId: 'health.dispute.toReturn',
      },
      {
        id: 'giveup',
        label: t('算了，不想那麼麻煩', lang),
        playerMessage: t('算了，不想那麼麻煩。', lang),
        nextNodeId: 'health.dispute.giveupWarn',
      },
    ],
  },
  {
    id: 'health.dispute.giveupWarn',
    route: 'health',
    phase: 'dispute',
    messages: [notice(t('放棄退貨提醒', lang), t('放棄退貨將使後續求償更困難。你仍可以保存證據並向平台提出爭議。', lang))],
    choices: [
      {
        id: 'stillReturn',
        label: t('我再想想，還是要退貨', lang),
        playerMessage: t('我再想想，還是要申請退貨。', lang),
        nextNodeId: 'health.dispute.toReturn',
      },
      {
        id: 'completeOrder',
        label: t('先完成訂單好了', lang),
        playerMessage: t('好，我先完成訂單。', lang),
        nextNodeId: 'health.dispute.completedOrderExit',
        effects: { trust: 5, evidence: -5, warningFlags: ['premature_order_completion'] },
      },
    ],
  },

  { id: 'health.dispute.toReturn', route: 'health', phase: 'dispute', messages: [], terminal: true },
    { id: 'health.dispute.completedOrderExit', route: 'health', phase: 'dispute', messages: [], terminal: true },
  ];
}

export function buildHealthDialogueTree(lang) {
  return [...buildHealthPresaleTree(lang), ...buildHealthDisputeTree(lang)];
}
