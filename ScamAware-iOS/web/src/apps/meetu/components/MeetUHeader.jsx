import { MessageCircle, UserRound } from 'lucide-react';
import { MeetULogo } from './MeetULogo';

export function MeetUHeader() {
  return (
    <header className="meetu-header">
      <MeetULogo size={24} variant="compact" />
      <div className="meetu-header-icons">
        <span className="meetu-icon-btn" aria-hidden="true">
          <MessageCircle size={23} />
        </span>
        <span className="meetu-icon-btn" aria-hidden="true">
          <UserRound size={23} />
        </span>
      </div>
    </header>
  );
}
