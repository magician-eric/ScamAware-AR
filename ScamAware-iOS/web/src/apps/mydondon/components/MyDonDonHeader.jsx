import { Bell, Search } from 'lucide-react';
import { MyDonDonLogo } from './MyDonDonLogo';

// MyDonDon's in-app top bar: white surface, brand logo on the left, search +
// notifications on the right, nothing else (spec section 10). It exists ONLY
// inside the MyDonDon app context - the 黑皮通 website, the fake support site,
// the bank screen and the CIBAR result screens each render their own chrome
// and must never mount this.
//
// The two icons are decorative in this scenario (there is no search or
// notification centre to open). They deliberately use non-interactive spans:
// disabled-looking buttons would still expose button semantics and a tab stop.
export function MyDonDonHeader({ unread = 0 }) {
  return (
    <header className="md-header">
      {/* The supplied horizontal lockup already contains both "MyDonDon" and
          「買東東」, so the header carries no brand text of its own (spec
          section 9). 28px keeps the two-line lockup readable next to the
          20px action icons. */}
      <MyDonDonLogo variant="horizontal" height={28} />
      <div className="md-header-actions">
        <span className="md-icon-btn md-icon-display" aria-hidden="true">
          <Search size={20} />
        </span>
        <span className="md-icon-btn md-icon-display" aria-hidden="true">
          <Bell size={20} />
          {unread > 0 && <span className="md-dot" aria-hidden="true" />}
        </span>
      </div>
    </header>
  );
}
