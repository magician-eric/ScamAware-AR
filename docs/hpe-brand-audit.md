# HPE / 黑皮通 CIS audit

Scope: find the real HPE brand identity, stop the codebase from inventing a
color scheme for it, and fix why `apps/hpe-logistics` didn't visually read as
its own app when reached through Scenario04. No story, state machine, route,
or binary asset changes.

## 1. What the repo actually has

Searching the repo (filenames, `HPE`, `黑皮通`, `hpe-delivery`, `hpe-logo`,
`delivery-icon`) turned up no *currently tracked* logo, icon, or design-spec
file. But git history has two:

- `webapp/src/assets/scenarios/scenario-05/images/hpe-logo-horizontal.webp`
- `webapp/src/assets/scenarios/scenario-05/images/hpe-delivery-icon.webp`

Both were added before PR #175 and deleted in commit `01cc395`
(`refactor(assets): centralize character assets and fix ownership
boundaries`, part of an earlier asset-ownership cleanup on this branch's own
history) with the stated reason "zero consumers" - at that point nothing in
source imported them, so the hash-compare-then-delete protocol that PR
followed correctly flagged them as orphaned. `docs/app-module-architecture-
audit.md` (written around the same time) had already flagged these exact
files as **candidate** assets pending brand confirmation - the deletion
wasn't wrong given the information available then, but it means the one real
reference for HPE's CIS has been out of the working tree since.

Recovered read-only from git history (`git show 01cc395~1:<path>`) and
decoded (they're valid WebP) for this audit:

| File | Size | Content |
| --- | --- | --- |
| `hpe-logo-horizontal.webp` | 480×240 | "HPE" wordmark in a yellow rounded badge with a black arrow glyph, "黑皮通" in black, "HAPPY EXPRESS" tagline |
| `hpe-delivery-icon.webp` | 240×160 | Black delivery-truck silhouette, "HPE" in yellow, "黑皮通宅配" in black |

Sampling the dominant solid-fill pixels of both (Pillow, `Counter` over
non-transparent, non-near-white pixels) gives one consistent pair:

- Yellow/gold: cluster centered on `#FFCC00` (samples: `#FDCC02`, `#FFCB02`,
  `#FECD03`, `#FFCC00`, `#FDCA05`, ...)
- Black ink: `#000000`/near-black (`#010101`, `#020202`, ...)

This is the canonical CIS: **black text/ink on a yellow/gold accent**, white
background. Not green.

## 2. Where `#087f5b` / `#17352d` came from

`webapp/src/apps/hpe-logistics/styles/index.css` did not exist until commit
`043f43d` (`feat: integrate HPE logistics across scenarios 04 and 05`, PR
#214, merged as `2cfe7c6`). That commit introduced the file from scratch:

```css
.hpe-shell{--hpe-green:#087f5b;--hpe-ink:#17352d; ...}
```

There is no reference anywhere in that commit, its PR, or any commit message
to the logo artwork above (which was already deleted from the tree by then)
or to any design spec. The green was originated in that commit with no
supporting source - it is not a rename, not a rebrand, not a value carried
over from anywhere. **`#087f5b`/`#17352d` were invented, not confirmed.**

## 3. Why Scenario04 didn't read as "now inside HPE"

Independent of the wrong color, there was a second, structural bug.
`pages/scenario04/ReturnLogistics.jsx` does call
`useStageClassName('hpe-stage')` and does render `<HpeTrackingScreen>` from
`apps/hpe-logistics` - it is not nested inside BlackPi's `PhoneShell` or
`BottomNav`, and the route (`scenario04-shopping/return-logistics/:route`) is
a flat sibling of every other Scenario04 route, not wrapped in a shared
layout.

The actual problem is CSS. Every other App module that needs a full-bleed
surface defines its own `.ar-stage.<x>-stage{padding:0;overflow:hidden;...}`
rule to cancel `AppShell`'s default `.app` chrome (a dark, blurred, padded
"AR passthrough" card - see `styles/global.css`):

```css
.ar-stage.blackpi-stage{padding:0;overflow:hidden;...}   /* apps/blackpi */
.ar-stage.go-stage{padding:0;overflow:hidden;...}         /* apps/mydondon */
.ar-stage.meetu-stage{padding:0;overflow:hidden;...}
.ar-stage.line-stage{padding:0;overflow:hidden;...}
.ar-stage.bition-stage{padding:0;overflow:hidden;...}
```

`.ar-stage.hpe-stage` had no such rule anywhere in the codebase. So
`ReturnLogistics` rendered `HpeShell` correctly, but inset inside the generic
dark/blurred/padded default chrome instead of full-bleed - which is exactly
what "still feels like it's inside something else" looks like on a real
device, independent of what color the shell itself used.

## 4. What changed

**`apps/hpe-logistics/brand/index.js`** - `HPE_BRAND.colors` now holds the
confirmed values (`yellow: '#FFCC00'`, `ink: '#141414'`, plus a derived
`yellowDeep: '#8A6100'` text-safe shade of the same hue - not a second brand
color, just a WCAG-AA-legible way to use it as text on white; see the file's
own comment for the exact contrast numbers). This is the one place the CIS is
documented, with the provenance trail above.

**`apps/hpe-logistics/styles/index.css`**:
- `--hpe-green`/`--hpe-ink` replaced with `--hpe-yellow` /
  `--hpe-yellow-deep` / `--hpe-yellow-tint` / `--hpe-ink`, hoisted to `:root`
  (previously scoped inside `.hpe-shell`, which is why Scenario05's fake site
  couldn't reference them at all).
- Every `color:#fff` paired with the (now yellow) accent background was
  swapped for `var(--hpe-ink)` - white-on-yellow measures ~1.5:1 contrast,
  which fails outright; ink-on-yellow measures ~12:1.
- Added `.ar-stage.hpe-stage{padding:0;overflow:hidden;background:#fff}`,
  matching the pattern every other App module already uses. This is the fix
  for §3.

**`apps/mydondon/styles/index.css`** (Scenario05's fake-HPE surfaces live
here: `.go-ctx-hpefake`, `.sq-*` for the official-looking `hpe-tw.com` pages,
`.cs-*` for the phishing `service-hpe-tw.com` support site, plus MyDonDon's
own "quoted link card" that previews the (fake) HPE order notice inside a
chat bubble):
- `--sq-green`/`--sq-green-dark` renamed to `--sq-yellow`/`--sq-yellow-deep`
  and pointed at `var(--hpe-yellow)`/`var(--hpe-yellow-deep)` instead of an
  independent hardcoded value - the fake site's brand color is now literally
  defined as "whatever the real HPE app uses", so the two cannot drift again.
  `--sq-tint` now points at `var(--hpe-yellow-tint)` the same way.
- The same `color:#fff`-on-accent-background fix applied to `.sq-masthead`,
  `.sq-btn`, `.md-link-card-icon`, `.md-quoted-card-head` - all of them now
  read black text on the yellow fill, matching the real logo's own lockup.
- `.cs-*` (the phishing support site) was left as-is beyond the rename: it
  stays dark slate with a thin yellow top-border strip "borrowing" the brand
  rather than becoming a second yellow surface - matching the deliberate
  design already documented in that file's own comment ("It borrows 黑皮通's
  brand bar - that is what a phishing site does - but it must never look
  like MyDonDon's messenger").
- Nothing under `.md-*` (MyDonDon's own header/nav/feed/etc.) or `--md-*`
  changed in meaning - the two `.md-link-card-*`/`.md-quoted-card-*` rules
  touched are MyDonDon rendering an external link preview, which by design
  wears the destination's color, not MyDonDon's own.

## 5. What did not change

- No PNG/WebP/SVG/MP4/MP3 added, removed, or modified. The recovered logo
  images used for color sampling were extracted to a scratch directory
  outside the repo for inspection only and were not written back.
- No dialogue, state machine, route, or `apps/blackpi`/`apps/mydondon`
  component logic changed - only CSS custom property values/names and the
  one new full-bleed stage rule.
- `apps/coin-winner`, `apps/gugo-invest`, MeetU, and LINE were not touched.

## 6. Update - the real logo files are back

The repo owner supplied the canonical artwork directly (PNG, pushed straight
to `main`), independently of this audit - not restored from the git-history
copy above, a fresh export. They now live at:

- `webapp/src/apps/hpe-logistics/assets/hpe-logo-horizontal.png` (1774×887)
- `webapp/src/apps/hpe-logistics/assets/hpe-delivery-icon.png` (1536×1024)

Visually identical to what §1 recovered from history: black-and-yellow "HPE"
badge, "黑皮通" in black, "HAPPY EXPRESS" tagline; the truck icon in the same
palette. This confirms the §1 color sampling was reading the real thing, not
a fluke of a since-deleted placeholder.

`apps/hpe-logistics/brand/index.js` now resolves these through
`import.meta.glob` (same pattern as `apps/mydondon/brand/manifest.js`) into
`HPE_BRAND.logos.{horizontal,deliveryIcon}`, and a new `HpeLogo` component
(mirroring `MyDonDonLogo`) renders the real image in `HpeShell`'s header,
replacing the text-only "黑皮通 / HPE" lockup this audit had shipped as an
interim measure. Falls back to plain text if a file is ever missing/renamed.

**Update - optimized.** The repo owner asked for the size/format pass:
threshold the near-white background into a real alpha channel
(unpremultiplied, so no white fringe on non-white surfaces), trim to the
artwork's own bounding box, downscale, re-encode as WebP q92 - the same
mechanical treatment `apps/mydondon/brand/manifest.js`'s own header describes
for MyDonDon's supplied PNGs. 1.7 MB combined → ~95 KB. Verified by
compositing the result onto a checkerboard (the truck's window/wheel-hub
cutouts and the wordmark badge come through clean) and by a preview-server
screenshot inside `HpeShell`'s header. Pixels themselves untouched - not
redrawn, recoloured, or regenerated.

A full audit of every scenario for non-WebP images was explicitly out of
scope for that pass (asked for, then narrowed to just these two files) and
remains open if wanted as a separate, larger change.
