import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const here = dirname(fileURLToPath(import.meta.url))

// GuGo Invest is the one App module written against Tailwind, and Tailwind's
// preflight is a site-wide reset: dropped in as-is it restyles every other
// scenario and App in this webapp (headings lose their size, buttons lose
// their chrome, lists lose their markers). The app's markup all lives under
// a single `.gugo-app` element, so the fix is to re-emit preflight with each
// of its selectors nested under that class.
//
// Generated here rather than committed as an edited copy so it always
// matches the tailwindcss version in package.json - same reasoning, and the
// same git-ignored-output rule, as the brand mirror above. See
// src/apps/gugo-invest/app/styles/index.css.
const PREFLIGHT_DEST = resolve(here, 'src/apps/gugo-invest/app/styles/preflight.generated.css')

// Two of preflight's rules do not survive plain nesting and are rewritten
// instead of wrapped: the `html`/`:host` rule (nested, `.gugo-app html`
// matches nothing) and the universal reset (which has to reach the mount
// element itself, not only its descendants). Both are asserted, so a
// tailwind upgrade that reshapes preflight fails the build loudly rather
// than silently dropping the app's base styles.
const PREFLIGHT_REWRITES = [
  ['html,\n:host {', '& {'],
  ['*,\n::after,\n::before,\n::backdrop,\n::file-selector-button {', '&,\n& *,\n& ::after,\n& ::before,\n& ::backdrop,\n& ::file-selector-button {'],
]

function scopeGugoPreflight() {
  return {
    name: 'cibar-scope-gugo-preflight',
    buildStart() {
      const require = createRequire(import.meta.url)
      let css = readFileSync(require.resolve('tailwindcss/preflight.css'), 'utf8')
      for (const [from, to] of PREFLIGHT_REWRITES) {
        if (!css.includes(from)) {
          throw new Error(`cibar-scope-gugo-preflight: tailwindcss/preflight.css no longer contains "${from.split('\n')[0]}...". Re-check the rewrites in vite.config.js against the installed tailwindcss.`)
        }
        css = css.replace(from, to)
      }
      writeFileSync(
        PREFLIGHT_DEST,
        `/* Generated at build start from tailwindcss/preflight.css - do not edit.\n   See the cibar-scope-gugo-preflight plugin in webapp/vite.config.js. */\n.gugo-app {\n${css}\n}\n`,
      )
    },
  }
}

// The Web Bundle's own identity, baked into the build that carries it.
//
// A built bundle travels on its own - published to Pages, packaged into an offline APK, pushed to
// a device over OTA - and once it has left this repository nothing about it says which release it
// is unless the build wrote that down. release/versions.json is where the version number is
// edited (docs/RELEASE_VERSIONING.md); the full Release ID (`1.0.3-20260825.002`) only exists at
// the moment of a real release, so CI passes it in and a dev/local build honestly says it is not
// a release at all.
const releaseVersions = JSON.parse(
  readFileSync(resolve(here, '../release/versions.json'), 'utf8'),
)
const webBundleRelease = {
  webBundleVersion: releaseVersions.webBundleVersion,
  // Set by .github/workflows/ota-release.yml for a published OTA bundle, and by nothing else.
  releaseId: process.env.CIBAR_RELEASE_ID || `${releaseVersions.webBundleVersion}+dev`,
  gitCommit: (process.env.GITHUB_SHA || '').slice(0, 7),
  minShellVersion: releaseVersions.minShellVersion,
}

// Deployed as a GitHub Pages *project* page at https://ericingptt.github.io/CIBAR/,
// so all built asset URLs need this prefix.
export default defineConfig({
  base: '/CIBAR/',
  plugins: [react(), tailwindcss(), scopeGugoPreflight()],
  // Deliberately not `import.meta.env`: this has to survive into the built bundle as a plain
  // literal that src/lib/releaseInfo.js can read with no build-tool assumptions, because the same
  // module runs inside an offline APK where nothing can be fetched to fill it in later.
  define: {
    __CIBAR_WEB_BUNDLE__: JSON.stringify(webBundleRelease),
  },
})
