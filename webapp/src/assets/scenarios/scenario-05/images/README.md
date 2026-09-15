# Scenario 05 bundled artwork (幽靈訂單 / Ghost Order)

This folder holds the scenario05 imagery that has to be **imported by JS** so
Vite fingerprints it. Today that is one file.

## Entry artwork

`entry-hero.webp` — the key visual scenario05's entry screen opens on. It is
not imported by name: `src/lib/scenarioEntryHeroes.js` globs
`assets/scenarios/*/images/entry-hero.webp`, so every scenario's entry art is
the same one filename in its own folder. Master:
`webapp/asset-sources/scenarios/scenario-05/images/entry-hero.png`.

## What is no longer here

This folder used to hold MyDonDon's brand marks and the two product photos as
well, back when MyDonDon was implemented inside scenario05. **It does not any
more, and they should not come back.**

MyDonDon is an App module now. It owns its own artwork — six brand marks plus
`tablet.webp` and `stroller.webp` — at `webapp/src/apps/mydondon/assets/`,
resolved through `apps/mydondon/brand/manifest.js` (the marks, by
`import.meta.glob`) and imported directly by `apps/mydondon/data/catalog.js`
(the two products). `src/data/scenario05Brand.js` and
`src/data/scenario05Products.js` no longer exist; neither does
`components/ghostorder/MyDonDonHeader.jsx`, which is now
`apps/mydondon/components/MyDonDonHeader.jsx`.

The reason is the rule in [`docs/asset-architecture.md`](../../../../../../docs/asset-architecture.md)
§5: an app module owns its own brand artwork. MyDonDon is a marketplace app
that scenario05 happens to tell a story on — the two are not the same thing,
so the app's identity does not live in the scenario's folder. The scenario
keeps only what is genuinely its own story material, which here is its entry
key visual.
