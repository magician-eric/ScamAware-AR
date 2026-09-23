import { useCallback, useState } from 'react';
import { LanguageSelect } from '../LanguageSelect';
import { OpeningSequence } from './OpeningSequence';

// The App's first screen at a cold start: the home screen, with the opening
// sequence playing on top of it.
//
// It is ONE screen and not two, and that is the whole design. The opening used
// to be a route of its own that navigated to /language when it finished, which
// meant the home screen mounted for the first time at the moment the opening
// ended - a fresh decode of its background artwork, one frame of nothing while
// that happened, and a visible hand-over. Here the home screen is mounted from
// the very first paint, the sequence is drawn over it on that same artwork, and
// the end of the sequence is an overlay unmounting. No navigation, no re-mount,
// no second decode, and no frame in which the background is anything other than
// what it will still be when the player reaches for a language button.
//
// Route-wise this is the index route ('/'), and /language remains the plain
// home screen with no opening on it - so 返回首頁 from anywhere in the app comes
// back to the home screen directly, exactly as it did before.

// Once per cold start, and not once per mount.
//
// The screen this replaced navigated away with `replace: true`, so '/' left the
// history stack the moment the film ended and nothing could return to it. This
// one does not navigate at all, which means '/' STAYS in the stack underneath
// /gesture-tutorial - and the glasses' hardware Back key (WebLayerController's
// onBackPressed) walks straight back onto it. Without this flag that remount
// starts the whole 4.6-second opening again, at the one moment a player is
// trying to get back to the language buttons.
//
// A module-level flag rather than sessionStorage, deliberately: what it has to
// mean is "this page load has already seen the opening", which is exactly the
// lifetime of this module. A reload - the OTA restart, a WebView that was
// evicted and rebuilt - is a cold start again, and the opening plays again,
// which is the behaviour the film had and the behaviour a session in front of
// an audience is set up around.
let openingHasPlayed = false;

export function OpeningHome() {
  // Two states rather than one, because the hand-over is a cross-fade: the home
  // UI comes up 450ms before the overlay stops existing (see OPENING_REVEAL_MS /
  // OPENING_TOTAL_MS), so the buttons are already there as the last of the HUD
  // fades off them.
  //
  // Both start from the flag above, so a return to '/' renders the plain home
  // screen on its first paint - no overlay mounted and unmounted again, and no
  // frame in which the buttons are hidden.
  const [revealed, setRevealed] = useState(openingHasPlayed);
  const [openingDone, setOpeningDone] = useState(openingHasPlayed);

  // Set on reveal as well as on finish: reveal always comes first (the skip
  // gesture calls both), so from that moment on the opening has been seen -
  // including if something remounts this screen during the 450ms cross-fade.
  const handleReveal = useCallback(() => {
    openingHasPlayed = true;
    setRevealed(true);
  }, []);
  const handleFinish = useCallback(() => {
    openingHasPlayed = true;
    setOpeningDone(true);
  }, []);

  return (
    <>
      <LanguageSelect booting={!revealed} />
      {/* Unmounted, not hidden: an overlay left at opacity 0 over the home
          screen would keep swallowing every tap aimed at a language button. */}
      {!openingDone && (
        <OpeningSequence onReveal={handleReveal} onFinish={handleFinish} />
      )}
    </>
  );
}
