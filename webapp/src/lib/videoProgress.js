import { useEffect, useRef, useState } from 'react';

// Flags the fraud-warning overlay once the video reaches t>=12s (same
// timing the page has always used). Playback is never paused for it - the
// warning is a non-blocking marquee stamped on top of the video (see
// VideoTeacher.jsx), not a dialog the player has to dismiss.
export function useVideoProgress(videoRef) {
  const [showWarning, setShowWarning] = useState(false);
  const warnedRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    function onTimeUpdate() {
      if (!warnedRef.current && video.currentTime >= 12) {
        warnedRef.current = true;
        setShowWarning(true);
      }
    }

    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
  }, [videoRef]);

  return { showWarning };
}
