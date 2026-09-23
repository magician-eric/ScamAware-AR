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

// ScamAware-iOS: the version baked into the web content is the iOS app's own
// version (ScamAware-iOS/version.json), never the Android project's
// release/versions.json - this project must build with no reference to any
// file outside ScamAware-iOS/.
const iosVersion = JSON.parse(readFileSync(resolve(here, '../version.json'), 'utf8'))
const iosBundle = {
  iosVersion: iosVersion.marketingVersion,
  // Codemagic sets CM_COMMIT; empty for a local build.
  gitCommit: (process.env.CM_COMMIT || process.env.GITHUB_SHA || '').slice(0, 7),
}

// Served by the iOS app from app://localhost/ (see ios/ScamAwareIOS/BundleSchemeHandler.swift),
// so every asset URL is root-relative. The Android/GitHub Pages build uses
// '/ScamAware-AR/' instead; that difference is why this is a copy and not a shared config.
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), scopeGugoPreflight()],
  define: {
    __SCAMAWARE_IOS_BUNDLE__: JSON.stringify(iosBundle),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // MindAR + TensorFlow.js are large; they are loaded from the local bundle,
    // so the warning is noise.
    chunkSizeWarningLimit: 4000,
  },
})
