import { useNavigate } from 'react-router-dom';
import { useStageClassName } from '../../shell/StageClassContext';
import { useSaveScenario02Progress } from '../../lib/scenario02Store';
import { RedWarning } from './components/RedWarning';
import { useT } from './i18n';

// Section 二十三: second mandatory stop-point, reached after the withdrawal
// failure and the long guilt-trip LINE conversation that follows it,
// right before the "verification top-up" payment page. PrivateChat's
// s22-choice sends 我還是覺得不對勁 here (spec §13 AD-23), so this is a
// main-line screen the player really reaches, not a page only a URL opens.
//
// Which is why it turns the 165 button off: on the main line every visible
// control has to be one a gesture can run, and the AR contract has exactly
// two - LEFT 停止付款 and RIGHT 我已了解，仍要繼續. A third button that only a
// tap could reach would be operable on a phone and dead on the glasses. The
// 165 content itself is not lost: 停止付款 leads to the same 成功反詐 ending,
// which carries the 165 guidance in its own copy. DepositWarning is off the
// main line (AD-24) and keeps its hotline button unchanged.
export function TopupWarning() {
  useSaveScenario02Progress('/scenario02-romance/topup-warning');
  useStageClassName('bition-stage');
  const navigate = useNavigate();
  const t = useT();

  return (
    <div className="bition-app">
      <div className="bition-home-scroll">
        <RedWarning
          surfaceId="scenario02/topup-warning"
          hotline={false}
          title={t('高度疑似假投資詐騙')}
          body={t('正規投資平台不會要求您為了提領自己的資金，再繳交「安全驗證金」、「風控保證金」、「稅金」或其他追加款項。對方正在使用民宿、旅行、見面及親密關係的承諾，讓您害怕失去兩人的未來，進而忽略明顯的詐騙警訊。')}
          emphasis={t('先付款才能提領，極可能是假投資詐騙。')}
          primaryLabel={t('停止付款')}
          secondaryLabel={t('我已了解，仍要繼續')}
          correctText={t('你選擇停止付款。要求先付款才能提領，是假投資詐騙的明顯特徵。')}
          onContinue={() => navigate('/scenario02-romance/guarantee')}
          onStopContinue={() => navigate('/scenario02-romance/stopped-result')}
          stopContinueLabel={t('查看結果')}
        />
      </div>
    </div>
  );
}
