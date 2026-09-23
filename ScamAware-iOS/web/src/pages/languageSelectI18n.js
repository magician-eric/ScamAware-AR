// LanguageSelect English + Japanese localization strings + language switch.
// Same pattern as scenarioMenuI18n.js: reuse the existing app-wide language
// selector (src/lib/lang.js), no new storage, no new route. Internal locale
// code for Japanese is always 'jp' - never 'ja'.
//
// This screen is the one place in the app that renders BEFORE a language has
// been chosen, so Chinese is not just its fallback, it is its correct first
// state: the exhibit is in Taiwan and a visitor who has chosen nothing yet is
// shown Traditional Chinese. What it must not do - and used to - is keep
// showing Chinese to a player who has already chosen English or Japanese and
// come back to this screen.
import { getLanguage } from '../lib/lang';

export function getLanguageSelectLang() {
  const lang = getLanguage();
  if (lang === 'en') return 'en';
  if (lang === 'jp') return 'jp';
  return 'zh';
}

const STRINGS = {
  zh: {
    categoryLabel: '刑事警察局 AR 反詐騙教育館',
    mainTitle: 'AI 防詐調查任務',
    description: '你將化身反詐小刑警，體驗各種常見詐騙手法的完整情境，請選擇語言開始。',
    languageGroupLabel: '語言選擇',
    staffSettingsLabel: '工作人員設定',
  },
  en: {
    categoryLabel: 'CIB AR Anti-Fraud Education',
    mainTitle: 'AI Anti-Fraud Investigation',
    description: 'You will play a young anti-fraud detective and work through complete, realistic versions of the most common scams. Choose a language to begin.',
    languageGroupLabel: 'Language selection',
    staffSettingsLabel: 'Staff settings',
  },
  jp: {
    categoryLabel: '刑事警察局 AR 詐欺対策教育',
    mainTitle: 'AI 詐欺対策捜査ミッション',
    description: 'あなたは詐欺対策の若手捜査員として、代表的な詐欺の手口を最初から最後まで体験します。言語を選んで始めてください。',
    languageGroupLabel: '言語の選択',
    staffSettingsLabel: 'スタッフ設定',
  },
};

export function getLanguageSelectStrings(lang = getLanguageSelectLang()) {
  return STRINGS[lang] ?? STRINGS.zh;
}
