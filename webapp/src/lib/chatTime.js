import { useState } from 'react';

// Shared clock + per-message timestamp logic for every LINE-style chat
// (scenario01's LineTeacher, scenario02's PrivateChat, and whatever
// scenario03-05 add later) so date/time/read-receipt behavior only needs to
// be right once, in one place.

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const WEEKDAYS_JP = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// lang is optional so every existing zh caller (scenario01's LineTeacher)
// keeps working unchanged - only callers that pass 'en'/'jp' (scenario02's
// PrivateChat, once the player picks a non-zh language) get the localized
// format.
export function formatDateDivider(date, lang = 'zh') {
  if (lang === 'en') {
    return `${MONTHS_EN[date.getMonth()]} ${date.getDate()} · ${WEEKDAYS_EN[date.getDay()]}`;
  }
  if (lang === 'jp') {
    return `${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS_JP[date.getDay()]}`;
  }
  return `${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS[date.getDay()]}`;
}

export function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Captures "the moment the player opened this chat" once, persisted so a
// refresh mid-conversation doesn't reroll it (message times would otherwise
// jump around on every render/reload) - but a fresh sessionStorage means a
// new tab/session (or, for scenario02, an explicit resetScenario02() call,
// since that sweeps every key sharing its 'cibar-scenario02-' prefix) gets a
// genuinely new "now" next time.
export function useChatClock(storageKey) {
  const [startDate] = useState(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) return new Date(JSON.parse(raw));
    } catch {
      // fall through to a fresh clock
    }
    const now = new Date();
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(now.getTime()));
    } catch {
      // sessionStorage unavailable - clock just won't survive a refresh.
    }
    return now;
  });
  return startDate;
}

const HHMM_RE = /^(\d{1,2}):(\d{2})$/;
const PAUSE_KINDS = new Set(['video', 'image', 'link', 'tip', 'shot']);

// Derives one timestamp per timeline entry, deterministically from the
// entry's position - never from Date.now() at render time - so the same
// timeline always produces the same times regardless of how many times
// React re-renders it. Returns null for entries that shouldn't show their
// own time (date dividers and invisible `time-anchor` metadata).
//
// Rules (deliberately simple, not a real clock simulation):
// - a normal message nudges the clock forward 0-1 minutes
// - right after a video/image/link/tip/shot ("something the player had to
//   stop and interact with"), the next message jumps 2-5 minutes instead
// - a divider resets the dynamic date (startDate + dayOffsets[label])
// - a time-anchor snaps that date to its scripted HH:mm; the next visible
//   entry receives that exact time and later entries advance naturally
// - legacy inline system "HH:mm" entries retain the same anchor behaviour
export function computeTimestamps(timeline, startDate, dayOffsets = {}) {
  const smallBumps = [0, 1, 0, 1, 1];
  const pauseBumps = [2, 3, 4, 5];
  let current = new Date(startDate);
  const baseH = startDate.getHours();
  const baseM = startDate.getMinutes();
  let afterPause = false;
  let justAnchored = false;

  return timeline.map((item, i) => {
    if (item.kind === 'divider') {
      const offset = dayOffsets[item.label] ?? 0;
      current = addDays(startDate, offset);
      current.setHours(baseH, baseM, 0, 0);
      afterPause = false;
      justAnchored = false;
      return null;
    }
    const anchor = item.kind === 'time-anchor' ? item.time : item.from === 'system' ? (item.text || '').trim() : '';
    if (HHMM_RE.test(anchor)) {
      const [, h, m] = HHMM_RE.exec(anchor);
      current = new Date(current);
      current.setHours(Number(h), Number(m), 0, 0);
      afterPause = false;
      justAnchored = true;
      return null;
    }
    if (justAnchored) {
      justAnchored = false;
      afterPause = PAUSE_KINDS.has(item.kind);
      return new Date(current);
    }
    const bump = afterPause ? pauseBumps[i % pauseBumps.length] : smallBumps[i % smallBumps.length];
    current = new Date(current.getTime() + bump * 60000);
    afterPause = PAUSE_KINDS.has(item.kind);
    return new Date(current);
  });
}
