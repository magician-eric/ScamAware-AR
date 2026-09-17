# Asset sources

Original masters that the shipped assets were derived from. Nothing here is
served to a browser or bundled into the app — this folder is outside both
`public/` (copied verbatim into the deployed site) and `src/` (imported and
hashed by Vite), so these files cost visitors nothing.

Keep a master here when the shipped file is a lossy or downscaled derivative
and re-deriving it from scratch would mean going back to the design tool.

| Master | Derived into |
| --- | --- |
| `app-icons/app-icon-source.png` | `public/icons/*` (PWA icon set, `public/manifest.json`) |
| `scenarios/scenario-0N/images/entry-hero.png` (five, one per scenario) | `src/assets/scenarios/scenario-0N/images/entry-hero.webp` |
| `shared/ui/gesture/hand.png` | `public/assets/shared/ui/gesture/hand.webp` |

Mirror the shipped asset's location in the path here, so a master is
findable from the file it produced. A master whose derived asset has been
deleted should be deleted too.

See [`docs/asset-architecture.md`](../../docs/asset-architecture.md).
