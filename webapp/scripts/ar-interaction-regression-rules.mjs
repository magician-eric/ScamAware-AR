import fs from 'node:fs';
import path from 'node:path';
import { scanSource } from './ar-interaction-audit-lib.mjs';

const ALL_CONTROL_TYPES = ['button', 'link', 'input', 'Link', 'NavLink', 'role=button', 'tabIndex={0}', 'onClick', 'onSubmit'];
const CHROME_CONTROL_TYPES = ['button', 'link', 'Link', 'NavLink', 'role=button', 'tabIndex={0}', 'onClick', 'onSubmit'];

export const REGRESSION_RULES = Object.freeze([
  { file: 'src/apps/gugo-invest/app/pages/onboarding/Register.tsx', contexts: ['Register'], types: ['input'], label: 'GuGo Register must not expose editable inputs' },
  { file: 'src/apps/gugo-invest/app/components/layout/BottomNav.tsx', types: ALL_CONTROL_TYPES, label: 'GuGo Footer must not expose navigation controls' },
  { file: 'src/apps/gugo-invest/app/components/ui/StockRow.tsx', contexts: ['StockRow'], types: ['button', 'role=button', 'tabIndex={0}', 'onClick'], label: 'GuGo StockRow must remain visual-only' },
  ...[
    'pages/Account.tsx', 'pages/Markets.tsx', 'pages/Portfolio.tsx', 'pages/StockDetail.tsx',
    'components/ui/LanguageSwitcher.tsx', 'components/layout/TopBar.tsx',
  ].map((suffix) => ({
    file: `src/apps/gugo-invest/app/${suffix}`,
    types: ALL_CONTROL_TYPES,
    patterns: [/\buseNavigate\b/, /\bnavigate\s*\(/, /\bon(?:Back|Navigate|Navigation|TabChange)\s*=/, /\bsetTab\s*\(/],
    label: `GuGo ${path.basename(suffix, path.extname(suffix))} must not expose non-story interactions`,
  })),
  { file: 'src/apps/meetu/components/MeetUHeader.jsx', types: ['button', 'tabIndex={0}', 'onClick'], label: 'MeetU Header message/profile icons must remain display-only' },
  { file: 'src/apps/meetu/components/MeetUBottomNav.jsx', types: CHROME_CONTROL_TYPES, patterns: [/\buseNavigate\b/, /\bnavigate\s*\(/, /\bon(?:Navigate|Navigation|TabChange)\s*=/, /\bset(?:Active)?Tab\s*\(/], label: 'MeetU BottomNav must not navigate' },
  { file: 'src/apps/coin-winner/PlatformHome.jsx', types: ['button', 'role=button', 'tabIndex={0}', 'onClick'], patterns: [/\bsetTab\s*\(/, /\bon(?:Navigate|Navigation|TabChange)\s*=/], label: 'Coin Winner header and BottomNav must remain display-only' },
  { file: 'src/pages/scenario01/Feed.jsx', types: ['button', 'role=button', 'tabIndex={0}', 'onClick'], label: 'Scenario 01 Facebook action bar must remain display-only' },
  { file: 'src/apps/mydondon/components/MyDonDonHeader.jsx', types: CHROME_CONTROL_TYPES, label: 'Scenario 05 MyDonDon Header search/notification icons must remain display-only' },
  { file: 'src/pages/scenario05/components/BrowserChrome.jsx', types: CHROME_CONTROL_TYPES, patterns: [/\buseNavigate\b/, /\bnavigate\s*\(/, /\bon(?:Back|Menu|Navigate|Navigation)\s*=/], label: 'Scenario 05 BrowserChrome back/menu chrome must remain display-only' },
  { file: 'src/apps/mydondon/components/MyDonDonBottomNav.jsx', types: CHROME_CONTROL_TYPES, label: 'MyDonDon Footer tabs must remain visual-only' },
  { file: 'src/apps/blackpi/components/BottomNav.jsx', types: CHROME_CONTROL_TYPES, patterns: [/\buseNavigate\b/, /\bnavigate\s*\(/, /\bonSelectTab\b/, /\bon(?:Navigate|Navigation|TabChange)\s*=/, /\bset(?:Active)?Tab\s*\(/, /\bto:/], label: 'BlackPi Footer tabs (首頁/分類/訊息/訂單/我的) must remain visual-only' },
  { file: 'src/apps/blackpi/components/PhoneShell.jsx', types: CHROME_CONTROL_TYPES, patterns: [/\bonSelectTab\b/, /\buseNavigate\b/, /\bnavigate\s*\(/], label: 'BlackPi PhoneShell must not hand the footer a tab handler' },
  { file: 'src/apps/blackpi/screens/Home.jsx', types: [], patterns: [/\bonOpenSearch\b/, /\bonSelectTab\b/, /<button[^>]*bp-searchbar/s, /<input\b/], label: 'BlackPi 首頁 search pill and header chrome must remain visual-only' },
  { file: 'src/apps/blackpi/screens/Search.jsx', types: [], patterns: [/<button[^>]*bp-searchbar/s, /<input\b/], label: 'BlackPi 搜尋 search pill must remain visual-only' },
  { file: 'src/apps/blackpi/screens/SearchResults.jsx', types: [], patterns: [/<button[^>]*bp-searchbar/s, /<input\b/], label: 'BlackPi 搜尋結果 search pill must remain visual-only' },
  { file: 'src/apps/line/components/Line.jsx', contexts: ['LineHeader'], types: ['link', 'Link', 'NavLink'], label: 'LINE shared back must not navigate' },
  { file: 'src/pages/scenario03/components/Subtitle.jsx', contexts: ['Subtitle'], types: ['button', 'role=button', 'tabIndex={0}', 'onClick'], label: 'Scenario 03 Subtitle must remain visual-only' },
]);

export function evaluateRegressionRule(source, rule) {
  const findings = scanSource(source, rule.file).filter((finding) =>
    rule.types.includes(finding.interactionType)
    && (!rule.contexts || rule.contexts.includes(finding.context)));
  const patterns = (rule.patterns || []).filter((pattern) => pattern.test(source));
  return [
    ...findings.map((item) => `${item.interactionType}@${item.line}`),
    ...patterns.map((pattern) => `source pattern ${pattern}`),
  ];
}

export function runRegressionGuard(webappRoot) {
  for (const rule of REGRESSION_RULES) {
    const source = fs.readFileSync(path.join(webappRoot, rule.file), 'utf8');
    const failures = evaluateRegressionRule(source, rule);
    if (failures.length) throw new Error(`${rule.label}: ${failures.join(', ')}`);
  }

  const sourceRoot = path.join(webappRoot, 'src');
  const lineSource = fs.readFileSync(path.join(sourceRoot, 'apps/line/components/Line.jsx'), 'utf8');
  if (!/showBack\s*&&\s*<span\b[^>]*aria-hidden=["']true["']/.test(lineSource)) {
    throw new Error('LINE shared back must remain a non-interactive, aria-hidden span.');
  }

  const buyerChat = fs.readFileSync(path.join(sourceRoot, 'pages/scenario05/BuyerChat.jsx'), 'utf8');
  const chatScreenTag = buyerChat.match(/<ChatScreen\b[\s\S]*?\/>/)?.[0] || '';
  if (!chatScreenTag || /\b(?:onBack|showBack|backHandler)\s*=/.test(chatScreenTag)) {
    throw new Error('Scenario 05 BuyerChat Header back must not receive a navigation handler.');
  }

  // BlackPi's footer: five tabs, every one of them a handler-less, aria-hidden
  // <div>. The rule above bans the control semantics; this bans the shape they
  // would come back in, because a <div onClick> is not a `button` finding.
  const blackPiNav = fs.readFileSync(path.join(sourceRoot, 'apps/blackpi/components/BottomNav.jsx'), 'utf8');
  if (!/<div\b[^>]*className=\{`bp-nav-btn\$\{isActive \? ' active' : ''\}`\}[\s\S]*?aria-hidden="true"/.test(blackPiNav)) {
    throw new Error('BlackPi Footer tabs must stay aria-hidden <div>s, not controls.');
  }
  if (/BottomNav\(\{[^}]*,/.test(blackPiNav)) {
    throw new Error('BlackPi BottomNav takes only `active` - a second prop is a handler coming back.');
  }
  for (const [file, what] of [
    ['apps/blackpi/screens/Home.jsx', '首頁'],
    ['apps/blackpi/screens/Search.jsx', '搜尋'],
    ['apps/blackpi/screens/SearchResults.jsx', '搜尋結果'],
  ]) {
    const source = fs.readFileSync(path.join(sourceRoot, file), 'utf8');
    const bar = source.match(/<[A-Za-z]+\b[^>]*className="bp-searchbar[^"]*"[^>]*>/);
    if (!bar) throw new Error(`BlackPi ${what} no longer draws a search bar this guard can read.`);
    if (!bar[0].startsWith('<div') || !/\bis-decorative\b/.test(bar[0])) {
      throw new Error(`BlackPi ${what} search bar must be an inert .is-decorative <div>, found: ${bar[0]}`);
    }
  }

  const orders = fs.readFileSync(path.join(sourceRoot, 'apps/mydondon/screens/MyDonDonOrders.jsx'), 'utf8');
  const ordersHeader = orders.match(/<header\b[\s\S]*?<\/header>/)?.[0] || '';
  if (!ordersHeader || scanSource(ordersHeader).some((item) => CHROME_CONTROL_TYPES.includes(item.interactionType))) {
    throw new Error('Scenario 05 MyDonDonOrders Header back must remain display-only.');
  }
  if (!/<button\b[^>]*onClick=\{onBack\}[^>]*>[\s\S]*?返回對話[\s\S]*?<\/button>/.test(orders)) {
    throw new Error('Scenario 05 MyDonDonOrders must retain the explicit 返回對話 CTA.');
  }
}
