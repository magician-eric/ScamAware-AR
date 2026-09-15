import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const routePaths = [
  'scenario04-shopping',
  'scenario04-shopping/phone-home',
  'scenario04-shopping/splash',
  'scenario04-shopping/home',
  'scenario04-shopping/search',
  'scenario04-shopping/search-results/:route',
  'scenario04-shopping/product/:route',
  'scenario04-shopping/seller-chat/:route',
  'scenario04-shopping/checkout/:route',
  'scenario04-shopping/payment-success/:route',
  'scenario04-shopping/order/:route',
  'scenario04-shopping/unboxing/:route',
  'scenario04-shopping/dispute-chat/:route',
  'scenario04-shopping/return-request/:route',
  'scenario04-shopping/return-ack/:route',
  'scenario04-shopping/return-shipping/:route',
  'scenario04-shopping/return-logistics/:route',
  'scenario04-shopping/refund-delay/:route',
  'scenario04-shopping/refund-center/:route',
  'scenario04-shopping/platform-support/:route',
  'scenario04-shopping/result/:route/:outcome',
  'scenario04-shopping/ending/:route',
  'scenario04-shopping/messages',
  'scenario04-shopping/orders',
  'scenario04-shopping/category',
  'scenario04-shopping/me',
];

// The main story chain, file by file. The first edge starts inside the
// BlackPi App, but the App no longer knows the route: 訂單詳情 reports
// onContactSeller and Scenario 04's route map turns that into dispute-chat
// (asserted in full below and in blackpi-navigation-boundary.test.mjs).
const navigationEdges = [
  ['pages/scenario04/blackpi/routes.js', '/scenario04-shopping/dispute-chat/${route}'],
  ['pages/scenario04/DisputeChat.jsx', '/scenario04-shopping/return-request/${route}'],
  ['pages/scenario04/ReturnRequest.jsx', '/scenario04-shopping/return-ack/${route}'],
  ['pages/scenario04/ReturnAckChat.jsx', '/scenario04-shopping/return-shipping/${route}'],
  ['pages/scenario04/ReturnShipping.jsx', '/scenario04-shopping/return-logistics/${route}'],
  ['pages/scenario04/ReturnLogistics.jsx', '/scenario04-shopping/refund-delay/${route}'],
  ['pages/scenario04/RefundDelayChat.jsx', '/scenario04-shopping/refund-center/${route}'],
  ['pages/scenario04/RefundCenter.jsx', '/scenario04-shopping/platform-support/${route}'],
  ['pages/scenario04/PlatformSupportChat.jsx', '/scenario04-shopping/result/${route}/success'],
  ['pages/scenario04/PlatformSupportChat.jsx', '/scenario04-shopping/result/${route}/fail'],
  ['pages/scenario04/OutcomeResult.jsx', '/scenario04-shopping/ending/${route}'],
];

test('ChatScreen safely hides absent choices and delegates the choice row', async () => {
  const source = await read('src/apps/blackpi/components/ChatScreen.jsx');
  assert.match(source, /const choices = pendingChoices \?\? \[\]/);
  assert.doesNotMatch(source, /pendingChoices\.map/);
  assert.doesNotMatch(source, /choice\.text/);
  // One choice-row implementation, shared. ChatScreen used to inline its own
  // <button>s under a .bp-dialogue-choice-grid class no stylesheet defined,
  // which is how chat choices ended up with browser-default chrome.
  assert.match(source, /<DialogueChoiceGrid choices=\{choices\} onChoose=\{choose\} disabled=\{isTyping\}/);
  assert.doesNotMatch(source, /bp-dialogue-choice-grid/);
  assert.doesNotMatch(source, /choices\.map/);
});

test('every scenario04 dialogue surface shares one styled choice row', async () => {
  const grid = await read('src/apps/blackpi/components/DialogueChoiceGrid.jsx');
  // Official BlackPi choice chrome, and every class it renders is real CSS.
  const css = await read('src/apps/blackpi/styles/index.css');
  for (const cls of ['bp-chat-choices', 'bp-chat-choices-prompt', 'bp-choice-grid', 'bp-choice-btn']) {
    assert.match(grid, new RegExp(cls), `DialogueChoiceGrid should use ${cls}`);
    assert.match(css, new RegExp(`\\.${cls}\\{`), `${cls} has no CSS rule`);
  }
  // Labels are authored in Chinese and translated on the way out.
  assert.match(grid, /\{t\(c\.label\)\}/);
  assert.match(grid, /aria-label=\{t\(c\.label\)\}/);
  // Lives in apps/ so ChatScreen may import it without crossing the
  // apps -> pages/scenario04 boundary that validate-app-boundaries forbids -
  // and translates through BlackPi's own dictionary, not Scenario 04's
  // (§13 AD-14).
  assert.match(grid, /from '\.\.\/i18n'/);

  // No stale copy left behind at the old location.
  await assert.rejects(() => read('src/pages/scenario04/components/DialogueChoiceGrid.jsx'));

  // And no class anywhere in the app renders choices without a stylesheet.
  assert.doesNotMatch(await read('src/apps/blackpi/components/ChatScreen.jsx'), /bp-dialogue-choice-grid/);

  // The simulated 165 phone call was removed entirely - reporting to 165 is
  // a single dialogue choice inside PlatformSupportChat, not its own screen.
  await assert.rejects(() => read('src/pages/scenario04/Hotline165Call.jsx'));
  await assert.rejects(() => read('src/pages/scenario04/Hotline165Landing.jsx'));
  await assert.rejects(() => read('src/pages/scenario04/EvidenceCenter.jsx'));
  await assert.rejects(() => read('src/pages/scenario04/ReportPrep.jsx'));
  await assert.rejects(() => read('src/pages/scenario04/components/EvidenceMiniChecklist.jsx'));
  await assert.rejects(() => read('src/data/dialogueTrees/hotline165.js'));
});

test('every Scenario04 main-flow and app route is registered', async () => {
  const routes = await read('src/routes.jsx');
  for (const path of routePaths) {
    assert.ok(routes.includes(`path: '${path}'`), `missing route: ${path}`);
  }
});

test('Scenario04 main-flow navigation edges preserve the route parameter', async () => {
  for (const [file, target] of navigationEdges) {
    const source = await read(`src/${file}`);
    assert.ok(source.includes(target), `${file} does not navigate to ${target}`);
  }
});

// The chain above starts one step earlier than its first file: 訂單詳情 is a
// BlackPi screen, so the player's way into the dispute chat is an App event
// this scenario resolves. Pinned here so the flow stays end-to-end verified.
test('訂單詳情 reaches the dispute chat through a semantic App event', async () => {
  const screen = await read('src/apps/blackpi/screens/OrderDetail.jsx');
  assert.match(screen, /onClick=\{\(\) => onContactSeller\?\.\(\)\}/);
  assert.match(screen, /t\('查看售後進度'\)/);

  const hosts = await read('src/pages/scenario04/blackpi/hosts.jsx');
  // Two destinations, because 查看售後進度 means "wherever this dispute is now":
  // the seller chat while it is still running, and 黑皮客服 once the player has
  // ended it with 放棄退貨 → 先完成訂單好了 (the only writer of
  // orderStatus: 'completed'). Sending that player back into a conversation
  // that is already `done` is what stranded the run before the 結局.
  assert.match(hosts, /onContactSeller = useCallback\(\s*\(\) => navigate\(state\.orderStatus === 'completed'\s*\?\s*BLACKPI_ROUTES\.platformSupport\(productRoute\)\s*:\s*BLACKPI_ROUTES\.disputeChat\(productRoute\)\)/);
  assert.match(hosts, /onContactSeller=\{onContactSeller\}/);
});

// AD-33. 放棄退貨 → 先完成訂單好了 used to be the one branch with no way to the
// ending: DisputeChat ends at a terminal node, marks the order completed and
// returns to 訂單詳情, whose only remaining action came straight back to that
// finished conversation. The branch now rejoins the platform-support path,
// which already carries the copy written for this exact player and leads to
// the same two endings as the refund path.
test('AD-33: 放棄退貨後仍可抵達結局', async () => {
  for (const tree of ['health', 'luckyBag']) {
    const source = await read(`src/data/dialogueTrees/${tree}.js`);
    assert.match(source, /nextNodeId: '\w+\.dispute\.completedOrderExit'/, `${tree} keeps the give-up exit`);
    assert.match(source, /warningFlags: \['premature_order_completion'\]/, `${tree} still flags the early completion`);
  }

  // The flag the give-up choice sets is the one the platform bot answers.
  const platform = await read('src/data/dialogueTrees/platformSupport.js');
  assert.match(platform, /warningFlags\.includes\('premature_order_completion'\)/);

  // And the platform conversation is what reaches the shared ending.
  const support = await read('src/pages/scenario04/PlatformSupportChat.jsx');
  assert.match(support, /\/scenario04-shopping\/result\/\$\{route\}\/success/);
  assert.match(support, /\/scenario04-shopping\/result\/\$\{route\}\/fail/);
});

test('return tracking reuses the code persisted by ReturnShipping', async () => {
  const shipping = await read('src/pages/scenario04/ReturnShipping.jsx');
  const logistics = await read('src/pages/scenario04/ReturnLogistics.jsx');
  assert.match(shipping, /update\(\{ returnCode, trackingCode \}\)/);
  assert.match(logistics, /shipmentNumber=\{state\.trackingCode\}/);
  assert.doesNotMatch(logistics, /HPE-RMA-240417-0862/);
});

// The 加入購物車 flow was removed: nothing in this scenario ever read the
// cart, so the button produced a toast and a permanently empty cart page.
// 直接購買 is the only action on the PDP that moves the story forward.
test('the PDP offers 直接購買 and no dead cart affordance', async () => {
  const pdp = await read('src/apps/blackpi/screens/ProductDetail.jsx');
  assert.match(pdp, /onClick=\{goCheckout\}/);
  assert.match(pdp, /直接購買/);
  assert.doesNotMatch(pdp, /addToCart|addCart|ShoppingCart|bp-pdp-cart-btn/);
  assert.doesNotMatch(pdp, /t\('加入購物車'\)/);

  const routes = await read('src/routes.jsx');
  assert.doesNotMatch(routes, /scenario04-shopping\/cart/);
  assert.doesNotMatch(routes, /\bCart\b/);

  const barrel = await read('src/apps/blackpi/index.js');
  assert.doesNotMatch(barrel, /screens\/Cart/);

  const store = await read('src/lib/shoppingStore.js');
  assert.doesNotMatch(store, /cartRoute|addToCart|clearCart/);
});

// A delivery notice comes from the carrier, not the storefront, and the
// 配送中 leg names the carrier that is actually driving the parcel.
test('logistics UI is attributed to 黑皮通物流, not 黑皮購物', async () => {
  const orderDetail = await read('src/apps/blackpi/screens/OrderDetail.jsx');
  assert.match(orderDetail, /HpeLogo/);
  assert.match(orderDetail, /t\('黑皮通物流'\)/);
  assert.match(orderDetail, /t\('您的包裹已送達'\)/);
  // The storefront must no longer be the sender of the delivery push.
  assert.doesNotMatch(orderDetail, /t\('黑皮購物'\)/);
  assert.doesNotMatch(orderDetail, /t\('你的包裹已送達'\)/);
  // Reused from the HPE app rather than a second, locally drawn mark.
  assert.match(orderDetail, /from '\.\.\/\.\.\/hpe-logistics'/);

  // OrderDetail is a BlackPi screen, so these live in BlackPi's dictionary
  // (§13 AD-14) - and nowhere else, so there is one source of truth for them.
  for (const dict of ['en', 'jp']) {
    const source = await read(`src/apps/blackpi/i18n/${dict}.js`);
    assert.match(source, /'黑皮通物流':/, `blackpi ${dict} is missing 黑皮通物流`);
    assert.match(source, /'您的包裹已送達':/, `blackpi ${dict} is missing 您的包裹已送達`);
  }
  for (const dict of ['scenario04En', 'scenario04Jp']) {
    const source = await read(`src/shared/i18n/${dict}.js`);
    assert.doesNotMatch(source, /'黑皮通物流':/, `${dict} still owns a BlackPi screen's copy`);
    assert.doesNotMatch(source, /'您的包裹已送達':/, `${dict} still owns a BlackPi screen's copy`);
  }
});

// Unboxing shows all four photos at once for BOTH routes. The robot vacuum
// used to reveal them one tap at a time; the lucky bag already showed a 2x2
// grid, and that is now the single shared presentation.
test('unboxing reveals four photos at once for both routes', async () => {
  const unboxing = await read('src/pages/scenario04/Unboxing.jsx');

  // No staged reveal machinery left anywhere. Matched against rendered t()
  // calls rather than raw text, so the comments explaining what was removed
  // don't trip these assertions.
  assert.doesNotMatch(unboxing, /revealedCount|revealNext|allRevealed|nextItem/);
  assert.doesNotMatch(unboxing, /t\('(?:繼續查看|繼續查看內容物…|查看完整比較|還有 | 項尚未查看)'\)/);

  // One CTA on the first-anomaly page, not a two-up choice grid.
  assert.match(unboxing, /t\('把東西全部拿出來看看'\)/);
  assert.doesNotMatch(unboxing, /t\('先拍下這個狀況'\)/);
  assert.doesNotMatch(unboxing, /bp-choice-btn-2up[\s\S]*把東西全部拿出來看看/);

  // Shared 2x2 grid markup, no longer named after one product.
  assert.match(unboxing, /bp-unboxing-grid/);
  assert.doesNotMatch(unboxing, /bp-luckybag-/);
  const css = await read('src/apps/blackpi/styles/index.css');
  assert.match(css, /\.bp-unboxing-grid\{[^}]*repeat\(2,/);
  assert.doesNotMatch(css, /\.bp-luckybag-/);

  // Exactly four photos per route, and each key is a real asset.
  const assetMap = await read('src/apps/blackpi/data/assetMap.js');
  for (const route of ['health', 'luckyBag']) {
    const block = unboxing.match(new RegExp(`${route}: \\[([\\s\\S]*?)\\],\\n`))?.[1] ?? '';
    const keys = [...block.matchAll(/key: '([^']+)'/g)].map((m) => m[1]);
    assert.equal(keys.length, 4, `${route} should have 4 unboxing photos, got ${keys.length}`);
    for (const key of keys) {
      assert.ok(assetMap.includes(`'${key}'`), `${route} photo ${key} is not in ASSET_MAP`);
    }
  }

  // The photos are persisted, not just rendered - the return flow reads them.
  assert.match(unboxing, /saveShoppingState\(\{ unboxingPhotoAssets: items\.map\(/);
  const store = await read('src/lib/shoppingStore.js');
  assert.match(store, /unboxingPhotoAssets: \[\]/);
});

// The comparison page asked the player to save material they already hold, so
// it is now a single CTA. Holding the photos moves to the reveal step, which
// matters because received-photos is the one evidence row with no fallback in
// buildEvidenceInventory - without this every player would be reported as
// having lost the unboxing photos.
test('unboxing records the photos it showed and offers one closing CTA', async () => {
  const unboxing = await read('src/pages/scenario04/Unboxing.jsx');

  assert.match(unboxing, /t\('先問賣家是不是寄錯了'\)/);
  assert.doesNotMatch(unboxing, /t\('先把商品頁和開箱照片留著'\)/);
  assert.doesNotMatch(unboxing, /finish\((?:true|false)\)/);
  assert.match(unboxing, /onClick=\{finish\}/);

  // Evidence for the four photos is recorded where they are actually revealed.
  assert.match(unboxing, /evidenceSaved: \['received-photos'\][\s\S]{0,80}evidence_before_contact/);

  // The rows that read those keys must still resolve as held.
  const config = await read('src/data/scenarioConfig.js');
  assert.match(config, /key: 'received-photos'/);
  // ReturnRequest reads the real photo array (not just the evidenceSaved
  // flag) so a save whose flag never got written still shows the photos it
  // actually has - see unboxingPhotos below.
  const returnRequest = await read('src/pages/scenario04/ReturnRequest.jsx');
  assert.match(returnRequest, /unboxingPhotos\.length/);
});

// 退貨申請 shows the attachments instead of describing them. The four unboxing
// photos must come from scenario state (what the player really has), never
// from a per-route hardcoded list of stand-ins.
test('the return request renders real attachment thumbnails from state', async () => {
  const source = await read('src/pages/scenario04/ReturnRequest.jsx');

  // Photos come from state, and only from state.
  assert.match(source, /const unboxingPhotos = state\.unboxingPhotoAssets \|\| \[\]/);
  assert.match(source, /unboxingPhotos\.map\(\(assetKey\) =>/);
  assert.doesNotMatch(source, /robot-vacuum-|luckybag-/);

  // Real <img> thumbnails via the shared resolver, in a 2-col grid.
  assert.match(source, /<AssetImage key=\{assetKey\} assetKey=\{assetKey\} className="bp-return-thumb"/);
  assert.match(source, /bp-return-thumb-grid/);

  // The unboxing photos are the ONLY attachment: the 商品頁截圖 block was
  // removed (this screen no longer restates a product page the player has
  // already been through), so nothing here renders the listing shot or reaches
  // for the table that names it.
  assert.doesNotMatch(source, /LISTING_SCREENSHOT_ASSET|listingAsset|hasListing/);
  assert.doesNotMatch(source, /商品頁截圖/);
  assert.equal((source.match(/<AssetImage/g) || []).length, 1, 'expected exactly one AssetImage - the unboxing grid');
  assert.equal((source.match(/bp-return-attachment"/g) || []).length, 1, 'expected exactly one attachment block');
  // And the copy it needed goes with it, rather than lingering in the dicts.
  for (const dict of ['scenario04En', 'scenario04Jp']) {
    const translations = await read(`src/shared/i18n/${dict}.js`);
    assert.doesNotMatch(translations, /'商品頁截圖':/, `${dict} still carries the removed 商品頁截圖 label`);
  }

  // Not an upload step: the attachments section itself carries no tap target
  // or upload affordance (the header's 返回 and the submit CTA still do).
  const evidenceSection = source.match(/return-evidence-title[\s\S]*?<\/section>/)[0];
  assert.doesNotMatch(evidenceSection, /onClick|<button|UploadSlot|onUpload/);

  // A bare 已附上 badge is no longer the whole story for an attached row.
  assert.doesNotMatch(source, /'已附上'/);

  // Every rendered class has a real CSS rule.
  const css = await read('src/apps/blackpi/styles/index.css');
  for (const cls of ['bp-return-attachment', 'bp-return-attachment-head', 'bp-return-thumb-grid', 'bp-return-thumb']) {
    assert.match(css, new RegExp(`\\.${cls}\\{`), `${cls} has no CSS rule`);
  }

  // The listing table itself stays - the unboxing claim-vs-actual comparison
  // still reads it - and still resolves to real assets for both routes.
  const config = await read('src/data/scenarioConfig.js');
  const table = config.match(/LISTING_SCREENSHOT_ASSET = \{([\s\S]*?)\};/)[1];
  const assetMap = await read('src/apps/blackpi/data/assetMap.js');
  const listingKeys = [...table.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.equal(listingKeys.length, 2, 'expected one listing asset per route');
  for (const key of listingKeys) {
    assert.ok(assetMap.includes(`'${key}'`), `listing asset ${key} is not in ASSET_MAP`);
  }
  const unboxing = await read('src/pages/scenario04/Unboxing.jsx');
  assert.match(unboxing, /claimAssetKey: LISTING_SCREENSHOT_ASSET\./);
});

// AR operability: this scenario is driven on 佐臻 AR glasses by gesture, where
// scroll is unreliable, so the CTA that carries the story forward from 退貨申請
// may never sit at the end of the content. It has to be a sibling of the
// scroller - on screen from the first frame at any content height - for BOTH
// products, which is why the single shared component matters here.
test('the return request CTA is fixed to the viewport, not the end of the content', async () => {
  const source = await read('src/pages/scenario04/ReturnRequest.jsx');

  // The scroller closes before the CTA bar opens: the button is outside
  // .bp-scroll, so no amount of content can push it out of view.
  const scroller = source.indexOf('className="bp-scroll bp-page bp-return-request"');
  const scrollerEnd = source.indexOf('</div>\n\n      {/*', scroller);
  const ctaBar = source.indexOf('className="bp-return-cta-bar"');
  assert.ok(scroller > -1 && ctaBar > scroller, 'the CTA bar must come after the scroller');
  assert.ok(scrollerEnd > -1 && scrollerEnd < ctaBar, 'the CTA bar must sit OUTSIDE .bp-scroll');
  // Both the pending button and the submitted confirmation live in that bar,
  // so the bottom of the screen never changes height mid-flow.
  const bar = source.slice(ctaBar);
  assert.match(bar, /提交退貨申請/);
  assert.match(bar, /退貨申請已送出/);

  const css = await read('src/apps/blackpi/styles/index.css');
  const rule = css.match(/\.bp-return-cta-bar\{([^}]*)\}/);
  assert.ok(rule, 'bp-return-cta-bar has no CSS rule');
  // flex:none inside .blackpi-app's column = pinned to the bottom of the
  // stage; the safe-area inset keeps it clear of the phone home indicator and
  // browser chrome, and resolves to 0 on desktop.
  assert.match(rule[1], /flex:none/);
  assert.match(rule[1], /env\(safe-area-inset-bottom\)/);

  // Nothing per-product: one component, one layout, both routes.
  const copy = source.match(/RETURN_COPY = \{([\s\S]*?)\n\};/)[1];
  assert.match(copy, /health:/);
  assert.match(copy, /luckyBag:/);
  const body = source.slice(source.indexOf('export function ReturnRequest'));
  assert.doesNotMatch(body, /route === '(health|luckyBag)'/);
});

// 黑皮智能客服 (the bot triage stage only - the 安心專員 stage is deliberately
// left alone). The bot may only offer what the player already knows, and must
// not appeal to a refund deadline the story never gave them.
test('the platform bot triage offers only what the player knows', async () => {
  const tree = await read('src/data/dialogueTrees/platformSupport.js');
  const botStage = tree.slice(0, tree.indexOf("id: 'shared.platform.transfer'"));
  // Comments explain what was removed and name the old strings, so the
  // content assertions below run against code only.
  const botCode = botStage.replace(/^\s*\/\/.*$/gm, '');

  // First level: one problem, the one the player has actually experienced.
  assert.match(botCode, /id: 'noRefund'/);
  assert.doesNotMatch(botCode, /id: 'sellerGone'/);
  assert.doesNotMatch(botCode, /賣家已無法聯絡|賣家已經無法聯絡/);
  // The removed branch's node goes too, rather than lingering unreachable.
  assert.doesNotMatch(tree, /shared\.platform\.bot\.c2/);

  // No deadline concept anywhere in the bot stage, and it hands over instead.
  for (const word of ['期限', '逾期', '幾天', '天內']) {
    assert.ok(!botCode.includes(word), `bot stage should not mention ${word}`);
  }
  assert.doesNotMatch(tree, /shared\.platform\.bot\.overLimit/);
  assert.match(botCode, /id: 'transfer'.*shared\.platform\.transfer/s);

  // The handover target still exists (the 安心專員 stage itself is covered by
  // its own test below).
  assert.match(tree, /id: 'shared\.platform\.agent\.opening'/);
});

test('the platform bot wears the 黑皮購物 mark, not a stand-in character', async () => {
  const screen = await read('src/pages/scenario04/PlatformSupportChat.jsx');
  // Reuses the storefront glyph already used by the home header / phone icon.
  assert.match(screen, /import \{ ShoppingBag \} from 'lucide-react'/);
  assert.match(screen, /: <ShoppingBag size=\{17\} \/>\}/);
  assert.doesNotMatch(screen, /t\('智'\)/);
  // The bot keeps the brand tile; the specialist stage now shows her photo.
  assert.match(screen, /avatarVariant=\{isAgentStage \? 'photo' : 'brand'\}/);

  const css = await read('src/apps/blackpi/styles/index.css');
  // The brand tile matches .bp-logo-mark's own gradient rather than inventing one.
  assert.match(css, /\.bp-chat-avatar\.brand\{background:linear-gradient\(135deg,var\(--bp-primary\),var\(--bp-primary-dark\)\)/);
  assert.match(css, /\.bp-logo-mark\{[^}]*linear-gradient\(135deg,var\(--bp-primary\),var\(--bp-primary-dark\)\)/);

  // A single remaining choice renders as a full-width CTA, not a half-width
  // button stranded in a two-column grid.
  const grid = await read('src/apps/blackpi/components/DialogueChoiceGrid.jsx');
  assert.match(grid, /choices\.length === 1 \? ' bp-choice-grid-single'/);
  // A 3rd choice (the "跟平台爭執什麼" pick) also stacks to one column rather
  // than stranding a 3rd button alone under a 2-col grid.
  assert.match(grid, /choices\.length >= 3 \? ' bp-choice-grid-stack'/);
  assert.match(css, /\.bp-choice-grid\.bp-choice-grid-stack\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(css, /\.bp-choice-grid\.bp-choice-grid-single\{grid-template-columns:minmax\(0,1fr\)\}/);
});

// 黑皮安心專員 is a named person with a face, cast from the shared character
// registry rather than a name and a photo invented for this screen.
test('the platform specialist is named and cast from the shared female pool', async () => {
  const roles = await read('src/experience/characters/roles.js');
  assert.match(roles, /'scenario04\.platformAgent': \{[^}]*gender: 'female'[^}]*nameStyle: 'casual'/);
  // Her face is drawn the same way her name is - by the shared casting API,
  // from the shared female visual pool.
  assert.match(roles, /'scenario04\.platformAgent': \{[^}]*visualStrategy: 'random'/);
  const visuals = await read('src/experience/characters/visuals.js');
  const pool = [...visuals.matchAll(/id: '(female_visual_\d+)'[^\n]*eligibleRoles: \[([^\]]*)\]/g)]
    .filter(([, , eligible]) => eligible.includes('scenario04.platformAgent'))
    .map(([, id]) => id);
  assert.ok(pool.length >= 2, `expected a female avatar pool for the specialist, got ${pool.length}`);

  // No second name library, and no literal name on the screen or in the store.
  const names = await read('src/experience/characters/names.js');
  assert.match(names, /NAME_POOLS = \{\s*female:/);
  const store = await read('src/lib/shoppingStore.js');
  const screen = await read('src/pages/scenario04/PlatformSupportChat.jsx');
  for (const file of [store, screen]) {
    assert.doesNotMatch(file, /NAME_POOLS|surnames:|given:/);
  }

  // Resolved once through the shared casting API and persisted, so the header
  // shows the same person on every render and after a refresh.
  assert.match(store, /resolveCast\('scenario04', \[\{ roleId: 'scenario04\.platformAgent', slotId: 'platformAgent' \}\]\)/);
  assert.match(store, /characterCast: null/);
  assert.match(store, /const cast = state\.characterCast\?\.roles\?\.platformAgent;/);

  // Name and face come from ONE profile, resolved from the one persisted cast
  // entry - never two separate draws that could disagree about who she is.
  const profile = await read('src/pages/scenario04/supportAgent.js');
  assert.match(profile, /getPlatformAgentCast\(\)/);
  assert.match(profile, /name: getCastName\(cast, 'platformAgent', lang\)/);
  assert.match(profile, /avatar: getVisualAssetUrl\(cast\?\.roles\?\.platformAgent\?\.visualId\)/);
  assert.doesNotMatch(profile, /Math\.random|resolveCast/);
  // A pre-avatar save is re-cast once, instead of showing a blank circle.
  assert.match(store, /cast\?\.roleId === 'scenario04\.platformAgent' && cast\.visualId/);

  // Header reads name / role / status; the bot stage keeps no role line.
  assert.match(screen, /const agent = useSupportAgent\(\)/);
  assert.match(screen, /headerTitle=\{isAgentStage \? agent\.name : t\('黑皮智能客服'\)\}/);
  assert.match(screen, /headerRole=\{isAgentStage \? t\('黑皮安心專員'\) : null\}/);

  // Her photo replaces the old role initial entirely - no "專" tile anywhere.
  assert.match(screen, /<img className="bp-chat-avatar-photo" src=\{agent\.avatar\}/);
  assert.doesNotMatch(screen, /t\('專'\)/);
  for (const dict of ['scenario04En', 'scenario04Jp']) {
    const source = await read(`src/shared/i18n/${dict}.js`);
    assert.ok(!source.includes("'專':"), `${dict} still carries the removed 專 avatar label`);
    // The transfer choice is 轉接真人客服 in every language, and the old
    // specialist wording is gone from the choice itself.
    assert.match(source, /'轉接真人客服':/, `${dict} missing the 轉接真人客服 label`);
    assert.ok(!source.includes("'轉接客服專員':"), `${dict} still carries the old transfer label`);
  }
  const tree = await read('src/data/dialogueTrees/platformSupport.js');
  assert.match(tree, /label: t\('轉接真人客服', lang\), playerMessage: t\('我要轉接真人客服。', lang\)/);
  assert.doesNotMatch(tree, /label: t\('轉接客服專員'/);

  const css = await read('src/apps/blackpi/styles/index.css');
  assert.match(css, /\.bp-chat-role\{/);
  assert.match(css, /\.bp-chat-avatar\.photo\{/);
  assert.match(css, /\.bp-chat-avatar-photo\{[^}]*object-fit:cover/);
  // The header has to be able to grow to a third line.
  assert.match(css, /\.bp-chat-header\{[^}]*min-height:calc\(56px/);
});

test('the specialist explains the off-platform decline, not a deadline, and offers exactly two endings', async () => {
  const tree = await read('src/data/dialogueTrees/platformSupport.js');
  const code = tree.replace(/^\s*\/\/.*$/gm, '');

  for (const phrase of ['超過正常處理時間', '已逾期', '期限', '幾天', '天內']) {
    assert.ok(!code.includes(phrase), `platform tree should not mention ${phrase}`);
  }

  // The old "formally file an appeal / mint a case id" mechanic is gone -
  // finding the platform is never the win condition on its own.
  assert.doesNotMatch(code, /id: 'appeal'/);
  assert.doesNotMatch(code, /platformCaseCreated/);
  assert.doesNotMatch(code, /id: 'prepEvidence'/);
  assert.doesNotMatch(code, /shared\.platform\.agent\.prepEvidence/);
  assert.doesNotMatch(code, /我要先整理證據|我先整理證據/);

  // The core decline sentence is a shared constant (DECLINE_CORE), not a
  // string repeated by hand, but it must still be the platform's actual
  // opening line AND referenced again in every "keep arguing" reply - so
  // the wording can never drift between the reveal and the pushback.
  assert.match(code, /const DECLINE_CORE = '很抱歉，此筆交易並不是透過黑皮購物的官方交易流程完成，因此不屬於平台交易保障範圍。';/);
  const declineCoreRefs = [...code.matchAll(/t\(DECLINE_CORE, lang\)/g)];
  assert.ok(declineCoreRefs.length >= 3, `expected DECLINE_CORE referenced at the reveal and in both argue replies, saw ${declineCoreRefs.length}`);

  // Exactly two choices at the final decision: keep arguing (-> failure) or
  // report to 165 (-> success). No third "success" shortcut.
  assert.match(code, /id: 'keepArguing'/);
  assert.match(code, /id: 'report165'/);
  assert.match(code, /nextNodeId: 'shared\.platform\.agent\.argue\.pick'/);
  assert.match(code, /nextNodeId: 'shared\.platform\.agent\.report165'/);

  // Arguing further is a two-way pick ("what do you want to press the platform
  // on"), and both replies converge on the same failure stub. Two, not three:
  // the AR build has exactly two gestures, so a third reply here would be a
  // prompt a player on the glasses could never answer (spec §4.12). The one
  // that went - 'blameSeller' - argued the same thing as 'blamePlatform'.
  assert.match(code, /id: 'blamePlatform'/);
  assert.doesNotMatch(code, /id: 'blameSeller'/);
  assert.match(code, /id: 'askDirectRefund'/);
  assert.doesNotMatch(code, /shared\.platform\.agent\.argue\.replyB/);
  const argueReplies = [...code.matchAll(/autoNextNodeId: 'shared\.platform\.toResultFail'/g)];
  assert.equal(argueReplies.length, 2, 'both argue replies should funnel into the same failure stub');

  // Reporting to 165 is the ONLY way reported gets set to true, and it does
  // so immediately - no simulated call, no interview.
  assert.match(code, /effects: \{ warningFlags: \['contacted_165'\] \}/);
  assert.match(code, /id: 'shared\.platform\.toResultSuccess'/);
  assert.match(code, /id: 'shared\.platform\.toResultFail'/);

  // Both languages carry the core decline sentence and the reminder.
  for (const dict of ['scenario04En', 'scenario04Jp']) {
    const source = await read(`src/shared/i18n/${dict}.js`);
    assert.match(source, /'很抱歉，此筆交易並不是透過黑皮購物的官方交易流程完成，因此不屬於平台交易保障範圍。':/, `${dict} missing the core decline sentence`);
    assert.match(source, /'如果你認為這整件事情涉及詐騙，建議向 165 或警方報案處理。':/, `${dict} missing the 165 reminder`);
    assert.doesNotMatch(source, /'這筆訂單已經超過正常處理時間/, `${dict} still has the deadline line`);
  }
});

test('reaching the platform never sets reported by itself, and the final choice drives the outcome', async () => {
  const screen = await read('src/pages/scenario04/PlatformSupportChat.jsx');
  assert.match(screen, /saveShoppingState\(\{ reported: true \}\)/);
  assert.match(screen, /saveShoppingState\(\{ reported: false \}\)/);
  assert.match(screen, /\.toResultSuccess/);
  assert.match(screen, /\.toResultFail/);

  const store = await read('src/lib/shoppingStore.js');
  assert.match(store, /reported: false,/);
  // The old three-way "how fast did you escalate" record is gone - it's no
  // longer possible to reach the platform before the external site and the
  // seller have both gone dark, so there is nothing left for it to record.
  assert.doesNotMatch(store, /resolutionPath/);
  assert.doesNotMatch(store, /platformCaseId/);
});

// 七天後 goes straight to the shop being gone. The chat is a shopping app's
// chat, so it may not carry narration, a fake browser error page, or a
// "sending..." placeholder - only what that app would really show.
test('the seller going dark is a platform status card, not narration or a fake browser page', async () => {
  const delay = await read('src/data/dialogueTrees/delay.js');
  const delayCode = delay.replace(/^\s*\/\/.*$/gm, '');

  // wait7 leads directly to the unreachable notice - nothing in between.
  assert.match(delayCode, /p\('wait7'\)[\s\S]*?autoNextNodeId: p\('unreachable\.notice'\)/);

  // The whole dead-external-page detour is gone, in code and in copy.
  for (const gone of [
    "type: 'site-down'", "siteCheck", "unreachable.attempt", 'externalUrl',
    'ERR_CONNECTION_TIMED_OUT', 'smarthome-deal-batch.link', 'luckybag-giftpick.link',
    '你想到，不如回去看看當初下單時看到的賣場頁面。', '這個頁面已經完全打不開了。',
    '無法連線到這個網站', '（正在嘗試傳送訊息）',
  ]) {
    assert.ok(!delayCode.includes(gone), `delay tree should no longer contain ${gone}`);
  }

  // The status itself is one centred platform card, not two chat bubbles.
  assert.match(delayCode, /type: 'shop-status'/);
  assert.match(delayCode, /此賣場目前無法使用/);
  assert.match(delayCode, /店家已暫停營業，目前無法聯絡賣家。/);
  for (const gone of ['此商店目前無法接收訊息。', '商店狀態：店家暫停營業']) {
    assert.ok(!delayCode.includes(gone), `${gone} should no longer be a chat bubble`);
  }

  // ChatScreen renders it as its own centred card - no avatar, no read
  // receipt, neither side's bubble - and the dead site-down renderer is gone.
  const chatScreen = await read('src/apps/blackpi/components/ChatScreen.jsx');
  assert.match(chatScreen, /item\.type === 'shop-status'/);
  assert.match(chatScreen, /className="bp-shop-status"/);
  assert.doesNotMatch(chatScreen, /site-down|WifiOff/);

  const css = await read('src/apps/blackpi/styles/index.css');
  assert.match(css, /\.bp-shop-status\{[^}]*align-self:center/);
  assert.doesNotMatch(css, /bp-site-down/);

  // The existing shopClosed handling still owns everything else about the
  // state - it was not rebuilt for this.
  const screen = await read('src/pages/scenario04/RefundDelayChat.jsx');
  assert.match(screen, /refundStatus: 'sellerUnreachable', sellerUnreachable: true/);
  assert.match(screen, /shopClosed \? t\('店家暫停營業'\)/);
  assert.match(screen, /shopClosed=\{shopClosed\}/);

  // No shortcut around the beat: the old mid-delay "contact platform early"
  // branch is gone, so the platform is only reachable after the seller goes
  // dark.
  assert.doesNotMatch(delay, /toPlatformEarly/);
  assert.doesNotMatch(delay, /contactPlatform/);
});

// Both products are the same tree, built once. The copy differs where the
// products differ; the structure after 七天後 must be identical.
test('both delay routes get the same structure from the one shared builder', async () => {
  const delay = await read('src/data/dialogueTrees/delay.js');
  assert.match(delay, /export function buildDelayTree\(route, lang\)/);
  // No per-route branch anywhere in the unreachable half.
  const afterWait7 = delay.slice(delay.indexOf("p('wait7')"));
  assert.doesNotMatch(afterWait7, /isHealth|route === '/);

  // Every id, every edge and every choice is built through p(), which is
  // route-parameterised, so the two routes cannot diverge structurally: the
  // only thing isHealth is allowed to pick is seller copy.
  const structural = delay.match(/(?:id|nextNodeId|autoNextNodeId): [^,\n]+/g) ?? [];
  for (const line of structural) {
    assert.ok(
      /p\('[^']+'\)/.test(line) || /id: '[a-zA-Z]+'/.test(line) || line.includes('route'),
      `structural field not built through p(): ${line}`,
    );
    assert.ok(!line.includes('isHealth'), `structural field branches per route: ${line}`);
  }

  // And the screen that drives it is one screen for both routes.
  const screen = await read('src/pages/scenario04/RefundDelayChat.jsx');
  assert.match(screen, /buildDelayTree\(route, lang\)/);
  assert.doesNotMatch(screen, /route === '(health|luckyBag)'/);
});

// The seller is one person, so 賣家聊聊 -> dispute -> return ack -> refund
// delay is one conversation. Those four screens must share a checkpoint key,
// and the engine must append a new stage onto the existing history rather
// than starting an empty room with the same shop name at the top.
test('every seller screen shares one continuous conversation', async () => {
  const keys = await read('src/features/shopping/conversationKeys.js');
  assert.match(keys, /export const SELLER_CONVERSATION_KEY = \(route\) => `seller-\$\{route\}`/);

  const sellerScreens = ['SellerChat', 'DisputeChat', 'ReturnAckChat', 'RefundDelayChat'];
  for (const name of sellerScreens) {
    const source = await read(`src/pages/scenario04/${name}.jsx`);
    assert.match(source, /screenKey: SELLER_CONVERSATION_KEY\(route\)/, `${name} must use the shared seller key`);
    // No per-screen key may survive, or that screen reopens its own room.
    assert.doesNotMatch(source, /screenKey: `(?:presale|dispute|returnAck|delay)-/, `${name} still has a per-screen key`);
  }

  // Different parties keep their own conversation.
  const platformSource = await read('src/pages/scenario04/PlatformSupportChat.jsx');
  assert.doesNotMatch(platformSource, /SELLER_CONVERSATION_KEY/, 'PlatformSupportChat is not the seller');
  assert.ok(platformSource.includes('platform'), 'PlatformSupportChat should keep its own platform key');

  // The engine resumes only when the saved position belongs to THIS tree;
  // otherwise it keeps the timeline and plays this stage onto the end of it.
  const engine = await read('src/features/shopping/dialogueEngine.js');
  assert.match(engine, /const resumable = Boolean\(checkpoint\?\.currentNodeId && nodesById\[checkpoint\.currentNodeId\]\)/);
  assert.match(engine, /useState\(\(\) => checkpoint\?\.timeline \?\? \[\]\)/);
  // A finished earlier stage must not mark the new stage finished.
  assert.match(engine, /useState\(\(\) => \(resumable \? checkpoint\.done \?\? false : false\)\)/);
  assert.match(engine, /if \(!resumable\) \{[\s\S]*?advance\(startNodeId\)/);
});

test('the return/delay chase drops the no-op replies and the invented deadline', async () => {
  const ack = await read('src/data/dialogueTrees/returnAck.js');
  const ackCode = ack.replace(/^\s*\/\/.*$/gm, '');
  assert.match(ackCode, /我們已收到您的退貨申請。請將商品寄回，商品經倉庫驗收後，將依流程辦理退款。/);
  assert.doesNotMatch(ackCode, /我們已收到申請。商品寄回並經倉庫驗收後/);
  assert.doesNotMatch(ackCode, /id: 'getCode'|取得寄件編號/);

  const delay = await read('src/data/dialogueTrees/delay.js');
  const delayCode = delay.replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(delayCode, /id: 'saveFirst'|先保存簽收紀錄/);
  assert.doesNotMatch(delayCode, /saveThenAsk/);
  assert.doesNotMatch(delayCode, /id: 'waitPatient'|好，我等五天/);
  // No deadline anywhere, and no replacement day count was invented.
  for (const phrase of ['已經超過期限', '已經超過您說的期限', '我等五天']) {
    assert.ok(!delayCode.includes(phrase), `delay tree should not contain ${phrase}`);
  }

  // The escalation the push-back leads to must stay reachable: it is the only
  // way into the seller-goes-unreachable beat and its seller-chat-log evidence.
  assert.match(delayCode, /id: 'pushBack'/);
  assert.match(delayCode, /同意退貨卻不退款，這樣不合理/);
  for (const node of ['wait7', 'unreachable.notice', 'saveChatDone']) {
    assert.ok(delayCode.includes(`p('${node}')`), `${node} must stay reachable`);
  }
  assert.match(delayCode, /evidenceSaved: \['seller-chat-log'\]/);

  for (const dict of ['scenario04En', 'scenario04Jp']) {
    const source = await read(`src/shared/i18n/${dict}.js`);
    assert.match(source, /'我們已收到您的退貨申請。請將商品寄回，商品經倉庫驗收後，將依流程辦理退款。':/, `${dict} missing new ack line`);
    assert.match(source, /'同意退貨卻不退款，這樣不合理':/, `${dict} missing new push-back label`);
    assert.doesNotMatch(source, /'已經超過期限，這樣不合理':/, `${dict} still has the deadline label`);
    // The shop-status card and the renamed second choice are translated, not
    // left to fall back to Chinese.
    assert.match(source, /'此賣場目前無法使用':/, `${dict} missing the shop-status title`);
    assert.match(source, /'店家已暫停營業，目前無法聯絡賣家。':/, `${dict} missing the shop-status body`);
    assert.match(source, /'前往黑皮購物申請處理':/, `${dict} missing the platform-case choice`);
    for (const gone of ['先回黑皮購物看看', '（正在嘗試傳送訊息）', '此商店目前無法接收訊息。', '商店狀態：店家暫停營業', '無法連線到這個網站']) {
      assert.ok(!source.includes(`'${gone}':`), `${dict} still carries the removed line ${gone}`);
    }
  }
});

// There is no longer a dedicated 證據整理 screen or 報案資料整理 wizard - the
// player never treats evidence-gathering as its own task (spec section 三) -
// and the ending no longer grades what they collected either. This test keeps
// the removed screens/exports/state fields gone, and keeps the inventory
// logic itself honest for as long as it is kept in the data layer.
test('the evidence-center / report-prep flow is fully removed, and the inventory logic still reflects what the player holds', async () => {
  const config = await read('src/data/scenarioConfig.js');

  // Both rows read the real artifact, not a stale flag.
  assert.match(config, /export function hasUnboxingPhotos\(state\) \{[\s\S]*?state\.unboxingPhotoAssets\?\.length/);
  assert.match(config, /const hasPhotos = hasUnboxingPhotos\(state\)/);
  const builder = config.slice(config.indexOf('export function buildEvidenceInventory'));
  const returnRow = builder.match(/key: 'return-request-record'[\s\S]*?\}\),/)[0];
  assert.match(returnRow, /hasPhotos[\s\S]*?已附於退貨申請/);
  const photoRow = builder.match(/key: 'received-photos'[\s\S]*?\}\),/)[0];
  assert.match(photoRow, /hasPhotos\s*\n?\s*\?\s*\{ status: 'complete'/);

  // The platform-case-id row and the completeness verdict it fed are gone
  // along with the case-id mechanic itself.
  assert.doesNotMatch(config, /platform-case-id/);
  assert.doesNotMatch(config, /getEvidenceCompleteness/);
  assert.doesNotMatch(config, /buildReportTimeline/);
  assert.doesNotMatch(config, /REPORT_DISPUTE_OPTIONS/);
  assert.doesNotMatch(config, /EVIDENCE_ITEMS/);

  // The screens themselves no longer exist.
  await assert.rejects(() => read('src/pages/scenario04/EvidenceCenter.jsx'));
  await assert.rejects(() => read('src/pages/scenario04/ReportPrep.jsx'));

  const routes = await read('src/routes.jsx');
  assert.doesNotMatch(routes, /scenario04-shopping\/(?:evidence-center|report-prep|hotline165)/);

  // The ending analyses the scam, not the player, so it reads neither the
  // inventory nor any per-run state.
  const ending = await read('src/pages/scenario04/Ending.jsx');
  assert.doesNotMatch(ending, /buildEvidenceInventory|state\.reported|useShoppingState/);
});

// 詐騙疑點分析 - the scenario's teaching page. It analyses the scam, never the
// player: no acts to click through, no score, no personalised write-up, and
// nothing hidden behind an accordion.
//
// The screen itself is CIBAR's, not BlackPi's: it renders through the shared
// Outcome System (components/outcome/FraudClueAnalysis.jsx), which owns the
// heading, the CTA wording and the styling. What Scenario 04 still owns, and
// what this test is about, is the four red flags per product route.
test('the ending is a flat 詐騙疑點分析 with four red flags and one CTA', async () => {
  const ending = await read('src/pages/scenario04/Ending.jsx');

  // Everything the three-act scorecard needed is gone, in code and in copy.
  for (const gone of [
    'useState', 'setAct', 'ACT1_COPY', 'buildChoiceCards', 'didAskPreSaleVerification',
    'buildAnalysis', 'buildEvidenceNote', 'Accordion', 'dims', 'bp-badge', 'bp-score-row',
    'otherRoute', 'tryOtherRoute', 'restartRoute', 'resetCurrentShoppingRoute',
    '完整分析', '你的關鍵選擇', '查看我的關鍵選擇', '五項評估', '個人化分析', '核心教育重點',
    '體驗另一項商品', '重新開始本路線', '表現良好', '部分完成', '需要加強',
  ]) {
    assert.ok(!ending.includes(gone), `Ending.jsx should no longer contain ${gone}`);
  }
  // `act` and `level()` as identifiers, not as substrings of "transaction".
  assert.doesNotMatch(ending, /\b(act|level)\b/);
  // ...and the route-restart helper it was the only caller of is gone too.
  const store = await read('src/lib/shoppingStore.js');
  assert.doesNotMatch(store, /resetCurrentShoppingRoute/);

  // The shared analysis screen, four flags per route, and the quiz as the one
  // way on - with the route still banked on the way there.
  assert.match(ending, /<FraudClueAnalysis/);
  assert.match(ending, /quizTo="\/scenario04-shopping\/quiz"/);
  assert.match(ending, /onContinue=\{resetShoppingRoute\}/);
  for (const route of ['health', 'luckyBag']) {
    const block = ending.match(new RegExp(`  ${route}: \\[([\\s\\S]*?)\\n  \\]`))[1];
    assert.equal((block.match(/title:/g) || []).length, 4, `${route} must list exactly four red flags`);
    assert.equal((block.match(/text:/g) || []).length, 4, `${route} red flags each need a body`);
  }
  // The first flag is the one thing that differs per product; the refund
  // stall, the shop going dark and the off-platform trap are shared.
  assert.match(ending, /商品資訊與實際收到內容明顯不符/);
  assert.match(ending, /「隨機內容」不能成為貨不對版的藉口/);
  for (const shared of ['賣家以退貨流程持續拖延退款', '賣家失聯或賣場停止營業', '平台外交易缺乏平台保障']) {
    assert.equal((ending.match(new RegExp(shared, 'g')) || []).length, 2, `${shared} must appear on both routes`);
  }

  // 結算 continues here, and Scenario 04 no longer spells the CTA itself: the
  // Outcome System owns 查看詐騙疑點分析 (see scripts/outcome-ownership.test.mjs).
  const outcome = await read('src/pages/scenario04/OutcomeResult.jsx');
  assert.match(outcome, /analysisTo=\{`\/scenario04-shopping\/ending\/\$\{route\}`\}/);
  assert.doesNotMatch(outcome, /查看完整分析/);

  // Three languages for the flags Scenario 04 still owns. The four labels the
  // Outcome System took over (詐騙疑點分析 / 疑點 / the two CTAs) are gone from
  // this scenario's dictionaries along with the removed scorecard copy.
  for (const dict of ['scenario04En', 'scenario04Jp']) {
    const source = await read(`src/shared/i18n/${dict}.js`);
    for (const key of ['商品資訊與實際收到內容明顯不符', '「隨機內容」不能成為貨不對版的藉口',
      '賣家以退貨流程持續拖延退款', '賣家失聯或賣場停止營業', '平台外交易缺乏平台保障']) {
      assert.ok(source.includes(`'${key}':`), `${dict} is missing ${key}`);
    }
    for (const gone of ['完整分析', '核心教育重點', '五項評估', '個人化分析', '你的關鍵選擇', '體驗另一項商品',
      '詐騙疑點分析', '疑點', '查看詐騙疑點分析', '進入反詐小測驗']) {
      assert.ok(!source.includes(`'${gone}':`), `${dict} still carries ${gone}`);
    }
  }

  // No BlackPi styling left behind for a screen BlackPi no longer renders.
  const css = await read('src/apps/blackpi/styles/index.css');
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /bp-signal|bp-ending-cta-bar/);
});