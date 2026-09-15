// A full-screen MeetU notice inside the app shell: optional icon or media
// (an avatar), a title, an optional meta line, body lines, and up to two
// buttons. The app owns the layout; every string and every action comes from
// the caller, because what the notice says and where its buttons lead is
// story, not app.
export function MeetUInterstitial({
  icon,
  media,
  title,
  meta,
  lines = [],
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  splitActions = false,
}) {
  return (
    <div className="meetu-interstitial">
      {icon}
      {media}
      <h2>{title}</h2>
      {meta && <p className="meetu-interstitial-meta">{meta}</p>}
      {lines.map((line, i) => <p key={i}>{line}</p>)}
      <div className={`meetu-interstitial-actions${splitActions ? ' meetu-interstitial-actions-split' : ''}`}>
        {primaryLabel && (
          <button type="button" className="meetu-primary-btn" onClick={onPrimary}>{primaryLabel}</button>
        )}
        {secondaryLabel && (
          <button type="button" className="meetu-secondary-btn" onClick={onSecondary}>{secondaryLabel}</button>
        )}
      </div>
    </div>
  );
}
