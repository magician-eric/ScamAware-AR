// AR dual-geometry VISUAL ORDER audit.
//
// The AR Interaction Contract already guarantees the *semantics*: a `dual`
// surface binds LEFT to one action and RIGHT to another, and
// scripts/ar-interaction-migration.test.mjs proves every story surface in the
// five Scenarios declares one. What none of that can see is the screen.
//
// A gesture player is told exactly one rule:
//
//     兩顆按鈕：向左揮 -> 左邊那顆    向右揮 -> 右邊那顆
//
// That rule is a lie the moment a screen's contract binds LEFT to the button
// drawn on the right. Nothing in the contract can catch it - the contract
// never sees markup, and that separation is deliberate (see
// ../src/lib/arInteraction/interactionContract.js). So the check has to be
// made here, against the real source and the real stylesheet, and it has to
// be a standing test rather than a one-off read-through: a later refactor
// that swaps two JSX buttons is exactly the change that silently inverts the
// whole gesture vocabulary on that screen.
//
// This module answers one question per `dual` surface: **is the action bound
// to LEFT the one the player actually sees on the left?** It answers it from
// three mechanical facts, none of them a human assertion that could go stale:
//
//   1. LAYOUT   - the container that draws the pair really lays it out as two
//                 side-by-side tracks, and nothing reverses it.
//   2. DRAW     - inside the drawing file, the left control is written before
//                 the right one, so source order is on-screen order.
//   3. BINDING  - inside the declaring file, `left:` is bound to that first
//                 control and `right:` to the second.
//
// (1) + (2) + (3) is what "LEFT means the left button" decomposes into. Break
// any one and the audit fails and names the surface.
//
// Two surfaces genuinely have no left and no right: 黑皮通's message inbox and
// its member page are vertical lists, not a decision row. They are carried as
// `axis: 'stack'` rows with a written reason, and for them the rule the audit
// enforces is reading order - LEFT is the row on top. A stack row without a
// reason is a failure, so a decision row can never quietly become one.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------- manifest
//
// Row shape:
//   surfaceId      the contract id, as ../scripts/ar-interaction-migration-inventory.mjs names it
//   declaredIn     the file whose useARInteraction() binds LEFT and RIGHT
//   leftBinding    the exact `left:` source line in that file
//   rightBinding   the exact `right:` source line in that file
//   drawnIn        the file whose JSX draws the pair (often a shared component)
//   css            the stylesheet that lays the pair out
//   selectors      the exact CSS selectors that apply to the pair's container,
//                  in cascade order (a base rule plus its dual modifier)
//   axis           'row'   - two side-by-side tracks; LEFT is the left one
//                  'stack' - a vertical list; LEFT is the top one (needs `reason`)
//   binding        'pair'    - two literal controls; `leftToken`/`rightToken`
//                              are matched in draw order inside `drawnIn`
//                  'indexed' - one array rendered in order; `collection` is
//                              iterated and LEFT must take index 0
//
// Ordering follows the migration inventory, which follows the run.
const rows = [];
function dual(row) {
  rows.push({ reason: '', ...row });
  return row;
}

// --------------------------------------------------------------- shared
dual({
  surfaceId: 'shared/anti-fraud-quiz',
  declaredIn: 'src/components/ui/ScenarioFinalDecision.jsx',
  leftBinding: 'left: () => choose(0),',
  rightBinding: 'right: () => choose(1),',
  drawnIn: 'src/components/ui/ScenarioFinalDecision.jsx',
  css: 'src/components/ui/ScenarioFinalDecision.css',
  selectors: ['.antifraud-quiz-choices'],
  axis: 'row',
  binding: 'indexed',
  collection: 'options',
});

// ----------------------------------------------------------- scenario 01
dual({
  surfaceId: 'scenario01/line-teacher/need-choice',
  declaredIn: 'src/pages/scenario01/LineTeacher.jsx',
  leftBinding: "left: () => chooseNeed('A'),",
  rightBinding: "right: () => chooseNeed('B'),",
  drawnIn: 'src/apps/line/components/Line.jsx',
  css: 'src/apps/line/styles/line.css',
  selectors: ['.line-quick-pills'],
  axis: 'row',
  binding: 'indexed',
  collection: 'options',
  // CHOICE_OPTIONS[0] is 我想直接跟老師操作 and LineQuickReplies reports its
  // index, which LineTeacher maps 0 -> 'A'. The A/B naming is the story's, not
  // a second ordering - so what has to hold is that the map still sends index
  // 0 to the branch LEFT is bound to, and this is the line that says so.
  indexBridge: "onChoose={(i) => chooseNeed(i === 0 ? 'A' : 'B')}",
});
dual({
  surfaceId: 'scenario01/withdraw-fail/final-decision',
  declaredIn: 'src/pages/scenario01/WithdrawFail.jsx',
  leftBinding: "left: () => navigate('/scenario01-investment/scammed-result'),",
  rightBinding: "right: () => navigate('/scenario01-investment/stopped-result'),",
  drawnIn: 'src/pages/scenario01/WithdrawFail.jsx',
  css: 'src/styles/global.css',
  selectors: ['.btns', '.btns.btns-dual'],
  axis: 'row',
  binding: 'pair',
  leftToken: '/scenario01-investment/scammed-result">',
  rightToken: '/scenario01-investment/stopped-result">',
});

// ----------------------------------------------------------- scenario 02
dual({
  surfaceId: 'scenario02/dating-browse/<cardId>',
  declaredIn: 'src/pages/scenario02/DatingBrowse.jsx',
  leftBinding: "left: () => onDecision('pass'),",
  rightBinding: "right: () => onDecision('like'),",
  drawnIn: 'src/apps/meetu/components/MeetUSwipeActions.jsx',
  css: 'src/apps/meetu/styles/index.css',
  selectors: ['.meetu-swipe-actions'],
  axis: 'row',
  binding: 'pair',
  leftToken: 'onClick={onPass}',
  rightToken: 'onClick={onLike}',
});
dual({
  surfaceId: 'scenario02/mini-match/<cardId>/reply',
  declaredIn: 'src/pages/scenario02/DatingBrowse.jsx',
  leftBinding: 'left: () => choose(0),',
  rightBinding: 'right: () => choose(1),',
  drawnIn: 'src/apps/meetu/components/SuggestedReplies.jsx',
  css: 'src/apps/meetu/styles/index.css',
  selectors: [
    '.meetu-suggested-pills',
    '.meetu-mini-chat .meetu-suggested-pills:has(> .meetu-suggested-pill:nth-child(2):last-child)',
  ],
  axis: 'row',
  binding: 'indexed',
  collection: 'options',
});
dual({
  surfaceId: 'scenario02/dating-lead-skipped',
  declaredIn: 'src/pages/scenario02/DatingBrowse.jsx',
  leftBinding: 'left: onReveal,',
  rightBinding: 'right: onDecline,',
  drawnIn: 'src/apps/meetu/components/MeetUInterstitial.jsx',
  css: 'src/apps/meetu/styles/index.css',
  selectors: ['.meetu-interstitial-actions-split'],
  axis: 'row',
  binding: 'pair',
  leftToken: 'onClick={onPrimary}',
  rightToken: 'onClick={onSecondary}',
});
dual({
  surfaceId: 'scenario02/dating-lead-reveal',
  declaredIn: 'src/pages/scenario02/DatingBrowse.jsx',
  leftBinding: 'left: onOpenChat,',
  rightBinding: 'right: onBack,',
  drawnIn: 'src/apps/meetu/components/MeetUInterstitial.jsx',
  css: 'src/apps/meetu/styles/index.css',
  selectors: ['.meetu-interstitial-actions-split'],
  axis: 'row',
  binding: 'pair',
  leftToken: 'onClick={onPrimary}',
  rightToken: 'onClick={onSecondary}',
});
dual({
  surfaceId: 'scenario02/dating-chat/choice',
  declaredIn: 'src/pages/scenario02/DatingChat.jsx',
  leftBinding: 'left: () => choose(0),',
  rightBinding: 'right: () => choose(1),',
  drawnIn: 'src/apps/meetu/components/SuggestedReplies.jsx',
  css: 'src/apps/meetu/styles/index.css',
  selectors: [
    '.meetu-suggested-pills',
    '.meetu-chat-page .meetu-suggested-pills:has(> .meetu-suggested-pill:nth-child(2):last-child)',
  ],
  axis: 'row',
  binding: 'indexed',
  collection: 'options',
});
dual({
  surfaceId: 'scenario02/private-chat/choice',
  declaredIn: 'src/pages/scenario02/PrivateChat.jsx',
  leftBinding: 'left: () => choose(0),',
  rightBinding: 'right: () => choose(1),',
  drawnIn: 'src/apps/line/components/Line.jsx',
  css: 'src/apps/line/styles/line.css',
  selectors: ['.line-quick-pills'],
  axis: 'row',
  binding: 'indexed',
  collection: 'options',
});
dual({
  surfaceId: 'scenario02/private-chat/video-recovery',
  declaredIn: 'src/pages/scenario02/PrivateChat.jsx',
  leftBinding: 'left: () => videoRecovery.current?.retry(),',
  rightBinding: 'right: () => videoRecovery.current?.skip(),',
  drawnIn: 'src/pages/scenario02/PrivateChat.jsx',
  css: 'src/pages/scenario02/PrivateChat.css',
  selectors: ['.line-video-error-actions'],
  axis: 'row',
  binding: 'pair',
  leftToken: 'onClick={retryVideo}',
  rightToken: 'onClick={finishVideo}',
  // The stalled and the failed panel draw the same pair, so both tokens occur
  // twice; the checker pairs them off in order rather than looking only at
  // the first, so a swap in either panel is caught.
});
dual({
  surfaceId: 'scenario02/deposit-warning',
  declaredIn: 'src/pages/scenario02/components/RedWarning.jsx',
  leftBinding: 'left: () => setStopped(true),',
  rightBinding: 'right: onContinue,',
  drawnIn: 'src/pages/scenario02/components/RedWarning.jsx',
  css: 'src/styles/scenario02.css',
  selectors: ['.bition-warning-actions'],
  axis: 'stack',
  binding: 'pair',
  leftToken: 'onClick={() => setStopped(true)}',
  rightToken: 'onClick={onContinue}',
  reason: 'DepositWarning keeps 撥打反詐專線 165 between 停止 and 繼續 (AD-24: it is off the '
    + 'main line), so the actions column is three buttons deep and a 1fr 1fr grid would drop the '
    + 'third into a lopsided second row. The 165 button opens an educational overlay and is not a '
    + 'story action, so the geometry stays dual; stop is still drawn above continue, so LEFT is '
    + 'still the first thing the player reads. The main-line stop-point (TopupWarning) turns the '
    + '165 button off and IS a real two-across row - see scenario02/topup-warning.',
});
dual({
  surfaceId: 'scenario02/topup-warning',
  declaredIn: 'src/pages/scenario02/components/RedWarning.jsx',
  leftBinding: 'left: () => setStopped(true),',
  rightBinding: 'right: onContinue,',
  drawnIn: 'src/pages/scenario02/components/RedWarning.jsx',
  css: 'src/styles/scenario02.css',
  selectors: ['.bition-warning-actions', '.bition-warning-actions.is-dual'],
  axis: 'row',
  binding: 'pair',
  leftToken: 'onClick={() => setStopped(true)}',
  rightToken: 'onClick={onContinue}',
});

// ----------------------------------------------------------- scenario 03
for (const [surfaceId, declaredIn] of [
  ['scenario03/call-stage1/<momentKey>', 'src/pages/scenario03/CallStage1.jsx'],
  ['scenario03/line-intro/<momentKey>', 'src/pages/scenario03/LineIntro.jsx'],
  ['scenario03/prosecutor-call/<momentKey>', 'src/pages/scenario03/ProsecutorCall.jsx'],
]) {
  dual({
    surfaceId,
    declaredIn,
    leftBinding: 'left: () => player.choose(player.choice.options[0]),',
    rightBinding: 'right: () => player.choose(player.choice.options[1]),',
    drawnIn: 'src/pages/scenario03/components/ChoicePanel.jsx',
    css: 'src/styles/scenario03.css',
    selectors: ['.pol-choices', '.pol-choices-split'],
    axis: 'row',
    binding: 'indexed',
    collection: 'choice.options',
  });
}
dual({
  surfaceId: 'scenario03/final-decision',
  declaredIn: 'src/pages/scenario03/FinalDecision.jsx',
  leftBinding: 'left: confirmTransfer,',
  rightBinding: 'right: call165,',
  drawnIn: 'src/pages/scenario03/FinalDecision.jsx',
  css: 'src/styles/scenario03.css',
  selectors: ['.pol-choices', '.pol-choices-split'],
  axis: 'row',
  binding: 'pair',
  leftToken: 'onClick={confirmTransfer}',
  rightToken: 'onClick={call165}',
});

// ----------------------------------------------------------- scenario 04
dual({
  surfaceId: 'blackpi/home',
  declaredIn: 'src/apps/blackpi/screens/Home.jsx',
  leftBinding: 'left: () => openProduct(HERO_PRODUCTS[0]),',
  rightBinding: 'right: () => openProduct(HERO_PRODUCTS[1]),',
  drawnIn: 'src/apps/blackpi/screens/Home.jsx',
  css: 'src/apps/blackpi/styles/index.css',
  selectors: ['.bp-product-grid'],
  axis: 'row',
  binding: 'indexed',
  collection: 'HERO_PRODUCTS',
});
dual({
  surfaceId: 'blackpi/product-detail',
  declaredIn: 'src/apps/blackpi/screens/ProductDetail.jsx',
  leftBinding: 'left: () => onContactSeller?.(product),',
  rightBinding: 'right: () => onBuy?.(product),',
  drawnIn: 'src/apps/blackpi/screens/ProductDetail.jsx',
  css: 'src/apps/blackpi/styles/index.css',
  selectors: ['.bp-pdp-bottom-bar'],
  axis: 'row',
  binding: 'pair',
  leftToken: 'onClick={goChat}',
  rightToken: 'onClick={goCheckout}',
});
for (const [surfaceId, declaredIn] of [
  ['scenario04/seller-chat/<nodeId>', 'src/pages/scenario04/SellerChat.jsx'],
  ['scenario04/dispute-chat/<nodeId>', 'src/pages/scenario04/DisputeChat.jsx'],
  ['scenario04/refund-delay/<nodeId>', 'src/pages/scenario04/RefundDelayChat.jsx'],
  ['scenario04/platform-support/<nodeId>', 'src/pages/scenario04/PlatformSupportChat.jsx'],
]) {
  dual({
    surfaceId,
    declaredIn,
    leftBinding: 'left: () => engine.choose(engine.pendingChoices[0]),',
    rightBinding: 'right: () => engine.choose(engine.pendingChoices[1]),',
    drawnIn: 'src/apps/blackpi/components/DialogueChoiceGrid.jsx',
    css: 'src/apps/blackpi/styles/index.css',
    selectors: ['.bp-choice-grid'],
    axis: 'row',
    binding: 'indexed',
    collection: 'choices',
  });
}
dual({
  surfaceId: 'scenario04/messages',
  declaredIn: 'src/pages/scenario04/blackpi/hosts.jsx',
  leftBinding: 'left: onOpenSellerChat,',
  rightBinding: 'right: onOpenSupport,',
  drawnIn: 'src/apps/blackpi/screens/Messages.jsx',
  css: 'src/apps/blackpi/styles/index.css',
  selectors: ['.bp-page'],
  axis: 'stack',
  binding: 'pair',
  leftToken: 'onOpenSellerChat?.()',
  rightToken: 'onOpenSupport?.()',
  reason: '訊息 is an inbox: two conversation threads as full-width list rows, not a decision '
    + 'row. There is no left half and no right half to map onto, so the rule here is reading '
    + 'order - the seller thread is listed first and is LEFT, 黑皮客服 is listed second and is '
    + 'RIGHT. Turning an inbox into a two-across grid would be a redesign of the storefront, not '
    + 'a gesture fix.',
});
dual({
  surfaceId: 'scenario04/me',
  declaredIn: 'src/pages/scenario04/blackpi/hosts.jsx',
  leftBinding: 'left: onOpenRefundCenter,',
  rightBinding: 'right: onOpenSupport,',
  drawnIn: 'src/apps/blackpi/screens/Me.jsx',
  css: 'src/apps/blackpi/styles/index.css',
  selectors: ['.bp-card'],
  axis: 'stack',
  binding: 'pair',
  leftToken: 'onOpenRefundCenter?.()',
  rightToken: 'onOpenSupport?.()',
  reason: '我的 is a member menu of full-width list rows, same shape as the inbox above: no left '
    + 'half, no right half. 黑皮退款中心 is listed first and is LEFT, 黑皮安心客服 second and '
    + 'RIGHT. The sound toggle above them is a device setting and is not a story action, so it '
    + 'is not part of this geometry.',
});

// ----------------------------------------------------------- scenario 05
dual({
  surfaceId: 'mydondon/product-select',
  declaredIn: 'src/apps/mydondon/screens/ProductSelect.jsx',
  leftBinding: 'left: () => pick(products[0].id),',
  rightBinding: 'right: () => pick(products[1].id),',
  drawnIn: 'src/apps/mydondon/screens/ProductSelect.jsx',
  css: 'src/apps/mydondon/styles/index.css',
  selectors: ['.md-pick-list'],
  axis: 'row',
  binding: 'indexed',
  collection: 'products',
});
dual({
  surfaceId: 'scenario05/buyer-chat/<nodeId>',
  declaredIn: 'src/pages/scenario05/BuyerChat.jsx',
  leftBinding: 'left: () => engine.choose(engine.pendingChoices[0]),',
  rightBinding: 'right: () => engine.choose(engine.pendingChoices[1]),',
  drawnIn: 'src/apps/mydondon/components/ChoiceList.jsx',
  css: 'src/apps/mydondon/styles/index.css',
  selectors: [
    '.go-choice-list',
    '.go-choices-mydondon .go-choice-list:has(> .go-choice-btn:nth-child(2):last-child)',
  ],
  axis: 'row',
  binding: 'indexed',
  collection: 'choices',
  // The base list is a column - MyDonDon's replies are long sentences and
  // stack when there are three of them. Exactly two is the contract's own
  // geometry, and the :has() rule turns that case into two across.
});

export const AR_DUAL_VISUAL_ORDER = rows;

// ------------------------------------------------------------- CSS reading
//
// A tiny targeted reader rather than a parser: it pulls the declaration block
// for one exact selector out of one stylesheet. The stylesheets here are
// written one rule per line with no nesting and no @media around any of these
// containers, so an exact-selector match is unambiguous - and if a rule is
// ever moved into a wrapper this stops finding it and the audit fails loudly
// instead of quietly passing on a rule that no longer applies.
// `overrides` maps a repo-relative path to source text to use instead of the
// file on disk. It exists so the suite can prove these checks actually go red
// - a swapped pair, a stylesheet that stopped defining a container - without
// editing the real tree. Production callers pass nothing and read real files.
export function cssRuleFor(root, cssPath, selector, overrides = {}) {
  const source = overrides[cssPath] ?? readFileSync(join(root, cssPath), 'utf8');
  const blocks = [];
  // Walk brace-delimited rules and keep the ones whose selector list contains
  // this exact selector. Comments are stripped first so a selector mentioned
  // inside a note is never mistaken for a live rule.
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = rule.exec(clean)) !== null) {
    const selectors = match[1].split(',').map((part) => part.trim()).filter(Boolean);
    if (selectors.includes(selector)) blocks.push(match[2].trim());
  }
  return blocks;
}

// Flattens a selector's declarations into a property map, later rules winning,
// which is the cascade for equal-specificity rules in one file.
export function declarationsFor(root, row, overrides = {}) {
  const properties = new Map();
  for (const selector of row.selectors) {
    const blocks = cssRuleFor(root, row.css, selector, overrides);
    if (blocks.length === 0) return { properties, missing: selector };
    for (const block of blocks) {
      for (const declaration of block.split(';')) {
        const at = declaration.indexOf(':');
        if (at === -1) continue;
        properties.set(declaration.slice(0, at).trim(), declaration.slice(at + 1).trim());
      }
    }
  }
  return { properties, missing: null };
}

// Does this container really put its two children side by side?
//
// Two shapes count, and nothing else does: a grid with exactly two column
// tracks, or a flex row. A grid with one track, a flex column, or a flex row
// that is allowed to wrap are all ways for the pair to end up stacked, and a
// stacked pair has no left and no right for a gesture to mean.
export function horizontalityOf(properties) {
  const display = properties.get('display');
  const columns = properties.get('grid-template-columns');
  if (display === 'grid' || display === 'inline-grid') {
    if (!columns) return { horizontal: false, why: 'grid with no column tracks - children stack' };
    const tracks = splitTracks(columns);
    if (tracks.length !== 2) {
      return { horizontal: false, why: `grid with ${tracks.length} column track(s), expected 2` };
    }
    return { horizontal: true, why: `grid, 2 column tracks (${columns})` };
  }
  if (display === 'flex' || display === 'inline-flex') {
    const direction = properties.get('flex-direction') || 'row';
    if (direction.startsWith('column')) return { horizontal: false, why: `flex-direction: ${direction}` };
    const wrap = properties.get('flex-wrap');
    if (wrap && wrap.startsWith('wrap')) {
      return { horizontal: false, why: `flex-wrap: ${wrap} - the pair may reflow onto two rows` };
    }
    return { horizontal: true, why: `flex row (flex-wrap: ${wrap || 'nowrap'})` };
  }
  return { horizontal: false, why: `display: ${display ?? '(none declared)'} is not a row layout` };
}

// `minmax(0,1fr) minmax(0,1fr)` is two tracks, not four - split on top-level
// whitespace only, so a function's own arguments stay inside their track.
// `repeat(2,minmax(0,1fr))` is also two tracks, written the other way round;
// both spellings are in use here, so the count has to see through repeat()
// rather than reading it as a single track.
function splitTracks(value) {
  const tracks = [];
  let depth = 0;
  let current = '';
  for (const character of value) {
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (depth === 0 && /\s/.test(character)) {
      if (current) tracks.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  if (current) tracks.push(current);

  return tracks.flatMap((track) => {
    const repeat = /^repeat\(\s*(\d+)\s*,([\s\S]+)\)$/.exec(track);
    if (!repeat) return [track];
    const count = Number(repeat[1]);
    const inner = splitTracks(repeat[2].trim());
    return Array.from({ length: count * inner.length }, (_, index) => inner[index % inner.length]);
  });
}

// Anything that would draw the children in an order other than source order.
// `order` and the *-reverse directions are the whole list: they are the only
// CSS that renumbers flex/grid children, and each one of them silently turns
// LEFT into the right-hand button.
export function reversalIn(properties) {
  const direction = properties.get('flex-direction') || '';
  const flow = properties.get('grid-auto-flow') || '';
  const writing = properties.get('direction') || '';
  if (direction.includes('reverse')) return `flex-direction: ${direction}`;
  if (flow.includes('dense')) return `grid-auto-flow: ${flow}`;
  if (writing === 'rtl') return 'direction: rtl';
  if (properties.has('order')) return `order: ${properties.get('order')}`;
  return null;
}

// Every index at which `token` occurs in `source`.
export function occurrences(source, token) {
  const found = [];
  let at = source.indexOf(token);
  while (at !== -1) {
    found.push(at);
    at = source.indexOf(token, at + token.length);
  }
  return found;
}

export function readSource(root, file, overrides = {}) {
  return overrides[file] ?? readFileSync(join(root, file), 'utf8');
}

// The audit itself, as data: one verdict per surface, so both the test and
// the human-readable report run the identical checks.
export function auditVisualOrder(root, overrides = {}) {
  return AR_DUAL_VISUAL_ORDER.map((row) => {
    const problems = [];
    const { properties, missing } = declarationsFor(root, row, overrides);
    if (missing) {
      problems.push(`${row.css} has no rule for selector \`${missing}\``);
    } else {
      const { horizontal, why } = horizontalityOf(properties);
      if (row.axis === 'row' && !horizontal) {
        problems.push(`declared axis 'row' but the container is not two across: ${why}`);
      }
      if (row.axis === 'stack' && horizontal) {
        problems.push(`declared axis 'stack' but the container IS two across (${why}) - it should be a 'row'`);
      }
      const reversal = reversalIn(properties);
      if (reversal) problems.push(`the container reverses draw order (${reversal})`);
    }

    if (row.axis === 'stack' && !row.reason) {
      problems.push("axis 'stack' needs a written reason - a decision row must not become a stack unnoticed");
    }

    // BINDING: the contract's own two lines, exactly as written, and written
    // as a pair.
    //
    // Adjacency rather than "left occurs before right": one file often
    // declares several surfaces, and two of them can legitimately share a
    // binding line (hosts.jsx binds `right: onOpenSupport,` on both 訊息 and
    // 我的). Comparing first occurrences across the whole file would then
    // compare two different surfaces' lines. What identifies THIS surface's
    // pair is that its `left:` is immediately followed by its `right:` with
    // nothing but whitespace between - which is also exactly the shape a
    // swapped pair would break.
    const declared = readSource(root, row.declaredIn, overrides);
    const leftAt = occurrences(declared, row.leftBinding);
    const rightAt = occurrences(declared, row.rightBinding);
    if (leftAt.length === 0) problems.push(`${row.declaredIn} no longer contains \`${row.leftBinding}\``);
    if (rightAt.length === 0) problems.push(`${row.declaredIn} no longer contains \`${row.rightBinding}\``);
    if (leftAt.length > 0 && rightAt.length > 0) {
      const paired = leftAt.some((start) => {
        const after = start + row.leftBinding.length;
        return rightAt.some((next) => next >= after && declared.slice(after, next).trim() === '');
      });
      if (!paired) {
        problems.push(
          `\`${row.rightBinding}\` does not immediately follow \`${row.leftBinding}\` in ${row.declaredIn}`
          + ' - LEFT and RIGHT are no longer declared as one pair (check they were not swapped)',
        );
      }
    }

    // DRAW: source order inside the file that actually renders the pair.
    const drawn = readSource(root, row.drawnIn, overrides);
    if (row.binding === 'pair') {
      const lefts = occurrences(drawn, row.leftToken);
      const rights = occurrences(drawn, row.rightToken);
      if (lefts.length === 0) problems.push(`${row.drawnIn} does not draw \`${row.leftToken}\``);
      if (rights.length === 0) problems.push(`${row.drawnIn} does not draw \`${row.rightToken}\``);
      if (lefts.length !== rights.length) {
        problems.push(`${row.drawnIn} draws \`${row.leftToken}\` ${lefts.length}x but \`${row.rightToken}\` ${rights.length}x`);
      } else {
        // Pair them off: every LEFT control must be written before the RIGHT
        // one it belongs to. A screen that draws the pair twice (a stalled
        // panel and a failed one) is checked in both places, not just the first.
        for (let index = 0; index < lefts.length; index += 1) {
          if (lefts[index] > rights[index]) {
            problems.push(`occurrence ${index + 1}: \`${row.rightToken}\` is drawn before \`${row.leftToken}\` - LEFT would be the ${row.axis === 'stack' ? 'lower' : 'right-hand'} control`);
          }
        }
      }
    } else {
      // INDEXED: one array, rendered in its own order. LEFT must take [0].
      //
      // A row may reach the index through a named branch instead of carrying
      // it literally (LineTeacher maps 0 -> 'A'); `indexBridge` is the line
      // that performs that map, and it is then what has to hold.
      if (row.indexBridge) {
        if (!readSource(root, row.declaredIn, overrides).includes(row.indexBridge)) {
          problems.push(`${row.declaredIn} no longer contains the index bridge \`${row.indexBridge}\``);
        }
      } else {
        if (!row.leftBinding.includes('[0]') && !row.leftBinding.includes('(0)')) {
          problems.push(`LEFT is bound to \`${row.leftBinding}\`, which does not take index 0`);
        }
        if (!row.rightBinding.includes('[1]') && !row.rightBinding.includes('(1)')) {
          problems.push(`RIGHT is bound to \`${row.rightBinding}\`, which does not take index 1`);
        }
      }
      if (!drawn.includes(`${row.collection}.map(`)) {
        problems.push(`${row.drawnIn} does not render \`${row.collection}.map(\` - the drawn order can no longer be tied to the index the contract uses`);
      }
      if (/\.reverse\(\)|\.toReversed\(\)/.test(drawn)) {
        problems.push(`${row.drawnIn} reverses a collection before rendering - index 0 may not be drawn first`);
      }
    }

    return { ...row, problems, ok: problems.length === 0 };
  });
}
