// Registry for the five scenario entry artworks (the 9:16 key visual each
// scenario's first screen opens on).
//
// One glob rather than five imports, for two reasons:
//
// - a scenario page never spells out a path under `assets/scenarios/`, so it
//   cannot accidentally name another scenario's folder (see
//   docs/asset-architecture.md §7). It asks this registry for its own key.
// - a missing file resolves to `undefined` instead of failing the build, the
//   same way `apps/mydondon/brand/manifest.js` treats the MyDonDon marks. A
//   scenario whose artwork has not landed yet renders its entry screen exactly
//   as it did before - it never draws a substitute image.
//
// Adding a scenario's artwork is dropping the file in at
// `src/assets/scenarios/scenario-0N/images/entry-hero.webp`. No code change.
const HEROES = import.meta.glob('../assets/scenarios/*/images/entry-hero.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

const BY_SCENARIO = new Map(
  Object.entries(HEROES).map(([path, url]) => [path.match(/scenario-\d+/)[0], url]),
);

// `scenarioId` is the folder name, e.g. 'scenario-01'.
export function getScenarioEntryHero(scenarioId) {
  return BY_SCENARIO.get(scenarioId) ?? null;
}
