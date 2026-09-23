# Shared character assets

One folder per character *visual*, named after that visual's ID in
`src/experience/characters/visuals.js`. Everything a character owns — avatar,
profile photos, chat photos, video clips — lives in their own folder here, and
nowhere else.

```
shared/characters/
  dating_visual_01/avatar.webp
  dating_visual_03/avatar.webp
                   video-010.mp4  video-020.mp4  video-030.mp4
  scenario01_coach_chen/avatar.webp
  ...
```

## Rules

- **Scenarios never name a file in here.** They ask the registry for a visual
  ID and get a URL back (`getVisualAssetUrl`, `getVisual().assets`). That is
  what lets `dating_visual_03` lead scenario02 *and* play scenario01's
  investment assistant, and `female_visual_01`/`female_visual_02` be drawn by
  both scenario01 and scenario05, without either scenario reading out of the
  other's folder.
- **Adding media to a character** means adding a file here *and* an entry in
  that visual's `assets` in `visuals.js`. A file no entry points at is dead.
- **Fixed bundles stay intact.** `dating_visual_01/02/03` are tagged
  `fixed-bundle`: their avatar/profile/photo/video set is one unit and is never
  split across folders or recombined. `characterSystem.test.js` enforces this.
- **Fixed scenario01 characters are never re-cast.** `scenario01_coach_chen`,
  `scenario01_stock_rookie` and `scenario01_wealth_freedom` are pinned to their
  roles (陳老師 / 股海小白 / 財富自由ing) and are not part of any random pool.

See [`docs/asset-architecture.md`](../../../../../docs/asset-architecture.md).
