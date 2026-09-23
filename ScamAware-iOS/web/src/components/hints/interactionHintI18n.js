// The shared inactivity hint's 中文 / English / 日本語 copy.
//
// Same pattern as the entry screens (pages/gestureTutorial/i18n.js,
// pages/arScan/i18n.js): the language the player picked on /language is read
// back through the app-wide selector (src/lib/lang.js), and no Chinese,
// English or Japanese string appears in the JSX. Internal locale code for
// Japanese is always 'jp' - never 'ja'.
import { getLanguage } from '../../lib/lang';
import { INACTIVITY_HINTS } from '../../lib/arInteraction/inactivityHint';

export function getInteractionHintLang() {
  const lang = getLanguage();
  if (lang === 'en') return 'en';
  if (lang === 'jp') return 'jp';
  return 'zh';
}

// One line per shape of the moment, keyed by what is actually callable:
//
//   dual   both directions are live - the player picks a side
//   right  only RIGHT is live: a one-action screen, or a two-action screen
//          whose left side is switched off right now
//   left   only LEFT is live
//
// The direction words here are the same mapping the gesture tutorial teaches
// (pages/gestureTutorial/i18n.js) - LEFT takes the left-hand option, RIGHT the
// right-hand one - because a run that taught one thing and then hinted another
// would be worse than not hinting at all.
//
// The English and Japanese are written for their own readers rather than
// transposed word for word: Japanese uses 手を振る for the wave the rest of the
// app calls 振る, and keeps the ください register the entry screens use.
// ScamAware-iOS: the iPhone port is operated by tapping the screen, so the
// hint names taps on the on-screen options instead of the glasses' waves.
const STRINGS = {
  zh: {
    [INACTIVITY_HINTS.DUAL]: '請點選畫面上的選項，選擇你的答案。',
    [INACTIVITY_HINTS.RIGHT]: '請點選畫面上的按鈕，繼續體驗。',
    [INACTIVITY_HINTS.LEFT]: '請點選畫面左側的選項。',
  },
  en: {
    [INACTIVITY_HINTS.DUAL]: 'Tap an option on the screen to choose your answer.',
    [INACTIVITY_HINTS.RIGHT]: 'Tap the button on the screen to continue.',
    [INACTIVITY_HINTS.LEFT]: 'Tap the option on the left.',
  },
  jp: {
    [INACTIVITY_HINTS.DUAL]: '画面の選択肢をタップして、回答を選んでください。',
    [INACTIVITY_HINTS.RIGHT]: '画面のボタンをタップして、次へ進んでください。',
    [INACTIVITY_HINTS.LEFT]: '左側の選択肢をタップしてください。',
  },
};

export function getInteractionHintStrings(lang = getInteractionHintLang()) {
  return STRINGS[lang] ?? STRINGS.zh;
}
