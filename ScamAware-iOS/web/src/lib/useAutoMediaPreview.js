import { useEffect, useRef } from 'react';

// Shared timing for datingLead's auto-playing videos and auto-zooming photos in
// scenario02's LINE chat: a thumbnail appears in the chat first, stays for
// `thumbnailDelay`, then the media opens on its own - no tap required
// anywhere in this sequence (see PrivateChat.jsx). Videos close themselves
// on the real `ended` event; images close themselves on their own timer -
// this hook only owns the "thumbnail -> auto-open" half, since closing
// works differently enough between the two media types that forcing one
// timer shape onto both would just make each caller unwind it again anyway.
//
// `pendingKey` should be a stable id/string identifying the current pending
// media item, and `null`/`undefined` when nothing is pending. Passing a new
// key runs `onOpen` again after `thumbnailDelay`; the same key is only ever
// armed once, so a re-render that doesn't change the key can't restart the
// countdown or re-open something already opened.
export function useAutoMediaPreview(pendingKey, onOpen, thumbnailDelay = 2000) {
  const openedForRef = useRef(null);

  useEffect(() => {
    if (pendingKey == null) {
      openedForRef.current = null;
      return undefined;
    }
    if (openedForRef.current === pendingKey) return undefined;
    openedForRef.current = pendingKey;
    const t = setTimeout(() => onOpen(pendingKey), thumbnailDelay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingKey, thumbnailDelay]);
}
