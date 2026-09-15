import { useNavigate } from 'react-router-dom';
import { WithdrawalResult } from '../../apps/gugo-invest/app';
import { ButtonGroup } from '../../components/ui/ButtonGroup';
import { Button } from '../../components/ui/Button';
import { useT, getScenario01Lang } from './i18n';
import { FraudWarningBanner } from '../../components/warnings/FraudWarningBanner';
import { useARInteraction } from '../../lib/arInteraction';

// The scam's turn. The screen the player is looking at is GuGo Invest's own
// withdrawal-failed result (brand, card, "出金失敗") - that shell is the
// platform's, and lives in src/apps/gugo-invest/.
//
// Everything scenario01 keeps is here in one place, and none of it is UI
// chrome: the 165 fraud warning, the demand for a NT$30,000 deposit before
// the player can withdraw their own money, and the two choices that decide
// which ending they get. A platform does not get to write its own scam
// script, and it must not be able to route the player to the 165 hotline, the
// quiz or an ending - so those stay on this side of the boundary.
export function WithdrawFail() {
  const t = useT();
  const navigate = useNavigate();

  // AR Interaction Contract: scenario01's final decision, and the one screen
  // in this run where the two branches genuinely diverge - `dual`, with the
  // buttons' own on-screen order kept: LEFT is choice[0] (確認支付, the scam's
  // ask) and RIGHT is choice[1] (稍後處理). Both gestures push the same routes
  // the two <Link> buttons already push.
  useARInteraction({
    mode: 'dual',
    surfaceId: 'scenario01/withdraw-fail/final-decision',
    left: () => navigate('/scenario01-investment/scammed-result'),
    right: () => navigate('/scenario01-investment/stopped-result'),
  });

  return (
    <>
      <FraudWarningBanner active theme="invest" severity="high" title={t('⚠ 165 案例比對成功')} body={t('平台要求先支付 NT$30,000 保證金才能出金。出金前要求付款，是常見的假投資詐騙手法。合法投資不會要求你先付錢，才能拿回自己的錢。')} duration={7000} placement="app-header" collapseToPill />
      <WithdrawalResult
        language={getScenario01Lang()}
        className="withdraw-fail-card"
        actions={
          /* AUD-06: btns-dual, because this screen's contract is `dual` and
             these two buttons ARE the LEFT and RIGHT of it. Stacked, nothing
             on screen told a player on the glasses which wave picked which
             ending. Drawn order is unchanged - 確認支付 is still first, and it
             is still LEFT. */
          <ButtonGroup className="btns-dual">
            <Button variant="danger" to="/scenario01-investment/scammed-result">{t('確認支付')}</Button>
            <Button variant="secondary" to="/scenario01-investment/stopped-result">{t('稍後處理')}</Button>
          </ButtonGroup>
        }
      >
        <p>{t('您的帳戶尚未完成高級會員驗證。為保障資金安全，請先支付保證金 NT$30,000。完成後即可立即提領本金與獲利。請於 24 小時內完成，以免帳戶凍結。')}</p>
      </WithdrawalResult>
    </>
  );
}
