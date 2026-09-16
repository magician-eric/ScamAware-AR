import { ScenarioOutcome } from '../../components/outcome/ScenarioOutcome';
import { useScenario05State } from '../../lib/scenario05Store';
import { formatNtAmount } from '../../data/scenario05Verification';
import { useT } from './i18n';

// The third結局: the player paid the "refundable" verification deposit, then
// stopped before shipping.
//
// It renders through the same shared Outcome System as the other two - there
// is no second ending UI in this scenario - and it is a `scammed` outcome, not
// a success: money left the player's hands and never came back. Saving the
// item is the good news in the title, not the verdict, and nothing on this
// screen may read as "完全成功" or "零損失" while a transfer is on the ledger.
//
// The deposit figure is read off the run's own state (which is 0 or the one
// centrally-defined amount and nothing else - see lib/scenario05Store.js), so
// this page cannot show a loss the player never paid.
export function EndingStopped() {
  const t = useT();
  const [state] = useScenario05State();
  const lost = formatNtAmount(state.verificationLoss);

  return (
    <ScenarioOutcome
      scenarioId="order"
      state="scammed"
      title={t('你保住了商品，但已損失驗證金')}
      outcome={`−${lost}`}
      amounts={[
        { label: t('驗證金損失'), value: lost },
        { label: t('商品損失'), value: formatNtAmount(0) },
        { label: t('總損失'), value: lost, emphasis: true },
        { label: t('商品'), value: t('未寄出') },
      ]}
      explanation={t('你相信假客服的說法，轉出了所謂可退還的驗證金。雖然你在寄件前停下來，保住了商品，但轉出的款項並未退回。')}
      takeaway={t('沒在官方平台看到訂單與入帳，不要只憑買家提供的畫面寄出商品。')}
      analysisTo="/scenario05-atm/reveal"
    />
  );
}
