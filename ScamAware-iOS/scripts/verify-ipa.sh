#!/usr/bin/env bash
# Checks that an .ipa really is installable on registered iPhones (macOS only):
#   * the app is code-signed and the signature verifies,
#   * it embeds an Ad Hoc provisioning profile (ProvisionedDevices present,
#     not a development profile: get-task-allow is false),
#   * it lists how many devices the profile covers and when it expires.
# Exits non-zero otherwise, so CI can never ship an unsigned build as an IPA.
set -euo pipefail
IPA="${1:?usage: verify-ipa.sh <file.ipa>}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

unzip -q "$IPA" -d "$WORK"
APP="$(find "$WORK/Payload" -maxdepth 1 -name '*.app' | head -n1)"
[ -n "$APP" ] || { echo "FAIL: no Payload/*.app in $IPA" >&2; exit 1; }

codesign --verify --deep --strict "$APP" || { echo "FAIL: code signature does not verify" >&2; exit 1; }
echo "signature:     OK"
codesign -dv "$APP" 2>&1 | grep -E '^(Identifier|TeamIdentifier|Authority)=' | head -n4

PROFILE="$APP/embedded.mobileprovision"
[ -f "$PROFILE" ] || { echo "FAIL: no embedded.mobileprovision (unsigned build?)" >&2; exit 1; }
security cms -D -i "$PROFILE" > "$WORK/profile.plist"

pb() { /usr/libexec/PlistBuddy -c "Print :$1" "$WORK/profile.plist" 2>/dev/null || true; }
DEVICES="$(pb ProvisionedDevices | grep -cE '^[[:space:]]+[0-9A-Fa-f-]{25,}$' || true)"
TASK_ALLOW="$(pb Entitlements:get-task-allow)"
ALL_DEVICES="$(pb ProvisionsAllDevices)"

echo "profile:       $(pb Name)"
echo "team:          $(pb TeamName) ($(pb TeamIdentifier:0))"
echo "expires:       $(pb ExpirationDate)"
echo "devices:       ${DEVICES}"

if [ "$ALL_DEVICES" = "true" ]; then
  echo "FAIL: this is an Enterprise (in-house) profile, not Ad Hoc" >&2; exit 1
fi
if [ "$TASK_ALLOW" = "true" ]; then
  echo "FAIL: development-signed (get-task-allow=true), not Ad Hoc" >&2; exit 1
fi
if [ "${DEVICES:-0}" -lt 1 ]; then
  echo "FAIL: profile lists no devices - register iPhone UDIDs first" >&2; exit 1
fi
echo "distribution:  Ad Hoc - installs only on the ${DEVICES} registered device(s)"
