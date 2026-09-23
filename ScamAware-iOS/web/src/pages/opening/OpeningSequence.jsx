import { useCallback, useEffect, useRef } from 'react';
import { installOpeningStaffExit } from './openingStaffExit';
import './OpeningSequence.css';

// The App's opening: a 4.6-second, pure-CSS "immersive AR system booting" title
// sequence drawn OVER the home screen, on the home screen's own background.
//
// WHY THERE IS NO FILM HERE ANY MORE
// This screen used to be a <video> playing webapp/public/media/intro/intro.mp4.
// Every failure it had was a media-stack failure and none of them was fixable
// from the page: the file had to be fetched and demuxed before the first frame,
// autoplay is refusable, and the Android WebView, iOS Safari and desktop Chrome
// each take a different amount of time to open the same file. The result in the
// room was a hesitation at the very moment the App is supposed to feel alive -
// which is why the whole of it (the element, the timers, the poster, the stalled
// and progress watchdogs, the autoplay fallbacks, and the MP4 itself) is gone
// rather than tuned. What is left is markup and keyframes: nothing to fetch,
// nothing to decode, nothing to be refused, and the first frame is the first
// paint.
//
// WHY IT IS NOT A ROUTE OF ITS OWN
// It used to be: `/` played the film and then navigated to `/language`. A
// navigation is a re-mount, and a re-mount of the home screen is a second
// decode of its background artwork - the flash the spec forbids. So the opening
// is now an overlay that pages/opening/OpeningHome.jsx renders ON TOP of the
// real home screen. The artwork underneath is mounted from the first frame,
// never unmounted, and never re-fetched; the end of the opening is this overlay
// fading out and unmounting, with the home UI already behind it. There is no
// navigation at all, so there is no frame in which anything is black.
//
// WHY EVERY MOVEMENT IS transform/opacity
// Those are the two properties a compositor can animate without touching layout
// or paint. The three text blocks are absolutely positioned and never change the
// box they occupy, so nothing here can reflow the home screen underneath - which
// is real, laid out, and one repaint away from being interactive.

// The trilingual title, in the one order the sequence is built around: Chinese
// first and alone, then English and Japanese together, then Chinese alone again.
// Held here as data rather than as i18n lookups on purpose - this is not the
// player's chosen language being rendered, it is all three at once, before any
// language has been chosen.
const ZH_LINES = ['沉浸式 AR', '詐騙體驗'];
const EN_LINES = ['IMMERSIVE AR', 'ANTI-FRAUD EXPERIENCE'];
const JP_LINE = '没入型 AR 詐欺体験';

// 沉浸式, one glyph at a time - because the three of them do not arrive, they
// are CALIBRATED: each starts off its own mark, wide of where it belongs, and
// the set converges. That is a per-glyph transform, so each glyph has to be its
// own element with its own offset.
//
// The offsets are deliberately uneven and deliberately small (well under one
// glyph width): a big scatter reads as confetti, and an even scatter reads as
// letter-spacing. What is wanted is the look of three tracked objects being
// pulled onto their marks at once. Held as CSS custom properties so all three
// share ONE keyframes rule - see @keyframes openingZhGlyph.
const ZH_LEAD_GLYPHS = [
  { glyph: '沉', dx: -0.44, dy: 0.07 },
  { glyph: '浸', dx: 0.19, dy: -0.05 },
  { glyph: '式', dx: 0.52, dy: 0.04 },
];

// When the home screen underneath is allowed to draw its own UI again, and when
// this overlay stops existing. The gap between the two is the cross-fade: the
// buttons come up while the last of the HUD goes down, so the hand-over reads as
// the system revealing the UI rather than as one screen replacing another.
//
// Both numbers are the end of a CSS animation in OpeningSequence.css, and the
// stylesheet is the authority on everything in between - JavaScript here starts
// two timers and does nothing else per frame.
export const OPENING_REVEAL_MS = 6550;
export const OPENING_TOTAL_MS = 7000;

export function OpeningSequence({ onReveal, onFinish }) {
  const revealedRef = useRef(false);
  const finishedRef = useRef(false);
  // The callbacks are read through a ref so that the effect below can own the
  // two timers for the whole life of the overlay: a parent re-render that hands
  // down a new closure must not restart a sequence that is already running.
  const handlersRef = useRef({ onReveal, onFinish });
  useEffect(() => { handlersRef.current = { onReveal, onFinish }; });

  const reveal = useCallback(() => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    const handler = handlersRef.current.onReveal;
    if (handler) handler();
  }, []);

  // One way, idempotent, and it always reveals first: the staff skip lands here
  // directly, and a home screen still hidden behind an overlay that just
  // unmounted would be a blank stage.
  const finish = useCallback(() => {
    reveal();
    if (finishedRef.current) return;
    finishedRef.current = true;
    const handler = handlersRef.current.onFinish;
    if (handler) handler();
  }, [reveal]);

  useEffect(() => {
    const timers = [
      setTimeout(reveal, OPENING_REVEAL_MS),
      setTimeout(finish, OPENING_TOTAL_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reveal, finish]);

  // The hidden staff exit: three taps in the screen's top-right corner skip the
  // opening. Unannounced, and installed in an effect of its own with no
  // dependencies - re-installing it resets the tap counter, so it must not be
  // able to be re-run between a staff member's second tap and their third. See
  // openingStaffExit.js for why it is plain DOM on document.body.
  const finishRef = useRef(finish);
  useEffect(() => { finishRef.current = finish; }, [finish]);
  useEffect(() => installOpeningStaffExit({ onSkip: () => finishRef.current() }), []);

  return (
    // pointer-events are ON deliberately: for as long as this exists it is the
    // only thing a finger can reach, so the language buttons and the staff gear
    // underneath cannot be hit early. It is unmounted rather than hidden, so
    // that guarantee ends exactly when the opening does.
    <div className="opening" aria-hidden="true">
      {/* The only thing between the sequence and the home artwork: a dark wash
          that lifts the type off the background. It is the one layer that fades
          at the end - the artwork itself is never touched, because it is the
          home screen's own <img> and it is staying. */}
      <div className="opening__scrim" />

      {/* The AR furniture, and the half of this sequence that is not type.
          Every piece of it is a hairline, a bracket or a ring: no particles, no
          glitch, nothing that competes with the title for the eye - and nothing
          that is drawn with a shadow or a blur big enough to cost a frame.

          It is layered rather than decorated. The grid and the axes are the
          SPACE, the reticle and the brackets are the TRACKING, and the rings are
          the EVENTS - one for the AR lock, one for the depth shift, two for the
          system pulse. Four ring elements rather than one reused four times,
          because each of them is a single expansion at a single moment and an
          element that runs one animation for the whole sequence cannot fire
          twice. */}
      <div className="opening__hud">
        <span className="opening__grid" />
        <span className="opening__axis opening__axis--v" />
        <span className="opening__axis opening__axis--h" />
        <span className="opening__tick opening__tick--left" />
        <span className="opening__tick opening__tick--right" />
        <span className="opening__sweep" />
        <span className="opening__reticle" />
        <span className="opening__corner opening__corner--tl" />
        <span className="opening__corner opening__corner--tr" />
        <span className="opening__corner opening__corner--bl" />
        <span className="opening__corner opening__corner--br" />
        <span className="opening__rule opening__rule--top" />
        <span className="opening__rule opening__rule--bottom" />
        <span className="opening__ring opening__ring--lock" />
        <span className="opening__ring opening__ring--depth" />
        <span className="opening__ring opening__ring--pulse-a" />
        <span className="opening__ring opening__ring--pulse-b" />
      </div>

      <div className="opening__stack">
        {/* English above, Chinese in the middle, Japanese below - the composition
            the sequence assembles at its peak. All three are in the document
            from the first frame and positioned absolutely, so their arrivals are
            transforms and nothing here ever reflows.

            English and Japanese each carry their own scan bar: they do not fly
            in and stop, they are PROJECTED out of depth and then lit by a line
            passing across them, which is what makes them read as an AR
            information layer rather than as two more headlines. */}
        <p className="opening__en" lang="en">
          <span className="opening__en-body">
            {EN_LINES.map((line) => <span key={line} className="opening__en-line">{line}</span>)}
            <span className="opening__proj-scan" />
          </span>
        </p>

        {/* The one thing this animation is for, and the only block that is on
            screen from the first movement to the last.

            Three visual units, three different mechanisms, in this order:
            沉浸式 is CALIBRATED (three glyphs converging onto their marks), AR
            LOCKS ON (overshoot, rebound, four brackets closing onto it, a slice
            offset, a scan, a ring), and 詐騙體驗 is REVEALED by a wipe that
            uncovers it left to right. Nothing here slides in from off-screen. */}
        <p className="opening__zh" lang="zh-Hant">
          <span className="opening__zh-inner">
            <span className="opening__zh-line opening__zh-line--1">
              <span className="opening__zh-lead">
                {ZH_LEAD_GLYPHS.map(({ glyph, dx, dy }) => (
                  <span
                    key={glyph}
                    className="opening__zh-glyph"
                    style={{ '--dx': dx, '--dy': dy }}
                  >
                    {glyph}
                  </span>
                ))}
              </span>
              <span className="opening__zh-ar">
                AR
                {/* The slice. A second copy of the same two letters, clipped to a
                    band and offset for about a tenth of a second as the lock
                    lands. One element and one transform - the alternative, a
                    filter or a blend of the whole title, would be a repaint of
                    the biggest text on screen. */}
                <span className="opening__zh-ar-slice">AR</span>
                <span className="opening__zh-ar-scan" />
                <span className="opening__ar-bracket opening__ar-bracket--tl" />
                <span className="opening__ar-bracket opening__ar-bracket--tr" />
                <span className="opening__ar-bracket opening__ar-bracket--bl" />
                <span className="opening__ar-bracket opening__ar-bracket--br" />
                <span className="opening__ar-beam opening__ar-beam--left" />
                <span className="opening__ar-beam opening__ar-beam--right" />
              </span>
            </span>
            <span className="opening__zh-line opening__zh-line--2">
              <span className="opening__zh-tail">{ZH_LINES[1]}</span>
              <span className="opening__zh-wipe" />
            </span>
            <span className="opening__zh-lock" />
          </span>
        </p>

        <p className="opening__jp" lang="ja">
          <span className="opening__jp-body">
            <span className="opening__jp-line">{JP_LINE}</span>
            <span className="opening__proj-scan" />
          </span>
        </p>
      </div>
    </div>
  );
}

// Exported for the tests that pin the sequence's shape: the three languages, the
// order they arrive in, and the two moments the rest of the App depends on.
export { EN_LINES, JP_LINE, ZH_LEAD_GLYPHS, ZH_LINES };

// Re-exported from here for the same reason they always were: a consumer asking
// for these numbers is asking "what does the opening do", not "which file holds
// the constant".
export {
  STAFF_SKIP_HIT_AREA_PX, STAFF_SKIP_TAIL_MS, STAFF_SKIP_TAPS, STAFF_SKIP_WINDOW_MS,
} from './openingStaffExit';
