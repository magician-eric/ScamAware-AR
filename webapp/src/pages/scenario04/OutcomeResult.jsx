import { useParams } from 'react-router-dom';
import { ScenarioOutcome } from '../../components/outcome/ScenarioOutcome';
import { ROBOT_VACUUM_PRODUCT, LUCKY_BAG_PRODUCT } from '../../apps/blackpi';
import { useT } from './i18n';

// Scenario 04 詐騙成立／成功反詐. Reached straight from PlatformSupportChat's
// final decision with the one outcome the player actually earned: 'success' if
// they contacted 165, 'fail' if they kept arguing with the platform instead.
// The outcome is carried in the URL, not only in the store, so the result is
// directly navigable and survives a refresh.
//
// This is a 退款陷阱, not an investment scam: the only money the story ever
// charges is the order the player actually paid for, so that - and nothing
// invented on top of it - is what the amount rows show.
//
// The product table is read only for that amount. The 黑皮購物 stage class the
// page used to set is gone: the simulation is over here, so BlackPi's light
// marketplace surface must not follow the player into the結局 (spec §4.3).
const PRODUCTS = { health: ROBOT_VACUUM_PRODUCT, luckyBag: LUCKY_BAG_PRODUCT };

export function OutcomeResult() {
  const { route, outcome } = useParams();
  const t = useT();

  const product = PRODUCTS[route] || ROBOT_VACUUM_PRODUCT;
  const paid = `NT$${product.total.toLocaleString()}`;
  const success = outcome === 'success';

  return (
    <ScenarioOutcome
      scenarioId="package"
      state={success ? 'stopped' : 'scammed'}
      title={t(success ? '你選擇聯絡 165 報案' : '你選擇繼續要求平台處理')}
      amounts={[
        { label: t('訂單實付金額'), value: paid },
        { label: t('爭議款項'), value: paid },
        success
          ? { label: t('後續處理'), value: t('已交由 165／警方處理'), emphasis: true }
          : { label: t('款項狀態'), value: t('平台無法追回'), emphasis: true },
      ]}
      explanation={t(success
        ? '你發現賣家失聯、賣場停止營業，而且平台無法處理平台外交易後，選擇將這起疑似詐騙案件交由 165 與警方處理。'
        : '這筆交易是在平台外完成，平台沒有收到款項，也無法替平台外交易退款或賠償。當賣家失聯、賣場停止營業後，繼續與平台爭執並沒有追回這筆款項。')}
      takeaway={t('平台外交易一旦出問題，平台無法退款或賠償；發現疑似詐騙應盡快聯絡 165 或報案。')}
      analysisTo={`/scenario04-shopping/ending/${route}`}
    />
  );
}
