import { ScenarioOutcome } from '../../components/outcome/ScenarioOutcome';
import { getBuyer } from '../../data/scenario05Characters';
import { getBuyerCast } from '../../lib/scenario05Store';
import { getProduct } from '../../apps/mydondon';
import { useScenario05State } from '../../lib/scenario05Store';
import { useT, useScenario05Lang } from './i18n';

// E2 - 詐騙成立. The item genuinely shipped and genuinely arrived - 黑皮通's
// part of the story was never fake - but no payment for it ever existed
// anywhere the player could actually check. The loss shown here is the listed
// price of the product the player actually chose, never a fixed placeholder
// amount.
//
// The three-column "vanish" comparison this page used to render as its own
// markup inside the shared card is now what it always was: facts. It reads as
// three amount rows (黑皮通 / 外部交易網站 / 買家), which is why the shared
// Outcome System no longer needs a `children` escape hatch at all.
export function EndingScammed() {
  const t = useT();
  const lang = useScenario05Lang();
  const [state] = useScenario05State();
  const product = getProduct(state.selectedProduct, lang);
  // Same person the whole run through - whoever was drawn on entry.
  const buyer = getBuyer(getBuyerCast());

  return (
    <ScenarioOutcome
      scenarioId="order"
      state="scammed"
      title={t('這是一筆幽靈訂單')}
      outcome={`−${product?.price}`}
      amounts={[
        { label: t('商品'), value: product?.name },
        { label: t('實際入帳'), value: 'NT$0', emphasis: true },
        { label: t('黑皮通'), value: t('已送達') },
        { label: t('外部交易網站'), value: t('頁面不存在') },
        { label: buyer.name, value: t('帳號不存在') },
      ]}
      takeaway={t('你看到的是假的付款成功頁面，真正的官方平台從未產生訂單。')}
      analysisTo="/scenario05-atm/reveal"
    />
  );
}
