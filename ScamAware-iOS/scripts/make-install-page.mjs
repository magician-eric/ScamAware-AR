#!/usr/bin/env node
/**
 * Builds a self-hosted "tap to install" page for an Ad Hoc IPA (install method B in
 * docs/INSTALL_WINDOWS_IPHONE.md). Runs on Windows with Node only.
 *
 *   node scripts/make-install-page.mjs dist/ios/1.0.0/ScamAware-iOS-v1.0.0-build12.ipa \
 *        https://files.example.com/scamaware-ios/1.0.0/
 *
 * Writes, next to the IPA:
 *   manifest.plist   what iOS reads to find and install the IPA
 *   install.html     a page with one "安裝" link (itms-services://)
 *
 * Upload the IPA, manifest.plist and install.html to that HTTPS folder, then open
 * install.html in Safari on a REGISTERED iPhone. Requirements set by iOS, not by us:
 * the folder must be served over HTTPS with a publicly trusted certificate, and the
 * IPA is still Ad Hoc - it installs only on iPhones in its provisioning profile.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const [ipaPath, baseUrlArg] = process.argv.slice(2)
if (!ipaPath || !baseUrlArg || !/^https:\/\//.test(baseUrlArg)) {
  console.error('usage: make-install-page.mjs <file.ipa> <https://host/folder/>  (must be https)')
  process.exit(2)
}
const baseUrl = baseUrlArg.endsWith('/') ? baseUrlArg : `${baseUrlArg}/`
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const version = JSON.parse(readFileSync(join(root, 'version.json'), 'utf8'))
const ipaName = basename(ipaPath)
const build = ipaName.match(/-build(\d+)\.ipa$/)?.[1] ?? '?'
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>items</key>
  <array>
    <dict>
      <key>assets</key>
      <array>
        <dict>
          <key>kind</key><string>software-package</string>
          <key>url</key><string>${esc(baseUrl + encodeURIComponent(ipaName))}</string>
        </dict>
      </array>
      <key>metadata</key>
      <dict>
        <key>bundle-identifier</key><string>${esc(version.bundleId)}</string>
        <key>bundle-version</key><string>${esc(version.marketingVersion)}</string>
        <key>kind</key><string>software</string>
        <key>title</key><string>反詐AR體驗 (ScamAware-iOS ${esc(version.marketingVersion)})</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>
`

const installUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(`${baseUrl}manifest.plist`)}`
const html = `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>安裝 ScamAware-iOS ${esc(version.marketingVersion)}</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;background:#06162d;color:#fff;margin:0;padding:32px 20px;text-align:center}
a.btn{display:inline-block;margin:24px 0;padding:16px 36px;border-radius:14px;background:#4ad9ff;color:#06162d;font-weight:700;font-size:20px;text-decoration:none}
p{color:#cfe6ff;line-height:1.6;max-width:32em;margin:8px auto}small{color:#8fb3d9}</style></head>
<body>
<h1>反詐AR體驗</h1>
<p>ScamAware-iOS v${esc(version.marketingVersion)}（build ${esc(build)}）<br>公司內部展示用，僅限已登記的 iPhone。</p>
<a class="btn" href="${esc(installUrl)}">安裝</a>
<p>請用 iPhone 的 <b>Safari</b> 開啟本頁。點「安裝」後回到主畫面等待圖示下載完成。</p>
<p><small>若出現「無法安裝」：這支 iPhone 的 UDID 尚未加入描述檔，請聯絡負責人。</small></p>
</body></html>
`

const outDir = dirname(ipaPath)
writeFileSync(join(outDir, 'manifest.plist'), manifest)
writeFileSync(join(outDir, 'install.html'), html)
console.log(`wrote ${join(outDir, 'manifest.plist')} and ${join(outDir, 'install.html')}`)
console.log(`upload ${ipaName}, manifest.plist and install.html to ${baseUrl}`)
