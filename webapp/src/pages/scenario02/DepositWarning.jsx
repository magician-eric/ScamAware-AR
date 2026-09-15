import { useNavigate } from 'react-router-dom';
import { useStageClassName } from '../../shell/StageClassContext';
import { useSaveScenario02Progress } from '../../lib/scenario02Store';
import { RedWarning } from './components/RedWarning';
import { useT } from './i18n';

// Section 十一: mandatory stop-point before the first deposit page ever
// renders. Reached automatically after the LINE round trip that follows
// clicking "立即啟用" on the strategy page.
export function DepositWarning() {
  useSaveScenario02Progress('/scenario02-romance/deposit-warning');
  useStageClassName('bition-stage');
  const navigate = useNavigate();
  const t = useT();

  return (
    <div className="bition-app">
      <div className="bition-home-scroll">
        <RedWarning
          surfaceId="scenario02/deposit-warning"
          title={t('防詐風險提醒')}
          body={t('網路交友對象若將投資、入金或共同未來綁在一起，可能正在利用感情降低您的警覺。「一起存旅行基金」、「為我們的未來努力」及「投資後就能見面」，都是常見的情感誘導方式。')}
          emphasis={t('真正的感情，不需要用入金證明。')}
          primaryLabel={t('停止入金')}
          secondaryLabel={t('我已了解，仍要繼續')}
          correctText={t('你選擇停止入金。感情承諾不能證明投資平台的安全性。')}
          onContinue={() => navigate('/scenario02-romance/deposit')}
        />
      </div>
    </div>
  );
}
