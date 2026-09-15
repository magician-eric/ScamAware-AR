import { useRef, useState } from 'react';
import { ProfileCard } from '../components/ProfileCard';
import { MeetUSwipeActions } from '../components/MeetUSwipeActions';

// The swipe deck: one profile card plus the like / pass controls, with the
// drag-and-button plumbing (busy guard, exit animation) kept inside the app.
// It reports a single decision - 'like' or 'pass' - and knows nothing about
// what the host does with it.
export function MeetUBrowseScreen({ person, onDecision }) {
  const cardRef = useRef(null);
  const [swiping, setSwiping] = useState(false);

  function handleSwiped(direction) {
    setSwiping(false);
    onDecision?.(direction);
  }

  function trigger(method) {
    if (cardRef.current?.isBusy) return;
    setSwiping(true);
    cardRef.current?.[method]();
  }

  return (
    <>
      <div className="meetu-card-area">
        <ProfileCard ref={cardRef} person={person} onSwiped={handleSwiped} />
      </div>
      <MeetUSwipeActions
        disabled={swiping}
        onPass={() => trigger('swipePass')}
        onLike={() => trigger('swipeLike')}
      />
    </>
  );
}
