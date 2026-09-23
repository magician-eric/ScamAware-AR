#!/usr/bin/env bash
# Moves a signed IPA into dist/ios/<version>/ with the agreed file name and the
# install notes next to it:
#
#   dist/ios/<ver>/ScamAware-iOS-v<ver>-build<N>.ipa
#   dist/ios/<ver>/SHA256SUMS.txt, BUILD_INFO.txt    (written here)
#   dist/ios/<ver>/INSTALL.md, CHANGELOG.md, KNOWN_LIMITATIONS.md
#                                                     (committed in git; must already exist)
#
# usage: scripts/package-ipa.sh <path-to-built.ipa>
# Refuses an IPA that is not Ad Hoc–signed (see verify-ipa.sh), so an unsigned
# or development-signed build can never be named like an installable release.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC_IPA="${1:?usage: package-ipa.sh <built.ipa>}"
VERSION="$(node -e "process.stdout.write(require('./version.json').marketingVersion)")"
BUILD="${BUILD_NUMBER:?BUILD_NUMBER must be set}"
OUT_DIR="dist/ios/${VERSION}"
NAME="ScamAware-iOS-v${VERSION}-build${BUILD}.ipa"

bash scripts/verify-ipa.sh "$SRC_IPA" | tee /tmp/scamaware-verify.txt

for doc in INSTALL.md CHANGELOG.md KNOWN_LIMITATIONS.md; do
  [ -f "$OUT_DIR/$doc" ] || { echo "missing $OUT_DIR/$doc - write the release notes for $VERSION first" >&2; exit 1; }
done
cp "$SRC_IPA" "$OUT_DIR/$NAME"
( cd "$OUT_DIR" && shasum -a 256 "$NAME" > SHA256SUMS.txt )

{
  echo "file:          $NAME"
  echo "version:       $VERSION"
  echo "build:         $BUILD"
  echo "bundle id:     ${BUNDLE_ID:-$(node -e "process.stdout.write(require('./version.json').bundleId)")}"
  echo "commit:        ${CM_COMMIT:-unknown}"
  echo "built at:      $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "xcode:         $(xcodebuild -version 2>/dev/null | tr '\n' ' ')"
  echo
  cat /tmp/scamaware-verify.txt
} > "$OUT_DIR/BUILD_INFO.txt"

echo "packaged: $OUT_DIR/$NAME"
ls -la "$OUT_DIR"
