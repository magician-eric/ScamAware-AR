import fs from 'node:fs';
import path from 'node:path';
import { findKnownException } from './ar-interaction-known-exceptions.mjs';

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const TAG_TYPES = new Map([
  ['button', 'button'], ['a', 'link'], ['input', 'input'], ['select', 'input'],
  ['textarea', 'input'], ['Link', 'Link'], ['NavLink', 'NavLink'],
]);
const ATTRIBUTE_TYPES = [
  { pattern: /\brole\s*=\s*(?:["']button["']|\{["']button["']\})/, type: 'role=button' },
  { pattern: /\btabIndex\s*=\s*\{\s*0\s*\}/, type: 'tabIndex={0}' },
  { pattern: /\bonClick\s*=/, type: 'onClick' },
  { pattern: /\bonSubmit\s*=/, type: 'onSubmit' },
];

function lineNumberAt(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

function contextAt(source, offset, fallback = 'module scope') {
  const prefix = source.slice(0, offset);
  const definitions = [...prefix.matchAll(/(?:export\s+)?(?:async\s+)?function\s+([A-Z][\w$]*)|(?:export\s+)?const\s+([A-Z][\w$]*)\s*=\s*(?:\([^)]*\)|[\w$]+)\s*=>/g)];
  const match = definitions.at(-1);
  return match ? (match[1] || match[2]) : fallback;
}

function classification(type, openingTag) {
  if (type === 'input') return { classification: 'input risk', reason: 'Editable/form control can capture player input.' };
  if (['link', 'Link', 'NavLink'].includes(type) || /\b(?:href|to)\s*=/.test(openingTag)) {
    return { classification: 'navigation risk', reason: 'Link-like control can change location.' };
  }
  if (/\b(?:next|continue|choice|answer|submit|cta|primary)\b/i.test(openingTag)) {
    return { classification: 'likely story control', reason: 'Control naming suggests a story action; contract correctness is not inferred.' };
  }
  if (/\b(?:icon|tab|nav|search|menu|footer|header)\b/i.test(openingTag)) {
    return { classification: 'likely visual-only risk', reason: 'App-chrome styling may expose interaction semantics.' };
  }
  return { classification: 'unknown/manual review', reason: 'MANUAL REVIEW: source alone does not establish story intent.' };
}

export function scanSource(source, file = 'fixture.jsx') {
  const findings = [];
  // Opening JSX tags are bounded at `>` while tolerating quoted strings and JSX expressions.
  const tagPattern = /<([A-Za-z][\w.:$-]*)(?=\s|\/?>)(?:"[^"]*"|'[^']*'|\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|[^>'"])*?>/gs;
  for (const match of source.matchAll(tagPattern)) {
    const tag = match[1];
    const openingTag = match[0];
    const offset = match.index;
    const context = contextAt(source, offset);
    const candidates = [];
    if (TAG_TYPES.has(tag)) candidates.push(TAG_TYPES.get(tag));
    for (const attribute of ATTRIBUTE_TYPES) if (attribute.pattern.test(openingTag)) candidates.push(attribute.type);
    for (const interactionType of candidates) {
      const details = classification(interactionType, openingTag);
      findings.push({ file, context, interactionType, line: lineNumberAt(source, offset), ...details });
    }
  }
  return findings;
}

export function collectSourceFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...collectSourceFiles(absolute));
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name)) && !entry.name.endsWith('.test.js')) files.push(absolute);
  }
  return files.sort();
}

export function auditTree(sourceRoot) {
  const base = path.dirname(sourceRoot);
  return collectSourceFiles(sourceRoot).flatMap((absolute) => {
    const file = path.relative(base, absolute).split(path.sep).join('/');
    return scanSource(fs.readFileSync(absolute, 'utf8'), file).map((finding) => {
      const exception = findKnownException(finding);
      return exception ? { ...finding, status: 'REPORT', exception } : { ...finding, status: 'REVIEW' };
    });
  });
}

export function scenarioFor(file) {
  if (file.includes('/apps/line/')) return 'Shared / LINE';
  const direct = file.match(/(?:pages|data)\/scenario0([1-5])\//)?.[1];
  if (direct) return `Scenario 0${direct}`;
  const appScenario = [['gugo-invest', '01'], ['coin-winner', '02'], ['meetu', '02'], ['blackpi', '04'], ['hpe-logistics', '04'], ['mydondon', '05']]
    .find(([name]) => file.includes(`/apps/${name}/`));
  return appScenario ? `Scenario ${appScenario[1]}` : 'Shared / entry';
}
