// Scenario03 (假檢警) 二選一時刻. Exactly four in the whole run, and every
// one of them merges back into the same main line - neither option is ever
// "right" or "wrong", the scam simply has an answer prepared for both.
//
//   1 identity_theft       第一通電話・偵查佐：門號/帳戶是不是本人申辦
//   2 outside_verification LINE・偵查佐：要不要先問家人或撥 165
//   3 account_relationship 電話・假檢察官：名下總共有幾個銀行帳戶（承接
//                          prosecutor_account_question 的錄音原文，不是
//                          帳戶關係 - 見 scenario03Dialogues.js 的
//                          prosecutor_account_question/_answer_a/_b）
//   4 final.decision       銀行確認頁（FinalDecision.jsx，非對話腳本）
//
// `response` names a dialogue id in scenario03Dialogues.js; `flags` are the
// warning flags the endings read back (see WARNING_FLAG_LABELS). Question/
// option/playerLine text is kept per-language here (`zh`/`en`/`jp` objects) -
// scenario03Dialogues.js's buildScenario03Script() picks the right language
// via getScenario03Lang() when it builds the choice beat, exactly the same
// way it already resolves dialogue lines and audio files.
import { getScenario03Lang } from '../pages/scenario03/i18n';

const CHOICES_ZH = {
  identity_theft: {
    momentKey: 'call.ownership',
    question: '您是否曾申辦過我們剛才提到的門號，或將身分資料交給他人使用？',
    options: [
      {
        id: 'never-applied',
        text: '我沒有申辦，也沒有授權他人使用',
        playerLine: '我沒有申辦過，也沒有授權任何人使用我的資料。',
        flags: [],
        response: 'police_identity_answer_a',
      },
      {
        id: 'lost-id',
        text: '我的證件或身分資料可能曾經外流',
        playerLine: '我的證件或身分資料以前可能曾經外流過。',
        flags: [],
        response: 'police_identity_answer_b',
      },
    ],
  },

  outside_verification: {
    momentKey: 'line.cooperate',
    question: '案件進行期間，您打算怎麼處理？',
    options: [
      {
        id: 'cooperate',
        text: '我先配合完成身分確認',
        playerLine: '我先配合完成身分確認。',
        flags: ['agreed_to_cooperate'],
        response: 'line_reply_cooperate',
      },
      {
        id: 'ask-family',
        text: '我要先詢問家人或撥打 165',
        playerLine: '我想先問家人，或是自己撥 165 查證。',
        flags: ['isolated_from_family'],
        response: 'line_reply_family',
      },
    ],
  },

  account_relationship: {
    momentKey: 'prosecutor.account',
    question: '你名下總共有幾個銀行帳戶？',
    options: [
      {
        id: 'told-all',
        text: '我把所有帳戶都講了，包括那個涉案帳戶',
        playerLine: '我把名下所有帳戶都如實告訴您了，包括那個涉案帳戶在內。',
        flags: [],
        response: 'prosecutor_account_answer_a',
      },
      {
        id: 'left-one-out',
        text: '我只講了部分帳戶，可能漏掉一個',
        playerLine: '我剛才只講了部分帳戶，可能漏講了一個。',
        flags: [],
        response: 'prosecutor_account_answer_b',
      },
    ],
  },

};

const CHOICES_EN = {
  identity_theft: {
    momentKey: 'call.ownership',
    question: 'Did you ever register the phone number we just mentioned, or give your ID to someone else to use?',
    options: [
      {
        id: 'never-applied',
        text: "I didn't register it, and I never authorized anyone to use it",
        playerLine: "I never registered it, and I never authorized anyone to use my information.",
        flags: [],
        response: 'police_identity_answer_a',
      },
      {
        id: 'lost-id',
        text: 'My ID or personal information may have been leaked before',
        playerLine: 'My ID or personal information may have been leaked before.',
        flags: [],
        response: 'police_identity_answer_b',
      },
    ],
  },

  outside_verification: {
    momentKey: 'line.cooperate',
    question: 'While the case is ongoing, what will you do?',
    options: [
      {
        id: 'cooperate',
        text: "I'll cooperate with the identity check first",
        playerLine: "I'll cooperate with the identity check first.",
        flags: ['agreed_to_cooperate'],
        response: 'line_reply_cooperate',
      },
      {
        id: 'ask-family',
        text: 'I want to ask my family or call 165 first',
        playerLine: "I'd like to ask my family first, or call 165 myself to verify.",
        flags: ['isolated_from_family'],
        response: 'line_reply_family',
      },
    ],
  },

  account_relationship: {
    momentKey: 'prosecutor.account',
    question: 'How many bank accounts do you have in total?',
    options: [
      {
        id: 'told-all',
        text: 'I listed all of them, including the account involved',
        playerLine: "I've told you all my accounts, including the one involved in this case.",
        flags: [],
        response: 'prosecutor_account_answer_a',
      },
      {
        id: 'left-one-out',
        text: 'I only listed some — I may have missed one',
        playerLine: 'I only listed some of them just now — I may have missed one.',
        flags: [],
        response: 'prosecutor_account_answer_b',
      },
    ],
  },

};

const CHOICES_JP = {
  identity_theft: {
    momentKey: 'call.ownership',
    question: 'この電話番号はご本人が契約しましたか。あるいは身分証を他人に渡したことはありますか。',
    options: [
      {
        id: 'never-applied',
        text: '契約していませんし、誰にも使用を許可していません',
        playerLine: '私は契約していませんし、誰にも自分の情報の使用を許可していません。',
        flags: [],
        response: 'police_identity_answer_a',
      },
      {
        id: 'lost-id',
        text: '証件や身分情報が以前流出した可能性があります',
        playerLine: '私の証件や身分情報が以前流出した可能性があります。',
        flags: [],
        response: 'police_identity_answer_b',
      },
    ],
  },

  outside_verification: {
    momentKey: 'line.cooperate',
    question: '事件が進行している間、あなたはどうしますか？',
    options: [
      {
        id: 'cooperate',
        text: 'まず本人確認に協力する',
        playerLine: 'まず本人確認に協力します。',
        flags: ['agreed_to_cooperate'],
        response: 'line_reply_cooperate',
      },
      {
        id: 'ask-family',
        text: '先に家族に聞くか165に電話する',
        playerLine: '先に家族に聞くか、自分で165に電話して確認したいです。',
        flags: ['isolated_from_family'],
        response: 'line_reply_family',
      },
    ],
  },

  account_relationship: {
    momentKey: 'prosecutor.account',
    question: '銀行口座は全部でいくつありますか？',
    options: [
      {
        id: 'told-all',
        text: 'その関係口座も含め、全部答えました',
        playerLine: 'その関係口座も含めて、名義の口座はすべてお伝えしました。',
        flags: [],
        response: 'prosecutor_account_answer_a',
      },
      {
        id: 'left-one-out',
        text: '一部しか答えていません。一つ漏れているかもしれません',
        playerLine: 'さきほどは一部しか答えていませんでした。一つ漏れているかもしれません。',
        flags: [],
        response: 'prosecutor_account_answer_b',
      },
    ],
  },

};

// A function, not a frozen const: this module can be imported once and
// reused across an entire SPA session, so the language has to be resolved
// at call time (every time buildChoiceBeat() asks for it), not once at
// module-evaluation time - otherwise a language switch after the bundle is
// already loaded would silently keep serving the old language.
export function getScenario03Choices(lang = getScenario03Lang()) {
  if (lang === 'en') return CHOICES_EN;
  if (lang === 'jp') return CHOICES_JP;
  return CHOICES_ZH;
}

// Back-compat/default export for any call site that doesn't need explicit
// language control - resolves the language at import time. Prefer
// getScenario03Choices() from code that runs after the player may have
// changed languages.
export const SCENARIO03_CHOICES = getScenario03Choices();
