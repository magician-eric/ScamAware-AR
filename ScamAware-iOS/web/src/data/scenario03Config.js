// Shared config for scenario03 (假檢警): the 11-step progress rail, the
// warning-flag labels used by the endings, the money amounts every screen
// quotes, and the four fake official documents shown in scene 06. Text
// tables live here so scene components stay layout-only - same split as
// scenarioConfig.js does for scenario04.

import { addDays, addMinutes, formatROCDate, formatTaiwanDate, formatTaiwanTime } from '../lib/dateTimeService';
import { getScenario03Lang } from '../pages/scenario03/i18n';
import { localizeLocationName } from '../lib/location/localizedLocationName';

// Progress-rail labels. Not currently rendered anywhere in the player-facing
// UI (see PoliceFrame.jsx's comment - the rail was retired in favor of a
// collapsed tools menu), kept lang-aware anyway so a future consumer gets
// both languages for free.
const STEPS_LABELS_ZH = ['鎖定畫面', '陌生來電', '身分查核', '加入 LINE', '案件說明', '案件網站', '檢察官來電', '員警回電', '資金監管', '網路銀行', '最後決定'];
const STEPS_LABELS_EN = ['Lock Screen', 'Unknown Call', 'Identity Check', 'Add Contact', 'Case Briefing', 'Case Website', 'Prosecutor Call', 'Police Callback', 'Fund Custody', 'Banking Website', 'Final Decision'];
const STEPS_LABELS_JP = ['ロック画面', '不明な着信', '本人確認', 'LINE追加', '事件の説明', '事件サイト', '検察官の電話', '警察官からの折り返し', '資金監視', 'ネットバンキング', '最終決定'];

const STEP_DEFS = [
  { key: 'phone-home', route: '/scenario03-police/phone-home' },
  { key: 'incoming-call', route: '/scenario03-police/call' },
  { key: 'call-stage1', route: '/scenario03-police/call-stage1' },
  { key: 'line-add', route: '/scenario03-police/line-add' },
  { key: 'line-chat', route: '/scenario03-police/line' },
  { key: 'case-site', route: '/scenario03-police/case-site' },
  { key: 'prosecutor-call', route: '/scenario03-police/prosecutor-call' },
  { key: 'police-callback', route: '/scenario03-police/police-callback' },
  { key: 'line-custody', route: '/scenario03-police/line-custody' },
  { key: 'bank', route: '/scenario03-police/bank' },
  { key: 'decision', route: '/scenario03-police/final' },
];

// Function, not a frozen const, so a language switch mid-SPA-session (no
// full reload) is picked up - see getScenario03Choices() in
// scenario03Choices.js for the same reasoning.
function stepsLabelsFor(lang) {
  if (lang === 'en') return STEPS_LABELS_EN;
  if (lang === 'jp') return STEPS_LABELS_JP;
  return STEPS_LABELS_ZH;
}

export function getScenario03Steps(lang = getScenario03Lang()) {
  const labels = stepsLabelsFor(lang);
  return STEP_DEFS.map((step, i) => ({ ...step, label: labels[i] }));
}

export const SCENARIO03_STEPS = getScenario03Steps();

// In-story clock. Everything the player reads as a timestamp derives from
// the ONE session start time (scenarioSession.startedAt) plus the offset of
// the scene it appears in, so a staff member who blitzes the whole run in 90
// seconds still sees a conversation that plausibly spans half an hour,
// instead of every LINE message showing the same minute. (The phone status
// bar stays a live clock - that one is supposed to be "now".)
export const SCENE_MINUTE_OFFSETS = {
  'phone-home': 0,
  'incoming-call': 0,
  'call-stage1': 1,
  'line-add': 5,
  'line-chat': 6,
  'case-site': 10,
  'prosecutor-call': 13,
  'police-callback': 18,
  'line-custody': 22,
  bank: 25,
  decision: 27,
  // 完成轉帳之後，對方傳來「請等待我們的消息」的那一刻 - still the same
  // afternoon. The scene's second half is days later and does not measure in
  // minutes: see AFTERMATH_DAYS_LATER / aftermathLaterTime below.
  aftermath: 29,
};

export function sceneStartTime(session, stepKey) {
  const base = session?.startedAt ? new Date(session.startedAt) : new Date();
  return addMinutes(base, SCENE_MINUTE_OFFSETS[stepKey] ?? 0);
}

// How long the 受騙 branch's "幾天後" gap actually is. One number, used both
// for the LINE timestamps after the gap and for anything that wants to name
// the day - so the transition card, the chat clock and the date header can
// never disagree about how much time passed.
export const AFTERMATH_DAYS_LATER = 4;

// The in-story clock on the far side of that gap: the same session start,
// AFTERMATH_DAYS_LATER days on. Everything the player reads as a timestamp
// still derives from the ONE session start time, exactly like sceneStartTime.
export function aftermathLaterTime(session) {
  return addDays(sceneStartTime(session, 'aftermath'), AFTERMATH_DAYS_LATER);
}

export function aftermathLaterDateLabel(session) {
  return formatTaiwanDate(aftermathLaterTime(session));
}

// Chat timestamps creep forward one minute every other message so a long
// exchange doesn't read as if it all happened in the same second.
export function messageTimeLabel(baseTime, index) {
  return formatTaiwanTime(addMinutes(baseTime, Math.floor(index / 2)));
}

// NT$ amounts every screen must agree on - the balance the bank app shows
// (and the only amount the transfer flow ever moves: see BankSite.jsx, which
// no longer offers a partial amount that silently rewrites itself) and the
// amounts the fake documents cite as the laundered sums.
export const BALANCE_TOTAL = 285000;
export const DOC_AMOUNTS = [480000, 260000, 190000];

export const HOTLINE_165 = '165';
export const HOTLINE_110 = '110';

export const FAILURE_RED = '#ec3013';
export const SUCCESS_BLACK = '#201e1d';
export const SUBTITLE_STRESS = '#ff9d94';

export function formatNT(amount) {
  return `NT$ ${amount.toLocaleString('en-US')}`;
}

// Every branch the player can take writes one of these; both endings read
// the collected set back as "你在過程中遇到的手法".
const WARNING_FLAG_LABELS_ZH = {
  answered_unknown_caller: '接聽並相信自稱公務機關的陌生來電',
  tried_to_verify_caller: '曾想查證來電身分，但被話術帶回',
  accepted_case_number: '接受對方口頭提供的「案件編號」',
  moved_to_line: '把公務案件轉移到 LINE 私人帳號處理',
  isolated_from_family: '被要求不得告知家人朋友（偵查不公開話術）',
  agreed_to_cooperate: '在未查證前答應全面配合',
  opened_fake_documents: '相信網站上的「公文」與電子印章',
  signed_consent: '線上勾選同意「資產清查授權」',
  prosecutor_call_pressure: '接受自稱檢察官的電話訊問',
  fear_of_freeze: '因害怕帳戶被凍結而順從指示',
  online_bank_pushed: '被引導改用網路銀行、避免臨櫃',
  entered_bank_app: '在對方指示下打開網路銀行',
  full_balance_transfer: '被說服把全部存款一次轉出',
  transfer_completed: '完成轉帳（金錢已流入詐騙帳戶）',
  called_165: '中途停下來，改撥打 165 查證',
};

const WARNING_FLAG_LABELS_EN = {
  answered_unknown_caller: 'Answered and trusted an unknown call claiming to be a government agency',
  tried_to_verify_caller: 'Tried to verify the caller, but was talked out of it',
  accepted_case_number: 'Accepted a "case number" the caller gave verbally',
  moved_to_line: 'Let an official case move to a private LINE account',
  isolated_from_family: 'Was told not to tell family or friends (confidential-investigation script)',
  agreed_to_cooperate: 'Agreed to fully cooperate before verifying anything',
  opened_fake_documents: 'Trusted the "official documents" and e-seals on the website',
  signed_consent: 'Signed an "asset review consent" online',
  prosecutor_call_pressure: 'Accepted an interrogation call from someone claiming to be a prosecutor',
  fear_of_freeze: 'Complied out of fear the account would be frozen',
  online_bank_pushed: 'Was steered to online banking to avoid a bank counter',
  entered_bank_app: 'Opened the banking app on the caller’s instruction',
  full_balance_transfer: 'Was persuaded to transfer the entire balance at once',
  transfer_completed: 'Completed the transfer (money went to the scam account)',
  called_165: 'Stopped partway through and called 165 to verify',
};

const WARNING_FLAG_LABELS_JP = {
  answered_unknown_caller: '公的機関を名乗る不明な着信に応答し信用した',
  tried_to_verify_caller: '発信者の身分を確認しようとしたが話術に流された',
  accepted_case_number: '相手が口頭で伝えた「事件番号」を受け入れた',
  moved_to_line: '公的な事件をLINEの個人アカウントで処理した',
  isolated_from_family: '家族や友人に話さないよう求められた（捜査上の秘密という話術）',
  agreed_to_cooperate: '確認前に全面的な協力を約束した',
  opened_fake_documents: 'サイト上の「公文書」と電子印を信用した',
  signed_consent: 'オンラインで「資産照会の同意」にチェックした',
  prosecutor_call_pressure: '検察官を名乗る電話での取り調べを受け入れた',
  fear_of_freeze: '口座凍結を恐れて指示に従った',
  online_bank_pushed: '窓口を避けネットバンキングに誘導された',
  entered_bank_app: '相手の指示でネットバンキングアプリを開いた',
  full_balance_transfer: '全預金を一度に振り込むよう説得された',
  transfer_completed: '振込を完了した（資金が詐欺口座に流入）',
  called_165: '途中で立ち止まり165に電話して確認した',
};

export function getWarningFlagLabels(lang = getScenario03Lang()) {
  if (lang === 'en') return WARNING_FLAG_LABELS_EN;
  if (lang === 'jp') return WARNING_FLAG_LABELS_JP;
  return WARNING_FLAG_LABELS_ZH;
}

export const WARNING_FLAG_LABELS = getWarningFlagLabels();

// Scene 11's shared education block - both endings show the same summary,
// short enough to read at a glance (spec: no bullet over ~6 characters,
// nothing that reads as a paragraph). This replaced a dynamic list built
// from state.warningFlags and a 10-item numbered list + long disclaimer
// paragraph - the manipulation tactics below are the same regardless of
// which 2-choice branch the player took, so a fixed list is both simpler
// and no less accurate than the flag-driven version was.
const ENDING_TACTICS_ZH = [
  '假警察來電', '假檢察官施壓', 'LINE私下聯絡', '偽造案件網站',
  '偽造監管帳戶', '要求保密', '製造時間壓力', '引導銀行轉帳',
];

const ENDING_TACTICS_EN = [
  'Fake police call', 'Fake prosecutor pressure', 'Private LINE contact', 'Fake case website',
  'Fake custody account', 'Demand for secrecy', 'Manufactured time pressure', 'Steered to bank transfer',
];

const ENDING_TACTICS_JP = [
  '偽の警察官からの電話', '偽の検察官による圧力', 'LINEでの個人連絡', '偽の事件サイト',
  '偽の監視口座', '秘密厳守の要求', '作られた時間的圧力', '銀行振込への誘導',
];

export function getEndingTactics(lang = getScenario03Lang()) {
  if (lang === 'en') return ENDING_TACTICS_EN;
  if (lang === 'jp') return ENDING_TACTICS_JP;
  return ENDING_TACTICS_ZH;
}

export const ENDING_TACTICS = getEndingTactics();

const ENDING_TRUTH_CHECKLIST_ZH = [
  'LINE 辦案',
  '匯款到監管帳戶',
  '保密不能告知家人',
  '電話中操作網銀',
];

const ENDING_TRUTH_CHECKLIST_EN = [
  'Handle a case over LINE',
  'Transfer money into a "custody account"',
  'Keep it secret from your family',
  'Operate your banking app during a call',
];

const ENDING_TRUTH_CHECKLIST_JP = [
  'LINEで事件を処理する',
  '「監視口座」へ送金させる',
  '家族に秘密にするよう命じる',
  '通話中にネットバンキングを操作させる',
];

export function getEndingTruthChecklist(lang = getScenario03Lang()) {
  if (lang === 'en') return ENDING_TRUTH_CHECKLIST_EN;
  if (lang === 'jp') return ENDING_TRUTH_CHECKLIST_JP;
  return ENDING_TRUTH_CHECKLIST_ZH;
}

export const ENDING_TRUTH_CHECKLIST = getEndingTruthChecklist();

const CONTACT_CARDS_ZH = [
  { number: HOTLINE_165, title: '反詐騙諮詢專線', desc: '24 小時受理諮詢、查證與檢舉，不確定就先打。' },
  { number: HOTLINE_110, title: '報案專線', desc: '已經轉帳或情況緊急，立即報案並保留所有紀錄。' },
];

const CONTACT_CARDS_EN = [
  { number: HOTLINE_165, title: 'Taiwan’s 165 Anti-Fraud Hotline', desc: 'Open 24 hours for questions, verification and reporting. Call first if you’re not sure.' },
  { number: HOTLINE_110, title: 'Police Emergency Line', desc: 'Already transferred money, or it’s urgent? Report it now and keep every record.' },
];

const CONTACT_CARDS_JP = [
  { number: HOTLINE_165, title: '台湾の詐欺相談専用電話165', desc: '24時間、相談・確認・通報を受け付けています。不安なときはまず電話してください。' },
  { number: HOTLINE_110, title: '警察緊急通報番号', desc: 'すでに振り込んでしまった、または緊急の場合は、今すぐ通報し、すべての記録を保存してください。' },
];

export function getContactCards(lang = getScenario03Lang()) {
  if (lang === 'en') return CONTACT_CARDS_EN;
  if (lang === 'jp') return CONTACT_CARDS_JP;
  return CONTACT_CARDS_ZH;
}

export const CONTACT_CARDS = getContactCards();

// Scene 06's four fake documents. `body` rows render as label/value lines in
// the PDF viewer; every document carries a 教育模擬 / SIMULATED watermark so
// a screenshot of one can never be mistaken for a real official document.
// Agency names (police/prosecutors/court) come from the player's location
// profile, which stores them in Chinese, and are resolved to the player's
// language through lib/location/localizedLocationName.js - a Japanese 公文
// that named 臺北市政府警察局 was Chinese on a Japanese screen. The ROC-calendar dates
// (session.incidentDateROC / filingDateROC, e.g. "中華民國115年07月27日")
// come from the shared dateTimeService and are left unlocalized dynamic data,
// consistent with how case numbers/account digits are handled.
// The unit line on the fake paperwork reads from the run's snapshot: the
// division and station were decided once when the run started, so every
// document shows the same unit as the LINE card, the case site and the calls.
// Older sessions carry no division/station and fall back to the department.
function documentHandlingUnit(session, suffix, lang) {
  const unit = [
    localizeLocationName(session?.policeDivision, lang),
    localizeLocationName(session?.policeStation, lang),
  ].filter(Boolean).join(' ');
  if (unit) return unit;
  const police = agencyNames(session, lang).police;
  return `${police} ${suffix}`;
}

// The three agency names every 公文 stamps, already in the player's language.
// `fallback` is per-language so a run with no locked profile still reads as
// paperwork rather than as a Chinese string on an English page.
const AGENCY_FALLBACKS = {
  zh: { police: '警察局', prosecutors: '地方檢察署', court: '地方法院' },
  en: { police: 'Local Police Department', prosecutors: 'District Prosecutors Office', court: 'District Court' },
  jp: { police: '管轄警察局', prosecutors: '地方検察署', court: '地方法院' },
};

// The ROC-calendar date a 公文 is stamped with, in the language it is written
// in. A run mints all three when it is created; a run persisted by an older
// build carries only the Chinese one, so that one is re-formatted from the
// run's own start time rather than printed into an English document.
function rocDate(session, kind, lang) {
  const suffix = lang === 'en' ? 'En' : lang === 'jp' ? 'Jp' : '';
  const stored = session?.[`${kind}DateROC${suffix}`];
  if (stored) return stored;
  const startedAt = session?.startedAt ? new Date(session.startedAt) : new Date();
  return formatROCDate(startedAt, lang);
}

function agencyNames(session, lang) {
  const fallback = AGENCY_FALLBACKS[lang] ?? AGENCY_FALLBACKS.zh;
  const agencies = session?.locationProfile?.agencies;
  return {
    police: localizeLocationName(agencies?.policeDepartment, lang) ?? fallback.police,
    prosecutors: localizeLocationName(agencies?.prosecutorsOffice, lang) ?? fallback.prosecutors,
    court: localizeLocationName(agencies?.districtCourt, lang) ?? fallback.court,
  };
}

function buildFakeDocumentsZh(session) {
  const { police, prosecutors, court } = agencyNames(session, 'zh');
  const serials = session?.documentSerials ?? ['SIM-DOC-0001', 'SIM-DOC-0002', 'SIM-DOC-0003', 'SIM-DOC-0004'];

  return [
    {
      key: 'notice',
      title: '刑事案件關係人通知書',
      issuer: police,
      serial: serials[0],
      rows: [
        ['案件編號', session?.caseNumber ?? ''],
        ['受通知人', '身分資料遭冒用關係人'],
        ['案由', '涉嫌參與詐欺、洗錢防制法相關案件'],
        ['查獲日期', rocDate(session, 'incident', 'zh')],
        ['通知單位', documentHandlingUnit(session, '偵查隊', 'zh')],
      ],
      paragraphs: [
        `經查，本案於${rocDate(session, 'incident', 'zh')}查獲一批人頭帳戶，其中一組帳戶開立資料與台端相符，涉嫌供詐欺集團作為收款使用。`,
        '請台端於本通知送達後，配合承辦人員完成身分查核及資金清查程序，以釐清涉案情節。',
      ],
    },
    {
      key: 'transactions',
      title: '涉案帳戶資金往來明細表',
      issuer: prosecutors,
      serial: serials[1],
      rows: [
        ['案件編號', session?.caseNumber ?? ''],
        ['帳戶末四碼', session?.acct4 ?? ''],
        ['查詢區間', `${session?.incidentDate ?? ''} 起`],
        ['製表機關', prosecutors],
      ],
      table: [
        ['入帳', `NT$ ${DOC_AMOUNTS[0].toLocaleString('en-US')}`, '境外匯入'],
        ['入帳', `NT$ ${DOC_AMOUNTS[1].toLocaleString('en-US')}`, '第三方支付'],
        ['出帳', `NT$ ${DOC_AMOUNTS[2].toLocaleString('en-US')}`, '疑似洗錢車手提領'],
      ],
      paragraphs: [
        '上列款項經比對後，與本署偵辦之詐欺案件被害人匯款紀錄相符，涉有洗錢防制法第十四條之嫌。',
      ],
    },
    {
      key: 'custody',
      title: '資金監管命令',
      issuer: court,
      serial: serials[2],
      rows: [
        ['案件編號', session?.caseNumber ?? ''],
        ['核發機關', court],
        ['核發日期', rocDate(session, 'filing', 'zh')],
        ['受命令人', '案件關係人'],
        ['執行期限', `${session?.caseDate ?? ''} ${session?.deadlineLabel ?? ''} 前`],
      ],
      paragraphs: [
        '為釐清台端名下資金來源合法性，命台端於期限內將名下存款移入本案指定之監管帳戶，由專責人員代為保管、清查。',
        '清查完畢且確認無涉案情事者，款項將於程序終結後全額返還。',
        '逾期未配合者，得依法逕予凍結名下全部帳戶。',
      ],
    },
    {
      key: 'consent',
      title: '資產清查授權同意書',
      issuer: prosecutors,
      serial: serials[3],
      rows: [
        ['案件編號', session?.caseNumber ?? ''],
        ['立同意書人', '受調查關係人'],
        ['授權範圍', '名下存款帳戶之查核、移轉及保管'],
        ['授權期間', '本案偵查終結前'],
      ],
      paragraphs: [
        '立同意書人同意配合本案資產清查程序，並授權承辦人員指定之監管帳戶代為保管名下資金。',
        '立同意書人已知悉本案偵查不公開，同意於偵查期間不對外揭露本案內容。',
      ],
      consent: '本人已閱讀並同意上列授權內容',
    },
  ];
}

function buildFakeDocumentsEn(session) {
  const { police, prosecutors, court } = agencyNames(session, 'en');
  const serials = session?.documentSerials ?? ['SIM-DOC-0001', 'SIM-DOC-0002', 'SIM-DOC-0003', 'SIM-DOC-0004'];

  return [
    {
      key: 'notice',
      title: 'Criminal Case Notice',
      issuer: police,
      serial: serials[0],
      rows: [
        ['Case Number', session?.caseNumber ?? ''],
        ['Notice Recipient', 'Party whose identity was allegedly misused'],
        ['Reason', 'Suspected involvement in fraud / money laundering'],
        ['Date Discovered', rocDate(session, 'incident', 'en')],
        ['Issuing Unit', documentHandlingUnit(session, 'Criminal Investigation Division', 'en')],
      ],
      paragraphs: [
        `Investigation shows that on ${rocDate(session, 'incident', 'en')}, a group of mule accounts was discovered, one of which was opened using information matching yours, suspected of being used to receive fraud proceeds.`,
        'Upon receipt of this notice, please cooperate with the assigned officer to complete identity verification and a review of your funds, to clarify your involvement in this case.',
      ],
    },
    {
      key: 'transactions',
      title: 'Suspect Account Transaction Record',
      issuer: prosecutors,
      serial: serials[1],
      rows: [
        ['Case Number', session?.caseNumber ?? ''],
        ['Account Last 4 Digits', session?.acct4 ?? ''],
        ['Query Period', `From ${session?.incidentDate ?? ''}`],
        ['Issuing Agency', prosecutors],
      ],
      table: [
        ['Credit', `NT$ ${DOC_AMOUNTS[0].toLocaleString('en-US')}`, 'Overseas remittance'],
        ['Credit', `NT$ ${DOC_AMOUNTS[1].toLocaleString('en-US')}`, 'Third-party payment'],
        ['Debit', `NT$ ${DOC_AMOUNTS[2].toLocaleString('en-US')}`, 'Suspected money-mule withdrawal'],
      ],
      paragraphs: [
        'The above amounts were compared and matched against victim remittance records in a fraud case under this office’s investigation, suspected to violate Money Laundering Control Act Article 14.',
      ],
    },
    {
      key: 'custody',
      title: 'Fund Custody Order',
      issuer: court,
      serial: serials[2],
      rows: [
        ['Case Number', session?.caseNumber ?? ''],
        ['Issuing Authority', court],
        ['Date Issued', rocDate(session, 'filing', 'en')],
        ['Order Recipient', 'Party to this case'],
        ['Deadline', `${session?.caseDate ?? ''} by ${session?.deadlineLabel ?? ''}`],
      ],
      paragraphs: [
        'In order to verify the legitimacy of the source of funds under your name, you are ordered to transfer your deposits into the custody account designated for this case within the deadline, to be held and reviewed by a designated officer.',
        'Once the review confirms no involvement in this case, the full amount will be returned upon conclusion of the process.',
        'Failure to cooperate within the deadline may result in all accounts under your name being frozen by law.',
      ],
    },
    {
      key: 'consent',
      title: 'Asset Review Consent Form',
      issuer: prosecutors,
      serial: serials[3],
      rows: [
        ['Case Number', session?.caseNumber ?? ''],
        ['Signatory', 'Party under investigation'],
        ['Scope of Authorization', 'Review, transfer and custody of deposit accounts under your name'],
        ['Authorization Period', 'Until this investigation concludes'],
      ],
      paragraphs: [
        'The signatory agrees to cooperate with this case’s asset review process, and authorizes the designated officer’s custody account to hold funds under their name.',
        'The signatory acknowledges that this investigation is confidential and agrees not to disclose its contents to anyone during the investigation.',
      ],
      consent: 'I have read and agree to the above authorization',
    },
  ];
}

function buildFakeDocumentsJp(session) {
  const { police, prosecutors, court } = agencyNames(session, 'jp');
  const serials = session?.documentSerials ?? ['SIM-DOC-0001', 'SIM-DOC-0002', 'SIM-DOC-0003', 'SIM-DOC-0004'];

  return [
    {
      key: 'notice',
      title: '刑事事件関係者通知書',
      issuer: police,
      serial: serials[0],
      rows: [
        ['事件番号', session?.caseNumber ?? ''],
        ['被通知者', '身分情報を悪用された関係者'],
        ['事由', '詐欺・資金洗浄防止法関連事件への関与の疑い'],
        ['発見日', rocDate(session, 'incident', 'jp')],
        ['通知機関', documentHandlingUnit(session, '刑事課', 'jp')],
      ],
      paragraphs: [
        `捜査の結果、${rocDate(session, 'incident', 'jp')}に一連の名義貸し口座が発見され、そのうち一つの口座の開設情報があなたの情報と一致しました。詐欺集団の資金受け取りに使用された疑いがあります。`,
        '本通知が届き次第、担当者の本人確認および資金照会にご協力いただき、関与の有無を明らかにしてください。',
      ],
    },
    {
      key: 'transactions',
      title: '関係口座資金取引明細表',
      issuer: prosecutors,
      serial: serials[1],
      rows: [
        ['事件番号', session?.caseNumber ?? ''],
        ['口座末尾4桁', session?.acct4 ?? ''],
        ['照会期間', `${session?.incidentDate ?? ''} より`],
        ['作成機関', prosecutors],
      ],
      table: [
        ['入金', `NT$ ${DOC_AMOUNTS[0].toLocaleString('en-US')}`, '海外送金'],
        ['入金', `NT$ ${DOC_AMOUNTS[1].toLocaleString('en-US')}`, '第三者決済'],
        ['出金', `NT$ ${DOC_AMOUNTS[2].toLocaleString('en-US')}`, '資金洗浄の疑いのある引き出し'],
      ],
      paragraphs: [
        '上記の金額は照合の結果、本署が捜査中の詐欺事件における被害者の送金記録と一致し、資金洗浄防止法第14条違反の疑いがあります。',
      ],
    },
    {
      key: 'custody',
      title: '資金監視命令',
      issuer: court,
      serial: serials[2],
      rows: [
        ['事件番号', session?.caseNumber ?? ''],
        ['発行機関', court],
        ['発行日', rocDate(session, 'filing', 'jp')],
        ['名宛人', '事件関係者'],
        ['執行期限', `${session?.caseDate ?? ''} ${session?.deadlineLabel ?? ''} まで`],
      ],
      paragraphs: [
        'あなた名義の資金の出所の適法性を明らかにするため、期限内に名義預金を本件指定の監視口座へ移し、専任担当者による保管・照会に供するよう命じます。',
        '照会の結果、本件への関与がないと確認された場合、手続き終了後に全額を返還します。',
        '期限内に協力しない場合、法令に基づき名義下の全口座を凍結することがあります。',
      ],
    },
    {
      key: 'consent',
      title: '資産照会授権同意書',
      issuer: prosecutors,
      serial: serials[3],
      rows: [
        ['事件番号', session?.caseNumber ?? ''],
        ['同意書作成者', '調査対象の関係者'],
        ['授権範囲', '名義預金口座の照会、移転および保管'],
        ['授権期間', '本件捜査終結まで'],
      ],
      paragraphs: [
        '同意書作成者は本件資産照会手続きへの協力に同意し、担当者が指定する監視口座による名義資金の保管を授権します。',
        '同意書作成者は本件が捜査上の秘密であることを了知し、捜査期間中に本件内容を外部に開示しないことに同意します。',
      ],
      consent: '私は上記の授権内容を読み、同意しました',
    },
  ];
}

export function buildFakeDocuments(session, lang = getScenario03Lang()) {
  if (lang === 'en') return buildFakeDocumentsEn(session);
  if (lang === 'jp') return buildFakeDocumentsJp(session);
  return buildFakeDocumentsZh(session);
}

// Scene 06's task stepper - four items, the last one unlocks the
// prosecutor's phone call.
const CASE_SITE_TASKS_ZH = [
  { key: 'notice', label: '閱讀刑事案件關係人通知書', hint: '確認案件編號與受通知人資料' },
  { key: 'transactions', label: '核對涉案帳戶資金往來明細', hint: '確認帳戶末四碼是否為本人所有' },
  { key: 'custody', label: '閱讀資金監管命令', hint: '注意執行期限' },
  { key: 'consent', label: '簽署資產清查授權同意書', hint: '送出後將由檢察官來電確認' },
];

const CASE_SITE_TASKS_EN = [
  { key: 'notice', label: 'Read the Criminal Case Notice', hint: 'Confirm the case number and notice recipient' },
  { key: 'transactions', label: 'Review the account transaction record', hint: 'Confirm whether the account’s last 4 digits are yours' },
  { key: 'custody', label: 'Read the Fund Custody Order', hint: 'Note the deadline' },
  { key: 'consent', label: 'Sign the Asset Review Consent Form', hint: 'A prosecutor will call to confirm after you submit' },
];

const CASE_SITE_TASKS_JP = [
  { key: 'notice', label: '刑事事件関係者通知書を読む', hint: '事件番号と被通知者情報を確認する' },
  { key: 'transactions', label: '関係口座資金取引明細を確認する', hint: '口座末尾4桁が本人のものか確認する' },
  { key: 'custody', label: '資金監視命令を読む', hint: '執行期限に注意する' },
  { key: 'consent', label: '資産照会授権同意書に署名する', hint: '送信後、検察官から確認の電話があります' },
];

export function getCaseSiteTasks(lang = getScenario03Lang()) {
  if (lang === 'en') return CASE_SITE_TASKS_EN;
  if (lang === 'jp') return CASE_SITE_TASKS_JP;
  return CASE_SITE_TASKS_ZH;
}

export const CASE_SITE_TASKS = getCaseSiteTasks();
