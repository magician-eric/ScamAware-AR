import { useEffect, useRef, useState } from 'react';

// Port of the old js/app.js typeMessages() scripted-chat engine as a hook.
// Old code drove doneSelector/replySelector element reveals directly on the
// DOM; here that just becomes the returned `done` boolean the page renders
// its own reveal from.
export function useTypedMessages(messages, { messageDelay = 1700, typingDelay = 900, onFlagged } = {}) {
  const [rendered, setRendered] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [done, setDone] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    const timeouts = [];
    const schedule = (fn, ms) => {
      const id = setTimeout(fn, ms);
      timeouts.push(id);
    };

    function reveal(m) {
      setRendered((prev) => [...prev, m]);
      if (m.showVipWarning && onFlagged) schedule(onFlagged, 500);
    }

    function next(i) {
      if (cancelled) return;
      if (i >= messages.length) {
        setDone(true);
        return;
      }
      const m = messages[i];
      if (m.type === 'user' || m.type === 'system') {
        reveal(m);
        schedule(() => next(i + 1), m.delay || messageDelay);
        return;
      }
      setIsTyping(true);
      schedule(() => {
        setIsTyping(false);
        reveal(m);
        schedule(() => next(i + 1), m.delay || messageDelay);
      }, m.typingDelay || typingDelay);
    }

    next(0);

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { rendered, isTyping, done };
}
