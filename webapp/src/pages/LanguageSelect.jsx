import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStageClassName } from '../shell/StageClassContext';
import { setLanguage, getLanguage } from '../lib/lang';
import { getLanguageSelectStrings } from './languageSelectI18n';
import { useHiddenStaffEntry } from './staff/useHiddenStaffEntry';
import './entryScreens.css';

const BACKGROUND_SRC = `${import.meta.env.BASE_URL}assets/shared/ui/scenario-menu-background.webp`;

const LANGUAGES = [
  { code: 'zh', label: '🇹🇼 中文' },
  { code: 'en', label: '🇺🇸 English' },
  { code: 'jp', label: '🇯🇵 日本語' },
];

// First page of the flow (see routes.jsx): here -> gesture tutorial -> AR
// scan home -> scenario menu. Same background artwork + overlay-button
// treatment as ScenarioMenu (see that file's comment for why the artwork
// itself has no title/frames baked in) - three language buttons instead of
// five scenario buttons. The gesture tutorial reuses this same artwork, so
// the language choice and the first instruction read as one place.
// `booting` is set only by pages/opening/OpeningHome.jsx, which renders this
// screen underneath the opening sequence at a cold start. It hides this page's
// own interface - heading, buttons, staff entries - while the opening is on top
// of it, so the sequence has the artwork to itself; the artwork is NOT touched,
// because it is the sequence's background and the same element has to still be
// on screen, undisturbed, when the opening is over. Everything about the layout
// is identical in both states: the rule it switches (OpeningSequence.css) sets
// `opacity` and nothing else.
export function LanguageSelect({ booting = false } = {}) {
  useStageClassName('scenario-menu-stage');
  const navigate = useNavigate();
  const currentLang = getLanguage();
  // Everything this screen says, in whatever language the player last chose -
  // Chinese on a device nobody has chosen on yet, which is this screen's
  // correct first state (see languageSelectI18n.js). The three buttons stay
  // in their own languages, because a language button that renamed itself
  // would be unusable.
  const t = getLanguageSelectStrings();
  const hiddenStaffEntry = useHiddenStaffEntry();

  function confirm(code) {
    setLanguage(code);
    // Into the gesture tutorial, not straight to the scan screen: every
    // player waves LEFT and then RIGHT once, in the language they just
    // picked, before the AR flow starts (see pages/gestureTutorial/). The
    // tutorial hands them on to /ar-scan itself.
    navigate('/gesture-tutorial');
  }

  return (
    <div className={`scenario-selection-page${booting ? ' is-booting' : ''}`}>
      <img className="scenario-selection-background" src={BACKGROUND_SRC} alt="" />

      {/* The hidden way into staff setup: a 5s long-press with no visible
          progress shown while holding, scoped to just the logo area of the
          artwork (not the whole page) so it stays hard to stumble into by
          accident - a full-background hold target would fire on anyone
          resting a finger on the screen while reading.

          It is no longer the ONLY way in. The gear icon below is a second,
          visible door to the same screen, kept on purpose: see its own
          comment for why the on-site setup step cannot live behind a hold
          nobody can be told about. */}
      <div className="scenario-selection-hidden-entry" aria-hidden="true" {...hiddenStaffEntry} />

      <div className="scenario-selection-heading">
        <p className="scenario-selection-category">{t.categoryLabel}</p>
        <h1 className="scenario-selection-title">{t.mainTitle}</h1>
        <p className="scenario-selection-description">{t.description}</p>
      </div>

      <div className="scenario-button-layer language-button-layer" aria-label={t.languageGroupLabel}>
        {LANGUAGES.map((l) => (
          <div key={l.code} className="scenario-overlay-button">
            <button
              type="button"
              className={`scenario-button language-button${l.code === currentLang ? ' is-active' : ''}`}
              onClick={() => confirm(l.code)}
            >
              <span className="scenario-button-title">{l.label}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Staff settings entry. On site this screen is the setup screen: the
          host is holding the device and the visitor has not been handed the
          glasses yet, so where the session is being run has to be settled
          here, before either happens. That step needs a control a host can
          point at and hit - a 5s hold on an unmarked patch of artwork is a
          fine maintenance back door and an impossible instruction to give a
          venue.

          Drawn as a gear and nothing else. It used to read 定位, which named
          one thing the screen behind it does (a GPS fix) as though that were
          the whole of it, and put player-facing wording on a staff door in
          the middle of the player's first screen. A settings gear in the
          corner is the convention every host already knows, says nothing to
          a visitor, and takes no room from the artwork.

          It opens the existing setup screen (pages/staff/StaffSetupScreen)
          unchanged - same route, same authorization (there is none: the
          screen is staff-only by being unadvertised), same everything behind
          the door. Only the door's own paint changed: 重新取得目前位置 for a
          GPS fix, 手動修正所在地 with its 縣市／行政區 selects for when there
          is no GPS and no network - the dataset behind those selects is
          bundled into the app, so the offline APK completes the manual path
          with the radio off - then 儲存並鎖定 and the handoff confirm, and
          返回首頁 back to here.

          It is never a gate and never a fourth language option: the three
          buttons keep working whether or not anyone touches this. Nothing on
          this page is gesture-driven either way - the AR interaction contract
          starts at the gesture tutorial, one screen later. */}
      <div className="language-location-entry">
        <button
          type="button"
          className="language-location-button"
          aria-label={t.staffSettingsLabel}
          onClick={() => navigate('/staff-setup')}
        >
          <Settings className="language-location-icon" aria-hidden="true" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
