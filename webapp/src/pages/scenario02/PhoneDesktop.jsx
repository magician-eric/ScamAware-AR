import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStageClassName } from '../../shell/StageClassContext';
import { MeetUHomeScreenTile } from '../../apps/meetu';
import { useARInteraction } from '../../lib/arInteraction';

const NEXT_ROUTE = '/scenario02-romance/app-landing';
const AUTO_OPEN_MS = 1800;

// A plain phone home screen with exactly one app on it - so the player's
// first "action" mirrors a real victim's: they don't choose to open a
// dating app among many, the story hands it to them. Auto-opens itself
// (same one-automatic-transition pattern as scenario03's PhoneHome) rather
// than waiting for a tap, since there's nothing else on this screen to tap.
export function PhoneDesktop() {
  useStageClassName('meetu-stage');
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    const openTimer = setTimeout(() => setOpening(true), AUTO_OPEN_MS);
    return () => clearTimeout(openTimer);
  }, []);

  useEffect(() => {
    if (!opening) return undefined;
    const navTimer = setTimeout(() => navigate(NEXT_ROUTE), 380);
    return () => clearTimeout(navTimer);
  }, [opening, navigate]);

  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // AR Interaction Contract: this desktop opens MeetU by itself after a beat,
  // so there is nothing for the player to do here - `display`. The app tile is
  // scenery, not a story control.
  useARInteraction({ mode: 'display', surfaceId: 'scenario02/phone-desktop' });

  return <MeetUHomeScreenTile clock={time} opening={opening} />;
}
