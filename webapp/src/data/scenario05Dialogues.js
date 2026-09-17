// Scenario05 (幽靈訂單) dialogue trees. Two conversations, never more:
//
//   buildBuyerTree    the one ongoing thread with the fake buyer inside
//                     MyDonDon 買東東 - product talk, the push onto SafeDeal,
//                     the claimed payment, and - after the fake verification
//                     detour - the push to ship
//   buildSupportTree  SafeDeal's fake "客服", where the identity check and the
//                     one simulated verification deposit happen
//
// Every node has at most 2 choices (spec section 8: always a two-way quick
// reply, never a free-text box) and text takes the chosen listing's name as a
// `{product}` param rather than hardcoding it per branch. The deposit amount
// is likewise a `{amount}` param filled from data/scenario05Verification.js -
// no line, screen or dictionary entry writes the figure itself.
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
import { VERIFICATION_AMOUNT_DIGITS } from './scenario05Verification';

const buyer = (text, opts = {}) => ({ speaker: 'buyer', text, ...opts });
const agent = (text, opts = {}) => ({ speaker: 'agent', text, ...opts });
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
    { id: 'buyer.s03.tradePref', messages: [buyer(tt('我確定要買～不過我平常都用 SafeDeal 交易，覺得對買賣雙方比較有保障。'))], autoNextNodeId: 'buyer.s04.open' },
    { id: 'buyer.s04.open', messages: [timestamp('19:44'), buyer(tt('你只要建立這個商品的專屬賣場，把連結傳給我，我就能直接付款。'))], choices: [
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
    // The first turn of the screw, and still not a demand: the buyer answers
    // the player's hesitation by making their own position the reasonable one
    // ("I'm the one paying first") and then reaching back to the persona
    // established above. Every stroller line stays gender-neutral - either
    // parent persona may have been drawn for this run.
    { id: 'buyer.s04b.open', messages: [
      buyer(tt('我知道你會擔心，但我也是第一次跟你交易啊。我都願意先付款了，你至少可以先看看流程吧？')),
      buyer(tt(product.id === 'stroller'
        ? '我自己一個人帶小孩，真的不太方便一直出門面交。原本以為你願意幫我用這個方式交易……'
        : '我上課跟打工的時間都排滿了，真的很難另外約面交。原本以為這樣交易可以讓我們都省點時間……')),
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
    { id: 'buyer.s07.paid', messages: [timestamp('19:48'), buyer(tt('好了～我這邊已經付款完成了！你那邊應該可以看到交易資訊了。'))], autoNextNodeId: 'buyer.s07.toOrders' },
    { id: 'buyer.s07.toOrders', redirectTo: '/scenario05-atm/mydondon-orders', resumeNodeId: 'buyer.s07.playerNotice' },
    // The player has just read "目前沒有新的交易訂單" on MyDonDon's own order
    // page and tapped its explicit "返回對話" button (spec section C) to get
    // here. They speak first (spec section D) - this is a player message,
    // not a choice - and only after a beat does marketplaceBuyer reply.
    { id: 'buyer.s07.playerNotice', messages: [me(tt('奇怪，買東東怎麼沒有這筆訂單？'))], autoNextNodeId: 'buyer.s07.explain' },
    // marketplaceBuyer rationalizes the missing order by pointing at the
    // platform switch itself - "we didn't pay through MyDonDon" - then turns
    // the missing order into the player's failing to check, and the player's
    // caution into an accusation they now have to disprove. Emotional
    // pressure and blame-shifting, not a demand, and it aims the player back
    // at the site the scammer controls.
    { id: 'buyer.s07.explain', messages: [
      buyer(tt('因為我們這次不是走買東東付款，所以買東東本來就不會有這筆訂單啊。')),
      buyer(tt('我這邊都已經照流程付款了，你現在才說找不到訂單，我也很困擾耶。')),
      buyer(tt('你先回 SafeDeal 看一下好不好？不要還沒確認，就覺得是我沒有付款。')),
    ], choices: [
      { id: 'a', label: tt('沒有官方訂單，也沒有入帳，我先停止交易。'), nextNodeId: 'buyer.exit.endingCaught', awareness: 'noOrderNoPayment' },
      { id: 'b', label: tt('我再去 SafeDeal 確認一下。'), nextNodeId: 'buyer.s07.toPaymentStatus' },
    ]},
    // Going back to SafeDeal is what opens the fake verification detour: the
    // site's own 收款狀態 page, then its "support desk", then the one
    // simulated transfer (see buildSupportTree below). The conversation with
    // the buyer is held open at the node it resumes on, so coming back lands
    // in this same thread rather than a new one.
    { id: 'buyer.s07.toPaymentStatus', redirectTo: '/scenario05-atm/safedeal-payment-status', resumeNodeId: 'buyer.s10.urge' },
    // Back in MyDonDon after the "verification" - the buyer picks the baton
    // up from the fake agent and pushes for the parcel: the deposit is spent,
    // and the only thing left to take is the item itself. This is the
    // shipping decision, and it is the last one in the scenario.
    { id: 'buyer.s10.urge', messages: [
      timestamp('20:05'),
      buyer(tt('客服那邊應該都跟你說明了吧？我這邊付款早就完成了，現在就等你寄出了。')),
      buyer(tt('我是真的有需要才跟你買的，也一直很有耐心在等。你現在又說要等入帳，我真的不知道還要等多久……')),
      buyer(tt('你不是說今天可以寄嗎？如果你不想賣，也可以直接跟我說，不用讓我一直等。')),
    ], choices: [
      { id: 'a', label: tt('還沒確認實際入帳，我先不寄件。'), nextNodeId: 'buyer.exit.endingStopped', statePatch: { shipmentDecision: 'stopped' }, awareness: 'noPaymentReceived' },
      { id: 'b', label: tt('我相信對方，使用黑皮通寄件。'), nextNodeId: 'buyer.s08.toShip', statePatch: { shipmentDecision: 'shipped' } },
    ]},
    { id: 'buyer.exit.endingStopped', redirectTo: '/scenario05-atm/ending-stopped' },
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

// ---------------------------------------------------------------------------
// SafeDeal's "客服" - the second conversation in the scenario, and the one
// that actually takes money.
//
// It is the same scammer wearing a different hat: a support desk that speaks
// in process, not in pleading. The pressure it applies is the opposite of the
// buyer's - authority ("the system shows"), responsibility shifted onto the
// seller ("this is not the buyer's problem, and support cannot skip it for
// you"), and the sunk-cost close ("you've already finished the identity
// check, this is the only step left").
//
// Two beats, one decision:
//
//   身分驗證  cs.open -> cs.identity   a simulated progress readout, no form,
//                                     no real personal data ever asked for,
//                                     and deliberately no decision - it only
//                                     exists to make the next demand feel
//                                     like the tail of something already
//                                     nearly finished
//   金流驗證  cs.flow                  the one and only transfer decision in
//                                     the whole scenario
//
// There is exactly one simulated transfer here and nowhere else in Scenario
// 05. Nothing in this tree - or after it - asks for a second deposit, an
// unfreeze fee, a guarantee, a shortfall or a re-verification fee, and the
// agent never speaks again after the item ships.
export function buildSupportTree(lang) {
  const tt = (zh) => t(zh, lang);
  return [
    { id: 'cs.open', messages: [
      agent(tt('您好，系統顯示買方已完成付款，目前卡住的是賣方帳戶的首次收款認證。')),
      agent(tt('這不是買方的問題，也不是客服可以直接幫您略過的步驟。您如果希望這筆交易正常完成，就需要先處理帳戶認證。')),
      agent(tt('我可以協助您完成，但需要您本人配合操作。一直停留在這個畫面，系統是不會自行解除限制的。')),
    ], autoNextNodeId: 'cs.identity' },
    // The "identity check". It asks for nothing and verifies nothing: the
    // scenario never collects a real name, ID number, address, phone, bank
    // account or card from the player. Two status rows stand in for the
    // whole thing, which is exactly how much substance it has.
    { id: 'cs.identity', messages: [
      system(tt('身分資料確認中……'), { type: 'progress', delay: 1600 }),
      system(tt('身分資料確認完成'), { type: 'progress-done', delay: 900 }),
    ], autoNextNodeId: 'cs.flow' },
    { id: 'cs.flow', messages: [
      agent(tt('身分資料已確認，但您的帳戶還沒有完成金流驗證，因此目前無法啟用收款。')),
      // The scammer's promise, and only ever the scammer's: the deposit is
      // presented as refundable by the fake agent, and nothing in this app
      // repeats that as a fact. It is never refunded on any path.
      agent(t('您需要先支付一筆 NT${amount} 的驗證金。這只是系統確認收款帳戶的暫時款項，驗證完成後會全額退還。', lang, { amount: VERIFICATION_AMOUNT_DIGITS })),
      agent(tt('您前面的身分認證都已經完成了，現在只差最後這個步驟。如果不完成，交易款項就只能繼續保留在系統裡。')),
      agent(tt('是否繼續由您決定，但如果您希望順利收到貨款，就需要先完成這項驗證。')),
    ], choices: [
      { id: 'a', label: tt('收款為什麼要先付錢？我不轉帳。'), nextNodeId: 'cs.exit.endingCaught', statePatch: { verificationStatus: 'refused' }, awareness: 'refusedVerificationDeposit' },
      { id: 'b', label: tt('我先完成這次驗證。'), nextNodeId: 'cs.toTransfer' },
    ]},
    { id: 'cs.exit.endingCaught', redirectTo: '/scenario05-atm/ending-caught' },
    // The only hand-off in this tree that can cost anything, and the screen it
    // leads to charges once (see pages/scenario05/SafeDealTransfer.jsx and
    // lib/scenario05Store.js's payVerificationDeposit). Coming back resumes
    // this same conversation at cs.done - the agent never asks again.
    { id: 'cs.toTransfer', redirectTo: '/scenario05-atm/safedeal-transfer', resumeNodeId: 'cs.done' },
    { id: 'cs.done', messages: [
      agent(tt('好的，系統顯示您的金流驗證已完成。交易款項與驗證金將在商品送達後一併撥付。')),
      agent(tt('接下來請依照買賣雙方約定的方式寄出商品即可。')),
    ], choices: [
      // A pure action, not something the player says - the same shape
      // buyer.s09.gone uses. No payment control may appear on this node.
      { id: 'a', label: tt('返回聊天'), playerMessage: '', nextNodeId: 'cs.toChat' },
    ]},
    { id: 'cs.toChat', redirectTo: '/scenario05-atm/chat' },
  ];
}
