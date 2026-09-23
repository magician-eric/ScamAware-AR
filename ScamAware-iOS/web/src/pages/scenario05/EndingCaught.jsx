import { ScenarioOutcome } from '../../components/outcome/ScenarioOutcome';
import { formatNtAmount } from '../../data/scenario05Verification';
import { useT } from './i18n';

// E1 - 成功反詐, reached from either of the two places the player can still
// walk away clean: refusing to accept a payment they cannot see any record of,
// or refusing to pay a "verification deposit" in order to be paid.
//
// Nothing was transferred and nothing was shipped, so every row on the ledger
// is zero. The simulation is over, so this is CIBAR's own result context: no
// MyDonDon PhoneShell, no browser and no HPE chrome left on screen. The shared
// Outcome System renders the whole screen.
export function EndingCaught() {
  const t = useT();
  const none = formatNtAmount(0);
  return (
    <ScenarioOutcome
      scenarioId="order"
      state="blocked"
      title={t('你及時識破了這筆交易')}
      outcome={t('成功攔截')}
      amounts={[
        { label: t('驗證金損失'), value: none },
        { label: t('商品損失'), value: none },
        { label: t('總損失'), value: none, emphasis: true },
        { label: t('商品'), value: t('未寄出') },
      ]}
      explanation={t('買家聲稱已付款，但你沒有查到可信的交易紀錄，也沒有確認實際入帳。你選擇停止交易，沒有轉帳，也沒有寄出商品。')}
      takeaway={t('沒在官方平台看到訂單與入帳，不要只憑買家提供的畫面寄出商品。')}
      analysisTo="/scenario05-atm/reveal"
    />
  );
}
