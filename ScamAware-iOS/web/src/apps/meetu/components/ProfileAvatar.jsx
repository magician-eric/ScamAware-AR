import { useState } from 'react';
import { UserRound } from 'lucide-react';

// Circular avatar for MeetU surfaces: renders the real photo (cropped via
// CSS, not a separately-generated round PNG) and falls back to a neutral
// silhouette icon - never an initial letter - if the image is missing or
// fails to load. `size` sets --avatar-size so all the sizing/shape CSS lives
// in one place (see .profile-avatar in the module stylesheet).
export function ProfileAvatar({ name, src, size = 42, status, className = '' }) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <span
      className={`profile-avatar${className ? ' ' + className : ''}`}
      style={{ '--avatar-size': `${size}px` }}
    >
      {showImage ? (
        <img src={src} alt={name || ''} loading="eager" onError={() => setFailed(true)} />
      ) : (
        <UserRound className="profile-avatar-fallback" size={Math.round(size * 0.6)} aria-hidden="true" />
      )}
      {status && <span className={`profile-avatar-status ${status}`} aria-hidden="true" />}
    </span>
  );
}
