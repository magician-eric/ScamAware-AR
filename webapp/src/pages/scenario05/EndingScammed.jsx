import { ScenarioOutcome } from '../../components/outcome/ScenarioOutcome';
import { getBuyer } from '../../data/scenario05Characters';
import { getBuyerCast } from '../../lib/scenario05Store';
import { getProduct } from '../../apps/mydondon';
import { useScenario05State } from '../../lib/scenario05Store';
import { formatNtAmount } from '../../data/scenario05Verification';
import { useT, useScenario05Lang } from './i18n';

// E2 - 詐騙成立, and the full price of it: the player paid the "refundable"
// verification deposit AND shipped before confirming any money had arrived.
//
// Both halves of the loss are read off this run rather than assumed. The item
// loss is the listed price of the product the player actually chose, never a
// fixed placeholder; the deposit loss is whatever the run recorded, which is 0
// or the one centrally-defined amount and nothing else - so an old save that
// reached this screen without a transfer shows NT$0 there rather than
// inventing a payment that never happened. 黑皮通's part of the story was
// never fake: a real courier really did deliver a real item.
export function EndingScammed() {
  const t = useT();
  const lang = useScenario05Lang();
  const [state] = useScenario05State();
  const product = getProduct(state.selectedProduct, lang);
  // Same person the whole run through - whoever was drawn on entry.
  const buyer = getBuyer(getBuyerCast());

  const depositLost = state.verificationLoss;
  const itemLost = product?.priceValue ?? 0;

  return (
    <ScenarioOutcome
      scenarioId="order"
      state="scammed"
      title={t('你付出了錢，也失去了商品')}
      outcome={`−${formatNtAmount(depositLost + itemLost)}`}
      amounts={[
        { label: t('商品'), value: product?.name },
        { label: t('驗證金損失'), value: formatNtAmount(depositLost) },
        { label: t('商品損失'), value: formatNtAmount(itemLost) },
        { label: t('總損失'), value: formatNtAmount(depositLost + itemLost), emphasis: true },
        { label: t('實際入帳'), value: formatNtAmount(0) },
        { label: t('黑皮通'), value: t('已送達') },
        { label: t('外部交易網站'), value: t('網站無法連線') },
        { label: buyer.name, value: t('帳號不存在') },
      ]}
      explanation={t('你相信假客服，支付了所謂可退還的驗證金，也在尚未確認入帳時寄出商品。商品已送達，但買家帳號消失，SafeDeal 也無法連線。驗證金沒有退回，貨款也沒有入帳。')}
      takeaway={t('你看到的是假的付款成功頁面，真正的官方平台從未產生訂單。')}
      analysisTo="/scenario05-atm/reveal"
    />
  );
}
