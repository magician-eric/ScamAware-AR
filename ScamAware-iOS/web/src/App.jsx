import { useRoutes } from 'react-router-dom';
import { routes } from './routes';

// ScamAware-iOS: every input is a tap on the iPhone's own screen.
//
// The Android build mounts two gesture siblings here - NativeGestureBridge
// (the 佐臻 glasses' ToF LEFT / RIGHT waves) and the DEV-only
// ARGestureDebugOverlay. Neither exists on iOS: there are no glasses, no ToF
// sensor and no gesture input of any kind, so both files were left out of this
// copy entirely rather than disabled behind a flag.
export function App() {
  return useRoutes(routes);
}
