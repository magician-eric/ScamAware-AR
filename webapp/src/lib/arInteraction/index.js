// AR Interaction Contract - public surface.
//
// Screens import `useARInteraction` and nothing else.
//
// Input sources do not import from here at all: a Gesture Input Adapter
// talks to the Gesture Bridge (./gestureBridge.js), which is the only caller
// of `performARInteraction*` in the app. Nothing on either side ever reaches
// into the DOM or into a scenario.
export {
  AR_GESTURES,
  AR_INTERACTION_MODES,
  AR_MAX_ACTIONS,
  getCurrentARInteraction,
  performARInteraction,
  performARInteractionWithResult,
  registerARInteraction,
  releaseARInteraction,
  resetARInteractionContract,
  validateARInteraction,
} from './interactionContract';
export { useARInteraction } from './useARInteraction';
export {
  AR_GESTURE,
  AR_GESTURE_OUTCOMES,
  AR_GESTURE_REJECTIONS,
  dispatchARGesture,
  getARGestureSnapshot,
  resetARGestureBridge,
  subscribeARGestureDispatch,
} from './gestureBridge';
