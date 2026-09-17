// Text a player is meant to read must not be hidden by the stylesheet.
//
// Two defects this suite exists to stop coming back, both found by measuring
// the running app rather than by reading the CSS:
//
//   1. Nine `-webkit-line-clamp` rules were cutting story copy once the type
//      scale made it readable - the scammed product's own name needed 126px of
//      line box inside a 76px one at en/320, and a choice button clipped is a
//      decision made blind. They were removed; this stops them returning.
//
//   2. `.line-website-card-domain` ellipsised `secure.haowei-bank.tw` at
//      en/320 (143px of text in a 132px box). That address is the evidence
//      Scenario 03 teaches the player to look at, so losing its tail is losing
//      the lesson.
//
// Source-level on purpose, like the rest of scripts/: it cannot measure a
// rendered box, but it can pin the decision, and a source check is what a CI
// run can afford on every push. The measurements behind it live in the PR.
//
// What this does NOT cover, deliberately: a simulated browser's address bar
// (`.wb-domain`, `.pol-web-domain`) and a simulated OS notification
// (`.md-push-*`) truncate the way the real things do, and were measured to fit
// their content anyway. BlackPi's decorative search hint is `aria-hidden`,
// inert chrome pinned by scripts/blackpi-inert-chrome.test.mjs, and was already
// truncated before the type scale existed.
//
// Run: npm run test:player-read-text
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

const SRC = new URL('../src/', import.meta.url).pathname;

async function cssFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await cssFiles(path));
    else if (entry.name.endsWith('.css')) out.push(path);
  }
  return out;
}

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ');

// Every `selector { ... }` block in the tree, comments removed.
async function rules() {
  const found = [];
  for (const file of await cssFiles(SRC)) {
    const css = stripComments(await readFile(file, 'utf8'));
    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      found.push({ file: file.replace(SRC, ''), selector: match[1].trim().replace(/\s+/g, ' '), body: match[2] });
    }
  }
  return found;
}

// Classes whose text is story, a choice the player picks from, a fraud warning,
// or the evidence a scenario teaches. Not an exhaustive list of readable text -
// it is the set that has actually been caught being cut.
const PLAYER_READ = [
  'bp-pdp-title', 'bp-product-name', 'bp-compact-name', 'bp-product-msg-name', 'bp-choice-btn',
  'line-website-card-title', 'line-website-card-desc', 'line-website-card-domain',
  'md-link-card-title', 'pol-headsup-message', 'meetu-profile-bio',
];

const hasClamp = (body) => /(?:-webkit-)?line-clamp\s*:\s*(?!none)/.test(body);
const hasEllipsis = (body) => /text-overflow\s*:\s*ellipsis/.test(body);

test('no clamp hides story, option, warning or evidence text', async () => {
  const offenders = (await rules())
    .filter((rule) => hasClamp(rule.body))
    .filter((rule) => PLAYER_READ.some((name) => rule.selector.includes(`.${name}`)))
    .map((rule) => `${rule.file}: ${rule.selector}`);
  assert.deepEqual(offenders, [], 'a clamp on this text means the player reads only part of it');
});

test('the fake bank address is never ellipsised away', async () => {
  const offenders = (await rules())
    .filter((rule) => rule.selector.includes('.line-website-card-domain'))
    .filter((rule) => hasEllipsis(rule.body) || /white-space\s*:\s*nowrap/.test(rule.body))
    .map((rule) => `${rule.file}: ${rule.selector}`);
  assert.deepEqual(offenders, [], 'the domain on a LINE link card is evidence, and must wrap rather than truncate');
});

// A FraudWarningBanner handed to a LINE conversation as `bodyBefore` is asking
// to sit ABOVE the conversation. Without `inline` the component portals itself
// to <body> and becomes a fixed overlay instead, painting over the chat it was
// placed in front of - measured on Scenario 01's VIP group at en/320, where it
// covered the group name and three messages.
test('a banner placed before a conversation renders in flow, not over it', async () => {
  const offenders = [];
  for (const file of await jsxFiles(SRC)) {
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/bodyBefore=\{(<FraudWarningBanner[\s\S]*?\/>)\}/g)) {
      if (!/\binline\b/.test(match[1])) offenders.push(file.replace(SRC, ''));
    }
  }
  assert.deepEqual(offenders, [], 'add `inline`, or the banner floats over the conversation it was put in front of');
});

async function jsxFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await jsxFiles(path));
    else if (/\.[jt]sx$/.test(entry.name)) out.push(path);
  }
  return out;
}
