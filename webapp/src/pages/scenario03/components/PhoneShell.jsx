import { formatTaiwanTime } from '../../../lib/dateTimeService';
import './PhoneShell.css';

// Scenario 03's "physical device" shell: viewport geometry, an OS-level
// status bar, safe-area handling, and a home-indicator strip. It owns
// nothing about what app is running inside it - no header, no branding, no
// navigation, no theme colour beyond a plain light/dark toggle - so every
// Scenario 03 screen that simulates the PLAYER'S OWN phone (as opposed to
// looking at someone else's device, which is what the framed
// "phone-in-hand" mockups like blackpi/mydondon's own PhoneShell components
// render) goes through one OS-chrome implementation instead of each screen
// reinventing a status bar and home indicator with slightly different
// geometry.
//
// It used to sit in components/ui/ as if it were a shared primitive, but
// PoliceFrame.jsx next door has always been its only consumer, so it lives
// with its owner now (spec section 13 AD-07). Nothing about the component
// changed in that move: a second scenario that genuinely needs this exact
// OS chrome is what would promote it back to the shared layer, not the
// directory it happens to be filed under today.
//
// `overlay` is a free slot rendered as a direct child of the shell (so
// `position:absolute` content in it anchors to the shell's own edges) -
// the shell has no opinion about what goes there; a consumer's own tools
// menu, a debug panel, whatever. `systemChrome`/`homeIndicator` let a
// consumer suppress either piece entirely for a screen that doesn't want
// them (e.g. a full-bleed lock screen).
export function PhoneShell({
  dark = false,
  statusTitle,
  systemChrome = true,
  homeIndicator = true,
  overlay,
  className = '',
  children,
}) {
  return (
    <div className={`phone-shell${dark ? ' phone-shell-dark' : ''}${className ? ` ${className}` : ''}`}>
      {systemChrome && (
        <div className="phone-shell-statusbar">
          <span>{formatTaiwanTime(new Date())}</span>
          <span className="phone-shell-statusbar-title">{statusTitle ?? ''}</span>
          <span className="phone-shell-statusbar-icons">5G ▮▮▯ 86%</span>
        </div>
      )}
      <div className="phone-shell-body">{children}</div>
      {homeIndicator && <div className="phone-shell-home-indicator" />}
      {overlay}
    </div>
  );
}
