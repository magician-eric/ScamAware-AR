// Renders the fake police caller-ID number (session.fakePhoneNumber, see
// lib/session/ScenarioSessionFactory.js) with its embedded "165" - the real
// Anti-Fraud Hotline number - called out visually: bold and noticeably
// larger than the surrounding digits. The number always contains "165" as
// three consecutive digits (never split across a dash), so a plain
// substring search is enough to find it; if it's ever missing (shouldn't
// happen) this just renders the plain number.
export function PhoneNumberDisplay({ number, className }) {
  if (!number) return null;
  const idx = number.indexOf('165');
  if (idx === -1) return <span className={className}>{number}</span>;
  return (
    <span className={className}>
      {number.slice(0, idx)}
      <b className="pol-phone-165">165</b>
      {number.slice(idx + 3)}
    </span>
  );
}

// For strings that already have the number composed into a full sentence
// (e.g. i18n's smsFromMeLabel(num) -> "你傳送給 02-1653-2660") - splits the
// finished sentence around the literal number substring so the same "165"
// highlight still applies without needing a second, JSX-only phrasing of
// every such label.
export function TextWithHighlightedPhone({ text, number, className }) {
  if (!number || !text.includes(number)) return <span className={className}>{text}</span>;
  const [before, after] = text.split(number);
  return (
    <span className={className}>
      {before}
      <PhoneNumberDisplay number={number} />
      {after}
    </span>
  );
}
