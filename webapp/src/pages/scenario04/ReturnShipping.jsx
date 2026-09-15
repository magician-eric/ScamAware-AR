import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, PackageCheck } from 'lucide-react';
import { useStageClassName } from '../../shell/StageClassContext';
import { applyEffects, generateReturnCode, generateTrackingCode, useShoppingState } from '../../lib/shoppingStore';
import { useT } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// Screen 16 - 退貨寄件.
export function ReturnShipping() {
  useStageClassName('blackpi-stage');
  const navigate = useNavigate();
  const { route } = useParams();
  const t = useT();
  const [state, update] = useShoppingState();
  // Generated once and persisted to the store, not a local useState(() => ...)
  // - a revisit/refresh of this screen must show the same codes, not mint new
  // ones every mount.
  const returnCode = state.returnCode || generateReturnCode();
  const trackingCode = state.trackingCode || generateTrackingCode();
  if (!state.returnCode || !state.trackingCode) {
    update({ returnCode, trackingCode });
  }

  function complete() {
    // The return/tracking numbers above ARE the shipping receipt - once the
    // parcel is sent, that record exists whether or not the player thinks to
    // "save" it anywhere, so the evidence screen reflects it immediately.
    applyEffects({ evidenceSaved: ['return-shipping-proof'] });
    update({ returnStatus: 'shipped' });
    navigate(`/scenario04-shopping/return-logistics/${route}`);
  }

  // AR Interaction Contract: one story action - 我已完成寄件. The two generated
  // codes above it are the receipt, not controls.
  useARInteraction({ mode: 'single', surfaceId: 'scenario04/return-shipping', action: complete });

  return (
    <div className="blackpi-app">
      <header className="bp-header">
        <button type="button" className="bp-icon-btn" aria-label={t('返回')} onClick={() => navigate(-1)}>
          <ChevronLeft size={24} />
        </button>
        <div className="bp-header-title">{t('退貨寄件')}</div>
        <span style={{ width: 44 }} />
      </header>
      <div className="bp-scroll bp-page" style={{ textAlign: 'center', paddingTop: 20 }}>
        <PackageCheck size={40} color="var(--bp-primary-dark)" />
        <h1 className="bp-h1 bp-section">{t('請依下列編號完成寄件')}</h1>
        <div className="bp-card bp-section" style={{ textAlign: 'left' }}>
          <div className="bp-score-row"><span className="bp-score-label">{t('退貨編號')}</span><strong>{returnCode}</strong></div>
          <div className="bp-score-row"><span className="bp-score-label">{t('物流編號')}</span><strong>{trackingCode}</strong></div>
        </div>
        <p className="bp-muted bp-section">{t('請將商品交由指定物流業者寄回，並保留寄件憑證。')}</p>
        <button type="button" className="bp-btn bp-btn-block bp-section" onClick={complete}>{t('我已完成寄件')}</button>
      </div>
    </div>
  );
}
