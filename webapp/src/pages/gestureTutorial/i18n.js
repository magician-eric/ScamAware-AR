// Gesture tutorial 中文 / English / 日本語 copy + language switch.
//
// Same pattern as the other entry screens (pages/arScan/i18n.js,
// pages/scenarioMenuI18n.js): the language the player picked on /language is
// read back through the existing app-wide selector (src/lib/lang.js). No new
// storage, no new route, no per-language screen - and no Chinese, English or
// Japanese string anywhere in the JSX. Internal locale code for Japanese is
// always 'jp' - never 'ja'.
import { getLanguage } from '../../lib/lang';

export function getGestureTutorialLang() {
  const lang = getLanguage();
  if (lang === 'en') return 'en';
  if (lang === 'jp') return 'jp';
  return 'zh';
}

// One entry per tutorial step, plus the page heading, the three standing
// notes and the completion line.
//
// `left` / `right` are named after the two gestures the tutorial teaches, and
// each carries what the player reads on that side:
//
//   title        the gesture, in two or three words
//   instruction  how to make it - an open palm, moved slowly
//   rule         what it DOES in the run, which is the part a player cannot
//                work out by waving: LEFT picks the left-hand answer of a
//                two-option screen, RIGHT the right-hand one
//   success      the one line that confirms this step landed. It is the step's
//                own, so "the left wave worked" and "the right wave worked"
//                are never the same sentence, and neither of them is the
//                tutorial being over - `complete` below is that.
//
// The rule lines are on screen because the mapping they describe is the
// app-wide one (lib/arInteraction/interactionContract.js) and the tutorial is
// the only place a player is ever told it. They are player-facing copy, not a
// note about the code.
//
// The three standing lines below the steps are not states and are never
// switched off:
//
//   singleOption  the other half of the mapping: a screen with one action has
//                 no LEFT at all, and RIGHT takes it
//   reminder      the one mistake that makes the sensor miss a real wave
//   pointerHint   that a finger or a mouse works too, so a player on a phone
//                 or a laptop is never stuck waiting for a sensor that is not
//                 there
//
// The English and Japanese are written for their own readers rather than
// transposed word-for-word from the Chinese: English says "swipe" for the one
// motion both the panels and the run's own hints name, and Japanese keeps the
// ください register the rest of the entry screens use. What all three have to
// carry identically is the DIRECTION and what it picks - that mapping is the
// contract, and it cannot come out different in one language.
const STRINGS = {
  zh: {
    heading: '手勢操作教學',
    left: {
      title: '向左揮',
      instruction: '張開手掌，慢慢向左揮動',
      rule: '向左揮，選擇左邊的選項',
      success: '左揮成功！',
    },
    right: {
      title: '向右揮',
      instruction: '張開手掌，慢慢向右揮動',
      rule: '向右揮，選擇右邊的選項',
      success: '右揮成功！',
    },
    singleOption: '只有一個選項時，向右揮即可選擇',
    reminder: '請放慢揮手速度，揮動太快可能無法辨識',
    pointerHint: '手機或電腦操作時，也可以直接點擊畫面上的選項',
    complete: '手勢教學完成！',
  },
  en: {
    heading: 'Gesture Tutorial',
    left: {
      title: 'Swipe left',
      instruction: 'Open your hand and slowly swipe left.',
      rule: 'Swipe left to choose the option on the left.',
      success: 'Left swipe successful!',
    },
    right: {
      title: 'Swipe right',
      instruction: 'Open your hand and slowly swipe right.',
      rule: 'Swipe right to choose the option on the right.',
      success: 'Right swipe successful!',
    },
    singleOption: 'For a single option, swipe right to select it.',
    reminder: 'Keep the motion slow — a fast swipe may not be recognised',
    pointerHint: 'On a phone or computer you can also just tap the option on screen',
    complete: 'Tutorial complete!',
  },
  jp: {
    heading: 'ジェスチャー練習',
    left: {
      title: '左に振る',
      instruction: '手のひらを開いて、ゆっくり左に振ってください。',
      rule: '左に振ると、左側の選択肢を選べます。',
      success: '左への操作ができました！',
    },
    right: {
      title: '右に振る',
      instruction: '手のひらを開いて、ゆっくり右に振ってください。',
      rule: '右に振ると、右側の選択肢を選べます。',
      success: '右への操作ができました！',
    },
    singleOption: '選択肢が1つの場合は、右に振って選んでください。',
    reminder: 'ゆっくり振ってください。速すぎると認識されないことがあります',
    pointerHint: 'スマートフォンやパソコンでは、画面の選択肢を直接タップしても操作できます',
    complete: '練習完了！',
  },
};

export function getGestureTutorialStrings(lang = getGestureTutorialLang()) {
  return STRINGS[lang] ?? STRINGS.zh;
}
