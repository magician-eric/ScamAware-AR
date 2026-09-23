# Scenario assets

Media that belongs to **one** scenario's story lives under
`public/assets/scenarios/scenario-0N/`, split by kind (`images/`, `videos/`,
`audio/`), with images further split by what they're for. Nothing sits loose at
a scenario's root — `webapp/scripts/validate-asset-ownership.mjs` RULE 7 checks
both levels.

A scenario folder holds only what that scenario alone uses. Two things are
deliberately **not** here:

- **Character media** — every portrait, photo and clip a character owns lives
  under `public/assets/shared/characters/<visualId>/` and is resolved through
  the character registry (`src/experience/characters/visuals.js`). Several
  visuals appear in more than one scenario, so keeping them in a scenario
  folder would force the other scenario to read out of it.
- **Shared UI and app brand artwork** — shared shell imagery is in
  `public/assets/shared/ui/`. There is **no** `public/assets/shared/brand/`:
  brand artwork belongs to the App module that is that brand, bundled at
  `src/apps/<app>/assets/`. That is what lets HPE Logistics serve scenario04
  and scenario05 both without either reading out of the other's folder.

A scenario must never reference a path under another scenario's folder. The
full set of rules, and where each kind of asset belongs, is in
[`docs/asset-architecture.md`](../../../../docs/asset-architecture.md).

## What each scenario currently owns

| Scenario | Contents |
| --- | --- |
| `scenario-01` (投資詐騙) | `images/results/` ending artwork (2), `videos/` the three per-language Coach Chen pitch recordings |
| `scenario-02` (交友詐騙) | `images/chat/` the two Yilan villa story photos, `images/results/` ending artwork (2). The MeetU app mark is **not** here — MeetU is an App module and owns it at `src/apps/meetu/assets/` |
| `scenario-03` (假冒公務員) | `audio/police/` (45) and `audio/prosecutor/` (18) per-language dialogue lines, `images/results/` ending artwork (2) |
| `scenario-04` (包裹詐騙) | `images/products/` product, unboxing and storefront décor artwork (26), `images/results/` ending artwork (2). The photos are resolved by logical key through `src/apps/blackpi/data/assetMap.js` — no screen names a path |
| `scenario-05` (幽靈訂單) | `images/results/` ending artwork (2), and nothing else. Its two product photos and the MyDonDon brand marks belong to the MyDonDon App module (`src/apps/mydondon/assets/`); its entry key visual is bundled at `src/assets/scenarios/scenario-05/images/` |

Empty placeholder folders are not kept — add the folder when the first real
file for it exists.
