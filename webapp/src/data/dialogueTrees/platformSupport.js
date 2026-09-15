// 黑皮客服 - a short 黑皮智能客服 (bot) triage hands off to 黑皮安心專員 (human
// specialist), who looks the order up and explains why the platform cannot
// help: the payment never actually went through 黑皮購物's own checkout, so
// it falls outside platform protection. That explanation is the story's
// entire point - contacting the platform is a step in the story, never the
// win condition - so from here there are exactly two real endings:
//
//  - "繼續要求平台負責": the player presses the specialist on it (picking
//    which angle to press from a 3-choice beat), gets the same core answer
//    every time, and the run ends in failure - reported stays false.
//  - "聯絡 165 報案": the player takes the case to 165 immediately. No
//    simulated call, no interview - the choice itself is the whole action,
//    and it is what sets reported: true.
//
// Node ids are prefixed `bot.`/`agent.` so the screen component can tell
// which stage is active and switch the chat header between "黑皮智能客服"
// and "黑皮安心專員" accordingly.

import { t } from '../../pages/scenario04/i18n';

const platform = (text, opts = {}) => ({ speaker: 'platform', text, ...opts });

// The core sentence explaining why the platform can't help. Required to
// appear verbatim both at the specialist's reveal and again whenever the
// player keeps arguing, so the platform's position never shifts.
const DECLINE_CORE = '很抱歉，此筆交易並不是透過黑皮購物的官方交易流程完成，因此不屬於平台交易保障範圍。';
const DECLINE_NO_FUNDS = '黑皮購物並沒有收到這筆款項，沒有辦法直接退款，也沒有辦法代為賠償。';
const DECLINE_NO_DATA = '賣家目前已經無法聯絡，賣場也已經停止營業，我們同樣沒有辦法取得完整的平台外交易資料。';
const DECLINE_REMINDER = '如果你認為這整件事情涉及詐騙，建議向 165 或警方報案處理。';

export function buildPlatformSupportTree(lang) {
  return [
    // ---- Stage 1: 黑皮智能客服 (bot) -----------------------------------
    {
      id: 'shared.platform.bot.opening',
      route: 'shared',
      phase: 'platform',
      messages: [platform(t('您好，請選擇遇到的問題。', lang))],
      // Only the problem the player actually knows about at this point. A
      // "賣家已無法聯絡" option used to sit here too, but the player has no way
      // of knowing the shop has gone quiet until the specialist looks it up
      // later - offering it here told them the twist before they found it.
      choices: [
        { id: 'noRefund', label: t('退貨後沒有退款', lang), playerMessage: t('退貨後沒有退款。', lang), nextNodeId: 'shared.platform.bot.c1' },
      ],
    },
    {
      id: 'shared.platform.bot.c1',
      route: 'shared',
      phase: 'platform',
      messages: (state) => [
        platform(t('系統顯示退款仍在賣家驗收流程中。', lang)),
        ...(state.warningFlags.includes('premature_order_completion')
          ? [platform(t('另外系統顯示您先前已確認完成訂單，一般退款流程可能已結束，但若涉及商品描述不實，仍可以建立爭議案件，我先為您轉接專員。', lang))]
          : []),
      ],
      // The bot triage ends by handing over, and nothing here appeals to a
      // deadline: no refund window was ever stated to the player, so an
      // "已經超過期限" reply had them assert a limit the story never gave them.
      // Escalating because the refund simply has not happened needs no clock.
      choices: [
        { id: 'transfer', label: t('轉接真人客服', lang), playerMessage: t('我要轉接真人客服。', lang), nextNodeId: 'shared.platform.transfer' },
      ],
    },

    // ---- Transfer beat --------------------------------------------------
    {
      id: 'shared.platform.transfer',
      route: 'shared',
      phase: 'platform',
      messages: [{ speaker: 'system', text: t('正在為您轉接真人客服…', lang), delay: 1100 }],
      autoNextNodeId: 'shared.platform.agent.opening',
    },

    // ---- Stage 2: 黑皮安心專員 (human specialist) ------------------------
    {
      id: 'shared.platform.agent.opening',
      route: 'shared',
      phase: 'platform',
      messages: [
        platform(t('您好，我是黑皮安心專員，已經看到智能客服轉來的問題，這邊直接為您查詢。', lang)),
        { speaker: 'platform', text: t('正在查詢訂單與退貨紀錄，請稍候。', lang), delay: 1400 },
        platform(t('我查到您的退貨已經由賣家簽收。', lang), { delay: 650 }),
        platform(t('目前退款還沒有完成，賣家也沒有回覆平台通知，我再確認一下這筆訂單當初的付款紀錄。', lang), { delay: 750 }),
        platform(t(DECLINE_CORE, lang), { delay: 1000 }),
        platform(t(DECLINE_NO_FUNDS, lang), { delay: 750 }),
      ],
      choices: [
        { id: 'keepArguing', label: t('繼續要求平台負責', lang), playerMessage: t('我還是覺得平台應該負責。', lang), nextNodeId: 'shared.platform.agent.argue.pick' },
        {
          id: 'report165',
          label: t('聯絡 165 報案', lang),
          playerMessage: t('我要聯絡 165 報案。', lang),
          nextNodeId: 'shared.platform.agent.report165',
          effects: { warningFlags: ['contacted_165'] },
        },
      ],
    },

    // ---- Keep arguing with the platform (always ends in failure) --------
    //
    // Two replies, not three. This was the last player prompt in the five
    // scenarios that offered a third option, and the AR build has exactly two
    // gestures - so a third one is not something a player on the glasses can
    // ever reach (see CIBAR-Technical-Specification.md §4.12).
    //
    // The one that went was 「賣家就是你們平台上的商家，為什麼不能賠？」: it
    // makes the same argument as 「商品是在你們平台看到的，你們應該負責」 -
    // the platform should pay because the seller is on the platform - while
    // the surviving pair keeps two genuinely different arguments, one about
    // where the listing was seen and one about the goods already having been
    // sent back. Its reply node (argue.replyB) goes with it; the other two
    // keep their own replies, effects and next nodes exactly as they were.
    // Nothing branches differently either way: all of these paths land on
    // shared.platform.toResultFail, and the successful path (聯絡 165 報案)
    // never passes through this node at all.
    {
      id: 'shared.platform.agent.argue.pick',
      route: 'shared',
      phase: 'platform',
      messages: [platform(t('好的，請問您想再確認哪個部分？', lang))],
      choices: [
        {
          id: 'blamePlatform',
          label: t('商品是在你們平台看到的，你們應該負責', lang),
          playerMessage: t('商品是在你們平台看到的，你們應該負責', lang),
          nextNodeId: 'shared.platform.agent.argue.replyA',
        },
        {
          id: 'askDirectRefund',
          label: t('我都已經把商品退回去了，平台不能直接退款嗎？', lang),
          playerMessage: t('我都已經把商品退回去了，平台不能直接退款嗎？', lang),
          nextNodeId: 'shared.platform.agent.argue.replyC',
        },
      ],
    },
    // Both replies open with a line responding to the player's specific
    // framing, then land on the exact same core explanation - the platform's
    // answer does not change depending on how it is asked.
    {
      id: 'shared.platform.agent.argue.replyA',
      route: 'shared',
      phase: 'platform',
      messages: [
        platform(t('我理解這項商品確實是您在黑皮購物上看到的，但這筆訂單實際的付款紀錄顯示是透過站外連結完成，並沒有進入平台的金流系統。', lang)),
        platform(t(DECLINE_CORE, lang)),
        platform(t(DECLINE_NO_FUNDS, lang)),
        platform(t(DECLINE_NO_DATA, lang)),
        platform(t(DECLINE_REMINDER, lang)),
      ],
      autoNextNodeId: 'shared.platform.toResultFail',
    },
    {
      id: 'shared.platform.agent.argue.replyC',
      route: 'shared',
      phase: 'platform',
      messages: [
        platform(t('退貨物流上確實顯示賣家已經簽收，但退款需要透過原本收款的管道處理，這筆款項並沒有進到黑皮購物的系統裡，所以沒有辦法由平台直接退款。', lang)),
        platform(t(DECLINE_CORE, lang)),
        platform(t(DECLINE_NO_FUNDS, lang)),
        platform(t(DECLINE_NO_DATA, lang)),
        platform(t(DECLINE_REMINDER, lang)),
      ],
      autoNextNodeId: 'shared.platform.toResultFail',
    },

    // ---- Report to 165 (the only path to success) ------------------------
    {
      id: 'shared.platform.agent.report165',
      route: 'shared',
      phase: 'platform',
      messages: [platform(t('好的，建議您直接撥打 165 或前往就近派出所報案，我會協助保留目前查到的訂單與退貨紀錄。', lang))],
      autoNextNodeId: 'shared.platform.toResultSuccess',
    },

    { id: 'shared.platform.toResultFail', route: 'shared', phase: 'platform', messages: [], terminal: true },
    { id: 'shared.platform.toResultSuccess', route: 'shared', phase: 'platform', messages: [], terminal: true },
  ];
}
