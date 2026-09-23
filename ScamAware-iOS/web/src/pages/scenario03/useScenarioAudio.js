import { useCallback, useEffect, useRef, useState } from 'react';
import { isSoundEnabled } from '../../lib/feedback';

// Plays scenario03's recorded voice lines from
// /public/assets/scenarios/scenario-03/audio/**.
// Deliberately NOT an AudioManager: one hook, one <audio> element for the
// whole session, one clip at a time. The incoming-call ringtone is a
// separate concern and stays in scenario03Feedback (WebAudio), because it
// loops independently of whatever voice line is playing.
//
// One persistent element, not a fresh `new Audio()` per clip: mobile
// browsers' autoplay policy grants playback permission per-element, tied to
// the user gesture that unlocked it - a NEW element created for every
// dialogue block (scenario03 plays ~18 of them per run) is treated as
// unproven every single time and gets silently blocked after the first one
// or two, which is exactly what "no audio after the first line" looks like
// in the field even though it never reproduces in a desktop/headless
// browser (those don't enforce the same per-element restriction). Reusing
// one element and only ever changing its `src` keeps every subsequent
// play() riding the same already-unlocked activation.
//
// The recordings might not exist yet for a given language/line, so the
// missing-file path is a real path in production: a 404 (or a blocked
// autoplay) is caught, the filename is logged once, `progress` stays null,
// and the caller falls back to the character-timed subtitle reveal. Nothing
// here ever throws into the render tree or stalls a scene.
const warned = new Set();

function warnMissing(src, reason) {
  if (warned.has(src)) return;
  warned.add(src);
  // eslint-disable-next-line no-console
  console.warn(`[scenario03] 找不到或無法播放語音檔：${src}（${reason}）→ 改用字幕計時播放`);
}

export function useScenarioAudio() {
  const elRef = useRef(null);
  const srcRef = useRef(null);
  const handlersRef = useRef({});
  const [state, setState] = useState({ src: null, progress: null, playing: false });

  // Lazily creates the ONE Audio element this hook will ever use, wiring up
  // its listeners once. Every listener reads srcRef.current at fire time
  // (never a captured src from a stale call) since there is only ever one
  // element - an event on it always belongs to whatever src is current.
  const ensureElement = useCallback(() => {
    if (elRef.current) return elRef.current;
    const el = new Audio();
    el.preload = 'auto';
    el.addEventListener('timeupdate', () => {
      const src = srcRef.current;
      if (!src || !el.duration) return;
      setState({ src, progress: Math.min(1, el.currentTime / el.duration), playing: !el.paused });
    });
    el.addEventListener('ended', () => {
      const src = srcRef.current;
      if (!src) return;
      setState({ src, progress: 1, playing: false });
      handlersRef.current.onEnded?.();
    });
    el.addEventListener('error', () => {
      const src = srcRef.current;
      if (!src) return;
      warnMissing(src, '載入失敗');
      setState({ src, progress: null, playing: false });
      handlersRef.current.onUnavailable?.();
    });
    elRef.current = el;
    return el;
  }, []);

  const stop = useCallback(() => {
    const el = elRef.current;
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
    srcRef.current = null;
    handlersRef.current = {};
    setState((prev) => (prev.src === null && prev.progress === null && !prev.playing
      ? prev
      : { src: null, progress: null, playing: false }));
  }, []);

  useEffect(() => stop, [stop]);

  // Starts `src`, stopping whatever was playing first. Calling it again with
  // the src already playing is a no-op, so a re-render can never double-play.
  const play = useCallback((src, handlers = {}) => {
    if (!src) return;
    if (srcRef.current === src) {
      handlersRef.current = handlers;
      return;
    }
    stop();
    srcRef.current = src;
    handlersRef.current = handlers;

    if (!isSoundEnabled()) {
      handlers.onUnavailable?.();
      return;
    }

    let el;
    try {
      el = ensureElement();
    } catch {
      warnMissing(src, 'Audio 建構失敗');
      handlers.onUnavailable?.();
      return;
    }
    el.src = src;
    el.load();

    const started = el.play();
    if (started && typeof started.catch === 'function') {
      started.catch(() => {
        // A newer play() may already have superseded this one - only treat
        // it as a real failure if this call's src is still the active one.
        if (srcRef.current !== src) return;
        warnMissing(src, '瀏覽器拒絕播放');
        setState({ src, progress: null, playing: false });
        handlersRef.current.onUnavailable?.();
      });
    }
  }, [stop, ensureElement]);

  const pause = useCallback(() => {
    elRef.current?.pause();
    setState((prev) => (prev.playing ? { ...prev, playing: false } : prev));
  }, []);

  const resume = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    const started = el.play();
    if (started && typeof started.catch === 'function') started.catch(() => {});
    setState((prev) => (prev.playing ? prev : { ...prev, playing: true }));
  }, []);

  const currentTime = useCallback(() => elRef.current?.currentTime ?? 0, []);

  return {
    play,
    stop,
    pause,
    resume,
    currentTime,
    src: state.src,
    // null whenever there is no real audio driving this line - the signal
    // callers use to fall back to timed playback.
    progress: state.progress,
    playing: state.playing,
  };
}
