import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const LANGUAGES = ['zh', 'en', 'jp'];
const EXPECTED_RECORDED_IDS = [
  'police_intro',
  'police_identity_question',
  'police_identity_answer_a',
  'police_identity_answer_b',
  'police_data_leak',
  'police_case_number',
  'police_add_line',
  'police_return',
  'police_online_check',
  'police_online_answer_a',
  'police_online_answer_b',
  'police_custody_handoff',
  'police_callback_intro',
  'police_custody_account',
  'police_bank_guide',
  'prosecutor_intro',
  'prosecutor_account_question',
  'prosecutor_account_answer_a',
  'prosecutor_account_answer_b',
  'prosecutor_pressure',
  'prosecutor_end',
];
const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
const failures = [];

// scenario03's shared language helpers read browser storage at module load.
globalThis.localStorage = { getItem: () => null };
const {
  SCENARIO03_AUDIO_FILES,
  SCENARIO03_DIALOGUES,
} = await import('../src/data/scenario03Dialogues.js');

const recordedDialogues = Object.entries(SCENARIO03_DIALOGUES)
  .filter(([, dialogue]) => dialogue.audioKey);

const recordedIds = recordedDialogues.map(([dialogueId]) => dialogueId);
for (const dialogueId of EXPECTED_RECORDED_IDS) {
  if (!recordedIds.includes(dialogueId)) failures.push(`missing recorded dialogue ${dialogueId}`);
}
for (const dialogueId of recordedIds) {
  if (!EXPECTED_RECORDED_IDS.includes(dialogueId)) failures.push(`unexpected recorded dialogue ${dialogueId}`);
}

for (const [dialogueId, dialogue] of recordedDialogues) {
  for (const lang of LANGUAGES) {
    const lines = dialogue.lines[lang];
    if (!Array.isArray(lines) || lines.length !== 1 || typeof lines[0] !== 'string' || !lines[0]) {
      failures.push(`${dialogueId}: ${lang} subtitle must be one non-empty fixed string`);
    }

    const audioUrl = SCENARIO03_AUDIO_FILES[lang]?.[dialogue.audioKey];
    if (!audioUrl) {
      failures.push(`${dialogueId}: ${lang} has no audio mapping for ${dialogue.audioKey}`);
      continue;
    }

    const assetPath = audioUrl.replace(/^.*?assets\//, 'assets/');
    try {
      await access(`${publicRoot}${assetPath}`);
    } catch {
      failures.push(`${dialogueId}: ${lang} audio asset does not exist at ${assetPath}`);
    }
  }
}

const usedAudioKeys = new Set(recordedDialogues.map(([, dialogue]) => dialogue.audioKey));
for (const lang of LANGUAGES) {
  for (const audioKey of Object.keys(SCENARIO03_AUDIO_FILES[lang] ?? {})) {
    if (!usedAudioKeys.has(audioKey)) failures.push(`${lang}: unused audio mapping ${audioKey}`);
  }
}

if (failures.length) {
  console.error('Scenario03 dialogue validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Scenario03: verified ${recordedDialogues.length} recorded dialogues across ZH / EN / JP.`);
