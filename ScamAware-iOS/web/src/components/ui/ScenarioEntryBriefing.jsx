import { useNavigate } from 'react-router-dom';
import { TopBar } from '../../shell/TopBar';
import { useARInteraction } from '../../lib/arInteraction';
import { useStageClassName } from '../../shell/StageClassContext';
import { Button } from './Button';
import { ButtonGroup } from './ButtonGroup';
import { ScenarioEntryHero } from './ScenarioEntryHero';
import { getScenarioEntries } from '../../data/scenarioEntries';
import { getScenarioMenuLang, getScenarioMenuStrings } from '../../pages/scenarioMenuI18n';
import { getScenarioEntryHero } from '../../lib/scenarioEntryHeroes';
import './ScenarioEntryBriefing.css';

// The entry screen all five scenarios open on. This is scenario01's layout,
// which is the standard: the shared .topbar above a single .hero card holding
// the scenario's key visual, the "案件辨識成功" heading, that scenario's own
// briefing line, and the start button. Every scenario renders this same
// component, so there is one copy of the JSX and no per-scenario CSS - the
// card, radius, spacing, type scale, button and mobile width all come from
// the existing .topbar/.hero/.btn rules the rest of the app already uses.
//
// What varies per scenario is data, not markup:
//
// - the brand line and the heading/start labels are the localized
//   strings ScenarioMenu already shows (data/scenarioEntries.js,
//   pages/scenarioMenuI18n.js), so no scenario carries its own copy of them;
// - `description` is passed in, translated by that scenario's own i18n, so
//   each scenario keeps its own briefing text;
// - `startRoute` is that scenario's existing first story screen. This screen
//   adds no branch: the button goes exactly where the scenario went before.
//
// Run-state reset is deliberately NOT done here. The two scenarios that
// reset on their briefing still call `useScenarioRunStart` themselves, and
// the three that reset from `prepareScenarioEntry` still do - see
// lib/enterScenario.js. Adding a reset here would change three scenarios'
// behaviour, which this screen has no business doing.
//
// Vertical layout: `scenario-entry-stage` opts this screen out of `.app`'s
// own padding/gap (see styles/global.css) so `.scenario-entry-page` owns
// them instead - the header stays pinned under the safe area at the top,
// and `.scenario-entry-main` is a flex-1 region that pushes the `.hero`
// card toward the bottom rather than letting it stack right under the
// header with the rest of the screen left empty. This is the one layout
// change all five scenarios share automatically, since they all render this
// component.
//
// AR Interaction Contract (lib/arInteraction): one story action - start the
// run - so the geometry is `single` and RIGHT goes to `startRoute`. Declared
// once here rather than five times, for the same reason the layout is.
//
// The TopBar renders brand only: this screen deliberately passes no
// `homeLabel`, so no 返回情境選單 link is rendered at all (TopBar's home link
// is opt-in - see shell/TopBar.jsx). It is left out of the DOM rather than
// hidden, so it is not a tab stop and the gesture controller scanning for
// interactive elements never sees it as a target. `/scenario-menu` itself is
// untouched and still reachable from `/ar-scan`'s manual entry.
export function ScenarioEntryBriefing({ entryId, scenarioId, startRoute, description }) {
  useStageClassName('scenario-entry-stage');
  const navigate = useNavigate();
  useARInteraction({
    mode: 'single',
    surfaceId: 'shared/scenario-entry-briefing',
    action: () => navigate(startRoute),
  });
  const lang = getScenarioMenuLang();
  const menu = getScenarioMenuStrings(lang);
  const entry = getScenarioEntries(lang).find((item) => item.id === entryId);
  const heroSrc = getScenarioEntryHero(scenarioId);

  return (
    <div className="scenario-entry-page">
      <TopBar brand={`${entry.title}｜${entry.subtitle}`} />
      <div className="scenario-entry-main">
        <section className="hero">
          <ScenarioEntryHero src={heroSrc} />
          <h1>{menu.entryHeading}</h1>
          <p>{description}</p>
          <ButtonGroup>
            <Button to={startRoute}>{menu.entryStart}</Button>
          </ButtonGroup>
        </section>
      </div>
    </div>
  );
}
