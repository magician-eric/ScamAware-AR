// Scenario05 (幽靈訂單) dialogue tree: the one ongoing conversation with the
// fake buyer inside MyDonDon 買東東. Every node has at most 2 choices (spec
// section 8: always a two-way quick reply, never a free-text box) and text
// takes the chosen listing's name as a `{product}` param rather than
// hardcoding it per branch.
//
// Takes a `lang` argument ('zh' | 'en' | 'jp') and runs every piece of copy
// through scenario05's t(zh, lang) lookup, the same pattern scenario04's
// dialogue trees use (see data/dialogueTrees/delay.js). `product` is expected
// to already be language-resolved (see data/scenario05Products.js's
// getProduct(id, lang)), so product.name here is already the right language -
// only the brand suffix around it ("｜SafeDeal" / " | SafeDeal") needs its
// own per-language template, via shopLinkTitle() below. The brand name itself
// is never translated - see data/scenario05FakeSite.js.
import { t } from '../pages/scenario05/i18n';
import { FAKE_TRADE_SITE_BRAND, FAKE_TRADE_SITE_DOMAIN } from './scenario05FakeSite';

const buyer = (text, opts = {}) => ({ speaker: 'buyer', text, ...opts });
const system = (text, opts = {}) => ({ speaker: 'system', text, ...opts });
const me = (text, opts = {}) => ({ speaker: 'me', text, ...opts });
const timestamp = (text) => ({ speaker: 'system', text, type: 'timestamp', delay: 150 });

function shopLinkTitle(productName, lang) {
  if (lang === 'en') return `${productName} | ${FAKE_TRADE_SITE_BRAND}`;
  return `${productName}｜${FAKE_TRADE_SITE_BRAND}`;
}

// The persona buildup between "still available?" and the trade-site pitch is
// product-specific (see experience/characters/roles.js for the fixed buyer
// identities this is written for: two single-parent personas for the
// stroller listing, one budget-conscious college student for the tablet
// listing). Every stroller line stays gender-neutral on purpose - nothing
// here is written so only the mom or only the dad persona could say it,
// since either may have been drawn for this run. Each beat ends in a choice
// so the reveal plays across several player turns rather than as one
// uninterrupted monologue; both options in a beat carry the story forward
// the same way; they only vary what the player is shown to say.
function personaNodes(product, tt) {
  if (product.id === 'stroller') {
    return [
      { id: 'buyer.s03.persona1', messages: [
        buyer(tt('太好了，我最近剛好一直在找二手的。')),
        buyer(tt('因為我自己一個人帶小孩，平常抱著他又要拿東西，出門真的有點吃不消 😅')),
      ], choices: [
        { id: 'a', label: tt('辛苦你了，這台狀況還不錯。'), nextNodeId: 'buyer.s03.persona2' },
        { id: 'b', label: tt('了解，那你是想約時間面交嗎？'), nextNodeId: 'buyer.s03.persona2' },
      ]},
      { id: 'buyer.s03.persona2', messages: [
        buyer(tt('新的對我來說有點貴，所以才想找狀況好一點的二手。')),
        buyer(tt('你這台如果使用都正常的話，我真的很想買。')),
      ], choices: [
        { id: 'a', label: tt('都正常，你可以放心。'), nextNodeId: 'buyer.s03.tradePref' },
        { id: 'b', label: tt('功能都測過，沒問題的。'), nextNodeId: 'buyer.s03.tradePref' },
      ]},
    ];
  }
  return [
    { id: 'buyer.s03.persona1', messages: [
      buyer(tt('我是大學生，最近上課真的很需要一台平板做筆記。')),
      buyer(tt('老師現在很多資料都直接丟 PDF，用手機看真的很不方便 😅')),
    ], choices: [
      { id: 'a', label: tt('手機螢幕真的太小了，做筆記也不方便。'), nextNodeId: 'buyer.s03.persona2' },
      { id: 'b', label: tt('了解，那你主要是想拿來做什麼？'), nextNodeId: 'buyer.s03.persona2' },
    ]},
    { id: 'buyer.s03.persona2', messages: [
      buyer(tt('本來有想買筆電，可是預算真的不太夠。')),
      buyer(tt('想說我主要就是上課看資料、做筆記，平板其實就夠用了。')),
    ], choices: [
      { id: 'a', label: tt('平板應付上課應該沒問題。'), nextNodeId: 'buyer.s03.persona3' },
      { id: 'b', label: tt('了解，那你是想找什麼價位的？'), nextNodeId: 'buyer.s03.persona3' },
    ]},
    { id: 'buyer.s03.persona3', messages: [
      buyer(tt('所以最近才一直在找二手的，你這台如果功能都正常的話，我真的很想買。')),
    ], choices: [
      { id: 'a', label: tt('都正常，你可以放心。'), nextNodeId: 'buyer.s03.tradePref' },
      { id: 'b', label: tt('功能都測過，沒問題的。'), nextNodeId: 'buyer.s03.tradePref' },
    ]},
  ];
}

/** @param {{ name: string, id: string }} product */
export function buildBuyerTree(product, lang) {
  const tt = (zh) => t(zh, lang);
  return [
    { id: 'buyer.s03.open', messages: [timestamp('19:43'), buyer(t('你好～請問這台{product}還在嗎？', lang, { product: product.name })), buyer(tt(product.id === 'stroller' ? '如果還在的話我滿有興趣的，想再跟你確認一下狀況。' : '如果還在的話我滿有興趣的，功能都正常的話我應該會想收。'))], choices: [
      { id: 'a', label: tt('還在，你想怎麼交易？'), nextNodeId: 'buyer.s03.persona1' },
      { id: 'b', label: tt('還在，需要我再拍商品細節給你嗎？'), nextNodeId: 'buyer.s03.replyB' },
    ]},
    { id: 'buyer.s03.replyB', messages: [buyer(tt('不用～照片看起來沒問題，我可以直接收。'))], autoNextNodeId: 'buyer.s03.persona1' },
    // Persona buildup (spec sections 2-6/8): who this buyer is and why they
    // need the item, spaced across a few real player turns before any
    // mention of the trade site. See personaNodes() above.
    ...personaNodes(product, tt),
    // Only now - background established - does the trade-method storyline
    // begin (spec section 7). This used to be the buyer's very first reply.
    { id: 'buyer.s03.tradePref', messages: [buyer(t('我確定要～不過我平常都用 {brand} 這個交易網站，比較有保障。', lang, { brand: FAKE_TRADE_SITE_BRAND }))], autoNextNodeId: 'buyer.s04.open' },
    { id: 'buyer.s04.open', messages: [timestamp('19:44'), buyer(tt('你只要開一個這個商品的專屬賣場，把連結給我，我直接付款就可以了。'))], choices: [
      { id: 'a', label: tt('好，我建立好再傳給你。'), nextNodeId: 'buyer.s04.toShop' },
      { id: 'b', label: tt('我通常只接受面交或平台內交易。'), nextNodeId: 'buyer.s04b.open' },
    ]},
    { id: 'buyer.s04.toShop', redirectTo: '/scenario05-atm/shop-create', resumeNodeId: 'buyer.s06.open' },
    // Reached only when the player backs out of the fake trading site
    // without creating the shop (see ShopCreate.jsx's browser back).
    // marketplaceBuyer is still waiting, so the conversation picks up there
    // instead of at 'shop created'.
    { id: 'buyer.s05.abandon', messages: [buyer(tt('賣場建立好了嗎？連結傳給我就可以了～'))], choices: [
      { id: 'a', label: tt('好，我現在去建立。'), nextNodeId: 'buyer.s04.toShop' },
      { id: 'b', label: tt('我先確認一下官方交易流程。'), nextNodeId: 'buyer.s04b.verify' },
    ]},
    // Low-key, apologetic pushback (spec section 6/7) - never a demand. The
    // player goes along because the earlier persona beats already built
    // sympathy, not because this is forceful. The last line ties the ask
    // back to the persona established above (spec section 8) - just once
    // here, not repeated at every later beat.
    { id: 'buyer.s04b.open', messages: [
      buyer(tt('喔喔了解～不好意思，我只是之前買二手的時候都習慣這樣交易，覺得超商取貨比較方便。')),
      buyer(tt('如果你不放心也沒關係，我只是想說這樣彼此都比較方便一點 😅')),
      buyer(tt(product.id === 'stroller' ? '而且我自己帶小孩出門真的比較不方便，能省一趟是一趟。' : '而且我平常上課跟打工時間比較固定，超商取貨對我比較方便，不用另外約時間面交。')),
    ], choices: [
      { id: 'a', label: tt('好，那我就照你說的方式建立賣場。'), nextNodeId: 'buyer.s04.toShop' },
      { id: 'b', label: tt('我先確認一下官方交易流程。'), nextNodeId: 'buyer.s04b.verify' },
    ]},
    { id: 'buyer.s04b.verify', redirectTo: '/scenario05-atm/trade-info', resumeNodeId: 'buyer.s04b.afterVerify' },
    { id: 'buyer.s04b.afterVerify', messages: [me(tt('好，我看過安全提醒了，我照你說的方式建立賣場。'))], autoNextNodeId: 'buyer.s04.toShop' },
    { id: 'buyer.s06.open', messages: [timestamp('19:46'), system(tt('賣場建立成功 ✓')), me(tt('我建立好了，這是賣場連結：'), { type: 'link-card', data: { title: shopLinkTitle(product.name, lang), url: `${FAKE_TRADE_SITE_DOMAIN}/p/8h2k…` } })], autoNextNodeId: 'buyer.s07.paid' },
    // The ghost order itself: marketplaceBuyer claims payment is done and asks for
    // same-day shipping (spec section A). The player does NOT see the key
    // judgement yet - they're sent straight to MyDonDon's own order list
    // first (spec section B), a mandatory detour, not an optional choice.
    { id: 'buyer.s07.paid', messages: [timestamp('19:48'), buyer(tt('好了～我這邊已經付款完成了！')), buyer(tt('你那邊應該可以看到訂單了～'))], autoNextNodeId: 'buyer.s07.toOrders' },
    { id: 'buyer.s07.toOrders', redirectTo: '/scenario05-atm/mydondon-orders', resumeNodeId: 'buyer.s07.playerNotice' },
    // The player has just read "目前沒有新的交易訂單" on MyDonDon's own order
    // page and tapped its explicit "返回對話" button (spec section C) to get
    // here. They speak first (spec section D) - this is a player message,
    // not a choice - and only after a beat does marketplaceBuyer reply.
    { id: 'buyer.s07.playerNotice', messages: [me(tt('奇怪，買東東怎麼沒有這筆訂單？'))], autoNextNodeId: 'buyer.s07.explain' },
    // marketplaceBuyer rationalizes the missing order by pointing at the platform
    // switch itself - "we didn't pay through MyDonDon" - low-key, not
    // pushy (spec section E). Only now does the real key judgement appear.
    { id: 'buyer.s07.explain', messages: [buyer(tt('因為我們這次不是走買東東付款，所以買東東那邊不會有訂單喔～')), buyer(tt('我這邊外部賣場已經顯示付款完成了，你再看一下那邊就好～'))], choices: [
      { id: 'a', label: tt('沒有官方訂單，也沒有入帳，我先停止交易。'), nextNodeId: 'buyer.exit.endingCaught', awareness: 'noOrderNoPayment' },
      { id: 'b', label: tt('好，那我相信對方，去寄件。'), nextNodeId: 'buyer.s08.toShip' },
    ]},
    // Real 黑皮通 logistics from here on - a real courier really does carry a
    // real item away, which is the actual loss (spec section E of the
    // original causal-chain spec). The conversation resumes here once the
    // parcel has actually been delivered, rather than the player going
    // straight from the courier to the trading site.
    { id: 'buyer.s08.toShip', redirectTo: '/scenario05-atm/hpe-ship', resumeNodeId: 'buyer.s09.askPayment' },
    // The item is gone and the player asks the obvious question. Not a
    // choice - there is only one thing a seller says here, the same way
    // 'buyer.s07.playerNotice' works after the order-list detour. The long
    // delay is the beat where the player is still expecting a reply.
    { id: 'buyer.s09.askPayment', messages: [timestamp('21:12'), me(tt('商品已經送到了，請問款項大概什麼時候會入帳？'), { delay: 1500 })], autoNextNodeId: 'buyer.s09.gone' },
    // No reply ever comes: the person who spent the whole conversation
    // explaining how much they needed this item is simply not there any
    // more. Two plain system rows, nothing else - the player is left to
    // notice it themselves. Nothing here names the scam, warns, advises or
    // mentions 165; that is the debrief's job, several screens later.
    { id: 'buyer.s09.gone', messages: [system(tt('訊息傳送失敗'), { delay: 900 }), system(tt('此帳號已不存在'))], choices: [
      { id: 'a', label: t('查看 {brand} 款項', lang, { brand: FAKE_TRADE_SITE_BRAND }), playerMessage: '', nextNodeId: 'buyer.s09.toSafeDeal' },
    ]},
    { id: 'buyer.s09.toSafeDeal', redirectTo: '/scenario05-atm/order-gone' },
    { id: 'buyer.exit.endingCaught', redirectTo: '/scenario05-atm/ending-caught' },
  ];
}
