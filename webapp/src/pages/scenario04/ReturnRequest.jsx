import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Check, ChevronLeft } from 'lucide-react';
import { useStageClassName } from '../../shell/StageClassContext';
import { applyEffects, useShoppingState } from '../../lib/shoppingStore';
import { AssetImage } from '../../apps/blackpi';
import { useT } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

const RETURN_COPY = {
  health: {
    reason: '商品與描述不符',
    detail: '購買商品為智慧掃地機器人，實際收到可拆式掃把與畚箕。',
  },
  luckyBag: {
    reason: '商品與廣告內容明顯不符',
    detail: '商品頁宣稱含品牌商品，但實際收到內容與商品宣傳有明顯落差。',
  },
};

// Screen 14 - 退貨申請. The story already establishes the reason, so this
// screen is a review rather than a second decision point - but it reviews
// what the player ACTUALLY has. Unboxing.jsx now always reveals and saves
// all four photos before the player can reach this screen, so there is no
// remaining normal path where a return is filed without them; a save that
// somehow still arrives here without any (an old/corrupted state, or a
// direct deep link) just shows the gap via the "沒有可附上的照片" badge
// below rather than pretending the photos exist.
//
// One component serves BOTH routes (health / luckyBag), so the layout rules
// below - the four unboxing photos as the only attachment, and the CTA
// pinned outside the scroller - hold for both products by construction;
// nothing here is per-product.
export function ReturnRequest() {
  useStageClassName('blackpi-stage');
  const navigate = useNavigate();
  const { route } = useParams();
  const t = useT();
  const [state, update] = useShoppingState();
  const [submitted, setSubmitted] = useState(false);
  const timeoutRef = useRef(null);
  const copy = RETURN_COPY[route] || RETURN_COPY.health;
  // The actual photos the player took at 收貨開箱, read straight out of
  // scenario state (shoppingStore's unboxingPhotoAssets, written by
  // Unboxing.jsx when the 2x2 grid is revealed). Deliberately NOT a per-route
  // hardcoded list: this screen must show the shots that really exist, so a
  // save that never got them shows the gap instead of borrowing stand-ins.
  //
  // These four photos are the whole of the evidence this screen shows. The
  // listing screenshot used to be a second attachment block here, but the
  // player has already been through the product page twice by now, so it
  // added a screenful of height - and therefore a scroll - for something the
  // screen was only restating.
  const unboxingPhotos = state.unboxingPhotoAssets || [];

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  function submit() {
    if (submitted) return;
    setSubmitted(true);
    // Unchanged from before the listing screenshot left this screen: filing
    // the request still registers the order/listing record with the platform
    // (buildEvidenceInventory's 商品頁與訂單資料 row), which is what this flag
    // and score have always stood for - not the thumbnail that was displayed.
    applyEffects({ evidence: 8, evidenceSaved: ['product-page-screenshot'] });
    // The exact attachments this request actually goes out with - the
    // unboxing photos that really exist in state - so ReturnAckChat's
    // evidence cards (and any later read of returnEvidenceAssets) show what
    // the player really sent, not a hardcoded four-photo assumption.
    const evidenceAssets = Array.from(new Set(unboxingPhotos));
    update({ returnStatus: 'evidenceUploaded', disputeStatus: 'returnRequested', returnEvidenceAssets: evidenceAssets });
    timeoutRef.current = window.setTimeout(() => {
      navigate(`/scenario04-shopping/return-ack/${route}`);
    }, 800);
  }

  // AR Interaction Contract: one story action - 提交退貨申請 - and once it is
  // submitted the button is replaced by a status line, so the contract has to
  // go with it. `disabled` here is the same flag the UI uses, so a gesture can
  // never file a second request the buttons no longer offer.
  useARInteraction({
    mode: 'single',
    surfaceId: 'scenario04/return-request',
    action: submit,
    disabled: submitted,
  });

  return (
    <div className="blackpi-app">
      <header className="bp-header">
        <button type="button" className="bp-icon-btn" aria-label={t('返回')} onClick={() => navigate(-1)}>
          <ChevronLeft size={24} />
        </button>
        <div className="bp-header-title">{t('退貨申請')}</div>
        <span style={{ width: 44 }} />
      </header>
      <div className="bp-scroll bp-page bp-return-request">
        <section className="bp-return-section" aria-labelledby="return-reason-title">
          <h2 id="return-reason-title" className="bp-h2">{t('退貨原因')}</h2>
          <strong className="bp-return-reason">{t(copy.reason)}</strong>
          <p className="bp-muted bp-return-detail">{t(copy.detail)}</p>
        </section>

        {/* The attachments are shown, not described. Nothing here is a control:
            the photos already exist by this point in the story, so there is no
            upload step, no selection, no viewer and no tap target - just the
            four thumbnails that are going with the request, all visible at
            once in a 2x2. */}
        <section className="bp-return-section" aria-labelledby="return-evidence-title">
          <h2 id="return-evidence-title" className="bp-h2">{t('附加資料')}</h2>

          <div className="bp-return-attachment">
            <div className={`bp-return-attachment-head${unboxingPhotos.length ? '' : ' missing'}`}>
              {unboxingPhotos.length ? <Check size={18} aria-hidden="true" /> : <AlertTriangle size={18} aria-hidden="true" />}
              <span>{t('開箱照片')}</span>
              {!unboxingPhotos.length && <span className="bp-badge warn">{t('沒有可附上的照片')}</span>}
            </div>
            {unboxingPhotos.length > 0 && (
              <div className="bp-return-thumb-grid">
                {unboxingPhotos.map((assetKey) => (
                  <AssetImage key={assetKey} assetKey={assetKey} className="bp-return-thumb" />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* The primary CTA is a sibling of the scroller, not its last child, so
          it sits at the bottom of the viewport from the first frame however
          tall the attachments get. This scenario is driven on 佐臻 AR glasses
          by gesture, where scrolling is unreliable, so no step needed to carry
          the story forward may be reachable only by scrolling; the content
          above may still scroll, that just must never be a prerequisite. */}
      <div className="bp-return-cta-bar">
        {submitted ? (
          <div className="bp-return-success" role="status"><Check size={20} />{t('退貨申請已送出')}</div>
        ) : (
          <button type="button" className="bp-btn bp-btn-block" onClick={submit}>
            {t('提交退貨申請')}
          </button>
        )}
      </div>
    </div>
  );
}
