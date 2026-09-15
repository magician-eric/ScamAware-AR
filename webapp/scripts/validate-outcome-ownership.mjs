// Outcome ownership (spec §4.3).
//
// The Outcome System - components/outcome/ - owns every screen a player sees
// after their final decision:
//
//   Final Decision -> ScenarioOutcome -> FraudClueAnalysis -> 反詐小測驗 -> AR
//
// A Scenario supplies facts and nothing else. It does not own the shell, the
// artwork lookup, the status vocabulary, the CTA wording or the route the CTA
// leads to, and it may not dress any of them. This file is what makes that
// enforceable rather than a convention: an ordinary Scenario change should
// never need to touch the Outcome System, and this rejects the ways it
// previously could.
//
// The last step of that flow, the 反詐小測驗, is owned the same way by
// components/ui/ScenarioFinalDecision.jsx - see rules I and J. The five
// pages/scenarioNN/Quiz.jsx are wrappers that supply a question and render the
// shared component with nothing around it, and rules I/J are what keeps them
// that way. Only their UI, interaction and styling are claimed: a wrapper
// still owns its own copy, its own two options and its own correctIndex.
//
// Two rules cover the whole of it rather than one screen each: rule K owns the
// state classes the three components render that carry no namespace of their
// own, and rule L keeps the shell neutral - no scenario, App or shared
// component may put a stage class on the結局, the 詐騙疑點分析 or the 小測驗.
//
// Nothing below is derived from a component's *name*. The outcome, analysis
// and quiz pages are found by what they render, the flow is read out of
// routes.jsx, and the artwork mapping is read out of its one owner. The one
// thing enumerated is the expected set of ten outcomes, five analyses and five
// quizzes, so a scenario cannot silently drop out of the system it is supposed
// to be inside.
//
// Where a player can actually get to is a different question from who owns
// what, and this file does not answer it - scripts/outcome-reachability.test.mjs
// does, by walking each scenario's final decision to both of its endings.
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

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
const sourceByPath = new Map(await Promise.all(
  files.map(async (file) => [relative(src, file).replaceAll('\\', '/'), await readFile(file, 'utf8')]),
));

const violations = [];
const OUTCOME_DIR = 'components/outcome/';
const OUTCOME_COMPONENT = `${OUTCOME_DIR}ScenarioOutcome.jsx`;
const ANALYSIS_COMPONENT = `${OUTCOME_DIR}FraudClueAnalysis.jsx`;
const MASCOTS = `${OUTCOME_DIR}resultMascots.js`;

// Comments are prose: a file explaining that PoliceFrame is gone must not read
// as a file that imports it. Strings are preserved so a route literal still
// counts. Adapted from validate-shared-ui-ownership.mjs's stripper.
function stripComments(source) {
  let out = '';
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (character === '"' || character === "'" || character === '`') {
      const start = index;
      index += 1;
      while (index < source.length && source[index] !== character) index += source[index] === '\\' ? 2 : 1;
      index += 1;
      out += source.slice(start, index);
      continue;
    }
    if (source.startsWith('//', index)) {
      const end = source.indexOf('\n', index);
      index = end === -1 ? source.length : end;
      continue;
    }
    if (source.startsWith('/*', index)) {
      const close = source.indexOf('*/', index + 2);
      index = close === -1 ? source.length : close + 2;
      continue;
    }
    out += character;
    index += 1;
  }
  return out;
}

// A CSS comment is prose the same way a JS comment is: global.css's header
// cites the rules that out-rank its element resets - `.cibar-outcome
// .cibar-outcome-title`, `.antifraud-quiz-card>p` - while explaining where
// each of them went, and a file saying where a rule went must not read as the
// file declaring it.
const stripCssComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, ' ');

const codeByPath = new Map([...sourceByPath].map(([path, source]) => [
  path,
  path.endsWith('.css') ? source : stripComments(source),
]));

const importsOf = (path) => [...(codeByPath.get(path) ?? '').matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)].map((m) => m[1]);
const renders = (path, component) => new RegExp(`<${component}[\\s/>]`).test(codeByPath.get(path) ?? '');

// The bindings one import statement pulls in, default and named alike.
function importedNames(path, specifier) {
  const code = codeByPath.get(path) ?? '';
  const statement = code.match(new RegExp(`import\\s+([^;]*?)\\s+from\\s*['"]${specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`));
  if (!statement) return [];
  return [...statement[1].matchAll(/(\w+)(?:\s+as\s+(\w+))?/g)]
    .map((match) => match[2] ?? match[1])
    .filter((name) => name !== 'as');
}

// --- who is an outcome page, and who is an analysis page --------------------
//
// Derived: any Scenario page that renders the shared component is one. That
// is what makes rule A meaningful - a page cannot opt out of these checks by
// declining to be listed anywhere.
const scenarioPages = [...codeByPath.keys()].filter((path) => /^pages\/scenario\d+\/[^/]+\.jsx$/.test(path));
const outcomePages = scenarioPages.filter((path) => renders(path, 'ScenarioOutcome'));
const analysisPages = scenarioPages.filter((path) => renders(path, 'FraudClueAnalysis'));

// --- A. every scenario outcome is inside the system -------------------------
//
// The ten outcomes and five analyses, spelled out. A scenario that quietly
// stopped rendering its 成功反詐 result, or grew a second結局 page of its own,
// fails here.
const EXPECTED_OUTCOME_PAGES = [
  'pages/scenario01/ScammedResult.jsx',
  'pages/scenario01/StoppedResult.jsx',
  'pages/scenario02/ScammedResult.jsx',
  'pages/scenario02/StoppedResult.jsx',
  'pages/scenario03/Ending.jsx',            // both states, chosen by :outcome
  'pages/scenario04/OutcomeResult.jsx',     // both states, chosen by :outcome
  'pages/scenario05/EndingCaught.jsx',
  'pages/scenario05/EndingScammed.jsx',
];
const EXPECTED_ANALYSIS_PAGES = [
  'pages/scenario01/Analysis.jsx',
  'pages/scenario02/RiskAnalysis.jsx',
  'pages/scenario03/Analysis.jsx',
  'pages/scenario04/Ending.jsx',
  'pages/scenario05/Reveal.jsx',
];
const sameSet = (actual, expected) => actual.length === expected.length && expected.every((path) => actual.includes(path));
if (!sameSet(outcomePages, EXPECTED_OUTCOME_PAGES)) {
  violations.push(`the set of pages rendering ScenarioOutcome changed: expected ${EXPECTED_OUTCOME_PAGES.join(', ')}, found ${outcomePages.join(', ') || '(none)'}`);
}
if (!sameSet(analysisPages, EXPECTED_ANALYSIS_PAGES)) {
  violations.push(`the set of pages rendering FraudClueAnalysis changed: expected ${EXPECTED_ANALYSIS_PAGES.join(', ')}, found ${analysisPages.join(', ') || '(none)'}`);
}

const systemPages = [...new Set([...outcomePages, ...analysisPages])];

// --- B. no simulation shell may follow the player past the結局 --------------
//
// Every App module is banned by directory, so a new fake app is covered the
// day it is added; the four in-scenario frames are named because they live
// inside a Scenario rather than under apps/.
const BANNED_FRAMES = ['PhoneShell', 'PoliceFrame', 'BrowserChrome', 'SuqubianSiteHeader', 'CibarResultBar', 'AppShell'];
for (const path of systemPages) {
  // An App module's *data* may be read - the loss shown on Scenario 05's
  // 詐騙成立 screen is the price of the item the player actually listed, and
  // that price lives in MyDonDon's catalog. Its *components* may not: a
  // binding named like a component (PascalCase) is UI, and UI from a
  // simulated App has no business on a screen shown after the simulation.
  for (const specifier of importsOf(path)) {
    if (!/(?:^|\/)apps\//.test(specifier)) continue;
    for (const name of importedNames(path, specifier)) {
      if (/^[A-Z]/.test(name) && !/^[A-Z0-9_]+$/.test(name)) {
        violations.push(`${path}: imports the component ${name} from the App module "${specifier}" - the simulation is over on this screen`);
      }
    }
  }
  for (const specifier of importsOf(path)) {
    for (const frame of BANNED_FRAMES) {
      if (new RegExp(`(?:^|/)${frame}(?:\\.jsx?)?$`).test(specifier)) {
        violations.push(`${path}: imports ${frame} - the simulation is over on this screen`);
      }
    }
  }
  for (const frame of BANNED_FRAMES) {
    if (renders(path, frame)) violations.push(`${path}: renders <${frame}> - the simulation is over on this screen`);
  }
  // Named imports, e.g. `import { PhoneShell } from '../../apps/mydondon'`.
  for (const [, names] of (codeByPath.get(path) ?? '').matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
    for (const name of names.split(',').map((value) => value.trim().split(/\s+as\s+/)[0])) {
      if (BANNED_FRAMES.includes(name)) violations.push(`${path}: imports ${name} - the simulation is over on this screen`);
    }
  }
  // The stage class is how a Scenario paints an App's world onto the shell.
  if (/useStageClassName/.test(codeByPath.get(path) ?? '')) {
    violations.push(`${path}: sets a stage class - the Outcome System owns this screen's shell`);
  }
}

// --- C. a Scenario may not dress these screens ------------------------------
//
// No className on an outcome/analysis page at all: the shared components take
// no class hook, so any class here is a Scenario building its own result card.
// And no stylesheet outside components/outcome/ may declare a class those
// components render.
for (const path of systemPages) {
  if (/className\s*=/.test(codeByPath.get(path) ?? '')) {
    violations.push(`${path}: sets a className - the Outcome System owns this screen's markup and styling`);
  }
}
const outcomeClasses = new Set();
for (const [path, source] of sourceByPath) {
  if (!path.startsWith(OUTCOME_DIR) || !path.endsWith('.css')) continue;
  for (const [, name] of stripCssComments(source).matchAll(/\.(cibar-(?:outcome|analysis)[\w-]*)/g)) outcomeClasses.add(name);
}
if (outcomeClasses.size < 10) violations.push(`${OUTCOME_DIR}: only ${outcomeClasses.size} outcome classes were read out of its stylesheets - the scan is no longer matching them`);
for (const [path, source] of sourceByPath) {
  if (!path.endsWith('.css') || path.startsWith(OUTCOME_DIR)) continue;
  for (const [, name] of stripCssComments(source).matchAll(/\.(cibar-[\w-]*)/g)) {
    violations.push(`${path}: declares .${name}, which the Outcome System owns - its styling lives in ${OUTCOME_DIR}`);
  }
}
// The markup half of the same rule, the one rule J already has for the
// 反詐小測驗: only the Outcome System may put its classes on an element, so a
// second結局 UI cannot borrow the look either. Scoped to the two families the
// components actually render rather than to `cibar-` at large - that prefix is
// also this app's localStorage namespace (lib/scenario0NStore.js), and a
// storage key is not a class.
const OUTCOME_MARKUP_CLASSES = /\b(cibar-(?:outcome|analysis)[\w-]*)/g;
for (const [path, source] of sourceByPath) {
  if (path.endsWith('.css') || path.startsWith(OUTCOME_DIR)) continue;
  for (const [, name] of stripComments(source).matchAll(OUTCOME_MARKUP_CLASSES)) {
    violations.push(`${path}: names "${name}" - ${OUTCOME_DIR} is the only renderer of the Outcome System's markup`);
  }
}

// --- D. the escape hatches are gone, everywhere -----------------------------
//
// `classPrefix`, `theme` and `embedded` were the three props through which a
// Scenario could take the結局 back. They must not exist on the components, and
// no page may pass them.
for (const prop of ['classPrefix', 'theme', 'embedded']) {
  for (const path of [OUTCOME_COMPONENT, ANALYSIS_COMPONENT]) {
    if (new RegExp(`\\b${prop}\\b`).test(codeByPath.get(path) ?? '')) {
      violations.push(`${path}: still accepts a "${prop}" prop - a Scenario must not be able to reskin the Outcome System`);
    }
  }
  for (const path of systemPages) {
    if (new RegExp(`\\b${prop}\\s*=`).test(codeByPath.get(path) ?? '')) {
      violations.push(`${path}: passes "${prop}" - a Scenario must not be able to reskin the Outcome System`);
    }
  }
}

// --- the routes the flow is made of ----------------------------------------
const routes = new Set([...(codeByPath.get('routes.jsx') ?? '').matchAll(/path:\s*'([^']+)'/g)].map((m) => `/${m[1]}`));
// A route with params is matched by shape, so `/scenario04-shopping/ending/health`
// resolves against `/scenario04-shopping/ending/:route`.
const routeExists = (target) => {
  const wanted = target.split('/').filter(Boolean);
  for (const route of routes) {
    const parts = route.split('/').filter(Boolean);
    if (parts.length !== wanted.length) continue;
    if (parts.every((part, index) => part.startsWith(':') || part === wanted[index])) return true;
  }
  return false;
};

// Every route a page can send the player to: the value of a `to`-shaped prop
// (`to`, `analysisTo`, `quizTo`) or the argument of a navigate() call,
// including a template literal built from a param.
//
// Deliberately not "every route-looking string in the file": Scenario 02's
// pages record their own URL for progress-resume, which is state, not a way
// out of the screen. What this rule is about is where the player can GO.
function routeTargets(path) {
  const code = codeByPath.get(path) ?? '';
  const literal = /['"`](\/[\w:/-]*(?:\$\{[^}]*\}[\w:/-]*)*)['"`]/;
  const found = [];
  for (const [, value] of code.matchAll(new RegExp(`\\b\\w*[tT]o=\\{?${literal.source}`, 'g'))) found.push(value);
  for (const [, value] of code.matchAll(new RegExp(`navigate\\(\\s*${literal.source}`, 'g'))) found.push(value);
  return found.map((value) => value.replace(/\$\{[^}]*\}/g, ':param'));
}

// --- E / F. the flow is fixed ----------------------------------------------
//
// An outcome page may name exactly one route, and it must be its scenario's
// analysis screen. An analysis page may name exactly one route, and it must be
// its scenario's quiz. Nothing may reach sideways out of the flow.
for (const path of outcomePages) {
  const targets = [...new Set(routeTargets(path))];
  if (targets.length !== 1) {
    violations.push(`${path}: names ${targets.length} routes (${targets.join(', ') || 'none'}) - an outcome screen has exactly one CTA, into 詐騙疑點分析`);
    continue;
  }
  const [target] = targets;
  if (!routeExists(target)) violations.push(`${path}: its CTA goes to ${target}, which routes.jsx does not register`);
  const scenario = path.match(/^pages\/(scenario\d+)\//)[1];
  const analysisPage = analysisPages.find((candidate) => candidate.startsWith(`pages/${scenario}/`));
  const analysisPath = analysisPage && routeElementPath(analysisPage);
  if (analysisPath && !matchesRoute(analysisPath, target)) {
    violations.push(`${path}: its CTA goes to ${target}, which is not ${scenario}'s 詐騙疑點分析 route (${analysisPath})`);
  }
}

for (const path of analysisPages) {
  const targets = [...new Set(routeTargets(path))];
  if (targets.length !== 1) {
    violations.push(`${path}: names ${targets.length} routes (${targets.join(', ') || 'none'}) - an analysis screen has exactly one CTA, into 反詐小測驗`);
    continue;
  }
  const [target] = targets;
  if (!routeExists(target)) violations.push(`${path}: its CTA goes to ${target}, which routes.jsx does not register`);
  if (!/\/quiz$/.test(target)) violations.push(`${path}: its CTA goes to ${target} - 詐騙疑點分析 continues into the 反詐小測驗 and nowhere else`);
  const scenario = path.match(/^pages\/(scenario\d+)\//)[1];
  if (!routeElementPath(path)) violations.push(`${path}: is not registered in routes.jsx`);
  const quizPage = `pages/${scenario}/Quiz.jsx`;
  if (!codeByPath.has(quizPage)) violations.push(`${quizPage}: missing - ${scenario} has an analysis screen with no quiz to continue into`);
}

// The route path a page component is mounted at, read out of routes.jsx by
// following the import that names the file.
function routeElementPath(pagePath) {
  const routesSource = codeByPath.get('routes.jsx') ?? '';
  const file = pagePath.replace(/^pages\//, './pages/').replace(/\.jsx$/, '');
  const importLine = routesSource.split('\n').find((line) => line.includes(`from '${file}'`));
  if (!importLine) return null;
  const local = importLine.match(/import\s*\{\s*\w+(?:\s+as\s+(\w+))?\s*\}/);
  const name = local?.[1] ?? importLine.match(/import\s*\{\s*(\w+)/)?.[1];
  if (!name) return null;
  const entry = routesSource.split('\n').find((line) => line.includes(`path: '`) && new RegExp(`<${name}\\s*/>`).test(line));
  return entry ? `/${entry.match(/path:\s*'([^']+)'/)[1]}` : null;
}

function matchesRoute(routePath, target) {
  const parts = routePath.split('/').filter(Boolean);
  const wanted = target.split('/').filter(Boolean);
  if (parts.length !== wanted.length) return false;
  return parts.every((part, index) => part.startsWith(':') || wanted[index] === ':param' || part === wanted[index]);
}

// --- G. no way out of the flow except forward -------------------------------
const FORBIDDEN_EXITS = [
  ['/scenario-menu', '返回情境選單'],
  ['/ar-scan', '返回掃描 (that is the quiz\'s job, not this screen\'s)'],
  ['/language', '回首頁'],
];
for (const path of systemPages) {
  const code = codeByPath.get(path) ?? '';
  for (const [route, what] of FORBIDDEN_EXITS) {
    if (code.includes(route)) violations.push(`${path}: links to ${route} (${what}) - the Outcome flow only goes forward`);
  }
  for (const banned of ['restart', 'Restart', '再玩一次', '重新開始', '體驗另一', '完整分析', '五項評估', '個人化分析', '核心教育重點', '進行關鍵判斷']) {
    if (code.includes(banned)) violations.push(`${path}: contains "${banned}", which the Outcome System does not offer`);
  }
}

// --- H. one owner for the ten artworks --------------------------------------
const mascots = codeByPath.get(MASCOTS) ?? '';
if (!mascots) violations.push(`${MASCOTS}: the artwork registry is missing`);
const pairs = [...mascots.matchAll(/^\s{4}(\w+):\s*base\(/gm)].length;
if (pairs !== 10) violations.push(`${MASCOTS}: declares ${pairs} outcome artworks - there are exactly ten (five scenarios x two outcomes)`);
for (const [path, source] of sourceByPath) {
  if (path === MASCOTS || path.endsWith('.css')) continue;
  if (/images\/results\//.test(stripComments(source))) {
    violations.push(`${path}: names an ending-artwork path - ${MASCOTS} is the only owner of those URLs`);
  }
  if (path.startsWith(OUTCOME_DIR)) continue;
  if (/\bRESULT_MASCOTS\b/.test(stripComments(source))) {
    violations.push(`${path}: reads RESULT_MASCOTS - a Scenario names its outcome, and the Outcome System resolves the artwork`);
  }
}

// --- I. the 反詐小測驗 has one owner too -------------------------------------
//
// The flow does not stop at 詐騙疑點分析: it continues into the 反詐小測驗, and
// that screen is a shared component - components/ui/ScenarioFinalDecision.jsx -
// exactly like the two before it. The five pages/scenarioNN/Quiz.jsx are
// wrappers around it: they supply the question, the two options, which one is
// correct and the explanation, and they render the shared component with
// nothing around it.
//
// Rules B-D are what stop a Scenario taking the結局 back. Nothing was stopping
// it taking the 小測驗 back - the five wrappers are clean today by convention
// alone - and this section is that missing fence. What it claims is UI,
// interaction and styling. Data ownership deliberately stays where it is: a
// wrapper still owns its own copy, its own options and its own correctIndex.
const QUIZ_COMPONENT = 'components/ui/ScenarioFinalDecision.jsx';
const QUIZ_CSS = 'components/ui/ScenarioFinalDecision.css';

const EXPECTED_QUIZ_PAGES = [
  'pages/scenario01/Quiz.jsx',
  'pages/scenario02/Quiz.jsx',
  'pages/scenario03/Quiz.jsx',
  'pages/scenario04/Quiz.jsx',
  'pages/scenario05/Quiz.jsx',
];
// Derived the same way the outcome and analysis pages are: by what a page
// renders, never by what it is called.
const quizPages = scenarioPages.filter((path) => renders(path, 'ScenarioFinalDecision'));
if (!sameSet(quizPages, EXPECTED_QUIZ_PAGES)) {
  violations.push(`the set of pages rendering ScenarioFinalDecision changed: expected ${EXPECTED_QUIZ_PAGES.join(', ')}, found ${quizPages.join(', ') || '(none)'}`);
}
// ...and nothing outside those five may reach for the component at all, so a
// second 小測驗 UI cannot be assembled somewhere else in the tree and quietly
// become the one a scenario ends on.
for (const path of codeByPath.keys()) {
  if (path.endsWith('.css') || path === QUIZ_COMPONENT || EXPECTED_QUIZ_PAGES.includes(path)) continue;
  for (const specifier of importsOf(path)) {
    if (/(?:^|\/)ScenarioFinalDecision(?:\.jsx?)?$/.test(specifier)) {
      violations.push(`${path}: imports the shared 反詐小測驗 - the five pages/scenarioNN/Quiz.jsx wrappers are its only consumers`);
    }
  }
}

// The props a wrapper may pass. Everything a Scenario legitimately owns is
// here: its question, its two options, which one is correct, its explanation,
// and where 返回掃描 leads. Anything else - a className, a theme, an onAnswer
// that grows a second lock-in - is the component's side of the line. Adding to
// this list is a deliberate act, which is the point of it being a list.
const ALLOWED_QUIZ_PROPS = ['t', 'question', 'options', 'correctIndex', 'explanation', 'backTo'];
const REQUIRED_QUIZ_PROPS = ['question', 'options', 'correctIndex', 'explanation'];

// Identifiers a wrapper must not use. Between them they are every way the
// wrappers could grow the things the shared component already owns: the stage
// class an App paints its world with, the router the single CTA already uses,
// React state (an answer lock-in is state), and the AR Interaction Contract -
// the quiz declares its own dual/single geometry, and two declarations for one
// screen is exactly what the Gesture Bridge must never see.
const BANNED_QUIZ_IDENTIFIERS = [
  'useStageClassName', 'useARInteraction', 'useNavigate', 'useState', 'useReducer',
  'useEffect', 'useLayoutEffect', 'useRef', 'createPortal', 'surfaceId', 'data-gesture',
];

for (const path of quizPages) {
  const code = codeByPath.get(path) ?? '';

  // B, restated for the quiz: no simulation shell follows the player here
  // either. Same two directions as an outcome page - a component out of an
  // App module, or one of the in-scenario frames - because the 反詐小測驗 is
  // one screen shown identically in all five scenarios, not five reskins.
  for (const specifier of importsOf(path)) {
    if (/(?:^|\/)apps\//.test(specifier)) {
      for (const name of importedNames(path, specifier)) {
        if (/^[A-Z]/.test(name) && !/^[A-Z0-9_]+$/.test(name)) {
          violations.push(`${path}: imports the component ${name} from the App module "${specifier}" - the 反詐小測驗 looks the same in all five scenarios`);
        }
      }
    }
    for (const frame of BANNED_FRAMES) {
      if (new RegExp(`(?:^|/)${frame}(?:\\.jsx?)?$`).test(specifier)) {
        violations.push(`${path}: imports ${frame} - the 反詐小測驗 looks the same in all five scenarios`);
      }
    }
  }
  for (const [, names] of code.matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
    for (const name of names.split(',').map((value) => value.trim().split(/\s+as\s+/)[0])) {
      if (BANNED_FRAMES.includes(name)) violations.push(`${path}: imports ${name} - the 反詐小測驗 looks the same in all five scenarios`);
    }
  }
  for (const frame of BANNED_FRAMES) {
    if (renders(path, frame)) violations.push(`${path}: renders <${frame}> - the 反詐小測驗 looks the same in all five scenarios`);
  }
  for (const identifier of BANNED_QUIZ_IDENTIFIERS) {
    if (new RegExp(`\\b${identifier.replace(/-/g, '\\-')}\\b`).test(code)) {
      violations.push(`${path}: uses ${identifier} - ${QUIZ_COMPONENT} owns this screen's shell, its one route out, its answer lock-in and its AR Interaction Contract`);
    }
  }

  // C, restated: the shared component takes no class hook, so any className
  // on this page is a Scenario dressing the quiz - and any stylesheet it
  // imports is a second place the quiz gets styled from.
  if (/className\s*=/.test(code)) {
    violations.push(`${path}: sets a className - ${QUIZ_COMPONENT} owns this screen's markup and styling`);
  }
  for (const specifier of importsOf(path)) {
    if (specifier.endsWith('.css')) {
      violations.push(`${path}: imports the stylesheet "${specifier}" - ${QUIZ_CSS} is the 反詐小測驗's only stylesheet`);
    }
  }

  // A wrapper renders the shared component and nothing else: no <div> around
  // it, no fragment holding it and a second thing, no option buttons of its
  // own, no second CTA. One element, once.
  const elements = [...code.matchAll(/<([A-Za-z][\w.]*)[\s/>]/g)].map((match) => match[1]);
  const foreign = [...new Set(elements.filter((name) => name !== 'ScenarioFinalDecision'))];
  if (foreign.length) {
    violations.push(`${path}: renders ${foreign.map((name) => `<${name}>`).join(', ')} - a Quiz wrapper renders <ScenarioFinalDecision> and nothing around it`);
  }
  if (/<>|<\/>|<(?:React\.)?Fragment[\s/>]/.test(code)) {
    violations.push(`${path}: wraps the 反詐小測驗 in a fragment - a Quiz wrapper renders <ScenarioFinalDecision> and nothing around it`);
  }
  const rendered = elements.filter((name) => name === 'ScenarioFinalDecision').length;
  if (rendered !== 1) {
    violations.push(`${path}: renders the 反詐小測驗 ${rendered} times - it is one question, asked once`);
  }

  const props = quizProps(path);
  for (const name of props) {
    if (!ALLOWED_QUIZ_PROPS.includes(name)) {
      violations.push(`${path}: passes "${name}" to the 反詐小測驗 - a Quiz wrapper supplies ${ALLOWED_QUIZ_PROPS.join(', ')} and nothing else`);
    }
  }
  for (const name of REQUIRED_QUIZ_PROPS) {
    if (!props.includes(name)) violations.push(`${path}: does not pass "${name}" - the question, its options, its answer and its explanation are the wrapper's job`);
  }
  // backTo is a route like any other in this flow, so it is held to the same
  // rule: it must be a route routes.jsx actually registers.
  for (const target of routeTargets(path)) {
    if (!routeExists(target)) violations.push(`${path}: its 返回掃描 goes to ${target}, which routes.jsx does not register`);
  }
}

// The attribute names one `<ScenarioFinalDecision ... />` element passes, read
// off the element itself rather than off the whole file: a prop name is only a
// prop at the tag's own brace depth, so `correctIndex` inside a value (Scenario
// 03 passes `k.correctIndex`) is not mistaken for a second attribute.
function quizProps(path) {
  const code = codeByPath.get(path) ?? '';
  const at = code.indexOf('<ScenarioFinalDecision');
  if (at === -1) return [];
  const names = [];
  let index = at + '<ScenarioFinalDecision'.length;
  let depth = 0;
  let buffer = '';
  while (index < code.length) {
    const character = code[index];
    if (character === '"' || character === "'" || character === '`') {
      index += 1;
      while (index < code.length && code[index] !== character) index += code[index] === '\\' ? 2 : 1;
      index += 1;
      buffer = '';
      continue;
    }
    if ('{[('.includes(character)) { depth += 1; index += 1; continue; }
    if ('}])'.includes(character)) { depth -= 1; index += 1; continue; }
    if (depth === 0 && character === '>') break;
    if (depth === 0) {
      if (character === '=') {
        const name = buffer.trim().match(/([\w:-]+)$/);
        if (name) names.push(name[1]);
        buffer = '';
      } else buffer += character;
    }
    index += 1;
  }
  return names;
}

// --- J. one owner for the 反詐小測驗's class namespace -----------------------
//
// `.cibar-*` is fenced off for the Outcome System in rule C. The quiz's own
// three families - `.antifraud-quiz-*`, `.quiz-option`, `.quiz-explain` - had
// no such fence, which made them the last classes in this flow a scenario
// stylesheet could still redeclare or override: they were global.css's until
// they moved into the component's own sheet, and nothing recorded that the
// move was permanent.
//
// A genuine second shared quiz stylesheet joins QUIZ_STYLESHEETS deliberately.
// A scenario stylesheet is not one.
const QUIZ_STYLESHEETS = [QUIZ_CSS];
const QUIZ_CLASSES = /(antifraud-quiz[\w-]*|quiz-option[\w-]*|quiz-explain[\w-]*)/;
const quizSelectors = new RegExp(`\\.${QUIZ_CLASSES.source}`, 'g');
const quizClassNames = new RegExp(`\\b${QUIZ_CLASSES.source}`, 'g');

const quizClasses = new Set();
for (const path of QUIZ_STYLESHEETS) {
  const source = sourceByPath.get(path);
  if (source === undefined) {
    violations.push(`${path}: the 反詐小測驗's stylesheet is missing`);
    continue;
  }
  for (const [, name] of stripCssComments(source).matchAll(quizSelectors)) quizClasses.add(name);
}
if (quizClasses.size < 6) {
  violations.push(`${QUIZ_CSS}: only ${quizClasses.size} quiz classes were read out of it - the scan is no longer matching them`);
}
for (const [path, source] of sourceByPath) {
  if (!path.endsWith('.css') || QUIZ_STYLESHEETS.includes(path)) continue;
  for (const [, name] of stripCssComments(source).matchAll(quizSelectors)) {
    violations.push(`${path}: declares .${name}, which the 反詐小測驗 owns - its styling lives in ${QUIZ_CSS}`);
  }
}
// The markup half of the same rule: only the shared component may put those
// classes on an element. A second quiz UI cannot borrow the look either.
for (const [path, source] of sourceByPath) {
  if (path.endsWith('.css') || path === QUIZ_COMPONENT) continue;
  for (const [, name] of stripComments(source).matchAll(quizClassNames)) {
    violations.push(`${path}: names "${name}" - ${QUIZ_COMPONENT} is the only renderer of the 反詐小測驗's markup`);
  }
}
const componentClasses = new Set(
  [...stripComments(sourceByPath.get(QUIZ_COMPONENT) ?? '').matchAll(quizClassNames)].map(([, name]) => name),
);
if (componentClasses.size < 4) {
  violations.push(`${QUIZ_COMPONENT}: only ${componentClasses.size} quiz classes were read out of its markup - the scan is no longer matching them`);
}

// --- K. the state modifiers that carry no namespace of their own ------------
//
// Rules C and J own four prefixes between them - `.cibar-*`, `.antifraud-quiz-*`,
// `.quiz-option*`, `.quiz-explain*` - which is every class the Ending System
// renders except its state modifiers. Those carry no prefix at all: the
// emphasised amount row of a結局 is `.is-emphasis`, and an answered quiz option
// is `.correct` or `.wrong`. Each is styled only compounded onto a class that
// IS owned (`.cibar-outcome-amounts .is-emphasis`, `.quiz-option.correct`), so
// they read as covered - but nothing stopped a second stylesheet from
// declaring the bare class, and a bare declaration reaches the same element.
//
// Derived, not listed: whatever the three Ending stylesheets declare that no
// prefix above already owns is a modifier, so one added tomorrow is covered
// the day it is added.
//
// The declaration is the half that is claimed. The markup half is deliberately
// not extended here: these are ordinary English words - `correct` and `wrong`
// both appear in three translation dictionaries - so a fence on the name would
// flag copy, and it would buy nothing, because a modifier only ever does
// anything while it sits on an element rules C and J already own.
const ENDING_STYLESHEETS = [`${OUTCOME_DIR}ScenarioOutcome.css`, `${OUTCOME_DIR}FraudClueAnalysis.css`, QUIZ_CSS];
const PREFIX_OWNED = /^(?:cibar-|antifraud-quiz|quiz-option|quiz-explain)/;
// `url(./x.webp)` is not a selector, so its payload goes before the scan does.
const selectorsOnly = (css) => stripCssComments(css).replace(/url\([^)]*\)/g, ' ');
const anyClass = /\.([A-Za-z_][\w-]*)/g;

const endingModifiers = new Set();
for (const path of ENDING_STYLESHEETS) {
  const source = sourceByPath.get(path);
  if (source === undefined) {
    violations.push(`${path}: an Ending System stylesheet is missing`);
    continue;
  }
  for (const [, name] of selectorsOnly(source).matchAll(anyClass)) {
    if (!PREFIX_OWNED.test(name)) endingModifiers.add(name);
  }
}
if (endingModifiers.size < 3) {
  violations.push(`the Ending System's stylesheets declare ${endingModifiers.size} state modifiers - the scan is no longer matching them`);
}
for (const [path, source] of sourceByPath) {
  if (!path.endsWith('.css') || ENDING_STYLESHEETS.includes(path)) continue;
  for (const [, name] of selectorsOnly(source).matchAll(anyClass)) {
    if (endingModifiers.has(name)) {
      violations.push(`${path}: declares .${name}, a state class the Ending System renders - its styling lives with the component that renders it`);
    }
  }
}

// --- L. the Ending System's shell stays neutral ------------------------------
//
// The stage element AppShell owns carries one extra class at a time, set by
// whatever screen is mounted (shell/StageClassContext.jsx), and that class is
// how a Scenario paints an App's world onto the shell - `bition-stage`,
// `blackpi-stage`, `go-stage`. Rules B and I already stop the fifteen Ending
// pages calling for one. Nothing stopped the three shared components
// themselves, or anything they render, and a stage class set from in there
// would repaint all five scenarios' 結局 at once.
//
// So the fence covers the whole Ending System: the pages, the three shared
// components, and every module inside src/ those three reach. Their import
// graph is small and entirely theirs - copy, artwork, the interaction contract
// - which is what makes closing over it meaningful rather than dragging in
// half the app.
//
// `ar-stage` is banned as a bare string too: the context is one way to the
// stage element, and finding it by its class is the other.
const STAGE_IDENTIFIERS = ['useStageClassName', 'StageClassContext', 'StageClassProvider', 'ar-stage'];

// The module a relative import resolves to, the way Vite would.
//
// The candidate list has to cover every extension collect() reads - it reads
// `[jt]sx?`, so TypeScript too - or the closure below silently stops at an
// extensionless import. `import './helper'` next to a `helper.ts` resolved to
// nothing, the traversal treated that edge as absent, and whatever the module
// went on to reach was never checked: the fence passed by not looking. Vite
// resolves .ts/.tsx the same way it resolves .js/.jsx, and so does this.
function resolveImport(from, specifier) {
  if (!specifier.startsWith('.')) return null;
  const parts = from.split('/').slice(0, -1);
  for (const step of specifier.split('/')) {
    if (step === '.') continue;
    else if (step === '..') parts.pop();
    else parts.push(step);
  }
  const base = parts.join('/');
  // A file beats a directory, exactly as before: every `base.<ext>` is tried
  // ahead of every `base/index.<ext>`.
  const extensions = ['.js', '.jsx', '.ts', '.tsx'];
  const candidates = [
    base,
    ...extensions.map((extension) => `${base}${extension}`),
    ...extensions.map((extension) => `${base}/index${extension}`),
  ];
  for (const candidate of candidates) {
    if (codeByPath.has(candidate)) return candidate;
  }
  return null;
}

const SHARED_ENDING_COMPONENTS = [OUTCOME_COMPONENT, ANALYSIS_COMPONENT, QUIZ_COMPONENT];
const endingSystem = new Set([...systemPages, ...quizPages, ...SHARED_ENDING_COMPONENTS]);
const pending = [...SHARED_ENDING_COMPONENTS];
while (pending.length) {
  const path = pending.pop();
  for (const specifier of importsOf(path)) {
    const resolved = resolveImport(path, specifier);
    if (resolved && !resolved.endsWith('.css') && !endingSystem.has(resolved)) {
      endingSystem.add(resolved);
      pending.push(resolved);
    }
  }
}
for (const path of [...endingSystem].sort()) {
  for (const identifier of STAGE_IDENTIFIERS) {
    if (new RegExp(`\\b${identifier.replace(/-/g, '\\-')}\\b`).test(codeByPath.get(path) ?? '')) {
      violations.push(`${path}: names ${identifier} - the Ending System keeps its own neutral surface, and no scenario or App may put a stage class on it`);
    }
  }
}

// --- the components keep owning what they own -------------------------------
if (!(codeByPath.get(OUTCOME_COMPONENT) ?? '').includes("import './ScenarioOutcome.css'")) {
  violations.push(`${OUTCOME_COMPONENT}: does not import its own stylesheet`);
}
if (!(codeByPath.get(ANALYSIS_COMPONENT) ?? '').includes("import './FraudClueAnalysis.css'")) {
  violations.push(`${ANALYSIS_COMPONENT}: does not import its own stylesheet`);
}
if (!(codeByPath.get(QUIZ_COMPONENT) ?? '').includes("import './ScenarioFinalDecision.css'")) {
  violations.push(`${QUIZ_COMPONENT}: does not import its own stylesheet`);
}
// The status vocabulary and both CTAs are the system's, not a Scenario's, so
// no Scenario page may spell them at all.
for (const path of systemPages) {
  for (const owned of ['詐騙成立', '成功反詐', '查看詐騙疑點分析', '詐騙疑點分析', '進行反詐小測驗', '請記住']) {
    if ((codeByPath.get(path) ?? '').includes(owned)) {
      violations.push(`${path}: spells "${owned}" - the Outcome System owns that label (components/outcome/outcomeStrings.js)`);
    }
  }
}

if (violations.length) { console.error(violations.join('\n')); process.exit(1); }
console.log(`Outcome ownership OK (${outcomePages.length} outcome pages, ${analysisPages.length} analysis pages, ${quizPages.length} quiz pages, ${pairs} artworks, ${quizClasses.size} shared quiz classes).`);
