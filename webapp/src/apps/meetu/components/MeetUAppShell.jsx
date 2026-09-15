import { MeetUHeader } from './MeetUHeader';
import { MeetUBottomNav } from './MeetUBottomNav';

// The MeetU app frame: phone-sized surface + header + bottom nav, with the
// screen content in between. Every in-app screen renders through this instead
// of repeating the chrome markup, so the app's visual identity is defined in
// exactly one place.
export function MeetUAppShell({ children, blurred = false, activeTab = 'cards' }) {
  return (
    <div className={`meetu-app${blurred ? ' meetu-app-blurred' : ''}`}>
      <MeetUHeader />
      {children}
      <MeetUBottomNav active={activeTab} />
    </div>
  );
}
