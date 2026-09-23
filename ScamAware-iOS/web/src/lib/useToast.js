import { useCallback, useState } from 'react';

// Simple in-page toast for short, in-world confirmations (加入收藏, 通知)
// (spec section 28). Auto-dismisses; only one shown at a time.
export function useToast() {
  const [message, setMessage] = useState(null);

  const showToast = useCallback((text) => {
    setMessage(text);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setMessage(null), 2200);
  }, []);

  return [message, showToast];
}
