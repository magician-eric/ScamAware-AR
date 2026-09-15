import { useState } from 'react';
import { UserRound } from 'lucide-react';

// The buyer's portrait. The photo comes from whichever pool member was drawn
// for this run (see data/scenario05Characters.js) and is referenced from the
// public folder rather than copied, so there is only ever one file on disk.
// Falls back to a neutral silhouette if the image is missing, same as
// scenario02's ProfileAvatar.
export function BuyerAvatar({ buyer, size = 36, className = '' }) {
  const [failed, setFailed] = useState(false);
  const src = `${import.meta.env.BASE_URL}${buyer.avatarPath}`;
  return (
    <span className={`go-avatar ${className}`} style={{ '--go-avatar-size': `${size}px` }}>
      {!failed ? (
        <img src={src} alt={buyer.name} loading="eager" onError={() => setFailed(true)} />
      ) : (
        <UserRound className="go-avatar-fallback" size={Math.round(size * 0.6)} aria-hidden="true" />
      )}
    </span>
  );
}
