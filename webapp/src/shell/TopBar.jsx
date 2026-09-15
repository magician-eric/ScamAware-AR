import { Link } from 'react-router-dom';

// Shared .topbar/.brand/.home-link pattern used by most pages. Not every page
// has one (e.g. the LINE chat pages use their own .line-header instead), so
// this is opt-in per page rather than baked into AppShell. The home-link
// itself is also opt-in (only rendered when homeLabel is passed) - the
// GuGo Invest-branded pages (Profit/WithdrawFail) omit it since a live
// trading platform wouldn't offer a one-tap escape back to the app's own
// menu.
export function TopBar({ brand, homeHref = '/language', homeLabel }) {
  return (
    <div className="topbar">
      <div className="brand">{brand}</div>
      {homeLabel && <Link className="home-link" to={homeHref}>{homeLabel}</Link>}
    </div>
  );
}
