import { useStageClassName } from '../../../shell/StageClassContext';
import { BottomNav } from './BottomNav';

// Every scenario04 screen renders inside this - applies the shared
// .blackpi-stage background class to AppShell's stage element (same pattern
// as MeetU/BITION), then a phone-shaped frame with optional bottom nav.
//
// `nav` is the tab the current screen paints as selected. It is the only thing
// the shell tells the bar, because the bar is scenery: there is no tab
// callback to pass through, and a screen wearing the bar has no way to hand
// one to it. See components/BottomNav.jsx.
export function PhoneShell({ children, nav, className = '' }) {
  useStageClassName('blackpi-stage');
  return (
    <div className={`blackpi-app ${className}`}>
      {children}
      {nav && <BottomNav active={nav} />}
    </div>
  );
}
