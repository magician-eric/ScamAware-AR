import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const routes = [
  'scenario03-police',
  'scenario03-police/phone-home',
  'scenario03-police/call',
  'scenario03-police/call-stage1',
  'scenario03-police/line-add',
  'scenario03-police/line',
  'scenario03-police/case-site',
  'scenario03-police/prosecutor-call',
  'scenario03-police/police-callback',
  'scenario03-police/line-custody',
  'scenario03-police/bank',
  'scenario03-police/final',
  'scenario03-police/aftermath',
  'scenario03-police/ending/:outcome',
];

const navigationEdges = [
  ['PhoneHome.jsx', '/scenario03-police/call'],
  ['IncomingCall.jsx', '/scenario03-police/call-stage1'],
  ['CallStage1.jsx', '/scenario03-police/line-add'],
  ['LineAdd.jsx', '/scenario03-police/line'],
  ['LineIntro.jsx', '/scenario03-police/case-site'],
  ['CaseSite.jsx', '/scenario03-police/prosecutor-call'],
  ['ProsecutorCall.jsx', '/scenario03-police/police-callback'],
  ['PoliceCallback.jsx', '/scenario03-police/line-custody'],
  // The officer's LINE link goes straight to the 好匯銀行 website. There is
  // no detour back through a phone desktop, and no banking app on it.
  ['LineCustody.jsx', '/scenario03-police/bank'],
  ['BankSite.jsx', '/scenario03-police/final'],
  // 完成轉帳 runs through the post-transfer aftermath (scene 11a2) before the
  // 受騙 ending; 撥打 165 never touches it and never runs through a simulated
  // hotline call either - choosing it IS the successful anti-fraud
  // judgement, so it resolves straight to the 成功反詐 ending. See
  // scripts/scenario03-aftermath.test.mjs for the branch separation.
  ['FinalDecision.jsx', '/scenario03-police/aftermath'],
  ['Aftermath.jsx', '/scenario03-police/ending/failure'],
  ['FinalDecision.jsx', '/scenario03-police/ending/success'],
];

test('every Scenario03 route is registered and location-gated', async () => {
  const source = await read('src/routes.jsx');
  for (const path of routes) {
    assert.ok(source.includes(`path: '${path}'`), `missing route: ${path}`);
    const routeLine = source.split('\n').find((line) => line.includes(`path: '${path}'`));
    assert.match(routeLine, /<RequireLocationProfile>/, `route is not location-gated: ${path}`);
  }
});

test('Scenario03 main-flow navigation edges target registered screens', async () => {
  for (const [file, target] of navigationEdges) {
    const source = await read(`src/pages/scenario03/${file}`);
    assert.ok(source.includes(target), `${file} does not navigate to ${target}`);
  }
});

test('obsolete Scenario03 routes and controllers stay removed', async () => {
  const [source, pageNames] = await Promise.all([
    read('src/routes.jsx'),
    import('node:fs/promises').then(({ readdir }) => readdir(new URL('../src/pages/scenario03/', import.meta.url))),
  ]);
  assert.doesNotMatch(source, /scenario03-police\/(?:video-call|line-followup|hotline165)/);
  assert.ok(!pageNames.includes('LineFollowup.jsx'));
  // 撥打 165 decides the run on FinalDecision itself: no simulated hotline
  // call, no 165 page, and no route or component left behind for one.
  assert.doesNotMatch(source, /Hotline165/);
  assert.ok(!pageNames.includes('Hotline165.jsx'));
});

test('the prosecutor hangs up and the same investigating officer rings back as a separate call', async () => {
  const [routesSource, prosecutor, callback, store, dialogues, i18n] = await Promise.all([
    read('src/routes.jsx'),
    read('src/pages/scenario03/ProsecutorCall.jsx'),
    read('src/pages/scenario03/PoliceCallback.jsx'),
    read('src/lib/scenario03Store.js'),
    read('src/data/scenario03Dialogues.js'),
    read('src/pages/scenario03/i18n.js'),
  ]);
  // Two separate calls, never one. prosecutor_end hands the follow-up back
  // to the investigating officer, so the prosecutor's call really ends -
  // hangup tone, activeCall cleared - and only the officer's own ring screen
  // may set activeCall to 'investigator'. The prosecutor screen must never
  // do that: that was the old warm transfer, where a police name could
  // appear while prosecutor audio was still playing.
  assert.match(prosecutor, /playSound\('hangup'\)/);
  assert.match(prosecutor, /clearActiveCall\(\)/);
  assert.match(prosecutor, /setStage\('ended'\)/);
  assert.doesNotMatch(prosecutor, /setActiveCall\('investigator'\)/);
  assert.match(prosecutor, /setActiveCall\('prosecutor'\)/);
  // ...and the officer's callback is a real incoming call again: it rings,
  // and it plays nothing at all until the player answers.
  assert.match(callback, /startRingtone/);
  assert.match(callback, /stage === 'ringing'/);
  assert.match(callback, /onClick=\{answer\}/);
  assert.match(callback, /useScriptPlayer\(script, pace, stage === 'incall'\)/);
  assert.match(callback, /setActiveCall\('investigator'\)/);
  assert.doesNotMatch(callback, /setActiveCall\('prosecutor'\)/);
  assert.match(callback, /policeCallbackStatus: 'active'/);
  assert.match(callback, /policeCallbackStatus: 'completed'/);

  // Exactly one call action on the officer's ring screen - 接聽 - matching
  // the prosecutor's and the first police call's ring screens. No decline,
  // no "remind me later", no second button.
  const ringScreen = callback.match(/if \(stage === 'ringing'\) \{([\s\S]*?)\n  }\n/)?.[1] ?? '';
  assert.equal((ringScreen.match(/<button/g) ?? []).length, 1, 'police callback ring screen must offer exactly one action');
  assert.match(ringScreen, /pol-call-btn-answer/);
  assert.match(ringScreen, /t\.policeCallback\.answer/);
  assert.doesNotMatch(ringScreen, /DialogueLayer/);

  // The officer who rings back is the one from the run's session snapshot -
  // the same 承辦員警 as the first call - never a fresh name and never a
  // bare "警察"/"承辦人員" role label.
  assert.match(callback, /getOfficerIdentity|getLineAccountDisplayName/);
  assert.doesNotMatch(callback, /'警察'|'承辦人員'/);
  assert.match(store, /prosecutorCallCompleted: false/);
  assert.match(store, /policeCallbackStatus: 'idle'/);
  assert.match(dialogues, /policeCallback: \['police_callback_intro'\]/);
  assert.doesNotMatch(dialogues.match(/policeCallback: \[([^\]]*)\]/)?.[1] ?? '', /police_return|police_online_check|online_or_in_person|police_online_answer_[ab]/);
  // The callback is a real recording now, not a text-only block: its audioKey
  // resolves through SCENARIO03_AUDIO_FILES and it keeps the approved
  // three-language transcript verbatim.
  assert.match(dialogues, /police_callback_intro: \{\s*speaker: 'officer',\s*audioKey: 'policeCallbackIntro',/);
  assert.match(dialogues, /剛才檢察官已經把後續處理交代給我。接下來由我協助您完成資金查核。/);
  assert.match(dialogues, /The prosecutor has given me the follow-up instructions\. I'll assist you with the financial verification from here\./);
  assert.match(dialogues, /先ほど検察官から今後の対応について指示を受けています。これから私が資金確認の手続きを案内します。/);
  assert.doesNotMatch(dialogues, /police_callback_instruction/);
  assert.doesNotMatch(dialogues, /lineFollowup: \[/);
  assert.doesNotMatch(routesSource, /scenario03-police\/line-followup/);
  assert.equal((i18n.match(/policeCallback: \{/g) ?? []).length, 3);

  // The handoff is narrated by the officer on his own call, not by the
  // prosecutor: police_callback_intro is the line that says the prosecutor
  // has handed the case over, and it has a recording that says exactly that
  // in all three languages (asserted above).
  //
  // prosecutor_end must NOT be part of the played script. Its recording
  // still tells the player not to hang up without permission, which the
  // officer's separate callback contradicts the moment it rings - so the
  // prosecutor's script ends on prosecutor_pressure instead.
  const prosecutorScript = dialogues.match(/prosecutorCall: \[([\s\S]*?)\],/)?.[1] ?? '';
  assert.doesNotMatch(prosecutorScript, /prosecutor_end/);
  assert.match(prosecutorScript, /prosecutor_pressure/);
});

test('no scenario03 line the player can hear disagrees with its own recording', async () => {
  const dialogues = await read('src/data/scenario03Dialogues.js');

  // prosecutor_end is kept as data - the three MP3s stay on disk and stay
  // registered - so its subtitles must stay verbatim equal to what those
  // recordings actually say. Rewriting them here without re-recording is
  // what would reintroduce a voice/text mismatch, played or not.
  const prosecutorEnd = dialogues.match(/prosecutor_end: \{[\s\S]*?\n  \},/)?.[0] ?? '';
  assert.match(prosecutorEnd, /audioKey: 'prosecutorEnd'/);
  assert.match(prosecutorEnd, /沒有我的同意，不要中斷通話。現在開始執行。/);
  assert.match(prosecutorEnd, /Do not end this call without my permission\./);
  assert.match(prosecutorEnd, /許可なく電話を切らないでください。/);
  // The three clips are never deleted, only unplayed.
  assert.match(dialogues, /prosecutorEnd: `\$\{PROSECUTOR_AUDIO\}\/prosecutor_end\.mp3`/);
  assert.match(dialogues, /prosecutorEnd: `\$\{PROSECUTOR_AUDIO\}\/prosecutor_end_en\.mp3`/);
  assert.match(dialogues, /prosecutorEnd: `\$\{PROSECUTOR_AUDIO\}\/prosecutor_end_jp\.mp3`/);
  // And no "we know this one is wrong" escape hatch survives anywhere.
  assert.doesNotMatch(dialogues, /KNOWN VOICE\/TEXT GAP/);
});

test('the screens after the callback carry the officer voice, never the prosecutor', async () => {
  const [custody, bank] = await Promise.all([
    read('src/pages/scenario03/LineCustody.jsx'),
    read('src/pages/scenario03/BankSite.jsx'),
  ]);
  // Role ownership per script is asserted in
  // scenario03-call-audio-coverage.test.mjs; this is the screen-level half:
  // once the prosecutor has hung up, no screen reaches for his voice.
  assert.match(custody, /buildScenario03Script\('lineCustodyAccount', session\)/);
  assert.match(bank, /buildScenario03Script\('bankGuide', session\)/);
  assert.doesNotMatch(custody, /prosecutor/i);
  assert.doesNotMatch(bank, /prosecutor/i);
});

test('CaseSite initializes completed documents from the persisted store', async () => {
  const source = await read('src/pages/scenario03/CaseSite.jsx');
  assert.match(source, /initialState = useMemo\(\(\) => getScenario03State\(\), \[\]\)/);
  assert.match(source, /Array\.isArray\(initialState\.documentsRead\)/);
  assert.match(source, /initialState\.consentSigned/);
  assert.doesNotMatch(source, /const \[read, setRead\] = useState\(\[\]\)/);
});

test('bank warning title is localized in zh, en, and jp', async () => {
  const [bank, i18n] = await Promise.all([
    read('src/pages/scenario03/BankSite.jsx'),
    read('src/pages/scenario03/i18n.js'),
  ]);
  assert.match(bank, /title=\{t\.bank\.warningTitle\}/);
  assert.match(i18n, /warningTitle: '刑事警察局風險提醒'/);
  assert.match(i18n, /warningTitle: 'CIB Anti-Fraud Warning'/);
  assert.match(i18n, /warningTitle: '刑事警察局 詐欺防止警告'/);
  assert.doesNotMatch(bank, /title="刑事警察局風險提醒"/);
});

test('stateful screens persist story progress while allowing animations to restart', async () => {
  const [store, incoming, bank, finalDecision, ending] = await Promise.all([
    read('src/lib/scenario03Store.js'),
    read('src/pages/scenario03/IncomingCall.jsx'),
    read('src/pages/scenario03/BankSite.jsx'),
    read('src/pages/scenario03/FinalDecision.jsx'),
    read('src/pages/scenario03/Ending.jsx'),
  ]);
  // 拒接 is gone from the first police call, and so is every piece of state
  // that only existed to serve it - the flag must not quietly come back.
  // Matched against code only: IncomingCall.jsx's header comment names the
  // removed stages on purpose, to explain why they are not coming back.
  const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(stripComments(store), /declinedFirstCall/);
  assert.doesNotMatch(stripComments(incoming), /declinedFirstCall|'call2'|'declined'/);
  // The site opens on its sign-in page: the desktop-and-app-icon step in
  // front of it is gone, so there is no 'home' stage left to default to.
  assert.match(store, /bankStage: 'login'/);
  assert.doesNotMatch(store, /bankStage: 'home'/);
  assert.match(bank, /initialState\.bankStage/);
  assert.match(bank, /persistBankProgress\(\{ bankStage: 'confirm'/);
  assert.match(finalDecision, /updateScenario03State\(\{ transferAmount: BALANCE_TOTAL, ending: 'failure' \}\)/);
  assert.match(store, /aftermathSeen: false/);
  assert.match(ending, /getOrCreateScenarioSession\(\)/);
});

test('activeCall is the single source of truth for who the player is on the phone with, through custody LINE and bank routes', async () => {
  const [store, callback, custody, phoneHome, bank, finalDecision, indicator] = await Promise.all([
    read('src/lib/scenario03Store.js'),
    read('src/pages/scenario03/PoliceCallback.jsx'),
    read('src/pages/scenario03/LineCustody.jsx'),
    read('src/pages/scenario03/PhoneHome.jsx'),
    read('src/pages/scenario03/BankSite.jsx'),
    read('src/pages/scenario03/FinalDecision.jsx'),
    read('src/pages/scenario03/components/OngoingCallIndicator.jsx'),
  ]);
  assert.match(store, /activeCall: null/);
  assert.match(store, /callStartedAt: null/);
  assert.doesNotMatch(store, /callActive/);
  assert.match(callback, /setActiveCall\('investigator'\)/);
  assert.match(callback, /navigate\('\/scenario03-police\/line-custody', \{ replace: true \}\)/);
  assert.doesNotMatch(callback, /clearActiveCall\(\)/);
  assert.match(custody, /<OngoingCallIndicator \/>/);
  // The custody LINE step hands off through the officer's own link card, and
  // that link opens the 好匯銀行 website directly. The phone desktop is not
  // on this path any more - it is a lock screen the run opens on and never
  // returns to.
  assert.match(custody, /navigate\('\/scenario03-police\/bank'\)/);
  assert.doesNotMatch(custody, /phone-home/);
  assert.doesNotMatch(custody, /clearActiveCall\(\)/);
  assert.doesNotMatch(phoneHome, /policeCallbackStatus/);
  assert.doesNotMatch(phoneHome, /navigate\('\/scenario03-police\/bank'\)/);
  // The site keeps the "still on a call" indicator on every one of its pages
  // - the officer never hangs up - and it has no fake-desktop stage of its
  // own to strand it on.
  assert.ok((bank.match(/<OngoingCallIndicator \/>/g) ?? []).length >= 2);
  assert.doesNotMatch(bank, /if \(stage === 'home'\)/);
  assert.doesNotMatch(bank, /clearActiveCall\(\)/);
  assert.match(finalDecision, /<OngoingCallIndicator \/>/);
  assert.match(finalDecision, /clearActiveCall\(\)/);
  assert.match(indicator, /if \(!state\.activeCall\) return null/);
  assert.match(indicator, /state\.callStartedAt/);
  assert.match(indicator, /state\.activeCall === 'prosecutor'/);
});

test('no phone desktop, and no "still on the line" narration, anywhere in the bank flow', async () => {
  const [i18n, bank, phoneHome] = await Promise.all([
    read('src/pages/scenario03/i18n.js'),
    read('src/pages/scenario03/BankSite.jsx'),
    read('src/pages/scenario03/PhoneHome.jsx'),
  ]);
  assert.doesNotMatch(i18n, /對方仍在線上等你打開網路銀行|still on the line, waiting for you to open/);
  assert.doesNotMatch(bank, /pol-home|pol-app/);
  // Scene 01 is a lock screen: no app grid, and no line of narration telling
  // the player what a phone is.
  assert.doesNotMatch(phoneHome, /pol-app-grid|pol-home/);
  assert.match(phoneHome, /pol-lock/);
});

test('bank no longer fakes officer guidance narration that outlives the recorded guide clip', async () => {
  const [bank, i18n] = await Promise.all([
    read('src/pages/scenario03/BankSite.jsx'),
    read('src/pages/scenario03/i18n.js'),
  ]);
  // instructionTitle/coercedMessage/normalMessage used to put invented
  // first-person "officer" narration in the bank UI regardless of whether
  // the recorded guide clip (police_bank_guide) was still actually playing -
  // removed per the flow review; the bank screen only shows its own
  // necessary controls, with OngoingCallIndicator (driven by activeCall)
  // as the only truthful "still on a call" signal.
  assert.doesNotMatch(bank, /pol-bank-instruction/);
  assert.doesNotMatch(i18n, /instructionTitle|coercedMessage|normalMessage/);
});

test('custody and bank carry the officer voice without replaying the old online-statement audio', async () => {
  const [custody, bank, dialogues] = await Promise.all([
    read('src/pages/scenario03/LineCustody.jsx'),
    read('src/pages/scenario03/BankSite.jsx'),
    read('src/data/scenario03Dialogues.js'),
  ]);
  // The second officer stays on the line across both screens, so each one
  // plays exactly its own recorded block - custody only after its data card
  // is mounted, the bank guide only once the transfer form is on screen.
  assert.match(custody, /buildScenario03Script\('lineCustodyAccount', session\)/);
  assert.match(custody, /buildScenario03Script\('lineCustody', session\)/);
  // Custody runs two players on purpose, and they must not be merged again:
  // the recorded block (lineCustodyAccount) drives the call subtitle plate,
  // the unrecorded task order (lineCustody) drives LINE chat bubbles and
  // only starts once the recording has finished. A silent line must never
  // land on the subtitle plate while the call indicator says 通話中.
  assert.match(custody, /const voicePlayer = useScriptPlayer\(voiceScript, pace\)/);
  assert.match(custody, /const taskPlayer = useScriptPlayer\(taskScript, pace, voicePlayer\.done\)/);
  assert.match(custody, /<DialogueLayer player=\{voicePlayer\} \/>/);
  assert.match(custody, /player=\{taskPlayer\}/);
  assert.match(custody, /<ScriptedLineConversation/);
  assert.match(bank, /buildScenario03Script\('bankGuide', session\)/);
  assert.match(bank, /useScriptPlayer\(guideScript, pace, stage === 'transfer'\)/);
  assert.match(dialogues, /lineCustodyAccount: \['police_custody_account'\]/);
  assert.match(dialogues, /bankGuide: \['police_bank_guide'\]/);
  // The retired 線上筆錄 recordings must never come back into this flow.
  for (const source of [custody, bank]) {
    assert.doesNotMatch(source, /speechSynthesis|police_return|policeReturn|police_online_check|policeOnlineCheck|police_online_answer_[ab]|policeOnlineAnswer[AB]/);
  }
  assert.doesNotMatch(bank, /HeadsUpNotification|pol-line-heads-up/);
});

test('stabilized full route sequence stays linear through callback, LINE custody, and the bank site', () => {
  assert.deepEqual(navigationEdges.slice(0, 10), [
    ['PhoneHome.jsx', '/scenario03-police/call'],
    ['IncomingCall.jsx', '/scenario03-police/call-stage1'],
    ['CallStage1.jsx', '/scenario03-police/line-add'],
    ['LineAdd.jsx', '/scenario03-police/line'],
    ['LineIntro.jsx', '/scenario03-police/case-site'],
    ['CaseSite.jsx', '/scenario03-police/prosecutor-call'],
    ['ProsecutorCall.jsx', '/scenario03-police/police-callback'],
    ['PoliceCallback.jsx', '/scenario03-police/line-custody'],
    ['LineCustody.jsx', '/scenario03-police/bank'],
    ['BankSite.jsx', '/scenario03-police/final'],
  ]);
});

test('all three languages retain 21 explicit resolvable audio mappings without _ja', async () => {
  const { readdir } = await import('node:fs/promises');
  const dialogues = await read('src/data/scenario03Dialogues.js');
  const root = new URL('../public/assets/scenarios/scenario-03/audio/', import.meta.url);
  const audioFiles = (await Promise.all(['police', 'prosecutor'].map(async (folder) =>
    (await readdir(new URL(`${folder}/`, root))).filter((name) => name.endsWith('.mp3')).map((name) => `${folder}/${name}`),
  ))).flat();
  assert.doesNotMatch(dialogues, /_ja(?:\.|['"`])/);
  assert.equal(audioFiles.filter((path) => !/_en\.mp3$|_jp\.mp3$/.test(path)).length, 21);
  for (const [lang, suffix] of [['zh', ''], ['en', '_en'], ['jp', '_jp']]) {
    const table = dialogues.match(new RegExp(`  ${lang}: \\{([\\s\\S]*?)\\n  \\},`))?.[1] ?? '';
    const mappings = [...table.matchAll(/`\$\{(POLICE_AUDIO|PROSECUTOR_AUDIO)\}\/([^`]+\.mp3)`/g)];
    assert.equal(mappings.length, 21, `${lang} audio mapping count`);
    for (const [, directory, filename] of mappings) {
      const folder = directory === 'POLICE_AUDIO' ? 'police' : 'prosecutor';
      assert.ok(audioFiles.includes(`${folder}/${filename}`), `missing ${lang} audio: ${folder}/${filename}`);
      assert.equal(filename.endsWith(`${suffix}.mp3`), true, `wrong ${lang} suffix: ${filename}`);
    }
  }
});
