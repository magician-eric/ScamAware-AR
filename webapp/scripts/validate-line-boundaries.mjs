import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src/apps/line/', import.meta.url));
async function files(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else result.push(path);
  }
  return result;
}
const forbidden = /(?:pages\/scenario|lib\/(?:scenario0[123]|session|location)|experience\/characters)/;
for (const file of await files(root)) {
  if (!['.js', '.jsx'].includes(extname(file))) continue;
  const source = await readFile(file, 'utf8');
  if (forbidden.test(source)) throw new Error(`LINE boundary violation: ${relative(root, file)}`);
}
console.log('LINE module dependency boundary OK');

const consumers = ['src/pages/scenario01/LineTeacher.jsx', 'src/pages/scenario01/VipGroup.jsx', 'src/pages/scenario02/PrivateChat.jsx', 'src/pages/scenario03/components/ScriptedLineConversation.jsx'];
for (const consumer of consumers) {
  const source = await readFile(new URL(`../${consumer}`, import.meta.url), 'utf8');
  if (!source.includes("apps/line'")) throw new Error(`${consumer} does not use the LINE public API`);
  if (!source.includes('LineConversation')) throw new Error(`${consumer} does not delegate to the LINE conversation shell`);
  if (/<header className="line-header"|className="(?:line-app|line-chat-scroll|line-chat-footer)"|className=\{`line-msg|scenario02\/meetu\/SuggestedReplies/.test(source)) throw new Error(`${consumer} still owns duplicate LINE presentation`);
}
console.log('LINE consumers use the public API without duplicate header/bubble markup');
