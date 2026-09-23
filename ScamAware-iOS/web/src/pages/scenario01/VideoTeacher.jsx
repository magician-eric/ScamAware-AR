import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useVideoProgress } from '../../lib/videoProgress';
import { useT, getScenario01Lang } from './i18n';
import { useStageClassName } from '../../shell/StageClassContext';
import { FraudWarningBanner } from '../../components/warnings/FraudWarningBanner';
import { useARInteraction } from '../../lib/arInteraction';
import { TEACHER_VIDEO_SRC } from './teacherVideo';

const STALLED_PLAYBACK_TIMEOUT_MS = 4000;

// True full-bleed video ad page, same "no chrome, just the ad + one CTA"
// pattern as Feed.jsx immediately before it in the flow (no TopBar/back
// button here either - see useStageClassName('video-stage') below, which
// zeroes out .app's normal padding same as .feed-stage does). The AI
// fraud-detection callout used to be a blocking modal that paused the
// video at t=12s; it's now a non-blocking marquee overlaid on the video
// itself instead, so playback never stops and the warning still reads as
// "obviously stamped on top of the content", not a dismissable dialog.
//
// Autoplay: the page must start playing the moment it mounts, with no tap
// required, on Android/iOS/desktop/PWA alike. This reuses scenario02's
// VideoOverlay strategy (see mediaAutoplay.js) rather than inventing a new
// one - start muted (muted autoplay is never blocked by browser policy,
// including iOS Safari) and flip `.muted = false` once `playing` actually
// fires. Unmuting an already-playing element isn't a new play() request, so
// it isn't re-blocked the way a fresh unmuted play() call would be. The
// tap-to-play button only ever reappears as a fallback if the browser
// rejects the initial play() call outright.
export function VideoTeacher() {
  useStageClassName('video-stage');
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const stallTimerRef = useRef(null);
  const startedRef = useRef(false);
  const [playbackState, setPlaybackState] = useState('loading');
  const { showWarning } = useVideoProgress(videoRef);
  const t = useT();
  const lang = getScenario01Lang();
  const videoSrc = TEACHER_VIDEO_SRC[lang] ?? TEACHER_VIDEO_SRC.zh;
  const tickerText = t('⚠ AI 即時辨識：偵測到高風險投資話術——保證獲利、穩賺不賠。合法投資不得保證收益，請提高警覺。');

  const clearStallTimer = () => {
    if (stallTimerRef.current !== null) {
      window.clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  };

  const requestPlayback = () => {
    const video = videoRef.current;
    if (!video || (!video.paused && !video.ended)) return;

    clearStallTimer();
    if (playbackState === 'error') {
      video.load();
    }
    video.muted = true;
    setPlaybackState('starting');
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        setPlaybackState('retry');
      });
    }
  };

  // Runs once per mounted src: kick off muted autoplay as soon as the
  // element exists, and make sure playback (and any pending stall timer)
  // is torn down when the player leaves this page, so no audio/decoding
  // work survives into the next step.
  useEffect(() => {
    const video = videoRef.current;
    requestPlayback();
    return () => {
      clearStallTimer();
      if (video) video.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoSrc]);

  const handlePlaying = (event) => {
    clearStallTimer();
    startedRef.current = true;
    setPlaybackState('playing');
    event.currentTarget.muted = false;
  };

  const handlePause = (event) => {
    clearStallTimer();
    if (startedRef.current && !event.currentTarget.ended) {
      setPlaybackState('paused');
    }
  };

  const handlePlaybackDelay = () => {
    clearStallTimer();
    stallTimerRef.current = window.setTimeout(() => {
      setPlaybackState('retry');
    }, STALLED_PLAYBACK_TIMEOUT_MS);
  };

  const handleVideoError = () => {
    clearStallTimer();
    setPlaybackState('error');
  };

  // Natural completion. `handlePause` above deliberately ignores the pause a
  // finished video fires (it is not the player pausing, so the tap-to-play
  // control must not appear), which left nothing able to say the pitch was
  // over. This does, and it is read in exactly one place: the `presenting`
  // flag below. It puts no control on screen and changes no navigation - the
  // CTA is what leaves this page, before the video ends or after it.
  const handleEnded = () => {
    clearStallTimer();
    setPlaybackState('ended');
  };

  const recoveryLabel = playbackState === 'paused' ? t('繼續播放') : t('重新播放');
  // The tap-to-play button is a fallback only: it must never appear while
  // the video is loading/starting/playing on its own, only after the
  // browser has actually rejected play() (retry) or the video paused
  // outside of natural completion (paused).
  const showPlayControl = playbackState === 'retry' || playbackState === 'paused';

  // AR Interaction Contract: the pitch video plays itself, so the only story
  // action on this screen is the CTA under it - `single`. The tap-to-play
  // control is a playback recovery affordance, not a story step, so it is not
  // declared; the warning marquee is display-only.
  //
  // `presenting` while the pitch is actually running. It does NOT disable
  // anything: RIGHT still runs the CTA at any second of the video, exactly as
  // before, and so does a tap. All it does is hold the shared inactivity
  // hint's clock, so a player watching the pitch is not told to swipe on ten
  // seconds after it started. Once it has finished, stalled, been paused or
  // failed, the player really is waiting, and the hint is free to count.
  const watchingPitch = playbackState === 'loading' || playbackState === 'starting' || playbackState === 'playing';
  useARInteraction({
    mode: 'single',
    surfaceId: 'scenario01/video-teacher',
    presenting: watchingPitch,
    action: () => navigate('/scenario01-investment/line-teacher'),
  });

  return (
    <div className="video-fullscreen">
      <video
        ref={videoRef}
        className="video-fullscreen-media"
        src={videoSrc}
        autoPlay
        muted
        preload="auto"
        playsInline
        controls={false}
        disablePictureInPicture
        controlsList="nodownload noplaybackrate nofullscreen"
        onClick={requestPlayback}
        onPlaying={handlePlaying}
        onPause={handlePause}
        onWaiting={handlePlaybackDelay}
        onStalled={handlePlaybackDelay}
        onEnded={handleEnded}
        onError={handleVideoError}
      />

      {playbackState === 'error' && (
        <div className="video-fullscreen-fallback">
          <h2>{t('影片載入失敗')}</h2>
          <p>{t('陳老師站在白板前，背景有 K 線圖、AI 分析圖、會員獲利截圖。')}</p>
        </div>
      )}

      {showPlayControl && (
        <button type="button" className="video-fullscreen-play" onClick={requestPlayback} aria-label={recoveryLabel}>
          <Play aria-hidden="true" fill="currentColor" />
          <span>{recoveryLabel}</span>
        </button>
      )}

      <FraudWarningBanner active={showWarning} theme="invest" severity="notice" body={tickerText} />

      <Button className="video-fullscreen-cta" onClick={() => navigate('/scenario01-investment/line-teacher')}>
        {t('加入 LINE 了解更多')}
      </Button>
    </div>
  );
}
