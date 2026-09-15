// Renders docs/ar-interaction-phase2-migration.md from the migration
// inventory, so the document and the data cannot say different things. Run
// `npm run docs:ar-interaction-migration` after changing the inventory;
// `npm run test:ar-interaction-migration` fails if the two have drifted.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  AR_MIGRATION_INVENTORY, AR_MIGRATION_EXCLUSIONS, AR_MIGRATION_BLOCKERS,
  AR_MIGRATION_GEOMETRY_EXEMPTIONS,
} from './ar-interaction-migration-inventory.mjs';

const DOC = fileURLToPath(new URL('../../docs/ar-interaction-phase2-migration.md', import.meta.url));

const TITLE = {
  shared: 'Shared（五情境共用）',
  scenario01: 'Scenario 01｜假投資',
  scenario02: 'Scenario 02｜網路交友',
  scenario03: 'Scenario 03｜假檢警',
  scenario04: 'Scenario 04｜購物詐騙',
  scenario05: 'Scenario 05｜幽靈訂單',
};
const ORDER = ['shared', 'scenario01', 'scenario02', 'scenario03', 'scenario04', 'scenario05'];
const cell = (v) => (v === null || v === undefined || v === '' ? '—' : String(v).replaceAll('|', '\\|'));

const counts = {};
for (const row of AR_MIGRATION_INVENTORY) {
  counts[row.scenario] = counts[row.scenario] ?? { display: 0, single: 0, dual: 0 };
  counts[row.scenario][row.mode] += 1;
}
const total = { display: 0, single: 0, dual: 0 };
for (const c of Object.values(counts)) for (const k of Object.keys(total)) total[k] += c[k];

let out = '';
out += '# AR Interaction Contract — Phase 2 Migration Inventory\n\n';
out += 'Phase 2 把五個 Scenario 所有「玩家真正需要操作、會推進劇情」的畫面，全面接到既有的\n';
out += 'AR Interaction Contract（`webapp/src/lib/arInteraction/`）。\n\n';
out += '本文件是 `webapp/scripts/ar-interaction-migration-inventory.mjs` 的人類可讀版本，\n';
out += '兩者由 `npm run test:ar-interaction-migration` 互相比對，不會各自漂移。\n\n';
out += '這一支**沒有**任何手勢辨識：沒有 camera、沒有 MediaPipe、沒有 hand tracking、\n';
out += '沒有佐臻 SDK、沒有 debounce／cooldown，也沒有任何 DOM selector 或 synthetic click。\n';
out += 'Contract 只是用**語意**再說一次畫面本來就有的 handler；觸控行為完全沒有改變。\n\n';
out += '## 契約規則（不變）\n\n';
out += '| 正式劇情操作數 | mode | LEFT | RIGHT |\n| --- | --- | --- | --- |\n';
out += '| 0 | `display` | — | — |\n| 1 | `single` | 不存在 | 唯一操作 |\n| 2 | `dual` | choice[0] | choice[1] |\n| >2 | AR contract violation | — | — |\n\n';
out += '## 總覽\n\n';
out += '| 範圍 | display | single | dual | 合計 |\n| --- | --- | --- | --- | --- |\n';
for (const scenario of ORDER) {
  const c = counts[scenario];
  out += `| ${TITLE[scenario]} | ${c.display} | ${c.single} | ${c.dual} | ${c.display + c.single + c.dual} |\n`;
}
out += `| **合計** | **${total.display}** | **${total.single}** | **${total.dual}** | **${total.display + total.single + total.dual}** |\n\n`;
out += `- migrated story surfaces：**${AR_MIGRATION_INVENTORY.length}**\n`;
out += '- remaining un-migrated story surfaces：**0**（唯二排除項見下方「刻意排除」，並非未完成）\n';
out += `- migrated surfaces with mode = triple / >2 actions：**0**\n`;
out += `- flow-level >2-action story nodes still in the scripts：**${AR_MIGRATION_BLOCKERS.length}**\n\n`;

for (const scenario of ORDER) {
  out += `## ${TITLE[scenario]}\n\n`;
  out += '| Surface | File | surfaceId | Mode | LEFT | RIGHT | Notes |\n';
  out += '| --- | --- | --- | --- | --- | --- | --- |\n';
  for (const row of AR_MIGRATION_INVENTORY.filter((r) => r.scenario === scenario)) {
    out += `| ${cell(row.surface)} | \`${row.file.replace('src/', 'webapp/src/')}\` | \`${row.surfaceId}\` | \`${row.mode}\` | ${cell(row.left)} | ${cell(row.right)} | ${cell(row.notes)} |\n`;
  }
  out += '\n';
}

out += '## 沒有出現的 geometry\n\n';
if (AR_MIGRATION_GEOMETRY_EXEMPTIONS.length === 0) {
  out += '**沒有。** display／single／dual 三種 geometry 在 shared 與五個 Scenario 都出現了。\n';
} else {
  for (const e of AR_MIGRATION_GEOMETRY_EXEMPTIONS) {
    out += `- **${TITLE[e.scenario]} / \`${e.mode}\`**：${e.reason}\n`;
  }
}
out += '\n## 刻意排除（不是未完成）\n\n';
for (const e of AR_MIGRATION_EXCLUSIONS) {
  out += `### ${e.surface}\n\n- File：\`${e.file.replace('src/', 'webapp/src/')}\`\n- 原因：${e.reason}\n\n`;
}
out += '## AR-readiness blocker（劇情層，不是 migration 層）\n\n';
if (AR_MIGRATION_BLOCKERS.length === 0) {
  out += '**沒有。** 五情境已經沒有任何三選一以上的玩家提示——最後一個（`shared.platform.agent.argue.pick`）\n';
  out += '已在本次 migration 一併收成二選一，因此每一個劇情提示在 AR 上都答得出來。\n\n';
  out += '`npm run test:ar-interaction-migration` 對**任何** `>2` 的對話節點都會失敗，沒有例外清單。\n\n';
} else {
  for (const b of AR_MIGRATION_BLOCKERS) {
    out += `### ${b.surface}\n\n`;
    out += `- Scenario：${TITLE[b.scenario]}\n`;
    out += `- Dialogue node：\`${b.node}\`（${b.file.replace('src/', 'webapp/src/')}）\n`;
    out += `- 選項數：${b.optionCount}\n`;
    for (const option of b.options) out += `  - ${option}\n`;
    out += `- Contract 行為：${b.effect}\n`;
    out += `- 說明：${b.note}\n\n`;
  }
}
out += '## 三個 AR 工具的分工\n\n';
out += '| 指令 | 負責 |\n| --- | --- |\n';
out += '| `npm run audit:ar-interactions` | source 層的互動風險盤點 |\n';
out += '| `npm run test:ar-interactions` | 上面那份盤點的回歸守門 |\n';
out += '| `npm run test:gesture-contract` | contract engine 本身的正確性 |\n';
out += '| `npm run test:ar-interaction-migration` | 五情境是否已全面接線（本文件） |\n\n';
out += '## 不在這一支範圍內\n\n';
out += '- Gesture Bridge：尚未開始。\n';
out += '- 佐臻 SDK／Android native／camera／MediaPipe／hand tracking：尚未開始。\n';
out += '- AR scan 圖片辨識引擎（mind-ar detect + match、camera、dataset）：未更動。\n';
out += '- 劇情文案、Outcome UI、Quiz 題目：未更動。\n';
writeFileSync(DOC, out);
console.log(`docs/ar-interaction-phase2-migration.md written (${AR_MIGRATION_INVENTORY.length} surfaces).`);
