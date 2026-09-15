import { FraudClueAnalysis } from '../../components/outcome/FraudClueAnalysis';
import { useT } from './i18n';

// 詐騙疑點分析 for the ghost-order scenario - the four stages of the trap,
// unchanged, in the order the player met them.
//
// This page used to render its own big-text debrief inside MyDonDon's
// PhoneShell with a CibarResultBar on top. Both are gone: the simulation ends
// at the結局, so this screen is CIBAR's own UI like every other scenario's
// analysis step.
const CLUES = [
  '買家要求離開原平台',
  '外部網站顯示假的付款成功',
  '官方平台其實沒有訂單',
  '真的商品卻被寄出去了',
];

export function Reveal() {
  const t = useT();
  return (
    <FraudClueAnalysis
      scenarioId="order"
      lede={t('幽靈訂單是怎麼出現的？')}
      clues={CLUES.map((title) => ({ title: t(title) }))}
      quizTo="/scenario05-atm/quiz"
    />
  );
}
