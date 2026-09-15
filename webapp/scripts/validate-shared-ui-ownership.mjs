import { readFile, readdir, access } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { parseSync } from 'rolldown/experimental';

const src = new URL('../src/', import.meta.url).pathname;
async function collect(dir) {
  const output = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) output.push(...await collect(path));
    else if (/\.(?:[jt]sx?|css)$/.test(entry.name)) output.push(path);
  }
  return output;
}
const files = await collect(src);
const sourceByPath = new Map(await Promise.all(files.map(async (file) => [relative(src, file).replaceAll('\\', '/'), await readFile(file, 'utf8')])));
const violations = [];
for (const [path, source] of sourceByPath) {
  const imports = [...source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)].map((match) => match[1]);
  if (path.startsWith('apps/line/') && imports.some((value) => /pages\/scenario\d+/.test(value))) violations.push(`${path}: LINE app imports a scenario`);
  const owner = path.match(/^pages\/(scenario\d+)/)?.[1];
  if (owner) for (const value of imports) {
    const importedOwner = value.match(/scenario\d+/)?.[0];
    if (importedOwner && importedOwner !== owner) violations.push(`${path}: cross-scenario import ${value}`);
  }
}
const shellConsumers = [
  'pages/scenario01/LineTeacher.jsx', 'pages/scenario01/VipGroup.jsx',
  'pages/scenario02/PrivateChat.jsx', 'pages/scenario03/components/ScriptedLineConversation.jsx',
];
for (const path of shellConsumers) {
  const source = sourceByPath.get(path) ?? '';
  if (!source.includes('LineConversation')) violations.push(`${path}: does not delegate its shell to LineConversation`);
  if (/className="(?:line-app|line-header|line-chat-scroll|line-chat-footer|pol-line-footer)"/.test(source)) violations.push(`${path}: owns duplicate LINE shell markup`);
}
for (const path of ['pages/scenario03/LineIntro.jsx']) {
  if (!sourceByPath.get(path)?.includes('ScriptedLineConversation')) violations.push(`${path}: does not use the shared LINE conversation adapter`);
}
if (sourceByPath.get('pages/scenario03/components/ScriptedLineConversation.jsx')?.includes('actions={false}')) violations.push('Scenario03 disables standard LINE header actions');
if (!sourceByPath.get('pages/scenario03/components/ScriptedLineConversation.jsx')?.includes('pol-line-card-slot')) violations.push('Scenario03 story card slot was not retained');
if (!sourceByPath.get('styles/scenario03.css')?.includes('.pol-line-card-slot')) violations.push('Scenario03 story card styling was not retained');
const scenario03Css = (sourceByPath.get('styles/scenario03.css') ?? '').replace(/\/\*[\s\S]*?\*\//g, '');
if (/\.(?:pol-)?line-(?:header|chat-scroll|msg|typing|footer)\b/.test(scenario03Css)) violations.push('Scenario03 CSS still owns LINE chrome');
try { await access(new URL('../src/pages/scenario03/components/LineChat.jsx', import.meta.url)); violations.push('duplicate Scenario03 components/LineChat.jsx still exists'); } catch { /* expected */ }

// LINE-context quick-reply choices must delegate to the shared
// LineQuickReplies component, not scenario03's own phone-call ChoicePanel -
// that markup (.pol-choices/.pol-choice-btn) is reserved for the non-LINE
// phone-call subtitle scenes (DialogueLayer.jsx).
const scriptedLineConversation = sourceByPath.get('pages/scenario03/components/ScriptedLineConversation.jsx') ?? '';
if (!scriptedLineConversation.includes('LineQuickReplies')) violations.push('ScriptedLineConversation.jsx does not use the shared LineQuickReplies component for LINE choices');
if (/\bpol-choices\b|\bpol-choice-btn\b/.test(scriptedLineConversation)) violations.push('ScriptedLineConversation.jsx still renders scenario03\'s own ChoicePanel markup for LINE choices');

// ChoicePanel is the legitimate non-LINE (phone-call) choice UI - it must
// keep existing and keep being used by DialogueLayer.jsx, so a future
// change doesn't accidentally delete it while chasing the LINE fix above.
try { await access(new URL('../src/pages/scenario03/components/ChoicePanel.jsx', import.meta.url)); } catch { violations.push('scenario03 ChoicePanel.jsx (the non-LINE phone-call choice UI) was deleted'); }
const dialogueLayer = sourceByPath.get('pages/scenario03/components/DialogueLayer.jsx') ?? '';
if (!dialogueLayer.includes('ChoicePanel')) violations.push('DialogueLayer.jsx (phone-call scenes) no longer uses ChoicePanel');

// FraudWarningBanner's above-footer placement: if a call site references
// it, the CSS class backing it must actually exist.
const fraudWarningCss = sourceByPath.get('components/warnings/FraudWarningBanner.css') ?? '';
for (const [path, source] of sourceByPath) {
  const placementMatches = [...source.matchAll(/placement="([\w-]+)"/g)];
  for (const [, placement] of placementMatches) {
    if (placement === 'app-header') continue; // pre-existing, always valid
    if (!fraudWarningCss.includes(`.fraud-warning-placement-${placement}`)) {
      violations.push(`${path}: FraudWarningBanner placement="${placement}" has no matching .fraud-warning-placement-${placement} rule in FraudWarningBanner.css`);
    }
  }
}

// PoliceFrame must delegate device-chrome (viewport/status-bar/home-
// indicator) to PhoneShell rather than owning a second phone simulation -
// and scenario03.css must not still define the old
// .pol-phone/.pol-statusbar/.pol-home-indicator rules that PhoneShell now
// owns.
//
// The home indicator stays suppressed outright. The status bar is off by
// DEFAULT and delegated: scenario03's lock screen (PhoneHome.jsx) is the one
// screen that wants a signal/battery row, and the point of this rule is that
// when it does, it turns the SHELL's status bar on rather than drawing a
// second one of its own - which is what the .pol-statusbar check below still
// forbids. A hard-coded `systemChrome={false}` would have forced exactly the
// duplicate this file exists to prevent.
const policeFrame = sourceByPath.get('pages/scenario03/components/PoliceFrame.jsx') ?? '';
if (!policeFrame.includes('PhoneShell')) violations.push('PoliceFrame.jsx no longer delegates device chrome to PhoneShell');
if (!/systemChrome\s*=\s*false/.test(policeFrame)) violations.push('PoliceFrame.jsx does not default the shell\'s system chrome off');
if (!/systemChrome=\{systemChrome\}/.test(policeFrame)) violations.push('PoliceFrame.jsx does not delegate the shell\'s system chrome to PhoneShell');
if (!/homeIndicator=\{false\}/.test(policeFrame)) violations.push('PoliceFrame.jsx does not suppress the shell\'s home indicator');
if (/\bpol-tools-|\boverlay=/.test(policeFrame)) violations.push('PoliceFrame.jsx still renders outer scenario tools');
// Negative-lookahead word boundaries so this doesn't false-positive on
// unrelated hyphenated classes like .pol-phone-165 (the "165" digit-
// highlight style in PhoneNumberDisplay.jsx, nothing to do with device
// chrome) - a plain \b matches between "e" and "-" too.
if (/\.pol-phone(?![\w-])|\.pol-phone-dark(?![\w-])|\.pol-phone-body(?![\w-])|\.pol-statusbar(?![\w-])|\.pol-home-indicator(?![\w-])/.test(scenario03Css)) {
  violations.push('scenario03.css still defines its own duplicate phone-shell chrome (.pol-phone/.pol-statusbar/.pol-home-indicator)');
}

// =====================================================================
// Single-consumer components belong to their consumer (spec AD-07)
//
// `components/` is the shared layer: what sits there is meant to be
// implementation more than one owner actually renders. A component only one
// Scenario ever imports is not shared, it is that Scenario's - and left in
// the shared layer it reads as a cross-cutting primitive nobody may change
// freely, which is exactly backwards.
//
// Two halves, because a rule can only ever see one of them:
//
//   (1) A DERIVED rule over everything still in `components/`: resolve who
//       imports each module, and if every importer sits inside ONE
//       pages/scenarioNN/ tree, that module is single-consumer shared debt.
//       Nothing here is a list of component names, so a component added to
//       the shared layer tomorrow with one scenario consumer fails too.
//       Deliberately narrow: two importers in two scenarios is shared and
//       passes, an importer in shell/, lib/, apps/ or components/ itself is
//       a second owner and passes, and a module nothing imports is dead
//       code rather than an ownership question (AD-11's job, not this one).
//
//   (2) The two paths AD-07 named, asserted EMPTY and re-homed. A derived
//       rule cannot see a directory that no longer exists, so "PhoneShell
//       must not reappear under components/ui/" has to be written down.
// =====================================================================

// Resolve a relative import the way Vite does for this project
// (extensionless, `.js`/`.jsx`, folder index) against the collected tree.
function resolveImport(fromPath, specifier) {
  if (!specifier.startsWith('.')) return null;
  const segments = `${fromPath.split('/').slice(0, -1).join('/')}/${specifier}`.split('/');
  const stack = [];
  for (const segment of segments) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') stack.pop();
    else stack.push(segment);
  }
  const base = stack.join('/');
  for (const candidate of [base, `${base}.js`, `${base}.jsx`, `${base}/index.js`, `${base}/index.jsx`]) {
    if (sourceByPath.has(candidate)) return candidate;
  }
  return null;
}

const importersByPath = new Map();
for (const [path, source] of sourceByPath) {
  if (path.endsWith('.css')) continue;                       // CSS has no JS imports
  for (const [, specifier] of source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
    const target = resolveImport(path, specifier);
    if (!target || target === path) continue;
    if (!importersByPath.has(target)) importersByPath.set(target, new Set());
    importersByPath.get(target).add(path);
  }
}

// Shared-layer modules that still have exactly one Scenario consumer and have
// NOT been re-homed yet. This is the debt list, not an exemption policy: it
// may only ever shrink, and an entry has to say why it is still here.
//
// `components/ui/Card.jsx` renders `.hero`/`.card`, the two layout primitives
// styles/global.css keeps as shared foundation (see that file's header and
// spec AD-06). Only pages/scenario02/RiskAnalysis.jsx imports the component
// today, so it reads as AD-07 debt - but moving it would drag its two global
// primitives into one scenario, which is a different question from the two
// AD-07 named, and re-deciding AD-06's kept-rule list is not this rule's job.
const AD_07_KNOWN_DEBT = new Set(['components/ui/Card.jsx']);

const scenarioOwnerOf = (path) => path.match(/^pages\/(scenario\d+)\//)?.[1] ?? null;

for (const [path] of sourceByPath) {
  if (!path.startsWith('components/') || path.endsWith('.css')) continue;
  const importers = importersByPath.get(path);
  if (!importers?.size) continue;                            // dead code, not an ownership call
  const owners = new Set([...importers].map(scenarioOwnerOf));
  if (owners.size !== 1) continue;                           // several owners, or a shared-layer importer
  const [only] = owners;
  if (only === null) continue;                               // importer outside pages/scenarioNN: shared
  if (AD_07_KNOWN_DEBT.has(path)) continue;
  violations.push(`${path}: every importer is in ${only} (${[...importers].sort().join(', ')}) - a single-Scenario component belongs to that Scenario, not to the shared layer (AD-07)`);
}

// The two relocations AD-07 called for, stated as invariants: the vacated
// shared path stays vacated, the component lives with its owner, and nothing
// outside that owner imports it.
const AD_07_RESOLVED = [
  {
    what: 'PhoneShell',
    vacated: ['components/ui/PhoneShell.jsx', 'components/ui/PhoneShell.css'],
    home: ['pages/scenario03/components/PhoneShell.jsx', 'pages/scenario03/components/PhoneShell.css'],
    owner: 'pages/scenario03/',
  },
  {
    what: 'the Ghost Order site/browser chrome',
    vacated: [
      'components/ghostorder/BrowserChrome.jsx',
      'components/ghostorder/CibarResultBar.jsx',
      'components/ghostorder/SuqubianSiteHeader.jsx',
    ],
    // CibarResultBar was the third of these. It was Scenario 05's own
    // post-simulation strip on top of its ending/reveal screens; those
    // screens now render through the shared Outcome System, which owns its
    // whole shell, so the component has no consumer left and was deleted.
    // The `vacated` half above still applies to it - a shared-layer copy
    // must not come back.
    home: [
      'pages/scenario05/components/BrowserChrome.jsx',
      'pages/scenario05/components/SuqubianSiteHeader.jsx',
    ],
    owner: 'pages/scenario05/',
  },
];
for (const { what, vacated, home, owner } of AD_07_RESOLVED) {
  for (const path of vacated) {
    if (sourceByPath.has(path)) violations.push(`${path}: ${what} is back in the shared layer - it has one Scenario consumer and belongs in ${owner} (AD-07)`);
  }
  for (const path of home) {
    if (!sourceByPath.has(path)) { violations.push(`${path}: ${what} is missing from its owner`); continue; }
    if (path.endsWith('.css')) continue;
    for (const importer of importersByPath.get(path) ?? []) {
      if (!importer.startsWith(owner)) violations.push(`${importer}: imports ${path}, which ${owner} owns - promote it back to components/ only if a second owner really needs it (AD-07)`);
    }
  }
}
// A component that moved has to take its own stylesheet with it, and keep
// importing it itself - the AD-06 shape, one directory down.
if (!(sourceByPath.get('pages/scenario03/components/PhoneShell.jsx') ?? '').includes("import './PhoneShell.css'")) {
  violations.push('pages/scenario03/components/PhoneShell.jsx does not import its own stylesheet');
}
// No stale specifier anywhere: read real import specifiers rather than raw
// file text, so a comment that explains where these used to live is prose,
// not a violation.
for (const [path, source] of sourceByPath) {
  if (path.endsWith('.css')) continue;
  const specifiers = [...source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)].map((match) => match[1]);
  for (const specifier of specifiers) {
    if (/components\/ghostorder\//.test(specifier) || /components\/ui\/PhoneShell/.test(specifier)) {
      violations.push(`${path}: imports "${specifier}", a shared path AD-07 vacated`);
    }
  }
}

// --- App-module style ownership --------------------------------------------
//
// The module that renders a screen owns the CSS that dresses it. An App on
// this list has finished that migration, so two things must stay true of it:
// its stylesheet is imported by the module itself (not by a page, a scenario
// or main.jsx), and no stylesheet outside the module defines a rule that only
// this module's markup can ever match.
//
// The second half is what actually stops a regression, and it is deliberately
// not a list of selector names: ownership is derived from who *uses* a class.
// Every className in the tree is read, and a class defined outside the module
// whose every consumer sits inside it is reported, whatever it is called. So
// a new Coin Winner rule dropped into global.css fails the build even though
// nobody wrote `bition-` into this file - and a genuinely shared class (two
// or more modules use it) is never touched, which is why .mini, .warning,
// .hero, .card and @keyframes chartSweep legitimately stay global.
//
// The list may only ever grow: an App that owns its styling cannot stop.
const STYLE_OWNING_APPS = ['apps/coin-winner/'];

// --- shared extraction helpers ---------------------------------------------
//
// Both ownership sections below ask the same two questions - "what does this
// stylesheet declare?" and "what does this source file put on an element?" -
// so both are answered once, here, by a real scanner and a real parser rather
// than by a regex that has to guess at syntax.

// Every style rule in a stylesheet, with the at-rules it is nested inside.
//
// Brace-aware and nesting-aware: a rule inside @media / @supports / @container
// (or inside several of them) is found exactly like a top-level one, at any
// depth. A regex anchored on "a selector follows `}` or `;` or the start of
// the file" silently drops the first rule after an at-rule's `{`, which is
// precisely how a scenario could have hidden `@media (...) { .line-header {} }`
// from this check.
//
// @keyframes bodies are skipped whole: `0%`, `from` and `to` are not
// selectors. Strings are skipped so a `content: "}"` cannot end a block early,
// and declarations never reach the output because `;` and `}` reset the
// pending prelude.
function cssRules(source) {
  const css = stripCssComments(source);
  const rules = [];
  let index = 0;

  const skipBlock = () => {
    let depth = 1;
    while (index < css.length && depth > 0) {
      const char = css[index];
      if (char === '"' || char === "'") { skipString(char); continue; }
      if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
      index += 1;
    }
  };
  const skipString = (quote) => {
    index += 1;
    while (index < css.length && css[index] !== quote) index += css[index] === '\\' ? 2 : 1;
    index += 1;
  };

  const block = (atPath) => {
    let prelude = '';
    while (index < css.length) {
      const char = css[index];
      if (char === '"' || char === "'") { const start = index; skipString(char); prelude += css.slice(start, index); continue; }
      if (char === '}') { index += 1; return; }
      if (char === ';') { prelude = ''; index += 1; continue; }
      if (char === '{') {
        index += 1;
        const text = prelude.replace(/\s+/g, ' ').trim();
        prelude = '';
        if (/^@(?:-[\w]+-)?keyframes\b/i.test(text)) { skipBlock(); continue; }
        if (text.startsWith('@')) { block([...atPath, text]); continue; }
        rules.push({ selector: text, atPath });
        block(atPath);          // CSS nesting: a rule inside a rule is a rule
        continue;
      }
      prelude += char;
      index += 1;
    }
  };

  block([]);
  return rules;
}

// CSS comments only - a `/*` inside a string is not one.
function stripCssComments(source) {
  let out = '';
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (char === '"' || char === "'") {
      const start = index;
      index += 1;
      while (index < source.length && source[index] !== char) index += source[index] === '\\' ? 2 : 1;
      index += 1;
      out += source.slice(start, index);
      continue;
    }
    if (source.startsWith('/*', index)) {
      const close = source.indexOf('*/', index + 2);
      const end = close === -1 ? source.length : close + 2;
      for (const c of source.slice(index, end)) out += c === '\n' ? '\n' : ' ';
      index = end;
      continue;
    }
    out += char;
    index += 1;
  }
  return out;
}

// One selector per comma-separated part, so `.a, .b` reports as two.
function cssSelectors(source) {
  return cssRules(source).flatMap(({ selector, atPath }) => selector
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => ({ selector: part, atPath })));
}

const classesIn = (selector) => [...selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((match) => match[1]);

// How a rule reads in a violation message, at-rule context included, so
// `@media (...) { .line-header {} }` does not report as a bare `.line-header`.
const describeRule = ({ selector, atPath }) => (atPath.length ? `${atPath.join(' { ')} { ${selector}` : selector);

// Class -> the rule it was first declared in, for every rule in one stylesheet.
function cssClasses(source) {
  const declared = new Map();
  for (const rule of cssSelectors(source)) {
    for (const name of classesIn(rule.selector)) if (!declared.has(name)) declared.set(name, rule);
  }
  return declared;
}

// Every class name a file can put on an element, read off the real JS/JSX AST
// (oxc, via rolldown - the same parser scripts/jsx-test-loader.mjs already
// uses to run this tree's JSX under Node).
//
// A regex cannot do this job. `className={`line-app ${full ? 'line-app-full' : ''}`}`
// needs the template's static chunks, the interpolation's branches, and the
// knowledge that the two are concatenated - which is why the previous scan
// missed .line-app-full, .line-quick-replies-picked and .line-quick-pill-active
// even though the LINE component renders all three.
//
// Each expression is reduced to the set of strings it can evaluate to. A part
// that still cannot be read statically becomes UNKNOWN, a character that is
// neither whitespace nor a word character: it cannot start or continue a class
// name, so a token glued to it - the `line-` of `` `line-${kind}` `` - is
// correctly dropped, while a token separated from it by a space - the
// `line-app` of `` `line-app ${x}` `` - is correctly kept.
//
// Two things that look unreadable are read anyway, because the global-CSS
// ownership audit found both hiding live classes behind an UNKNOWN:
//
//   `` `scenario-entry-hero ${className}`.trim() `` - a method call whose
//   receiver is the real class expression. Without this the whole template
//   collapsed to UNKNOWN and `.scenario-entry-hero` looked dead, as did
//   `.warning`'s second consumer in GuGo Invest, `.bp-media`, `.hpe-logo`,
//   `.md-logo`, `.go-app`, `.go-ph` and `.pol-ongoing-call`.
//
//   `let cls = 'btn secondary quiz-option'; cls += ' correct';` with
//   `className={cls}` - the classes never appear in a className position at
//   all. Without this `.quiz-option`, `.correct` and `.wrong` looked dead, and
//   so did `.card` (Card.jsx's `variant = 'card'` destructuring default).
//
// Method calls are read one at a time rather than waved through as a group.
// `map` in particular is a transformation, not a passthrough: reading
// `tones.map(t => `cibar-outcome-${t}`)` as its own elements would miss every
// class the callback builds AND attribute `success`/`failure` to the file as
// classes nothing renders - a wrong owner and a false dead-CSS verdict at
// once. `join` only passes through for a whitespace separator, and `concat`
// distinguishes string concatenation from array concatenation, for the same
// reason: a fabricated class name is worse than no class name.
//
// Identifier values are collected per file and merged across scopes, which can
// only ever widen a class's consumer set - the safe direction, since a wider
// set makes a rule look more shared, never more owned.
const UNKNOWN = '\u0000';
const MAX_CLASS_VALUES = 64;      // a guard against a combinatorial template

// Per-file `identifier -> the strings it can hold`, filled in by classSurface()
// before it walks the file. `resolving` breaks self-referential bindings
// (`cls = cls + 'x'`) instead of recursing forever.
let classBindings = null;
const resolving = new Set();

// Per-file set of identifiers known to hold an array. `join` and `concat` mean
// different things for arrays and strings, so the difference has to be tracked
// rather than assumed.
let arrayBindings = null;

// Methods that hand back another array, so array-ness survives a chain.
const ARRAY_RETURNING = new Set(['map', 'filter', 'flat', 'slice', 'concat', 'reverse', 'sort']);

function isArrayValued(node) {
  if (!node || typeof node !== 'object') return false;
  switch (node.type) {
    case 'ArrayExpression': return true;
    case 'Identifier': return Boolean(arrayBindings?.has(node.name));
    case 'ParenthesizedExpression':
    case 'TSAsExpression':
    case 'TSNonNullExpression': return isArrayValued(node.expression);
    case 'CallExpression': {
      const callee = node.callee;
      if (callee?.type !== 'MemberExpression' || callee.computed) return false;
      return ARRAY_RETURNING.has(callee.property?.name) && isArrayValued(callee.object);
    }
    default: return false;
  }
}

// The single `return expr;` of a block body. A block that branches or does
// anything else is not read statically.
function singleReturnedExpression(block) {
  const statements = block?.body ?? [];
  if (statements.length !== 1) return null;
  const [only] = statements;
  return only.type === 'ReturnStatement' ? (only.argument ?? null) : null;
}

// `array.map(element => ...)`, evaluated for real: bind the callback's
// parameter to the values the array can hold, then read the expression it
// returns with that binding in place.
//
// Only a callback with exactly one plain identifier parameter is modelled.
// Anything else - a destructured parameter, a default, or the `(value, index)`
// form whose second parameter could otherwise collide with a file-level
// binding of the same name - returns UNKNOWN. A pure-UNKNOWN value contributes
// no class and no pattern, so an unreadable callback simply adds nothing
// instead of adding something wrong.
function mappedValues(node, callee) {
  const [callback] = node.arguments;
  if (callback?.type !== 'ArrowFunctionExpression' && callback?.type !== 'FunctionExpression') return [UNKNOWN];
  const parameters = callback.params ?? [];
  if (parameters.length !== 1 || parameters[0].type !== 'Identifier') return [UNKNOWN];
  const returned = callback.body?.type === 'BlockStatement'
    ? singleReturnedExpression(callback.body)
    : callback.body;
  if (!returned) return [UNKNOWN];
  if (!classBindings) return [UNKNOWN];

  const { name } = parameters[0];
  const elements = classValues(callee.object);
  const had = classBindings.has(name);
  const previous = classBindings.get(name);
  classBindings.set(name, new Set(elements));
  try {
    return classValues(returned);
  } finally {
    if (had) classBindings.set(name, previous);
    else classBindings.delete(name);
  }
}

function crossValues(left, right) {
  if (left.length * right.length > MAX_CLASS_VALUES) return [UNKNOWN];
  const out = new Set();
  for (const a of left) for (const b of right) out.add(a + b);
  return [...out];
}

function classValues(node) {
  if (!node || typeof node !== 'object') return [UNKNOWN];
  switch (node.type) {
    case 'Literal':
      if (typeof node.value === 'string') return [node.value];
      return node.value == null || typeof node.value === 'boolean' ? [''] : [UNKNOWN];
    case 'JSXExpressionContainer': return classValues(node.expression);
    case 'JSXEmptyExpression': return [''];
    case 'ParenthesizedExpression':
    case 'TSAsExpression':
    case 'TSNonNullExpression': return classValues(node.expression);
    case 'ConditionalExpression': return [...classValues(node.consequent), ...classValues(node.alternate)];
    // `a && 'x'` contributes '' or 'x'; `a || 'x'` / `a ?? 'x'` can be either side.
    case 'LogicalExpression': return node.operator === '&&'
      ? ['', ...classValues(node.right)]
      : [...classValues(node.left), ...classValues(node.right)];
    // A method call on a class expression: `` `a ${b}`.trim() ``, and the array
    // helpers a className list is usually assembled with.
    //
    // Each method is only treated as transparent where that is actually what it
    // means. Getting this wrong does not just lose a class - it invents one, and
    // a fabricated class name is attributed to a real file, which is how a rule
    // gets the wrong owner or a live rule gets reported as dead.
    case 'CallExpression': {
      const callee = node.callee;
      if (callee?.type !== 'MemberExpression' || callee.computed) return [UNKNOWN];
      const method = callee.property?.name;
      const receiverIsArray = isArrayValued(callee.object);

      // String passthroughs. On an array these mean something else entirely
      // (`toString` joins with a comma), so they are transparent only for
      // things that are not arrays.
      if (method === 'trim' || method === 'toString' || method === 'valueOf') {
        return receiverIsArray ? [UNKNOWN] : classValues(callee.object);
      }

      // Array -> array, holding a subset of the same elements. Returning the
      // whole element set over-approximates, which is the safe direction: every
      // value in it is a value the array really can hold.
      if (method === 'filter' || method === 'flat' || method === 'slice') return classValues(callee.object);

      // `map` is NOT transparent. `tones.map(t => `cibar-outcome-${t}`)` holds
      // `cibar-outcome-success`, not `success` - reading it as its own elements
      // both misses every class the callback builds and claims classes
      // (`success`) that nothing ever renders.
      if (method === 'map') return mappedValues(node, callee);

      // Joining is equivalent to "the element set" only when the separator is
      // whitespace, because whitespace is exactly what a className is split on.
      // `join()` defaults to a comma and `join('-')` glues two classes into one
      // name nothing renders, so neither may pass through.
      if (method === 'join') {
        if (!node.arguments.length) return [UNKNOWN];
        const separators = classValues(node.arguments[0]);
        const splitsOnThis = separators.every((separator) => !separator.includes(UNKNOWN) && separator.length > 0 && !/\S/.test(separator));
        return splitsOnThis ? classValues(callee.object) : [UNKNOWN];
      }

      // String concat multiplies ('a'.concat('b') === 'ab'); array concat
      // unions (['a'].concat(['b']) === ['a','b']). Tell them apart instead of
      // guessing, because the wrong one fabricates a name.
      if (method === 'concat') {
        if (receiverIsArray || node.arguments.some((argument) => isArrayValued(argument))) {
          return [...classValues(callee.object), ...node.arguments.flatMap((argument) => classValues(argument))];
        }
        return node.arguments.reduce((acc, argument) => crossValues(acc, classValues(argument)), classValues(callee.object));
      }
      return [UNKNOWN];
    }
    case 'Identifier': {
      if (!classBindings || resolving.has(node.name)) return [UNKNOWN];
      const known = classBindings.get(node.name);
      if (!known?.size) return [UNKNOWN];
      resolving.add(node.name);
      try { return [...known]; } finally { resolving.delete(node.name); }
    }
    case 'SequenceExpression': return classValues(node.expressions.at(-1));
    case 'AssignmentExpression': return classValues(node.right);
    case 'ArrayExpression': return node.elements.flatMap((element) => (element ? classValues(element) : ['']));
    case 'BinaryExpression': return node.operator === '+'
      ? crossValues(classValues(node.left), classValues(node.right)) : [UNKNOWN];
    case 'TemplateLiteral': {
      let out = [''];
      node.quasis.forEach((quasi, index) => {
        out = crossValues(out, [quasi.value.cooked ?? quasi.value.raw]);
        if (index < node.expressions.length) out = crossValues(out, classValues(node.expressions[index]));
      });
      return out;
    }
    default: return [UNKNOWN];
  }
}

function walkAst(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const child of node) walkAst(child, visit); return; }
  if (typeof node.type === 'string') visit(node);
  for (const key of Object.keys(node)) { if (key !== 'type') walkAst(node[key], visit); }
}

const CLASS_TOKEN = /^[A-Za-z_][\w-]*$/;

function usedClasses(path, source) {
  return classSurface(path, source).exact;
}

// The full class surface of one file: the class names it can definitely put on
// an element, plus the *patterns* it can build one from at runtime.
//
// A pattern is a token that still contains an UNKNOWN after the reduction
// above - `cibar-outcome-\u0000` for ScenarioOutcome.jsx's `` `cibar-outcome-${tone}` ``.
// The class it produces exists only while the app runs, so searching the tree
// for `cibar-outcome-success` finds nothing; without patterns, every such rule
// reads as dead CSS.
function classSurface(path, source) {
  const exact = new Set();
  const patterns = new Set();
  const { program, errors } = parseSync(path, source);
  // A file this parser cannot read would silently contribute no classes, and
  // "no consumer" is what makes a rule look dead to the checks below - so it
  // is reported rather than skipped.
  if (errors?.length) {
    violations.push(`${path}: could not be parsed for className extraction (${errors.length} error(s))`);
    return { exact, patterns };
  }

  // Pass 1: what can each identifier in this file hold? Written before the
  // walk below so `className={cls}` can be resolved when it is reached.
  const bindings = new Map();
  const arrays = new Set();
  const previousBindings = classBindings;
  const previousArrays = arrayBindings;
  classBindings = bindings;
  arrayBindings = arrays;
  const remember = (name, values) => {
    if (!bindings.has(name)) bindings.set(name, new Set());
    for (const value of values) bindings.get(name).add(value);
  };
  walkAst(program, (node) => {
    if (node.type === 'VariableDeclarator' && node.id?.type === 'Identifier' && node.init) {
      if (isArrayValued(node.init)) arrays.add(node.id.name);
      remember(node.id.name, classValues(node.init));
    } else if (node.type === 'AssignmentExpression' && node.left?.type === 'Identifier') {
      if (node.operator === '=' && isArrayValued(node.right)) arrays.add(node.left.name);
      const values = classValues(node.right);
      if (node.operator === '=') remember(node.left.name, values);
      else if (node.operator === '+=') remember(node.left.name, crossValues([...(bindings.get(node.left.name) ?? [''])], values));
    } else if (node.type === 'AssignmentPattern' && node.left?.type === 'Identifier') {
      // A destructured prop default: `{ variant = 'card' }`.
      remember(node.left.name, classValues(node.right));
    }
  });

  const add = (node) => {
    for (const value of classValues(node)) {
      for (const token of value.split(/\s+/)) {
        if (!token) continue;
        if (token.includes(UNKNOWN)) {
          if (/[\w-]/.test(token.replaceAll(UNKNOWN, ''))) patterns.add(token);
        } else if (CLASS_TOKEN.test(token)) exact.add(token);
      }
    }
  };
  walkAst(program, (node) => {
    if (node.type === 'JSXAttribute' && node.name?.name === 'className') add(node.value);
    // `React.createElement(x, { className })` and prop objects passed around.
    if ((node.type === 'Property' || node.type === 'ObjectProperty') && !node.computed
      && (node.key?.name === 'className' || node.key?.value === 'className')) add(node.value);
    // useStageClassName() is the stage's own className setter.
    if (node.type === 'CallExpression' && node.callee?.name === 'useStageClassName') {
      for (const argument of node.arguments) add(argument);
    }
  });
  classBindings = previousBindings;
  arrayBindings = previousArrays;
  return { exact, patterns };
}

// Does a runtime-built class name match one of those patterns? The UNKNOWN
// stands for "some class-name characters", so `cibar-outcome-\u0000` matches
// `cibar-outcome-success` but not `cibar-outcome` or `link-card`.
function patternMatches(pattern, name) {
  const source = pattern
    .split(UNKNOWN)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[\\w-]*');
  return new RegExp(`^${source}$`).test(name);
}

// A stylesheet import, as a path relative to src/ - so `./styles/index.css`
// from two different App modules are told apart rather than matched on their
// (identical) file name.
function cssImports(path, source) {
  const dir = path.slice(0, path.lastIndexOf('/') + 1);
  const out = [];
  for (const [, specifier] of source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+\.css)['"]/g)) {
    if (!specifier.startsWith('.')) continue;
    const segments = [];
    for (const segment of (dir + specifier).split('/')) {
      if (segment === '.' || segment === '') continue;
      if (segment === '..') segments.pop();
      else segments.push(segment);
    }
    out.push(segments.join('/'));
  }
  return out;
}

const consumersByClass = new Map();
const patternProducers = new Map();      // runtime-built class pattern -> the files that build it
for (const [path, source] of sourceByPath) {
  if (path.endsWith('.css')) continue;
  const { exact, patterns } = classSurface(path, source);
  for (const name of exact) {
    if (!consumersByClass.has(name)) consumersByClass.set(name, new Set());
    consumersByClass.get(name).add(path);
  }
  for (const pattern of patterns) {
    if (!patternProducers.has(pattern)) patternProducers.set(pattern, new Set());
    patternProducers.get(pattern).add(path);
  }
}

// Every file that can put this class on an element - the ones that name it
// outright, plus the ones that build it at runtime out of a prefix and a prop.
function consumerFiles(name) {
  const files = new Set(consumersByClass.get(name) ?? []);
  for (const [pattern, producers] of patternProducers) {
    if (patternMatches(pattern, name)) for (const producer of producers) files.add(producer);
  }
  return files;
}

for (const app of STYLE_OWNING_APPS) {
  const stylesheets = [...sourceByPath.keys()].filter((path) => path.startsWith(app) && path.endsWith('.css'));
  if (!stylesheets.length) violations.push(`${app}: owns its styling but has no stylesheet of its own`);
  for (const sheet of stylesheets) {
    const importers = [...sourceByPath]
      .filter(([path, source]) => !path.endsWith('.css') && cssImports(path, source).includes(sheet))
      .map(([path]) => path);
    for (const importer of importers.filter((path) => !path.startsWith(app))) {
      violations.push(`${importer}: imports ${sheet}; the App module owns that import`);
    }
    if (!importers.some((path) => path.startsWith(app))) violations.push(`${sheet}: is not imported by its own App module`);
  }
  for (const [path, source] of sourceByPath) {
    if (!path.endsWith('.css') || path.startsWith(app)) continue;
    for (const [name, rule] of cssClasses(source)) {
      const consumers = consumersByClass.get(name);
      if (!consumers?.size) continue;                                  // dead rule: nothing to attribute it to
      if (![...consumers].every((consumer) => consumer.startsWith(app))) continue;  // genuinely shared
      violations.push(`${path}: \`${describeRule(rule)}\` styles .${name}, used only by ${app} - it belongs in that module's stylesheet`);
    }
  }
}



// =====================================================================
// global.css is the global foundation, and only that (spec AD-06)
//
// The question this keeps answerable is "what is styles/global.css for?".
// The answer must stay: the reset, the design tokens, the stage/layout box
// every screen renders into, the primitives more than one module shares, and
// the animations more than one module runs. A rule whose markup only ever
// appears inside one owner - one scenario, one App module, one shared
// component, the entry screens, the staff screens - belongs to that owner's
// stylesheet.
//
// Nothing here is a list of selector names: ownership is derived from who
// renders each class. A new `.fb-*` rule dropped into global.css fails because
// only pages/scenario01/ ever renders it, not because anything spells out
// "fb-". The one thing enumerated is the set of owners, which is the same
// module map the rest of this file and validate-app-boundaries.mjs use.
// =====================================================================

const GLOBAL_CSS = 'styles/global.css';

const STYLE_OWNER_MODULES = [
  { name: 'Scenario 01', paths: ['pages/scenario01/'], home: 'styles/scenario01.css' },
  { name: 'Scenario 02', paths: ['pages/scenario02/'], home: 'styles/scenario02.css or pages/scenario02/PrivateChat.css' },
  { name: 'Scenario 03', paths: ['pages/scenario03/'], home: 'styles/scenario03.css or pages/scenario03/components/PhoneShell.css' },
  { name: 'Scenario 04', paths: ['pages/scenario04/'], home: "the scenario's own stylesheet" },
  { name: 'Scenario 05', paths: ['pages/scenario05/'], home: "the scenario's own stylesheet" },
  { name: 'the staff screens', paths: ['pages/staff/'], home: 'pages/staff/staff.css' },
  { name: 'the entry screens', paths: ['pages/LanguageSelect.jsx', 'pages/ScenarioMenu.jsx', 'pages/arScan/', 'pages/gestureTutorial/'], home: 'pages/entryScreens.css' },
  { name: 'the BlackPi App module', paths: ['apps/blackpi/'], home: 'apps/blackpi/styles/index.css' },
  { name: 'the Coin Winner App module', paths: ['apps/coin-winner/'], home: 'apps/coin-winner/styles/index.css' },
  { name: 'the GuGo Invest App module', paths: ['apps/gugo-invest/'], home: 'apps/gugo-invest/app/styles/' },
  { name: 'the HPE Logistics App module', paths: ['apps/hpe-logistics/'], home: 'apps/hpe-logistics/styles/index.css' },
  { name: 'the LINE App module', paths: ['apps/line/'], home: 'apps/line/styles/line.css' },
  { name: 'the MeetU App module', paths: ['apps/meetu/'], home: 'apps/meetu/styles/index.css' },
  { name: 'the MyDonDon App module', paths: ['apps/mydondon/'], home: 'apps/mydondon/styles/index.css' },
  // Shared components that own their styling the same way an App module does:
  // the component renders the markup, so it imports the CSS that dresses it.
  // PhoneShell used to be on this list; AD-07 moved it under Scenario 03, so
  // its stylesheet is covered by that scenario's entry above instead.
  { name: 'the shared Outcome System', paths: ['components/outcome/'], home: 'components/outcome/ScenarioOutcome.css or components/outcome/FraudClueAnalysis.css' },
  { name: 'the shared FraudWarningBanner component', paths: ['components/warnings/'], home: 'components/warnings/FraudWarningBanner.css' },
  { name: 'the shared ScenarioFinalDecision component', paths: ['components/ui/ScenarioFinalDecision.jsx'], home: 'components/ui/ScenarioFinalDecision.css' },
  { name: 'the shared scenario entry screen', paths: ['components/ui/ScenarioEntryBriefing.jsx', 'components/ui/ScenarioEntryHero.jsx'], home: 'components/ui/ScenarioEntryBriefing.css' },
];

// A consumer that sits in none of them (shell/, lib/, components/ui/Card.jsx,
// components/ui/ButtonGroup.jsx, ...) is the shared layer itself: a class it
// renders has no narrower home than global.css, which is exactly why
// `.ar-stage`, `.app`, `.topbar` and `.card` stay.
const ownerOfFile = (path) => STYLE_OWNER_MODULES.find((owner) => owner.paths.some((prefix) => path.startsWith(prefix))) ?? null;

// Classes the rule actually styles - the ones outside a `:not()` / `:is()`
// guard. `h1:not(.gugo-app *)` styles no class at all; it is a bare element
// rule that happens to name a class to exclude one App module from it.
const styledClassesIn = (selector) => classesIn(selector.replace(/:(?:not|is|where|has)\([^)]*\)/g, ' '));

function soleOwnerOf(name) {
  const files = consumerFiles(name);
  if (!files.size) return 'DEAD';
  const owners = new Set([...files].map(ownerOfFile));
  if (owners.size !== 1) return null;          // several owners, or shared-layer
  const [only] = owners;
  return only;                                  // an owner object, or null for shared-layer
}

for (const rule of cssSelectors(sourceByPath.get(GLOBAL_CSS) ?? '')) {
  const names = styledClassesIn(rule.selector);
  if (!names.length) continue;

  const dead = names.filter((name) => soleOwnerOf(name) === 'DEAD');
  if (dead.length) {
    violations.push(`${GLOBAL_CSS}: \`${describeRule(rule)}\` styles ${dead.map((n) => `.${n}`).join('/')}, which nothing in the tree renders - global.css is not where dead CSS waits`);
    continue;
  }

  // The rule is owned only if EVERY class it styles is. A variant compounded
  // onto a shared primitive (`.btn.danger`) styles `.btn` too, so it stays
  // with the primitive rather than following its one current caller.
  const owners = names.map(soleOwnerOf);
  if (owners.some((owner) => owner === null)) continue;         // at least one class is shared
  const owner = owners[0];
  if (!owners.every((candidate) => candidate === owner)) continue;  // spans two owners: shared
  violations.push(`${GLOBAL_CSS}: \`${describeRule(rule)}\` is rendered only by ${owner.name} - it belongs in ${owner.home}, not in the global foundation`);
}

// =====================================================================
// LINE style ownership (spec AD-05)
//
// One question this has to keep answerable: "where are the LINE UI styles?"
// The answer must stay `apps/line/styles/**` and nowhere else. The checks
// below are derived from the code rather than from a hand-written list, so
// a new LINE surface is covered the moment it is added.
// =====================================================================

const LINE_STYLE_DIR = 'apps/line/styles/';
const LINE_COMPONENT = 'apps/line/components/Line.jsx';


const cssFiles = [...sourceByPath.keys()].filter((path) => path.endsWith('.css'));
const lineStyleFiles = cssFiles.filter((path) => path.startsWith(LINE_STYLE_DIR));
if (!lineStyleFiles.length) violations.push(`no stylesheet under ${LINE_STYLE_DIR}: the LINE module must own its own CSS`);

// Rule subjects the LINE module declares - the class surface it owns.
const lineOwnedClasses = new Set();
const lineDeclaredClasses = new Set();
for (const path of lineStyleFiles) {
  for (const { selector } of cssSelectors(sourceByPath.get(path))) {
    for (const name of classesIn(selector)) {
      lineDeclaredClasses.add(name);
      if (name.startsWith('line-')) lineOwnedClasses.add(name);
    }
  }
}

// (1) Exactly one LINE stylesheet owner. Blocks the per-scenario copies this
// refactor exists to prevent (scenario01-line.css / scenario02-line.css...).
for (const path of cssFiles) {
  if (path.startsWith(LINE_STYLE_DIR)) continue;
  if (/(?:^|[/-])line[\w-]*\.css$/.test(path)) violations.push(`${path}: a second LINE stylesheet - LINE CSS belongs in ${LINE_STYLE_DIR}`);
}

// (2) No other stylesheet may declare a class the LINE module owns - that is
// either a duplicate of the shared implementation or a scenario reaching in
// to restyle LINE chrome behind the module's back.
for (const path of cssFiles) {
  if (path.startsWith(LINE_STYLE_DIR)) continue;
  for (const rule of cssSelectors(sourceByPath.get(path))) {
    const owned = classesIn(rule.selector).filter((name) => lineOwnedClasses.has(name));
    if (owned.length) violations.push(`${path}: "${describeRule(rule)}" restyles LINE-owned ${owned.map((n) => `.${n}`).join('/')} outside ${LINE_STYLE_DIR}`);
  }
}

// (3) Every class the shared LINE component renders must be styled by the
// LINE module, never by a scenario or by global.css. Derived from the
// component source so a newly rendered class is covered automatically;
// `line-group-body` is the one module class a consumer passes in as a prop
// (VipGroup's bodyClassName), so it is unioned in explicitly.
//
// Read off the component's AST, so a class that only exists inside a
// conditional template literal counts the same as a plain string one.
// `line-group-body` is the one module class a consumer passes in as a prop
// (VipGroup's bodyClassName), so it is unioned in explicitly.
const lineComponentSource = sourceByPath.get(LINE_COMPONENT) ?? '';
if (!lineComponentSource) violations.push(`${LINE_COMPONENT} is missing`);
const renderedLineClasses = new Set([...usedClasses(LINE_COMPONENT, lineComponentSource), 'line-group-body']);
if (renderedLineClasses.size < 20) violations.push(`${LINE_COMPONENT}: only ${renderedLineClasses.size} classes were read out of the component - the className extraction is no longer matching this file's markup`);

// (3a) Whatever the shared component renders, the LINE stylesheet has to
// dress. Without this the pair of sets below only ever catches a class
// escaping *outwards*; deleting `.line-header` from line.css while Line.jsx
// still renders `line-header` would pass every other rule here.
for (const name of [...renderedLineClasses].sort()) {
  if (lineDeclaredClasses.has(name)) continue;
  violations.push(`${LINE_COMPONENT} renders .${name}, which no stylesheet under ${LINE_STYLE_DIR} declares - the LINE module must style what it renders`);
}

// (3b) ...and no one else may dress it. Only the module's own namespaces
// count here (`line-*` and the generic `chat-*` row classes): the bare
// modifiers it also renders - `them` / `me`, always compounded onto
// `.line-msg` - are too generic to attribute to LINE on their own. MeetU's
// `.meetu-msg.them` is its own rule, not a LINE leak, and any rule that
// really did reach LINE's bubble has to name `.line-msg` too, which check
// (2) already rejects.
const LINE_NAMESPACE = /^(?:line-|chat-)/;
for (const path of cssFiles) {
  if (path.startsWith(LINE_STYLE_DIR)) continue;
  for (const rule of cssSelectors(sourceByPath.get(path))) {
    const rendered = classesIn(rule.selector)
      .filter((name) => renderedLineClasses.has(name) && LINE_NAMESPACE.test(name) && !lineOwnedClasses.has(name));
    if (rendered.length) violations.push(`${path}: "${describeRule(rule)}" styles ${rendered.map((n) => `.${n}`).join('/')}, rendered by the shared LINE component - move it into ${LINE_STYLE_DIR}`);
  }
}

// (4) global.css keeps no LINE-namespaced rule at all - not even an allowlisted
// one. The `line-` prefix is the module's namespace: anything wearing it in
// the global stylesheet is either LINE CSS that escaped the module, or a
// scenario squatting the name.
//
// `.ar-stage.line-stage` used to be the single exception: it is the shell's
// stage-variant system (peer of .meetu-stage / .police-stage) rather than LINE
// module UI, since apps/line never renders `.line-stage` - the scenario picks
// it with useStageClassName(). Its two consumers are both in Scenario 01, so
// the AD-06 rule above moved it into styles/scenario01.css and this check is
// now absolute.
for (const rule of cssSelectors(sourceByPath.get(GLOBAL_CSS) ?? '')) {
  if (classesIn(rule.selector).some((name) => name === 'line' || name.startsWith('line-'))) {
    violations.push(`${GLOBAL_CSS}: "${describeRule(rule)}" is a LINE-namespaced rule - global.css is not a LINE style owner`);
  }
}

// (5) The LINE module claims no unprefixed global name. Generic row classes
// (.chat-row/.chat-time/.chat-read/.chat-meta) are the module's own but
// collide by name with any other chat UI, so they stay scoped under the
// module's `.line-app` root instead of sitting at the top level.
for (const path of lineStyleFiles) {
  for (const rule of cssSelectors(sourceByPath.get(path))) {
    const [subject] = rule.selector.split(/\s|>|\+|~/);
    const roots = classesIn(subject);
    if (!roots.length) continue;
    if (roots.some((name) => name === 'line' || name.startsWith('line-'))) continue;
    violations.push(`${path}: "${describeRule(rule)}" is an unprefixed global selector - scope it under the module's .line-app root`);
  }
}

// (6) The LINE stylesheet must not depend on another module's CSS. Every
// keyframe and custom property it reads has to be declared inside the
// module, or the module renders differently depending on which *other*
// stylesheet happens to be loaded (how it used to read MeetU's tokens and
// global.css's `typingDot`).
const lineCss = lineStyleFiles.map((path) => stripCssComments(sourceByPath.get(path))).join('\n');
const lineDeclaredKeyframes = new Set([...lineCss.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]));
const lineDeclaredVars = new Set([...lineCss.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
const ANIMATION_KEYWORDS = /^(?:none|infinite|alternate|alternate-reverse|reverse|normal|forwards|backwards|both|running|paused|linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end|initial|inherit|unset)$/;
for (const match of lineCss.matchAll(/animation(?:-name)?\s*:\s*([^;}]+)/g)) {
  for (const token of match[1].split(/[\s,]+/)) {
    if (!/^[a-zA-Z][\w-]*$/.test(token) || ANIMATION_KEYWORDS.test(token)) continue;
    if (!lineDeclaredKeyframes.has(token)) violations.push(`${LINE_STYLE_DIR}: animation "${token}" is not declared by the LINE module`);
  }
}
for (const match of lineCss.matchAll(/var\(\s*(--[\w-]+)/g)) {
  if (!lineDeclaredVars.has(match[1])) violations.push(`${LINE_STYLE_DIR}: custom property "${match[1]}" is not declared by the LINE module`);
}

// (7) The module imports its own stylesheet; no consumer does it for it.
const lineIndex = sourceByPath.get('apps/line/index.js') ?? '';
if (!/import\s+['"]\.\/styles\/line\.css['"]/.test(lineIndex)) violations.push('apps/line/index.js no longer imports the LINE stylesheet');
// Read off real import specifiers, not raw file text: a stylesheet whose
// comment happens to mention `apps/line/styles/` between two apostrophes
// ("scenario02's ... apps/line/styles/ ... the shell's") is prose, not an
// import, and a CSS file cannot import a stylesheet this way at all.
for (const [path, source] of sourceByPath) {
  if (path.startsWith('apps/line/') || path.endsWith('.css')) continue;
  const specifiers = [...source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)].map((match) => match[1]);
  if (specifiers.some((specifier) => specifier.includes('apps/line/styles/'))) {
    violations.push(`${path}: imports the LINE stylesheet directly - the LINE module owns that import`);
  }
}
// A stylesheet can still reach it with @import, which is the CSS-side form of
// the same mistake.
for (const [path, source] of sourceByPath) {
  if (!path.endsWith('.css') || path.startsWith('apps/line/')) continue;
  if (/@import\s+(?:url\()?['"][^'"]*apps\/line\/styles\//.test(stripCssComments(source))) {
    violations.push(`${path}: @imports the LINE stylesheet - the LINE module owns that import`);
  }
}

if (violations.length) { console.error(violations.join('\n')); process.exit(1); }
console.log(`Shared UI ownership OK (${files.length} source/CSS files checked, ${lineOwnedClasses.size} LINE-owned selectors).`);
