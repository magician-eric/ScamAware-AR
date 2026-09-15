# Asset architecture

Where every kind of asset in this repo lives, who owns it, and what is
forbidden. If you are adding a file and are not sure where it goes, the
decision table at the bottom answers it in one step.

---

## 1. Canonical asset roots

There are exactly five places a tracked asset may live — the four below plus an
App module's own `assets/`. Everything else that looks like an asset root is
generated output.

| Root | Holds | Reached by |
| --- | --- | --- |
| `webapp/public/assets/shared/` | Assets used by **more than one** scenario or screen: `characters/`, `ui/`, `ar/` | Runtime URL, `` `${import.meta.env.BASE_URL}assets/shared/…` `` |
| `webapp/public/assets/scenarios/scenario-0N/` | Story media belonging to **one** scenario, split by kind — see §6 | Runtime URL, `` `${import.meta.env.BASE_URL}assets/scenarios/…` `` |
| `webapp/public/icons/` | The app's own PWA/favicon set, referenced by `manifest.json` and `index.html` | Absolute URL from `index.html` / `manifest.json` |
| `webapp/src/assets/` | Assets **imported by JS**, so Vite hashes and fingerprints them | `import x from '../assets/…'`, `import.meta.glob` |

There is **no `shared/brand/`**. Brand artwork is owned by the App module that
*is* that brand, under `webapp/src/apps/<app>/assets/`, imported the same way as
`webapp/src/assets/` — see §5. That is the fifth root, and the one every brand
mark in this repo actually lives in.

Plus one non-shipping root:

| Root | Holds |
| --- | --- |
| `webapp/asset-sources/` | Original masters that shipped assets were derived from. Never served, never bundled. |

### Not asset roots

These exist and must never be edited or referenced from source:

- **`/assets`, `/icons`, `/data`, `/index.html`, `/manifest.json`, `/sw.js` at
  the repo root** — the deployed site, republished on every push to `main` by
  `.github/workflows/deploy-pages.yml`. GitHub Pages serves this repo's root
  directly, which is why the build output is committed here at all; the
  workflow wipes and rewrites these paths each run. Editing them is always
  lost, and referencing them from source would make build output a source of
  truth.

  They **stay tracked**. Deployment depends on it — do not delete them, do not
  add them to `.gitignore`, and do not "deduplicate" a source asset by pointing
  at its published copy. Tracked build output and a source root are different
  things that happen to hold similar bytes; only one of them is editable.
- **`webapp/dist/`** — untracked local build output.

  There used to be two more entries here, both belonging to GuGo Invest when
  it was a second Vite app at `gugo-invest/`: its own `dist/`, and
  `webapp/public/assets/shared/brand/gugo-invest/`, which a build plugin
  mirrored from its `public/logos/` so scenario01 could reach the same artwork
  by URL. GuGo is an App module inside webapp now
  (`webapp/src/apps/gugo-invest/`), owning its artwork directly, so the second
  app, the mirror and the plugin are all gone. The stale copy still committed
  under the repo root's `assets/` is deployed output like everything else
  there — the deploy workflow rewrites that tree from the build each run.

**Rule: build output is never a source of truth.** No source file may
reference a path under any of the above.

---

## 2. Ownership rules

| Asset kind | Owner | Location |
| --- | --- | --- |
| Character asset | Shared Character Registry | `public/assets/shared/characters/<visualId>/` |
| Shared UI asset | The app shell | `public/assets/shared/ui/` |
| AR image-target dataset | The app shell | `public/assets/shared/ar/` (compiled from `asset-sources/shared/ar/image-targets/`; see [`ar-image-recognition.md`](ar-image-recognition.md)) |
| Shared app brand asset | The app module that *is* that brand | `src/apps/<app>/assets/` (see §5) |
| Scenario story asset | That one scenario | `public/assets/scenarios/scenario-0N/<kind>/` (see §6) |
| Audio / video | Same rule as the image it belongs with — a character's clips are character assets, a scenario's dialogue lines are scenario assets | — |
| Source-only master | — | `webapp/asset-sources/` |
| Build / deployment output | The build | never committed as source, never referenced |

An asset has exactly **one** owner and exactly **one** tracked copy. A new
canonical asset and its old copy must never both exist — the migration is not
finished until the old one is deleted and its consumers are updated.

---

## 3. `public/` vs `src/assets/`

Both ship. They differ in *how* the URL is produced, and that is the whole
decision:

**Use `webapp/src/assets/`** when the file is imported by JavaScript:

```js
import tabletPhoto from '../assets/tablet.webp';   // apps/mydondon/data/catalog.js
```

Vite hashes the filename (`tablet-C9jvlVbl.webp`), so it is cache-bustable and
immutably cacheable, and an import that no longer resolves **fails the build**.
Prefer this for anything a component references directly. Its cost: the path is
fixed at build time, so it cannot be composed from a runtime value.

**Use `webapp/public/assets/`** when the URL is built at runtime from data —
a character's visual ID, the player's language, a scenario ID:

```js
const src = `${import.meta.env.BASE_URL}assets/shared/characters/${visualId}/avatar.webp`;
```

The file is copied verbatim, keeps its name, and is not hashed. That is what
the character registry, the per-scenario audio, and the result mascots need,
because none of them knows at build time which file it will ask for. Its cost:
nothing verifies the path — a typo is a 404 at runtime, not a build error, so
public paths must be produced in **one** place per family (a registry or a
`base()` helper), never spelled out at each call site.

Never put a file in both. If something is imported *and* fetched by URL, it
belongs in `src/assets/` and the URL-based consumer should be changed to take
the imported value.

---

## 4. Character asset rule

**All character media is centralized under
`public/assets/shared/characters/<visualId>/`, one folder per visual, named
after that visual's ID in `src/experience/characters/visuals.js`.**

- Scenarios never name a character's file. They ask the registry for a visual
  ID and receive a URL (`getVisualAssetUrl`, `getVisual().assets`).
- Everything a character owns — avatar, profile photo, chat photos, video
  clips — lives in their folder. Media does not stay behind in the scenario
  where it first appeared.
- Adding character media means adding the file **and** an entry in that
  visual's `assets`. A file no entry points at is dead and should be deleted.

This is what makes the same face reusable across scenarios without a copy and
without a cross-scenario path: `dating_visual_03` leads scenario02 *and* plays
scenario01's investment assistant; `female_visual_01`/`female_visual_02` are
drawn by both scenario01 and scenario05. Each is one file, resolved through the
registry by both.

Two invariants, enforced by `src/experience/characters/characterSystem.test.js`:

- **Fixed bundles stay intact.** `dating_visual_01`, `dating_visual_02` and
  `dating_visual_03` are tagged `fixed-bundle`. Each one's
  avatar / profilePhoto / largePhotos / photos / videos / mediaPreviews set is a
  single unit — never split across folders, never recombined, never randomly
  reassigned.
- **Fixed scenario01 characters are never re-cast.**
  `scenario01_coach_chen`, `scenario01_stock_rookie` and
  `scenario01_wealth_freedom` are pinned to 陳老師 / 股海小白 / 財富自由ing and
  are excluded from every random pool.

---

## 5. App asset rule

**An app module owns its own brand artwork**, and other code consumes it from
that owner rather than keeping a copy.

Every App module's artwork lives at `webapp/src/apps/<app>/assets/`, bundled
and fingerprinted by Vite. No App module has a `public/` folder of its own —
there is no such thing in this repo.

- **MeetU** (scenario02's dating app) — an App module,
  `webapp/src/apps/meetu/`, which owns its artwork at
  `webapp/src/apps/meetu/assets/` (4 files) and resolves it through
  `apps/meetu/brand/manifest.js`. Nothing outside the module needs a URL to
  it. (It used to sit in `public/assets/scenarios/scenario-02/images/brand/`,
  back when the app was implemented inside scenario02.)
- **MyDonDon** (scenario05's marketplace app) — an App module,
  `webapp/src/apps/mydondon/`, owning its artwork at
  `webapp/src/apps/mydondon/assets/` (8 files) and resolving it through
  `apps/mydondon/brand/manifest.js`. There is no `src/data/scenario05Brand.js`
  — that module no longer exists, and the artwork no longer sits in
  scenario05's bundled folder.

  Its manifest names six brand marks; only `horizontal` and `appIcon` are
  rendered today (`MyDonDonHeader`, `ChatScreen`). The other four — `stacked`,
  `wordmark`, `wordmarkCn`, `white` — are **supplied brand variants held in
  reserve**. They are named keys of a manifest, not dead files: §8 does not
  apply to them, and they must not be deleted as cleanup. The two product
  photos in the same folder (`tablet.webp`, `stroller.webp`) are imported
  directly by `apps/mydondon/data/catalog.js`.
- **HPE Logistics** (黑皮通) — an App module, `webapp/src/apps/hpe-logistics/`,
  owning its two brand files at `webapp/src/apps/hpe-logistics/assets/` and
  resolving them through `apps/hpe-logistics/brand/index.js`.

  This is the clearest case for the rule. HPE is used by **scenario04 and
  scenario05 both**. Owned by an App module, that is simply two consumers of
  one owner. Had the artwork been filed as a scenario asset instead, one of the
  two scenarios would necessarily be reading out of the other's folder — the
  exact thing §7 forbids. Shared-by-two-scenarios brand artwork is not a
  `shared/` case; it is an App module case.
- **GuGo Invest** (scenario01's fake trading platform) — an App module,
  `webapp/src/apps/gugo-invest/`, which owns its artwork at
  `webapp/src/apps/gugo-invest/assets/logos/`. That is the one editable copy;
  the module's own `LogoHorizontal` imports it, so Vite fingerprints it like
  any other bundled asset and no scenario needs a URL to it.

  This was the repo's one two-copy case. GuGo used to be a separate Vite app
  at `gugo-invest/` with its artwork in its own `public/logos/`, and
  scenario01 — which renders the same mark on its own pages — reached it
  through a `cibar-sync-gugo-brand` plugin that mirrored the folder into
  `webapp/public/`. Folding GuGo into webapp removed the reason for all of it:
  the second app, the mirror, the plugin, and scenario01's own logo component.
- **CIBAR's own PWA icons** — `webapp/public/icons/`, referenced by
  `manifest.json` and `index.html`.

Never reference another module's **build output** to avoid a copy. That trades
a duplicate for a worse problem: build output as a source of truth.

### App modules that own no artwork

Three modules have no `assets/` folder at all, and that absence is deliberate —
it is not an unfinished migration:

- **BlackPi** (scenario04's shopping app) — draws no brand image of its own.
  What it *does* own is the table that resolves scenario04's product
  photography, `apps/blackpi/data/assetMap.js`, because BlackPi is that table's
  only consumer. The 26 photos it points at stay in
  `public/assets/scenarios/scenario-04/images/products/`: they are story
  artwork shot for this scenario's storefront, not BlackPi brand artwork.
  Owning the *code* and owning the *pixels* are separate questions, and they
  were answered differently here on purpose. Keeping all 26 in one place also
  keeps one resolution mechanism for the set — a runtime URL — rather than a
  bundled import for the four storefront décor shots and a URL for the rest.
- **Coin Winner** (scenario02's fake exchange) — a flat module of six screens
  that uses no image files whatsoever; its visuals are all CSS.
- **LINE** (`apps/line`) — a conversation shell. Avatars come from the
  Character Registry, and story media from the scenario that owns it; the
  module itself ships no artwork.

An App module with no `assets/` folder is a module that draws no artwork.
Do not create an empty one for symmetry — §6's rule against empty placeholder
folders applies here too.

---

## 6. Scenario asset rule

A scenario folder holds only what **that scenario alone** uses: its story
imagery, its ending artwork, its dialogue audio, its product photos.

It is split by kind, and images by purpose:

```
public/assets/scenarios/scenario-0N/
  images/<purpose>/     results/, products/, chat/
  videos/
  audio/<speaker>/
```

Nothing sits loose at the scenario root. That second level under `images/` is
what keeps the folder readable as it grows: scenario04 carries 26 product
photos next to 2 ending mascots, and flat they were one undifferentiated pile.
`scripts/validate-asset-ownership.mjs` RULE 7 enforces both levels.

The moment a second scenario needs the same file, it stops being a scenario
asset. Promote it — to `shared/characters/` if a character owns it, to
`shared/ui/` if the shell does — and update both consumers. Do not copy it, and
do not reference it across the boundary.

Empty placeholder folders are not kept. Create the folder with the first real
file.

---

## 7. Prohibited: cross-scenario asset imports

**A scenario must never reference a path under another scenario's folder.**

```
✗ scenario05 → assets/scenarios/scenario-02/images/profiles/sophie.webp
✗ scenario04 → assets/scenarios/scenario-05/images/…
✗ import x from '../scenario-02/images/…'   (in scenario05 code)
```

```
✓ scenario02 → Character Registry → dating_visual_01
✓ scenario05 → Character Registry → an eligible shared visual
✓ both      → assets/shared/characters/dating_visual_01/avatar.webp
```

This holds for every reference form, not just `import`: ES imports,
`import.meta.glob`, runtime URL strings, CSS `url()`, `<link rel="preload">`,
and any path assembled from a variable.

The fix is never to copy the file into the second scenario. It is to move the
asset to the root that owns it and route both scenarios through that owner.

**An App module is not a scenario.** BlackPi resolving
`assets/scenarios/scenario-04/images/products/…` is not a crossing — it is the
app that renders that storefront reading the artwork the storefront is made of.
The rule is about one scenario reaching into another's folder, and the three
things that are nobody's scenario property — `shared/`, an App module's own
`assets/`, and the shared registries — are legal for every consumer. That is
exactly how `validate-asset-ownership.mjs` RULE 2 draws the line.

---

## 8. Deleting an asset

Filename matching is not evidence — two files with the same name can differ,
and the same bytes can be tracked under two unrelated names. Before deleting
anything, confirm it is genuinely unreferenced:

1. `sha256sum` compare against the file you believe it duplicates.
2. Search ES imports and `import.meta.glob` patterns.
3. Search CSS `url()`.
4. Search runtime URL strings, including paths assembled from variables —
   search the *stem*, not the full path.
5. Search `index.html` preloads and `manifest.json`.
6. Search the service worker for a precache list (`webapp/public/sw.js` is
   currently a kill switch with no precache, but check).
7. Update every consumer to the canonical path.
8. Run `npm run validate:asset-ownership` — its RULE 1 answers "is anything
   still reaching this file?" from the registries themselves rather than from a
   grep, in both directions. Then `npm run lint`,
   `npm run test:characters`, `npm run test:location`, and `npm run build`.
9. Confirm the old path has zero hits repo-wide.
10. Only then delete — and delete the old copy in the *same* change, so a
    canonical asset and a stale duplicate never coexist on `main`.

**A file no screen renders is not automatically dead.** A brand mark held in
reserve by a manifest (§5, MyDonDon's four unrendered variants) is referenced —
by a named key of a registry, which is a consumer. "Nothing draws it today" is
a fact about the UI; "nothing can reach it" is a fact about the code, and only
the second one licenses a delete.

---

## 9. Image format

**Every shipped raster image is WebP.** That covers both public roots
(`public/assets/`) and the bundled root (`src/assets/`), whatever the subject —
product photography, ending artwork, brand lockups, hero art, backgrounds.

Two exceptions, and only two:

- **`webapp/public/icons/`** — the PWA/favicon set stays PNG, because
  `manifest.json` icons and `apple-touch-icon` need it.
- **`webapp/asset-sources/`** — masters never ship, so they keep whatever
  format the original was delivered in.

Adding an image means converting it before it is committed, not after. The
conversion used for the existing set:

```bash
python3 -c "from PIL import Image; im=Image.open('in.png'); \
  im.save('out.webp','WEBP',quality=82,method=6,exact=(im.mode=='RGBA'))"
```

`quality=82` for photography, `quality=90` for artwork and brand marks with an
alpha channel. Keep the pixel dimensions — WebP is a format change, not a
resize. `exact=True` on RGBA keeps colour under transparent pixels, and libwebp
stores the alpha channel losslessly, so a cutout an overlay is aligned against
(`pages/arScan/heroLayout.js`) stays bit-identical.

The PNG is deleted in the same change as the WebP that replaces it — §8 applies
in full.

---

## 10. Decision table

| I have… | It goes… |
| --- | --- |
| a portrait, photo or clip a character owns | `public/assets/shared/characters/<visualId>/` + an entry in `visuals.js` |
| shell/UI artwork used by two or more scenarios, no character, no brand | `public/assets/shared/ui/` |
| brand artwork for an app that exists as its own module — even if two scenarios draw it | `src/apps/<app>/assets/` (§5) |
| story media only one scenario uses, URL built at runtime | `public/assets/scenarios/scenario-0N/<kind>/` (§6) |
| a scenario's entry-screen key visual | `webapp/src/assets/scenarios/scenario-0N/images/entry-hero.webp`, picked up by `src/lib/scenarioEntryHeroes.js` |
| an image a component imports directly | `webapp/src/assets/` |
| the layered/full-size original of a shipped file | `webapp/asset-sources/` |
| something a build produced | nowhere — it is not committed as source, and nothing references it |

---

## 11. What is enforced automatically

`webapp/scripts/validate-asset-ownership.mjs` runs in `prebuild`, so
`npm run build` fails on a violation and so does CI (`deploy-pages.yml` builds).
Run it alone with `npm run validate:asset-ownership`.

It does not grep for filenames. Assets in this repo are resolved through six
different mechanisms and a grep sees none of the composition, so the validator
*loads* each registry with Vite's two build-time primitives shimmed out —
`import.meta.env.BASE_URL` substituted with `/`, `import.meta.glob` replaced by
the real filesystem match — and reads the paths the registry actually produces.
A glob-backed manifest indexed by a logical key (`'mydondon-logo-white'`)
therefore resolves exactly as Vite would, and reports `undefined` loudly when
the file behind that key is gone. What cannot be evaluated — JSX composing a URL
from a module-level base constant, CSS, HTML, the web manifest — is resolved
textually in those same composition forms.

| Rule | What it holds | Section |
| --- | --- | --- |
| 1 | Every reference resolves to a real file, **and** every shipping binary is reachable from some registry or consumer | §8 |
| 2 | No cross-scenario asset reference. `shared/`, an App module's `assets/`, and the shared registries stay legal for everyone | §7 |
| 3 | Every shipped raster is WebP; `public/icons/` is the one exception | §9 |
| 4 | No source reference to the repo root's deployed tree, to `webapp/dist/`, or to a Vite hashed output filename | §1 |
| 5 | No duplicate binary across the shipping roots — compared by **content hash**, not by filename | §2, §8 |
| 6 | `asset-sources/` masters are never served or bundled (and are deliberately exempt from rule 5, since a master and its derivative differ by design) | §1 |
| 7 | A public scenario folder is split by kind, and its images by purpose | §6 |

Rule 1 covers, by name: the scenario04 asset map, the Character Registry,
`resultMascots`, `SCENARIO03_AUDIO_FILES`, the MyDonDon / MeetU / HPE brand
manifests, `scenarioEntryHeroes`, and every direct static-import and runtime-URL
consumer. Each registry also asserts a floor on how many assets it resolved, so
a reshaped table fails loudly instead of quietly checking nothing.

Current inventory: **157** tracked source assets — 122 under
`public/assets/`, 6 PWA icons, 23 bundled (17 App + 6 scenario), 6 masters.
