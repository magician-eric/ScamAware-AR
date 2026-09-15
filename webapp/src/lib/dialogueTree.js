import { useEffect, useMemo, useRef, useState } from 'react';

// Generic branching-chat engine shared by scenario02's DatingChat and
// PrivateChat. Both need more than useTypedMessages' flat script or
// LineTeacher's one-off A/B split: multi-round choices, video-watch gates,
// and non-blocking tip acks, all chained through explicit `next` node ids.
//
// Node shapes (all optional fields besides `id`):
//   { id, from: 'datingLead'|'user'|'system', text, wait, typingWait, next }
//   { id, divider: 'Day 3', wait, next }
//   { id, timeAnchor: '19:42', wait, next }
//   { id, tip: 'text', next }
//   { id, video: { videoId, duration, lines: [...] }, next }
//   { id, image: { src, alt }, next }
//   { id, link: { ... }, next }
//   { id, choice: true, options: [{ label, userText, reply, replyWait, typingWait, next }] }
//   { id, end: true }
//
// video/image/link all follow the same "gate" shape: reaching the node pushes
// a tappable card into the timeline and stops advancing (pendingVideo/
// pendingImage/pendingLink) until the matching completeX() is called by
// whatever UI renders that card - the player must interact with the card
// itself, nothing auto-advances past one.
export function useDialogueTree(
  nodes,
  startId,
  { startDelay = 0, initialTimeline, resumeId, initialWatchedVideoIds } = {},
) {
  const nodesById = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
  const [timeline, setTimeline] = useState(() => initialTimeline ?? []);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingChoice, setPendingChoice] = useState(null);
  const [pendingVideo, setPendingVideo] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);
  const [pendingLink, setPendingLink] = useState(null);
  const [pendingTip, setPendingTip] = useState(null);
  const [watchedVideoIds, setWatchedVideoIds] = useState(() => new Set(initialWatchedVideoIds));
  const [done, setDone] = useState(false);
  const [endReason, setEndReason] = useState(null);
  const startedRef = useRef(false);
  const timeoutsRef = useRef([]);

  function schedule(fn, ms) {
    const t = setTimeout(fn, ms);
    timeoutsRef.current.push(t);
    return t;
  }

  function push(item) {
    setTimeline((prev) => [...prev, item]);
  }

  function advance(id) {
    const node = nodesById[id];
    if (!node || node.end) {
      setDone(true);
      if (node?.reason) setEndReason(node.reason);
      return;
    }
    if (node.divider) {
      push({ kind: 'divider', label: node.divider });
      schedule(() => advance(node.next), node.wait ?? 700);
      return;
    }
    if (node.timeAnchor) {
      // Persist story-time metadata with the transcript so checkpoint
      // restoration can deterministically reconstruct every timestamp.
      push({ kind: 'time-anchor', time: node.timeAnchor, key: node.id });
      schedule(() => advance(node.next), node.wait ?? 0);
      return;
    }
    if (node.tip) {
      const tip = typeof node.tip === 'string' ? { text: node.tip } : node.tip;
      push({ kind: 'tip', text: tip.text, detail: tip.detail, key: node.id });
      setPendingTip({ next: node.next, key: node.id });
      return;
    }
    if (node.custom) {
      push({ kind: node.custom.kind, ...node.custom, key: node.id });
      schedule(() => advance(node.next), node.wait ?? 1400);
      return;
    }
    if (node.video) {
      push({ kind: 'video', ...node.video, key: node.id });
      setPendingVideo({ next: node.next, videoId: node.video.videoId });
      return;
    }
    if (node.image) {
      push({ kind: 'image', ...node.image, key: node.id });
      setPendingImage({ next: node.next });
      return;
    }
    if (node.link) {
      push({ kind: 'link', ...node.link, key: node.id });
      setPendingLink({ next: node.next });
      return;
    }
    if (node.choice) {
      setPendingChoice({ options: node.options });
      return;
    }
    const isDatingLead = (node.from ?? 'datingLead') === 'datingLead';
    if (isDatingLead) {
      setIsTyping(true);
      schedule(() => {
        setIsTyping(false);
        push({ kind: 'msg', from: 'datingLead', text: node.text });
        // 600-1200ms for a short single line, 900-1600ms for a longer or
        // two-line (\n joined) bubble - a bare heuristic on text length
        // rather than per-node tuning across the whole script.
        schedule(() => advance(node.next), node.wait ?? (node.text.length > 14 || node.text.includes('\n') ? 1300 : 900));
      }, node.typingWait ?? 900);
    } else {
      push({ kind: 'msg', from: node.from, text: node.text });
      schedule(() => advance(node.next), node.wait ?? (node.from === 'system' ? 800 : 1200));
    }
  }

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    if (startedRef.current) return;
    startedRef.current = true;
    // Resuming a saved checkpoint (e.g. returning from the investment
    // platform mid-conversation): the timeline was already hydrated from
    // initialTimeline above, so pick up from resumeId instead of replaying
    // the whole script from startId.
    schedule(() => advance(resumeId ?? startId), startDelay);
    return () => {
      timeouts.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(index) {
    if (!pendingChoice) return;
    const opt = pendingChoice.options[index];
    setPendingChoice(null);
    push({ kind: 'msg', from: 'user', text: opt.userText ?? opt.label });
    if (opt.reply) {
      schedule(() => {
        setIsTyping(true);
        schedule(() => {
          setIsTyping(false);
          push({ kind: 'msg', from: 'datingLead', text: opt.reply });
          schedule(
            () => advance(opt.next),
            opt.replyWait ?? (opt.reply.length > 14 || opt.reply.includes('\n') ? 1300 : 900),
          );
        }, opt.typingWait ?? 900);
      }, 500);
    } else {
      schedule(() => advance(opt.next), 500);
    }
  }

  function completeVideo() {
    if (!pendingVideo) return;
    const { next, videoId } = pendingVideo;
    setWatchedVideoIds((prev) => new Set(prev).add(videoId));
    setPendingVideo(null);
    schedule(() => advance(next), 500);
  }

  function completeTip() {
    if (!pendingTip) return;
    const { next } = pendingTip;
    setPendingTip(null);
    schedule(() => advance(next), 300);
  }

  function completeImage() {
    if (!pendingImage) return;
    const { next } = pendingImage;
    setPendingImage(null);
    schedule(() => advance(next), 400);
  }

  // Doesn't advance immediately - the link node stays pending while the
  // player is away on the platform page, and only resolves once whatever
  // navigated away calls this after coming back (see PrivateChat's
  // save/resume-checkpoint flow).
  function completeLink() {
    if (!pendingLink) return;
    const { next } = pendingLink;
    setPendingLink(null);
    schedule(() => advance(next), 400);
  }

  return {
    timeline,
    isTyping,
    pendingChoice,
    choose,
    pendingVideo,
    completeVideo,
    pendingImage,
    completeImage,
    pendingLink,
    completeLink,
    pendingTip,
    completeTip,
    watchedVideoIds,
    done,
    endReason,
  };
}
