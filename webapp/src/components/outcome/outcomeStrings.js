import { createTranslator } from '../../shared/i18n/createTranslator';

// The handful of labels the Outcome System itself owns.
//
// Everywhere else in this repo a shared component is handed strings a Scenario
// already translated (spec §10) - and that is still true of every word of copy
// on these screens: titles, amounts, explanations and clue lists all arrive
// from the Scenario that owns them.
//
// These six are different in kind. They are not copy, they are the contract:
// "詐騙成立 / 成功反詐" is the status vocabulary the結局 system is defined by,
// "查看詐騙疑點分析" and "進行反詐小測驗" ARE the fixed flow
// (Outcome → 詐騙疑點分析 → 反詐小測驗), and "詐騙疑點分析" is the analysis
// screen's name. Leaving them to five Scenario dictionaries is exactly how the
// tree ended up with 看看哪裡出了問題 / 看看你做對了什麼 / 看看剛才的陷阱 /
// 看看你在哪一步掉進陷阱 for one and the same button. Owning them here makes
// the wording impossible to drift - a Scenario has no prop to override it
// with - while each language still reads naturally.
const EN = {
  詐騙成立: 'Scam Completed',
  成功反詐: 'Scam Prevented',
  請記住: 'Remember',
  查看詐騙疑點分析: 'See the Scam Warning Signs',
  詐騙疑點分析: 'Scam Warning Signs',
  進行反詐小測驗: 'Start the Anti-Fraud Quiz',
};

const JP = {
  詐騙成立: '詐欺成立',
  成功反詐: '詐欺阻止',
  請記住: '覚えておいてください',
  查看詐騙疑點分析: '詐欺の危険サインを見る',
  詐騙疑點分析: '詐欺の危険サイン',
  進行反詐小測驗: '詐欺対策クイズへ',
};

const { t } = createTranslator({ en: EN, jp: JP });

export function outcomeStrings() {
  return {
    statusFailure: t('詐騙成立'),
    statusSuccess: t('成功反詐'),
    takeawayLabel: t('請記住'),
    analysisCta: t('查看詐騙疑點分析'),
    analysisTitle: t('詐騙疑點分析'),
    quizCta: t('進行反詐小測驗'),
  };
}
