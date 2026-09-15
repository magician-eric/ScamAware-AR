import { ScenarioOutcome } from '../../components/outcome/ScenarioOutcome';
import { useT } from './i18n';

// E1 - 成功反詐. The simulation is over, so this is CIBAR's own result
// context: no MyDonDon PhoneShell, no CibarResultBar, no browser and no HPE
// chrome left on screen. The shared Outcome System renders the whole screen.
export function EndingCaught() {
  const t = useT();
  return (
    <ScenarioOutcome
      scenarioId="order"
      state="blocked"
      title={t('你停下來了')}
      outcome={t('成功攔截')}
      explanation={t('原平台沒有訂單、帳戶也沒有入帳，你在寄件前停下來查證。')}
      takeaway={t('沒在官方平台看到訂單與入帳，不要只憑買家提供的畫面寄出商品。')}
      analysisTo="/scenario05-atm/reveal"
    />
  );
}
