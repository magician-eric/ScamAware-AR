// Whether the 佐臻 AR glasses are plugged into the phone this page runs on.
//
// The APK Shell (Shell 1.2.3 and later) enumerates USB at launch and on every
// plug and unplug, and publishes the answer as
//
//   window.__cibarGlasses = { version: 1, connected, camera, tof }
//
// with a `cibarGlassesChange` event (android/.../WebLayerController.java,
// glassesDescriptorScript). The page uses it to choose between two flows:
//
//   glasses plugged in    language -> gesture tutorial -> scan with the glasses camera
//   no glasses           language -> scan with the phone's own camera
//
// Three answers, not two, because an older Shell says nothing at all. A Shell
// that does not report is treated as one with glasses: that is the flow every
// such Shell has always had, and guessing "no glasses" there would skip the
// gesture tutorial on the very glasses it was built for. A plain browser can
// have no glasses attached, so it takes the phone-camera flow.

export const GLASSES_GLOBAL = '__cibarGlasses';
export const GLASSES_CHANGE_EVENT = 'cibarGlassesChange';

export const GLASSES_PRESENCE = Object.freeze({
  CONNECTED: 'connected',
  ABSENT: 'absent',
  UNKNOWN: 'unknown',
});

const SHELL_GLOBAL = '__cibarShell';

export function readGlassesPresence(scope = globalThis) {
  const reported = scope?.[GLASSES_GLOBAL];
  if (reported && typeof reported === 'object' && typeof reported.connected === 'boolean') {
    return reported.connected ? GLASSES_PRESENCE.CONNECTED : GLASSES_PRESENCE.ABSENT;
  }
  if (scope?.[SHELL_GLOBAL]) return GLASSES_PRESENCE.UNKNOWN;
  return GLASSES_PRESENCE.ABSENT;
}

/** True only when it is known that no glasses are plugged in (or there is no Shell at all). */
export function areGlassesAbsent(scope = globalThis) {
  return readGlassesPresence(scope) === GLASSES_PRESENCE.ABSENT;
}
