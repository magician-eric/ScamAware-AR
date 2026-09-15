import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStageClassName } from '../../shell/StageClassContext';
import { useARInteraction } from '../../lib/arInteraction';
import { startImageRecognition } from '../../lib/ar/imageRecognition';
import { routeForTargetIndex, scenarioForTargetIndex, targetForIndex } from '../../lib/ar/scenarioTargetMap';
import { createTargetLock, TARGET_LOSS_TOLERANCE_MS } from '../../lib/ar/targetLock';
import { prepareScenarioEntry } from '../../lib/enterScenario';
import { isScanDiagnosticsEnabled, recordScanDiagnostic, resetScanDiagnostics } from '../../lib/ar/scanDiagnostics';
import { ArScanDiagnosticsOverlay } from './ArScanDiagnosticsOverlay';
import { getArScanLang, getArScanStrings } from './i18n';
import { HERO_IMAGE_SRC_BY_LANG, HERO_IMAGE_ASPECT_RATIO_BY_LANG, CAMERA_BOX_BY_LANG } from './heroLayout';
import '../entryScreens.css';

// How often the offer is checked against the clock. The offer therefore
// survives its last sighting by between TARGET_LOSS_TOLERANCE_MS and one tick
// more - 3.5s to 4.0s - which is the window a lost card is meant to be
// forgiven in. A plain interval rather than a timeout re-armed on every
// sighting: sightings arrive many times a second while a card is held, and
// re-arming a timer on each one is a lot of churn to answer a question that
// only needs asking twice a second.
const TARGET_LOSS_POLL_MS = 500;

function rectStyle({ top, bottom, left = 0, right = 100 }) {
  return {
    position: 'absolute',
    top: `${top}%`,
    height: `${bottom - top}%`,
    left: `${left}%`,
    width: `${right - left}%`,
  };
}

// Screen between language selection and the five-scenario menu (see
// routes.jsx). v2 artwork (see heroLayout.js) has a real alpha cutout for
// the camera box and no bars/title/button baked in below it, so the camera
// picture sits BEHIND the artwork and shows through the hole directly,
// and the prompt + buttons are placed freely in the open area below the box
// instead of aligning to drawn bars.
//
// The page does not create the camera element itself. Which element that is
// depends on where CIBAR is running - an <img> fed by the AR glasses' MJPEG
// stream, a <video> fed by the browser's own camera API on a desktop - and
// that decision belongs to lib/ar/cameraSource.js, not to a screen. So the page
// provides an empty host box and the recogniser mounts whichever element it
// opened into it. The host is a child of its own, with no React children,
// so React never has to reconcile around a node it did not render.
//
// RECOGNITION IS NOT ENTRY. Two stages, and the gap between them is the point:
//
//   SCANNING          nothing on offer. "移動鏡頭，尋找隱藏的線索".
//                     A RIGHT wave does nothing at all.
//   READY_TO_ENTER    a card is on offer. The prompt becomes the first line of
//                     that card's story and the CTA offers to walk into it.
//                     RIGHT or a tap takes the offer; nothing else does.
//
// A recognised target NEVER navigates by itself, at any delay, on any path -
// the player has to take the offer. That is what makes the printed poster
// explorable: on the old flow a card entered its scenario the instant it was
// matched, and a player never learned what they had just pointed at.
//
// The poster also carries a hundred-odd 3D images that are not targets. They
// are scenery, and this page treats them as exactly that: no match, no error,
// no "not a clue" message, no buzz. Not matching is the resting state, not a
// failure, so there is nothing here that reports one.
export function ArScanHome() {
  useStageClassName('ar-scan-stage');
  const navigate = useNavigate();
  const lang = getArScanLang();
  const t = getArScanStrings(lang);
  const cameraBox = CAMERA_BOX_BY_LANG[lang];
  const aspectRatio = HERO_IMAGE_ASPECT_RATIO_BY_LANG[lang];

  const cameraHostRef = useRef(null);
  const scannerRef = useRef(null);
  const isLeavingRef = useRef(false);
  // Which card is on offer, held steady across the gaps in recognition. The
  // lock is the authority and the state below is its mirror: the lock is
  // written from a recogniser callback that fires many times a second, and
  // only the transitions a player can actually see are pushed into React.
  const lockRef = useRef(null);
  if (lockRef.current === null) lockRef.current = createTargetLock();
  const [selectedTargetIndex, setSelectedTargetIndex] = useState(null);
  const [cameraFailed, setCameraFailed] = useState(false);
  // Read once, not on every render: turning diagnostics on mid-visit is not a
  // thing anyone does, and a value that can change under the overlay would
  // make its subscription lifetime depend on a render.
  const [diagnosticsEnabled] = useState(() => isScanDiagnosticsEnabled());
  // The precise failure, for the tester. The player still reads t.cameraError
  // below - one calm sentence with a way forward - and this is only rendered
  // when diagnostics are on.
  const [failureDetail, setFailureDetail] = useState('');

  const scenario = selectedTargetIndex === null ? null : scenarioForTargetIndex(selectedTargetIndex);
  const offer = scenario ? t.targets[scenario] : null;

  // The one way into a scenario from this page, and the only thing that
  // navigates. The RIGHT gesture and the CTA's onClick are the same function,
  // not two paths that happen to agree - see the contract declaration below.
  //
  // With nothing on offer this does nothing: no guess, no "the last card you
  // saw", no fallback scenario. A wave at an empty poster is not a choice.
  function enterSelectedScenario() {
    if (isLeavingRef.current) return;
    const route = selectedTargetIndex === null ? null : routeForTargetIndex(selectedTargetIndex);
    if (!route) return;
    isLeavingRef.current = true;

    scannerRef.current?.stop?.();
    // The same entry the scenario menu's buttons use - one initialisation
    // path, so an AR entry and a manual entry start identically.
    prepareScenarioEntry(route);
    navigate(route);
  }

  // Geometry, in story terms (lib/arInteraction): one action while a card is
  // on offer, none while the player is still looking. Two surfaces rather than
  // one with a disabled action, because they are two different screens to a
  // player - and because the contract's revision counter moves between them,
  // so a wave recognised while the page was still searching can never land on
  // an offer that appeared in the meantime.
  useARInteraction(offer
    ? { mode: 'single', surfaceId: 'ar-scan/target-offer', action: enterSelectedScenario }
    : { mode: 'display', surfaceId: 'ar-scan/scanning' });

  useEffect(() => {
    let cancelled = false;
    const lock = lockRef.current;
    // The page is the unit being diagnosed: a second visit that works must not
    // be read through the first visit's failures.
    resetScanDiagnostics();

    // Every frame that matches lands here - the same index over and over while
    // a card is held in front of the lens. The lock absorbs that: it answers
    // whether this sighting changed what is on offer, and only a change is
    // worth a re-render or a diagnostic line.
    function handleTargetSeen(targetIndex) {
      if (isLeavingRef.current) return;
      if (!routeForTargetIndex(targetIndex)) return;
      if (!lock.see(targetIndex, Date.now())) return;
      setSelectedTargetIndex(targetIndex);
      // A short buzz on a NEW card, the way this screen has always confirmed a
      // find. It is a "look down, something changed" cue, not a status: the
      // player still reads a line of story, never a recognition message. It
      // fires on a change only - never per matched frame, and never for the
      // scenery, which produces no sighting at all.
      navigator.vibrate?.(80);
      recordScanDiagnostic('match', 'ok', {
        targetIndex,
        target: targetForIndex(targetIndex)?.id ?? 'unknown',
      });
    }

    // The other half of the tolerance: an offer whose sightings have stopped
    // for long enough goes away, and the page is back to searching.
    const expiry = setInterval(() => {
      if (isLeavingRef.current) return;
      if (!lock.expire(Date.now())) return;
      setSelectedTargetIndex(null);
      recordScanDiagnostic('match', 'pending', {
        status: 'target lost',
        afterMs: TARGET_LOSS_TOLERANCE_MS,
      });
    }, TARGET_LOSS_POLL_MS);

    (async () => {
      try {
        const scanner = await startImageRecognition(cameraHostRef.current, {
          onTargetSeen: handleTargetSeen,
        });
        if (cancelled) {
          scanner.stop();
          return;
        }
        scannerRef.current = scanner;
      } catch (err) {
        console.warn('Failed to start AR camera:', err);
        if (cancelled) return;
        setFailureDetail(err?.message ?? String(err));
        setCameraFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(expiry);
      scannerRef.current?.stop?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goToManualScenarioSelection() {
    isLeavingRef.current = true;
    scannerRef.current?.stop?.();
    navigate('/scenario-menu');
  }

  return (
    <div
      className="ar-scan-page"
      style={{ position: 'relative', width: `min(100%, calc(100dvh * ${aspectRatio}))`, aspectRatio, margin: '0 auto' }}
    >
      <div id="ar-scanner" className="ar-scan-camera-box" style={rectStyle(cameraBox)}>
        <div className="ar-scan-camera-host" ref={cameraHostRef} />
        {cameraFailed && (
          <p className="ar-scan-camera-error">
            {t.cameraError}
            {diagnosticsEnabled && failureDetail
              ? <span className="ar-scan-camera-error-detail">{failureDetail}</span>
              : null}
          </p>
        )}
        {offer && <div className="ar-scan-offer-ring" aria-hidden="true" />}
      </div>

      <img className="ar-scan-hero-img" src={HERO_IMAGE_SRC_BY_LANG[lang]} alt={t.heroAlt} />

      <ArScanDiagnosticsOverlay enabled={diagnosticsEnabled} />

      <div className="ar-scan-below-camera" style={{ top: `${cameraBox.bottom}%` }}>
        {/* One prompt area in two states. The live region is the outer,
            stable element; the copy inside is keyed by which offer it is
            about, so the short fade/slide plays when the prompt changes and
            on no other render. */}
        <div className={`ar-scan-prompt${offer ? ' ar-scan-prompt-offer' : ''}`} aria-live="polite">
          <div className="ar-scan-prompt-copy" key={scenario ?? 'scanning'}>
            <h1 className="ar-scan-title">{offer ? offer.headline : t.scanning.headline}</h1>
            {!offer && <p className="ar-scan-hint">{t.scanning.hint}</p>}
          </div>
        </div>

        {offer && (
          <button type="button" id="enter-scenario-button" className="ar-scan-enter-button" onClick={enterSelectedScenario}>
            <span>{offer.cta}</span>
            <span className="ar-scan-button-arrow" aria-hidden="true">→</span>
          </button>
        )}

        <button type="button" id="manual-scenario-button" className="ar-scan-manual-button" onClick={goToManualScenarioSelection}>
          <span>{t.manualSelection}</span>
          <span className="ar-scan-button-arrow" aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
