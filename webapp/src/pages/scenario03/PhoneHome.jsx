import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { PoliceFrame } from './components/PoliceFrame';
import { getOrCreateScenarioSession } from '../../lib/session/ScenarioSessionFactory';
import { usePaceMultiplier } from '../../lib/scenario03Store';
import { formatTaiwanDate, formatTaiwanTime } from '../../lib/dateTimeService';
import { useARInteraction } from '../../lib/arInteraction';

// Scene 01 - 鎖定畫面. The run opens on a phone lying there locked, and a
// few seconds later a call comes in. That is the whole scene.
//
// It used to be a home screen: eight app icons, and a line of narration
// under them reading 「這是一支手機，接下來會有一通電話打進來。」 Both are
// gone. The sentence told the player something the picture already says, and
// the icons offered a choice that was not one - every icon, and a timeout,
// led to the same incoming call. What is left is what a locked phone
// actually shows: the time, the date, a wallpaper and the status row.
//
// Nothing here is tappable, and nothing may become tappable: the player is
// looking at a phone, not operating one. The single visit this screen now
// gets is that opening beat - the later 「回到桌面，打開網路銀行 App」 return
// visit is gone with the desktop, because the officer sends a link in LINE
// now and the bank is a website opened from that link (BankSite.jsx), not an
// app the player is supposed to own.
export function PhoneHome() {
  const navigate = useNavigate();
  const pace = usePaceMultiplier();
  // Mints the run's session as early as possible (before any later scene
  // reads it) - the lock screen itself displays nothing from it.
  useState(() => getOrCreateScenarioSession());

  useEffect(() => {
    const timer = window.setTimeout(() => navigate('/scenario03-police/call'), 2600 * pace);
    return () => window.clearTimeout(timer);
  }, [pace, navigate]);

  // AR Interaction Contract: `display`. The phone rings by itself, and there
  // is nothing on the lock screen to press - not an unlock, not an icon, not
  // a "continue". A gesture must not be able to skip the wait either: the
  // pause before the call is part of the beat.
  useARInteraction({ mode: 'display', surfaceId: 'scenario03/phone-home' });

  // Taiwan time, the same clock PhoneShell's status bar prints - a lock
  // screen whose big clock disagrees with the status row above it is the one
  // thing on this screen a player can catch as wrong.
  const now = new Date();

  return (
    <PoliceFrame stepKey="phone-home" dark systemChrome>
      <div className="pol-lock">
        <div className="pol-lock-clock">
          <span className="pol-lock-glyph" aria-hidden="true"><Lock size={13} /></span>
          <strong>{formatTaiwanTime(now)}</strong>
          <span>{formatTaiwanDate(now)}</span>
        </div>
      </div>
    </PoliceFrame>
  );
}
