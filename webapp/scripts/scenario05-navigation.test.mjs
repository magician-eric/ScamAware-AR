import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Scenario05 enters through its briefing, phone home, MyDonDon home, and product selection', async () => {
  const routes = await read('src/routes.jsx');
  // The MyDonDon screens are presentation only - the routes they lead to now
  // live in Scenario 05's own wrappers around them.
  const phoneHome = await read('src/pages/scenario05/MarketplacePhoneHome.jsx');
  const home = await read('src/pages/scenario05/MarketplaceHome.jsx');
  const productSelect = await read('src/pages/scenario05/MarketplaceProductSelect.jsx');
  const listing = await read('src/pages/scenario05/MarketplaceListing.jsx');
  const briefing = await read('src/pages/scenario05/Briefing.jsx');
  assert.match(routes, /path: 'scenario05-atm', element: <GhostOrderBriefing/);
  assert.match(routes, /path: 'scenario05-atm\/phone-home', element: <GhostOrderPhoneHome/);
  assert.ok(briefing.includes('startRoute="/scenario05-atm/phone-home"'));
  assert.match(routes, /path: 'scenario05-atm\/home', element: <GhostOrderHome/);
  assert.match(routes, /path: 'scenario05-atm\/product-select', element: <GhostOrderProductSelect/);
  assert.ok(phoneHome.includes("navigate('/scenario05-atm/home')"));
  assert.ok(home.includes("navigate('/scenario05-atm/product-select')"));
  assert.ok(home.includes('onSellItem'), 'the feed reports a marketplace action, not a scenario route');
  assert.ok(productSelect.includes("navigate('/scenario05-atm/listing')"));
  assert.ok(listing.includes("navigate('/scenario05-atm/chat')"));
});

test('Scenario05 ghost-order routes (shop, fake payment, fake verification, real shipping, endings, reveal, quiz) remain registered', async () => {
  const routes = await read('src/routes.jsx');
  for (const route of ['chat', 'shop-create', 'trade-info', 'mydondon-orders',
    'safedeal-payment-status', 'safedeal-support', 'safedeal-transfer',
    'hpe-ship', 'order-gone', 'ending-caught', 'ending-stopped', 'ending-scammed', 'reveal', 'quiz']) {
    assert.ok(routes.includes(`path: 'scenario05-atm/${route}'`), `missing ${route}`);
  }
  // Old bank-verification-era routes must not come back.
  for (const oldRoute of ['order-status', 'order-detail', 'shop-check', 'cs-chat', 'bank-verify', 'quiz-result']) {
    assert.ok(!routes.includes(`path: 'scenario05-atm/${oldRoute}'`), `stale route ${oldRoute} should be removed`);
  }
  const dialogues = await read('src/data/scenario05Dialogues.js');
  assert.ok(dialogues.includes("redirectTo: '/scenario05-atm/shop-create'"));
  assert.ok(dialogues.includes("redirectTo: '/scenario05-atm/mydondon-orders'"));
  assert.ok(dialogues.includes("redirectTo: '/scenario05-atm/hpe-ship'"));
  assert.ok(dialogues.includes("redirectTo: '/scenario05-atm/ending-caught'"));
  // marketplaceBuyer claims payment is done, the player is sent straight to
  // MyDonDon's own order list (no judgement choice before that detour), the
  // player speaks first on return, and only then does the real choice appear.
  assert.ok(dialogues.includes("id: 'buyer.s07.paid'") && dialogues.includes("autoNextNodeId: 'buyer.s07.toOrders'"));
  assert.ok(dialogues.includes("id: 'buyer.s07.playerNotice'") && dialogues.includes('奇怪，買東東怎麼沒有這筆訂單？'));
  assert.ok(dialogues.includes("id: 'buyer.s07.explain'") && dialogues.includes('因為我們這次不是走買東東付款'));
  assert.ok(dialogues.includes('沒有官方訂單，也沒有入帳，我先停止交易。'));
  // Checking SafeDeal again opens the fake verification detour - it must never
  // be a shortcut straight to the courier again.
  assert.ok(dialogues.includes("id: 'buyer.s07.toPaymentStatus', redirectTo: '/scenario05-atm/safedeal-payment-status', resumeNodeId: 'buyer.s10.urge'"));
  const ghostOrderChoices = dialogues.slice(dialogues.indexOf("id: 'buyer.s07.explain'"), dialogues.indexOf("id: 'buyer.s07.toPaymentStatus'"));
  assert.ok(!ghostOrderChoices.includes('/scenario05-atm/hpe-ship'), 'the ghost-order reply must not ship the item directly any more');
  // The old fake customer-service / bank-verification dialogue tree must be gone.
  // What replaced it is SafeDeal's own support desk (buildSupportTree), which
  // is a different tree on a different route - see the verification tests below.
  assert.ok(!dialogues.includes('buildCsTree'));
  assert.ok(!dialogues.includes("redirectTo: '/scenario05-atm/cs-chat'"));
  assert.ok(!dialogues.includes("redirectTo: '/scenario05-atm/bank-verify'"));
  // Delivery hands back to the conversation, not straight to the trading
  // site - the buyer has to be found missing first (see the test below).
  const hpeShip = await read('src/pages/scenario05/HpeShip.jsx');
  assert.ok(hpeShip.includes("navigate('/scenario05-atm/chat')"));
  assert.ok(!hpeShip.includes("navigate('/scenario05-atm/order-gone')"), 'HPE must not jump past the vanished buyer');
  const orderGone = await read('src/pages/scenario05/OrderGone.jsx');
  assert.ok(orderGone.includes("navigate('/scenario05-atm/ending-scammed')"));
  // Both endings and the 詐騙疑點分析 that follows them render through the
  // shared Outcome System now, so they hand it the next route rather than
  // calling navigate() themselves.
  for (const ending of ['EndingCaught', 'EndingScammed']) {
    assert.ok((await read(`src/pages/scenario05/${ending}.jsx`)).includes('analysisTo="/scenario05-atm/reveal"'));
  }
  assert.ok((await read('src/pages/scenario05/Reveal.jsx')).includes('quizTo="/scenario05-atm/quiz"'));
  assert.ok((await read('src/components/ui/ScenarioFinalDecision.jsx')).includes("backTo = '/ar-scan'"));
});

test('Scenario05 order-check detour: explicit button, no auto-navigate, low-key buyer tone', async () => {
  const orders = await read('src/apps/mydondon/screens/MyDonDonOrders.jsx');
  assert.ok(orders.includes('目前沒有新的交易訂單'));
  assert.ok(orders.includes("t('返回對話')"));
  assert.ok(!orders.includes('setTimeout'), 'MyDonDonOrders must not auto-navigate away');
  // MyDonDon presents "no official order"; Scenario 05 decides what follows.
  const ordersPage = await read('src/pages/scenario05/MarketplaceOrders.jsx');
  assert.ok(ordersPage.includes('orders={NO_OFFICIAL_ORDERS}'));
  assert.ok(ordersPage.includes("navigate('/scenario05-atm/chat', { replace: true })"));
  const dialogues = await read('src/data/scenario05Dialogues.js');
  // The pushback the player meets after hesitating: still not a demand, but it
  // makes the buyer's own position the reasonable one and leans on the persona.
  assert.ok(dialogues.includes('我知道你會擔心，但我也是第一次跟你交易啊。我都願意先付款了，你至少可以先看看流程吧？'));
  // Product-specific, and gender-neutral on the stroller line either persona
  // may have been drawn for.
  assert.ok(dialogues.includes('我自己一個人帶小孩，真的不太方便一直出門面交。原本以為你願意幫我用這個方式交易……'));
  assert.ok(dialogues.includes('我上課跟打工的時間都排滿了，真的很難另外約面交。原本以為這樣交易可以讓我們都省點時間……'));
  for (const gendered of ['媽媽', '爸爸', '她', '他自己一個人']) {
    assert.ok(!dialogues.includes(gendered), `the stroller buyer's lines must not assume a gender (${gendered})`);
  }
});

test('Scenario05 scammed line: delivery -> buyer vanishes -> SafeDeal is gone', async () => {
  const dialogues = await read('src/data/scenario05Dialogues.js');
  // The courier trip now returns into the same conversation.
  assert.ok(dialogues.includes("redirectTo: '/scenario05-atm/hpe-ship', resumeNodeId: 'buyer.s09.askPayment'"));
  // The seller asks about the money themselves - a player message, not a choice.
  assert.ok(dialogues.includes("id: 'buyer.s09.askPayment'") && dialogues.includes('商品已經送到了，請問款項大概什麼時候會入帳？'));
  assert.ok(dialogues.includes("autoNextNodeId: 'buyer.s09.gone'"));
  // No reply ever comes; two plain system rows carry the whole beat.
  assert.ok(dialogues.includes("id: 'buyer.s09.gone'") && dialogues.includes('訊息傳送失敗') && dialogues.includes('此帳號已不存在'));
  // The buyer says nothing after the item ships - buyer() lines must all sit
  // above the vanish, or the "they're simply gone" beat is broken.
  const afterShip = dialogues.slice(dialogues.indexOf("id: 'buyer.s09.askPayment'"));
  assert.ok(!afterShip.includes('buyer(t'), 'the fake buyer must never speak again after the item is delivered');
  // Nothing here may pre-empt the debrief. Comments are stripped first so
  // this measures the copy the player actually reads, not the notes around it.
  const afterShipCopy = afterShip.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const spoiler of ['詐騙', '防詐', '165', '報案', '截圖', '證據']) {
    assert.ok(!afterShipCopy.includes(spoiler), `the vanish beat must not mention ${spoiler}`);
  }
  // One action only, and it is an action rather than something the player says.
  assert.ok(afterShip.includes("playerMessage: ''") && afterShip.includes("nextNodeId: 'buyer.s09.toSafeDeal'"));
  assert.ok(dialogues.includes("id: 'buyer.s09.toSafeDeal', redirectTo: '/scenario05-atm/order-gone'"));
  // The existing SafeDeal tail (processing -> dead site -> debrief) is untouched.
  const orderGone = await read('src/pages/scenario05/OrderGone.jsx');
  assert.ok(orderGone.includes("navigate('/scenario05-atm/ending-scammed')"));
});

test('Scenario05 safe line is unchanged: the player stops before shipping', async () => {
  const dialogues = await read('src/data/scenario05Dialogues.js');
  assert.ok(dialogues.includes("nextNodeId: 'buyer.exit.endingCaught', awareness: 'noOrderNoPayment'"));
  assert.ok(dialogues.includes("id: 'buyer.exit.endingCaught', redirectTo: '/scenario05-atm/ending-caught'"));
  assert.ok(dialogues.includes('沒有官方訂單，也沒有入帳，我先停止交易。'));
});

test('Scenario05 no longer references the removed bank-verification screens', async () => {
  const removed = [
    'src/pages/scenario05/BankVerify.jsx',
    'src/pages/scenario05/CsChat.jsx',
    'src/pages/scenario05/OrderDetail.jsx',
    'src/pages/scenario05/ShopSelfCheck.jsx',
    'src/pages/scenario05/components/CsChatSurface.jsx',
    'src/components/ghostorder/CsChatSurface.jsx',
    'src/data/scenario05OrderDetailText.js',
    'src/lib/scenario05OrderIds.js',
  ];
  for (const file of removed) {
    await assert.rejects(read(file), `${file} should have been deleted`);
  }
});
