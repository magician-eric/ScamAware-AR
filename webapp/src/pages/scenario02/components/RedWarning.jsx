import { useState } from 'react';
import { TriangleAlert, Phone } from 'lucide-react';
import { Hotline165 } from './Hotline165';
import { WarningMarquee } from './WarningMarquee';
import { useT } from '../i18n';
import { useARInteraction } from '../../../lib/arInteraction';

// Full-screen red danger warning, shared by the two mandatory stop-points in
// the 幣勝客 BITION story (before the first deposit, and before the
// top-up/verification payment). No checkbox/consent row anywhere - nothing
// here should ever require a small tap target or a "must confirm before
// continuing" gate. Large, always-tappable buttons instead: stop, continue
// anyway (deliberately the less visually prominent of the two), and -
// where the page asks for it - the 165 hotline between them.
export function RedWarning({
  // Stable AR Interaction Contract id for the stop-point this instance IS -
  // the two stop-points are two different story surfaces, so the page that
  // mounts this component names it rather than both sharing one id.
  surfaceId,
  title,
  body,
  emphasis,
  primaryLabel,
  secondaryLabel,
  correctText,
  onContinue,
  // Whether this instance offers 撥打反詐專線 165 at all.
  //
  // The button opens an educational overlay rather than advancing the story,
  // which is why it was never part of this screen's `dual` geometry - but on
  // a screen the player actually reaches, a control that a tap can operate
  // and a gesture never can is exactly the shape the AR contract exists to
  // rule out. A page that is on the main line therefore turns it off, and
  // what is left is two visible actions that map one-to-one onto LEFT and
  // RIGHT. A page that is not (see AD-24) may keep it.
  hotline = true,
  // Optional: where "stop" leads when stopping is itself a final outcome
  // rather than a pause in the story. The first stop-point (DepositWarning)
  // passes neither, so it keeps its original behaviour of resuming the
  // narrative through onContinue; the last one (TopupWarning) passes both so
  // the safe choice ends in its own result page instead of quietly
  // rejoining the scammed path.
  onStopContinue,
  stopContinueLabel,
}) {
  const [stopped, setStopped] = useState(false);
  const [showHotline, setShowHotline] = useState(false);
  const t = useT();

  // AR Interaction Contract. The decision this screen exists for is
  // stop-vs-continue, so its geometry is `dual` with the on-screen order kept:
  // LEFT = 停止 (choice[0]), RIGHT = 我已了解，仍要繼續 (choice[1]).
  //
  // Where the page keeps the 撥打反詐專線 165 button (`hotline`), it sits
  // between them and is not a third story action: it opens an educational
  // overlay that changes nothing by itself, and its one story-affecting
  // control (我選擇停止付款) does exactly what LEFT already does here. While
  // that overlay is up it IS the surface the player is looking at, so it
  // declares its own geometry - two actions when it offers 停止付款, one
  // (返回體驗) when it does not. With `hotline={false}` the button is not
  // rendered, the overlay can never open, and those geometries never arise:
  // the screen is only ever the `dual` below and then `single`.
  //
  // Once stopped, the two options are gone and only the continue button is
  // left: `single`.
  useARInteraction(showHotline
    ? (onStopContinue
      ? {
        mode: 'dual',
        surfaceId: `${surfaceId}/hotline-165`,
        left: () => setShowHotline(false),
        right: () => { setShowHotline(false); setStopped(true); },
      }
      : { mode: 'single', surfaceId: `${surfaceId}/hotline-165`, action: () => setShowHotline(false) })
    : stopped
      ? { mode: 'single', surfaceId: `${surfaceId}/stopped`, action: onStopContinue || onContinue }
      : {
        mode: 'dual',
        surfaceId,
        left: () => setStopped(true),
        right: onContinue,
      });

  if (stopped) {
    return (
      <div className="warning bition-warning">
        <div className="bition-warning-icon"><TriangleAlert size={32} /></div>
        <h2>{t('你選擇了正確的做法')}</h2>
        <p>{correctText}</p>
        <button type="button" className="bition-warn-btn bition-warn-btn-continue" onClick={onStopContinue || onContinue}>
          {onStopContinue ? (stopContinueLabel || t('查看結果')) : t('繼續觀看詐騙如何發展')}
        </button>
      </div>
    );
  }

  return (
    <div className="warning bition-warning">
      <WarningMarquee text={emphasis} />
      <div className="bition-warning-icon"><TriangleAlert size={32} /></div>
      <h2>{title}</h2>
      <p>{body}</p>
      <p className="bition-warning-emphasis">{emphasis}</p>

      {/* AUD-06: two columns only where this component really is a two-action
          screen. With `hotline` on (DepositWarning, off the main line) there is
          a third button between stop and continue, and a 1fr 1fr grid would
          drop it into a lopsided second row - so that instance keeps the stack
          it has always had. With `hotline` off (TopupWarning, the main-line
          stop-point) the two buttons are exactly the contract's LEFT and RIGHT,
          and they are laid out as such. */}
      <div className={`bition-warning-actions${hotline ? '' : ' is-dual'}`}>
        <button type="button" className="bition-warn-btn bition-warn-btn-stop" onClick={() => setStopped(true)}>
          {primaryLabel}
        </button>
        {hotline && (
          <button type="button" className="bition-warn-btn bition-warn-btn-hotline" onClick={() => setShowHotline(true)}>
            <Phone size={20} /> {t('撥打反詐專線 165')}
          </button>
        )}
        <button type="button" className="bition-warn-btn bition-warn-btn-continue" onClick={onContinue}>
          {secondaryLabel}
        </button>
      </div>

      {hotline && showHotline && (
        <Hotline165
          onBack={() => setShowHotline(false)}
          onStopPayment={() => {
            setShowHotline(false);
            setStopped(true);
          }}
        />
      )}
    </div>
  );
}
