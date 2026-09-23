// Shared "seller signed for the return, then stalls the refund" chat -
// wording differs slightly per route, every node has at most 2 choices, and
// the flow is linear (no re-askable hub, and no shortcut around the
// seller-unreachable beat) so the escalation of stage1 -> stage2 -> seller
// unreachable always lands the same beats regardless of which choices the
// player picks along the way.
//
// Both routes are built from this one function: the copy differs where the
// products differ, the structure never does. `isHealth` picks between the
// 智慧掃拖機器人 wording and the VEXA FLEX X1 wording - `luckyBag` is the
// second route's legacy key, not its product (see dialogueTrees/luckyBag.js).
import { toneLine } from '../../features/shopping/sellerTone';
import { t } from '../../pages/scenario04/i18n';

const seller = (text, opts = {}) => ({ speaker: 'seller', text, ...opts });
const system = (text, opts = {}) => ({ speaker: 'system', text, ...opts });

export function buildDelayTree(route, lang) {
  const isHealth = route === 'health';
  const p = (id) => `${route}.delay.${id}`;

  return [
    {
      id: p('opening'),
      route,
      phase: 'delay',
      messages: [system(t('退貨商品已由賣家簽收。', lang))],
      // No "先保存簽收紀錄" reply: the signed-receipt record is written by the
      // return-logistics screen when the seller signs (see ReturnLogistics's
      // seller-signed-receipt effect), so this only re-saved what the player
      // already had and then continued to the identical next beat.
      choices: [
        { id: 'askTiming', label: t('詢問退款時間', lang), playerMessage: t('請問退款大概什麼時候會處理？', lang), nextNodeId: p('stage1'), effects: { assertiveness: 5 } },
      ],
    },

    // Stage 1 --------------------------------------------------------
    {
      id: p('stage1'),
      route,
      phase: 'delay',
      messages: (state) => [seller(toneLine(state, {
        trusting: isHealth
          ? t('真的很不好意思讓您久等，倉庫這幾天在依序驗收，我會請他們優先處理您的訂單。', lang)
          : t('真的很不好意思讓您久等，倉庫已經檢查過，商品摺疊功能正常，我再幫您跟他們確認一次。', lang),
        cautious: isHealth
          ? t('倉庫目前正在依序驗收，家電商品需要確認配件是否齊全，通常需要 3 至 5 個工作天。', lang)
          : t('經檢查，商品摺疊功能正常，與您描述不符。', lang),
        defensive: isHealth
          ? t('驗收流程都是系統統一排程，家電商品需要多一道配件確認，需要 3 至 5 個工作天，無法個別加快。', lang)
          : t('倉庫檢查結果是商品摺疊功能正常，與您描述不符，驗收結果都是系統統一判定的。', lang),
      }))],
      // No "好，我等五天" reply: it had the player commit to a wait nobody had
      // asked them for, and led to the same beat as pressing for a date.
      choices: [
        isHealth
          ? { id: 'pressDate', label: t('請給我確切完成日期', lang), playerMessage: t('請給我確切完成日期。', lang), nextNodeId: p('stage1.pressDate') }
          : { id: 'pressDate', label: t('合起來不代表它是摺疊手機', lang), playerMessage: t('能把兩支手機合起來，不代表它是摺疊手機！', lang), nextNodeId: p('stage1.pressDate') },
      ],
    },
    {
      id: p('stage1.pressDate'),
      route,
      phase: 'delay',
      messages: [seller(isHealth
        ? t('目前無法保證特定日期，但已備註優先處理。', lang)
        : t('目前已提交專員複核，請您耐心等候。', lang))],
      onEnterEffects: { suspicion: 8 },
      autoNextNodeId: p('wait5'),
    },

    { id: p('wait5'), route, phase: 'delay', messages: [system(t('五天後', lang))], autoNextNodeId: p('stage2') },

    // Stage 2 --------------------------------------------------------
    {
      id: p('stage2'),
      route,
      phase: 'delay',
      messages: (state) => [seller(toneLine(state, {
        trusting: isHealth
          ? t('倉庫那邊回報外盒好像有一點拆封痕跡，我幫您跟主管確認一下，不好意思還要再等等。', lang)
          : t('倉庫那邊回報機身好像有一點使用痕跡，我幫您跟主管確認一下，不好意思還要再等等。', lang),
        cautious: isHealth
          ? t('倉庫回報商品外盒有拆封痕跡，目前需要主管進一步確認。', lang)
          : t('倉庫回報機身外觀有使用痕跡，目前需要確認是否符合退貨條件。', lang),
        defensive: isHealth
          ? t('系統顯示商品外盒有拆封痕跡，這部分需要走主管覆核流程，客服無法直接判斷。', lang)
          : t('系統顯示機身外觀有使用痕跡，這部分需要走主管覆核流程，客服無法直接判斷。', lang),
      }))],
      choices: [
        // Pushes back on the substance, not on a clock: no refund deadline
        // was ever quoted to the player, so this used to have them assert
        // "已經超過您說的期限了" about a limit the story never gave them. The
        // seller's reply below already answers this framing directly.
        {
          id: 'pushBack',
          label: isHealth ? t('同意退貨卻不退款，這樣不合理', lang) : t('商品收到了為什麼還不退款', lang),
          playerMessage: isHealth
            ? t('你們已經同意退貨，卻一直沒有退款，這樣不合理。', lang)
            : t('商品你們已經收到了，為什麼還不退款？', lang),
          nextNodeId: p('stage2.pushBack'),
          effects: { assertiveness: 8, suspicion: 6 },
        },
      ],
    },
    {
      id: p('stage2.pushBack'),
      route,
      phase: 'delay',
      messages: [seller(isHealth
        ? t('同意寄回不代表保證退款，仍需要確認商品符合退貨條件，請您再耐心等候。', lang)
        : t('退款審核尚未完成，請勿重複提交申請。', lang))],
      onEnterEffects: { suspicion: 10, warningFlags: ['changing_return_terms'] },
      autoNextNodeId: p('wait7'),
    },
    // 七天後 leads straight into the shop being gone. There is no narrator
    // beat and no dead-external-page scene in between: this is a chat inside
    // a shopping app, so what the player sees here is what that app would
    // actually show them - the seller stops replying, and the platform says
    // the shop is closed.
    { id: p('wait7'), route, phase: 'delay', messages: [system(t('七天後', lang))], autoNextNodeId: p('unreachable.notice') },

    // Seller goes unreachable ----------------------------------------
    // Not a chat message from either side: one centred platform status card
    // (ChatScreen's 'shop-status' message type), which is how a storefront
    // reports a closed shop. RefundDelayChat's existing shopClosed handling
    // does the rest - grey avatar, 店家暫停營業 subtitle, read-only chat, and
    // the sellerUnreachable / refundStatus writes.
    {
      id: p('unreachable.notice'),
      route,
      phase: 'delay',
      noReadReceipt: true,
      messages: [
        {
          speaker: 'system',
          type: 'shop-status',
          text: t('店家已暫停營業，目前無法聯絡賣家。', lang),
          data: { title: t('此賣場目前無法使用', lang) },
        },
      ],
      choices: [
        {
          id: 'saveChat',
          label: t('保存對話紀錄', lang),
          playerMessage: '',
          nextNodeId: p('saveChatDone'),
          effects: { evidence: 12, evidenceSaved: ['seller-chat-log'] },
        },
        { id: 'goDirect', label: t('前往黑皮購物申請處理', lang), playerMessage: '', nextNodeId: p('toRefundCenter') },
      ],
    },
    {
      id: p('saveChatDone'),
      route,
      phase: 'delay',
      messages: [system(t('已保存完整對話紀錄。', lang))],
      autoNextNodeId: p('toRefundCenter'),
    },

    { id: p('toRefundCenter'), route, phase: 'delay', messages: [], terminal: true },
  ];
}
