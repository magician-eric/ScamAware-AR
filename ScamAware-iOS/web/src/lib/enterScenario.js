import { useState } from 'react';
import { resetShoppingAll } from './shoppingStore';
import { resetScenario03 } from './scenario03Store';
import { resetScenario05 } from './scenario05Store';
import { clearScenarioSession } from './session/ScenarioSessionFactory';

// Every entry into a scenario is a new run: resets whichever scenario's
// local run-state so a returning player (or the next visitor) doesn't
// inherit a previous run's progress/case data. Shared by ScenarioMenu's
// button clicks and ArScanHome's successful AR recognition so both entry
// points behave identically - only one place to keep this list in sync.
//
// Scenario01 and scenario02 are deliberately absent: resetting from the two
// menu entry points only covers players who arrive *through* those menus,
// and both scenarios are also restarted from inside themselves ("再看一次"
// on scenario01's 165 page, "重新體驗" on scenario02's quiz result and
// ending) and by a direct link to the scenario's own URL. Each of those
// paths lands on the scenario's Briefing, so those two reset there instead -
// one trigger that every entrance passes through, rather than a list of
// callers that has to stay complete. See useScenarioRunStart below.
export function prepareScenarioEntry(route) {
  if (route === '/scenario04-shopping') resetShoppingAll();
  if (route === '/scenario05-atm') resetScenario05();
  if (route === '/scenario03-police') {
    resetScenario03();
    clearScenarioSession();
  }
}

// "This render is the first page of a new run" - call it at the top of a
// scenario's Briefing, above every other hook, passing that scenario's reset.
//
// Deliberately not a useEffect: the reset has to land before any child reads
// run state, and an effect runs *after* the first render has already built
// the tree. As a lazy useState initializer it runs synchronously during the
// Briefing's first render, so the cast, the chat clock and the platform's
// registration flags are already the new run's values everywhere downstream.
//
// Once per mount is also exactly the right frequency. The Briefing is only
// ever the first page of a run - no in-scenario navigation returns to it -
// so an intra-run trip (LINE -> platform -> back to LINE) never remounts it
// and never clears the registration the player just completed.
export function useScenarioRunStart(reset) {
  useState(() => {
    reset();
    return null;
  });
}
