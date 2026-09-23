import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { TriangleAlert } from 'lucide-react';
import { getLanguage } from '../../lib/lang';
import './FraudWarningBanner.css';

const THEMES = new Set(['chat', 'invest', 'shopping', 'banking', 'phone']);
const SEVERITIES = new Set(['notice', 'high', 'block']);

// The banner's own name, for the scenes that show one without titling it
// themselves. A shared component's default cannot be a single language: two
// Scenario 01 scenes leave `title` out, and both used to paint 防詐風險提醒
// across an English or Japanese run. A Scenario that passes its own title
// still wins - this is only what the banner calls itself when nobody said.
const DEFAULT_TITLES = { zh: '防詐風險提醒', en: 'Fraud Risk Alert', jp: '詐欺リスク警告' };

/** A presentation-only CIB warning. It deliberately owns no scenario actions. */
export function FraudWarningBanner({
  active,
  theme = 'chat',
  severity = 'notice',
  title,
  body,
  duration = 5000,
  onCollapse,
  placement,
  collapseToPill = false,
  inline = false,
}) {
  const [visible, setVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      setCollapsed(false);
      return undefined;
    }
    setVisible(true);
    // An inline banner occupies real layout space instead of floating over
    // the screen, so it can never grow into the thing it is warning about -
    // which also means there is nothing to time out of the way. It stays put
    // for as long as its host scene keeps it `active`.
    if (inline) return undefined;
    const timer = window.setTimeout(() => {
      if (collapseToPill) setCollapsed(true);
      else setVisible(false);
      onCollapse?.();
    }, Math.max(0, duration));
    return () => window.clearTimeout(timer);
  }, [active, duration, onCollapse, collapseToPill, inline]);

  if (!active || !visible || typeof document === 'undefined') return null;
  const heading = title ?? (DEFAULT_TITLES[getLanguage()] ?? DEFAULT_TITLES.zh);
  const safeTheme = THEMES.has(theme) ? theme : 'chat';
  const safeSeverity = SEVERITIES.has(severity) ? severity : 'notice';

  const banner = (
    <div className={inline ? 'fraud-warning-inline' : `fraud-warning-layer${placement ? ` fraud-warning-placement-${placement}` : ''}`}>
      <aside
        className={`fraud-warning-banner fraud-warning-theme-${safeTheme} fraud-warning-severity-${safeSeverity}${collapsed ? ' fraud-warning-collapsed' : ''}`}
        role="status"
        aria-live={safeSeverity === 'notice' ? 'polite' : 'assertive'}
        aria-atomic="true"
      >
        <span className="fraud-warning-icon" aria-hidden="true"><TriangleAlert size={22} /></span>
        <span className="fraud-warning-copy">
          <strong>{heading}</strong>
          {!collapsed && <span className="fraud-warning-body">{body}</span>}
        </span>
      </aside>
    </div>
  );

  // Portalled to <body> by default so a fixed overlay is never clipped by an
  // ancestor's transform/overflow. `inline` opts out of the portal entirely:
  // the banner renders where the caller placed it, in normal flow, for
  // scenes whose primary action sits close enough to the banner that a
  // floating layer would cover it (see scenario03's LINE add-friend screen).
  return inline ? banner : createPortal(banner, document.body);
}
