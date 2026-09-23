// ScenarioMenu English + Japanese localization strings + language switch.
// Same pattern as scenario03/i18n.js: reuse the existing app-wide language
// selector (src/lib/lang.js), no new storage, no new route. Internal locale
// code for Japanese is always 'jp' - never 'ja'.
import { getLanguage } from '../lib/lang';

export function getScenarioMenuLang() {
  const lang = getLanguage();
  if (lang === 'en') return 'en';
  if (lang === 'jp') return 'jp';
  return 'zh';
}

const STRINGS = {
  zh: {
    topLabel: 'CIB AR ANTI-FRAUD',
    categoryLabel: '刑事警察局 AR 反詐騙教育館',
    mainTitle: '請選擇情境',
    description: '選擇其中一個詐騙情境，進入完整的互動體驗。',
    entryHeading: '案件辨識成功',
    entryStart: '開始案件',
  },
  en: {
    topLabel: 'CIB AR ANTI-FRAUD',
    categoryLabel: 'CIB AR Anti-Fraud Education',
    mainTitle: 'Choose a Scenario',
    description: 'Select a fraud scenario to begin the full interactive experience.',
    entryHeading: 'Case identified',
    entryStart: 'Start case',
  },
  jp: {
    topLabel: 'CIB AR ANTI-FRAUD',
    categoryLabel: '刑事警察局 AR 詐欺対策教育',
    mainTitle: 'シナリオを選択',
    description: '詐欺シナリオを1つ選択し、インタラクティブ体験を開始してください。',
    entryHeading: '事案を確認しました',
    entryStart: '事案を開始',
  },
};

export function getScenarioMenuStrings(lang = getScenarioMenuLang()) {
  return STRINGS[lang] ?? STRINGS.zh;
}
