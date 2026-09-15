import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { UserRound } from 'lucide-react';
import { useT } from '../i18n';

const SWIPE_THRESHOLD = 110;
const MAX_ROTATE_DEG = 9;
const EXIT_DISTANCE = 560;
const EXIT_MS = 380;

// Full-bleed swipeable profile card: drag via pointer events (mouse + touch,
// no separate handlers needed), or an imperative swipeLike()/swipePass()
// for the bottom action buttons - both funnel through the same exit
// animation so a button tap and a real drag look identical.
export const ProfileCard = forwardRef(function ProfileCard({ person, onSwiped }, ref) {
  const t = useT();
  const [drag, setDrag] = useState({ x: 0, active: false });
  const [exiting, setExiting] = useState(null); // 'like' | 'pass' | null
  const [photoFailed, setPhotoFailed] = useState(false);
  const startXRef = useRef(0);
  const pointerIdRef = useRef(null);
  // A synchronous guard, not state: two clicks/taps landing in the same
  // tick both see `exiting` as its pre-update value (setState is async),
  // which would let both call finishSwipe and schedule two onSwiped calls.
  const processingRef = useRef(false);
  const exitTimerRef = useRef(null);
  const mountedRef = useRef(true);

  // The same ProfileCard instance is reused across people (the host screen
  // usually keeps one instance mounted while `person` changes),
  // so a stale exit/drag/error state from the previous card must not carry
  // over onto the next one.
  useEffect(() => {
    setDrag({ x: 0, active: false });
    setExiting(null);
    setPhotoFailed(false);
    processingRef.current = false;
  }, [person?.id]);

  useEffect(
    () => () => {
      mountedRef.current = false;
      clearTimeout(exitTimerRef.current);
    },
    [],
  );

  function finishSwipe(direction) {
    if (processingRef.current || !person) return;
    processingRef.current = true;
    setExiting(direction);
    setDrag({ x: direction === 'like' ? EXIT_DISTANCE : -EXIT_DISTANCE, active: false });
    exitTimerRef.current = setTimeout(() => {
      if (mountedRef.current) onSwiped?.(direction);
    }, EXIT_MS);
  }

  useImperativeHandle(ref, () => ({
    swipeLike: () => finishSwipe('like'),
    swipePass: () => finishSwipe('pass'),
    get isBusy() {
      return processingRef.current;
    },
  }));

  function onPointerDown(e) {
    if (processingRef.current) return;
    pointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
    setDrag({ x: 0, active: true });
  }

  function onPointerMove(e) {
    if (!drag.active || pointerIdRef.current !== e.pointerId) return;
    setDrag({ x: e.clientX - startXRef.current, active: true });
  }

  function onPointerUp(e) {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    if (drag.x > SWIPE_THRESHOLD) {
      finishSwipe('like');
    } else if (drag.x < -SWIPE_THRESHOLD) {
      finishSwipe('pass');
    } else {
      setDrag({ x: 0, active: false });
    }
  }

  if (!person) return null;

  const rotate = Math.max(-MAX_ROTATE_DEG, Math.min(MAX_ROTATE_DEG, drag.x / 14));
  const stampOpacity = Math.min(1, Math.abs(drag.x) / SWIPE_THRESHOLD);
  const showLikeStamp = exiting === 'like' || drag.x > 12;
  const showPassStamp = exiting === 'pass' || drag.x < -12;

  return (
    <article
      className="meetu-profile-card"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        transform: `translateX(${drag.x}px) rotate(${exiting ? (exiting === 'like' ? MAX_ROTATE_DEG : -MAX_ROTATE_DEG) : rotate}deg)`,
        transition: drag.active ? 'none' : `transform ${exiting ? EXIT_MS : 400}ms cubic-bezier(.34,1.56,.64,1)`,
        opacity: exiting ? 0 : 1,
      }}
    >
      {person.photo && !photoFailed ? (
        <img
          className="meetu-profile-photo"
          src={person.photo}
          alt={person.name}
          onError={() => setPhotoFailed(true)}
        />
      ) : (
        <div className="meetu-profile-photo meetu-profile-photo-fallback">
          <UserRound size={96} strokeWidth={1.2} />
        </div>
      )}
      <div className="meetu-profile-shade" />

      {showLikeStamp && (
        <div className="meetu-stamp like" style={{ opacity: exiting === 'like' ? 1 : stampOpacity }}>{t('喜歡')}</div>
      )}
      {showPassStamp && (
        <div className="meetu-stamp pass" style={{ opacity: exiting === 'pass' ? 1 : stampOpacity }}>{t('略過')}</div>
      )}

      <div className="meetu-profile-info">
        <div className="meetu-profile-name-row">
          <span className="meetu-profile-name">{person.name}</span>
          <span className="meetu-profile-age">{person.age}</span>
        </div>
        <div className="meetu-profile-distance">
          <span className="meetu-online-dot" />
          {person.distance}
        </div>
        <div className="meetu-profile-job">{person.job}</div>
        <p className="meetu-profile-bio">{person.bio}</p>
        <div className="meetu-profile-tags">
          {person.tags.map((tag) => (
            <span className="meetu-profile-tag" key={tag}>{tag}</span>
          ))}
        </div>
      </div>
    </article>
  );
});
