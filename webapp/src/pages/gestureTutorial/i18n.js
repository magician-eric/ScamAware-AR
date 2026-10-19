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
//   instruction  how to make it - an open palm facing the glasses, moved
//                slowly. Facing them, because a hand turned edge-on is a
//                couple of centimetres thick and the 8x8 ToF barely sees it
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
//   reminder      what makes the sensor miss a real wave: a hand outside the
//                 patch the sensor sees - it sits at the wearer's RIGHT eye and
//                 looks straight ahead, about 25 cm wide at 30 cm - too far or
//                 too near, or moved too fast
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
      instruction: '手掌放在額頭前方約 20 公分，向左揮',
      success: '你學會了！向左揮＝選擇左邊的選項',
    },
    right: {
      instruction: '手掌放在額頭前方約 20 公分，向右揮',
      success: '你學會了！向右揮＝選擇右邊的選項',
    },
    singleOption: '只有一個選項時，向左或向右揮都可以',
    complete: '手勢教學完成！',
  },
  en: {
    heading: 'Gesture Tutorial',
    left: {
      instruction: 'Hold your palm about 20 cm in front of your forehead and swipe left',
      success: 'You got it! Swipe left = choose the option on the left',
    },
    right: {
      instruction: 'Hold your palm about 20 cm in front of your forehead and swipe right',
      success: 'You got it! Swipe right = choose the option on the right',
    },
    singleOption: 'With only one option, swipe left or right — either works',
    complete: 'Tutorial complete!',
  },
  jp: {
    heading: 'ジェスチャー練習',
    left: {
      instruction: '手のひらを額の前 約20cmに置き、左に振ってください',
      success: 'できました！左に振る＝左側の選択肢を選ぶ',
    },
    right: {
      instruction: '手のひらを額の前 約20cmに置き、右に振ってください',
      success: 'できました！右に振る＝右側の選択肢を選ぶ',
    },
    singleOption: '選択肢が1つのときは、左右どちらに振っても選べます',
    complete: '練習完了！',
  },
};

export function getGestureTutorialStrings(lang = getGestureTutorialLang()) {
  return STRINGS[lang] ?? STRINGS.zh;
}
