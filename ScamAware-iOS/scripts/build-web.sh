#!/usr/bin/env bash
# Builds the bundled web experience and copies it into the Xcode project.
#
#   web/  --npm ci + vite build-->  web/dist  --checks-->  ios/www  (bundled into the .app)
#
# Runs the same on Windows (Git Bash / WSL), Linux and the Codemagic Mac.
# Needs Node.js 20+ only; no Xcode.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> npm ci (web/)"
( cd web && npm ci --no-audit --no-fund )

echo "==> vite build"
( cd web && npm run build )

echo "==> static checks: iOS port rules"
node scripts/check-ios-port.mjs

echo "==> offline check: nothing in the bundle loads from the network"
node scripts/check-offline-bundle.mjs web/dist

echo "==> copy web/dist -> ios/www"
rm -rf ios/www
mkdir -p ios/www
cp -R web/dist/. ios/www/

du -sh ios/www
echo "web bundle ready"
