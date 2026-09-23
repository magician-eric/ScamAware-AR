// Shared date/time service for the whole system (section 9 of the location-
// init spec). Every scenario's dates/times must be generated dynamically
// from the device's current time - nothing here is ever hardcoded - so a
// player who visits in 2027 or 2030 still sees dates that make sense, and
// the exhibit never "expires".
//
// All formatting is anchored to Asia/Taipei regardless of the device's own
// timezone (the kiosk is physically in Taiwan, and every scenario's content
// - LINE timestamps, case documents, bank receipts - assumes Taiwan local
// time), via Intl.DateTimeFormat's `timeZone` option rather than trying to
// shift Date objects by hand.

const TAIPEI_TZ = 'Asia/Taipei';

export function getCurrentDateTime() {
  return new Date();
}

function taipeiParts(date) {
  const fmt = new Intl.DateTimeFormat('zh-TW', {
    timeZone: TAIPEI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === '24' ? '0' : parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

// e.g. "2026/07/27"
export function formatTaiwanDate(date = new Date()) {
  const { year, month, day } = taipeiParts(date);
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

// e.g. "中華民國115年07月27日" - ROC year = Western year - 1911. Official
// documents spell out the full "中華民國", never the bare "民國".
//
// The ROC calendar itself is part of what makes the fake paperwork read as
// Taiwanese paperwork, so every language keeps the ROC year; only the words
// around it change. English writes it the way Taiwanese agencies do in their
// own English documents ("ROC 115/07/27"); Japanese writes 中華民国 with the
// Japanese form of 国. Leaving the Chinese string in place for all three is
// what put 中華民國115年08月25日 inside an English 公文.
export function formatROCDate(date = new Date(), lang = 'zh') {
  const { year, month, day } = taipeiParts(date);
  const roc = year - 1911;
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  if (lang === 'en') return `ROC ${roc}/${mm}/${dd}`;
  if (lang === 'jp') return `中華民国${roc}年${mm}月${dd}日`;
  return `中華民國${roc}年${mm}月${dd}日`;
}

// e.g. "17:42"
export function formatTaiwanTime(date = new Date()) {
  const { hour, minute } = taipeiParts(date);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// e.g. "2026/07/27 17:42"
export function formatTaiwanDateTime(date = new Date()) {
  return `${formatTaiwanDate(date)} ${formatTaiwanTime(date)}`;
}

export function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Compact sortable stamp for session/case-number generation, e.g. "20260727".
export function formatCompactDate(date = new Date()) {
  const { year, month, day } = taipeiParts(date);
  return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
}

// One per scenarioSession - a stable "session start" timestamp every
// document/message in that run measures itself against (see
// ScenarioSessionFactory), not re-read from Date.now() on every render.
export function generateSessionTimestamp() {
  return new Date().toISOString();
}

// Section 9's device-clock sanity check: flags a clock that's drifted far
// enough to make case/document dates look wrong (more than a year off
// either side of when this code was written, or before 2020 entirely - a
// kiosk's battery-backed clock resetting to a stale factory default is the
// realistic failure mode here). Deliberately generous bounds - this is a
// smoke check for "the RTC battery died", not calendar validation.
const CLOCK_SANITY_MIN_YEAR = 2020;
const CLOCK_SANITY_MAX_YEAR = new Date().getFullYear() + 2;

export function isDeviceClockSuspicious(date = new Date()) {
  const year = date.getFullYear();
  return year < CLOCK_SANITY_MIN_YEAR || year > CLOCK_SANITY_MAX_YEAR;
}

export const DEVICE_CLOCK_WARNING = '裝置日期或時間可能不正確，情境中的案件與文件日期將以此裝置時間產生。';
