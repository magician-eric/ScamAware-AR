// ArScanHome English + Japanese localization strings + language switch.
// Same pattern as scenario03/i18n.js and pages/scenarioMenuI18n.js: reuse
// the existing app-wide language selector (src/lib/lang.js), no new
// storage, no new route. Internal locale code for Japanese is always
// 'jp' - never 'ja'.
//
// `targets` is keyed by the `scenario` field of src/lib/ar/scenarioTargetMap.js
// - the same key that already decides which route a printed card leads to - so
// a card can never be described as one scenario and enter another. Nothing
// here is keyed by target id or by index.
//
// The player is not a tester: none of these lines says "recognised",
// "detected", "target" or "tracking". What a match produces on screen is the
// first sentence of a story, and the story is what the player decides on.
import { getLanguage } from '../../lib/lang';

export function getArScanLang() {
  const lang = getLanguage();
  if (lang === 'en') return 'en';
  if (lang === 'jp') return 'jp';
  return 'zh';
}

const STRINGS = {
  zh: {
    heroAlt: 'AR 詐騙互動體驗',
    scanning: {
      headline: '移動鏡頭，尋找隱藏的線索',
      hint: '還沒有發現線索，請繼續尋找',
    },
    targets: {
      investment: {
        headline: '你發現了一個看起來很誘人的投資機會',
        cta: '看看這個投資機會',
      },
      romance: {
        headline: '你在交友軟體遇見了一位聊得來的女孩',
        cta: '繼續跟她聊天',
      },
      // Deliberately "自稱警察" and nothing stronger: the player must not be
      // told this is a scam before they have walked into it.
      authority: {
        headline: '你接觸到一位自稱警察的人',
        cta: '看看他想告訴你什麼',
      },
      fakeSeller: {
        headline: '你發現了一件看起來很划算的商品',
        cta: '查看這件商品',
      },
      fakeBuyer: {
        headline: '有人對你刊登的商品有興趣',
        cta: '看看買家說了什麼',
      },
    },
    cameraError: '無法使用相機，請手動選擇情境。',
    manualSelection: '沒有辨識圖片？手動選擇情境',
  },
  en: {
    heroAlt: 'AR Scam Interactive Experience',
    scanning: {
      headline: 'Move the camera around to find a hidden clue',
      hint: 'No clue found yet — keep looking',
    },
    targets: {
      investment: {
        headline: 'You have found an investment opportunity that looks very tempting',
        cta: 'Look into this opportunity',
      },
      romance: {
        headline: 'You have met a girl on a dating app who is easy to talk to',
        cta: 'Keep chatting with her',
      },
      authority: {
        headline: 'Someone claiming to be a police officer has got in touch',
        cta: 'See what they want to tell you',
      },
      fakeSeller: {
        headline: 'You have found an item that looks like a great deal',
        cta: 'Take a look at this item',
      },
      fakeBuyer: {
        headline: 'Someone is interested in the item you listed',
        cta: 'See what the buyer says',
      },
    },
    cameraError: 'Camera unavailable — please choose a scenario manually.',
    manualSelection: 'No Image? Choose Manually',
  },
  jp: {
    heroAlt: 'AR詐欺インタラクティブ体験',
    scanning: {
      headline: 'カメラを動かして、隠された手がかりを探しましょう',
      hint: 'まだ手がかりは見つかりません。探し続けてください',
    },
    targets: {
      investment: {
        headline: 'とても魅力的に見える投資の話を見つけました',
        cta: 'この投資の話を見てみる',
      },
      romance: {
        headline: 'マッチングアプリで話の合う女性と出会いました',
        cta: '彼女とチャットを続ける',
      },
      authority: {
        headline: '警察官を名乗る人物から連絡がありました',
        cta: '相手の話を聞いてみる',
      },
      fakeSeller: {
        headline: 'とてもお得に見える商品を見つけました',
        cta: 'この商品を見てみる',
      },
      fakeBuyer: {
        headline: 'あなたが出品した商品に興味を持った人がいます',
        cta: '購入希望者のメッセージを見る',
      },
    },
    cameraError: 'カメラを利用できません。手動でシナリオを選択してください。',
    manualSelection: '画像がない場合は手動選択',
  },
};

export function getArScanStrings(lang = getArScanLang()) {
  return STRINGS[lang] ?? STRINGS.zh;
}
