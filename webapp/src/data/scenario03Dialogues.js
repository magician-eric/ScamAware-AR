// Scenario03 (假檢警) dialogue content. Every spoken/typed line in the run
// lives here, keyed by dialogue id, so line text and audio filenames can be
// swapped without touching any scene component. Scene components only ever
// reference ids via SCENARIO03_SCRIPTS.
//
// Shape:
//   dialogueId: {
//     speaker: 'officer' | 'prosecutor',
//     audioKey: key into AUDIO_FILES, or null for text-only surfaces (LINE
//               chat),
//     lines:   { zh: [...], en: [...] }  - each array entry is
//               string | (session) => string | { text, card } |
//               (session) => { text, card }
//   }
//
// One dialogue id = one audio file = one block of subtitles. Each recorded
// transcript is stored verbatim as one string so rendering cannot introduce
// whitespace that is absent from the recording.
//
// dialogue id -> audio file (final recording script - see
// public/assets/scenarios/scenario-03/audio/README.md for the full read-aloud transcript):
//   police_intro              police/police_intro.mp3      (police/police_intro_en.mp3)
//   police_identity_question  police/police_identity_question.mp3
//   police_identity_answer_a  police/police_identity_answer_a.mp3
//   police_identity_answer_b  police/police_identity_answer_b.mp3
//   police_data_leak          police/police_data_leak.mp3
//   police_case_number        police/police_case_number.mp3
//   police_add_line           police/police_add_line.mp3
//   police_return             police/police_return.mp3
//   police_online_check       police/police_online_check.mp3
//   police_online_answer_a    police/police_online_answer_a.mp3
//   police_online_answer_b    police/police_online_answer_b.mp3
//   police_custody_handoff    police/police_custody_handoff.mp3
//   police_callback_intro     police/police_callback_intro.mp3
//   police_custody_account    police/police_custody_account.mp3
//   police_bank_guide         police/police_bank_guide.mp3
//   prosecutor_intro             prosecutor/prosecutor_intro.mp3
//   prosecutor_account_question  prosecutor/prosecutor_account_question.mp3
//   prosecutor_account_answer_a  prosecutor/prosecutor_account_answer_a.mp3
//   prosecutor_account_answer_b  prosecutor/prosecutor_account_answer_b.mp3
//   prosecutor_pressure          prosecutor/prosecutor_pressure.mp3
//   prosecutor_end               prosecutor/prosecutor_end.mp3
// Each of the 21 recorded blocks above has an English counterpart with the
// same base filename plus an `_en` suffix (e.g. police_intro_en.mp3) and a
// Japanese counterpart with an `_jp` suffix (e.g. police_intro_jp.mp3), all
// in the SAME folders (public/assets/scenarios/scenario-03/audio/police, .../prosecutor).
// LINE-only blocks (line_*, custody_*) are text-only by design and carry
// no audio.
//
// These 21 fixed recordings must never contain anything that varies by
// player location or by session: no city/county name, no full police
// station/precinct/prosecutors'-office/court name, no officer or
// prosecutor name, no player name or gender address, no case number, no
// account last-4, no amount, no date/time or countdown deadline. That
// data still appears on screen (LINE case cards, the case-site, the bank
// app, the ending summary) driven by locationProfile/scenarioSession - it
// is simply never spoken. Officers/prosecutors are addressed only by
// fixed role terms (轄區警察局／偵查隊／承辦員警／地方檢察署／檢察官／
// 本署／本案／涉案帳戶／案件編號 in Chinese; Criminal Investigation
// Division / Investigating Officer / District Prosecutors' Office /
// Prosecutor / this office / this case / the account involved / case
// number in English). This rule applies equally to the English script.
import { getScenario03Choices } from './scenario03Choices';
import { getScenario03Lang } from '../pages/scenario03/i18n';
import { localizeLocationName } from '../lib/location/localizedLocationName';

// Root-absolute paths 404 once this app is served from a GitHub Pages
// project path (/CIBAR/) instead of domain root - every other scenario's
// audio/image paths already go through import.meta.env.BASE_URL for this
// reason (see RegionAgencyResolver.js, scenario01/02's video/photo consts).
const AUDIO_BASE_URL = import.meta.env?.BASE_URL ?? '/';
const POLICE_AUDIO = `${AUDIO_BASE_URL}assets/scenarios/scenario-03/audio/police`;
const PROSECUTOR_AUDIO = `${AUDIO_BASE_URL}assets/scenarios/scenario-03/audio/prosecutor`;

// Explicit lookup table (not string concatenation/replace) from an
// audioKey to the actual filename for each language, so a future language
// or a renamed recording only ever needs an edit here.
// Public so the dialogue validator can verify every recorded subtitle block
// against all three existing assets. This table and SCENARIO03_DIALOGUES are
// the Scenario03 recording/subtitle source of truth.
export const SCENARIO03_AUDIO_FILES = {
  zh: {
    policeIntro: `${POLICE_AUDIO}/police_intro.mp3`,
    policeIdentityQuestion: `${POLICE_AUDIO}/police_identity_question.mp3`,
    policeIdentityAnswerA: `${POLICE_AUDIO}/police_identity_answer_a.mp3`,
    policeIdentityAnswerB: `${POLICE_AUDIO}/police_identity_answer_b.mp3`,
    policeDataLeak: `${POLICE_AUDIO}/police_data_leak.mp3`,
    policeCaseNumber: `${POLICE_AUDIO}/police_case_number.mp3`,
    policeAddLine: `${POLICE_AUDIO}/police_add_line.mp3`,
    policeReturn: `${POLICE_AUDIO}/police_return.mp3`,
    policeOnlineCheck: `${POLICE_AUDIO}/police_online_check.mp3`,
    policeOnlineAnswerA: `${POLICE_AUDIO}/police_online_answer_a.mp3`,
    policeOnlineAnswerB: `${POLICE_AUDIO}/police_online_answer_b.mp3`,
    policeCustodyHandoff: `${POLICE_AUDIO}/police_custody_handoff.mp3`,
    policeCallbackIntro: `${POLICE_AUDIO}/police_callback_intro.mp3`,
    policeCustodyAccount: `${POLICE_AUDIO}/police_custody_account.mp3`,
    policeBankGuide: `${POLICE_AUDIO}/police_bank_guide.mp3`,
    prosecutorIntro: `${PROSECUTOR_AUDIO}/prosecutor_intro.mp3`,
    prosecutorAccountQuestion: `${PROSECUTOR_AUDIO}/prosecutor_account_question.mp3`,
    prosecutorAccountAnswerA: `${PROSECUTOR_AUDIO}/prosecutor_account_answer_a.mp3`,
    prosecutorAccountAnswerB: `${PROSECUTOR_AUDIO}/prosecutor_account_answer_b.mp3`,
    prosecutorPressure: `${PROSECUTOR_AUDIO}/prosecutor_pressure.mp3`,
    prosecutorEnd: `${PROSECUTOR_AUDIO}/prosecutor_end.mp3`,
  },
  en: {
    policeIntro: `${POLICE_AUDIO}/police_intro_en.mp3`,
    policeIdentityQuestion: `${POLICE_AUDIO}/police_identity_question_en.mp3`,
    policeIdentityAnswerA: `${POLICE_AUDIO}/police_identity_answer_a_en.mp3`,
    policeIdentityAnswerB: `${POLICE_AUDIO}/police_identity_answer_b_en.mp3`,
    policeDataLeak: `${POLICE_AUDIO}/police_data_leak_en.mp3`,
    policeCaseNumber: `${POLICE_AUDIO}/police_case_number_en.mp3`,
    policeAddLine: `${POLICE_AUDIO}/police_add_line_en.mp3`,
    policeReturn: `${POLICE_AUDIO}/police_return_en.mp3`,
    policeOnlineCheck: `${POLICE_AUDIO}/police_online_check_en.mp3`,
    policeOnlineAnswerA: `${POLICE_AUDIO}/police_online_answer_a_en.mp3`,
    policeOnlineAnswerB: `${POLICE_AUDIO}/police_online_answer_b_en.mp3`,
    policeCustodyHandoff: `${POLICE_AUDIO}/police_custody_handoff_en.mp3`,
    policeCallbackIntro: `${POLICE_AUDIO}/police_callback_intro_en.mp3`,
    policeCustodyAccount: `${POLICE_AUDIO}/police_custody_account_en.mp3`,
    policeBankGuide: `${POLICE_AUDIO}/police_bank_guide_en.mp3`,
    prosecutorIntro: `${PROSECUTOR_AUDIO}/prosecutor_intro_en.mp3`,
    prosecutorAccountQuestion: `${PROSECUTOR_AUDIO}/prosecutor_account_question_en.mp3`,
    prosecutorAccountAnswerA: `${PROSECUTOR_AUDIO}/prosecutor_account_answer_a_en.mp3`,
    prosecutorAccountAnswerB: `${PROSECUTOR_AUDIO}/prosecutor_account_answer_b_en.mp3`,
    prosecutorPressure: `${PROSECUTOR_AUDIO}/prosecutor_pressure_en.mp3`,
    prosecutorEnd: `${PROSECUTOR_AUDIO}/prosecutor_end_en.mp3`,
  },
  jp: {
    policeIntro: `${POLICE_AUDIO}/police_intro_jp.mp3`,
    policeIdentityQuestion: `${POLICE_AUDIO}/police_identity_question_jp.mp3`,
    policeIdentityAnswerA: `${POLICE_AUDIO}/police_identity_answer_a_jp.mp3`,
    policeIdentityAnswerB: `${POLICE_AUDIO}/police_identity_answer_b_jp.mp3`,
    policeDataLeak: `${POLICE_AUDIO}/police_data_leak_jp.mp3`,
    policeCaseNumber: `${POLICE_AUDIO}/police_case_number_jp.mp3`,
    policeAddLine: `${POLICE_AUDIO}/police_add_line_jp.mp3`,
    policeReturn: `${POLICE_AUDIO}/police_return_jp.mp3`,
    policeOnlineCheck: `${POLICE_AUDIO}/police_online_check_jp.mp3`,
    policeOnlineAnswerA: `${POLICE_AUDIO}/police_online_answer_a_jp.mp3`,
    policeOnlineAnswerB: `${POLICE_AUDIO}/police_online_answer_b_jp.mp3`,
    policeCustodyHandoff: `${POLICE_AUDIO}/police_custody_handoff_jp.mp3`,
    policeCallbackIntro: `${POLICE_AUDIO}/police_callback_intro_jp.mp3`,
    policeCustodyAccount: `${POLICE_AUDIO}/police_custody_account_jp.mp3`,
    policeBankGuide: `${POLICE_AUDIO}/police_bank_guide_jp.mp3`,
    prosecutorIntro: `${PROSECUTOR_AUDIO}/prosecutor_intro_jp.mp3`,
    prosecutorAccountQuestion: `${PROSECUTOR_AUDIO}/prosecutor_account_question_jp.mp3`,
    prosecutorAccountAnswerA: `${PROSECUTOR_AUDIO}/prosecutor_account_answer_a_jp.mp3`,
    prosecutorAccountAnswerB: `${PROSECUTOR_AUDIO}/prosecutor_account_answer_b_jp.mp3`,
    prosecutorPressure: `${PROSECUTOR_AUDIO}/prosecutor_pressure_jp.mp3`,
    prosecutorEnd: `${PROSECUTOR_AUDIO}/prosecutor_end_jp.mp3`,
  },
};

function resolveAudio(audioKey, lang) {
  if (!audioKey) return null;
  const table = SCENARIO03_AUDIO_FILES[lang] ?? SCENARIO03_AUDIO_FILES.zh;
  return table[audioKey] ?? null;
}

// The directing prosecutors office, in the language the beat is written in.
// The location profile stores the agency's Chinese name (it is transcribed
// reference data, not copy), so a Japanese beat that dropped it in verbatim
// used to print 臺灣臺北地方檢察署 into a Japanese run - see
// lib/location/localizedLocationName.js.
function prosecutors(session, lang) {
  const office = localizeLocationName(session?.locationProfile?.agencies?.prosecutorsOffice, lang);
  if (office) return office;
  return lang === 'en' ? 'the District Prosecutors Office' : lang === 'jp' ? '地方検察署' : '地方檢察署';
}

export const SCENARIO03_DIALOGUES = {
  // --- 第一次來電：偵查佐（制式、冷靜、不容質疑） ---------------------------
  // Final recording script (no name, no gender, no location/agency full
  // name, no "are you the account holder" identity-check theatre).
  police_intro: {
    speaker: 'officer',
    audioKey: 'policeIntro',
    lines: {
      zh: [
        '您好，這裡是轄區警察局偵查隊。我是本案承辦員警。我們正在偵辦一起詐欺及洗錢案件。案件調查中，發現有一支門號與您的身分資料有關。現在需要向您確認幾件事情。',
      ],
      en: [
        'This is the Criminal Investigation Division. I\'m the detective handling your case. We\'re investigating a fraud case. A phone number linked to your identity has come up. I need to verify a few things with you.',
      ],
      jp: [
        'こちらは警察署刑事課です。担当捜査員です。詐欺事件を捜査しています。あなた名義の電話番号が確認されました。いくつか確認します。',
      ],
    },
  },
  police_identity_question: {
    speaker: 'officer',
    audioKey: 'policeIdentityQuestion',
    lines: {
      zh: [
        '請您直接回答。這支門號是您本人申辦的嗎？您的身分證件曾經交給其他人使用嗎？',
      ],
      en: [
        'Answer directly. Did you register this phone number? Has anyone else ever used your ID?',
      ],
      jp: [
        'お答えください。この電話番号はご本人が契約しましたか。身分証を他人に渡したことはありますか。',
      ],
    },
  },
  police_identity_answer_a: {
    speaker: 'officer',
    audioKey: 'policeIdentityAnswerA',
    lines: {
      zh: [
        '好，我了解。如果不是您本人申辦，就有可能是身分遭到冒用。我們會繼續確認。',
      ],
      en: [
        'Understood. If you didn\'t register it, your identity may have been stolen. We\'ll verify it.',
      ],
      jp: [
        '承知しました。ご本人でなければ、身分証が悪用された可能性があります。確認を続けます。',
      ],
    },
  },
  police_identity_answer_b: {
    speaker: 'officer',
    audioKey: 'policeIdentityAnswerB',
    lines: {
      zh: [
        '身分資料一旦外流，就可能被拿去申辦門號或銀行帳戶。這部分我們會一併確認。',
      ],
      en: [
        'Stolen personal information is often used to open phone lines or bank accounts. We\'ll check that as well.',
      ],
      jp: [
        '個人情報が流出すると、携帯電話や銀行口座の契約に悪用されることがあります。この点も確認します。',
      ],
    },
  },
  // 原本這裡還有一個「證件影本」二選一，改成敘述帶過（同一段話講完資料外流的來源）。
  police_data_leak: {
    speaker: 'officer',
    audioKey: 'policeDataLeak',
    lines: {
      zh: [
        '目前案件已經由檢察官指揮偵辦。現階段，您需要配合調查。至於是否涉及案件，還要依調查結果判定。',
      ],
      en: [
        'The case is now under a prosecutor\'s supervision. For now, you need to cooperate with the investigation. Your involvement will be determined after verification.',
      ],
      jp: [
        'この事件は現在、検察官の指揮で捜査しています。現時点では捜査への協力が必要です。関与の有無は調査後に判断します。',
      ],
    },
  },
  police_case_number: {
    speaker: 'officer',
    audioKey: 'policeCaseNumber',
    lines: {
      zh: [
        '我現在為您建立案件。案件編號已經傳送到您的手機。請不要向任何人透露案件內容。案件目前仍在偵辦中。',
      ],
      en: [
        'Your case has been registered. The case number has been sent to your phone. Do not discuss this case with anyone. The investigation is still ongoing.',
      ],
      jp: [
        '事件を登録しました。事件番号を携帯電話へ送信しました。この件は誰にも話さないでください。現在も捜査中です。',
      ],
    },
  },
  police_add_line: {
    speaker: 'officer',
    audioKey: 'policeAddLine',
    lines: {
      zh: [
        '現在請您加我的通訊軟體。後續資料會直接傳給您。不要掛電話。',
      ],
      en: [
        'Add me on the messaging app now. I’ll send you the case documents there. Stay on the line.',
      ],
      jp: [
        '今から私をメッセージアプリに追加してください。資料を送ります。電話は切らないでください。',
      ],
    },
  },

  // --- LINE：案件說明（文字，無錄音） --------------------------------------
  line_case_brief: {
    speaker: 'officer',
    audioKey: null,
    lines: {
      zh: [
        (s) => `您好，我是剛剛跟您通話的 ${s.officerName} 偵查佐。`,
        '本案之後由我單線與您聯繫。',
        { text: '這是您的案件基本資料，請先確認一次。', card: { kind: 'case' } },
        (s, lang) => `本案由${prosecutors(s, lang)} ${s.prosecutorName} 檢察官指揮偵辦，全案*偵查不公開*。`,
      ],
      en: [
        (s) => `Hi, this is Investigating Officer ${s.officerNameEn ?? s.officerName} — we just spoke on the phone.`,
        "I'll be your only contact for this case from now on.",
        { text: "Here's your case's basic information — please confirm it.", card: { kind: 'case' } },
        (s) => `This case is directed by Prosecutor ${s.prosecutorNameEn ?? s.prosecutorName}. The whole investigation is *confidential*.`,
      ],
      jp: [
        (s) => `こんにちは、先ほどお電話した ${s.officerNameJp ?? s.officerName} 担当捜査員です。`,
        '本件は今後、私が単独で連絡します。',
        { text: 'こちらがあなたの事件の基本情報です。まず確認してください。', card: { kind: 'case' } },
        (s, lang) => `本件は${prosecutors(s, lang)} ${s.prosecutorNameJp ?? s.prosecutorName} 検察官の指揮のもと捜査しており、全件*捜査上の秘密*です。`,
      ],
    },
  },
  // One line only. The block used to end on a second, contentless bubble
  // ("我先確認一件事：" / "Let me confirm one thing first:" / "まず一つ確認しま
  // す。") whose whole job was to announce the question that the choice panel
  // was already about to ask - a bubble the player had to sit through to reach
  // the two options underneath it. It is deleted, not reworded: the
  // outside_verification choice beat immediately follows this block in
  // SCENARIO03_SCRIPTS.lineIntro and carries its own question text.
  line_verification_prompt: {
    speaker: 'officer',
    audioKey: null,
    lines: {
      zh: [
        '接下來我需要您配合完成身分與資料查核。',
      ],
      en: [
        'Next, I need you to cooperate with an identity and records check.',
      ],
      jp: [
        'これから本人確認と資料の照合にご協力ください。',
      ],
    },
  },
  line_reply_cooperate: {
    speaker: 'officer',
    audioKey: null,
    lines: {
      zh: [
        '很好。配合度是檢察官判斷您有沒有涉案的重要參考，',
        '您這個態度對您自己最有利。',
      ],
      en: [
        'Good. Your cooperation is an important factor in how the prosecutor judges your involvement,',
        'and this attitude works in your favor.',
      ],
      jp: [
        'よろしいです。協力の姿勢は検察官があなたの関与を判断する重要な材料になります。',
        'その態度はあなた自身にとって有利に働きます。',
      ],
    },
  },
  line_reply_family: {
    speaker: 'officer',
    audioKey: null,
    lines: {
      zh: [
        '不行。本案*偵查不公開*，現階段還無法排除您身邊的人涉案。',
        '您如果先去問家人或撥165，等於把偵查內容講出去，這叫*串證*，可能有另涉洩密，我這邊也會被記過處分。',
        '我知道您會想找人商量，但這件事只能您自己處理。',
        '現在整個單位裡，*我是唯一站在您這邊的人*。',
      ],
      en: [
        "No. This investigation is *confidential*, and we can't yet rule out the people around you.",
        "If you ask your family or call 165 first, that's disclosing the investigation, which is *tampering with evidence*, and could get me disciplined for the leak too.",
        "I know you want to talk to someone, but this is something only you can handle.",
        "Right now, *I'm the only person in this office on your side*.",
      ],
      jp: [
        'だめです。本件は*捜査上の秘密*であり、現段階ではあなたの周囲の人の関与も排除できません。',
        '先に家族に聞いたり165に電話したりすると、捜査内容を漏らすことになり、*証拠隠滅*にあたります。私も守秘義務違反で処分されかねません。',
        '誰かに相談したい気持ちはわかりますが、これはあなた自身で対応するしかありません。',
        '今この部署の中で、*あなたの味方は私だけです*。',
      ],
    },
  },
  line_case_site: {
    speaker: 'officer',
    audioKey: null,
    lines: {
      zh: [
        '請您現在登入本案的線上案件系統，確認案件狀態，',
        '裡面有檢察官核發的文件。',
        { text: '系統有時限，超過期限沒完成查核，會直接轉為強制程序。', card: { kind: 'status' } },
      ],
      en: [
        "Please log into this case's online system now to check its status.",
        "It has the documents issued by the prosecutor.",
        { text: 'The system has a deadline. If verification is not completed in time, it moves straight to mandatory proceedings.', card: { kind: 'status' } },
      ],
      jp: [
        '今すぐ本件の事件状況照会システムにログインし、事件の状況を確認してください。',
        '検察官が発行した書類が入っています。',
        { text: 'システムには期限があります。期限内に確認が完了しない場合、そのまま強制手続きに移行します。', card: { kind: 'status' } },
      ],
    },
  },

  // --- 電話：假檢察官（嚴厲、居高臨下，明顯比兩次員警都兇） ----------------
  // Final recording script: no name, no gender, no account last-4/amount
  // (those stay on-screen in the case document cards), addressed only as 你.
  prosecutor_intro: {
    speaker: 'prosecutor',
    audioKey: 'prosecutorIntro',
    lines: {
      zh: [
        '我是本案承辦檢察官。現在由我接手訊問。請直接回答我的問題。',
      ],
      en: [
        'I\'m the prosecutor assigned to this case. I\'m taking over now. Answer my questions directly.',
      ],
      jp: [
        '本件担当の検察官です。これから私が確認します。質問にだけ答えてください。',
      ],
    },
  },
  prosecutor_account_question: {
    speaker: 'prosecutor',
    audioKey: 'prosecutorAccountQuestion',
    lines: {
      zh: [
        '名下共有幾個銀行帳戶？一個一個回答。不要遺漏。',
      ],
      en: [
        'How many bank accounts do you have? List them one by one. Don\'t leave any out.',
      ],
      jp: [
        '銀行口座はいくつありますか。一つずつ答えてください。漏れなく答えてください。',
      ],
    },
  },
  prosecutor_account_answer_a: {
    speaker: 'prosecutor',
    audioKey: 'prosecutorAccountAnswerA',
    lines: {
      zh: [
        '我知道了。請保持通話。我正在查核資料。',
      ],
      en: [
        'Understood. Stay on the line. I\'m verifying your records.',
      ],
      jp: [
        'わかりました。そのままお待ちください。内容を確認します。',
      ],
    },
  },
  prosecutor_account_answer_b: {
    speaker: 'prosecutor',
    audioKey: 'prosecutorAccountAnswerB',
    lines: {
      zh: [
        '您的回答和目前資料不一致。請重新回答。不要隱瞞。',
      ],
      en: [
        'Your answer doesn\'t match our records. Answer again. Don\'t hide anything.',
      ],
      jp: [
        'あなたの回答は記録と一致しません。もう一度答えてください。隠さないでください。',
      ],
    },
  },
  // 原本這裡還有一個「接受凍結／配合清查」二選一，改成檢察官單方施壓的敘述。
  prosecutor_pressure: {
    speaker: 'prosecutor',
    audioKey: 'prosecutorPressure',
    lines: {
      zh: [
        '我現在正式告知您。本案涉及詐欺及洗錢犯罪。如果無法證明資金來源，您將依法接受後續調查。請配合。',
      ],
      en: [
        'I\'m informing you officially. This case involves fraud and money laundering. If you can\'t explain the source of the funds, you\'ll remain under investigation. Cooperate.',
      ],
      jp: [
        '正式にお伝えします。本件は詐欺および資金洗浄事件です。資金の出所を説明できない場合は、引き続き調査の対象となります。捜査に協力してください。',
      ],
    },
  },
  // RETAINED BUT NOT PLAYED. This block belongs to the older flow, where the
  // prosecutor stayed on the line and the officer took over mid-call. In the
  // current flow the prosecutor hangs up after prosecutor_pressure and the
  // officer rings back as a separate call, so his own recording - "沒有我的
  // 同意，不要中斷通話。現在開始執行。" - directly contradicts what happens
  // next, and the handoff narration it used to carry now lives in
  // police_callback_intro ("剛才檢察官已經把後續處理交代給我") where a
  // recording actually backs it.
  //
  // It is therefore removed from SCENARIO03_SCRIPTS.prosecutorCall rather
  // than rewritten: the three MP3s stay on disk and stay registered in
  // SCENARIO03_AUDIO_FILES (nothing is deleted), and the subtitles below are
  // kept verbatim as the transcript of those recordings. Keeping text and
  // audio identical is the point - it is why there is no voice/text mismatch
  // anywhere in scenario03, played or not. Never re-add this id to a script
  // without re-recording the clips first.
  prosecutor_end: {
    speaker: 'prosecutor',
    audioKey: 'prosecutorEnd',
    lines: {
      zh: [
        '接下來請依照指示處理。沒有我的同意，不要中斷通話。現在開始執行。',
      ],
      en: [
        'Follow my instructions from this point forward. Do not end this call without my permission. Begin now.',
      ],
      jp: [
        'これからは私の指示に従ってください。許可なく電話を切らないでください。それでは始めます。',
      ],
    },
  },

  // --- LINE：員警二次出場（溫和、扮演唯一的盟友） --------------------------
  police_return: {
    speaker: 'officer',
    audioKey: 'policeReturn',
    lines: {
      zh: [
        '好，資料已經傳送。請打開確認。上面的姓名和證件號碼，是您的資料嗎？',
      ],
      en: [
        'The documents have been sent. Open them now. Is the name and ID number yours?',
      ],
      jp: [
        '資料を送信しました。今すぐ開いてください。記載されている氏名と身分証番号は、あなたのものですか。',
      ],
    },
  },
  police_online_check: {
    speaker: 'officer',
    audioKey: 'policeOnlineCheck',
    lines: {
      zh: [
        '接下來要進行線上筆錄。請找一個沒有人打擾的地方。不要讓其他人聽到。',
      ],
      en: [
        'We’re starting the interview now. Go somewhere private. No one else should hear this call.',
      ],
      jp: [
        'これから事情聴取を行います。誰にも邪魔されない場所へ移動してください。ほかの人に聞かせないでください。',
      ],
    },
  },
  police_online_answer_a: {
    speaker: 'officer',
    audioKey: 'policeOnlineAnswerA',
    lines: {
      zh: [
        '可以。現在戴上耳機。確認周圍沒有人，再回答我的問題。',
      ],
      en: [
        'Good. Put on your earphones. Make sure no one is nearby, then answer my questions.',
      ],
      jp: [
        'わかりました。イヤホンを着けてください。周囲に誰もいないことを確認してから答えてください。',
      ],
    },
  },
  police_online_answer_b: {
    speaker: 'officer',
    audioKey: 'policeOnlineAnswerB',
    lines: {
      zh: [
        '不行。這是偵查中的案件。請立刻移動到可以單獨通話的地方。',
      ],
      en: [
        'No. This is an active investigation. Move somewhere private now.',
      ],
      jp: [
        'だめです。現在捜査中の事件です。すぐに一人で話せる場所へ移動してください。',
      ],
    },
  },
  // 第二通承辦員警電話，玩家按下接聽後才播放（PoliceCallback stage
  // 'incall'）。取代先前那個沒有錄音的 text-only 版本。
  police_callback_intro: {
    speaker: 'officer',
    audioKey: 'policeCallbackIntro',
    lines: {
      zh: [
        '剛才檢察官已經把後續處理交代給我。接下來由我協助您完成資金查核。電話先不要掛，我會一步一步告訴您怎麼操作。',
      ],
      en: [
        "The prosecutor has given me the follow-up instructions. I'll assist you with the financial verification from here. Stay on the call. I'll guide you through the process step by step.",
      ],
      jp: [
        '先ほど検察官から今後の対応について指示を受けています。これから私が資金確認の手続きを案内します。電話は切らず、そのままにしてください。操作を一つずつ説明します。',
      ],
    },
  },
  // LINE 監管帳戶資料卡已經實際顯示後才播放（LineCustody）。
  // 第二通電話保持 active，不播 hangup。
  police_custody_account: {
    speaker: 'officer',
    audioKey: 'policeCustodyAccount',
    lines: {
      zh: [
        '案件監管帳戶資料已經傳到 LINE。請打開確認案件編號、銀行名稱和帳戶資料。確認後不要掛電話，直接開啟您的網路銀行。',
      ],
      en: [
        "I've sent the case supervision account details to you on LINE. Open it and check the case number, bank name, and account information. Once you've confirmed the details, stay on the call and open your online banking app.",
      ],
      jp: [
        '事件の監管口座情報をLINEに送信しました。事件番号、銀行名、口座情報を確認してください。確認できたら電話は切らず、そのままネットバンキングを開いてください。',
      ],
    },
  },
  // BankSite 轉帳表單（監管帳戶與案件資料已在畫面上）才播放，
  // 不在 LineCustody 提前播。
  police_bank_guide: {
    speaker: 'officer',
    audioKey: 'policeBankGuide',
    lines: {
      zh: [
        '現在照畫面上的資料操作。監管帳戶和案件資料都已經核對過，不要自行更改。完成以前不要中斷通話，也不要聯絡銀行客服，以免影響案件查核。',
      ],
      en: [
        "Follow the information shown on the screen. The supervision account and case details have already been verified, so do not change them. Stay on the call until the process is complete, and do not contact the bank's customer service, as this may interfere with the investigation.",
      ],
      jp: [
        '画面に表示されている情報どおりに操作してください。監管口座と事件情報はすでに確認済みですので、変更しないでください。手続きが完了するまで電話を切らず、捜査に影響するため銀行のカスタマーサービスにも連絡しないでください。',
      ],
    },
  },
  // 監管帳戶提醒卡不在正式錄音範圍內，保留在下方的
  // text-only custody_handoff_note。
  police_custody_handoff: {
    speaker: 'officer',
    audioKey: 'policeCustodyHandoff',
    lines: {
      zh: [
        '現在案件由檢察官接手。接下來，他問什麼，您就回答什麼。不要隱瞞，也不要打斷。',
      ],
      en: [
        'The prosecutor is taking over now. Answer every question directly. Do not hide anything. Do not interrupt.',
      ],
      jp: [
        'これから検察官に代わります。質問にはそのまま答えてください。隠さないでください。途中で話を遮らないでください。',
      ],
    },
  },
  custody_handoff_note: {
    speaker: 'officer',
    audioKey: null,
    lines: {
      zh: [
        { text: '記得，全程不要跟任何人提起本案，包括銀行客服。', card: { kind: 'reminder' } },
      ],
      en: [
        { text: 'Remember: do not mention this case to anyone, including bank customer service.', card: { kind: 'reminder' } },
      ],
      jp: [
        { text: '忘れないでください。銀行の窓口担当者を含め、誰にも本件を話さないでください。', card: { kind: 'reminder' } },
      ],
    },
  },

  // --- LINE：資金監管任務單（文字，無錄音） --------------------------------
  custody_task: {
    speaker: 'officer',
    audioKey: null,
    lines: {
      zh: [
        '這是檢察官核可的資金監管任務單，你照著上面做就可以了。',
        { text: '監管期間款項由專責人員保管，清查完畢會全額返還，這點你放心。', card: { kind: 'custody' } },
        (s) => `務必在今天 ${s.deadlineLabel} 前完成，`,
        '*逾時系統會自動轉為強制凍結*，我就幫不上忙了。',
        '接下來需要確認涉案帳戶的資金狀態。',
        { text: '請開啟下方安全驗證頁面，登入後依畫面完成帳戶確認。', card: { kind: 'bankLink' } },
      ],
      en: [
        "This is the fund custody task order approved by the prosecutor. Just follow it.",
        { text: 'During custody, a designated officer holds the funds. It will be returned in full once verification is complete, so don\'t worry.', card: { kind: 'custody' } },
        (s) => `You must finish this today by ${s.deadlineLabel},`,
        '*or the system will automatically switch to a mandatory freeze* — I won\'t be able to help at that point.',
        'Next, we need to confirm the status of the funds in the account involved.',
        { text: 'Open the secure verification page below, sign in, and complete the account confirmation as shown on screen.', card: { kind: 'bankLink' } },
      ],
      jp: [
        'これは検察官が承認した資金監視タスク指示書です。このとおりに進めてください。',
        { text: '監視期間中は専任の担当者が資金を保管し、確認が終われば全額返還されるのでご安心ください。', card: { kind: 'custody' } },
        (s) => `必ず本日 ${s.deadlineLabel} までに完了してください。`,
        '*期限を過ぎるとシステムが自動的に強制凍結に切り替わります*。そうなると私にも手伝えなくなります。',
        'つぎに、事件に関係する口座の資金状況を確認する必要があります。',
        { text: '下の安全認証ページを開き、ログインして画面の案内どおり口座確認を完了してください。', card: { kind: 'bankLink' } },
      ],
    },
  },

  // --- LINE：轉帳完成之後（文字，無錄音） ---------------------------------
  // The one message the scam sends after the money has moved, and the only
  // Scenario 03 line the fake prosecutor ever types rather than says. It is
  // deliberately warm and asks for nothing: the point of this beat is that
  // the pressure stops the moment the transfer clears, and what replaces it
  // is a wait that never ends. Reached only from the 完成轉帳 branch (see
  // Aftermath.jsx's mount guard) - the 165 branch never sees it.
  aftermath_prosecutor_wait: {
    speaker: 'prosecutor',
    audioKey: null,
    lines: {
      zh: [
        '你做得很好，請等待我們的消息。',
      ],
      en: [
        'You did well. Wait for our message.',
      ],
      jp: [
        'よくやりました。こちらからの連絡をお待ちください。',
      ],
    },
  },
};

// One entry per dialogue-driven scene. Strings are dialogue ids; objects of
// the form { choice: id } insert one of the 2-choice moments
// (see scenario03Choices.js).
export const SCENARIO03_SCRIPTS = {
  callStage1: [
    'police_intro',
    'police_identity_question',
    { choice: 'identity_theft' },
    'police_data_leak',
    'police_case_number',
    'police_add_line',
  ],
  lineIntro: [
    'line_case_brief',
    'line_verification_prompt',
    { choice: 'outside_verification' },
    'line_case_site',
  ],
  // There is deliberately no `policeHandoff` script any more. Its one line,
  // police_custody_handoff ("現在案件由檢察官接手…"), was played inside the
  // centre-screen "檢察官來電確認" overlay on the case site - an announcement
  // that a call was about to arrive, stacked on top of the case site, right
  // before the prosecutor's actual ring screen said the same thing. The
  // overlay is gone and the case site now routes straight to the ring
  // screen, so the line has nowhere it belongs. The dialogue entry and its
  // three recordings are kept below/registered so the clips stay reachable
  // if the beat is ever restaged on a call surface of its own.
  // Ends on prosecutor_pressure: that is the last prosecutor line with a
  // recording that matches the current flow. prosecutor_end is deliberately
  // absent (see its entry above) - its recording still tells the player not
  // to hang up, which the officer's separate callback immediately
  // contradicts. police_callback_intro carries the handoff instead.
  prosecutorCall: [
    'prosecutor_intro',
    'prosecutor_account_question',
    { choice: 'account_relationship' },
    'prosecutor_pressure',
  ],
  policeCallback: ['police_callback_intro'],
  // 完成轉帳後的 LINE 收尾，只有受騙分支會播（Aftermath.jsx）。
  aftermathProsecutor: ['aftermath_prosecutor_wait'],
  lineCustody: ['custody_task'],
  lineCustodyAccount: ['police_custody_account'],
  bankGuide: ['police_bank_guide'],
};

function resolveSpeakerLabel(entry, session, lang) {
  if (entry.speakerLabel) {
    return typeof entry.speakerLabel === 'object' ? entry.speakerLabel[lang] ?? entry.speakerLabel.zh : entry.speakerLabel;
  }
  if (entry.speaker === 'prosecutor') {
    if (lang === 'en') return `Prosecutor ${session?.prosecutorNameEn ?? session?.prosecutorName ?? ''}`;
    if (lang === 'jp') return `${session?.prosecutorNameJp ?? session?.prosecutorName ?? ''} 検察官`;
    return `${session?.prosecutorName ?? ''} 檢察官`;
  }
  if (lang === 'en') return session?.officerNameEn ?? session?.officerName ?? '';
  if (lang === 'jp') return session?.officerNameJp ?? session?.officerName ?? '';
  return session?.officerName ?? '';
}

// `lang` reaches the line builders because a few of them interpolate an
// agency name, which has to be resolved in the player's language rather than
// taken verbatim out of the (Chinese) location profile.
function normalizeLine(line, session, lang) {
  const resolved = typeof line === 'function' ? line(session, lang) : line;
  const raw = typeof resolved === 'object' && resolved !== null ? resolved : { text: resolved };
  return {
    text: typeof raw.text === 'function' ? raw.text(session, lang) : raw.text,
    card: raw.card,
  };
}

// Expands one dialogue id into the beats useScriptPlayer plays.
//
// A recorded block (entry.audioKey set) becomes exactly ONE beat: all of
// its lines joined into a single paragraph, shown for the whole clip
// (audioStart 0 -> audioEnd 1 = the real recording's actual measured
// duration, via <audio>.duration - see useScenarioAudio/useScriptPlayer).
// Splitting one clip into several beats used to guess each sentence's
// share of the clip from its character count, which never matches a real
// performance's actual pacing (pauses, emphasis, speaking rate all vary
// per sentence) - the subtitle would drift out of sync with what's
// actually being said as the clip went on. Showing the full block at once
// for the clip's whole length sidesteps that guesswork entirely and
// matches how the English/Japanese lines already render (one full
// sentence/paragraph on screen, no per-character typewriter).
//
// A text-only block (audioKey null - LINE chat) keeps one
// beat per line: those render as separate chat bubbles accumulating in a
// scrolling log, not a single overwritten subtitle plate, so each line
// still needs its own beat/timing.
export function buildDialogueBeats(dialogueId, session, lang = getScenario03Lang()) {
  const entry = SCENARIO03_DIALOGUES[dialogueId];
  if (!entry) return [];
  const rawLines = entry.lines[lang] ?? entry.lines.zh;
  const lines = rawLines.map((line) => normalizeLine(line, session, lang));
  const speakerLabel = resolveSpeakerLabel(entry, session, lang);
  const audioSrc = resolveAudio(entry.audioKey, lang);

  if (audioSrc) {
    const text = lines.map((line) => line.text).filter(Boolean).join(' ');
    return [{
      id: `${dialogueId}-0`,
      dialogueId,
      speaker: entry.speaker,
      speakerLabel,
      text,
      card: undefined,
      audioSrc,
      audioLead: true,
      audioStart: 0,
      audioEnd: 1,
    }];
  }

  return lines.map((line, i) => ({
    id: `${dialogueId}-${i}`,
    dialogueId,
    speaker: entry.speaker,
    speakerLabel,
    text: line.text,
    card: line.card,
    audioSrc: null,
    audioLead: false,
    audioStart: null,
    audioEnd: null,
  }));
}

function buildChoiceBeat(choiceId, session, lang) {
  const choices = getScenario03Choices(lang);
  const choice = choices[choiceId];
  if (!choice) return null;
  return {
    id: `choice-${choiceId}`,
    type: 'choice',
    momentKey: choice.momentKey,
    question: choice.question,
    options: choice.options.map((option) => ({
      id: option.id,
      label: option.text,
      playerLine: option.playerLine ?? option.text,
      flags: option.flags ?? [],
      reply: option.response ? buildDialogueBeats(option.response, session, lang) : [],
    })),
  };
}

// The only thing a scene component calls: give it a script key and the
// session, get back the beat list for useScriptPlayer. Resolves the current
// language itself (see getScenario03Lang()) so scene components never have
// to think about it.
export function buildScenario03Script(sceneKey, session, lang = getScenario03Lang()) {
  const steps = SCENARIO03_SCRIPTS[sceneKey] ?? [];
  const beats = [];
  steps.forEach((step) => {
    if (typeof step === 'string') {
      beats.push(...buildDialogueBeats(step, session, lang));
      return;
    }
    const choiceBeat = buildChoiceBeat(step.choice, session, lang);
    if (choiceBeat) beats.push(choiceBeat);
  });
  return beats;
}
