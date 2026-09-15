import { UserRound } from 'lucide-react';
import { MeetULogo } from './MeetULogo';
import { useT } from '../i18n';

// Match celebration overlay - deliberately restrained: no "It's a Match!",
// no forced sound, no confetti. Blurred backdrop over whatever screen
// triggered it, staggered fade/scale-in, button appears last.
//
// The same overlay serves every match; `subtitle` is supplied by the caller
// (already localized) so the app never has to know which person was liked or
// what that means for the story.
export function MatchOverlay({ person, subtitle, onStart }) {
  const t = useT();
  return (
    <div className="meetu-match-overlay">
      <div className="meetu-match-avatars">
        <span className="meetu-match-avatar you">
          <UserRound size={40} strokeWidth={1.4} />
        </span>
        <span className="meetu-match-avatar person">
          {person.photo ? (
            <img src={person.photo} alt={person.name} />
          ) : (
            <UserRound size={40} strokeWidth={1.4} />
          )}
        </span>
      </div>
      <div className="meetu-match-wordmark"><MeetULogo size={30} variant="matchSuccess" /></div>
      <div className="meetu-match-title">{t('配對成功')}</div>
      <p className="meetu-match-sub">{subtitle}</p>
      <button type="button" className="meetu-match-btn" onClick={onStart}>{t('開始聊天')}</button>
    </div>
  );
}
