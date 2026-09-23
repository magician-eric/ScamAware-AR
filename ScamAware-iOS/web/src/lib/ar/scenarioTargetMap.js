// The AR image-recognition target table - the single source of truth for
// "which printed image sends the player into which scenario".
//
// Read this file before touching anything else in lib/ar/. Three separate
// things have to agree on the order of these targets, and this array is what
// they all agree *with*:
//
//   1. the compiled dataset - scripts/compile-image-targets.mjs walks
//      IMAGE_TARGETS in order and compiles each `file` into
//      public/assets/shared/ar/image-targets.mind at that position;
//   2. the matcher at runtime - it reports the position of the matched
//      target inside that dataset, and nothing else;
//   3. this table - which turns that position back into a scenario route.
//
// So the index into IMAGE_TARGETS *is* the targetIndex the matcher reports.
// Nothing derives a scenario from a filename, and no target index means
// anything on its own: `1` is not "romance", it is `IMAGE_TARGETS[1]` -
// scenario2.png - which declares the scenario it belongs to.
//
// The `id` happens to match the filename for the current set, but nothing
// resolves a route from a filename or an id - the `scenario` field on each
// entry is the only thing that decides where a match leads.
//
// To add, remove or replace a target: edit this array, drop the PNG into
// asset-sources/shared/ar/image-targets/, and re-run
// `npm run build:image-targets`. Because the compiler reads this same array,
// the three orderings above cannot drift apart - there is no second list to
// remember to update. Appending is cheapest (existing indexes keep their
// meaning), but any edit is safe as long as the dataset is rebuilt.

// Route values match src/data/scenarioEntries.js exactly (buyer-scam's route
// is still literally '/scenario05-atm' - only its content and display name
// changed in earlier work, not the URL).
export const SCENARIO_ROUTES = {
  investment: '/scenario01-investment',
  romance: '/scenario02-romance',
  authority: '/scenario03-police',
  fakeSeller: '/scenario04-shopping',
  fakeBuyer: '/scenario05-atm',
};

// One target per scenario, in a fixed order: the position in this array is
// the target index the matcher reports. The table can hold several images for
// the same scenario - each entry declares its own `scenario`, so nothing has
// to change to add a second card for one of them - but right now each
// scenario has exactly one. `file` is relative to
// asset-sources/shared/ar/image-targets/.
export const IMAGE_TARGETS = Object.freeze([
  { id: 'scenario1', file: 'scenario1.png', scenario: 'investment' },
  { id: 'scenario2', file: 'scenario2.png', scenario: 'romance' },
  { id: 'scenario3', file: 'scenario3.png', scenario: 'authority' },
  { id: 'scenario4', file: 'scenario4.png', scenario: 'fakeSeller' },
  { id: 'scenario5', file: 'scenario5.png', scenario: 'fakeBuyer' },
]);

// Where the compiled dataset is published. Public rather than bundled: it is
// fetched by URL at runtime (see docs/asset-architecture.md 3), and it is a
// shared asset - the scanner is shell-level, owned by no single scenario.
export const IMAGE_TARGETS_DATASET_PATH = 'assets/shared/ar/image-targets.mind';

export function targetForIndex(targetIndex) {
  return IMAGE_TARGETS[targetIndex] ?? null;
}

// The matcher's numeric answer -> the scenario key (`investment`, `romance`,
// ...). Same table, same fail-closed null as routeForTargetIndex below: what
// /ar-scan offers the player and where taking that offer leads are two reads
// of one entry, so a card can never describe one scenario and enter another.
export function scenarioForTargetIndex(targetIndex) {
  return targetForIndex(targetIndex)?.scenario ?? null;
}

// The matcher's numeric answer -> the route to enter. Returns null for any
// index the table does not cover, so a dataset that has drifted ahead of this
// file fails closed (keep scanning) instead of navigating somewhere arbitrary.
export function routeForTargetIndex(targetIndex) {
  const target = targetForIndex(targetIndex);
  return target ? (SCENARIO_ROUTES[target.scenario] ?? null) : null;
}

export function targetIndexById(id) {
  return IMAGE_TARGETS.findIndex((target) => target.id === id);
}
