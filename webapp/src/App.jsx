import { useRoutes } from 'react-router-dom';
import { routes } from './routes';
import { NativeGestureBridge } from './components/native/NativeGestureBridge.jsx';
import { ARGestureDebugOverlay } from './components/debug/ARGestureDebugOverlay.jsx';

// Both gesture mounts below are siblings of the routed screen, never wrappers
// around it: neither adds layout, context or styling to the app, and both
// render `null` in the tree that a player sees.
//
//   NativeGestureBridge     production. The one binding between the 佐臻
//                           glasses' real LEFT / RIGHT and the AR Interaction
//                           Contract, for every screen except the gesture
//                           tutorial (which consumes the same events itself).
//                           See components/native/NativeGestureBridge.jsx.
//
//   ARGestureDebugOverlay   DEV only. Renders nothing at all unless
//                           VITE_AR_GESTURE_DEBUG=true (see
//                           lib/arInteraction/debug/gestureDebugFlag.js); in a
//                           production build it is an immediate `return null`
//                           and the DEV keyboard adapter is never started.
export function App() {
  const element = useRoutes(routes);
  return (
    <>
      {element}
      <NativeGestureBridge />
      <ARGestureDebugOverlay />
    </>
  );
}
