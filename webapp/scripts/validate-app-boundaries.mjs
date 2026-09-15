import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, normalize, relative, resolve } from 'node:path';
const root = new URL('../src/', import.meta.url).pathname;
async function collect(dir) {
  const output = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) output.push(...await collect(path));
    else if (/\.[jt]sx?$/.test(entry.name)) output.push(path);
  }
  return output;
}
// App modules that have finished the "no scenario-owned state inside the app"
// migration are listed here, and are checked against the stricter rule below:
// no importing a scenario's run-state store, its character/story data tables
// or its page implementations. Every App module that reaches into a scenario
// at all now belongs on this list - AD-01 is paid off (see
// CIBAR-Technical-Specification.md 13.1) - and it may only ever grow.
// AD-21: this is deliberately the ownership root, not a list of Apps which
// happened to have debt in the past.  Every current and future App is covered.
const SCENARIO_STATE_FREE_APPS = [
  'apps/blackpi/', 'apps/coin-winner/', 'apps/gugo-invest/',
  'apps/hpe-logistics/', 'apps/line/', 'apps/meetu/', 'apps/mydondon/',
];
const SCENARIO_OWNED_IMPORT = /(?:^|\/)(?:lib\/scenario\d+Store(?:\.[mc]?[jt]sx?)?$|data\/scenario\d+[A-Za-z]*(?:\.[mc]?[jt]sx?)?$|pages\/scenario\d+(?:\/|$))/i;

// The rule above finds a scenario store by its *path*, which misses one that
// is not named after its scenario: Scenario 04's store is `lib/shoppingStore`
// (see that file's header). This second rule catches a run-state store by
// module identity instead, and now applies to every App module without
// exception - so an App that is clean today cannot quietly reach for a store
// tomorrow, whatever the store happens to be called.
//
// The extension is optional and matched generically: this project imports
// extensionless (`../../lib/shoppingStore`), but `../../lib/shoppingStore.js`
// resolves to exactly the same module, so anchoring the name to end-of-string
// alone would let one spelling of the same import walk straight past the rule.
// `(?:[mc]?[jt]sx?)` covers .js/.jsx/.mjs/.cjs/.ts/.tsx (and .mts/.cts) rather
// than listing the extensions one store at a time.
const MODULE_EXTENSION = '(?:\\.[mc]?[jt]sx?)?';
const SCENARIO_STATE_MODULE = new RegExp(
  `(?:^|/)(?:scenario\\d+Store|shoppingStore|scenario\\d+Characters)${MODULE_EXTENSION}$`,
  'i',
);

// Apps exempted from the module-identity rule above while they still owe
// AD-01. It is empty: Coin Winner was the last debtor, and with its Scenario
// 02 store dependency gone every App module is held to the rule. The list
// stays as the mechanism - and may only ever shrink, never grow.
const SCENARIO_STATE_DEBT = [];

// Static imports/exports and dynamic import() are architecture edges. This is
// intentionally a small specifier scanner rather than a JavaScript parser: a
// non-literal dynamic import cannot be resolved safely and therefore fails
// closed below instead of silently escaping the graph.
function importSpecifiers(source) {
  const literals = [];
  for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*(?!\()|\bexport\s+[^;]*?\bfrom\s*)['"]([^'"]+)['"]/g)) literals.push(match[1]);
  let hasUnknownDynamicImport = false;
  for (const match of source.matchAll(/\bimport\s*\(/g)) {
    let cursor = match.index + match[0].length;
    while (/\s/.test(source[cursor] ?? '')) cursor += 1;
    const quote = source[cursor];
    if (!['"', "'", '`'].includes(quote)) { hasUnknownDynamicImport = true; continue; }

    const start = ++cursor;
    let interpolated = false;
    while (cursor < source.length && source[cursor] !== quote) {
      if (source[cursor] === '\\') { cursor += 2; continue; }
      if (quote === '`' && source.slice(cursor, cursor + 2) === '${') interpolated = true;
      cursor += 1;
    }
    if (cursor >= source.length) { hasUnknownDynamicImport = true; continue; }
    const specifier = source.slice(start, cursor);
    cursor += 1;
    while (/\s/.test(source[cursor] ?? '')) cursor += 1;
    if (source[cursor] !== ')' || interpolated) { hasUnknownDynamicImport = true; continue; }
    literals.push(specifier);
  }
  return { literals, hasUnknownDynamicImport };
}

const ROUTE_SHAPED_CONTRACT = /\b(?:nextScenarioRoute|scenarioRoute|nextRoute|targetRoute|routeTo|navigateTo|redirectTo)\b|\bon[A-Z]\w*(?:Scenario\d*|StoryStep|Route|Path|Url)\w*/i;

// Audited AD-21 exception: BlackPi renders the real HPE carrier mark in its
// delivery notification.  This is a brand contract exported by HPE's public
// index, not state/navigation. Keep the edge exact so no second cross-App
// dependency can hide behind it.
const CROSS_APP_BRAND_CONTRACTS = new Set([
  'apps/blackpi/screens/OrderDetail.jsx -> apps/hpe-logistics/index.js',
]);

function importedAppOwner(importer, specifier) {
  const target = specifier.startsWith('.')
    ? normalize(relative(root, resolve(dirname(importer), specifier))).replaceAll('\\', '/')
    : specifier.replace(/^.*(?:^|\/)apps\//, 'apps/');
  const owner = target.match(/^apps\/([^/]+)/)?.[1] ?? null;
  if (!owner) return { owner: null, target };
  // Directory imports resolve through the public index; exemptions compare
  // this normalized module identity, never merely the owning App.
  const normalizedTarget = target === `apps/${owner}` || target === `apps/${owner}/`
    ? `apps/${owner}/index.js`
    : target;
  return { owner, target: normalizedTarget };
}

// --- scenario navigation ----------------------------------------------------
//
// The rules above are about what an App *knows*; these are about where an App
// can *send the player*. An App module renders its screens and reports what
// the player did - which screen comes next is the hosting scenario's decision,
// made in its own page layer (pages/scenarioNN/**). An App that spells a
// scenario route has taken that decision back, whatever its store situation.
//
// Comments are blanked out first: a file is allowed to explain in prose which
// URLs its host mounts it on (apps/blackpi/data/catalog.js does). Telling a
// comment from code means actually tracking strings, because `//` is only a
// comment when it is not inside one - `'//cdn.example/x'` is a
// protocol-relative URL, `"https://..."` is a scheme, and `'abc // x'` is just
// text. Getting that wrong is not a cosmetic bug: everything after the
// mistaken `//` is dropped, so a real route later on the same line disappears
// and the rule below reports nothing.
//
// So this walks the source once, tracking single-quoted, double-quoted and
// template strings (with `${ ... }` expressions, which are code again and may
// hold further strings, comments and templates), backslash escapes - so `\'`
// does not end a string and `\\` does not escape the quote after it - regex
// literals, and the two comment forms. Strings and code come out verbatim;
// only comment text is replaced, by spaces, so offsets and line breaks
// survive.
//
// Any construct it cannot follow - an unterminated string, a template still
// open at EOF - makes it hand back the original source instead. A parse it got
// wrong can then only ever over-report (a visible, fixable build failure) and
// never hide a route, which is the direction a build gate should fail in.
// scripts/blackpi-navigation-boundary.test.mjs drives all of this through the
// real validator with real files on disk.

// A `/` starts a regex only where a value cannot already have ended: after an
// identifier, a number, `)`, `]` or a closing quote it is division instead.
// `}` is ambiguous (block end vs object literal) and `<` only shows up here in
// JSX (`</div>`, `<br />`); both are read as division, which at worst leaves a
// regex body to be scanned as ordinary code.
const DIVIDES_RATHER_THAN_MATCHES = /[\w$)\]}<'"`]/;

function blankComments(source) {
  let out = '';
  let previous = '';          // last non-whitespace character emitted as code
  // Open `...` templates and the `${ ... }` expressions inside them. Empty
  // means plain code.
  const nesting = [];
  const top = () => nesting.at(-1);
  let index = 0;

  const emit = (text) => {
    out += text;
    const code = text.trimEnd();
    if (code) previous = code.at(-1);
  };

  while (index < source.length) {
    const char = source[index];
    const pair = source.slice(index, index + 2);

    // Inside a template literal's text: only \, ${ and ` mean anything.
    if (top()?.kind === 'template') {
      if (char === '\\') { emit(source.slice(index, index + 2)); index += 2; continue; }
      if (pair === '${') { emit(pair); nesting.push({ kind: 'expression', braces: 0 }); index += 2; continue; }
      if (char === '`') { emit(char); nesting.pop(); index += 1; continue; }
      out += char;
      index += 1;
      continue;
    }

    // --- code: the top level, or a template's ${ ... } ---
    if (pair === '//') {
      while (index < source.length && source[index] !== '\n') { out += ' '; index += 1; }
      continue;
    }
    if (pair === '/*') {
      const close = source.indexOf('*/', index + 2);
      const end = close === -1 ? source.length : close + 2;
      for (const c of source.slice(index, end)) out += c === '\n' ? '\n' : ' ';
      index = end;
      continue;
    }
    if (char === '"' || char === "'") {
      // A JS string cannot span a raw newline, so meeting one normally means
      // this quote was never a string at all - a regex character class like
      // /['"]/ is the usual culprit - and the scan has lost the thread. A JSX
      // attribute value can span lines (an SVG `d="M 44 15.5 ... "`), and it
      // is the one quote that follows an `=`, so that case is allowed through.
      const isAttributeValue = previous === '=';
      let cursor = index + 1;
      while (cursor < source.length && source[cursor] !== char) {
        if (source[cursor] === '\n' && !isAttributeValue) return source;
        cursor += source[cursor] === '\\' ? 2 : 1;
      }
      if (cursor >= source.length) return source;
      emit(source.slice(index, cursor + 1));
      index = cursor + 1;
      continue;
    }
    if (char === '`') { emit(char); nesting.push({ kind: 'template' }); index += 1; continue; }
    if (char === '{' && top()?.kind === 'expression') { top().braces += 1; emit(char); index += 1; continue; }
    if (char === '}' && top()?.kind === 'expression') {
      if (top().braces === 0) { nesting.pop(); emit(char); index += 1; continue; }
      top().braces -= 1;
      emit(char);
      index += 1;
      continue;
    }
    if (char === '/' && !DIVIDES_RATHER_THAN_MATCHES.test(previous)) {
      let cursor = index + 1;
      let inClass = false;
      while (cursor < source.length) {
        const c = source[cursor];
        if (c === '\\') { cursor += 2; continue; }
        if (c === '\n') return source;
        if (c === '[') inClass = true;
        else if (c === ']') inClass = false;
        else if (c === '/' && !inClass) break;
        cursor += 1;
      }
      if (cursor >= source.length) return source;
      emit(source.slice(index, cursor + 1));
      index = cursor + 1;
      continue;
    }
    emit(char);
    index += 1;
  }

  // A template left open means the walk went wrong somewhere above.
  return nesting.length ? source : out;
}
const stripComments = blankComments;

// 1. No App may name a scenario route. Matched on the opening quote so it
//    catches every spelling of the same knowledge: a navigate() argument, a
//    tab table's `to:`, a `nextRoute` prop default, a template literal with
//    the product route interpolated in. `\b` after the digits means
//    '/scenario04-shopping/orders' and a bare '/scenario04' both fail, while
//    'shared/i18n/scenario04' - a dictionary, not a route - does not.
const SCENARIO_ROUTE_LITERAL = /['"`]\/scenario\d+\b/i;

// 2. Nor may it import the module that holds those routes. The scenario page
//    layer itself is already refused for every App by the baseline rule
//    above; this adds the route map that layer builds its links from.
const SCENARIO_ROUTE_MODULE = /(?:^|\/)(?:pages\/scenario\d+|scenario\d+Routes)/i;

// --- scenario localization ---------------------------------------------------
//
// An App module owns its UI, so it owns the words on it. Reaching into a
// dictionary named after a story makes that story the owner of another
// module's tabs, buttons and empty states, and means the App cannot be
// mounted anywhere else without dragging the scenario's copy along (§13
// AD-14). Every App now has its own apps/<app>/i18n/, so this rule applies
// to all of them with no exemptions - and it may only ever stay that way.
//
// The baseline rule above already refuses `pages/scenarioNN/i18n`, because it
// refuses everything under pages/scenarioNN. What this adds is the shared
// location the scenario dictionaries actually live in
// (`shared/i18n/scenario02`, `shared/i18n/scenario04En`, ...), which that
// rule deliberately does not catch - see the note on SCENARIO_ROUTE_LITERAL,
// where a dictionary path is called out as *not* a route. The extension is
// optional and matched the same way as SCENARIO_STATE_MODULE, so
// `shared/i18n/scenario04.js` cannot walk past a rule that
// `shared/i18n/scenario04` fails.
//
// It does not catch shared/i18n/createTranslator.js, and should not: that is
// the lookup mechanism every App dictionary is built with and holds no copy
// of its own.
const SCENARIO_I18N_MODULE = new RegExp(`(?:^|/)i18n/scenario\\d+[A-Za-z]*${MODULE_EXTENSION}$`, 'i');

// 3. App modules that have finished the "the scenario decides where the player
//    goes" migration do not reach for the router at all - so a route cannot
//    come back in through a prop, a constant or a path built at runtime, which
//    would be the same knowledge wearing a different spelling. Coin Winner
//    (AD-02) and BlackPi (AD-02b) are done; the other Apps are only held to
//    rules 1 and 2 above, so this check cannot regress what is already clean.
//    Like SCENARIO_STATE_FREE_APPS, this list may only ever grow.
const SCENARIO_NAVIGATION_FREE_APPS = ['apps/blackpi/', 'apps/coin-winner/'];
const ROUTER_NAVIGATION = /\buseNavigate\b|\bnavigate\(/;

const all = await collect(root);
const violations = [];
for (const file of all) {
  const source = await readFile(file, 'utf8');
  const rel = relative(root, file).replaceAll('\\', '/');
  const code = stripComments(source);
  const { literals: imports, hasUnknownDynamicImport } = importSpecifiers(code);
  if (rel.startsWith('apps/') && imports.some((value) => /(?:^|\/)scenarios?(?:\/|$)|pages\/scenario\d+/i.test(value))) violations.push(`${rel}: app imports scenario`);
  if (SCENARIO_STATE_FREE_APPS.some((prefix) => rel.startsWith(prefix))
    && imports.some((value) => SCENARIO_OWNED_IMPORT.test(value))) {
    violations.push(`${rel}: app imports scenario-owned state/data/page module`);
  }
  if (rel.startsWith('apps/') && !SCENARIO_STATE_DEBT.some((prefix) => rel.startsWith(prefix))) {
    for (const value of imports) {
      if (SCENARIO_STATE_MODULE.test(value)) violations.push(`${rel}: app imports scenario run state (${value})`);
    }
  }
  if (rel.startsWith('apps/')) {
    for (const value of imports) {
      if (SCENARIO_I18N_MODULE.test(value)) {
        violations.push(`${rel}: app imports scenario-owned localization (${value}) - an App owns its own UI copy (apps/<app>/i18n)`);
      }
    }
  }
  if (rel.startsWith('apps/')) {
    if (hasUnknownDynamicImport) violations.push(`${rel}: app has a non-literal dynamic import; ownership cannot be verified`);
    const literal = code.match(SCENARIO_ROUTE_LITERAL);
    if (literal) violations.push(`${rel}: app names a scenario route (${literal[0]}...) - report what the player did instead`);
    for (const value of imports) {
      if (SCENARIO_ROUTE_MODULE.test(value)) violations.push(`${rel}: app imports scenario navigation (${value})`);
    }
    if (SCENARIO_NAVIGATION_FREE_APPS.some((prefix) => rel.startsWith(prefix)) && ROUTER_NAVIGATION.test(code)) {
      violations.push(`${rel}: app navigates; its scenario owns where each event leads`);
    }
    if (ROUTE_SHAPED_CONTRACT.test(code)) {
      violations.push(`${rel}: app exposes a route/scenario-shaped contract; use a semantic action callback`);
    }

    const ownApp = rel.split('/')[1];
    for (const value of imports) {
      const { owner: importedApp, target } = importedAppOwner(file, value);
      const contract = `${rel} -> ${target}`;
      if (importedApp && importedApp !== ownApp && !CROSS_APP_BRAND_CONTRACTS.has(contract)) {
        violations.push(`${rel}: app imports another App implementation (${value}); compose through shared or the host`);
      }
    }
  }
  const owner = rel.match(/^pages\/(scenario\d+)/)?.[1];
  if (owner) for (const value of imports) { const other = value.match(/scenario(\d+)/i)?.[0]?.toLowerCase(); if (other && other !== owner) violations.push(`${rel}: ${owner} imports ${other}`); }
}
if (violations.length) { console.error(violations.join('\n')); process.exit(1); }
console.log(`App/scenario boundaries OK (${all.length} source files checked).`);
