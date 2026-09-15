import { useEffect } from 'react';
import { useStageClassName } from '../../../shell/StageClassContext';
import { getScenario03Steps } from '../../../data/scenario03Config';
import { markStepReached } from '../../../lib/scenario03Store';
import { PhoneShell } from './PhoneShell';

// The one class that makes the device look like it is buzzing on a table.
// It lives here, on the frame, because that is what actually shakes: the
// whole phone, not the call layout inside it. Every ring screen in this
// scenario (the first unknown call, the prosecutor's call, the officer's
// callback) turns it on through `ringing` instead of writing its own
// animation, so all three vibrate identically and none of them can drift.
// styles/scenario03.css declares the keyframes and switches the animation
// off under prefers-reduced-motion.
export const INCOMING_CALL_SHAKE_CLASS = 'pol-frame-ringing';

// The player-facing frame is a thin scenario03 adapter over PhoneShell.jsx
// (next to this file - Scenario 03 owns both halves since AD-07; PoliceFrame
// is and has always been the shell's only consumer). Scenario03 uses only
// the shell's viewport geometry: its app screens
// already provide all appropriate UI, so OS chrome and developer tools are
// intentionally absent. The adapter also records reached steps for the
// ending recap; it does not render progress or controls of its own.
//
// `systemChrome` is the one exception, and it is off everywhere but the lock
// screen: a locked phone that shows no signal/battery row does not read as a
// phone at all, while every screen after it is an app filling the display.
//
// `ringing` is on only while a call is actually ringing - never once it has
// been answered, and never after it has ended - which is what keeps the
// buzzing from outliving the call that caused it.
export function PoliceFrame({
  stepKey,
  dark = false,
  statusTitle,
  systemChrome = false,
  ringing = false,
  children,
  className = '',
}) {
  useStageClassName('police-stage');
  const stepIndex = getScenario03Steps().findIndex((s) => s.key === stepKey);

  useEffect(() => {
    if (stepIndex >= 0) markStepReached(stepKey, stepIndex);
  }, [stepKey, stepIndex]);

  const frameClassName = [className, ringing ? INCOMING_CALL_SHAKE_CLASS : '']
    .filter(Boolean)
    .join(' ');

  return (
    <PhoneShell
      dark={dark}
      statusTitle={statusTitle}
      systemChrome={systemChrome}
      homeIndicator={false}
      className={frameClassName}
    >
      {children}
    </PhoneShell>
  );
}
