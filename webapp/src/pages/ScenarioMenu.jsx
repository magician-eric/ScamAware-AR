import { useNavigate } from 'react-router-dom';
import { useStageClassName } from '../shell/StageClassContext';
import { prepareScenarioEntry } from '../lib/enterScenario';
import { getScenarioEntries } from '../data/scenarioEntries';
import { getScenarioMenuLang, getScenarioMenuStrings } from './scenarioMenuI18n';
import './entryScreens.css';

const BACKGROUND_SRC = `${import.meta.env.BASE_URL}assets/shared/ui/scenario-menu-background.webp`;

// Third page of the flow (see routes.jsx): language select -> AR scan home
// -> here -> the chosen scenario's own pages. Also reachable directly via
// the AR scan page's "manual selection" button when no target is
// recognized. Plain click/tap only, no camera or gesture step in between.
//
// The five buttons are real overlay elements positioned by percentage over
// the background artwork (see heroLayout.js-style comment below) rather
// than baked into the image - route/click/i18n/order logic is untouched
// from the previous version, only the visual shell changed.
export function ScenarioMenu() {
  useStageClassName('scenario-menu-stage');
  const navigate = useNavigate();
  const lang = getScenarioMenuLang();
  const t = getScenarioMenuStrings(lang);
  const entries = getScenarioEntries(lang);

  function enter(route) {
    prepareScenarioEntry(route);
    navigate(route);
  }

  return (
    <div className="scenario-selection-page">
      <img className="scenario-selection-background" src={BACKGROUND_SRC} alt="" />

      <div className="scenario-selection-heading">
        <p className="scenario-selection-category">{t.categoryLabel}</p>
        <h1 className="scenario-selection-title">{t.mainTitle}</h1>
        <p className="scenario-selection-description">{t.description}</p>
      </div>

      <div className="scenario-button-layer">
        {entries.map((s) => (
          <div key={s.route} className="scenario-overlay-button">
            <button type="button" className="scenario-button" onClick={() => enter(s.route)}>
              <span className="scenario-button-title">{s.title}</span>
              <span className="scenario-button-subtitle">{s.subtitle}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
